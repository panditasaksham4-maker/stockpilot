import React, { useState } from 'react';
import { useCloud } from '../context/CloudContext';
import { 
  AlertTriangle, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  ArrowUpDown, 
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { IncidentRecord } from '../types';
import { api } from '../services/api';

interface IncidentManagementProps {
  onSelectIncident: (incident: IncidentRecord) => void;
}

export const IncidentManagement: React.FC<IncidentManagementProps> = ({ onSelectIncident }) => {
  const { incidents, activeIncident } = useCloud();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Combine active incident if present
  const allIncidents = activeIncident 
    ? [activeIncident, ...incidents.filter(i => i.id !== activeIncident.id)]
    : incidents;

  const filtered = allIncidents.filter(inc => {
    const matchesSearch = 
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.detected_condition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.recommended_action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || inc.severity.toUpperCase() === severityFilter;
    const matchesStatus = statusFilter === 'ALL' || inc.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Calculate summary metrics
  const totalCount = allIncidents.length;
  const resolvedCount = allIncidents.filter(i => i.status === 'RESOLVED').length;
  const failedCount = allIncidents.filter(i => i.status === 'RECOVERY_FAILED').length;
  const activeCount = totalCount - resolvedCount - failedCount;
  
  const durations = allIncidents.filter(i => i.duration_sec && i.status === 'RESOLVED').map(i => i.duration_sec);
  const avgMttr = durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1) : '7.2';

  const handleExportCsv = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Export */}
      <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-cyan-400" />
            Incident Management & Autonomous Recovery Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Persistent SQLite incident history, complete lifecycle stage audits, and compliance export
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 rounded-lg text-xs font-semibold tracking-wide transition flex items-center space-x-2"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Incidents</span>
          <div className="text-2xl font-mono font-bold text-slate-100 mt-1">{totalCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Active / Remediating</span>
          <div className="text-2xl font-mono font-bold text-amber-400 mt-1">{activeCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Successfully Healed</span>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">{resolvedCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Mean Time to Recovery (MTTR)</span>
          <div className="text-2xl font-mono font-bold text-cyan-400 mt-1">{avgMttr}s</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by ID, root-cause, or action..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-navy-950 border border-navy-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600 font-sans"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="bg-navy-950 border border-navy-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-600 font-mono"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="NORMAL">Normal</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-navy-950 border border-navy-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-600 font-mono"
          >
            <option value="ALL">All Statuses</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REMEDIATING">Remediating</option>
            <option value="VERIFYING">Verifying</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="RECOVERY_FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="p-5 rounded-xl bg-navy-900 border border-navy-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-850 text-slate-400 font-mono uppercase text-[10px] border-b border-navy-800">
              <tr>
                <th className="py-3 px-3">Incident ID</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Detected Condition</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Recovery MTTR</th>
                <th className="py-3 px-3 text-right">Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-mono">
                    No incidents match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(inc => (
                  <tr key={inc.id} className="hover:bg-navy-850/60 transition">
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">{inc.id}</td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{inc.timestamp?.substring(11, 19) || 'Just now'}</td>
                    <td className="py-3 px-3 font-medium text-slate-200 max-w-xs truncate">{inc.detected_condition}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inc.severity === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{inc.executed_action || inc.recommended_action}</td>
                    <td className="py-3 px-3 font-mono text-cyan-400">{inc.anomaly_score.toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        inc.status === 'RESOLVED' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : inc.status === 'RECOVERY_FAILED'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {inc.duration_sec ? `${inc.duration_sec}s` : 'Active'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectIncident(inc)}
                        className="px-2.5 py-1 rounded bg-navy-800 hover:bg-cyan-950 text-cyan-400 border border-navy-700 hover:border-cyan-800 transition text-[11px] font-semibold"
                      >
                        Inspect Timeline
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
