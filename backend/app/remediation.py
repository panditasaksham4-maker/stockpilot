"""
Autonomous Remediation Controller.
Executes approved remediation actions against infrastructure simulator and tracks execution metrics.
"""
import time
import logging
from typing import Dict, Any, Optional
from .models import RemediationActionType
from .simulator import CloudSimulator
from .database import Database

logger = logging.getLogger("self_healing.remediation")

class RemediationController:
    def __init__(self, simulator: CloudSimulator, db: Database):
        self.simulator = simulator
        self.db = db

    def execute_action(
        self,
        incident_id: str,
        action: RemediationActionType,
        target_id: Optional[str] = None,
        max_replicas: int = 8
    ) -> Dict[str, Any]:
        """
        Executes remediation on simulated infrastructure and logs audit trail.
        """
        start_time = time.time()
        success = False
        details = {}

        logger.info(f"Executing remediation action '{action.value}' for incident '{incident_id}' (target: {target_id})")

        if action == RemediationActionType.SCALE_OUT:
            new_id = self.simulator.scale_out(max_limit=max_replicas)
            success = new_id is not None
            details = {
                "action": "SCALE_OUT",
                "new_instance_id": new_id,
                "current_replicas": len(self.simulator.instances),
                "message": f"Successfully provisioned replica {new_id} to distribute load." if success else "Scale out blocked by maximum replica limit."
            }

        elif action == RemediationActionType.SCALE_IN:
            removed_id = self.simulator.scale_in()
            success = removed_id is not None
            details = {
                "action": "SCALE_IN",
                "terminated_id": removed_id,
                "current_replicas": len(self.simulator.instances)
            }

        elif action == RemediationActionType.RESTART_CONTAINER:
            res = self.simulator.restart_container(target_id=target_id)
            success = res
            details = {
                "action": "RESTART_CONTAINER",
                "target_instance": target_id or "auto-detected",
                "message": "Initiated graceful container restart with health-check grace period."
            }

        elif action == RemediationActionType.REPLACE_CONTAINER:
            res = self.simulator.replace_container(target_id=target_id)
            success = res
            details = {
                "action": "REPLACE_CONTAINER",
                "target_instance": target_id or "auto-detected",
                "message": "Initiated rolling replacement of high-memory instance with clean container."
            }

        elif action == RemediationActionType.REROUTE_TRAFFIC:
            res = self.simulator.reroute_network()
            success = res
            details = {
                "action": "REROUTE_TRAFFIC",
                "message": "Flushed connection pools and shifted traffic to low-latency virtual path."
            }

        elif action == RemediationActionType.QUARANTINE_INSTANCE:
            res = self.simulator.restart_container(target_id=target_id)
            success = res
            details = {
                "action": "QUARANTINE_INSTANCE",
                "target_instance": target_id,
                "message": "Isolated degraded container from load balancer and recycled runtime."
            }

        else:
            success = True
            details = {"action": "NO_ACTION", "message": "No active remediation needed."}

        exec_duration = round(time.time() - start_time, 3)
        details["execution_duration_sec"] = exec_duration

        # Audit Log Entry
        self.db.add_audit_log(
            event_type="REMEDIATION_EXECUTION",
            source="RemediationController",
            action=action.value,
            status="SUCCESS" if success else "FAILED",
            details=details
        )

        # Timeline Event
        self.db.add_timeline_event(
            incident_id=incident_id,
            stage="EXECUTE APPROVED ACTION",
            message=f"Action '{action.value}' executed: {details.get('message', '')}",
            data=details
        )

        return {
            "success": success,
            "action": action.value,
            "duration_sec": exec_duration,
            "details": details
        }
