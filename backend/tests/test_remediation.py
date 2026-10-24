import pytest
import os
from app.config import SystemSettings
from app.simulator import CloudSimulator
from app.database import Database
from app.policy_engine import PolicyEngine, PolicyDecision
from app.remediation import RemediationController
from app.verification import VerificationEngine
from app.models import RemediationActionType, RiskLevel, FaultType

@pytest.fixture
def clean_db():
    test_db_path = "test_self_healing.db"
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
    db = Database(test_db_path)
    yield db
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

def test_policy_engine_guardrails():
    settings = SystemSettings(max_replicas=4, auto_healing_enabled=True)
    policy = PolicyEngine(settings)
    sim = CloudSimulator(initial_instances=3)
    cluster = sim.get_cluster_metrics()

    # Normal evaluate
    decision, _ = policy.evaluate_action(RemediationActionType.SCALE_OUT, "INC-001", cluster, RiskLevel.CRITICAL)
    assert decision == PolicyDecision.APPROVED

    # Check emergency stop
    settings.emergency_stop = True
    policy.update_settings(settings)
    decision_stop, _ = policy.evaluate_action(RemediationActionType.SCALE_OUT, "INC-001", cluster, RiskLevel.CRITICAL)
    assert decision_stop == PolicyDecision.BLOCKED_BY_EMERGENCY_STOP

def test_remediation_execution_and_audit(clean_db):
    settings = SystemSettings(max_replicas=6)
    sim = CloudSimulator(initial_instances=3)
    controller = RemediationController(sim, clean_db)

    # Scale out
    res = controller.execute_action("INC-002", RemediationActionType.SCALE_OUT, max_replicas=6)
    assert res["success"] is True
    assert len(sim.instances) == 4

    # Check audit log written to SQLite
    logs = clean_db.get_audit_logs()
    assert len(logs) >= 1
    assert logs[0]["action"] == "SCALE_OUT"
