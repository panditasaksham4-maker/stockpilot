"""
Policy Engine for Cloud Remediation Guardrails and Safety Governance.
Enforces cooldowns, replica bounds, manual approvals, and emergency stop controls.
"""
import time
import logging
from typing import Dict, Any, Tuple, Optional
from .models import RemediationActionType, RiskLevel, IncidentRecord, ClusterMetrics
from .config import SystemSettings

logger = logging.getLogger("self_healing.policy_engine")

class PolicyDecision:
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    COOLDOWN_ACTIVE = "COOLDOWN_ACTIVE"
    BLOCKED_BY_EMERGENCY_STOP = "BLOCKED_BY_EMERGENCY_STOP"
    NO_ACTION_REQUIRED = "NO_ACTION_REQUIRED"

class PolicyEngine:
    def __init__(self, settings: SystemSettings):
        self.settings = settings
        self.last_action_timestamp: float = 0.0
        self.action_retry_counts: Dict[str, int] = {}

    def update_settings(self, new_settings: SystemSettings):
        self.settings = new_settings
        logger.info("Policy engine settings updated.")

    def evaluate_action(
        self,
        action: RemediationActionType,
        incident_id: str,
        cluster: ClusterMetrics,
        risk_level: RiskLevel
    ) -> Tuple[str, str]:
        """
        Evaluates whether a recommended remediation action is permitted under system safety guardrails.
        Returns: (decision: str, reason: str)
        """
        # 1. No action needed
        if action == RemediationActionType.NO_ACTION:
            return PolicyDecision.NO_ACTION_REQUIRED, "System state is healthy; no remediation needed."

        # 2. Emergency Stop check
        if self.settings.emergency_stop:
            return (
                PolicyDecision.BLOCKED_BY_EMERGENCY_STOP,
                "Emergency STOP is engaged. Automated and queued remediation actions are halted."
            )

        # 3. Action Cooldown check
        now = time.time()
        elapsed_since_last = now - self.last_action_timestamp
        if elapsed_since_last < self.settings.remediation_cooldown_sec:
            remaining = int(self.settings.remediation_cooldown_sec - elapsed_since_last)
            return (
                PolicyDecision.COOLDOWN_ACTIVE,
                f"Action blocked by safety cooldown window. {remaining}s remaining before next action."
            )

        # 4. Maximum Retries check
        retries = self.action_retry_counts.get(incident_id, 0)
        if retries >= self.settings.max_retry_attempts:
            return (
                PolicyDecision.REJECTED,
                f"Exceeded maximum remediation attempts ({self.settings.max_retry_attempts}). Escalating to human SRE."
            )

        # 5. Guardrail: Replica scaling limits
        if action == RemediationActionType.SCALE_OUT:
            if cluster.total_containers >= self.settings.max_replicas:
                return (
                    PolicyDecision.REJECTED,
                    f"Scaling limit reached: cannot scale out past configured maximum of {self.settings.max_replicas} replicas."
                )

        if action == RemediationActionType.SCALE_IN:
            if cluster.total_containers <= self.settings.min_replicas:
                return (
                    PolicyDecision.REJECTED,
                    f"Minimum replica limit reached: cannot scale below {self.settings.min_replicas} replicas."
                )

        # 6. Manual Approval Mode check
        if self.settings.manual_approval_mode:
            return (
                PolicyDecision.PENDING_APPROVAL,
                "Manual approval mode is ACTIVE. Action held in queue awaiting operator authorization."
            )

        # 7. Automatic Healing Master Toggle check
        if not self.settings.auto_healing_enabled:
            return (
                PolicyDecision.REJECTED,
                "Autonomous healing is DISABLED globally in control center. Action logged as advisory recommendation only."
            )

        # All checks passed: Action Approved
        return PolicyDecision.APPROVED, "Action complies with all safety guardrails and resource limits."

    def record_action_executed(self, incident_id: str):
        """Records execution timestamp and updates retry counters."""
        self.last_action_timestamp = time.time()
        self.action_retry_counts[incident_id] = self.action_retry_counts.get(incident_id, 0) + 1

    def clear_incident_retries(self, incident_id: str):
        if incident_id in self.action_retry_counts:
            del self.action_retry_counts[incident_id]
