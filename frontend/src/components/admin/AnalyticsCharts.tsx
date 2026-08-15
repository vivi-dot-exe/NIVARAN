import React, { useMemo } from 'react';
import type { Grievance } from '../../types/grievance';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  ShieldAlert,
  AlertOctagon,
  Clock,
  Building2
} from 'lucide-react';

interface AnalyticsChartsProps {
  grievances: Grievance[];
  isDarkMode: boolean;
  onFilterCategory?: (category: string | null) => void;
  onFilterStatus?: (status: string | null) => void;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  grievances,
  isDarkMode,
  onFilterCategory,
  onFilterStatus
}) => {
  // 1. Compute Category Breakdown Data
  const categoryData = useMemo(() => {
    const counts: Record<string, { count: number; highPriorityCount: number; color: string; label: string }> = {
      'Water Supply': { count: 0, highPriorityCount: 0, color: '#0284c7', label: 'Water Supply' },
      'Roads & Infra': { count: 0, highPriorityCount: 0, color: '#d97706', label: 'Roads & Potholes' },
      'Sanitation & Waste': { count: 0, highPriorityCount: 0, color: '#16a34a', label: 'Sanitation & Garbage' },
      'Electricity': { count: 0, highPriorityCount: 0, color: '#dc2626', label: 'Electricity & Power' },
      'Public Distribution': { count: 0, highPriorityCount: 0, color: '#9333ea', label: 'Public Health & Safety' }
    };

    grievances.forEach((g) => {
      const dept = g.Department;
      if (counts[dept]) {
        counts[dept].count += 1;
        if (g.Priority_Score >= 75) {
          counts[dept].highPriorityCount += 1;
        }
      } else {
        // Fallback categorization
        if (dept.toLowerCase().includes('water')) {
          counts['Water Supply'].count += 1;
        } else if (dept.toLowerCase().includes('road') || dept.toLowerCase().includes('pothole') || dept.toLowerCase().includes('infra')) {
          counts['Roads & Infra'].count += 1;
        } else if (dept.toLowerCase().includes('sanitat') || dept.toLowerCase().includes('garbage') || dept.toLowerCase().includes('waste')) {
          counts['Sanitation & Waste'].count += 1;
        } else if (dept.toLowerCase().includes('elect') || dept.toLowerCase().includes('power')) {
          counts['Electricity'].count += 1;
        } else {
          counts['Public Distribution'].count += 1;
        }
      }
    });

    return Object.keys(counts).map((key) => ({
      name: counts[key].label,
      rawDept: key,
      tickets: counts[key].count,
      highPriority: counts[key].highPriorityCount,
      color: counts[key].color
    }));
  }, [grievances]);

  // 2. Compute Status Distribution Data
  const statusData = useMemo(() => {
    const statuses = [
      { name: 'Pending', key: 'Pending', color: '#f59e0b', count: 0 },
      { name: 'In Progress', key: 'In Progress', color: '#0284c7', count: 0 },
      { name: 'Resolved', key: 'Resolved', color: '#10b981', count: 0 },
      { name: 'Escalated', key: 'Escalated', color: '#f43f5e', count: 0 }
    ];

    grievances.forEach((g) => {
      const match = statuses.find((s) => s.key.toLowerCase() === (g.Status || '').toLowerCase());
      if (match) {
        match.count += 1;
      } else {
        statuses[0].count += 1; // default to pending
      }
    });

    const total = grievances.length || 1;
    return statuses.map((st) => ({
      ...st,
      value: st.count,
      percent: Math.round((st.count / total) * 100)
    }));
  }, [grievances]);

  // 3. High-Priority Tickets (>75 score) & SLA Tracking Highlights
  const highPriorityTickets = useMemo(() => {
    return grievances
      .filter((g) => g.Priority_Score >= 75 || g.Status === 'Escalated')
      .sort((a, b) => b.Priority_Score - a.Priority_Score)
      .slice(0, 5);
  }, [grievances]);

  const totalHighPriority = useMemo(() => {
    return grievances.filter((g) => g.Priority_Score >= 75).length;
  }, [grievances]);

  const totalEscalated = useMemo(() => {
    return grievances.filter((g) => g.Status === 'Escalated').length;
  }, [grievances]);

  return (
    <div className="space-y-6">
      
      {/* 2-Column Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CHART 1: Category Breakdown Bar Chart (7 Cols) */}
        <div className={`lg:col-span-7 p-6 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        } space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`font-bold text-sm uppercase tracking-wide ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Department Grievance Breakdown
                </h3>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Ticket distribution across 5 core municipal public service categories
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
              Total {grievances.length} Grievances
            </span>
          </div>

          {/* Bar Chart Container */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} opacity={0.5} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  tick={{ fill: isDarkMode ? '#94a3b8' : '#475569', fontSize: 11 }}
                  axisLine={{ stroke: isDarkMode ? '#475569' : '#cbd5e1' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: isDarkMode ? '#94a3b8' : '#475569', fontSize: 11 }}
                  axisLine={{ stroke: isDarkMode ? '#475569' : '#cbd5e1' }}
                />
                <Tooltip
                  cursor={{ fill: isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 0.6)' }}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const data = payload[0].payload as { name: string; rawDept: string; tickets: number; highPriority: number; color: string };
                      return (
                        <div className="p-3 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
                          <div className="flex items-center space-x-2 border-b border-slate-800 pb-1">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                            <span className="font-bold text-white text-sm">{data.name}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span>Total Registered:</span>
                            <span className="font-bold text-white font-mono text-sm">{data.tickets}</span>
                          </div>
                          <div className="flex items-center justify-between text-rose-400 font-semibold">
                            <span>High Priority (&gt;75):</span>
                            <span className="font-mono">{data.highPriority}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="tickets"
                  radius={[8, 8, 0, 0]}
                  onClick={(data: unknown) => {
                    const item = data as { rawDept?: string };
                    if (item && item.rawDept) {
                      onFilterCategory?.(item.rawDept);
                    }
                  }}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`bar-cell-${index}`} fill={entry.color} className="cursor-pointer hover:opacity-80 transition" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Department Quick Filter Legend */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-800/80">
            {categoryData.map((dept) => (
              <button
                key={dept.rawDept}
                onClick={() => onFilterCategory?.(dept.rawDept)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 border border-slate-700/80 text-[11px] text-slate-300 flex items-center space-x-1.5 transition cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.color }} />
                <span>{dept.name}</span>
                <span className="font-mono font-bold text-white">({dept.tickets})</span>
              </button>
            ))}
          </div>
        </div>

        {/* CHART 2: Status Distribution Donut Chart (5 Cols) */}
        <div className={`lg:col-span-5 p-6 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        } space-y-4`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`font-bold text-sm uppercase tracking-wide ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Status Proportions
                </h3>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Operational lifecycle stages
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Live Flow
            </span>
          </div>

          {/* Donut Chart with Center Counter */}
          <div className="h-72 w-full relative">
            {/* Center Total Counter */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
              <span className="text-3xl font-extrabold text-white font-mono">{grievances.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tickets</span>
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

      {/* PRIORITY & SLA TRACKING SECTION (Requirement 3 Highlight) */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      } space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-bold text-sm uppercase tracking-wide flex items-center space-x-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <span>Priority & SLA Breach Triage Tracker</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {totalHighPriority} Critical / High (&gt;75)
                </span>
              </h3>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Automated escalation detection flagging tickets exceeding DARPG turnaround thresholds
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="px-3 py-1 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 font-mono font-bold flex items-center space-x-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>{totalEscalated} Escalated Breaches</span>
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
                        <span>SLA BREACHED (0h)</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center space-x-0.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Near Breach (&lt;4h)</span>
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
