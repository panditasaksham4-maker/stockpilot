"""
Data models and schemas for the Cloud Self-Healing platform.
Supports both Pydantic and Python standard library fallback.
"""
from enum import Enum
from typing import List, Dict, Any, Optional

try:
    from pydantic import BaseModel
    PYDANTIC_AVAILABLE = True
except ImportError:
    PYDANTIC_AVAILABLE = False
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self) -> Dict[str, Any]:
            res = {}
            for k, v in self.__dict__.items():
                if k.startswith("_"):
                    continue
                if hasattr(v, "model_dump"):
                    res[k] = v.model_dump()
                elif hasattr(v, "value"):
                    res[k] = v.value
                elif isinstance(v, list):
                    res[k] = [item.model_dump() if hasattr(item, "model_dump") else item for item in v]
                else:
                    res[k] = v
            return res

        def dict(self) -> Dict[str, Any]:
            return self.model_dump()

class InstanceStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    BOOTING = "booting"
    RESTARTING = "restarting"

class RiskLevel(str, Enum):
    NORMAL = "normal"
    WARNING = "warning"
    CRITICAL = "critical"

class IncidentStatus(str, Enum):
    OBSERVED = "OBSERVED"
    DETECTED = "DETECTED"
    EVALUATING = "EVALUATING"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    REMEDIATING = "REMEDIATING"
    VERIFYING = "VERIFYING"
    RESOLVED = "RESOLVED"
    RECOVERY_FAILED = "RECOVERY_FAILED"
    NEEDS_ATTENTION = "NEEDS_ATTENTION"

class RemediationActionType(str, Enum):
    SCALE_OUT = "SCALE_OUT"
    SCALE_IN = "SCALE_IN"
    RESTART_CONTAINER = "RESTART_CONTAINER"
    REPLACE_CONTAINER = "REPLACE_CONTAINER"
    REROUTE_TRAFFIC = "REROUTE_TRAFFIC"
    QUARANTINE_INSTANCE = "QUARANTINE_INSTANCE"
    NO_ACTION = "NO_ACTION"

class FaultType(str, Enum):
    CPU_OVERLOAD = "cpu_overload"
    MEMORY_LEAK = "memory_leak"
    TRAFFIC_SPIKE = "traffic_spike"
    CONTAINER_CRASH = "container_crash"
    NETWORK_LATENCY = "network_latency"
    HIGH_ERROR_RATE = "high_error_rate"
    RESET = "reset"

class InstanceMetric(BaseModel):
    id: str
    name: str
    status: InstanceStatus
    cpu_percent: float
    memory_percent: float
    request_latency_ms: float
    network_mbps: float
    error_rate_percent: float
    restart_count: int
    uptime_seconds: int
    is_healthy: bool

class ClusterMetrics(BaseModel):
    timestamp: str
    cpu_utilization: float
    memory_utilization: float
    network_traffic_mbps: float
    request_latency_ms: float
    error_rate: float
    healthy_containers: int
    total_containers: int
    active_incidents_count: int
    health_score: float
    is_simulated: bool = True
    active_fault: Optional[str] = None

class TopologyNode(BaseModel):
    id: str
    label: str
    type: str
    status: str
    metrics: Dict[str, Any] = {}
    details: Dict[str, Any] = {}

class TopologyEdge(BaseModel):
    source: str
    target: str
    status: str = "active"
    label: Optional[str] = None

class Topology(BaseModel):
    nodes: List[TopologyNode]
    edges: List[TopologyEdge]

class AnomalyResult(BaseModel):
    timestamp: str
    is_anomaly: bool
    anomaly_score: float
    raw_score: float
    risk_level: RiskLevel
    detector_mode: str
    probable_cause: str
    recommended_action: RemediationActionType
    target_instance_id: Optional[str] = None
    confidence_score: float
    explanation: str
    feature_contributions: Dict[str, float]

class TimelineEvent(BaseModel):
    stage: str
    message: str
    timestamp: str
    data: Optional[Dict[str, Any]] = None

class IncidentRecord(BaseModel):
    id: str
    timestamp: str
    detected_condition: str
    severity: RiskLevel
    status: IncidentStatus
    anomaly_score: float
    probable_cause: str
    recommended_action: str
    executed_action: Optional[str] = None
    metrics_snapshot: Dict[str, Any]
    recovery_status: str
    verification_result: Optional[str] = None
    created_at: str
    resolved_at: Optional[str] = None
    duration_sec: float = 0.0
    timeline: List[TimelineEvent] = []

class AuditLogRecord(BaseModel):
    id: Optional[int] = None
    timestamp: str
    event_type: str
    source: str
    action: str
    status: str
    details: Optional[Dict[str, Any]] = None

class ApprovalRequest(BaseModel):
    incident_id: str
    reason: Optional[str] = "Operator manual approval"

class BenchmarkSummary(BaseModel):
    total_runs: int
    avg_detection_latency_ms: float
    avg_remediation_time_sec: float
    avg_recovery_duration_sec: float
    recovery_success_rate_pct: float
    total_incidents_detected: int
    successful_recoveries: int
    failed_recoveries: int
    false_action_count: int
