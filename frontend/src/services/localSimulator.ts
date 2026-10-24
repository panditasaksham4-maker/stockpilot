import { ClusterMetrics, InstanceMetric, AnomalyResult, IncidentRecord, SystemSettings, IncidentStatus, RiskLevel } from '../types';

export class ClientSimulator {
  private instances: InstanceMetric[] = [];
  private activeFault: string | null = null;
  private tickCount: number = 0;
  public settings: SystemSettings = {
    auto_healing_enabled: true,
    manual_approval_mode: false,
    emergency_stop: false,
    min_replicas: 3,
    max_replicas: 8,
    cpu_warning_threshold: 75.0,
    cpu_critical_threshold: 90.0,
    memory_warning_threshold: 75.0,
    memory_critical_threshold: 85.0,
    latency_threshold_ms: 200.0,
    error_rate_threshold_pct: 5.0,
    remediation_cooldown_sec: 12,
    max_retry_attempts: 3,
    verification_window_sec: 8,
    anomaly_sensitivity: 0.65
  };

  public incidents: IncidentRecord[] = [];
  public activeIncident: IncidentRecord | null = null;
  private verificationTimer: number = 0;

  constructor() {
    this.reset();
  }

  public reset() {
    this.activeFault = null;
    this.instances = [
      { id: 'inst-01', name: 'app-pod-01', status: 'healthy', cpu_percent: 42.1, memory_percent: 51.4, request_latency_ms: 32.5, network_mbps: 38.2, error_rate_percent: 0.04, restart_count: 0, uptime_seconds: 340, is_healthy: true },
      { id: 'inst-02', name: 'app-pod-02', status: 'healthy', cpu_percent: 44.8, memory_percent: 48.9, request_latency_ms: 35.1, network_mbps: 41.0, error_rate_percent: 0.05, restart_count: 0, uptime_seconds: 340, is_healthy: true },
      { id: 'inst-03', name: 'app-pod-03', status: 'healthy', cpu_percent: 40.5, memory_percent: 53.2, request_latency_ms: 29.8, network_mbps: 36.5, error_rate_percent: 0.03, restart_count: 0, uptime_seconds: 340, is_healthy: true },
    ];
  }

  public injectFault(scenario: string) {
    this.activeFault = scenario;
    if (scenario === 'reset') {
      this.reset();
      this.activeIncident = null;
      return;
    }

    if (scenario === 'cpu-overload') {
      this.instances.forEach(i => {
        i.cpu_percent = 92.5 + Math.random() * 4;
        i.request_latency_ms = 240 + Math.random() * 40;
      });
    } else if (scenario === 'memory-leak') {
      if (this.instances[0]) {
        this.instances[0].memory_percent = 94.2;
        this.instances[0].status = 'degraded';
      }
    } else if (scenario === 'container-crash') {
      if (this.instances[1]) {
        this.instances[1].status = 'unhealthy';
        this.instances[1].is_healthy = false;
        this.instances[1].cpu_percent = 0;
        this.instances[1].error_rate_percent = 38.0;
        this.instances[1].request_latency_ms = 1100;
      }
    } else if (scenario === 'traffic-spike') {
      this.instances.forEach(i => {
        i.network_mbps = 95.0 + Math.random() * 10;
        i.cpu_percent = 84.0 + Math.random() * 5;
        i.request_latency_ms = 210 + Math.random() * 30;
      });
    } else if (scenario === 'network-latency') {
      this.instances.forEach(i => {
        i.request_latency_ms = 360 + Math.random() * 50;
      });
    } else if (scenario === 'high-error-rate') {
      if (this.instances[0]) {
        this.instances[0].status = 'degraded';
        this.instances[0].error_rate_percent = 26.5;
      }
    }
  }

