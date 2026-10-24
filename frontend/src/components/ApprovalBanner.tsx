import React from 'react';
import { ShieldAlert, Check, X, ArrowRight } from 'lucide-react';
import { useCloud } from '../context/CloudContext';

export const ApprovalBanner: React.FC = () => {
  const { activeIncident, approveRemediation, rejectRemediation } = useCloud();

  if (!activeIncident || activeIncident.status !== 'PENDING_APPROVAL') {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-950/90 via-navy-900 to-amber-950/90 border-y border-amber-600/60 px-6 py-3.5 shadow-lg animate-pulse-subtle">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-500 text-black">
                APPROVAL REQUIRED
              </span>
              <span className="text-xs font-mono text-slate-300">
                Incident: {activeIncident.id}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-100 mt-0.5">
              {activeIncident.detected_condition}
            </p>
            <p className="text-xs text-amber-200/80">
              Proposed Action: <span className="font-mono font-bold text-amber-300">{activeIncident.recommended_action}</span> (Holding in manual approval mode)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => rejectRemediation(activeIncident.id)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/80 border border-rose-800 hover:bg-rose-900 transition flex items-center space-x-1.5"
          >
            <X className="w-4 h-4" />
            <span>Reject Action</span>
          </button>

          <button
            onClick={() => approveRemediation(activeIncident.id)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-950 transition flex items-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Approve & Execute</span>
          </button>
        </div>
      </div>
    </div>
  );
};
