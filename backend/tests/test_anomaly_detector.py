import pytest
from app.anomaly_detector import AIAnomalyDetector
from app.simulator import CloudSimulator
from app.models import FaultType, RiskLevel

def test_anomaly_detector_normal_metrics():
    detector = AIAnomalyDetector()
    sim = CloudSimulator(initial_instances=3)
    cluster = sim.get_cluster_metrics()
    instances = sim.get_instances_list()
    
    result = detector.analyze_metrics(cluster, instances)
    assert result.is_anomaly is False
    assert result.risk_level == RiskLevel.NORMAL
    assert result.anomaly_score < 0.60
    assert "cpu_utilization" in result.feature_contributions

def test_anomaly_detector_cpu_overload():
    detector = AIAnomalyDetector()
    sim = CloudSimulator(initial_instances=3)
    sim.inject_fault(FaultType.CPU_OVERLOAD)
    for _ in range(3):
        sim.update_simulation_tick()
        
    cluster = sim.get_cluster_metrics()
    instances = sim.get_instances_list()
    
    result = detector.analyze_metrics(cluster, instances)
    assert result.is_anomaly is True
    assert result.risk_level in [RiskLevel.WARNING, RiskLevel.CRITICAL]
    assert result.anomaly_score >= 0.55
    assert "CPU" in result.probable_cause or "Compute" in result.probable_cause