  public step(): { cluster: ClusterMetrics; instances: InstanceMetric[]; anomaly: AnomalyResult; activeIncident: IncidentRecord | null } {
    this.tickCount++;

    // Instance metric updates
    this.instances.forEach(inst => {
      inst.uptime_seconds++;
      if (inst.status === 'booting' || inst.status === 'restarting') {
        inst.uptime_seconds = 1;
        inst.status = 'healthy';
        inst.is_healthy = true;
        inst.cpu_percent = 40 + Math.random() * 5;
        inst.memory_percent = 48 + Math.random() * 4;
        inst.request_latency_ms = 30 + Math.random() * 6;
        inst.error_rate_percent = 0.04;
      } else if (inst.is_healthy) {
        if (!this.activeFault) {
          inst.cpu_percent = Math.max(25, Math.min(65, inst.cpu_percent * 0.95 + 42 * 0.05 + (Math.random() - 0.5) * 3));
          inst.memory_percent = Math.max(35, Math.min(68, inst.memory_percent * 0.95 + 50 * 0.05 + (Math.random() - 0.5) * 2));
          inst.request_latency_ms = Math.max(15, Math.min(55, inst.request_latency_ms * 0.92 + 32 * 0.08 + (Math.random() - 0.5) * 4));
          inst.network_mbps = Math.max(18, Math.min(60, inst.network_mbps * 0.92 + 38 * 0.08 + (Math.random() - 0.5) * 5));
          inst.error_rate_percent = Math.max(0.01, Math.min(0.2, inst.error_rate_percent * 0.9 + 0.04 * 0.1));
        }
      }
    });

    // Compute cluster metrics
    const total = this.instances.length;
    const healthyList = this.instances.filter(i => i.is_healthy);
    const avgCpu = this.instances.reduce((s, i) => s + i.cpu_percent, 0) / total;
    const avgMem = this.instances.reduce((s, i) => s + i.memory_percent, 0) / total;
    const avgLat = this.instances.reduce((s, i) => s + (i.is_healthy ? i.request_latency_ms : 1200), 0) / total;
    const avgNet = this.instances.reduce((s, i) => s + i.network_mbps, 0);
    const avgErr = this.instances.reduce((s, i) => s + i.error_rate_percent, 0) / total;

    let score = 100 - Math.max(0, (avgCpu - 65) * 0.7) - Math.max(0, (avgMem - 70) * 0.6) - Math.max(0, (avgLat - 100) * 0.15) - avgErr * 2;
    if (healthyList.length < total) score -= 40;
    score = Math.max(10, Math.min(100, Math.round(score * 10) / 10));

    const cluster: ClusterMetrics = {
      timestamp: new Date().toLocaleTimeString(),
      cpu_utilization: Math.round(avgCpu * 10) / 10,
      memory_utilization: Math.round(avgMem * 10) / 10,
      network_traffic_mbps: Math.round(avgNet * 10) / 10,
      request_latency_ms: Math.round(avgLat * 10) / 10,
      error_rate: Math.round(avgErr * 100) / 100,
      healthy_containers: healthyList.length,
      total_containers: total,
      active_incidents_count: this.activeIncident ? 1 : 0,
      health_score: score,
      is_simulated: true,
      active_fault: this.activeFault
    };

    // Anomaly Diagnosis
    let isAnomaly = false;
    let anomalyScore = 0.12;
    let risk: RiskLevel = 'normal';
    let cause = 'Nominal Infrastructure Health';
    let action = 'NO_ACTION';
    let explanation = 'All telemetry metrics within baseline operational envelope.';

    if (cluster.healthy_containers < cluster.total_containers) {
      isAnomaly = true;
      anomalyScore = 0.94;
      risk = 'critical';
      cause = 'Pod Crash Detected (OOM / Process Termination)';
      action = 'RESTART_CONTAINER';
      explanation = 'A container instance entered an unhealthy exit state. Automated restart required.';
    } else if (cluster.cpu_utilization > 75) {
      isAnomaly = true;
      anomalyScore = 0.88;
      risk = 'critical';
      cause = `Compute Resource Saturation (${cluster.cpu_utilization}% CPU)`;
      action = 'SCALE_OUT';
      explanation = 'High CPU utilization detected across replicas. Scale-out recommended to balance load.';
    } else if (cluster.memory_utilization > 78) {
      isAnomaly = true;
      anomalyScore = 0.84;
      risk = 'warning';
      cause = `Memory Pressure Warning (${cluster.memory_utilization}% RAM)`;
      action = 'REPLACE_CONTAINER';
      explanation = 'Progressive memory ramp observed. Safe container recycling recommended.';
    } else if (cluster.request_latency_ms > 180) {
      isAnomaly = true;
      anomalyScore = 0.79;
      risk = 'warning';
      cause = `High Network Latency (${cluster.request_latency_ms}ms)`;
      action = 'REROUTE_TRAFFIC';
      explanation = 'Virtual connection latency spike detected. Resetting routing paths.';
    } else if (cluster.error_rate > 5) {
      isAnomaly = true;
      anomalyScore = 0.86;
      risk = 'critical';
      cause = `Degraded Service Error Rate (${cluster.error_rate}%)`;
      action = 'RESTART_CONTAINER';
      explanation = 'HTTP 5xx rate exceeded threshold. Recycling degraded worker pod.';
    }

    const anomaly: AnomalyResult = {
      timestamp: new Date().toLocaleTimeString(),
      is_anomaly: isAnomaly,
      anomaly_score: anomalyScore,
      raw_score: (0.5 - anomalyScore * 0.5),
      risk_level: risk,
      detector_mode: 'Scikit-learn Isolation Forest ML',
      probable_cause: cause,
      recommended_action: action,
      confidence_score: 0.95,
      explanation,
      feature_contributions: {
        cpu_utilization: cluster.cpu_utilization > 65 ? 42 : 15,
        memory_utilization: cluster.memory_utilization > 65 ? 38 : 14,
        request_latency_ms: cluster.request_latency_ms > 100 ? 35 : 12,
        network_traffic_mbps: 18,
        error_rate: cluster.error_rate > 2 ? 40 : 8,
        unhealthy_ratio: cluster.healthy_containers < cluster.total_containers ? 60 : 5
      }
    };

    // Closed-loop healing progression
    if (this.activeIncident) {
      if (this.activeIncident.status === 'VERIFYING') {
        this.verificationTimer++;
        if (cluster.cpu_utilization < 70 && cluster.healthy_containers === cluster.total_containers && cluster.error_rate < 3) {
          this.activeIncident.status = 'RESOLVED';
          this.activeIncident.recovery_status = 'SUCCESS';
          this.activeIncident.resolved_at = new Date().toISOString();
          this.activeIncident.duration_sec = 6.5;
          this.activeIncident.timeline?.push({
            stage: 'RESOLVE INCIDENT',
            message: `Recovery verified: Metrics returned to nominal envelope (CPU: ${cluster.cpu_utilization}%, Latency: ${cluster.request_latency_ms}ms).`,
            timestamp: new Date().toLocaleTimeString()
          });
          this.incidents.unshift({ ...this.activeIncident });
          this.activeIncident = null;
          this.activeFault = null;
        } else if (this.verificationTimer > 10) {
          this.activeIncident.status = 'RECOVERY_FAILED';
          this.activeIncident.recovery_status = 'FAILED';
          this.activeIncident.timeline?.push({
            stage: 'RECOVERY FAILED / ESCALATE',
            message: 'Metrics did not stabilize within verification window. Escalate to human operator.',
            timestamp: new Date().toLocaleTimeString()
          });
          this.incidents.unshift({ ...this.activeIncident });
          this.activeIncident = null;
        }
      }
    } else if (isAnomaly && this.settings.auto_healing_enabled && !this.settings.emergency_stop) {
      // Create new incident
      const incId = `INC-${Math.floor(10000 + Math.random() * 90000)}`;
      const newInc: IncidentRecord = {
        id: incId,
        timestamp: new Date().toISOString(),
        detected_condition: cause,
        severity: risk,
        status: this.settings.manual_approval_mode ? 'PENDING_APPROVAL' : 'REMEDIATING',
        anomaly_score: anomalyScore,
        probable_cause: cause,
        recommended_action: action,
        executed_action: this.settings.manual_approval_mode ? null : action,
        metrics_snapshot: { cpu: cluster.cpu_utilization, mem: cluster.memory_utilization, lat: cluster.request_latency_ms },
        recovery_status: 'IN_PROGRESS',
        created_at: new Date().toISOString(),
        duration_sec: 0,
        timeline: [
          { stage: 'DETECT ANOMALY', message: `Isolation Forest flagged anomaly (score ${anomalyScore.toFixed(2)})`, timestamp: new Date().toLocaleTimeString() },
          { stage: 'ANALYSE POSSIBLE CAUSE', message: cause, timestamp: new Date().toLocaleTimeString() },
          { stage: 'EVALUATE REMEDIATION POLICY', message: this.settings.manual_approval_mode ? 'Held for operator approval' : 'Policy APPROVED: Action complies with limits.', timestamp: new Date().toLocaleTimeString() }
        ]
      };

      if (!this.settings.manual_approval_mode) {
        // Execute healing
        this.executeRemediation(action, newInc);
        newInc.status = 'VERIFYING';
        this.verificationTimer = 0;
      }
      this.activeIncident = newInc;
    }

    return { cluster, instances: this.instances, anomaly, activeIncident: this.activeIncident };
  }

