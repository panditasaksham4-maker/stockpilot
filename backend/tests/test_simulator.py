import pytest
from app.simulator import CloudSimulator
from app.models import FaultType, InstanceStatus

def test_initial_simulator_state():
    sim = CloudSimulator(initial_instances=3)
    assert len(sim.instances) == 3
    cluster = sim.get_cluster_metrics()
    assert cluster.total_containers == 3
    assert cluster.healthy_containers == 3
    assert cluster.health_score > 85.0
    assert 20.0 <= cluster.cpu_utilization <= 70.0

def test_cpu_overload_fault_injection():
    sim = CloudSimulator(initial_instances=3)
    sim.inject_fault(FaultType.CPU_OVERLOAD)
    assert sim.active_fault == FaultType.CPU_OVERLOAD
    
    # Tick simulation forward
    for _ in range(3):
        sim.update_simulation_tick()
    
    cluster = sim.get_cluster_metrics()
    assert cluster.cpu_utilization > 70.0
    assert cluster.request_latency_ms > 40.0

def test_container_crash_and_restart():
    sim = CloudSimulator(initial_instances=3)
    sim.inject_fault(FaultType.CONTAINER_CRASH)
    
    cluster = sim.get_cluster_metrics()
    assert cluster.healthy_containers == 2
    assert cluster.total_containers == 3
    
    # Trigger restart
    target_id = sim.fault_metadata.get("target_id")
    success = sim.restart_container(target_id=target_id)
    assert success is True
    
    # Tick simulation to complete boot grace period (3 ticks)
    for _ in range(4):
        sim.update_simulation_tick()
        
    cluster_after = sim.get_cluster_metrics()
    assert cluster_after.healthy_containers == 3

def test_scale_out_and_scale_in():
    sim = CloudSimulator(initial_instances=3)
    new_id = sim.scale_out(max_limit=5)
    assert new_id is not None
    assert len(sim.instances) == 4
    
    removed = sim.scale_in(min_limit=3)
    assert removed is not None
    assert len(sim.instances) == 3
