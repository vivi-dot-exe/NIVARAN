import React from 'react';
import type { Grievance } from '../../types/grievance';
import type { Language } from '../../utils/translations';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  ShieldAlert,
  Clock,
  Building2,
  AlertOctagon
} from 'lucide-react';

import { TRANSLATIONS } from '../../utils/translations';

interface AnalyticsChartsProps {
  grievances: Grievance[];
  isDarkMode: boolean;
  onFilterStatus?: (status: string | null) => void;
  onFilterDept?: (dept: string | null) => void;
  currentLanguage?: Language;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  grievances,
  isDarkMode,
  onFilterStatus,
  onFilterDept,
  currentLanguage = 'en'
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  // Department counts breakdown
  const deptCounts = {
    'Water Supply': grievances.filter((g) => g.Department === 'Water Supply').length,
    'Roads & Infra': grievances.filter((g) => g.Department === 'Roads & Infra').length,
    'Sanitation & Waste': grievances.filter((g) => g.Department === 'Sanitation & Waste').length,
    'Electricity': grievances.filter((g) => g.Department === 'Electricity').length,
    'Public Distribution': grievances.filter((g) => g.Department === 'Public Distribution').length,
    'Public Health & Healthcare': grievances.filter((g) => g.Department === 'Public Health & Healthcare').length
  };

  const departmentData = [
    { name: 'Water Supply', count: deptCounts['Water Supply'], fill: '#0284c7' },
    { name: 'Roads & Potholes', count: deptCounts['Roads & Infra'], fill: '#d97706' },
    { name: 'Sanitation & Garbage', count: deptCounts['Sanitation & Waste'], fill: '#16a34a' },
    { name: 'Electricity & Power', count: deptCounts['Electricity'], fill: '#dc2626' },
    { name: 'Public Distribution', count: deptCounts['Public Distribution'], fill: '#9333ea' },
    { name: 'Public Health & Safety', count: deptCounts['Public Health & Healthcare'], fill: '#ec4899' }
  ];

  // Status breakdown for Donut Chart
  const statusCounts = {
    Pending: grievances.filter((g) => g.Status === 'Pending').length,
    'In Progress': grievances.filter((g) => g.Status === 'In Progress').length,
    Resolved: grievances.filter((g) => g.Status === 'Resolved').length,
    Escalated: grievances.filter((g) => g.Status === 'Escalated').length
  };

  const totalGrievances = grievances.length || 1;
  const statusData = [
    { name: 'Escalated', value: statusCounts.Escalated, count: statusCounts.Escalated, key: 'Escalated', color: '#e11d48', percent: Math.round((statusCounts.Escalated / totalGrievances) * 100) },
    { name: 'In Progress', value: statusCounts['In Progress'], count: statusCounts['In Progress'], key: 'In Progress', color: '#0284c7', percent: Math.round((statusCounts['In Progress'] / totalGrievances) * 100) },
    { name: 'Pending', value: statusCounts.Pending, count: statusCounts.Pending, key: 'Pending', color: '#d97706', percent: Math.round((statusCounts.Pending / totalGrievances) * 100) },
    { name: 'Resolved', value: statusCounts.Resolved, count: statusCounts.Resolved, key: 'Resolved', color: '#059669', percent: Math.round((statusCounts.Resolved / totalGrievances) * 100) }
  ].filter((item) => item.value > 0);

  // High priority / SLA breach tickets
  const highPriorityTickets = grievances
    .filter((g) => g.Priority_Score >= 75 || g.Status === 'Escalated')
    .sort((a, b) => b.Priority_Score - a.Priority_Score)
    .slice(0, 6);

