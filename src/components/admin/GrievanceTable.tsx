import React, { useState, useEffect } from 'react';
import type { Grievance } from '../../types/grievance';
import type { Language } from '../../utils/translations';
import { TRANSLATIONS } from '../../utils/translations';
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
  civicIssues?: import('../../types/grievance').CivicIssue[];
  selectedClusterId: string | null;
  onSelectGrievance: (grievance: Grievance) => void;
  onSelectCivicIssue?: (issue: import('../../types/grievance').CivicIssue) => void;
  isDarkMode: boolean;
  currentLanguage?: Language;
}

export const GrievanceTable: React.FC<GrievanceTableProps> = ({
  grievances,
  civicIssues = [],
  selectedClusterId,
  onSelectGrievance,
  onSelectCivicIssue,
  isDarkMode,
  currentLanguage = 'en'
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  const [viewMode, setViewMode] = useState<'issues' | 'routing' | 'tickets'>('issues');

  const [searchTerm, setSearchTerm] = useState<string>(() => {
    try {
      return localStorage.getItem('nivaran_table_search') || '';
    } catch {
      return '';
    }
  });

  const [selectedWard, setSelectedWard] = useState<string>(() => {
    try {
      return localStorage.getItem('nivaran_table_ward') || 'ALL';
    } catch {
      return 'ALL';
    }
  });

  const [selectedDept, setSelectedDept] = useState<string>(() => {
    try {
      return localStorage.getItem('nivaran_table_dept') || 'ALL';
    } catch {
      return 'ALL';
    }
  });

  const [selectedPriority, setSelectedPriority] = useState<string>(() => {
    try {
      return localStorage.getItem('nivaran_table_priority') || 'ALL';
    } catch {
      return 'ALL';
    }
  });

  const [selectedStatus, setSelectedStatus] = useState<string>(() => {
    try {
      return localStorage.getItem('nivaran_table_status') || 'ALL';
    } catch {
      return 'ALL';
    }
  });

  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nivaran_table_duplicates') === 'true';
    } catch {
      return false;
    }
  });

  // Filter Civic Issues
  const filteredIssues = civicIssues.filter((iss) => {
    if (selectedWard !== 'ALL' && iss.ward !== selectedWard) return false;
    if (selectedDept !== 'ALL' && iss.category !== selectedDept && iss.responsible_department !== selectedDept) return false;
    if (selectedPriority !== 'ALL' && iss.priority_level !== selectedPriority) return false;
    if (selectedStatus !== 'ALL' && iss.status !== selectedStatus) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        iss.id.toLowerCase().includes(q) ||
        iss.issue_title.toLowerCase().includes(q) ||
        iss.issue_description.toLowerCase().includes(q) ||
        iss.ward.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter Low-Confidence (<60%) or Category Mismatch issues for Routing Review Queue
  const reviewQueueIssues = civicIssues.filter(
    (iss: import('../../types/grievance').CivicIssue) =>
      (iss.routing_confidence && iss.routing_confidence < 60) || iss.requires_human_review || iss.category_mismatch
  );

  // Save admin search term and filter states
  useEffect(() => {
    try {
      localStorage.setItem('nivaran_table_search', searchTerm);
    } catch (e) {
      console.warn('Failed to save search term:', e);
    }
  }, [searchTerm]);

  useEffect(() => {
    try {
      localStorage.setItem('nivaran_table_ward', selectedWard);
    } catch (e) {
      console.warn('Failed to save table ward filter:', e);
    }
  }, [selectedWard]);

  useEffect(() => {
    try {
      localStorage.setItem('nivaran_table_dept', selectedDept);
    } catch (e) {
      console.warn('Failed to save table department filter:', e);
    }
  }, [selectedDept]);

  useEffect(() => {
    try {
      localStorage.setItem('nivaran_table_priority', selectedPriority);
    } catch (e) {
      console.warn('Failed to save table priority filter:', e);
    }
  }, [selectedPriority]);

  useEffect(() => {
    try {
      localStorage.setItem('nivaran_table_status', selectedStatus);
    } catch (e) {
      console.warn('Failed to save table status filter:', e);
    }
  }, [selectedStatus]);

  useEffect(() => {
    try {
      localStorage.setItem('nivaran_table_duplicates', String(showDuplicatesOnly));
    } catch (e) {
      console.warn('Failed to save duplicates filter:', e);
    }
  }, [showDuplicatesOnly]);

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
    link.setAttribute('download', `NIVARAN_Grievance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`p-6 rounded-2xl border ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
    } space-y-5`}>
      
      {/* View Mode Toggle Strip */}
      <div className={`p-1.5 rounded-xl border flex items-center space-x-2 ${
        isDarkMode ? 'bg-slate-955 border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        <button
          onClick={() => setViewMode('issues')}
          className={`flex-1 py-2 px-3 rounded-lg font-extrabold text-xs transition flex items-center justify-center space-x-1.5 ${
            viewMode === 'issues'
              ? 'bg-[#1E3A8A] text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🏙️ CIVIC ISSUES VIEW</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/30 text-blue-200 font-mono font-black">
            {filteredIssues.length} Active Issues
          </span>
        </button>

        <button
          onClick={() => setViewMode('routing')}
          className={`flex-1 py-2 px-3 rounded-lg font-extrabold text-xs transition flex items-center justify-center space-x-1.5 ${
            viewMode === 'routing'
              ? 'bg-amber-600 text-slate-950 shadow-md animate-pulse'
              : 'text-amber-400 hover:text-amber-300'
          }`}
        >
          <span>⚠️ ROUTING REVIEW QUEUE</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-300 font-mono font-black border border-amber-500/40">
            {reviewQueueIssues.length} Require Review
          </span>
        </button>

        <button
          onClick={() => setViewMode('tickets')}
          className={`flex-1 py-2 px-3 rounded-lg font-extrabold text-xs transition flex items-center justify-center space-x-1.5 ${
            viewMode === 'tickets'
              ? 'bg-[#7A0C38] text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>📋 CITIZEN REPORTS REGISTRY</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/30 text-rose-200 font-mono font-black">
            {filteredData.length} Reports
          </span>
        </button>
      </div>

      {/* Table Header & Toolbar */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`font-extrabold text-base uppercase tracking-wide flex items-center space-x-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <span>{viewMode === 'issues' ? '🏙️ Master Civic Issues Operational Console' : t.masterRegistry}</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#7A0C38] text-white">
              {viewMode === 'issues' ? `${filteredIssues.length} Issues` : `${filteredData.length} ${t.ticketsFiltered}`}
            </span>
          </h3>
          <p className={`text-xs mt-0.5 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {viewMode === 'issues' 
              ? 'Aggregated real-world civic problems ranked by community impact, affected citizen volume, and urgency.'
              : t.masterRegistrySub}
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'tickets' && (
            <button
              onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition flex items-center space-x-1.5 ${
                showDuplicatesOnly
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t.filterDuplicates}</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center space-x-1.5 border ${
              isDarkMode 
                ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportCsv}</span>
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
            className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-[#7A0C38] focus:outline-none ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        {/* Ward Filter */}
        <div>
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-[#7A0C38] focus:outline-none ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="ALL">{t.allWards}</option>
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
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-[#7A0C38] focus:outline-none ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="ALL">{t.allDepts}</option>
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
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-[#7A0C38] focus:outline-none ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="ALL">{t.allPriorities}</option>
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
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-[#7A0C38] focus:outline-none ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="ALL">{t.allStatuses}</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Escalated">Escalated</option>
          </select>
        </div>
      </div>

      {/* Official Master Data Table */}
      <div className={`overflow-x-auto rounded-xl border ${
        isDarkMode ? 'border-slate-800' : 'border-slate-300'
      }`}>
        {viewMode === 'issues' ? (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#1E3A8A] text-white border-b border-blue-900">
                <th className="p-3.5 font-extrabold uppercase tracking-wider">Issue ID</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">Civic Issue Title & Description</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">Ward & Dept</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">Community Impact</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">Priority Level</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">Status</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {filteredIssues.length > 0 ? (
                filteredIssues.map((issue, idx) => (
                  <tr
                    key={issue.id}
                    className={`transition ${
                      issue.priority_level === 'Critical'
                        ? (isDarkMode ? 'bg-rose-950/25' : 'bg-rose-50/80')
                        : (idx % 2 === 0 ? (isDarkMode ? 'bg-slate-900' : 'bg-white') : (isDarkMode ? 'bg-slate-900/60' : 'bg-slate-50/80'))
                    } hover:bg-blue-950/20`}
                  >
                    <td className="p-3.5 font-mono font-extrabold text-blue-400 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span>#{issue.id}</span>
                        {issue.is_emerging && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 w-fit font-bold animate-pulse">
                            +{issue.growth_rate}% Surge ⚠️
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 max-w-sm">
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-white text-xs">
                          {issue.issue_title}
                        </h4>
                        <p className="line-clamp-2 leading-relaxed text-slate-300 text-[11px]">
                          "{issue.issue_description}"
                        </p>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="font-extrabold block text-blue-300">{issue.category}</span>
                        <span className="text-[11px] font-medium block text-slate-400">{issue.ward}</span>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="space-y-1 font-semibold text-xs">
                        <span className="block text-emerald-400">👥 {issue.affected_citizen_count} citizens affected</span>
                        <span className="block text-slate-300">📋 {issue.report_count} citizen reports</span>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-black border ${
                        issue.priority_level === 'Critical'
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : issue.priority_level === 'High'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-blue-950 text-blue-400 border-blue-800'
                      }`}>
                        {issue.priority_level} ({issue.priority_score}/100)
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-1 rounded text-xs font-extrabold bg-slate-800 text-slate-200 border border-slate-700">
                        {issue.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectCivicIssue?.(issue)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition shadow-md"
                      >
                        Inspect Civic Issue &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    No Civic Issues found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : viewMode === 'routing' ? (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-amber-600 text-slate-950 border-b border-amber-700">
                <th className="p-3.5 font-extrabold uppercase tracking-wider">Issue ID</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">Complaint & Mismatch Warning</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">AI Suggested Authority</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">Routing Confidence</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">Routing Rationale</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider text-right">Human Verification Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {reviewQueueIssues.length > 0 ? (
                reviewQueueIssues.map((issue) => (
                  <tr key={issue.id} className="bg-amber-950/20 hover:bg-amber-900/30 transition">
                    <td className="p-3.5 font-mono font-extrabold text-amber-400 whitespace-nowrap">
                      #{issue.id}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-white text-xs">{issue.issue_title}</h4>
                        {issue.category_mismatch && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold block">
                            ⚠️ Mismatch: Selected '{issue.citizen_selected_category}' vs AI '{issue.category}'
                          </span>
                        )}
                        <p className="line-clamp-2 text-slate-300 text-[11px]">"{issue.issue_description}"</p>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="font-extrabold block text-amber-300">{issue.responsible_authority}</span>
                        <span className="text-[11px] font-medium block text-slate-400">{issue.category} • {issue.ward}</span>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-black border ${
                        (issue.routing_confidence || 50) < 60
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : 'bg-amber-950 text-amber-400 border-amber-800'
                      }`}>
                        🔴 {issue.routing_confidence || 54}% (Verification Req.)
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs text-[11px] text-slate-300 whitespace-pre-line">
                      {issue.routing_reason || '• Dual keyword signals detected.\n• Verification required before officer dispatch.'}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectCivicIssue?.(issue)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shadow-md"
                      >
                        Inspect & Confirm Route &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    ✓ Routing Review Queue empty. All active issues are automatically routed with high confidence (&ge;80%).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#7A0C38] text-white border-b border-[#961247]">
                <th className="p-3.5 font-extrabold uppercase tracking-wider">{t.colId}</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">{t.colText}</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">{t.colDept}</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">{t.colPriority}</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">{t.colSla}</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider">{t.colStatus}</th>
                <th className="p-3.5 font-extrabold uppercase tracking-wider text-right">{t.colAction}</th>
              </tr>
            </thead>
          <tbody className={`divide-y font-sans ${
            isDarkMode ? 'divide-slate-800' : 'divide-slate-200'
          }`}>
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => (
                <tr
                  key={row.Complaint_ID}
                  className={`transition ${
                    row.Status === 'Escalated' 
                      ? (isDarkMode ? 'bg-rose-950/20' : 'bg-rose-50/80') 
                      : (idx % 2 === 0 ? (isDarkMode ? 'bg-slate-900' : 'bg-white') : (isDarkMode ? 'bg-slate-900/60' : 'bg-slate-50/80'))
                  } hover:bg-amber-50/40`}
                >
                  {/* ID & Cluster Badge */}
                  <td className="p-3.5 font-mono font-extrabold text-slate-900 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={isDarkMode ? 'text-amber-400' : 'text-[#7A0C38]'}>#{row.Complaint_ID}</span>
                      {row.Duplicate_Group && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-900 border border-amber-300 w-fit font-sans font-bold">
                          {row.Duplicate_Group}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Complaint Text */}
                  <td className="p-3.5 max-w-sm">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${
                          isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-800 border-slate-300'
                        }`}>
                          {row.Language}
                        </span>
                        <span className={`text-[11px] font-bold truncate ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          {row.Topic}
                        </span>
                      </div>
                      <p className={`line-clamp-2 leading-relaxed font-medium ${
                        isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        "{row.Complaint}"
                      </p>
                    </div>
                  </td>

                  {/* Department & Ward */}
                  <td className="p-3.5 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`font-extrabold block ${
                        isDarkMode ? 'text-blue-300' : 'text-blue-900'
                      }`}>{row.Department}</span>
                      <span className={`text-[11px] font-medium block ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>📍 {row.Ward}</span>
                    </div>
                  </td>

                  {/* Priority Gauge */}
                  <td className="p-3.5 whitespace-nowrap">
                    <div className="space-y-1.5 w-28">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-black ${
                          row.Priority === 'Critical' ? 'text-rose-700' :
                          row.Priority === 'High' ? 'text-amber-700' : 'text-emerald-700'
                        }`}>
                          {row.Priority}
                        </span>
                        <span className="font-mono font-bold text-slate-600">{row.Priority_Score}/100</span>
                      </div>
                      <div className={`w-full h-2 rounded-full overflow-hidden ${
                        isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                      }`}>
                        <div
                          className={`h-full rounded-full ${
                            row.Priority_Score >= 85 ? 'bg-rose-600' :
                            row.Priority_Score >= 70 ? 'bg-amber-500' : 'bg-emerald-600'
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
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-extrabold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
                          <span>BREACHED (0h)</span>
                        </span>
                      ) : row.Status === 'Resolved' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>RESOLVED</span>
                        </span>
                      ) : row.Priority_Score >= 75 ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>4h 12m (Near)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-extrabold bg-blue-100 text-blue-800 border border-blue-300 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>18h 45m Safe</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full font-extrabold text-[11px] ${
                      row.Status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      row.Status === 'Escalated' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      row.Status === 'In Progress' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                      'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {row.Status}
                    </span>
                  </td>

                  {/* Action Drawer Button */}
                  <td className="p-3.5 whitespace-nowrap text-right">
                    <button
                      onClick={() => onSelectGrievance(row)}
                      className="px-3 py-1.5 rounded-lg bg-[#7A0C38] hover:bg-[#961247] text-white font-extrabold text-xs transition shadow-sm flex items-center space-x-1 ml-auto"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{t.takeAction}</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                  No grievances found matching your active filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
      </div>

    </div>
  );
};
