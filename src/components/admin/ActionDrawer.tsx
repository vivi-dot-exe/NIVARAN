import React, { useState } from 'react';
import type { Grievance, DepartmentType, GrievanceStatus } from '../../types/grievance';
import { DEPARTMENTS_LIST } from '../../mockData/grievances';
import {
  X,
  CheckCircle2,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionDrawerProps {
  grievance: Grievance | null;
  civicIssue?: import('../../types/grievance').CivicIssue | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: Grievance) => void;
  onUpdateCivicIssue?: (updated: import('../../types/grievance').CivicIssue) => void;
  isDarkMode: boolean;
}

export const ActionDrawer: React.FC<ActionDrawerProps> = ({
  grievance,
  civicIssue,
  isOpen,
  onClose,
  onUpdate,
  onUpdateCivicIssue,
  isDarkMode
}) => {
  if (!isOpen || (!grievance && !civicIssue)) return null;

  const targetGrievance = grievance;
  const targetIssue = civicIssue;

  const [status, setStatus] = useState<GrievanceStatus>(
    targetIssue ? targetIssue.status : targetGrievance!.Status
  );
  const [department, setDepartment] = useState<DepartmentType>(
    targetIssue ? targetIssue.responsible_department : targetGrievance!.Department
  );
  const [authority, setAuthority] = useState<string>(
    targetIssue ? targetIssue.responsible_authority : (targetGrievance?.responsible_authority || 'Municipal Corporation of Greater Mumbai')
  );
  const [officer, setOfficer] = useState(
    targetIssue ? (targetIssue.assigned_officer || 'Ward Nodal Officer') : (targetGrievance!.Assigned_Officer || '')
  );
  const [escalationNote, setEscalationNote] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const isOverridden = Boolean(overrideReason.trim());

    if (targetIssue && onUpdateCivicIssue) {
      const updatedIssue: import('../../types/grievance').CivicIssue = {
        ...targetIssue,
        status: status,
        responsible_department: department,
        responsible_authority: authority,
        assigned_officer: officer,
        manual_override: isOverridden || targetIssue.manual_override,
        override_reason: isOverridden ? overrideReason : targetIssue.override_reason,
        routing_status: isOverridden ? 'Officer Overridden' : targetIssue.routing_status,
        requires_human_review: false
      };
      onUpdateCivicIssue(updatedIssue);
    } else if (targetGrievance) {
      const updated: Grievance = {
        ...targetGrievance,
        Status: status,
        Department: department,
        responsible_authority: authority,
        Assigned_Officer: officer,
        manual_override: isOverridden || targetGrievance.manual_override,
        override_reason: isOverridden ? overrideReason : targetGrievance.override_reason,
        routing_status: isOverridden ? 'Officer Overridden' : targetGrievance.routing_status,
        requires_human_review: false
      };
      onUpdate(updated);
    }

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-955/70 backdrop-blur-sm flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`w-full max-w-lg h-full border-l p-6 overflow-y-auto flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Drawer Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold block">
                  {targetIssue ? 'Civic Issue Action Console' : 'Nodal Action Console'}
                </span>
                <h3 className="text-lg font-extrabold font-mono flex items-center space-x-2">
                  <span>{targetIssue ? `CIVIC ISSUE #${targetIssue.id}` : `Ticket #${targetGrievance!.Complaint_ID}`}</span>
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grievance or Civic Issue Text Card */}
            {targetIssue ? (
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDarkMode ? 'bg-blue-950/70 border-blue-500/40 text-blue-100' : 'bg-blue-50 border-blue-300 text-blue-900'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold">
                    {targetIssue.category}
                  </span>
                  <span className="text-amber-400 font-bold font-mono">
                    Priority Score: {targetIssue.priority_score}/100 ({targetIssue.priority_level})
                  </span>
                </div>
                <h4 className="font-extrabold text-white text-sm">
                  {targetIssue.issue_title}
                </h4>
                <p className="text-xs leading-relaxed italic text-blue-200">
                  "{targetIssue.issue_description}"
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-blue-500/30">
                  <div className="p-2 rounded bg-blue-900/40">
                    <span className="block text-[10px] text-blue-300">Affected Citizens</span>
                    <strong className="text-white">👥 {targetIssue.affected_citizen_count} citizens</strong>
                  </div>
                  <div className="p-2 rounded bg-blue-900/40">
                    <span className="block text-[10px] text-blue-300">Citizen Reports</span>
                    <strong className="text-white">📋 {targetIssue.report_count} reports</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-xl border space-y-2 ${
                isDarkMode ? 'bg-slate-955 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    {targetGrievance!.Language}
                  </span>
                  <span className="text-amber-400 font-bold font-mono">
                    Priority Score: {targetGrievance!.Priority_Score}/100 ({targetGrievance!.Priority})
                  </span>
                </div>
                <p className="text-xs leading-relaxed italic text-slate-200">
                  "{targetGrievance!.Complaint}"
                </p>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                  <span>📍 {targetGrievance!.Ward}</span>
                  <span>Submitted: {new Date(targetGrievance!.Date_Submitted).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSave} className="space-y-5 pt-2">
              
              {/* Change Status */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
                  Update Grievance Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Pending', 'In Progress', 'Resolved', 'Escalated'] as GrievanceStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1.5 ${
                        status === st
                          ? st === 'Resolved' ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' :
                            st === 'Escalated' ? 'bg-rose-600 border-rose-500 text-white shadow-md animate-pulse' :
                            'bg-amber-600 border-amber-500 text-white shadow-md'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI ROUTING TRANSPARENCY & AUDIT CARD */}
              <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
                isDarkMode ? 'bg-blue-950/40 border-blue-500/30 text-blue-100' : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                    🧭 AI ROUTING DECISION & CONFIDENCE
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🟢 {targetIssue?.routing_confidence || targetGrievance?.routing_confidence || 85}% {targetIssue?.routing_status || targetGrievance?.routing_status || 'Automatically Routed'}
                  </span>
                </div>
                <div className="p-2 rounded bg-blue-900/40 border border-blue-500/30 text-[11px] text-blue-200 space-y-1">
                  <span className="block font-bold text-white">Why was this routed here?</span>
                  <p className="whitespace-pre-line leading-relaxed opacity-90">
                    {targetIssue?.routing_reason || targetGrievance?.routing_reason || `• Complaint text matched semantic category.\n• Mapped to Ward Jurisdiction under Municipal Corporation.\n• Nodal officer assigned.`}
                  </p>
                </div>
              </div>

              {/* Re-assign Authority */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
                  Responsible Government Authority
                </label>
                <select
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Municipal Corporation of Greater Mumbai">Municipal Corporation of Greater Mumbai (MCGM)</option>
                  <option value="Maharashtra Water Supply & Sewerage Board">Maharashtra Water Supply & Sewerage Board (MWSB)</option>
                  <option value="BEST Electricity & Power Supply Board">BEST Electricity & Power Supply Board</option>
                  <option value="Public Health Department & NIC Healthcare Cell">Public Health Department & NIC Healthcare Cell</option>
                  <option value="Public Works Department (PWD State Highways)">Public Works Department (PWD State Highways)</option>
                  <option value="Food & Civil Supplies Department">Food & Civil Supplies Department (PDS Board)</option>
                </select>
              </div>

              {/* Re-assign Department */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
                  Re-Assign Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {DEPARTMENTS_LIST.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field Officer Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
                  Assigned Field Nodal Officer
                </label>
                <input
                  type="text"
                  value={officer}
                  onChange={(e) => setOfficer(e.target.value)}
                  placeholder="e.g. Er. Rajesh Sharma (Nodal Officer)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Officer Manual Override Rationale */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-amber-400">
                  Officer Manual Override Rationale (Audit Trail)
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Incorrect authority — road falls under PWD state highway jurisdiction"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-amber-500/40 text-xs text-amber-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  💡 Submitting a rationale logs an official officer override timestamp and audit log ("AI recommends. Government authority remains accountable").
                </span>
              </div>

              {/* Escalation Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
                  DARPG Escalation Audit Note
                </label>
                <textarea
                  rows={2}
                  value={escalationNote}
                  onChange={(e) => setEscalationNote(e.target.value)}
                  placeholder="Add officer inspection note, field dispatch code, or SLA extension rationale..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5"
                >
                  {isSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Updated!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Save & Dispatch Changes</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