  public executeRemediation(action: string, incident?: IncidentRecord | null) {
    if (action === 'SCALE_OUT') {
      if (this.instances.length < this.settings.max_replicas) {
        const id = `inst-${this.instances.length + 1}`;
        this.instances.push({
          id,
          name: `app-pod-${this.instances.length + 1}`,
          status: 'healthy',
          cpu_percent: 38,
          memory_percent: 45,
          request_latency_ms: 28,
          network_mbps: 30,
          error_rate_percent: 0.03,
          restart_count: 0,
          uptime_seconds: 1,
          is_healthy: true
        });
        // Redistribute load
        this.instances.forEach(i => {
          i.cpu_percent = 45 + Math.random() * 5;
          i.request_latency_ms = 35 + Math.random() * 10;
        });
      }
    } else if (action === 'RESTART_CONTAINER' || action === 'REPLACE_CONTAINER') {
      const target = this.instances.find(i => !i.is_healthy || i.status !== 'healthy') || this.instances[0];
      if (target) {
        target.status = 'booting';
        target.restart_count++;
        target.uptime_seconds = 0;
        target.memory_percent = 46;
        target.cpu_percent = 40;
        target.error_rate_percent = 0.04;
      }
    } else if (action === 'REROUTE_TRAFFIC') {
      this.instances.forEach(i => {
        i.request_latency_ms = 32 + Math.random() * 8;
      });
    }

    if (incident) {
      incident.timeline?.push({
        stage: 'EXECUTE APPROVED ACTION',
        message: `Action '${action}' executed successfully on simulated cluster.`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }

  public approveActiveIncident() {
    if (this.activeIncident && this.activeIncident.status === 'PENDING_APPROVAL') {
      this.executeRemediation(this.activeIncident.recommended_action, this.activeIncident);
      this.activeIncident.status = 'VERIFYING';
      this.activeIncident.executed_action = this.activeIncident.recommended_action;
      this.verificationTimer = 0;
    }
  }

  public rejectActiveIncident() {
    if (this.activeIncident) {
      this.activeIncident.status = 'NEEDS_ATTENTION';
      this.incidents.unshift({ ...this.activeIncident });
      this.activeIncident = null;
    }
  }
}

export const localSimulator = new ClientSimulator();
