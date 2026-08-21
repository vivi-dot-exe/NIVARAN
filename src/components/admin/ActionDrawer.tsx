import React, { useState } from 'react';
import type { Grievance, DepartmentType, GrievanceStatus, SubTask } from '../../types/grievance';
import { DEPARTMENTS_LIST } from '../../mockData/grievances';
import { ResolutionPlanCard } from '../common/ResolutionPlanCard';
import {
  X,
  CheckCircle2,
  Send,
  ShieldCheck,
  MapPin,
  Camera,
  GitMerge,
  Lock,
  Unlock,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionDrawerProps {
  grievance: Grievance | null;
  civicIssue?: import('../../types/grievance').CivicIssue | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: Grievance) => void;
  onSubmitResolutionProof?: (
    ticketId: string,
    officerName: string,
    officerLat: number,
    officerLng: number,
    imageUrl?: string,
    notes?: string
  ) => Promise<void> | void;
  onSplitTicket?: (ticketId: string, subTasks: SubTask[]) => Promise<void> | void;
  onResolveSubTask?: (ticketId: string, subTaskId: string, notes?: string) => Promise<void> | void;
  onUpdateCivicIssue?: (updated: import('../../types/grievance').CivicIssue) => void;
  isDarkMode: boolean;
}

export const ActionDrawer: React.FC<ActionDrawerProps> = ({
  grievance,
  civicIssue,
  isOpen,
  onClose,
  onUpdate,
  onSubmitResolutionProof,
  onSplitTicket,
  onResolveSubTask,
  onUpdateCivicIssue,
  isDarkMode
}) => {
  if (!isOpen || (!grievance && !civicIssue)) return null;

  const targetGrievance = grievance;
  const targetIssue = civicIssue;

  // P3-3 FIX: Auto-select correct tab based on ticket state
  const getInitialTab = (): 'triage' | 'geofence' | 'dag' => {
    if (targetGrievance?.Status === 'Pending_Verification') return 'geofence';
    if (targetGrievance?.Sub_Tasks && targetGrievance.Sub_Tasks.length > 0) return 'dag';
    return 'triage';
  };

  const [activeTab, setActiveTab] = useState<'triage' | 'geofence' | 'dag'>(getInitialTab);

  // Tab 1: Triage State
  const [status, setStatus] = useState<GrievanceStatus>(
    targetIssue ? targetIssue.status : targetGrievance ? targetGrievance.Status : 'Pending'
  );
  const [department, setDepartment] = useState<DepartmentType>(
    targetIssue ? targetIssue.responsible_department : targetGrievance ? targetGrievance.Department : 'Sanitation & Waste'
  );
  const [authority, setAuthority] = useState<string>(
    targetIssue ? targetIssue.responsible_authority : (targetGrievance?.responsible_authority || 'Municipal Corporation of Greater Mumbai')
  );
  const [officer, setOfficer] = useState(
    targetIssue ? (targetIssue.assigned_officer || 'Ward Nodal Officer') : (targetGrievance?.Assigned_Officer || '')
  );
  const [escalationNote, setEscalationNote] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Tab 2: Pillar 2 Geofenced Proof State
  const baseLat = targetGrievance?.Latitude ?? targetIssue?.latitude ?? 19.1197;
  const baseLng = targetGrievance?.Longitude ?? targetIssue?.longitude ?? 72.8464;
  const [officerLat, setOfficerLat] = useState<number>(baseLat + 0.0001);
  const [officerLng, setOfficerLng] = useState<number>(baseLng + 0.00008);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionImgUrl, setResolutionImgUrl] = useState(
    'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=500&auto=format&fit=crop&q=60'
  );
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofSuccess, setProofSuccess] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

  // Tab 3: Pillar 3 DAG Multi-Agency Split-Tasks State
  const ticketId = targetGrievance?.Complaint_ID ?? targetIssue?.id ?? 'TICKET';
  const [subTasks, setSubTasks] = useState<SubTask[]>(
    targetGrievance?.Sub_Tasks && targetGrievance.Sub_Tasks.length > 0
      ? targetGrievance.Sub_Tasks
      : [
          {
            id: `${ticketId}-A`,
            department: targetGrievance?.Department || department,
            title: `Resolve primary ${(targetGrievance?.Department || department).toLowerCase()} issue`,
            status: 'In Progress',
            assigned_officer: targetGrievance?.Assigned_Officer || officer || 'Nodal Officer 1'
          },
          {
            id: `${ticketId}-B`,
            department: 'Roads & Infra',
            title: 'Resurface road trench and clear civic hazard',
            status: 'Blocked',
            depends_on: [`${ticketId}-A`],
            assigned_officer: 'Er. PWD Inspector'
          }
        ]
  );
  const [isSavingDag, setIsSavingDag] = useState(false);
  const [dagFeedback, setDagFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dagTaskFeedback, setDagTaskFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calculate live distance for geofence validation
  const computeDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  };

  const currentDistanceMeters = computeDistanceMeters(
    baseLat,
    baseLng,
    officerLat,
    officerLng
  );
  const isGeofenceValid = currentDistanceMeters <= 20;

  const handleTriageSave = (e: React.FormEvent) => {
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
    }

    if (targetGrievance) {
      const isTransferred = department !== targetGrievance.Department;
      const updated: Grievance = {
        ...targetGrievance,
        Status: status,
        Department: department,
        responsible_authority: authority,
        Assigned_Officer: officer,
        Transfers_Count: (targetGrievance.Transfers_Count || 0) + (isTransferred ? 1 : 0),
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

  const handleSubmitProof = async () => {
    if (!isGeofenceValid) return;
    setIsSubmittingProof(true);
    setProofError(null);
    try {
      if (onSubmitResolutionProof) {
        await onSubmitResolutionProof(
          ticketId,
          officer || 'Ground Nodal Officer',
          officerLat,
          officerLng,
          resolutionImgUrl,
          resolutionNotes
        );
      }
      setProofSuccess(true);
      setTimeout(() => {
        setProofSuccess(false);
        onClose();
      }, 800);
    } catch (err: any) {
      setProofError(err.message || 'Failed to submit resolution proof. Please retry.');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleSaveDagTasks = async () => {
    setIsSavingDag(true);
    setDagFeedback(null);
    try {
      if (onSplitTicket) {
        await onSplitTicket(ticketId, subTasks);
      }
      if (targetGrievance) {
        onUpdate({
          ...targetGrievance,
          Sub_Tasks: subTasks
        });
      }
      setDagFeedback({
        type: 'success',
        message: `Multi-Agency DAG (${subTasks.length} sub-tasks) spawned and dependency locks applied successfully!`
      });
    } catch (err: any) {
      setDagFeedback({
        type: 'error',
        message: err.message || 'Failed to create DAG sub-tasks. Please retry.'
      });
    } finally {
      setIsSavingDag(false);
    }
  };

  const handleResolveTask = async (taskId: string) => {
    setDagTaskFeedback(null);
    try {
      if (onResolveSubTask) {
        await onResolveSubTask(ticketId, taskId, 'Subtask completed on field.');
      }
      const updatedTasks = subTasks.map((t) => {
        if (t.id === taskId) return { ...t, status: 'Resolved' as const };
        return t;
      });
      // Auto-unlock downstream tasks whose prerequisites are now resolved
      const fullyUpdated = updatedTasks.map((t) => {
        if (t.status === 'Blocked' && t.depends_on) {
          const allPrereqsMet = t.depends_on.every((prereqId) => {
            const prereq = updatedTasks.find((x) => x.id === prereqId);
            return prereq && prereq.status === 'Resolved';
          });
          if (allPrereqsMet) return { ...t, status: 'In Progress' as const };
        }
        return t;
      });
      setSubTasks(fullyUpdated);
      if (targetGrievance) {
        onUpdate({
          ...targetGrievance,
          Sub_Tasks: fullyUpdated
        });
      }
      setDagTaskFeedback({
        type: 'success',
        message: 'Sub-task resolved. Downstream dependent tasks auto-unlocked where eligible.'
      });
    } catch (err: any) {
      setDagTaskFeedback({
        type: 'error',
        message: err.message || 'Failed to resolve sub-task. Please retry.'
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-955/70 backdrop-blur-sm flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`w-full max-w-xl h-full border-l p-6 overflow-y-auto flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Drawer Header & Tab Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold block">
                  {targetIssue ? 'Civic Issue Action Console' : 'Nodal Action & Resolution Console'}
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

            {/* Pillar Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('triage')}
                className={`py-2 rounded-lg transition text-center ${
                  activeTab === 'triage' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Triage & Routing
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('geofence')}
                className={`py-2 rounded-lg transition text-center flex items-center justify-center space-x-1 ${
                  activeTab === 'geofence' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-Trust Proof</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dag')}
                className={`py-2 rounded-lg transition text-center flex items-center justify-center space-x-1 ${
                  activeTab === 'dag' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Multi-Agency DAG</span>
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
                    <strong className="text-white"> {targetIssue.affected_citizen_count} citizens</strong>
                  </div>
                  <div className="p-2 rounded bg-blue-900/40">
                    <span className="block text-[10px] text-blue-300">Citizen Reports</span>
                    <strong className="text-white"> {targetIssue.report_count} reports</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-xl border space-y-2 ${
                isDarkMode ? 'bg-slate-955 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    {targetGrievance!.Department}
                  </span>
                  <span className="text-amber-400 font-bold font-mono">
                    Priority: {targetGrievance!.Priority_Score}/100 ({targetGrievance!.Priority})
                  </span>
                </div>
                <p className="text-xs leading-relaxed italic text-slate-200">
                  "{targetGrievance!.Complaint}"
                </p>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                  <span>📍 {targetGrievance!.Ward} ({targetGrievance!.Latitude.toFixed(4)}, {targetGrievance!.Longitude.toFixed(4)})</span>
                  <span>H3: {targetGrievance!.H3_Index || 'Res-10'}</span>
                </div>
              </div>
            )}

            {/* TAB 1: TRIAGE & ROUTING */}
            {activeTab === 'triage' && (
              <form onSubmit={handleTriageSave} className="space-y-4 pt-1">
                {/* AI ROUTING TRANSPARENCY & AUDIT CARD */}
                {(targetIssue?.routing_reason || targetGrievance?.routing_reason) && (
                  <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
                    isDarkMode ? 'bg-blue-950/40 border-blue-500/30 text-blue-100' : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                        AI ROUTING DECISION & CONFIDENCE
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {targetIssue?.routing_confidence || targetGrievance?.routing_confidence || 85}% {targetIssue?.routing_status || targetGrievance?.routing_status || 'Automatically Routed'}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-blue-900/40 border border-blue-500/30 text-[11px] text-blue-200 space-y-1">
                      <span className="block font-bold text-white">Why was this routed here?</span>
                      <p className="whitespace-pre-line leading-relaxed opacity-90">
                        {targetIssue?.routing_reason || targetGrievance?.routing_reason}
                      </p>
                    </div>
                  </div>
                )}

                {/* MULTI-AGENCY DECOMPOSITION & RESOLUTION PLAN */}
                {(targetIssue?.resolution_plan || targetGrievance?.resolution_plan) && (
                  <ResolutionPlanCard
                    plan={targetIssue?.resolution_plan || targetGrievance?.resolution_plan!}
                    isDarkMode={isDarkMode}
                  />
                )}

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

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Re-Assign Department
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">
                      JBI Transfers: {targetGrievance?.Transfers_Count || 0}
                    </span>
                  </div>
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

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
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
                    Submitting a rationale logs an official officer override timestamp and audit log ("AI recommends. Government authority remains accountable").
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                    Escalation / Audit Note
                  </label>
                  <textarea
                    rows={2}
                    value={escalationNote}
                    onChange={(e) => setEscalationNote(e.target.value)}
                    placeholder="Add field dispatch note or SLA extension reason..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
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
                        <span>Save & Dispatch</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: PILLAR 2 ZERO-TRUST GEOFENCED PROOF */}
            {activeTab === 'geofence' && (
              <div className="space-y-4 pt-1 text-xs">
                <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 space-y-1">
                  <span className="font-extrabold block text-blue-300">Dual-Key Geo-fenced Closure Lock (20m Radius)</span>
                  <p className="text-[11px] leading-relaxed">
                    Officer must be within 20m of the ticket coordinates to submit resolution proof. Submitting transitions status to <code>Pending_Verification</code> and dispatches a 6-digit OTP to the citizen.
                  </p>
                </div>

                {/* Inline proof error banner */}
                {proofError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{proofError}</span>
                  </div>
                )}

                {/* Live Distance Meter */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isGeofenceValid ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-rose-950/40 border-rose-500/40'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center space-x-2">
                      <MapPin className={`w-4 h-4 ${isGeofenceValid ? 'text-emerald-400' : 'text-rose-400'}`} />
                      <span className="text-white">Live Officer GPS Proximity</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded font-mono font-black ${
                      isGeofenceValid ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                    }`}>
                      {currentDistanceMeters}m / 20m limit
                    </span>
                  </div>

                  <p className={`text-[11px] font-semibold ${isGeofenceValid ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {isGeofenceValid
                      ? '✓ Geofence Cleared! Officer is verified on-site.'
                      : '⛔ Geofence Violation: Officer is outside 20m radius. Closure locked.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOfficerLat(baseLat + 0.0001);
                        setOfficerLng(baseLng + 0.00008);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700"
                    >
                      Simulate On-Site GPS (12m)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOfficerLat(baseLat + 0.005);
                        setOfficerLng(baseLng + 0.005);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700"
                    >
                      Simulate Far GPS (550m)
                    </button>
                  </div>
                </div>

                {/* Resolution Photo Upload & Notes */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                      Resolution Proof Photo URL / Live Camera
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={resolutionImgUrl}
                        onChange={(e) => setResolutionImgUrl(e.target.value)}
                        placeholder="https://.../repaired_pipeline.jpg"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400">
                        <Camera className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                      Field Resolution Notes
                    </label>
                    <textarea
                      rows={2}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="e.g. 12-inch main pipeline collar replaced, pressure test normal."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleSubmitProof}
                    disabled={!isGeofenceValid || isSubmittingProof}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-2 shadow-lg ${
                      isGeofenceValid && !isSubmittingProof
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {isSubmittingProof ? (
                      <span>Validating CV Delta & Dispatching OTP...</span>
                    ) : proofSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Proof Submitted & OTP Dispatched!</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Submit Proof & Trigger Citizen OTP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PILLAR 3 MULTI-AGENCY COMPOSITE DAG MANAGER */}
            {activeTab === 'dag' && (
              <div className="space-y-4 pt-1 text-xs">
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 space-y-1">
                  <span className="font-extrabold block text-purple-300">Composite Multi-Agency DAG Split-Ticketing</span>
                  <p className="text-[11px] leading-relaxed">
                    Spawns child sub-tasks for different municipal departments with dependency locking. Sub-task B cannot close until Sub-task A is resolved.
                  </p>
                </div>

                {/* P3-1 FIX: In-component DAG save feedback banner */}
                {dagFeedback && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                    dagFeedback.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  }`}>
                    {dagFeedback.type === 'success'
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>{dagFeedback.message}</span>
                  </div>
                )}

                {/* P3-2 FIX: In-component sub-task resolve feedback banner */}
                {dagTaskFeedback && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                    dagTaskFeedback.type === 'success'
                      ? 'bg-blue-950/60 border-blue-500/40 text-blue-200'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  }`}>
                    {dagTaskFeedback.type === 'success'
                      ? <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>{dagTaskFeedback.message}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {subTasks.map((st) => (
                    <div
                      key={st.id}
                      className={`p-3.5 rounded-xl border space-y-2.5 ${
                        st.status === 'Resolved'
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                          : st.status === 'Blocked'
                          ? 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                          : 'bg-blue-950/30 border-blue-500/30 text-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-400">#{st.id}</span>
                          <span className="text-white font-extrabold">{st.title}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          st.status === 'Resolved' ? 'bg-emerald-500 text-slate-950' :
                          st.status === 'Blocked' ? 'bg-slate-700 text-slate-300' : 'bg-blue-500 text-white'
                        }`}>
                          {st.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] opacity-90">
                        <span>Agency: <strong>{st.department}</strong></span>
                        <span>Officer: <strong>{st.assigned_officer}</strong></span>
                      </div>

                      {st.depends_on && st.depends_on.length > 0 && (
                        <div className="text-[10px] text-amber-400 font-mono">
                          ↳ Dependency Lock: Blocked until #{st.depends_on.join(', #')} resolves
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-end space-x-2 border-t border-slate-800">
                        {st.status !== 'Resolved' && (
                          <button
                            type="button"
                            onClick={() => handleResolveTask(st.id)}
                            disabled={st.status === 'Blocked'}
                            className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition flex items-center space-x-1 ${
                              st.status === 'Blocked'
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {st.status === 'Blocked' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            <span>{st.status === 'Blocked' ? 'Locked by Prerequisite' : 'Mark Sub-Task Resolved'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleSaveDagTasks}
                    disabled={isSavingDag}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-lg shadow-purple-600/30 flex items-center space-x-1.5"
                  >
                    <GitMerge className="w-4 h-4" />
                    <span>{isSavingDag ? 'Saving...' : 'Spawn & Lock DAG Sub-Tasks'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
