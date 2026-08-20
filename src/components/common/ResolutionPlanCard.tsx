import React from 'react';
import type { ResolutionPlan } from '../../types/grievance';
import { Network, Layers, AlertCircle, ArrowDown, CheckCircle2, Lock } from 'lucide-react';

interface ResolutionPlanCardProps {
  plan: ResolutionPlan;
  isDarkMode?: boolean;
  onSelectSubIssue?: (subId: string) => void;
}

export const ResolutionPlanCard: React.FC<ResolutionPlanCardProps> = ({
  plan,
  isDarkMode = true,
  onSelectSubIssue
}) => {
  if (!plan) return null;

  return (
    <div className={`p-5 rounded-2xl border space-y-5 font-sans ${
      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
    }`}>
      
      {/* Header & Multi-Agency Indicator */}
      <div className="flex items-center justify-between border-b pb-3 border-slate-700/60">
        <div className="flex items-center space-x-2.5">
          <Network className={`w-5 h-5 ${plan.is_multi_agency ? 'text-amber-400 animate-pulse' : 'text-blue-400'}`} />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center space-x-2">
              <span>{plan.is_multi_agency ? '⚠️ MULTI-AGENCY DECOMPOSITION PLAN' : '🧠 AI RESOLUTION PLAN'}</span>
              {plan.is_multi_agency && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                  {plan.sub_issues.length} RESPONSIBLE AGENCIES
                </span>
              )}
            </h4>
            <span className="text-[11px] text-slate-400">
              NIVARAN AI Civic Issue Understanding Engine
            </span>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black border ${
          plan.overall_confidence >= 80
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        }`}>
          🟢 {plan.overall_confidence}% Plan Confidence
        </span>
      </div>

      {/* Primary Issue & Root Cause Card */}
      <div className={`p-4 rounded-xl border space-y-2.5 ${
        isDarkMode ? 'bg-slate-955 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
              IDENTIFIED PRIMARY CIVIC PROBLEM
            </span>
            <h3 className="text-sm font-extrabold text-white mt-0.5">
              {plan.primary_issue_title}
            </h3>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300 block">
            🔬 ROOT CAUSE vs CONSEQUENCE ANALYSIS
          </span>
          <p className="text-blue-100 leading-relaxed font-semibold">
            {plan.root_cause}
          </p>
        </div>

        {/* Affected Infrastructure Pills */}
        {plan.affected_infrastructure && plan.affected_infrastructure.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">
              Affected Infrastructure:
            </span>
            {plan.affected_infrastructure.map((infra, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700"
              >
                🏗️ {infra}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sub-Issues Responsibility Breakdown Cards */}
      <div className="space-y-3">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>DECOMPOSED AGENCY RESPONSIBILITIES ({plan.sub_issues.length})</span>
        </h5>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plan.sub_issues.map((sub, idx) => (
            <div
              key={sub.id}
              onClick={() => onSelectSubIssue?.(sub.id)}
              className={`p-3.5 rounded-xl border space-y-2 cursor-pointer transition ${
                sub.status === 'Blocked'
                  ? (isDarkMode ? 'bg-slate-900/60 border-amber-500/40 opacity-90' : 'bg-amber-50 border-amber-200')
                  : (isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200')
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-600 text-white uppercase">
                  SUB-ISSUE #{idx + 1} ({sub.id})
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  sub.confidence >= 90
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {sub.confidence}% Match
                </span>
              </div>

              <h4 className="text-xs font-extrabold text-white">
                {sub.title}
              </h4>

              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Authority:</span>
                  <strong className="text-emerald-400 font-semibold">{sub.responsible_authority}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Department:</span>
                  <strong className="text-blue-300 font-semibold">{sub.responsible_department}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Nodal Officer:</span>
                  <strong className="text-amber-300 font-semibold">{sub.assigned_officer}</strong>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-900/80 border border-slate-700/80 text-[11px] text-slate-300 space-y-0.5">
                <span className="block font-extrabold text-white text-[10px] uppercase">Required Action:</span>
                <p>{sub.required_action}</p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[10px]">
                <span className="text-slate-400">Operational Status:</span>
                <span className={`font-bold flex items-center space-x-1 ${
                  sub.status === 'Blocked' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {sub.status === 'Blocked' ? <Lock className="w-3 h-3 text-amber-400 inline mr-1" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400 inline mr-1" />}
                  <span>{sub.status}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Dependency Graph (React / CSS Node Flow) */}
      {plan.is_multi_agency && plan.dependencies && plan.dependencies.length > 0 && (
        <div className={`p-4 rounded-xl border space-y-3 ${
          isDarkMode ? 'bg-slate-955 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <h5 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
            <Network className="w-4 h-4 text-amber-400" />
            <span>CROSS-AGENCY OPERATIONAL DEPENDENCY GRAPH (DAG)</span>
          </h5>

          <div className="flex flex-col items-center space-y-2 py-2">
            {plan.sub_issues.map((sub, idx) => {
              const isPrereq = plan.dependencies.some(d => d.from === sub.id);
              const depLink = plan.dependencies.find(d => d.to === sub.id);

              return (
                <React.Fragment key={sub.id}>
                  {idx > 0 && (
                    <div className="flex flex-col items-center my-1 space-y-1">
                      <ArrowDown className="w-5 h-5 text-amber-400 animate-bounce" />
                      <div className="px-3 py-1 rounded bg-amber-950/80 border border-amber-500/40 text-[10px] text-amber-200 max-w-sm text-center font-mono">
                        🔒 MUST COMPLETE BEFORE UNLOCKING NEXT STEP
                        {depLink && <span className="block italic text-[9px] text-amber-300 font-sans mt-0.5">"{depLink.reason}"</span>}
                      </div>
                    </div>
                  )}

                  <div className={`w-full max-w-md p-3.5 rounded-xl border flex items-center justify-between ${
                    isPrereq
                      ? 'bg-blue-950/70 border-blue-500/50 shadow-md'
                      : 'bg-slate-800/80 border-slate-700'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isPrereq ? 'bg-blue-600 text-white' : 'bg-amber-600 text-slate-950'
                        }`}>
                          {isPrereq ? 'STEP 1: PREREQUISITE ACTION' : 'STEP 2: DEPENDENT ACTION'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-300">
                          #{sub.id}
                        </span>
                      </div>
                      <h5 className="text-xs font-extrabold text-white">
                        {sub.title}
                      </h5>
                      <span className="text-[11px] text-emerald-400 font-semibold block">
                        🏛️ {sub.responsible_authority} ({sub.responsible_department})
                      </span>
                    </div>

                    <div className="text-right whitespace-nowrap pl-2">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border ${
                        sub.status === 'Blocked'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Explainability Summary Card */}
      {plan.explainability && plan.explainability.length > 0 && (
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300 flex items-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>WHY DID NIVARAN DECOMPOSE THIS GRIEVANCE?</span>
          </span>
          <div className="space-y-1 text-blue-100 opacity-90 text-[11px] leading-relaxed">
            {plan.explainability.map((exp, i) => (
              <p key={i}>{exp}</p>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
