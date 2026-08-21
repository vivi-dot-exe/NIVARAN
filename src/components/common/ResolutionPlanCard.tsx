import React from 'react';
import type { ResolutionPlan } from '../../types/grievance';
import { Layers, ArrowDown, CheckCircle2, Lock, Sparkles, Building2 } from 'lucide-react';

interface ResolutionPlanCardProps {
  plan: ResolutionPlan;
  isDarkMode?: boolean;
  onSelectSubIssue?: (subId: string) => void;
  showSingleAgency?: boolean;
}

export const ResolutionPlanCard: React.FC<ResolutionPlanCardProps> = ({
  plan,
  isDarkMode = true,
  onSelectSubIssue,
  showSingleAgency = false
}) => {
  if (!plan) return null;

  // For simple single-agency issues, don't show complex multi-agency card unless requested
  if (!plan.is_multi_agency && !showSingleAgency) {
    return null;
  }

  return (
    <div className={`p-4 rounded-2xl border space-y-4 font-sans ${
      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
    }`}>
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2.5 border-slate-700/60">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-white">
            {plan.is_multi_agency ? 'Multi-Department Action Plan' : 'Resolution Action Plan'}
          </h4>
        </div>
        {plan.is_multi_agency && (
          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
            {plan.sub_issues.length} Departments Coordinated
          </span>
        )}
      </div>

      {/* Main Issue & Root Cause Summary */}
      <div className={`p-3 rounded-xl border space-y-1.5 ${
        isDarkMode ? 'bg-slate-955 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
          Primary Concern
        </span>
        <h3 className="text-xs font-bold text-white">
          {plan.primary_issue_title}
        </h3>
        {plan.root_cause && (
          <p className="text-[11px] text-slate-300 leading-relaxed pt-0.5">
            <strong className="text-amber-300 font-semibold">Identified Cause: </strong>
            {plan.root_cause}
          </p>
        )}
      </div>

      {/* Step-by-Step Resolution Flow */}
      <div className="space-y-2.5">
        <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Step-by-Step Resolution Tasks ({plan.sub_issues.length})</span>
        </h5>

        <div className="flex flex-col items-center space-y-2">
          {plan.sub_issues.map((sub, idx) => {
            return (
              <React.Fragment key={sub.id}>
                {idx > 0 && (
                  <div className="flex flex-col items-center my-0.5 space-y-0.5">
                    <ArrowDown className="w-4 h-4 text-amber-400" />
                    <div className="px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-[9px] text-amber-200 text-center font-medium">
                      Step 2 unlocks after Step 1 is completed
                    </div>
                  </div>
                )}

                <div
                  onClick={() => onSelectSubIssue?.(sub.id)}
                  className={`w-full p-3 rounded-xl border space-y-1.5 cursor-pointer transition ${
                    sub.status === 'Blocked'
                      ? (isDarkMode ? 'bg-slate-900/80 border-amber-500/40' : 'bg-amber-50 border-amber-200')
                      : (isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200')
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-600/30 text-blue-200 border border-blue-500/40">
                      Step {idx + 1}: {sub.category}
                    </span>
                    <span className={`text-[10px] font-bold flex items-center space-x-1 ${
                      sub.status === 'Blocked' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {sub.status === 'Blocked' ? <Lock className="w-3 h-3 text-amber-400 inline mr-1" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400 inline mr-1" />}
                      <span>{sub.status === 'Blocked' ? 'Waiting for Step 1' : 'Ready / Active'}</span>
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-white">
                    {sub.title}
                  </h5>

                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Building2 className="w-3 h-3 text-emerald-400 inline" />
                        <span>Responsible Dept:</span>
                      </span>
                      <strong className="text-emerald-300 font-semibold">{sub.responsible_department}</strong>
                    </div>
                    <p className="text-[11px] text-slate-400 pt-0.5">{sub.required_action}</p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

    </div>
  );
};
