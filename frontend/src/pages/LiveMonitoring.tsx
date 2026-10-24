import React, { useState } from 'react';
import { useCloud } from '../context/CloudContext';
import { 
  Activity, 
  Pause, 
  Play, 
  RotateCcw, 
  Server, 
  Cpu, 
  HardDrive, 
  Clock, 
  Network as NetworkIcon, 
  AlertTriangle 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';

export const LiveMonitoring: React.FC = () => {
  const { cluster, instances, history, settings } = useCloud();
  const [isPaused, setIsPaused] = useState(false);
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '15m'>('5m');

  const displayHistory = isPaused ? history : history;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-navy-900 border border-navy-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Live Infrastructure Telemetry Streams
          </h2>
          <p className="text-xs text-slate-400">
            Real-time multi-dimensional time series metrics streamed over WebSocket
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              isPaused 
                ? 'bg-amber-600 text-white' 
                : 'bg-navy-800 text-slate-300 hover:text-white border border-navy-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
          </button>

          {/* Time Range Pills */}
          <div className="flex bg-navy-950 p-1 rounded-lg border border-navy-800 text-xs">
            {(['1m', '5m', '15m'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded font-mono font-medium transition ${
                  timeRange === range
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of 4 Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. CPU Utilization (%) with Warning & Critical Lines */}
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                CPU Utilization (%)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">
              Current: {cluster.cpu_utilization}%
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e293b', fontSize: '11px' }} />
                <ReferenceLine y={settings.cpu_warning_threshold} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warn 75%', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={settings.cpu_critical_threshold} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Crit 90%', fill: '#f43f5e', fontSize: 10 }} />
                <Line type="monotone" dataKey="cpu" stroke="#06b6d4" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Memory Utilization (%) */}
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Memory Utilization (%)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-blue-400">
              Current: {cluster.memory_utilization}%
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e293b', fontSize: '11px' }} />
                <ReferenceLine y={settings.memory_warning_threshold} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warn 75%', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={settings.memory_critical_threshold} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Crit 85%', fill: '#f43f5e', fontSize: 10 }} />
                <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Request Latency (ms) */}
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Request Latency (ms)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              Current: {cluster.request_latency_ms} ms
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e293b', fontSize: '11px' }} />
                <ReferenceLine y={settings.latency_threshold_ms} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Threshold 200ms', fill: '#f43f5e', fontSize: 10 }} />
                <Line type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Request Error Rate (%) & Network Traffic */}
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                HTTP Error Rate (%)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400">
              Current: {cluster.error_rate}%
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e293b', fontSize: '11px' }} />
                <ReferenceLine y={settings.error_rate_threshold_pct} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'SLO 5%', fill: '#f43f5e', fontSize: 10 }} />
                <Line type="monotone" dataKey="error_rate" stroke="#f43f5e" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Instance Telemetry Table */}
      <div className="p-5 rounded-xl bg-navy-900 border border-navy-800">
        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          Active Container Pod Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-850 text-slate-400 font-mono uppercase text-[10px] border-b border-navy-800">
              <tr>
                <th className="py-2.5 px-3">Pod ID</th>
                <th className="py-2.5 px-3">Instance Name</th>
                <th className="py-2.5 px-3">Health Status</th>
                <th className="py-2.5 px-3">CPU (%)</th>
                <th className="py-2.5 px-3">Memory (%)</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Throughput</th>
                <th className="py-2.5 px-3">Restarts</th>
                <th className="py-2.5 px-3">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {instances.map(inst => (
                <tr key={inst.id} className="hover:bg-navy-850/50 transition">
                  <td className="py-2.5 px-3 text-cyan-400 font-semibold">{inst.id}</td>
                  <td className="py-2.5 px-3 text-slate-200">{inst.name}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      inst.status === 'healthy' 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : inst.status === 'degraded'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {inst.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{inst.cpu_percent}%</td>
                  <td className="py-2.5 px-3 text-slate-300">{inst.memory_percent}%</td>
                  <td className="py-2.5 px-3 text-slate-300">{inst.request_latency_ms} ms</td>
                  <td className="py-2.5 px-3 text-slate-300">{inst.network_mbps} Mbps</td>
                  <td className="py-2.5 px-3 text-amber-400">{inst.restart_count}</td>
                  <td className="py-2.5 px-3 text-slate-400">{inst.uptime_seconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
