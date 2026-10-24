"""
Realistic Cloud Infrastructure Simulator.
Simulates application instances, load balancers, containers, system metrics, and fault injections.
"""
import random
import time
import math
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from .models import InstanceMetric, InstanceStatus, ClusterMetrics, FaultType, Topology, TopologyNode, TopologyEdge

logger = logging.getLogger("self_healing.simulator")

class CloudSimulator:
    def __init__(self, initial_instances: int = 3):
        self.initial_instance_count = initial_instances
        self.instances: Dict[str, Dict[str, Any]] = {}
        self.active_fault: Optional[FaultType] = None
        self.fault_start_time: Optional[float] = None
        self.fault_metadata: Dict[str, Any] = {}
        
        # Base environmental load parameters
        self.base_rps: float = 120.0
        self.current_rps: float = 120.0
        self.sim_tick: int = 0
        
        # Scaling parameters
        self.min_instances = 2
        self.max_instances = 8
        self.instance_counter = 0

        self._initialize_instances()

    def _initialize_instances(self):
        self.instances.clear()
        self.instance_counter = 0
        for _ in range(self.initial_instance_count):
            self._add_instance()

    def _add_instance(self) -> str:
        self.instance_counter += 1
        inst_id = f"inst-{self.instance_counter:02d}"
        inst_name = f"app-pod-{self.instance_counter:02d}"
        
        # Realistic initial baseline metrics
        cpu = random.uniform(38.0, 48.0)
        mem = random.uniform(44.0, 56.0)
        lat = random.uniform(25.0, 42.0)
        net = random.uniform(28.0, 45.0)
        
        self.instances[inst_id] = {
            "id": inst_id,
            "name": inst_name,
            "status": InstanceStatus.HEALTHY,
            "cpu_percent": cpu,
            "memory_percent": mem,
            "request_latency_ms": lat,
            "network_mbps": net,
            "error_rate_percent": 0.05,
            "restart_count": 0,
            "uptime_seconds": 120 + random.randint(10, 300),
            "is_healthy": True,
            "booting_remaining_ticks": 0,
            "memory_leak_rate": 0.0,
            "cpu_bias": 0.0,
            "created_at": time.time()
        }
        logger.info(f"Added simulated instance {inst_name} ({inst_id})")
        return inst_id

    def inject_fault(self, fault: FaultType, metadata: Optional[Dict[str, Any]] = None):
        """Activates a simulated infrastructure failure scenario."""
        self.active_fault = fault
        self.fault_start_time = time.time()
        self.fault_metadata = metadata or {}
        logger.warning(f"Injected fault: {fault.value} with metadata: {self.fault_metadata}")

        if fault == FaultType.CPU_OVERLOAD:
            for inst in self.instances.values():
                if inst["is_healthy"]:
                    inst["cpu_bias"] = random.uniform(45.0, 55.0)

        elif fault == FaultType.MEMORY_LEAK:
            # Inject memory leak into the first healthy instance
            target = next((i for i in self.instances.values() if i["is_healthy"]), None)
            if target:
                target["memory_leak_rate"] = 4.5  # Leaks 4.5% every second
                self.fault_metadata["target_id"] = target["id"]

        elif fault == FaultType.TRAFFIC_SPIKE:
            self.current_rps = self.base_rps * 4.5

        elif fault == FaultType.CONTAINER_CRASH:
            # Crash one of the containers (e.g., OOMKilled or Segfault)
            target = next((i for i in self.instances.values() if i["is_healthy"]), None)
            if target:
                target["status"] = InstanceStatus.UNHEALTHY
                target["is_healthy"] = False
                target["cpu_percent"] = 0.0
                target["error_rate_percent"] = 45.0
                target["request_latency_ms"] = 1200.0
                self.fault_metadata["target_id"] = target["id"]

        elif fault == FaultType.NETWORK_LATENCY:
            self.fault_metadata["latency_added_ms"] = 380.0

        elif fault == FaultType.HIGH_ERROR_RATE:
            target = next((i for i in self.instances.values() if i["is_healthy"]), None)
            if target:
                target["status"] = InstanceStatus.DEGRADED
                target["error_rate_percent"] = 28.5
                self.fault_metadata["target_id"] = target["id"]

        elif fault == FaultType.RESET:
            self.reset_to_normal()

    def reset_to_normal(self):
        """Clears all faults and restores initial normal cluster state."""
        self.active_fault = None
        self.fault_start_time = None
        self.fault_metadata = {}
        self.current_rps = self.base_rps
        self._initialize_instances()
        logger.info("Simulator reset to normal operating conditions.")

    def update_simulation_tick(self):
        """Called periodically (e.g. every second) to advance simulated physical state."""
        self.sim_tick += 1
        
        # Natural traffic breathing wave (sine curve with slight random noise)
        wave = math.sin(self.sim_tick * 0.1) * 15.0
        target_rps = (self.current_rps if self.active_fault == FaultType.TRAFFIC_SPIKE else self.base_rps) + wave
        
        healthy_instances = [inst for inst in self.instances.values() if inst["is_healthy"]]
        healthy_count = max(len(healthy_instances), 1)
        rps_per_instance = target_rps / healthy_count

        for inst in self.instances.values():
            inst["uptime_seconds"] += 1
            
            # Handle booting/restarting state
            if inst["booting_remaining_ticks"] > 0:
                inst["booting_remaining_ticks"] -= 1
                if inst["booting_remaining_ticks"] == 0:
                    inst["status"] = InstanceStatus.HEALTHY
                    inst["is_healthy"] = True
                    inst["cpu_percent"] = random.uniform(35.0, 45.0)
                    inst["memory_percent"] = random.uniform(42.0, 52.0)
                    inst["request_latency_ms"] = random.uniform(25.0, 38.0)
                    inst["error_rate_percent"] = 0.05
                    logger.info(f"Instance {inst['name']} finished booting and is now HEALTHY")
                continue

            if not inst["is_healthy"]:
                # Failed container stays dead or high error until remediated
                continue

            # 1. Base CPU influenced by RPS and CPU bias
            base_cpu = 30.0 + (rps_per_instance * 0.28) + inst.get("cpu_bias", 0.0)
            noise_cpu = random.uniform(-2.0, 2.0)
            inst["cpu_percent"] = max(5.0, min(99.5, base_cpu + noise_cpu))

            # 2. Memory leak or natural drift
            if inst.get("memory_leak_rate", 0.0) > 0:
                inst["memory_percent"] = min(99.0, inst["memory_percent"] + inst["memory_leak_rate"])
                if inst["memory_percent"] > 92.0:
                    inst["status"] = InstanceStatus.DEGRADED
                    inst["error_rate_percent"] = min(35.0, inst["error_rate_percent"] + 2.5)
            else:
                # Natural slight memory fluctuation
                mem_drift = math.sin(self.sim_tick * 0.05) * 2.0 + random.uniform(-0.5, 0.5)
                inst["memory_percent"] = max(30.0, min(75.0, inst["memory_percent"] * 0.95 + 48.0 * 0.05 + mem_drift))

            # 3. Latency influenced by CPU saturation, memory pressure, and network faults
            base_latency = 22.0 + (inst["cpu_percent"] * 0.45)
            if inst["cpu_percent"] > 85.0:
                base_latency += (inst["cpu_percent"] - 85.0) * 8.0  # exponential queuing delay
            
            if self.active_fault == FaultType.NETWORK_LATENCY:
                base_latency += self.fault_metadata.get("latency_added_ms", 350.0)
            
            inst["request_latency_ms"] = max(10.0, min(2500.0, base_latency + random.uniform(-3.0, 5.0)))

            # 4. Network Traffic (Mbps)
            inst["network_mbps"] = max(5.0, (rps_per_instance * 0.35) + random.uniform(-2.0, 2.0))

            # 5. Error Rate
            if inst["status"] == InstanceStatus.DEGRADED and self.active_fault == FaultType.HIGH_ERROR_RATE:
                inst["error_rate_percent"] = max(15.0, min(45.0, inst["error_rate_percent"] + random.uniform(-1.0, 1.0)))
            elif inst["cpu_percent"] > 92.0:
                inst["error_rate_percent"] = min(25.0, 0.5 + (inst["cpu_percent"] - 92.0) * 2.5)
            elif inst["memory_percent"] > 90.0:
                inst["error_rate_percent"] = min(20.0, 1.0 + (inst["memory_percent"] - 90.0) * 2.0)
            else:
                inst["error_rate_percent"] = max(0.01, min(0.5, inst["error_rate_percent"] * 0.8 + 0.04))

    def get_cluster_metrics(self) -> ClusterMetrics:
        """Calculates global cluster telemetry."""
        total = len(self.instances)
        if total == 0:
            return ClusterMetrics(
                timestamp=datetime.now().isoformat(),
                cpu_utilization=0,
                memory_utilization=0,
                network_traffic_mbps=0,
                request_latency_ms=0,
                error_rate=0,
                healthy_containers=0,
                total_containers=0,
                active_incidents_count=0,
                health_score=0,
                is_simulated=True,
                active_fault=None
            )

        healthy_list = [i for i in self.instances.values() if i["is_healthy"]]
        healthy_count = len(healthy_list)

        avg_cpu = sum(i["cpu_percent"] for i in self.instances.values()) / total
        avg_mem = sum(i["memory_percent"] for i in self.instances.values()) / total
        avg_net = sum(i["network_mbps"] for i in self.instances.values()) / total
        
        # Active latency perceived by users (failed containers contribute high timeout)
        latencies = []
        for i in self.instances.values():
            if i["is_healthy"]:
                latencies.append(i["request_latency_ms"])
            else:
                latencies.append(1500.0)
        avg_lat = sum(latencies) / total

        # Error rate weighted
        error_rates = [i["error_rate_percent"] for i in self.instances.values()]
        avg_err = sum(error_rates) / total

        # Calculate Health Score (100 is perfect)
        score = 100.0
        score -= max(0.0, (avg_cpu - 65.0) * 0.7)
        score -= max(0.0, (avg_mem - 70.0) * 0.6)
        score -= max(0.0, (avg_lat - 100.0) * 0.15)
        score -= avg_err * 2.0
        unhealthy_ratio = (total - healthy_count) / total
        score -= unhealthy_ratio * 40.0
        score = max(5.0, min(100.0, score))

        return ClusterMetrics(
            timestamp=datetime.now().isoformat(),
            cpu_utilization=round(avg_cpu, 2),
            memory_utilization=round(avg_mem, 2),
            network_traffic_mbps=round(avg_net, 2),
            request_latency_ms=round(avg_lat, 2),
            error_rate=round(avg_err, 2),
            healthy_containers=healthy_count,
            total_containers=total,
            active_incidents_count=0,  # Updated by caller
            health_score=round(score, 1),
            is_simulated=True,
            active_fault=self.active_fault.value if self.active_fault else None
        )

    def get_instances_list(self) -> List[InstanceMetric]:
        result = []
        for i in self.instances.values():
            result.append(InstanceMetric(
                id=i["id"],
                name=i["name"],
                status=i["status"],
                cpu_percent=round(i["cpu_percent"], 1),
                memory_percent=round(i["memory_percent"], 1),
                request_latency_ms=round(i["request_latency_ms"], 1),
                network_mbps=round(i["network_mbps"], 1),
                error_rate_percent=round(i["error_rate_percent"], 2),
                restart_count=i["restart_count"],
                uptime_seconds=i["uptime_seconds"],
                is_healthy=i["is_healthy"]
            ))
        return result

    # --- Remediation Execution Actions against Simulator ---

    def scale_out(self, max_limit: int = 8) -> Optional[str]:
        """Provisions a new replica to absorb CPU or traffic spike."""
        if len(self.instances) >= max_limit:
            logger.warning(f"Scale out rejected: already at max replica limit of {max_limit}")
            return None
        
        new_id = self._add_instance()
        # Mark as briefly booting (e.g. 2 ticks)
        self.instances[new_id]["status"] = InstanceStatus.BOOTING
        self.instances[new_id]["is_healthy"] = False
        self.instances[new_id]["booting_remaining_ticks"] = 2
        
        # When scaled out, reduce CPU bias from overload
        for inst in self.instances.values():
            if inst.get("cpu_bias", 0.0) > 0:
                inst["cpu_bias"] = max(0.0, inst["cpu_bias"] * 0.45)
        
        # If active fault was traffic spike or cpu overload, distributing load helps recovery
        if self.active_fault in [FaultType.CPU_OVERLOAD, FaultType.TRAFFIC_SPIKE]:
            self.current_rps = max(self.base_rps, self.current_rps * 0.7)
            
        logger.info(f"Scaled out cluster. New total replicas: {len(self.instances)}")
        return new_id

    def scale_in(self, min_limit: int = 3) -> Optional[str]:
        """Terminates an excess replica when cluster is idle."""
        if len(self.instances) <= min_limit:
            return None
        # Remove highest index instance
        last_id = list(self.instances.keys())[-1]
        del self.instances[last_id]
        logger.info(f"Scaled in instance {last_id}. Total replicas: {len(self.instances)}")
        return last_id

    def restart_container(self, target_id: Optional[str] = None) -> bool:
        """Restarts a crashed or degraded container."""
        if not target_id:
            # Pick first unhealthy or degraded
            for inst in self.instances.values():
                if not inst["is_healthy"] or inst["status"] in [InstanceStatus.UNHEALTHY, InstanceStatus.DEGRADED]:
                    target_id = inst["id"]
                    break
        
        if not target_id or target_id not in self.instances:
            logger.warning("No suitable target container to restart.")
            return False

        inst = self.instances[target_id]
        inst["status"] = InstanceStatus.RESTARTING
        inst["is_healthy"] = False
        inst["booting_remaining_ticks"] = 3  # Takes 3 ticks to boot
        inst["restart_count"] += 1
        inst["uptime_seconds"] = 0
        inst["memory_leak_rate"] = 0.0
        inst["cpu_bias"] = 0.0
        inst["error_rate_percent"] = 0.05
        
        # If active fault was container crash or high error rate on this instance, clear it
        if self.active_fault in [FaultType.CONTAINER_CRASH, FaultType.HIGH_ERROR_RATE]:
            self.active_fault = None
            
        logger.info(f"Restarted container {inst['name']} (restarts: {inst['restart_count']})")
        return True

    def replace_container(self, target_id: Optional[str] = None) -> bool:
        """Safely provisions a fresh instance and tears down leaking instance."""
        if not target_id:
            for inst in self.instances.values():
                if inst.get("memory_leak_rate", 0.0) > 0 or inst["memory_percent"] > 80.0:
                    target_id = inst["id"]
                    break

        if not target_id or target_id not in self.instances:
            return False

        old = self.instances[target_id]
        old_name = old["name"]
        old["status"] = InstanceStatus.RESTARTING
        old["is_healthy"] = False
        old["booting_remaining_ticks"] = 2
        old["memory_percent"] = random.uniform(40.0, 48.0)
        old["memory_leak_rate"] = 0.0
        old["restart_count"] += 1
        old["uptime_seconds"] = 0

        if self.active_fault == FaultType.MEMORY_LEAK:
            self.active_fault = None

        logger.info(f"Replaced leaking container {old_name} with fresh instance")
        return True

    def reroute_network(self) -> bool:
        """Resets virtual link and clears network latency injected fault."""
        if self.active_fault == FaultType.NETWORK_LATENCY:
            self.active_fault = None
            self.fault_metadata = {}
        for inst in self.instances.values():
            inst["request_latency_ms"] = random.uniform(25.0, 40.0)
        logger.info("Rerouted network routes and reset connection pools.")
        return True

    def get_topology(self) -> Topology:
        """Generates dynamic network topology for visual architecture map."""
        nodes: List[TopologyNode] = []
        edges: List[TopologyEdge] = []

        # 1. Load Balancer Node
        lb_healthy = any(i["is_healthy"] for i in self.instances.values())
        nodes.append(TopologyNode(
            id="node-alb",
            label="Application Load Balancer",
            type="load_balancer",
            status="healthy" if lb_healthy else "unhealthy",
            metrics={"rps": round(self.current_rps, 1), "algorithm": "Round-Robin with Health Check"},
            details={"ip": "10.0.1.10", "type": "ALB Ingress Gateway", "protocol": "HTTP/2, WebSocket"}
        ))

        # 2. Container Instances
        for inst in self.instances.values():
            node_id = f"node-{inst['id']}"
            nodes.append(TopologyNode(
                id=node_id,
                label=inst["name"],
                type="container",
                status=inst["status"].value,
                metrics={
                    "cpu": f"{inst['cpu_percent']:.1f}%",
                    "ram": f"{inst['memory_percent']:.1f}%",
                    "latency": f"{inst['request_latency_ms']:.0f}ms",
                    "errors": f"{inst['error_rate_percent']:.2f}%"
                },
                details={
                    "container_id": f"sha256:{hash(inst['name']) % 1000000:06x}",
                    "image": "cloud-app:v2.4.1",
                    "restarts": inst["restart_count"],
                    "uptime": f"{inst['uptime_seconds']}s"
                }
            ))

            # Edge from ALB to container
            edge_status = "active"
            if not inst["is_healthy"]:
                edge_status = "down"
            elif inst["status"] == InstanceStatus.DEGRADED:
                edge_status = "degraded"

            edges.append(TopologyEdge(
                source="node-alb",
                target=node_id,
                status=edge_status,
                label=f"{inst['cpu_percent']:.0f}% CPU"
            ))

        # 3. Monitoring Telemetry Collector
        nodes.append(TopologyNode(
            id="node-monitor",
            label="Monitoring Collector",
            type="monitor",
            status="healthy",
            metrics={"interval": "1.0s", "buffer": "60 points"},
            details={"role": "Telemetry Aggregation Service"}
        ))

        # 4. AI Anomaly Engine
        nodes.append(TopologyNode(
            id="node-ai-engine",
            label="AI Isolation Forest Engine",
            type="ai_engine",
            status="healthy",
            metrics={"model": "IsolationForest", "contamination": "0.05"},
            details={"algorithm": "Unsupervised Isolation Forest + Decision Threshold"}
        ))

        # 5. Policy Engine & Remediation Controller
        nodes.append(TopologyNode(
            id="node-remediation",
            label="Remediation Controller",
            type="remediation_controller",
            status="healthy",
            metrics={"loop": "Closed-Loop", "guardrail": "Active"},
            details={"actions": "Scale, Restart, Replace, Reroute"}
        ))

        # 6. SQLite Persistence
        nodes.append(TopologyNode(
            id="node-database",
            label="SQLite Audit Store",
            type="database",
            status="healthy",
            metrics={"tables": "incidents, audit_logs"},
            details={"storage": "cloud_self_healing.db"}
        ))

        # Edges connecting pipeline
        edges.append(TopologyEdge(source="node-alb", target="node-monitor", status="active", label="Telemetry"))
        edges.append(TopologyEdge(source="node-monitor", target="node-ai-engine", status="active", label="Features"))
        edges.append(TopologyEdge(source="node-ai-engine", target="node-remediation", status="active", label="Diagnosis"))
        edges.append(TopologyEdge(source="node-remediation", target="node-alb", status="active", label="Scaling/Routes"))
        edges.append(TopologyEdge(source="node-remediation", target="node-database", status="active", label="Audit Trail"))

        return Topology(nodes=nodes, edges=edges)
