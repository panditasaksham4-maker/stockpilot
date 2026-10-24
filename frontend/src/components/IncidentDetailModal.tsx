import React from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Activity, 
  Cpu, 
  ShieldCheck, 
  ArrowRight,
  Database,
  BarChart2
} from 'lucide-react';
import { IncidentRecord } from '../types';

interface IncidentDetailModalProps {
  incident: IncidentRecord | null;
  onClose: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({ incident, onClose }) => {
  if (!incident) return null;

  const isResolved = incident.status === 'RESOLVED';
  const isFailed = incident.status === 'RECOVERY_FAILED';

  const defaultStages = [
    { stage: 'OBSERVE', desc: 'Telemetry streaming from cluster instances & containers.' },
    { stage: 'COLLECT METRICS', desc: 'Normalized 60-second rolling window aggregated.' },
    { stage: 'DETECT ANOMALY', desc: `Isolation Forest flagged anomaly (Score: ${incident.anomaly_score.toFixed(2)}).` },
    { stage: 'ANALYSE POSSIBLE CAUSE', desc: incident.probable_cause },
    { stage: 'EVALUATE REMEDIATION POLICY', desc: `Guardrails check: ${incident.recommended_action} approved.` },
    { stage: 'EXECUTE APPROVED ACTION', desc: incident.executed_action ? `Action executed: ${incident.executed_action}` : 'Remediation queued' },
    { stage: 'VERIFY RECOVERY', desc: incident.verification_result || 'Verifying recovery telemetry within observation window.' },
    { stage: 'RESOLVE OR ESCALATE', desc: isResolved ? `RESOLVED in ${incident.duration_sec}s` : isFailed ? 'FAILED - Escalated to human operator' : 'Active remediation in progress' },
    { stage: 'RECORD AUDIT LOG', desc: 'Immutable audit entry recorded in SQLite database.' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-navy-850 border-b border-navy-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg border ${
              isResolved 
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400' 
                : isFailed
                  ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                  : 'bg-amber-950/80 border-amber-800 text-amber-400'
            }`}>
              {isResolved ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white font-mono">
                  {incident.id}
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase border ${
                  isResolved 
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
                    : 'bg-rose-950 text-rose-400 border-rose-800'
                }`}>
                  {incident.status}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {incident.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {incident.detected_condition}
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-navy-850 border border-navy-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Severity</span>
              <div className="text-sm font-bold uppercase text-amber-400 mt-1">
                {incident.severity}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-navy-850 border border-navy-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Anomaly Score</span>
              <div className="text-sm font-mono font-bold text-cyan-400 mt-1">
                {incident.anomaly_score.toFixed(3)} / 1.000
              </div>
            </div>
            <div className="p-3 rounded-xl bg-navy-850 border border-navy-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Executed Action</span>
              <div className="text-sm font-mono font-bold text-slate-200 mt-1">
                {incident.executed_action || incident.recommended_action}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-navy-850 border border-navy-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Recovery MTTR</span>
              <div className="text-sm font-mono font-bold text-emerald-400 mt-1">
                {incident.duration_sec ? `${incident.duration_sec}s` : 'In Progress'}
              </div>
            </div>
          </div>

          {/* Closed Loop Workflow Timeline */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Closed-Loop Recovery Lifecycle
            </h3>
            <div className="relative border-l-2 border-navy-700 ml-4 pl-4 space-y-4">
              {defaultStages.map((stg, idx) => {
                const isPassed = isResolved || idx <= 5;
                return (
                  <div key={idx} className="relative group">
                    {/* Circle dot */}
                    <div className={`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 ${
                      isPassed 
                        ? 'bg-emerald-500 border-navy-900 shadow-sm shadow-emerald-500' 
                        : 'bg-navy-700 border-navy-800'
                    }`} />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {stg.stage}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Step {idx + 1}/9
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {stg.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metrics Snapshot */}
          {incident.metrics_snapshot && (
            <div className="p-4 rounded-xl bg-navy-850 border border-navy-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                Detection Metrics Snapshot
              </h4>
              <pre className="text-xs font-mono text-cyan-300 bg-navy-950 p-3 rounded-lg overflow-x-auto border border-navy-800">
                {JSON.stringify(incident.metrics_snapshot, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-navy-950 border-t border-navy-800 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>SQLite Audit Record Verified</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-navy-800 hover:bg-navy-700 text-slate-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