  const totalHighPriority = grievances.filter((g) => g.Priority_Score >= 75).length;
  const totalEscalated = grievances.filter((g) => g.Status === 'Escalated').length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* 2-COLUMN ANALYTICS CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CHART 1: DEPARTMENT BREAKDOWN BAR CHART (8 Cols) */}
        <div className={`lg:col-span-7 p-6 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        } space-y-4`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`font-bold text-sm uppercase tracking-wide ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {t.deptBreakdownTitle}
                </h3>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t.deptBreakdownSub}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#7A0C38] text-white">
              Total {grievances.length} Grievances
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const data = payload[0].payload as { name: string; count: number; fill: string };
                      return (
                        <div className="p-3 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl text-xs space-y-1 backdrop-blur-md">
                          <div className="flex items-center space-x-1.5 font-bold text-white">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
                            <span>{data.name}</span>
                          </div>
                          <div className="text-amber-400 font-mono font-bold pt-1">
                            {data.count} Registered Grievances
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  onClick={(data: unknown) => {
                    const item = data as { name?: string };
                    if (item && item.name) {
                      onFilterDept?.(item.name);
                    }
                  }}
                  className="cursor-pointer hover:opacity-80 transition"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {departmentData.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onFilterDept?.(item.name)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 transition flex items-center space-x-1.5"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                <span>{item.name} ({item.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* CHART 2: STATUS PROPORTIONS DONUT CHART (5 Cols) */}
        <div className={`lg:col-span-5 p-6 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        } space-y-4`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`font-bold text-sm uppercase tracking-wide ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {t.statusProportionsTitle}
                </h3>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t.statusProportionsSub}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {t.liveFlowBadge}
            </span>
          </div>

          {/* Donut Chart with Center Counter */}
          <div className="h-72 w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
              <span className="text-3xl font-extrabold text-white font-mono">{grievances.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.totalTicketsCount}</span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  onClick={(data: unknown) => {
                    const item = data as { key?: string };
                    if (item && item.key) {
                      onFilterStatus?.(String(item.key));
                    }
                  }}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} stroke={isDarkMode ? '#0f172a' : '#ffffff'} strokeWidth={2} className="cursor-pointer hover:opacity-85 transition" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const data = payload[0].payload as { name: string; value: number; percent: number; color: string };
                      return (
                        <div className="p-2.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl text-xs space-y-1 backdrop-blur-md">
                          <div className="flex items-center space-x-1.5 font-bold text-white">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                            <span>{data.name}</span>
                          </div>
                          <div className="flex justify-between text-slate-300 space-x-4">
                            <span>Count:</span>
                            <span className="font-mono font-bold text-white">{data.value} tickets</span>
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span>Share:</span>
                            <span className="font-mono font-bold">{data.percent}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                  formatter={(value) => {
                    const item = statusData.find((s) => s.name === value);
                    return (
                      <span className="text-slate-300 font-medium">
                        {value} <strong className="font-mono text-white">({item?.count})</strong>
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* PRIORITY & SLA BREACH TRIAGE TRACKER CARDS SECTION */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      } space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-extrabold text-sm uppercase tracking-wide flex items-center space-x-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <span>{t.prioritySlaTrackerTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {totalHighPriority} {t.criticalHighBadge}
                </span>
              </h3>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {t.prioritySlaTrackerSub}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="px-3 py-1 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 font-mono font-bold flex items-center space-x-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>{totalEscalated} {t.escalatedBreachesBadge}</span>
            </div>
          </div>
        </div>

        {/* Priority Highlights Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {highPriorityTickets.map((ticket) => {
            const isBreached = ticket.Status === 'Escalated' || ticket.Priority_Score >= 90;
            return (
              <div
                key={ticket.Complaint_ID}
                className={`p-4 rounded-xl border transition hover:scale-[1.01] ${
                  isBreached
                    ? 'bg-rose-950/30 border-rose-600/50 text-rose-100'
                    : 'bg-amber-950/20 border-amber-600/40 text-amber-100'
                } space-y-2.5`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-extrabold text-sm text-white">#{ticket.Complaint_ID}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isBreached ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {ticket.Status}
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-slate-900/80 text-amber-300 border border-slate-700">
                    Score: {ticket.Priority_Score}/100
                  </span>
                </div>

                <p className="text-xs text-slate-200 line-clamp-2 italic leading-relaxed">
                  "{ticket.Complaint}"
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span className="flex items-center space-x-1 text-cyan-300 font-medium">
                    <Building2 className="w-3 h-3" />
                    <span>{ticket.Department}</span>
                  </span>
                  <span className="flex items-center space-x-1 font-mono font-semibold">
                    {isBreached ? (
                      <span className="text-rose-400 flex items-center space-x-0.5">
                        <Clock className="w-3 h-3 text-rose-400 animate-spin" />
                        <span>{t.slaBreachedZero}</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center space-x-0.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{t.nearBreachFour}</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
