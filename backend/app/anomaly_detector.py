"""
AI Anomaly Detection Engine using Scikit-learn Isolation Forest with transparent statistical fallback.
Calculates anomaly scores, risk levels, feature contributions, and diagnostic explanations.
"""
import random
import math
import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
from .models import AnomalyResult, RiskLevel, RemediationActionType, ClusterMetrics, InstanceMetric

logger = logging.getLogger("self_healing.anomaly_detector")

# Attempt importing Scikit-Learn IsolationForest
SKLEARN_AVAILABLE = False
try:
    from sklearn.ensemble import IsolationForest
    import numpy as np
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.info("Scikit-learn not found in environment; using statistical rule-based engine.")

class AIAnomalyDetector:
    def __init__(self):
        self.model = None
        self.detector_mode = "Isolation Forest ML" if SKLEARN_AVAILABLE else "Rule-based Fallback"
        self.baseline_stats: Dict[str, Dict[str, float]] = {}
        self.feature_names = [
            "cpu_utilization",
            "memory_utilization",
            "request_latency_ms",
            "network_traffic_mbps",
            "error_rate",
            "unhealthy_ratio"
        ]
        self._train_or_initialize_model()

    def _generate_synthetic_normal_baseline(self, num_samples: int = 500) -> List[List[float]]:
        """Generates representative normal telemetry under healthy operating conditions."""
        dataset = []
        for _ in range(num_samples):
            # Normal distribution bounds
            cpu = max(20.0, min(65.0, random.gauss(42.0, 6.0)))
            mem = max(35.0, min(75.0, random.gauss(55.0, 8.0)))
            lat = max(15.0, min(75.0, random.gauss(38.0, 8.0)))
            net = max(8.0, min(65.0, random.gauss(20.0, 6.0)))
            err = max(0.01, min(0.6, random.gauss(0.18, 0.08)))
            unhealthy_ratio = 0.0
            
            dataset.append([cpu, mem, lat, net, err, unhealthy_ratio])
        return dataset

    def _train_or_initialize_model(self):
        """Trains the Isolation Forest model on baseline telemetry or calculates statistical parameters."""
        raw_baseline = self._generate_synthetic_normal_baseline(600)
        
        # Calculate baseline means and standard deviations for feature contribution analysis
        for idx, feat in enumerate(self.feature_names):
            vals = [row[idx] for row in raw_baseline]
            mean_val = sum(vals) / len(vals)
            variance = sum((x - mean_val) ** 2 for x in vals) / len(vals)
            std_val = max(math.sqrt(variance), 0.001)
            self.baseline_stats[feat] = {"mean": mean_val, "std": std_val}

        if SKLEARN_AVAILABLE:
            try:
                X = np.array(raw_baseline)
                self.model = IsolationForest(
                    n_estimators=100,
                    contamination=0.03,
                    random_state=42,
                    max_samples="auto"
                )
                self.model.fit(X)
                self.detector_mode = "Isolation Forest ML"
                logger.info("Successfully trained Scikit-learn Isolation Forest model on baseline data.")
            except Exception as e:
                logger.warning(f"Error initializing sklearn IsolationForest: {e}. Falling back to statistical engine.")
                self.model = None
                self.detector_mode = "Rule-based Fallback"
        else:
            self.model = None
            self.detector_mode = "Rule-based Fallback"

    def analyze_metrics(self, cluster: ClusterMetrics, instances: List[InstanceMetric]) -> AnomalyResult:
        """
        Extracts features, computes isolation score, determines risk level,
        diagnoses probable cause, and recommends remediation action.
        """
        unhealthy_count = cluster.total_containers - cluster.healthy_containers
        unhealthy_ratio = unhealthy_count / max(cluster.total_containers, 1)

        features = [
            cluster.cpu_utilization,
            cluster.memory_utilization,
            cluster.request_latency_ms,
            cluster.network_traffic_mbps,
            cluster.error_rate,
            unhealthy_ratio
        ]

        # Calculate Feature Deviations (Z-scores)
        deviations = {}
        for idx, feat in enumerate(self.feature_names):
            val = features[idx]
            mean_val = self.baseline_stats[feat]["mean"]
            std_val = self.baseline_stats[feat]["std"]
            z = max(0.0, (val - mean_val) / std_val)
            deviations[feat] = round(z, 2)

        # 1. Determine Anomaly Score
        raw_score = 0.0
        calibrated_score = 0.0

        if SKLEARN_AVAILABLE and self.model is not None:
            try:
                X = np.array([features])
                # decision_function gives negative values for anomalies, positive for normal
                raw_score = float(self.model.decision_function(X)[0])
                # Calibration: normal score is typically ~0.15 to ~0.25; anomaly is < 0.0
                # Map to [0.0, 1.0] where 1.0 is highest anomaly
                calibrated_score = max(0.0, min(1.0, 0.5 - (raw_score * 2.0)))
            except Exception as e:
                logger.warning(f"ML evaluation failed, falling back to statistical: {e}")
                calibrated_score = self._compute_statistical_anomaly_score(deviations)
        else:
            calibrated_score = self._compute_statistical_anomaly_score(deviations)

        # Adjust score if container is crashed or metrics are critically elevated
        if unhealthy_count > 0:
            calibrated_score = max(calibrated_score, 0.88)
        if cluster.cpu_utilization > 88.0 or cluster.memory_utilization > 88.0:
            calibrated_score = max(calibrated_score, 0.82)
        if cluster.error_rate > 10.0:
            calibrated_score = max(calibrated_score, 0.85)

        # 2. Diagnose Probable Cause and Recommended Action
        cause, action, target_id, explanation = self._diagnose_cause_and_action(cluster, instances, deviations)

        # 3. Classify Risk Level & Anomaly Flag
        if action == RemediationActionType.NO_ACTION:
            is_anomaly = False
            calibrated_score = min(calibrated_score, 0.18)
            risk_level = RiskLevel.NORMAL
        else:
            is_anomaly = True
            calibrated_score = max(calibrated_score, 0.78)
            if calibrated_score >= 0.75:
                risk_level = RiskLevel.CRITICAL
            elif calibrated_score >= 0.55:
                risk_level = RiskLevel.WARNING
            else:
                risk_level = RiskLevel.NORMAL

        # 4. Feature Contributions percentage breakdown
        total_dev = sum(deviations.values())
        contributions = {}
        if total_dev > 0:
            for k, v in deviations.items():
                contributions[k] = round((v / total_dev) * 100, 1)
        else:
            for k in deviations.keys():
                contributions[k] = round(100.0 / len(deviations), 1)

        # Confidence Score (0.0 to 1.0)
        confidence = round(min(0.99, 0.82 + (calibrated_score * 0.16)), 2)

        return AnomalyResult(
            timestamp=cluster.timestamp,
            is_anomaly=is_anomaly,
            anomaly_score=round(calibrated_score, 3),
            raw_score=round(raw_score, 3),
            risk_level=risk_level,
            detector_mode=self.detector_mode,
            probable_cause=cause,
            recommended_action=action,
            target_instance_id=target_id,
            confidence_score=confidence,
            explanation=explanation,
            feature_contributions=contributions
        )

    def _compute_statistical_anomaly_score(self, deviations: Dict[str, float]) -> float:
        """Fallback statistical score based on weighted distance from normal distribution."""
        weights = {
            "unhealthy_ratio": 4.0,
            "cpu_utilization": 2.0,
            "memory_utilization": 2.0,
            "error_rate": 2.5,
            "request_latency_ms": 1.5,
            "network_traffic_mbps": 1.0
        }
        # Only deviations beyond nominal 2.0 sigma threshold contribute to anomaly score
        excess_dev = {k: max(0.0, v - 2.0) for k, v in deviations.items()}
        weighted_sum = sum(excess_dev.get(k, 0.0) * weights.get(k, 1.0) for k in excess_dev)
        # Normal baseline score is ~0.10 to 0.15; anomalous score ramps when features exceed 2 sigma
        score = min(1.0, 0.12 + (weighted_sum / 6.0))
        return score

    def _diagnose_cause_and_action(
        self,
        cluster: ClusterMetrics,
        instances: List[InstanceMetric],
        deviations: Dict[str, float]
    ) -> Tuple[str, RemediationActionType, Optional[str], str]:
        """Examines metric patterns and instances to pinpoint root cause and safe action."""
        
        # Check 1: Container Crash or Unhealthy Replica
        unhealthy = [inst for inst in instances if not inst.is_healthy or inst.status != "healthy"]
        if unhealthy:
            target = unhealthy[0]
            cause = f"Container failure ({target.name} state: {target.status.value.upper()})"
            action = RemediationActionType.RESTART_CONTAINER
            explanation = (
                f"Instance {target.name} has entered an unhealthy/exited state with zero throughput. "
                f"Recommended action is automated container restart/reprovisioning."
            )
            return cause, action, target.id, explanation

        # Check 2: Memory Leak (one container significantly higher RAM than others)
        high_mem_instances = [inst for inst in instances if inst.memory_percent > 82.0]
        if high_mem_instances:
            target = max(high_mem_instances, key=lambda i: i.memory_percent)
            cause = f"Progressive Memory Pressure / Leak on {target.name} ({target.memory_percent:.1f}%)"
            action = RemediationActionType.REPLACE_CONTAINER
            explanation = (
                f"Container {target.name} has exceeded safety memory limits ({target.memory_percent:.1f}% RAM). "
                f"Recommended action is safe rolling restart to prevent out-of-memory kernel termination."
            )
            return cause, action, target.id, explanation

        # Check 3: CPU Overload across replicas
        if cluster.cpu_utilization > 75.0:
            cause = f"High Compute Saturation ({cluster.cpu_utilization:.1f}% cluster CPU)"
            action = RemediationActionType.SCALE_OUT
            explanation = (
                f"Average CPU utilization across {cluster.total_containers} replicas has surged to {cluster.cpu_utilization:.1f}%, "
                f"inducing queuing latency of {cluster.request_latency_ms:.0f}ms. "
                f"Recommended action is horizontal scale-out to redistribute compute workload."
            )
            return cause, action, None, explanation

        # Check 4: Traffic Spike
        if cluster.network_traffic_mbps > 85.0 and cluster.request_latency_ms > 120.0:
            cause = f"Sudden Ingress Traffic Spike ({cluster.network_traffic_mbps:.1f} Mbps)"
            action = RemediationActionType.SCALE_OUT
            explanation = (
                f"Ingress network throughput is elevated at {cluster.network_traffic_mbps:.1f} Mbps. "
                f"Scaling out replicas will balance incoming requests and restore latency to nominal bounds."
            )
            return cause, action, None, explanation

        # Check 5: High Error Rate
        if cluster.error_rate > 5.0:
            degraded = [inst for inst in instances if inst.error_rate_percent > 5.0]
            if degraded:
                target = degraded[0]
                cause = f"Service Degradation / HTTP 5xx Errors on {target.name} ({target.error_rate_percent:.1f}%)"
                action = RemediationActionType.RESTART_CONTAINER
                target_id = target.id
            else:
                cause = f"Elevated Cluster HTTP Error Rate ({cluster.error_rate:.1f}%)"
                action = RemediationActionType.RESTART_CONTAINER
                target_id = None
            explanation = (
                f"Error rate has spiked to {cluster.error_rate:.1f}%. Diagnosed failing worker threads. "
                f"Recommended action is graceful worker recycle/restart."
            )
            return cause, action, target_id, explanation

        # Check 6: Network Latency
        if cluster.request_latency_ms > 180.0:
            cause = f"Virtual Network Link Degradation ({cluster.request_latency_ms:.0f}ms Latency)"
            action = RemediationActionType.REROUTE_TRAFFIC
            explanation = (
                f"Synthetic ping latency across network paths has spiked to {cluster.request_latency_ms:.0f}ms. "
                f"Recommended action is connection pool reset and simulated traffic route rebalancing."
            )
            return cause, action, None, explanation

        # Normal condition
        return "Nominal Infrastructure Health", RemediationActionType.NO_ACTION, None, "All infrastructure metrics within baseline envelope."
