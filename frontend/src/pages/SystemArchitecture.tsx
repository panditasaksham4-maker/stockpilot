import React from 'react';
import { 
  Layers, 
  Cpu, 
  Server, 
  Database, 
  BrainCircuit, 
  Sliders, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink,
  Code2,
  GitBranch,
  Cloud
} from 'lucide-react';

export const SystemArchitecture: React.FC = () => {
  const components = [
    {
      title: '1. Frontend UI & Control Center',
      tech: 'React 18 + Vite + TypeScript + Tailwind CSS + Recharts',
      role: 'DevOps & SRE cockpit providing live metric streams, fault injection triggers, and topology graph inspection.',
      status: 'Implemented & Verified'
    },
    {
      title: '2. Backend API Gateway',
      tech: 'Python FastAPI + WebSocket + REST',
      role: 'Full-duplex telemetry streaming, CORS middleware, REST endpoints, and background async closed-loop coordinator.',
      status: 'Implemented & Verified'
    },
    {
      title: '3. Cloud Infrastructure Simulator',
      tech: 'Python Async Engine',
      role: 'Simulates application instances, dynamic load balancing, CPU/RAM/latency physics, and 7 fault injection modes.',
      status: 'Implemented & Verified'
    },
    {
      title: '4. AI Anomaly Detector',
      tech: 'Scikit-learn Isolation Forest + Statistical Fallback',
      role: 'Unsupervised ML model that identifies multivariate telemetry anomalies with feature contribution scoring.',
      status: 'Implemented & Verified'
    },
    {
      title: '5. Policy & Governance Engine',
      tech: 'Rule-Based Guardrail Evaluator',
      role: 'Enforces cooldown timers, max replica limits, manual approval gates, and emergency stop overrides.',
      status: 'Implemented & Verified'
    },
    {
      title: '6. Autonomous Remediation Controller',
      tech: 'Action Dispatcher',
      role: 'Executes approved recovery actions: pod scaling, container restart, memory leak replacement, and route reset.',
      status: 'Implemented & Verified'
    },
    {
      title: '7. Verification Engine',
      tech: 'Post-Remediation Observer',
      role: 'Guarantees physical recovery before resolving incidents by verifying that metrics return below threshold bounds.',
      status: 'Implemented & Verified'
    },
    {
      title: '8. Audit & History Store',
      tech: 'SQLite + ACID Transactions',
      role: 'Persists complete incident timelines, operator approvals, audit trails, and performance benchmarks.',
      status: 'Implemented & Verified'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-4 rounded-xl bg-navy-900 border border-navy-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          System Architecture & Data Flow Specification
        </h2>
        <p className="text-xs text-slate-400">
          Modular, event-driven autonomic cloud architecture implementing the closed-loop MAPE-K (Monitor-Analyze-Plan-Execute-Knowledge) model
        </p>
      </div>

      {/* Closed Loop Architecture Visual Pipeline */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Autonomic Closed-Loop Data Flow (MAPE-K Model)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
          <div className="p-4 rounded-xl bg-navy-850 border border-cyan-800/80">
            <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">1. MONITOR</span>
            <div className="text-sm font-bold text-slate-200 mt-1">Telemetry Collector</div>
            <p className="text-[11px] text-slate-400 mt-1">Aggregates CPU, RAM, Latency, RPS & Errors every 1s</p>
          </div>

          <div className="p-4 rounded-xl bg-navy-850 border border-blue-800/80">
            <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">2. ANALYZE</span>
            <div className="text-sm font-bold text-slate-200 mt-1">Isolation Forest ML</div>
            <p className="text-[11px] text-slate-400 mt-1">Unsupervised anomaly scoring & root cause deduction</p>
          </div>

          <div className="p-4 rounded-xl bg-navy-850 border border-amber-800/80">
            <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">3. PLAN</span>
            <div className="text-sm font-bold text-slate-200 mt-1">Policy Engine</div>
            <p className="text-[11px] text-slate-400 mt-1">Checks safety guardrails, cooldowns & replica limits</p>
          </div>

          <div className="p-4 rounded-xl bg-navy-850 border border-rose-800/80">
            <span className="text-[10px] font-mono text-rose-400 uppercase font-bold">4. EXECUTE</span>
            <div className="text-sm font-bold text-slate-200 mt-1">Remediation Controller</div>
            <p className="text-[11px] text-slate-400 mt-1">Dispatches scale-out, pod restart, or route reset</p>
          </div>

          <div className="p-4 rounded-xl bg-navy-850 border border-emerald-800/80">
            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">5. VERIFY</span>
            <div className="text-sm font-bold text-slate-200 mt-1">Verification Engine</div>
            <p className="text-[11px] text-slate-400 mt-1">Confirms physical stabilization before resolving</p>
          </div>
        </div>
      </div>

      {/* Component Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {components.map((c, i) => (
          <div key={i} className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200">{c.title}</h4>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                {c.status}
              </span>
            </div>
            <div className="text-[11px] font-mono text-cyan-400">{c.tech}</div>
            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              {c.role}
            </p>
          </div>
        ))}
      </div>

      {/* Future Production Cloud Extensions Roadmap */}
      <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-cyan-400" />
              Future Production Integration Roadmap
            </h3>
            <p className="text-xs text-slate-500">
              How the implemented prototype interfaces seamlessly map to enterprise cloud-native tooling
            </p>
          </div>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2.5 py-1 rounded border border-amber-800">
            Architecture Blueprint
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2">
            <span className="text-xs font-bold text-cyan-400 font-mono">Prometheus & Grafana</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Replace the internal simulated collector with the <code className="text-cyan-300">prometheus_client</code> exporter exposing standard OpenTelemetry metrics at <code className="text-cyan-300">/metrics</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2">
            <span className="text-xs font-bold text-blue-400 font-mono">Kubernetes (K8s API)</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Wire the Remediation Controller to the official <code className="text-blue-300">kubernetes-client</code> python library to perform real <code className="text-blue-300">apps/v1 Deployment</code> scale operations and pod deletions.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2">
            <span className="text-xs font-bold text-purple-400 font-mono">AWS / Azure / GCP</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect to AWS CloudWatch Alarms or AWS Auto Scaling Groups via Boto3 SDK for multi-region elastic failover.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
