export type InstanceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'booting' | 'restarting';

export type RiskLevel = 'normal' | 'warning' | 'critical';

export type IncidentStatus = 
  | 'OBSERVED' 
  | 'DETECTED' 
  | 'EVALUATING' 
  | 'PENDING_APPROVAL' 
  | 'REMEDIATING' 
  | 'VERIFYING' 
  | 'RESOLVED' 
  | 'RECOVERY_FAILED' 
  | 'NEEDS_ATTENTION';

export interface InstanceMetric {
  id: string;
  name: string;
  status: InstanceStatus;
  cpu_percent: number;
  memory_percent: number;
  request_latency_ms: number;
  network_mbps: number;
  error_rate_percent: number;
  restart_count: number;
  uptime_seconds: number;
  is_healthy: boolean;
}

export interface ClusterMetrics {
  timestamp: string;
  cpu_utilization: number;
  memory_utilization: number;
  network_traffic_mbps: number;
  request_latency_ms: number;
  error_rate: number;
  healthy_containers: number;
  total_containers: number;
  active_incidents_count: number;
  health_score: number;
  is_simulated: boolean;
  active_fault?: string | null;
}

export interface AnomalyResult {
  timestamp: string;
  is_anomaly: boolean;
  anomaly_score: number;
  raw_score: number;
  risk_level: RiskLevel;
  detector_mode: string;
  probable_cause: string;
  recommended_action: string;
  target_instance_id?: string | null;
  confidence_score: number;
  explanation: string;
  feature_contributions: Record<string, number>;
}

export interface TimelineEvent {
  stage: string;
  message: string;
  timestamp: string;
  data?: any;
}

export interface IncidentRecord {
  id: string;
  timestamp: string;
  detected_condition: string;
  severity: RiskLevel;
  status: IncidentStatus;
  anomaly_score: number;
  probable_cause: string;
  recommended_action: string;
  executed_action?: string | null;
  metrics_snapshot?: any;
  recovery_status: string;
  verification_result?: string | null;
  created_at: string;
  resolved_at?: string | null;
  duration_sec: number;
  timeline?: TimelineEvent[];
}

export interface AuditLogRecord {
  id?: number;
  timestamp: string;
  event_type: string;
  source: string;
  action: string;
  status: string;
  details?: any;
}

export interface SystemSettings {
  auto_healing_enabled: boolean;
  manual_approval_mode: boolean;
  emergency_stop: boolean;
  min_replicas: number;
  max_replicas: number;
  cpu_warning_threshold: number;
  cpu_critical_threshold: number;
  memory_warning_threshold: number;
  memory_critical_threshold: number;
  latency_threshold_ms: number;
  error_rate_threshold_pct: number;
  remediation_cooldown_sec: number;
  max_retry_attempts: number;
  verification_window_sec: number;
  anomaly_sensitivity: number;
}

export interface TopologyNode {
  id: string;
  label: string;
  type: string;
  status: string;
  metrics: Record<string, any>;
  details: Record<string, any>;
}

export interface TopologyEdge {
  source: string;
  target: string;
  status: string;
  label?: string | null;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface BenchmarkSummary {
  total_runs: number;
  avg_detection_latency_ms: number;
  avg_remediation_time_sec: number;
  avg_recovery_duration_sec: number;
  recovery_success_rate_pct: number;
  total_incidents_detected: number;
  successful_recoveries: number;
  failed_recoveries: number;
  false_action_count: number;
}

export type NavigationPage = 
  | 'overview' 
  | 'monitoring' 
  | 'topology' 
  | 'ai-insights' 
  | 'incidents' 
  | 'remediation-control' 
  | 'evaluation' 
  | 'architecture';
