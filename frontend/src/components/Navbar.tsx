import React from 'react';
import { useCloud } from '../context/CloudContext';
import { 
  Activity, 
  Cpu, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Server, 
  AlertCircle 
} from 'lucide-react';

interface NavbarProps {
  onOpenFaultModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenFaultModal }) => {
  const { cluster, settings, isBackendConnected, activeFault } = useCloud();

  return (
    <header className="sticky top-0 z-40 bg-navy-900/90 backdrop-blur-md border-b border-navy-800 px-6 py-3 flex items-center justify-between">
      {/* Title & Subtitle */}
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Cpu className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              AI SELF-HEALING CLOUD CONTROL CENTER
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              v2.0
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Intelligent Monitoring | AI Anomaly Detection | Autonomous Recovery
          </p>
        </div>
      </div>

      {/* Center / Status Badges */}
      <div className="hidden md:flex items-center space-x-3">
        {/* Backend Connectivity Status */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
          isBackendConnected 
            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' 
            : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-400 radar-live' : 'bg-amber-400'}`} />
          <span>{isBackendConnected ? 'Backend Live (FastAPI + WS)' : 'Autonomous Simulation Mode'}</span>
        </div>

        {/* Healing Policy State */}
        <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
          settings.emergency_stop
            ? 'bg-rose-950/60 text-rose-400 border-rose-800/60 animate-pulse'
            : settings.auto_healing_enabled
              ? 'bg-blue-950/60 text-cyan-400 border-cyan-800/60'
              : 'bg-slate-800 text-slate-400 border-slate-700'
        }`}>
          {settings.emergency_stop ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>EMERGENCY STOP ENGAGED</span>
            </>
          ) : settings.auto_healing_enabled ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>{settings.manual_approval_mode ? 'Manual Approval Mode' : 'Autonomous Healing Active'}</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <span>Monitoring Only (Healing Disabled)</span>
            </>
          )}
        </div>

        {/* Active Injected Fault Alert */}
        {activeFault && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-rose-950 text-rose-400 border border-rose-800/80 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>FAULT: {activeFault.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Quick Action Button: Simulate Infrastructure Failure */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenFaultModal}
          className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-lg text-xs font-semibold tracking-wide shadow-lg shadow-rose-900/30 flex items-center space-x-2 transition-all transform hover:scale-[1.02]"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>SIMULATE FAILURE</span>
        </button>

        <div className="text-right hidden sm:block">
          <div className="text-xs font-mono text-slate-300">
            {cluster.timestamp || new Date().toLocaleTimeString()}
          </div>
          <div className="text-[10px] text-slate-500">
            Replicas: {cluster.healthy_containers}/{cluster.total_containers}
          </div>
        </div>
      </div>
    </header>
  );
};
