import React, { useState } from 'react';
import { useCloud } from '../context/CloudContext';
import { 
  Sliders, 
  ShieldAlert, 
  ShieldCheck, 
  AlertOctagon, 
  Save, 
  RotateCcw, 
  Check, 
  X, 
  Clock, 
  Layers, 
  Zap,
  Power
} from 'lucide-react';
import { SystemSettings } from '../types';

export const RemediationControlCenter: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    toggleEmergencyStop, 
    activeIncident, 
    approveRemediation, 
    rejectRemediation 
  } = useCloud();

  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (key: keyof SystemSettings, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Emergency Stop */}
      <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Remediation Control Center & Safety Guardrails
          </h2>
          <p className="text-xs text-slate-400">
            Configure autonomic policy thresholds, replica constraints, manual approval mode, and emergency stop
          </p>
        </div>

        {/* Big Emergency STOP / RESUME Button */}
        <button
          onClick={toggleEmergencyStop}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-lg flex items-center gap-2 transform hover:scale-[1.02] ${
            settings.emergency_stop
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950 animate-bounce'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950 ring-2 ring-rose-500/50'
          }`}
        >
          <Power className="w-4 h-4 fill-current" />
          <span>{settings.emergency_stop ? 'RESUME AUTOMATED HEALING' : 'EMERGENCY STOP HEALING'}</span>
        </button>
      </div>

      {/* Manual Approval Queue (if active and in manual approval mode) */}
      {activeIncident && activeIncident.status === 'PENDING_APPROVAL' && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/80 to-navy-900 border border-amber-500/80 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Pending Remediation Action Awaiting Approval
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800">
              Operator Gatekeeper Active
            </span>
          </div>

          <p className="text-xs text-slate-300">
            Incident <strong className="text-cyan-400 font-mono">{activeIncident.id}</strong> diagnosed with condition: <strong>{activeIncident.detected_condition}</strong>.
          </p>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs font-mono text-slate-300">
              Proposed Remediation: <span className="text-cyan-300 font-bold">{activeIncident.recommended_action}</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => rejectRemediation(activeIncident.id)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/80 border border-rose-800 hover:bg-rose-900 transition flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => approveRemediation(activeIncident.id)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Authorize & Execute Action</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Master Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Autonomous Healing Master Toggle */}
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Autonomous Self-Healing
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically execute remediation without human intervention when guardrails permit
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('auto_healing_enabled', !formData.auto_healing_enabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                formData.auto_healing_enabled ? 'bg-cyan-600' : 'bg-slate-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                formData.auto_healing_enabled ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Manual Operator Approval Mode */}
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Manual Operator Approval Mode
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Hold proposed remediation actions in queue until authorized by human SRE
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('manual_approval_mode', !formData.manual_approval_mode)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                formData.manual_approval_mode ? 'bg-amber-600' : 'bg-slate-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                formData.manual_approval_mode ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Operational Guardrails & Limits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Max Replicas */}
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Max Replicas Bound</span>
              <span className="font-mono font-bold text-cyan-400">{formData.max_replicas} Pods</span>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              value={formData.max_replicas}
              onChange={e => handleChange('max_replicas', parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <span className="text-[10px] text-slate-500 block">Limits horizontal scale-out expansion</span>
          </div>

          {/* CPU Warning Threshold */}
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">CPU Warning Threshold</span>
              <span className="font-mono font-bold text-amber-400">{formData.cpu_warning_threshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="90"
              value={formData.cpu_warning_threshold}
              onChange={e => handleChange('cpu_warning_threshold', parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
            <span className="text-[10px] text-slate-500 block">Baseline warning classification boundary</span>
          </div>

          {/* CPU Critical Threshold */}
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">CPU Critical Threshold</span>
              <span className="font-mono font-bold text-rose-400">{formData.cpu_critical_threshold}%</span>
            </div>
            <input
              type="range"
              min="70"
              max="98"
              value={formData.cpu_critical_threshold}
              onChange={e => handleChange('cpu_critical_threshold', parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
            <span className="text-[10px] text-slate-500 block">Triggers high-priority scale-out policy</span>
          </div>

          {/* Memory Critical Threshold */}
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Memory Pressure Threshold</span>
              <span className="font-mono font-bold text-rose-400">{formData.memory_critical_threshold}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              value={formData.memory_critical_threshold}
              onChange={e => handleChange('memory_critical_threshold', parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
            <span className="text-[10px] text-slate-500 block">Triggers container recycling replacement</span>
          </div>

          {/* Latency Threshold */}
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Latency Threshold (ms)</span>
              <span className="font-mono font-bold text-cyan-400">{formData.latency_threshold_ms} ms</span>
            </div>
            <input
              type="range"
              min="80"
              max="500"
              step="10"
              value={formData.latency_threshold_ms}
              onChange={e => handleChange('latency_threshold_ms', parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <span className="text-[10px] text-slate-500 block">P99 SLA violation trigger</span>
          </div>

          {/* Error Rate Threshold */}
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Error Rate Threshold (%)</span>
              <span className="font-mono font-bold text-rose-400">{formData.error_rate_threshold_pct}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={formData.error_rate_threshold_pct}
              onChange={e => handleChange('error_rate_threshold_pct', parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
            <span className="text-[10px] text-slate-500 block">HTTP 5xx failure threshold</span>
          </div>

          {/* Action Cooldown Window */}
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Remediation Cooldown (s)</span>
              <span className="font-mono font-bold text-cyan-400">{formData.remediation_cooldown_sec}s</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              value={formData.remediation_cooldown_sec}
              onChange={e => handleChange('remediation_cooldown_sec', parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <span className="text-[10px] text-slate-500 block">Prevents flapping and rapid repeat actions</span>
          </div>

          {/* Verification Window */}
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Verification Window (s)</span>
              <span className="font-mono font-bold text-cyan-400">{formData.verification_window_sec}s</span>
            </div>
            <input
              type="range"
              min="4"
              max="30"
              value={formData.verification_window_sec}
              onChange={e => handleChange('verification_window_sec', parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <span className="text-[10px] text-slate-500 block">Observation period before marking resolved</span>
          </div>

          {/* Max Retry Attempts */}
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Max Retry Attempts</span>
              <span className="font-mono font-bold text-cyan-400">{formData.max_retry_attempts} Retries</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={formData.max_retry_attempts}
              onChange={e => handleChange('max_retry_attempts', parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <span className="text-[10px] text-slate-500 block">Escalates after repeated recovery failures</span>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end items-center space-x-3 pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" />
              Settings Persisted to SQLite Database!
            </span>
          )}
          <button
            type="submit"
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold tracking-wide shadow-lg shadow-cyan-950 flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>Persist Policy Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
