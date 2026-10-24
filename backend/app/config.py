"""
Configuration and settings for the AI-Powered Self-Healing Cloud Infrastructure backend.
Supports both Pydantic and standard library fallback.
"""
import os
from typing import Optional, Dict, Any

try:
    from pydantic import BaseModel
    class SystemSettings(BaseModel):
        auto_healing_enabled: bool = True
        manual_approval_mode: bool = False
        emergency_stop: bool = False
        min_replicas: int = 3
        max_replicas: int = 8
        cpu_warning_threshold: float = 75.0
        cpu_critical_threshold: float = 90.0
        memory_warning_threshold: float = 75.0
        memory_critical_threshold: float = 85.0
        latency_threshold_ms: float = 200.0
        error_rate_threshold_pct: float = 5.0
        remediation_cooldown_sec: int = 12
        max_retry_attempts: int = 3
        verification_window_sec: int = 8
        anomaly_sensitivity: float = 0.65

except ImportError:
    class SystemSettings:
        def __init__(self, **kwargs):
            self.auto_healing_enabled = kwargs.get("auto_healing_enabled", True)
            self.manual_approval_mode = kwargs.get("manual_approval_mode", False)
            self.emergency_stop = kwargs.get("emergency_stop", False)
            self.min_replicas = kwargs.get("min_replicas", 3)
            self.max_replicas = kwargs.get("max_replicas", 8)
            self.cpu_warning_threshold = float(kwargs.get("cpu_warning_threshold", 75.0))
            self.cpu_critical_threshold = float(kwargs.get("cpu_critical_threshold", 90.0))
            self.memory_warning_threshold = float(kwargs.get("memory_warning_threshold", 75.0))
            self.memory_critical_threshold = float(kwargs.get("memory_critical_threshold", 85.0))
            self.latency_threshold_ms = float(kwargs.get("latency_threshold_ms", 200.0))
            self.error_rate_threshold_pct = float(kwargs.get("error_rate_threshold_pct", 5.0))
            self.remediation_cooldown_sec = int(kwargs.get("remediation_cooldown_sec", 12))
            self.max_retry_attempts = int(kwargs.get("max_retry_attempts", 3))
            self.verification_window_sec = int(kwargs.get("verification_window_sec", 8))
            self.anomaly_sensitivity = float(kwargs.get("anomaly_sensitivity", 0.65))

        def model_dump(self) -> Dict[str, Any]:
            return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}

        def dict(self) -> Dict[str, Any]:
            return self.model_dump()

class Config:
    DATABASE_PATH: str = os.environ.get("DATABASE_PATH", "cloud_self_healing.db")
    HOST: str = os.environ.get("HOST", "0.0.0.0")
    PORT: int = int(os.environ.get("PORT", "8000"))
    SIMULATION_INTERVAL_SEC: float = 1.0
    ROLLING_HISTORY_MAX_POINTS: int = 60
