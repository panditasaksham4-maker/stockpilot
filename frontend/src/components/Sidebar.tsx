import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  Network, 
  BrainCircuit, 
  AlertTriangle, 
  Sliders, 
  BarChart3, 
  Layers,
  Shield,
  CircleDot
} from 'lucide-react';
import { NavigationPage } from '../types';
import { useCloud } from '../context/CloudContext';

interface SidebarProps {
  currentPage: NavigationPage;
  onSelectPage: (page: NavigationPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  const { cluster, incidents, activeIncident } = useCloud();

  const activeIncidentsCount = incidents.filter(i => 
    i.status !== 'RESOLVED' && i.status !== 'RECOVERY_FAILED'
  ).length + (activeIncident ? 1 : 0);

  const menuItems = [
    { id: 'overview' as NavigationPage, label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'monitoring' as NavigationPage, label: 'Live Monitoring', icon: Activity },
    { id: 'topology' as NavigationPage, label: 'Infrastructure Topology', icon: Network },
    { id: 'ai-insights' as NavigationPage, label: 'AI Insights & ML', icon: BrainCircuit },
    { 
      id: 'incidents' as NavigationPage, 
      label: 'Incident Management', 
      icon: AlertTriangle,
      badge: activeIncidentsCount > 0 ? activeIncidentsCount : null,
      badgeColor: 'bg-rose-500'
    },
    { id: 'remediation-control' as NavigationPage, label: 'Remediation Control', icon: Sliders },
    { id: 'evaluation' as NavigationPage, label: 'Performance Evaluation', icon: BarChart3 },
    { id: 'architecture' as NavigationPage, label: 'System Architecture', icon: Layers },
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-800 flex flex-col justify-between shrink-0 h-[calc(100vh-61px)] overflow-y-auto">
      <div className="p-4 space-y-6">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Navigation
          </p>
          <nav className="space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectPage(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 shadow-sm shadow-cyan-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white ${item.badgeColor} animate-pulse`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Health Quick Card */}
        <div className="p-3.5 rounded-xl bg-navy-850 border border-navy-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Cluster Health
            </span>
            <span className={`text-xs font-mono font-bold ${
              cluster.health_score > 85 ? 'text-emerald-400' : cluster.health_score > 60 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {cluster.health_score}%
            </span>
          </div>

          <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden border border-navy-800">
            <div 
              className={`h-full transition-all duration-500 ${
                cluster.health_score > 85 ? 'bg-emerald-500' : cluster.health_score > 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${cluster.health_score}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>Containers: {cluster.healthy_containers}/{cluster.total_containers}</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CircleDot className="w-2.5 h-2.5" />
              Optimal
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-navy-800/80 bg-navy-950/40 text-[11px] text-slate-500">
        <div className="flex items-center justify-between">
          <span>Isolation Forest ML</span>
          <span className="text-emerald-400 font-mono">Active</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>Remediation Engine</span>
          <span className="text-cyan-400 font-mono">Closed-Loop</span>
        </div>
      </div>
    </aside>
  );
};
