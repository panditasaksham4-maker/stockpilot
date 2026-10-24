import { SystemSettings, IncidentRecord, ClusterMetrics, TopologyData, BenchmarkSummary } from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getMetrics(): Promise<{ cluster: ClusterMetrics; instances: any[]; active_fault: string | null }> {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  },

  async getMetricsHistory(): Promise<{ history: any[] }> {
    const res = await fetch(`${API_BASE}/metrics/history`);
    if (!res.ok) throw new Error('Failed to fetch metrics history');
    return res.json();
  },

  async getTopology(): Promise<TopologyData> {
    const res = await fetch(`${API_BASE}/infrastructure`);
    if (!res.ok) throw new Error('Failed to fetch topology');
    return res.json();
  },

  async getIncidents(params?: { severity?: string; status?: string; limit?: number }): Promise<{ incidents: IncidentRecord[] }> {
    const query = new URLSearchParams();
    if (params?.severity) query.append('severity', params.severity);
    if (params?.status) query.append('status', params.status);
    if (params?.limit) query.append('limit', params.limit.toString());
    const res = await fetch(`${API_BASE}/incidents?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  },

  async getIncidentDetail(id: string): Promise<IncidentRecord> {
    const res = await fetch(`${API_BASE}/incidents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch incident detail');
    return res.json();
  },

  async getAuditLogs(limit: number = 50) {
    const res = await fetch(`${API_BASE}/audit-logs?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: SystemSettings): Promise<{ status: string; settings: SystemSettings }> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async injectFault(scenario: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/faults/${scenario}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`Fault injection failed: ${res.statusText}`);
    return res.json();
  },

  async approveRemediation(incidentId: string, reason?: string) {
    const res = await fetch(`${API_BASE}/healing/approve/${incidentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incident_id: incidentId, reason: reason || 'Approved from UI' })
    });
    if (!res.ok) throw new Error('Approval failed');
    return res.json();
  },

  async rejectRemediation(incidentId: string) {
    const res = await fetch(`${API_BASE}/healing/reject/${incidentId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Rejection failed');
    return res.json();
  },

  async emergencyStop() {
    const res = await fetch(`${API_BASE}/healing/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to engage emergency stop');
    return res.json();
  },

  async resumeHealing() {
    const res = await fetch(`${API_BASE}/healing/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to resume healing');
    return res.json();
  },

  async runBenchmark(scenario: string = 'cpu-overload', mode: string = 'autonomous') {
    const res = await fetch(`${API_BASE}/tests/run?scenario=${scenario}&mode=${mode}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Benchmark run failed');
    return res.json();
  },

  async getBenchmarkResults(): Promise<{ summary: BenchmarkSummary; benchmarks: any[] }> {
    const res = await fetch(`${API_BASE}/tests/results`);
    if (!res.ok) throw new Error('Failed to fetch benchmark results');
    return res.json();
  },

  getExportCsvUrl() {
    return `${API_BASE}/export/incidents.csv`;
  }
};
