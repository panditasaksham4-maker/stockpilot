"""
Verification Service.
Monitors system metrics post-remediation to confirm authentic physical recovery before resolving incidents.
"""
import time
import logging
from typing import Dict, Any, Tuple
from .models import ClusterMetrics, IncidentRecord, IncidentStatus
from .config import SystemSettings
from .database import Database

logger = logging.getLogger("self_healing.verification")

class VerificationEngine:
    def __init__(self, db: Database, settings: SystemSettings):
        self.db = db
        self.settings = settings
        self.pending_verifications: Dict[str, Dict[str, Any]] = {}

    def update_settings(self, settings: SystemSettings):
        self.settings = settings

    def start_verification(self, incident_id: str, action: str):
        """Initiates a timed verification observation window for an incident."""
        self.pending_verifications[incident_id] = {
            "start_time": time.time(),
            "action": action,
            "samples_collected": [],
            "checks_passed": 0
        }
        self.db.add_timeline_event(
            incident_id=incident_id,
            stage="VERIFY RECOVERY",
            message=f"Entered verification window ({self.settings.verification_window_sec}s). Monitoring recovery metrics..."
        )
        logger.info(f"Started verification window for incident {incident_id}")

    def check_recovery(self, incident_id: str, cluster: ClusterMetrics) -> Tuple[str, str, Dict[str, Any]]:
        """
        Evaluates current cluster metrics against recovery criteria.
        Returns: (status: str, explanation: str, metrics: Dict[str, Any])
        """
        if incident_id not in self.pending_verifications:
            return "UNKNOWN", "Incident is not currently in verification queue.", {}

        verif = self.pending_verifications[incident_id]
        elapsed = time.time() - verif["start_time"]
        
        # Check physical recovery conditions
        cpu_ok = cluster.cpu_utilization <= (self.settings.cpu_warning_threshold + 5.0)
        mem_ok = cluster.memory_utilization <= self.settings.memory_warning_threshold
        lat_ok = cluster.request_latency_ms <= (self.settings.latency_threshold_ms + 25.0)
        err_ok = cluster.error_rate <= self.settings.error_rate_threshold_pct
        all_containers_healthy = cluster.healthy_containers == cluster.total_containers

        current_state = {
            "elapsed_sec": round(elapsed, 1),
            "cpu_utilization": cluster.cpu_utilization,
            "cpu_ok": cpu_ok,
            "memory_utilization": cluster.memory_utilization,
            "mem_ok": mem_ok,
            "latency_ms": cluster.request_latency_ms,
            "lat_ok": lat_ok,
            "error_rate": cluster.error_rate,
            "err_ok": err_ok,
            "healthy_containers": f"{cluster.healthy_containers}/{cluster.total_containers}",
            "all_healthy": all_containers_healthy
        }

        # If conditions are fully satisfied
        if cpu_ok and mem_ok and lat_ok and err_ok and all_containers_healthy:
            verif["checks_passed"] += 1
            if verif["checks_passed"] >= 2 or elapsed >= 4.0:
                # Fully confirmed recovery
                del self.pending_verifications[incident_id]
                explanation = (
                    f"Recovery verified: CPU={cluster.cpu_utilization}%, Latency={cluster.request_latency_ms}ms, "
                    f"Errors={cluster.error_rate}%, Containers={cluster.healthy_containers}/{cluster.total_containers} Healthy."
                )
                return "RESOLVED", explanation, current_state

        # Check if verification window timed out without recovery
        if elapsed >= self.settings.verification_window_sec:
            del self.pending_verifications[incident_id]
            failure_reasons = []
            if not cpu_ok:
                failure_reasons.append(f"CPU still elevated ({cluster.cpu_utilization}%)")
            if not mem_ok:
                failure_reasons.append(f"RAM still elevated ({cluster.memory_utilization}%)")
            if not lat_ok:
                failure_reasons.append(f"Latency remains high ({cluster.request_latency_ms}ms)")
            if not err_ok:
                failure_reasons.append(f"Error rate remains abnormal ({cluster.error_rate}%)")
            if not all_containers_healthy:
                failure_reasons.append(f"Containers unhealthy ({cluster.healthy_containers}/{cluster.total_containers})")

            explanation = (
                f"Verification timed out ({elapsed:.1f}s): " + "; ".join(failure_reasons) +
                ". System requires human SRE inspection."
            )
            return "RECOVERY_FAILED", explanation, current_state

        # Still observing within window
        return "OBSERVING", f"Observing system stabilization ({elapsed:.1f}/{self.settings.verification_window_sec}s)...", current_state
