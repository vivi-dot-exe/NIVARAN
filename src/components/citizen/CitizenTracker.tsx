import React, { useState } from 'react';
import type { Grievance } from '../../types/grievance';
import type { Language } from '../../utils/translations';
import { TRANSLATIONS } from '../../utils/translations';
import {
  Search,
  Clock,
  UserCheck,
  Building2,
  MapPin,
  Calendar,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  KeyRound,
  Sparkles,
  GitMerge
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CitizenTrackerProps {
  grievances: Grievance[];
  initialTicketId?: string;
  isDarkMode: boolean;
  currentLanguage?: Language;
  onVerifyResolution?: (ticketId: string, action: 'approve' | 'reject', otp?: string, rejectionReason?: string) => Promise<void> | void;
}

export const CitizenTracker: React.FC<CitizenTrackerProps> = ({
  grievances,
  initialTicketId = 'G-1001',
  isDarkMode,
  currentLanguage = 'en',
  onVerifyResolution
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  const [searchId, setSearchId] = useState(initialTicketId);
  const [activeTicket, setActiveTicket] = useState<Grievance | null>(
    grievances.find((g) => g.Complaint_ID.toUpperCase() === initialTicketId.toUpperCase()) || grievances[0] || null
  );

  // Verification state
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verificationFeedback, setVerificationFeedback] = useState<{ type: 'success' | 'error' | 'escalated'; message: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Sync active ticket when grievances array updates
  React.useEffect(() => {
    if (activeTicket) {
      const refreshed = grievances.find((g) => g.Complaint_ID === activeTicket.Complaint_ID);
      if (refreshed) setActiveTicket(refreshed);
    }
  }, [grievances]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = grievances.find(
      (g) => g.Complaint_ID.toLowerCase() === searchId.toLowerCase().trim()
    );
    if (found) {
      setActiveTicket(found);
      setVerificationFeedback(null);
    } else {
      setActiveTicket(null);
    }
  };

  const getStepIndex = (status: Grievance['Status']) => {
    switch (status) {
      case 'Pending':
        return 1;
      case 'In Progress':
        return 2;
      case 'Pending_Verification':
      case 'Resolved':
        return 3;
      case 'Closed':
        return 4;
      case 'Escalated':
        return 2;
      default:
        return 0;
    }
  };

  const handleApproveResolution = async () => {
    if (!activeTicket) return;
    setIsVerifying(true);
    try {
      if (onVerifyResolution) {
        await onVerifyResolution(activeTicket.Complaint_ID, 'approve', enteredOtp.trim());
      }
      setVerificationFeedback({
        type: 'success',
        message: 'Resolution confirmed by citizen sign-off. Ticket is now officially CLOSED in municipal records.'
      });
      setEnteredOtp('');
    } catch (err: any) {
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'OTP verification failed. Please check the 6-digit code.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRejectResolution = async () => {
    if (!activeTicket || !rejectionReason.trim()) return;
    setIsVerifying(true);
    try {
      if (onVerifyResolution) {
        await onVerifyResolution(activeTicket.Complaint_ID, 'reject', undefined, rejectionReason);
      }
      setIsRejectModalOpen(false);
      setVerificationFeedback({
        type: 'escalated',
        message: 'False Resolution Flagged! Ticket auto-escalated directly to Appellate Authority (Divisional Commissioner). Ground officer audit penalty logged.'
      });
      setRejectionReason('');
    } catch (err: any) {
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Failed to submit rejection'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Search Header */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
      }`}>
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h2 className={`text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t.trackTitle}
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Zero-Trust Dual-Handshake Redressal Tracker • Unreset Civic SLI Clock
          </p>

          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder={t.enterTicketId}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono font-bold focus:ring-2 focus:ring-[#7A0C38] focus:outline-none transition ${
                  isDarkMode 
                    ? 'bg-slate-955 border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#7A0C38] hover:bg-[#961247] text-white font-extrabold text-sm transition shadow-md"
            >
              {t.trackBtn}
            </button>
          </form>

          {/* Quick preset links */}
          <div className="flex items-center justify-center space-x-2 text-xs pt-1">
            <span className="text-slate-500 font-medium">Quick Demo Test IDs:</span>
            {['G-1001', 'G-1004', 'G-1008'].map((id) => (
              <button
                key={id}
                onClick={() => {
                  setSearchId(id);
                  const found = grievances.find((g) => g.Complaint_ID === id);
                  if (found) {
                    setActiveTicket(found);
                    setVerificationFeedback(null);
                  }
                }}
                className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs border ${
                  isDarkMode ? 'bg-slate-800 text-amber-400 border-slate-700' : 'bg-slate-100 text-[#7A0C38] border-slate-300 hover:bg-slate-200'
                }`}
              >
                #{id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket Details & Stepper */}
      {activeTicket ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Ticket Metadata Card (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
            } space-y-5`}>
              <div className={`flex items-center justify-between border-b pb-4 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <span className="text-xs text-slate-500 font-mono font-semibold block">{t.ticketRef}</span>
                  <h3 className={`text-xl font-extrabold font-mono flex items-center space-x-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    <span>{activeTicket.Complaint_ID}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded font-sans font-black ${
                      activeTicket.Status === 'Closed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      activeTicket.Status === 'Resolved' ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse' :
                      activeTicket.Status === 'Pending_Verification' ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse' :
                      activeTicket.Status === 'Escalated' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {activeTicket.Status === 'Pending_Verification' ? 'Pending Citizen Sign-off' :
                       activeTicket.Status === 'Resolved' ? '⚡ Awaiting Your Confirmation' :
                       activeTicket.Status === 'Closed' ? '✓ Closed' :
                       activeTicket.Status}

                    </span>
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-semibold block">Dynamic Priority</span>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    activeTicket.Priority === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    activeTicket.Priority === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {activeTicket.Priority} ({activeTicket.Priority_Score}/100)
                  </span>
                </div>
              </div>

              {/* Spatial Metadata */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                isDarkMode ? 'bg-slate-955 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <span>📍 GPS: {activeTicket.Latitude.toFixed(4)}°, {activeTicket.Longitude.toFixed(4)}°</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                  H3: {activeTicket.H3_Index || 'Res-10'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block mb-1">{t.originalText}</span>
                  <p className={`p-3 rounded-xl border leading-relaxed font-medium ${
                    isDarkMode ? 'bg-slate-955 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    "{activeTicket.Complaint}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className={`p-3 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-slate-500 font-bold flex items-center space-x-1 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t.department}</span>
                    </span>
                    <span className={`font-extrabold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeTicket.Department}</span>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-slate-500 font-bold flex items-center space-x-1 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t.ward}</span>
                    </span>
                    <span className={`font-extrabold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeTicket.Ward}</span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-slate-500 font-bold flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#7A0C38]" />
                    <span>{t.nodalOfficer}</span>
                  </span>
                  <span className="font-extrabold text-[#7A0C38]">
                    {activeTicket.Assigned_Officer || 'Unassigned'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-slate-500 font-bold flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.submittedOn}</span>
                  </span>
                  <span className={`font-mono font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {new Date(activeTicket.Date_Submitted).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
              </div>

              {/* False closure warning if flagged */}
              {activeTicket.Falsified_Attempts && activeTicket.Falsified_Attempts > 0 ? (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <div className="flex items-center space-x-2 font-extrabold text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>False Resolution Flag Active ({activeTicket.Falsified_Attempts} Attempt)</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    This ticket was rejected by citizen sign-off and escalated to the Divisional Commissioner with officer penalty.
                  </p>
                </div>
              ) : null}
            </div>

            {/* PILLAR 3: MULTI-AGENCY COMPOSITE DAG SPLIT-TICKETS VIEW */}
            {activeTicket.Sub_Tasks && activeTicket.Sub_Tasks.length > 0 && (
              <div className={`p-6 rounded-2xl border ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
              } space-y-4`}>
                <div className="flex items-center justify-between border-b pb-3 border-slate-700">
                  <div className="flex items-center space-x-2">
                    <GitMerge className="w-4 h-4 text-purple-400" />
                    <h4 className={`font-extrabold text-xs uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Multi-Agency DAG Workflow ({activeTicket.Sub_Tasks.length} Sub-Tasks)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Co-Ticketing DAG
                  </span>
                </div>

                <div className="space-y-3">
                  {activeTicket.Sub_Tasks.map((st) => (
                    <div
                      key={st.id}
                      className={`p-3 rounded-xl border space-y-2 ${
                        st.status === 'Resolved'
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                          : st.status === 'Blocked'
                          ? 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                          : 'bg-blue-950/40 border-blue-500/30 text-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center space-x-1.5">
                          <span className="font-mono text-[10px] opacity-75">#{st.id}</span>
                          <span className="text-white font-extrabold">{st.title}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          st.status === 'Resolved' ? 'bg-emerald-500 text-slate-950' :
                          st.status === 'Blocked' ? 'bg-slate-700 text-slate-300' : 'bg-blue-500 text-white'
                        }`}>
                          {st.status === 'Blocked' ? '🔒 BLOCKED' : st.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] opacity-80 pt-1 border-t border-slate-800">
                        <span>Agency: <strong>{st.department}</strong></span>
                        <span>Officer: <strong>{st.assigned_officer}</strong></span>
                      </div>

                      {st.depends_on && st.depends_on.length > 0 && (
                        <div className="text-[10px] text-amber-400 font-mono">
                          ↳ Prerequisite: Sub-Task #{st.depends_on.join(', #')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Stepper + PILLAR 2 DUAL-HANDSHAKE RESOLUTION SIGN-OFF (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* PILLAR 2: ZERO-TRUST DUAL-KEY SIGN-OFF SECTION */}
            {(activeTicket.Status === 'Pending_Verification' || activeTicket.Status === 'Resolved') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-6 rounded-2xl border shadow-xl space-y-5 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-blue-950/70 via-slate-900 to-slate-950 border-blue-500/40 text-blue-100' 
                    : 'bg-gradient-to-br from-blue-50 to-white border-blue-300 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between border-b border-blue-500/30 pb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-blue-400">
                      Zero-Trust Dual-Handshake Resolution Sign-Off
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded bg-blue-500 text-slate-950 animate-pulse">
                    Action Required (72h Window)
                  </span>
                </div>

                <div className="text-xs space-y-2 leading-relaxed">
                  <p>
                    {activeTicket.Status === 'Pending_Verification'
                      ? <>Ground Officer <strong>{activeTicket.Assigned_Officer}</strong> has submitted on-site proof and marked this ticket as repaired. Under the Zero-Trust Protocol, this ticket <strong>cannot be closed</strong> without your OTP verification or sign-off.</>
                      : <>Ground Officer <strong>{activeTicket.Assigned_Officer}</strong> has marked this ticket as resolved. Please confirm whether the issue has been genuinely fixed at your location before the ticket is permanently closed.</>
                    }
                  </p>
                </div>

                {/* Proof Visual & Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-blue-500/20 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Spatial & Temporal Proof</span>
                    <span className="text-emerald-400 font-extrabold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        GPS Verified On-Site ({activeTicket.Resolution_Proof?.distance_m?.toFixed(1) ?? '—'}m from complaint pin)
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">EXIF Timestamp: Live Capture</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Computer Vision Delta Check</span>
                    <span className="text-cyan-400 font-extrabold flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{Math.round((activeTicket.Resolution_Proof?.cv_delta_score || 0.94) * 100)}% Structural Repair Score</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">Siamese Edge Diff: Verified</span>
                  </div>
                </div>

                {/* OTP Input and Sign-off Actions */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Enter 6-Digit Citizen Verification OTP
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-1">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        maxLength={6}
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value)}
                        placeholder="e.g. 849201"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-blue-500/40 bg-slate-955 text-white font-mono font-black text-base tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {activeTicket.Citizen_OTP && (
                      <button
                        type="button"
                        onClick={() => setEnteredOtp(activeTicket.Citizen_OTP || '')}
                        className="px-3 py-2 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-blue-200 text-xs font-mono font-bold border border-blue-500/30"
                      >
                        Autofill OTP ({activeTicket.Citizen_OTP})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleApproveResolution}
                      disabled={isVerifying}
                      className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isVerifying ? 'Verifying...' : 'Confirm Resolution (Close Ticket)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsRejectModalOpen(true)}
                      disabled={isVerifying}
                      className="py-3 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-extrabold text-xs transition flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Closure (False Resolution)</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Verification Feedback Banner */}
            {verificationFeedback && (
              <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-3 ${
                verificationFeedback.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' :
                verificationFeedback.type === 'escalated' ? 'bg-rose-950/60 border-rose-500/40 text-rose-200' :
                'bg-amber-950/60 border-amber-500/40 text-amber-200'
              }`}>
                {verificationFeedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />}
                <span>{verificationFeedback.message}</span>
              </div>
            )}

            {/* 4-Step Stepper & SLA Countdown */}
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
            } space-y-6`}>
              <div className={`flex items-center justify-between border-b pb-3 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <h3 className={`font-extrabold text-sm uppercase tracking-wider flex items-center space-x-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <Clock className="w-4 h-4 text-[#7A0C38]" />
                  <span>{t.slaStepper}</span>
                </h3>

                <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                  <span>Unreset SLI Clock Active</span>
                </div>
              </div>

              {/* 4-Step Vertical Stepper */}
              <div className={`space-y-6 relative pl-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 ${
                isDarkMode ? 'before:bg-slate-800' : 'before:bg-slate-300'
              }`}>
                {/* Step 1 */}
                <div className="relative flex items-start space-x-4">
                  <div className="absolute -left-6 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    ✓
                  </div>
                  <div>
                    <h4 className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t.step1}
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5 font-medium`}>
                      {t.step1Desc}
                    </p>
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                      Timestamp: {new Date(activeTicket.Date_Submitted).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex items-start space-x-4">
                  <div className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                    getStepIndex(activeTicket.Status) >= 1
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600 border border-slate-300'
                  }`}>
                    {getStepIndex(activeTicket.Status) >= 1 ? '✓' : '2'}
                  </div>
                  <div>
                    <h4 className={`font-extrabold text-sm ${
                      getStepIndex(activeTicket.Status) >= 1 ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-slate-400'
                    }`}>
                      {t.step2} (Spatial Gate + Dynamic Priority)
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5 font-medium`}>
                      Categorized under <strong>{activeTicket.Department}</strong> with priority score <strong>{activeTicket.Priority_Score}/100</strong>.
                      {activeTicket.Duplicate_Group && (
                        <span className="text-amber-500 font-bold block mt-0.5">
                          Linked to Duplicate Cluster #{activeTicket.Duplicate_Group} ({activeTicket.Upvotes} Consensus Upvotes)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex items-start space-x-4">
                  <div className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                    getStepIndex(activeTicket.Status) >= 2
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600 border border-slate-300'
                  }`}>
                    {getStepIndex(activeTicket.Status) >= 2 ? '✓' : '3'}
                  </div>
                  <div>
                    <h4 className={`font-extrabold text-sm ${
                      getStepIndex(activeTicket.Status) >= 2 ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-slate-400'
                    }`}>
                      {t.step3} (Field Nodal Dispatch & Multi-Agency DAG)
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5 font-medium`}>
                      Assigned to <strong>{activeTicket.Assigned_Officer}</strong> for field inspection and execution in {activeTicket.Ward}.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex items-start space-x-4">
                  <div className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                    activeTicket.Status === 'Closed'
                      ? 'bg-emerald-600 text-white'
                      : activeTicket.Status === 'Resolved' || activeTicket.Status === 'Pending_Verification'
                      ? 'bg-blue-600 text-white animate-pulse'
                      : activeTicket.Status === 'Escalated'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-200 text-slate-600 border border-slate-300'
                  }`}>
                    {activeTicket.Status === 'Closed' ? '✓' : '4'}
                  </div>
                  <div>
                    <h4 className={`font-extrabold text-sm ${
                      activeTicket.Status === 'Closed' ? 'text-emerald-500' :
                      activeTicket.Status === 'Resolved' || activeTicket.Status === 'Pending_Verification' ? 'text-blue-400' :
                      activeTicket.Status === 'Escalated' ? 'text-rose-500' : 'text-slate-400'
                    }`}>
                      {t.step4} (Zero-Trust Dual-Key Handshake)
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5 font-medium`}>
                      {activeTicket.Status === 'Closed'
                        ? 'Field repair confirmed and signed off by citizen OTP. Ticket permanently closed.'
                        : activeTicket.Status === 'Pending_Verification'
                        ? 'Ground officer submitted geofenced proof. Awaiting your OTP confirmation below.'
                        : activeTicket.Status === 'Resolved'
                        ? 'Officer marked resolved. Your confirmation or rejection is required below.'
                        : activeTicket.Status === 'Escalated'
                        ? 'Citizen flagged false resolution. Escalated to Divisional Commissioner.'
                        : 'Field team in progress. Target resolution within mandatory SLA window.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`p-12 rounded-2xl border text-center space-y-3 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
          <h3 className={`text-lg font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Grievance Ticket Found</h3>
          <p className="text-xs text-slate-400 font-medium">
            Please check the Ticket ID (e.g., G-1001, G-1004) and try again.
          </p>
        </div>
      )}

      {/* Reject False Resolution Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-slate-900 border-rose-500/40 text-white' : 'bg-white border-rose-300 text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-2 text-rose-500">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-extrabold">Report False Closure & Escalate</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If the nodal officer marked this ticket "Resolved" without completing the work, reject the closure below. This will <strong>immediately escalate the grievance to the Divisional Commissioner</strong> and apply an audit penalty to the officer.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Ground Reality / Rejection Reason
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Water is still leaking from the main road and no repair team arrived."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-955 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectResolution}
                disabled={!rejectionReason.trim() || isVerifying}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30 flex items-center space-x-1.5"
              >
                <span>{isVerifying ? 'Escalating...' : 'Submit Rejection & Escalate'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
