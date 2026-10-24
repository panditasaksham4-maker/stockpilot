import React from 'react';
import { useCloud } from '../context/CloudContext';
import { MetricCard } from '../components/MetricCard';
import { 
  Cpu, 
  HardDrive, 
  Network, 
  Clock, 
  AlertTriangle, 
  Layers, 
  ShieldAlert, 
  ShieldCheck, 
  BrainCircuit, 
  Zap, 
  Flame, 
  Droplets, 
  AlertOctagon, 
  Globe, 
  RefreshCw,
  Activity,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from 'recharts';
import { IncidentRecord } from '../types';

interface OverviewDashboardProps {
  onSelectIncident: (incident: IncidentRecord) => void;
  onNavigatePage: (page: any) => void;
  onOpenFaultModal: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onSelectIncident,
  onNavigatePage,
  onOpenFaultModal
}) => {
  const { 
    cluster, 
    instances, 
    aiInsight, 
    activeIncident, 
    history, 
    incidents, 
    injectFault,
    activeFault
  } = useCloud();

  // Status calculation for metric cards
  const getCpuStatus = () => (cluster.cpu_utilization > 85 ? 'critical' : cluster.cpu_utilization > 70 ? 'warning' : 'normal');
  const getMemStatus = () => (cluster.memory_utilization > 85 ? 'critical' : cluster.memory_utilization > 75 ? 'warning' : 'normal');
  const getLatStatus = () => (cluster.request_latency_ms > 200 ? 'critical' : cluster.request_latency_ms > 100 ? 'warning' : 'normal');
  const getErrStatus = () => (cluster.error_rate > 5 ? 'critical' : cluster.error_rate > 1 ? 'warning' : 'normal');
  const getContainersStatus = () => (cluster.healthy_containers < cluster.total_containers ? 'critical' : 'normal');
  const getIncidentStatus = () => (cluster.active_incidents_count > 0 ? 'critical' : 'normal');
  const getHealthStatus = () => (cluster.health_score < 60 ? 'critical' : cluster.health_score < 80 ? 'warning' : 'normal');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Active Incident Recovery Tracker Banner */}
      {activeIncident && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-navy-900 to-rose-950/80 border border-rose-600/70 shadow-lg shadow-rose-950/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500 text-white">
                    LIVE INCIDENT: {activeIncident.id}
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    STAGE: <strong className="text-cyan-400">{activeIncident.status}</strong>
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-100 mt-0.5">
                  {activeIncident.detected_condition}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onSelectIncident(activeIncident)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5"
              >
                <span>Inspect Lifecycle Timeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION A: INFRASTRUCTURE OVERVIEW - 8 Live-Updating Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Infrastructure Overview
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Last Updated: {cluster.timestamp}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="CPU Utilization"
            value={cluster.cpu_utilization}
            unit="%"
            icon={Cpu}
            status={getCpuStatus()}
            trend={cluster.cpu_utilization > 75 ? 'HIGH' : 'NORMAL'}
            subtitle="Threshold: 75% / 90%"
            timestamp={cluster.timestamp}
          />
          <MetricCard
            title="Memory Utilization"
            value={cluster.memory_utilization}
            unit="%"
            icon={HardDrive}
            status={getMemStatus()}
            trend={cluster.memory_utilization > 75 ? 'ELEVATED' : 'STABLE'}
            subtitle="Threshold: 75% / 85%"
            timestamp={cluster.timestamp}
          />
          <MetricCard
            title="Network Traffic"
            value={cluster.network_traffic_mbps}
            unit="Mbps"
            icon={Network}
            status={cluster.network_traffic_mbps > 80 ? 'warning' : 'normal'}
            trend="Active Throughput"
            subtitle="Ingress & Internal Flow"
            timestamp={cluster.timestamp}
          />
          <MetricCard
            title="Request Latency"
            value={cluster.request_latency_ms}
            unit="ms"
            icon={Clock}
            status={getLatStatus()}
            trend={cluster.request_latency_ms > 120 ? 'HIGH P99' : 'NOMINAL'}
            subtitle="Target: <150ms"
            timestamp={cluster.timestamp}
          />
          <MetricCard
            title="Error Rate"
            value={cluster.error_rate}
            unit="%"
            icon={AlertTriangle}
            status={getErrStatus()}
            trend={cluster.error_rate > 1 ? 'SPIKE' : 'STABLE'}
            subtitle="HTTP 5xx Target: <1%"
            timestamp={cluster.timestamp}
          />
          <MetricCard
            title="Healthy Containers"
            value={`${cluster.healthy_containers}/${cluster.total_containers}`}
            unit="Pods"
            icon={Layers}
            status={getContainersStatus()}
            trend={cluster.healthy_containers === cluster.total_containers ? '100% READY' : 'DEGRADED'}
            subtitle="Simulated Pod Replicas"
            timestamp={cluster.timestamp}
          />
          <MetricCard
            title="Active Incidents"
            value={cluster.active_incidents_count}
            unit=""
            icon={ShieldAlert}
            status={getIncidentStatus()}
            trend={cluster.active_incidents_count === 0 ? 'ZERO ACTIVE' : 'REMEDIATING'}
            subtitle="Closed-Loop Queue"
            timestamp={cluster.timestamp}
          />
          <MetricCard
            title="Health Score"
            value={cluster.health_score}
            unit="/100"
            icon={ShieldCheck}
            status={getHealthStatus()}
            trend={cluster.health_score > 85 ? 'OPTIMAL' : 'DEGRADED'}
            subtitle="AI Weighted Composite"
            timestamp={cluster.timestamp}
          />
        </div>
      </div>

      {/* SECTION: Quick Fault Injection Bar */}
      <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Quick Fault Simulation Bar
            </span>
          </div>
          {activeFault && (
            <span className="text-xs font-mono text-rose-400 font-bold bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-800">
              Active Fault: {activeFault}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => injectFault('cpu-overload')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 hover:bg-orange-950/80 text-orange-300 border border-navy-700 hover:border-orange-600 transition flex items-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>CPU Overload</span>
          </button>
          <button
            onClick={() => injectFault('memory-leak')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 hover:bg-blue-950/80 text-blue-300 border border-navy-700 hover:border-blue-600 transition flex items-center gap-1.5"
          >
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <span>Memory Leak</span>
          </button>
          <button
            onClick={() => injectFault('traffic-spike')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 hover:bg-yellow-950/80 text-yellow-300 border border-navy-700 hover:border-yellow-600 transition flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span>Traffic Spike</span>
          </button>
          <button
            onClick={() => injectFault('container-crash')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 hover:bg-rose-950/80 text-rose-300 border border-navy-700 hover:border-rose-600 transition flex items-center gap-1.5"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>Container Crash</span>
          </button>
          <button
            onClick={() => injectFault('network-latency')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 hover:bg-cyan-950/80 text-cyan-300 border border-navy-700 hover:border-cyan-600 transition flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>High Network Latency</span>
          </button>
          <button
            onClick={() => injectFault('high-error-rate')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 hover:bg-amber-950/80 text-amber-300 border border-navy-700 hover:border-amber-600 transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>High Error Rate</span>
          </button>
          <button
            onClick={() => injectFault('reset')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reset to Normal</span>
          </button>
        </div>
      </div>

      {/* SECTION B & D: Live Charts & AI Diagnosis Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Telemetry Charts (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-navy-900 border border-navy-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                Live Telemetry Streams (Rolling Window)
              </h3>
              <p className="text-xs text-slate-500">
                Continuous metric updates via WebSocket / Live Simulator
              </p>
            </div>
            <button
              onClick={() => onNavigatePage('monitoring')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="cpu" name="CPU (%)" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" />
                <Area type="monotone" dataKey="memory" name="Memory (%)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#memGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center space-x-6 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-500" />
              CPU Utilization (%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              Memory Utilization (%)
            </span>
          </div>
        </div>

        {/* SECTION D: AI INSIGHTS & ANOMALY DIAGNOSIS PANEL (1 Col) */}
        <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BrainCircuit className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  AI Diagnosis Engine
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                {aiInsight?.detector_mode || 'Isolation Forest'}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-navy-850 border border-navy-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Anomaly Score</span>
                <span className={`text-xs font-mono font-bold ${
                  (aiInsight?.anomaly_score || 0) > 0.7 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {aiInsight ? (aiInsight.anomaly_score * 100).toFixed(1) : '12.0'}%
                </span>
              </div>
              <div className="w-full bg-navy-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    (aiInsight?.anomaly_score || 0) > 0.7 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(aiInsight?.anomaly_score || 0.12) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">Risk Assessment</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  aiInsight?.risk_level === 'critical' 
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : aiInsight?.risk_level === 'warning'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {aiInsight?.risk_level || 'NORMAL'}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Probable Root Cause
              </span>
              <p className="text-xs font-medium text-slate-200 bg-navy-950 p-2.5 rounded-lg border border-navy-800">
                {aiInsight?.probable_cause || 'Nominal Infrastructure Health'}
              </p>
            </div>

            <div className="mt-3 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Autonomous Recommendation
              </span>
              <div className="p-2.5 rounded-lg bg-navy-950 border border-navy-800 text-xs text-cyan-300 font-mono flex items-center justify-between">
                <span>{aiInsight?.recommended_action || 'NO_ACTION'}</span>
                <span className="text-[10px] text-slate-500">Confidence: {(aiInsight?.confidence_score || 0.95) * 100}%</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigatePage('ai-insights')}
            className="w-full py-2 bg-navy-800 hover:bg-navy-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5"
          >
            <span>Inspect Feature Contributions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION: Recent Incident History & Audit Stream */}
      <div className="p-5 rounded-xl bg-navy-900 border border-navy-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200">
              Recent Incident Records & Audit Stream
            </h3>
            <p className="text-xs text-slate-500">
              Persistent SQLite audit history of all detected anomalies and autonomous recovery actions
            </p>
          </div>
          <button
            onClick={() => onNavigatePage('incidents')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            <span>View All Incidents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No incidents detected yet. Cluster is running smoothly under baseline parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-850 text-slate-400 font-mono uppercase text-[10px] border-b border-navy-800">
                <tr>
                  <th className="py-2.5 px-3">Incident ID</th>
                  <th className="py-2.5 px-3">Detected Condition</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Remediation Action</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 font-sans">
                {incidents.slice(0, 5).map(inc => (
                  <tr key={inc.id} className="hover:bg-navy-850/50 transition">
                    <td className="py-2.5 px-3 font-mono font-semibold text-cyan-400">{inc.id}</td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">{inc.detected_condition}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inc.severity === 'critical' ? 'text-rose-400 bg-rose-950/60' : 'text-amber-400 bg-amber-950/60'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{inc.executed_action || inc.recommended_action}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        inc.status === 'RESOLVED' 
                          ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800/60'
                          : inc.status === 'RECOVERY_FAILED'
                            ? 'text-rose-400 bg-rose-950/80 border border-rose-800/60'
                            : 'text-amber-400 bg-amber-950/80 border border-amber-800/60'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {inc.duration_sec ? `${inc.duration_sec}s` : 'Active'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectIncident(inc)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-2"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
