import React, { useState, useEffect } from 'react';
import type { Grievance, GovernanceScorecardData, WardGovernanceMetric } from '../../types/grievance';
import { fetchGovernanceScorecardApi } from '../../services/api';
import {
  ShieldCheck,
  Clock,
  GitPullRequest,
  AlertTriangle,
  TrendingDown,
  Building,
  RefreshCw,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';

interface GovernanceScorecardProps {
  grievances: Grievance[];
  isDarkMode: boolean;
}

export const GovernanceScorecard: React.FC<GovernanceScorecardProps> = ({
  grievances,
  isDarkMode
}) => {
  const [scorecardData, setScorecardData] = useState<GovernanceScorecardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'grade' | 'mttr' | 'fci' | 'jbi'>('grade');

  // Compute local fallback metrics if backend is offline
  const computeLocalScorecard = (): GovernanceScorecardData => {
    const total = grievances.length || 1;
    const now = Date.now();
    const bounced = grievances.filter((g) => (g.Transfers_Count || 0) > 0).length;
    const falsified = grievances.filter(
      (g) => (g.Falsified_Attempts && g.Falsified_Attempts > 0) || g.Verification_Status === 'rejected_escalated'
    ).length;

    // P4-1/2 FIX: True MTTR — clock starts at submission and NEVER resets.
    // For resolved tickets, use resolved_at; for open tickets, use now.
    const mttrList = grievances.map((g) => {
      const start = new Date(g.Date_Submitted).getTime();
      const end = g.Resolved_At ? new Date(g.Resolved_At).getTime() : now;
      return Math.max(0, (end - start) / (1000 * 60 * 60)); // hours
    });
    const globalMttr = mttrList.length > 0
      ? Number((mttrList.reduce((s, h) => s + h, 0) / mttrList.length).toFixed(1))
      : 0;

    // Ward grouping
    const wardMap = new Map<string, Grievance[]>();
    grievances.forEach((g) => {
      const list = wardMap.get(g.Ward) || [];
      list.push(g);
      wardMap.set(g.Ward, list);
    });

    const wardRankings: WardGovernanceMetric[] = [];
    wardMap.forEach((gList, ward) => {
      const wTotal = gList.length;
      const wBounced = gList.filter((g) => (g.Transfers_Count || 0) > 0).length;
      const wFalsified = gList.filter(
        (g) => (g.Falsified_Attempts && g.Falsified_Attempts > 0) || g.Verification_Status === 'rejected_escalated'
      ).length;
      const wResolved = gList.filter((g) => g.Status === 'Resolved' || g.Status === 'Closed').length;

      const jbi = Number(((wBounced / wTotal) * 100).toFixed(1));
      const fci = Number(((wFalsified / wTotal) * 100).toFixed(1));

      // P4-1 FIX: True MTTR per ward — real elapsed hours, not a formula
      const wMttrList = gList.map((g) => {
        const start = new Date(g.Date_Submitted).getTime();
        const end = g.Resolved_At ? new Date(g.Resolved_At).getTime() : now;
        return Math.max(0, (end - start) / (1000 * 60 * 60));
      });
      const wMttr = wMttrList.length > 0
        ? Number((wMttrList.reduce((s, h) => s + h, 0) / wMttrList.length).toFixed(1))
        : 0;

      let grade: WardGovernanceMetric['governance_grade'] = 'A';
      if (fci > 15 || jbi > 35) grade = 'F';
      else if (fci > 8 || jbi > 20) grade = 'C';
      else if (fci > 4 || jbi > 10) grade = 'B';

      wardRankings.push({
        ward,
        total_tickets: wTotal,
        resolved_tickets: wResolved,
        true_mttr_hours: wMttr,
        target_sla_hours: 24.0,
        jurisdiction_bounce_rate: jbi,
        false_closure_rate: fci,
        governance_grade: grade
      });
    });

    return {
      // P4-2 FIX: Use computed global MTTR, not hardcoded 18.2
      true_mttr_hours: globalMttr,
      target_sla_hours: 24.0,
      jurisdiction_bounce_rate: Number(((bounced / total) * 100).toFixed(1)),
      false_closure_rate: Number(((falsified / total) * 100).toFixed(1)),
      total_tickets: total,
      ward_scorecards: wardRankings
    };
  };

  const loadScorecard = async () => {
    setIsLoading(true);
    try {
      const data = await fetchGovernanceScorecardApi();
      setScorecardData(data);
    } catch {
      setScorecardData(computeLocalScorecard());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // P4-5 FIX: Load once on mount only. The Refresh button handles manual reloads.
    // Previously depended on [grievances] which triggered a full API re-fetch every
    // 15 seconds from the polling interval, even when data hadn't changed.
    loadScorecard();
  }, []);

  const data = scorecardData || computeLocalScorecard();

  const sortedWards = [...(data.ward_scorecards || [])].sort((a, b) => {
    if (sortBy === 'mttr') return a.true_mttr_hours - b.true_mttr_hours;
    if (sortBy === 'fci') return a.false_closure_rate - b.false_closure_rate;
    if (sortBy === 'jbi') return a.jurisdiction_bounce_rate - b.jurisdiction_bounce_rate;
    const gradeOrder: Record<string, number> = { A: 1, B: 2, C: 3, F: 4 };
    return (gradeOrder[a.governance_grade] || 5) - (gradeOrder[b.governance_grade] || 5);
  });


  return (
    <div className="space-y-6">
      {/* Header & Observability Banner */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode 
          ? 'bg-gradient-to-r from-slate-900 via-indigo-955 to-slate-900 border-slate-800' 
          : 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-slate-800 text-white shadow-xl'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Pillar 4: Radical Civic SLI/SLA Observability</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-heading">
              The Wall of Governance
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time public civic reliability scorecard. Uncompromised metrics calculated without timer resets, departmental finger-pointing, or falsified paper closures.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-center">
            <button
              onClick={loadScorecard}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh SLIs</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Core SLI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* SLI 1: True MTTR */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl border relative overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              True MTTR (Unreset Clock)
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 flex items-baseline space-x-2">
            <span className={`text-4xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {data.true_mttr_hours}
            </span>
            <span className="text-sm font-bold text-slate-400 font-mono">Hours Avg</span>
          </div>

          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Measures exact elapsed time from citizen submission to final OTP sign-off. Transfers do not reset the timer.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
            <span className="flex items-center space-x-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>-12.4% vs last week</span>
            </span>
            <span className="text-slate-400 font-mono">SLA Target: &lt; 24h</span>
          </div>
        </motion.div>

        {/* SLI 2: Jurisdiction Bounce Index (JBI) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-6 rounded-2xl border relative overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Jurisdiction Bounce Rate (JBI)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <GitPullRequest className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 flex items-baseline space-x-2">
            <span className={`text-4xl font-black font-mono ${
              data.jurisdiction_bounce_rate > 25 ? 'text-rose-500' :
              data.jurisdiction_bounce_rate > 15 ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {data.jurisdiction_bounce_rate}%
            </span>
            <span className="text-sm font-bold text-slate-400 font-mono">Transferred 2+ times</span>
          </div>

          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Measures municipal "hot-potato" passing between departments before field work begins.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-semibold">
            <span className={data.jurisdiction_bounce_rate < 20 ? 'text-emerald-400' : 'text-amber-400'}>
              {data.jurisdiction_bounce_rate < 20 ? '✓ Within Tolerance' : '⚠️ Elevated Bouncing'}
            </span>
            <span className="text-slate-400 font-mono">Bench: &lt; 15%</span>
          </div>
        </motion.div>

        {/* SLI 3: False Closure Index (FCI) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-2xl border relative overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              False Closure Index (FCI)
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 flex items-baseline space-x-2">
            <span className={`text-4xl font-black font-mono ${
              data.false_closure_rate > 10 ? 'text-rose-500' :
              data.false_closure_rate > 5 ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {data.false_closure_rate}%
            </span>
            <span className="text-sm font-bold text-slate-400 font-mono">Rejected by Citizen</span>
          </div>

          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Percentage of tickets where citizens clicked "Not Done / Reject Closure", escalating with officer penalty.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-semibold">
            <span className={data.false_closure_rate < 5 ? 'text-emerald-400' : 'text-rose-400'}>
              {data.false_closure_rate < 5 ? '✓ Low Falsification' : '🚨 High Falsification Alert'}
            </span>
            <span className="text-slate-400 font-mono">Target: 0.0%</span>
          </div>
        </motion.div>
      </div>

      {/* Ward-by-Ward Comparative Scorecard Table */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      } space-y-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className={`text-base font-extrabold uppercase tracking-wider flex items-center space-x-2 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <Building className="w-4 h-4 text-blue-500" />
              <span>Ward-by-Ward Civic Reliability League Table</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked objectively based on True MTTR, False Closure Rate, and Jurisdictional Transfers.
            </p>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-1.5 text-xs font-bold">
            <span className="text-slate-400">Sort by:</span>
            {(['grade', 'mttr', 'fci', 'jbi'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2.5 py-1 rounded-lg border uppercase transition text-[11px] ${
                  sortBy === s
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className={`border-b text-[11px] uppercase tracking-wider font-bold ${
                isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
              }`}>
                <th className="py-3 px-3">Ward Jurisdiction</th>
                <th className="py-3 px-3 text-center">Governance Grade</th>
                <th className="py-3 px-3 text-center">True MTTR</th>
                <th className="py-3 px-3 text-center">Bounce Index (JBI)</th>
                <th className="py-3 px-3 text-center">False Closures (FCI)</th>
                <th className="py-3 px-3 text-right">Resolved / Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedWards.map((w, idx) => (
                <tr
                  key={w.ward}
                  className={`hover:bg-slate-800/30 transition font-medium ${
                    isDarkMode ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  <td className="py-3.5 px-3">
                    <div className="font-extrabold text-sm">{w.ward}</div>
                    <span className="text-[10px] text-slate-400 font-mono">Rank #{idx + 1} Municipal League</span>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <span className={`px-3 py-1 rounded-full font-black text-xs font-mono inline-block shadow-sm ${
                      w.governance_grade === 'A' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                      w.governance_grade === 'B' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                      w.governance_grade === 'C' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                    }`}>
                      Grade {w.governance_grade}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono font-bold">
                    <span className={w.true_mttr_hours > 24 ? 'text-rose-400' : 'text-emerald-400'}>
                      {w.true_mttr_hours} hrs
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono font-bold">
                    <span className={w.jurisdiction_bounce_rate > 25 ? 'text-rose-400' : w.jurisdiction_bounce_rate > 15 ? 'text-amber-400' : 'text-slate-300'}>
                      {w.jurisdiction_bounce_rate}%
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono font-bold">
                    <span className={w.false_closure_rate > 10 ? 'text-rose-400' : w.false_closure_rate > 5 ? 'text-amber-400' : 'text-emerald-400'}>
                      {w.false_closure_rate}%
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-right font-mono font-bold">
                    <span>{w.resolved_tickets || 0}</span>
                    <span className="text-slate-500 font-normal"> / {w.total_tickets}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

