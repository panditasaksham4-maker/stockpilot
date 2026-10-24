import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: string;
  status?: 'normal' | 'warning' | 'critical' | 'info';
  subtitle?: string;
  timestamp?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  status = 'normal',
  subtitle,
  timestamp
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'critical':
        return {
          border: 'border-rose-900/60 hover:border-rose-700',
          bgGlow: 'bg-rose-950/20',
          iconColor: 'text-rose-400',
          iconBg: 'bg-rose-950/80 border-rose-800/80',
          valueColor: 'text-rose-400',
          badge: 'bg-rose-950 text-rose-300 border-rose-800'
        };
      case 'warning':
        return {
          border: 'border-amber-900/60 hover:border-amber-700',
          bgGlow: 'bg-amber-950/20',
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-950/80 border-amber-800/80',
          valueColor: 'text-amber-400',
          badge: 'bg-amber-950 text-amber-300 border-amber-800'
        };
      case 'info':
        return {
          border: 'border-cyan-900/60 hover:border-cyan-700',
          bgGlow: 'bg-cyan-950/20',
          iconColor: 'text-cyan-400',
          iconBg: 'bg-cyan-950/80 border-cyan-800/80',
          valueColor: 'text-cyan-400',
          badge: 'bg-cyan-950 text-cyan-300 border-cyan-800'
        };
      default:
        return {
          border: 'border-navy-800 hover:border-navy-700',
          bgGlow: 'bg-navy-900/40',
          iconColor: 'text-emerald-400',
          iconBg: 'bg-emerald-950/80 border-emerald-800/80',
          valueColor: 'text-slate-100',
          badge: 'bg-navy-800 text-slate-300 border-navy-700'
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={`p-4 rounded-xl bg-navy-900/80 backdrop-blur border transition-all duration-300 ${styles.border} ${styles.bgGlow} shadow-sm group hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
            {title}
          </span>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className={`text-2xl font-bold tracking-tight font-mono ${styles.valueColor}`}>
              {value}
            </span>
            {unit && <span className="text-xs text-slate-400 font-medium">{unit}</span>}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg border ${styles.iconBg}`}>
          <Icon className={`w-4 h-4 ${styles.iconColor}`} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-navy-800/60 text-slate-400">
        <span className="truncate">{subtitle || 'Nominal Range'}</span>
        {timestamp && <span className="font-mono text-[10px] text-slate-500">{timestamp}</span>}
        {trend && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${styles.badge}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};
