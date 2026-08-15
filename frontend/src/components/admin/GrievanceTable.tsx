import React, { useState } from 'react';
import type { Grievance } from '../../types/grievance';
import { WARDS_LIST, DEPARTMENTS_LIST } from '../../mockData/grievances';
import {
  Search,
  Download,
  Edit,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Layers
} from 'lucide-react';

interface GrievanceTableProps {
  grievances: Grievance[];
  selectedClusterId: string | null;
  onSelectGrievance: (grievance: Grievance) => void;
  isDarkMode: boolean;
}

export const GrievanceTable: React.FC<GrievanceTableProps> = ({
  grievances,
  selectedClusterId,
  onSelectGrievance,
  isDarkMode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Filtering logic
  const filteredData = grievances.filter((g) => {
    if (selectedClusterId && g.Duplicate_Group !== selectedClusterId) {
      return false;
    }

    if (showDuplicatesOnly && !g.Duplicate_Group) {
      return false;
    }

    if (selectedWard !== 'ALL' && g.Ward !== selectedWard) {
      return false;
    }

    if (selectedDept !== 'ALL' && g.Department !== selectedDept) {
      return false;
    }

    if (selectedPriority !== 'ALL' && g.Priority !== selectedPriority) {
      return false;
    }

    if (selectedStatus !== 'ALL' && g.Status !== selectedStatus) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchId = g.Complaint_ID.toLowerCase().includes(q);
      const matchText = g.Complaint.toLowerCase().includes(q);
      const matchOfficer = (g.Assigned_Officer || '').toLowerCase().includes(q);
      return matchId || matchText || matchOfficer;
    }

    return true;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Complaint_ID',
      'Language',
      'Department',
      'Topic',
      'Priority_Score',
      'Priority',
      'Ward',
      'Status',
      'Date_Submitted',
      'Complaint'
    ];

    const rows = filteredData.map((g) => [
      g.Complaint_ID,
      g.Language,
      g.Department,
      `"${g.Topic}"`,
      g.Priority_Score,
      g.Priority,
      `"${g.Ward}"`,
      g.Status,
      g.Date_Submitted,
      `"${g.Complaint.replace(/"/g, '""')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DARPG_Grievance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`p-6 rounded-2xl border ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    } space-y-5`}>
      
      {/* Table Header & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className={`font-bold text-base uppercase tracking-wide flex items-center space-x-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <span>Comprehensive Grievance Master Registry</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {filteredData.length} Tickets Filtered
            </span>
          </h3>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Real-time status tracking, color-coded SLA timers, and 1-click nodal action drawer.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 ${
              showDuplicatesOnly
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showDuplicatesOnly ? 'Showing Duplicates Only' : 'Filter Duplicates'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Multi-Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Search Bar */}
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ID, text, officer..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Ward Filter */}
        <div>
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Wards</option>
            {WARDS_LIST.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* Dept Filter */}
        <div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS_LIST.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical (&gt;85)</option>
            <option value="High">High (70-84)</option>
            <option value="Medium">Medium (45-69)</option>
            <option value="Low">Low (&lt;45)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Escalated">Escalated</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'bg-slate-955 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              <th className="p-3.5 font-bold uppercase tracking-wider">Complaint ID</th>
              <th className="p-3.5 font-bold uppercase tracking-wider">Grievance & Language</th>
              <th className="p-3.5 font-bold uppercase tracking-wider">Department & Ward</th>
              <th className="p-3.5 font-bold uppercase tracking-wider">Priority Score</th>
              <th className="p-3.5 font-bold uppercase tracking-wider">SLA Timer</th>
              <th className="p-3.5 font-bold uppercase tracking-wider">Status</th>
              <th className="p-3.5 font-bold uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredData.length > 0 ? (
              filteredData.map((row) => (
                <tr
                  key={row.Complaint_ID}
                  className={`transition hover:bg-slate-800/50 ${
                    row.Status === 'Escalated' ? 'bg-rose-950/20' : ''
                  }`}
                >
                  {/* ID & Cluster Badge */}
                  <td className="p-3.5 font-mono font-bold text-white whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className="text-emerald-400">#{row.Complaint_ID}</span>
                      {row.Duplicate_Group && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 w-fit">
                          {row.Duplicate_Group}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Complaint Text */}
                  <td className="p-3.5 max-w-sm">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {row.Language}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 truncate">
                          {row.Topic}
                        </span>
                      </div>
                      <p className="text-slate-200 line-clamp-2 leading-relaxed">
                        "{row.Complaint}"
                      </p>
                    </div>
                  </td>

                  {/* Department & Ward */}
                  <td className="p-3.5 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className="font-semibold text-cyan-300 block">{row.Department}</span>
                      <span className="text-slate-400 text-[11px] block">📍 {row.Ward}</span>
                    </div>
                  </td>

                  {/* Priority Gauge */}
                  <td className="p-3.5 whitespace-nowrap">
                    <div className="space-y-1.5 w-28">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-bold ${
                          row.Priority === 'Critical' ? 'text-rose-400' :
                          row.Priority === 'High' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {row.Priority}
                        </span>
                        <span className="font-mono text-slate-400">{row.Priority_Score}/100</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.Priority_Score >= 85 ? 'bg-rose-500' :
                            row.Priority_Score >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${row.Priority_Score}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Color-Coded SLA Timer */}
                  <td className="p-3.5 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      {row.Status === 'Escalated' || row.Priority_Score >= 90 ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>BREACHED (0h)</span>
                        </span>
                      ) : row.Status === 'Resolved' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>RESOLVED</span>
                        </span>
                      ) : row.Priority_Score >= 75 ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>4h 12m (Near)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-teal-400" />
                          <span>18h 45m Safe</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                      row.Status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                      row.Status === 'Escalated' ? 'bg-rose-500/20 text-rose-400' :
                      row.Status === 'In Progress' ? 'bg-sky-500/20 text-sky-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {row.Status}
                    </span>
                  </td>

                  {/* Action Drawer Button */}
                  <td className="p-3.5 whitespace-nowrap text-right">
                    <button
                      onClick={() => onSelectGrievance(row)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center space-x-1 ml-auto"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Take Action</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No grievances found matching your active filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
