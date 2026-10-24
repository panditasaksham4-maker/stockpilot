import React, { useState } from 'react';
import { useCloud } from '../context/CloudContext';
import { 
  Network, 
  Server, 
  Cpu, 
  Activity, 
  BrainCircuit, 
  Sliders, 
  Database, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export const InfrastructureTopology: React.FC = () => {
  const { cluster, instances, aiInsight, settings } = useCloud();
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // Define nodes in topology layout
  const loadBalancerNode = {
    id: 'node-alb',
    title: 'Application Load Balancer',
    type: 'ALB Ingress Gateway',
    status: cluster.healthy_containers > 0 ? 'healthy' : 'unhealthy',
    icon: Network,
    metrics: {
      'Protocol': 'HTTP/2, WebSocket',
      'Inbound Traffic': `${cluster.network_traffic_mbps} Mbps`,
      'Balancing Mode': 'Least-Connections / Weighted',
      'Healthy Targets': `${cluster.healthy_containers}/${cluster.total_containers}`
    },
    description: 'Directs external requests across active healthy backend application containers with dynamic health checks.'
  };

  const monitoringNode = {
    id: 'node-monitor',
    title: 'Telemetry Collection Service',
    type: 'Metrics Ingestion Engine',
    status: 'healthy',
    icon: Activity,
    metrics: {
      'Sampling Interval': '1.0s',
      'Rolling Buffer': '60 data points',
      'Stream': 'WebSocket Full-Duplex',
      'Ingested Metrics': 'CPU, RAM, Latency, Errors, Net'
    },
    description: 'Continuously polls and streams real-time operating metrics from all cluster instances into the AI feature pipeline.'
  };

  const aiEngineNode = {
    id: 'node-ai',
    title: 'AI Anomaly Detection Service',
    type: 'Scikit-learn Isolation Forest',
    status: aiInsight?.is_anomaly ? 'warning' : 'healthy',
    icon: BrainCircuit,
    metrics: {
      'Model': aiInsight?.detector_mode || 'Isolation Forest',
      'Anomaly Score': `${((aiInsight?.anomaly_score || 0.12) * 100).toFixed(1)}%`,
      'Contamination Factor': '0.05',
      'Confidence': `${((aiInsight?.confidence_score || 0.95) * 100).toFixed(0)}%`
    },
    description: 'Unsupervised ML Isolation Forest model comparing live telemetry multi-dimensional vectors against learned healthy baselines.'
  };

  const remediationNode = {
    id: 'node-remediation',
    title: 'Policy & Remediation Controller',
    type: 'Closed-Loop Autonomic Engine',
    status: settings.emergency_stop ? 'unhealthy' : 'healthy',
    icon: Sliders,
    metrics: {
      'Auto-Healing': settings.auto_healing_enabled ? 'ENABLED' : 'DISABLED',
      'Mode': settings.manual_approval_mode ? 'Manual Approval' : 'Autonomous',
      'Max Replicas': `${settings.max_replicas} Pods`,
      'Safety Cooldown': `${settings.remediation_cooldown_sec}s`
    },
    description: 'Enforces safety guardrails, replica limits, and executes autonomous scaling, pod restart, or route reconfiguration.'
  };

  const databaseNode = {
    id: 'node-database',
    title: 'SQLite Audit Store',
    type: 'Local ACID Database',
    status: 'healthy',
    icon: Database,
    metrics: {
      'Tables': 'incidents, timeline, audit_logs',
      'Storage': 'cloud_self_healing.db',
      'Persistence': 'Permanent Local Storage'
    },
    description: 'Stores incident audit logs, decision reasoning, and performance metrics across system restarts.'
  };

  const getNodeColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-emerald-600/70 bg-emerald-950/20 text-emerald-400 hover:border-emerald-400';
      case 'warning':
      case 'degraded':
        return 'border-amber-600/70 bg-amber-950/20 text-amber-400 hover:border-amber-400';
      case 'unhealthy':
        return 'border-rose-600/70 bg-rose-950/30 text-rose-400 hover:border-rose-400';
      default:
        return 'border-cyan-600/70 bg-cyan-950/20 text-cyan-400 hover:border-cyan-400';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            Infrastructure Topology & Service Mesh Map
          </h2>
          <p className="text-xs text-slate-400">
            Interactive visual representation of the autonomic closed-loop cloud architecture. Click any component to inspect.
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            <span className="text-slate-300">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
            <span className="text-slate-300">Degraded / Anomaly</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400" />
            <span className="text-slate-300">Unhealthy</span>
          </div>
        </div>
      </div>

      {/* Main Visual Topology Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Map (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-navy-950 border border-navy-800 relative min-h-[500px] flex flex-col justify-between overflow-hidden shadow-inner">
          {/* Subtle Grid background lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

          {/* Level 1: Ingress Load Balancer */}
          <div className="flex justify-center relative z-10">
            <div
              onClick={() => setSelectedNode(loadBalancerNode)}
              className={`p-4 rounded-xl border-2 backdrop-blur-md cursor-pointer transition-all transform hover:scale-105 w-72 text-center shadow-lg ${getNodeColor(loadBalancerNode.status)}`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Network className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">{loadBalancerNode.title}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{cluster.network_traffic_mbps} Mbps | {cluster.healthy_containers}/{cluster.total_containers} Pods</p>
            </div>
          </div>

          {/* Animated Connecting SVG Lines */}
          <div className="my-2 flex justify-center items-center text-xs text-slate-500 font-mono">
            &darr; HTTP/2 Traffic & Telemetry Stream &darr;
          </div>

          {/* Level 2: Application Container Replicas (Horizontal Row) */}
          <div className="relative z-10">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2">
              Application Container Cluster ({instances.length} Replicas)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {instances.map(inst => {
                const nodeData = {
                  id: inst.id,
                  title: inst.name,
                  type: 'Docker Container Pod',
                  status: inst.status,
                  icon: Server,
                  metrics: {
                    'Status': inst.status.toUpperCase(),
                    'CPU Percent': `${inst.cpu_percent}%`,
                    'RAM Percent': `${inst.memory_percent}%`,
                    'Request Latency': `${inst.request_latency_ms} ms`,
                    'Restarts': inst.restart_count,
                    'Uptime': `${inst.uptime_seconds}s`
                  },
                  description: `Active application pod instance handling traffic load from ALB. Health check: ${inst.is_healthy ? 'PASSING' : 'FAILING'}.`
                };

                return (
                  <div
                    key={inst.id}
                    onClick={() => setSelectedNode(nodeData)}
                    className={`p-3 rounded-xl border-2 backdrop-blur-md cursor-pointer transition-all transform hover:scale-105 shadow-md ${getNodeColor(inst.status)}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <Server className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold font-mono truncate">{inst.name}</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-current" />
                    </div>
                    <div className="space-y-0.5 text-[10px] font-mono text-slate-300">
                      <div>CPU: {inst.cpu_percent}%</div>
                      <div>RAM: {inst.memory_percent}%</div>
                      <div>Lat: {inst.request_latency_ms}ms</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connecting Pipe */}
          <div className="my-2 flex justify-center items-center text-xs text-slate-500 font-mono">
            &darr; Real-Time Feature Ingestion & Remediation Closed-Loop &darr;
          </div>

          {/* Level 3: AI Pipeline, Controller & SQLite Storage */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative z-10">
            <div
              onClick={() => setSelectedNode(monitoringNode)}
              className={`p-3 rounded-xl border-2 backdrop-blur-md cursor-pointer transition-all hover:scale-105 shadow-md ${getNodeColor(monitoringNode.status)}`}
            >
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold truncate">Monitoring</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">1.0s Polling</p>
            </div>

            <div
              onClick={() => setSelectedNode(aiEngineNode)}
              className={`p-3 rounded-xl border-2 backdrop-blur-md cursor-pointer transition-all hover:scale-105 shadow-md ${getNodeColor(aiEngineNode.status)}`}
            >
              <div className="flex items-center space-x-2">
                <BrainCircuit className="w-4 h-4" />
                <span className="text-xs font-bold truncate">AI Isolation ML</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Unsupervised</p>
            </div>

            <div
              onClick={() => setSelectedNode(remediationNode)}
              className={`p-3 rounded-xl border-2 backdrop-blur-md cursor-pointer transition-all hover:scale-105 shadow-md ${getNodeColor(remediationNode.status)}`}
            >
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4" />
                <span className="text-xs font-bold truncate">Remediation</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Autonomic</p>
            </div>

            <div
              onClick={() => setSelectedNode(databaseNode)}
              className={`p-3 rounded-xl border-2 backdrop-blur-md cursor-pointer transition-all hover:scale-105 shadow-md ${getNodeColor(databaseNode.status)}`}
            >
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span className="text-xs font-bold truncate">SQLite DB</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Audit Trail</p>
            </div>
          </div>
        </div>

        {/* Component Inspector Panel (1 col) */}
        <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              Component Inspector
            </h3>

            {selectedNode ? (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-xl bg-navy-850 border border-navy-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">{selectedNode.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedNode.status === 'healthy' ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800' : 'text-rose-400 bg-rose-950/80 border border-rose-800'
                    }`}>
                      {selectedNode.status}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">{selectedNode.type}</span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Live Metrics</span>
                  <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 space-y-2">
                    {Object.entries(selectedNode.metrics).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">{k}:</span>
                        <span className="font-mono font-bold text-slate-200">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Description</span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-navy-950 p-3 rounded-xl border border-navy-800">
                    {selectedNode.description}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <Network className="w-8 h-8 text-slate-600 mx-auto" />
                <p>Click any node in the topology map to inspect its real-time metrics, status, and role in self-healing.</p>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 text-[11px] text-slate-400 flex items-center gap-2 mt-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Topology updates dynamically as replicas auto-scale.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
