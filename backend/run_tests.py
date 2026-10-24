"""
Automated Verification and Test Suite for the Self-Healing Platform.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import SystemSettings
from app.simulator import CloudSimulator
from app.database import Database
from app.models import FaultType, RemediationActionType, RiskLevel, IncidentStatus
from app.anomaly_detector import AIAnomalyDetector
from app.policy_engine import PolicyEngine, PolicyDecision
from app.remediation import RemediationController
from app.verification import VerificationEngine

def run_all_tests():
    print("[1/5] Testing Cloud Simulator baseline & physics...")
    sim = CloudSimulator(initial_instances=3)
    assert len(sim.instances) == 3, f"Expected 3 instances, got {len(sim.instances)}"
    metrics = sim.get_cluster_metrics()
    assert metrics.healthy_containers == 3
    assert 20.0 <= metrics.cpu_utilization <= 70.0
    print("      -> Baseline initialized successfully. CPU: {:.1f}%, RAM: {:.1f}%".format(metrics.cpu_utilization, metrics.memory_utilization))

    print("[2/5] Testing Fault Injection (CPU Overload & Container Crash)...")
    sim.inject_fault(FaultType.CPU_OVERLOAD)
    for _ in range(3):
        sim.update_simulation_tick()
    overload_metrics = sim.get_cluster_metrics()
    assert overload_metrics.cpu_utilization > 70.0, "CPU should be elevated during overload"
    print("      -> Injected CPU overload: CPU spiked to {:.1f}%".format(overload_metrics.cpu_utilization))

    sim.reset_to_normal()
    reset_metrics = sim.get_cluster_metrics()
    assert reset_metrics.healthy_containers == 3
    print("      -> Reset to normal successfully verified.")

    print("[3/5] Testing AI Anomaly Detector...")
    detector = AIAnomalyDetector()
    instances = sim.get_instances_list()
    normal_res = detector.analyze_metrics(reset_metrics, instances)
    print("      -> Normal telemetry test: score={:.2f}, is_anomaly={}, cause={}".format(
        normal_res.anomaly_score, normal_res.is_anomaly, normal_res.probable_cause
    ))
    assert not normal_res.is_anomaly, f"Normal metrics should not be flagged as anomaly (got score={normal_res.anomaly_score})"
    assert normal_res.risk_level == RiskLevel.NORMAL

    # Simulate abnormal state
    sim.inject_fault(FaultType.CONTAINER_CRASH)
    crash_metrics = sim.get_cluster_metrics()
    crash_instances = sim.get_instances_list()
    anomaly_res = detector.analyze_metrics(crash_metrics, crash_instances)
    assert anomaly_res.is_anomaly, "Container crash must be flagged as anomaly"
    assert anomaly_res.risk_level in [RiskLevel.WARNING, RiskLevel.CRITICAL]
    assert anomaly_res.recommended_action == RemediationActionType.RESTART_CONTAINER
    print("      -> AI Detector diagnosed: {} (Score: {:.2f}, Risk: {})".format(anomaly_res.probable_cause, anomaly_res.anomaly_score, anomaly_res.risk_level.value))

    print("[4/5] Testing Policy Engine Guardrails...")
    settings = SystemSettings(max_replicas=4, auto_healing_enabled=True)
    policy = PolicyEngine(settings)
    dec, reason = policy.evaluate_action(RemediationActionType.SCALE_OUT, "INC-001", crash_metrics, RiskLevel.CRITICAL)
    assert dec == PolicyDecision.APPROVED, f"Expected APPROVED, got {dec}"

    # Test Emergency Stop
    settings.emergency_stop = True
    policy.update_settings(settings)
    dec_stop, _ = policy.evaluate_action(RemediationActionType.SCALE_OUT, "INC-001", crash_metrics, RiskLevel.CRITICAL)
    assert dec_stop == PolicyDecision.BLOCKED_BY_EMERGENCY_STOP, "Should be blocked by emergency stop"
    print("      -> Safety guardrails & Emergency STOP verified.")

    print("[5/5] Testing Remediation Execution & SQLite Persistence...")
    db = Database("test_run.db")
    remediation = RemediationController(sim, db)
    exec_res = remediation.execute_action("INC-TEST", RemediationActionType.RESTART_CONTAINER)
    assert exec_res["success"] is True

    logs = db.get_audit_logs()
    assert len(logs) >= 1
    print("      -> SQLite audit record verified: Action {} logged with status {}".format(logs[0]["action"], logs[0]["status"]))

    # Cleanup test db
    try:
        if os.path.exists("test_run.db"):
            os.remove("test_run.db")
    except Exception:
        pass

    print("\n=======================================================")
    print("  ALL 5 BACKEND VERIFICATION TEST SUITES PASSED! [100%]")
    print("=======================================================\n")

if __name__ == "__main__":
    run_all_tests()
