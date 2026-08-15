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
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: Grievance) => void;
  isDarkMode: boolean;
}

export const ActionDrawer: React.FC<ActionDrawerProps> = ({
  grievance,
  isOpen,
  onClose,
  onUpdate,
  isDarkMode
}) => {
  if (!isOpen || !grievance) return null;

  const [status, setStatus] = useState<GrievanceStatus>(grievance.Status);
  const [department, setDepartment] = useState<DepartmentType>(grievance.Department);
  const [officer, setOfficer] = useState(grievance.Assigned_Officer || '');
  const [escalationNote, setEscalationNote] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Grievance = {
      ...grievance,
      Status: status,
      Department: department,
      Assigned_Officer: officer
    };

    onUpdate(updated);
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
                  Nodal Action Console
                </span>
                <h3 className="text-xl font-extrabold font-mono flex items-center space-x-2">
                  <span>Ticket #{grievance.Complaint_ID}</span>
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grievance Text Card */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              isDarkMode ? 'bg-slate-955 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  {grievance.Language}
                </span>
                <span className="text-amber-400 font-bold font-mono">
                  Priority Score: {grievance.Priority_Score}/100 ({grievance.Priority})
                </span>
              </div>
              <p className="text-xs leading-relaxed italic text-slate-200">
                "{grievance.Complaint}"
              </p>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                <span>📍 {grievance.Ward}</span>
                <span>Submitted: {new Date(grievance.Date_Submitted).toLocaleDateString()}</span>
              </div>
            </div>

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

              {/* Escalation Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
                  DARPG Escalation Audit Note
                </label>
                <textarea
                  rows={3}
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
