import React from 'react';
import { 
  X, 
  Flame, 
  Droplets, 
  Zap, 
  AlertOctagon, 
  Globe, 
  AlertTriangle, 
  RefreshCw,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';

interface FaultInjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FaultInjectionModal: React.FC<FaultInjectionModalProps> = ({ isOpen, onClose }) => {
  const { injectFault, activeFault } = useCloud();

  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'cpu-overload',
      title: 'CPU Overload',
      icon: Flame,
      color: 'from-orange-500 to-rose-600',
      textColor: 'text-orange-400',
      description: 'Simulates heavy CPU bound calculations. CPU ramps to >90%, queuing latency climbs.',
      expectedHealing: 'Horizontal scale-out: Replicas increase to distribute CPU load.'
    },
    {
      id: 'memory-leak',
      title: 'Memory Leak',
      icon: Droplets,
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-400',
      description: 'Simulates progressive uncollected RAM allocation leading to memory pressure >88%.',
      expectedHealing: 'Rolling container replacement: Gracefully spins up clean pod and recycles leaking pod.'
    },
    {
      id: 'traffic-spike',
      title: 'Sudden Traffic Spike',
      icon: Zap,
      color: 'from-amber-500 to-yellow-600',
      textColor: 'text-amber-400',
      description: 'Simulates a 400% surge in ingress HTTP request rate (RPS), stressing capacity.',
      expectedHealing: 'Auto-scale & Load Balancing: Spins up additional replicas to absorb traffic surge.'
    },
    {
      id: 'container-crash',
      title: 'Container Crash (OOM)',
      icon: AlertOctagon,
      color: 'from-red-600 to-rose-700',
      textColor: 'text-rose-400',
      description: 'Simulates abrupt container termination / exit code 137. Health drops to Unhealthy.',
      expectedHealing: 'Automated Container Restart: Restarts failed container with boot health-check.'
    },
    {
      id: 'network-latency',
      title: 'High Network Latency',
      icon: Globe,
      color: 'from-cyan-500 to-blue-600',
      textColor: 'text-cyan-400',
      description: 'Simulates degraded upstream link latency (>350ms ping) across cluster network.',
      expectedHealing: 'Traffic rerouting: Flushes connection pools and reroutes traffic around degraded link.'
    },
    {
      id: 'high-error-rate',
      title: 'High Error Rate (5xx)',
      icon: AlertTriangle,
      color: 'from-yellow-500 to-amber-600',
      textColor: 'text-yellow-400',
      description: 'Simulates broken worker threads returning HTTP 502/503 errors at >25% rate.',
      expectedHealing: 'Quarantine & Service Recycle: Drains unhealthy instance and recycles runtime.'
    },
    {
      id: 'reset',
      title: 'Reset to Normal',
      icon: RefreshCw,
      color: 'from-emerald-600 to-teal-600',
      textColor: 'text-emerald-400',
      description: 'Clears all active injected faults, resets cluster to 3 healthy replicas and baseline telemetry.',
      expectedHealing: 'Restores baseline state immediately.'
    }
  ];

  const handleTrigger = async (id: string) => {
    await injectFault(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-navy-850 border-b border-navy-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-400">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                SIMULATE INFRASTRUCTURE FAILURE
              </h2>
              <p className="text-xs text-slate-400">
                Trigger simulated real-world cloud failures to evaluate closed-loop AI anomaly detection & automated healing
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map(sc => {
            const Icon = sc.icon;
            const isCurrentlyActive = activeFault === sc.id;
            return (
              <div 
                key={sc.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isCurrentlyActive
                    ? 'bg-rose-950/30 border-rose-500/80 shadow-lg shadow-rose-950/50'
                    : 'bg-navy-850/60 border-navy-800 hover:border-slate-700 hover:bg-navy-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${sc.color} text-white shadow-sm`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-200">
                        {sc.title}
                      </h3>
                    </div>
                    {isCurrentlyActive && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-2.5">
                    {sc.description}
                  </p>
                  <div className="flex items-start space-x-1.5 text-[11px] text-cyan-300/80 bg-navy-950/70 p-2 rounded-lg border border-navy-800">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>Self-Healing:</strong> {sc.expectedHealing}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-navy-800/60 flex justify-end">
                  <button
                    onClick={() => handleTrigger(sc.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center space-x-1.5 ${
                      sc.id === 'reset'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                        : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-950'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sc.id === 'reset' ? 'Restore Baseline' : `Inject ${sc.title}`}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-navy-950 border-t border-navy-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Autonomous Closed-Loop: Observe &rarr; Detect &rarr; Diagnose &rarr; Remediate &rarr; Verify</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-300 hover:text-white bg-navy-800 hover:bg-navy-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
