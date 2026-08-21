import React from 'react';
import type { Grievance } from '../../types/grievance';
import type { Language } from '../../utils/translations';
import { TRANSLATIONS } from '../../utils/translations';
import {
  Inbox,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';

interface KpiCardsProps {
  grievances: Grievance[];
  civicIssues?: import('../../types/grievance').CivicIssue[];
  isDarkMode: boolean;
  onFilterStatus?: (status: string | null) => void;
  currentLanguage?: Language;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  grievances,
  civicIssues = [],
  isDarkMode,
  onFilterStatus,
  currentLanguage = 'en'
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  const total = grievances.length;
  const totalCivicIssues = civicIssues.length;
  const criticalIssues = civicIssues.filter(iss => iss.priority_level === 'Critical' || iss.priority_score >= 85).length;
  const affectedCitizensSum = civicIssues.reduce((sum, iss) => sum + iss.affected_citizen_count, 0) || total;

  const pending = grievances.filter((g) => g.Status === 'Pending' || g.Status === 'In Progress').length;
  const resolved = grievances.filter((g) => g.Status === 'Resolved').length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  
  // Breached SLA: Priority Score > 85 or Escalated status
  const breached = grievances.filter((g) => g.Status === 'Escalated' || (g.Priority_Score >= 90 && g.Status !== 'Resolved')).length;

  return (
    <div className="space-y-4">
      {/* Problem-Centric Overview Banner */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-blue-950/40 border-blue-500/30 text-blue-100' : 'bg-blue-50 border-blue-200 text-blue-900'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
            ️
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">
              NIVARAN Operational Philosophy: Problem-Centric Civic Governance
            </h3>
            <p className="text-xs text-blue-200">
              Clustered <strong className="text-white font-mono">{total}</strong> citizen reports into <strong className="text-white font-mono">{totalCivicIssues}</strong> active real-world Civic Issues impacting <strong className="text-white font-mono">{affectedCitizensSum}+</strong> citizens.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-xs font-extrabold">
          <span className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
            ️ {criticalIssues} Critical Civic Issues
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
             {affectedCitizensSum} Impacted Citizens
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      
      {/* 1. Total Grievances */}
      <div 
        onClick={() => onFilterStatus?.(null)}
        className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-white border-slate-300 shadow-sm hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wider ${
            isDarkMode ? 'text-slate-400' : 'text-slate-700'
          }`}>
            {t.totalGrievances}
          </span>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
            isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
          }`}>
            <Inbox className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className={`text-3xl font-black font-mono ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>{total}</span>
          <span className="text-xs font-extrabold text-emerald-600 flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> {t.todayAdded}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium mt-1">{t.totalGrievancesSub}</p>
      </div>

      {/* 2. Pending Triage & Action */}
      <div 
        onClick={() => onFilterStatus?.('Pending')}
        className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-white border-slate-300 shadow-sm hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wider ${
            isDarkMode ? 'text-slate-400' : 'text-slate-700'
          }`}>
            {t.pendingAction}
          </span>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
            isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-300'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-black text-amber-600 font-mono">{pending}</span>
          <span className="text-xs font-extrabold text-amber-700">
            {Math.round((pending / (total || 1)) * 100)}% {t.ofTotal}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium mt-1">{t.pendingActionSub}</p>
      </div>

      {/* 3. Resolution Rate % */}
      <div 
        onClick={() => onFilterStatus?.('Resolved')}
        className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-white border-slate-300 shadow-sm hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wider ${
            isDarkMode ? 'text-slate-400' : 'text-slate-700'
          }`}>
            {t.resolutionRate}
          </span>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
            isDarkMode ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-700 border-teal-300'
          }`}>
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-black text-teal-600 font-mono">{resolutionRate}%</span>
          <span className="text-xs font-extrabold text-teal-700">{t.targetResolution}</span>
        </div>
        <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${
          isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
        }`}>
          <div className="h-full bg-teal-600 rounded-full" style={{ width: `${resolutionRate}%` }} />
        </div>
      </div>

      {/* 4. SLA Breached Tickets (CLEAN GOVTECH RED ALERT) */}
      <div 
        onClick={() => onFilterStatus?.('Escalated')}
        className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] relative overflow-hidden ${
          breached > 0 
            ? (isDarkMode ? 'animate-crimson-pulse bg-rose-950/40 border-rose-600/60' : 'bg-rose-50 border-rose-300 shadow-md')
            : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300')
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            <span>{t.slaBreachedEscalated}</span>
          </span>
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-300">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-black text-rose-700 font-mono">{breached}</span>
          <span className="text-xs font-extrabold text-rose-800 px-2.5 py-0.5 rounded bg-rose-100 border border-rose-300">
            {t.highRisk}
          </span>
        </div>
        <p className="text-[11px] text-rose-800 mt-1 font-semibold flex items-center justify-between">
          <span>{t.nodalInterventionReq}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </p>
      </div>

    </div>
  </div>
);
};
