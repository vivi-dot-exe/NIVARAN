import { useState, useEffect } from 'react';
import type { Grievance } from '../../types/grievance';
import type { Language } from '../../utils/translations';
import { TRANSLATIONS } from '../../utils/translations';
import { ResolutionPlanCard } from '../common/ResolutionPlanCard';
import {
  Search,
  Clock,
  UserCheck,
  Building2,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface CitizenTrackerProps {
  grievances: Grievance[];
  civicIssues?: import('../../types/grievance').CivicIssue[];
  initialTicketId?: string;
  isDarkMode: boolean;
  currentLanguage?: Language;
}

export const CitizenTracker: React.FC<CitizenTrackerProps> = ({
  grievances,
  civicIssues = [],
  initialTicketId = 'G-1001',
  isDarkMode,
  currentLanguage = 'en'
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  const [searchId, setSearchId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('nivaran_tracking_ticket_id');
      if (saved) return saved;
    } catch {}
    return initialTicketId;
  });

  const [activeTicket, setActiveTicket] = useState<Grievance | null>(() => {
    const query = (localStorage.getItem('nivaran_tracking_ticket_id') || initialTicketId).trim().toLowerCase();
    return grievances.find((g) => g.Complaint_ID.toLowerCase() === query) || grievances[0] || null;
  });

  // Find parent Civic Issue for active ticket
  const parentIssue = activeTicket
    ? civicIssues.find(
        (iss) =>
          iss.id === activeTicket.civic_issue_id ||
          (iss.ward === activeTicket.Ward && iss.category === activeTicket.Department)
      )
    : null;

  // Sync active ticket when grievances or initialTicketId prop updates
  useEffect(() => {
    if (initialTicketId) {
      setSearchId(initialTicketId);
      const found = grievances.find((g) => g.Complaint_ID.toLowerCase() === initialTicketId.toLowerCase().trim());
      if (found) setActiveTicket(found);
    }
  }, [initialTicketId, grievances]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim();
    try {
      localStorage.setItem('nivaran_tracking_ticket_id', query);
    } catch (err) {
      console.warn('Failed to save tracking ticket ID:', err);
    }
    const found = grievances.find(
      (g) => g.Complaint_ID.toLowerCase() === query.toLowerCase()
    );
    if (found) {
      setActiveTicket(found);
    } else {
      setActiveTicket(null);
    }
  };

  // Determine current step index (0 to 3)
  const getStepIndex = (status: Grievance['Status']) => {
    switch (status) {
      case 'Pending':
        return 1; // Step 2 (AI Categorized)
      case 'In Progress':
        return 2; // Step 3 (Assigned)
      case 'Resolved':
        return 3; // Step 4 (Resolved)
      case 'Escalated':
        return 2; // Step 3 (Escalated high priority)
      default:
        return 0;
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
            {t.trackSub}
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
            <span className="text-slate-500 font-medium">Quick Test IDs:</span>
            {['G-1001', 'G-1004', 'G-1008'].map((id) => (
              <button
                key={id}
                onClick={() => {
                  setSearchId(id);
                  const found = grievances.find((g) => g.Complaint_ID === id);
                  if (found) setActiveTicket(found);
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
          
          {/* Ticket Metadata Card (5 cols) */}
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
                    <span className={`text-xs px-2 py-0.5 rounded font-sans font-extrabold ${
                      activeTicket.Status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      activeTicket.Status === 'Escalated' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {activeTicket.Status}
                    </span>
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-semibold block">Priority</span>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    activeTicket.Priority === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    activeTicket.Priority === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {activeTicket.Priority} ({activeTicket.Priority_Score}/100)
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* PARENT CIVIC ISSUE CARD */}
                {parentIssue && (
                  <div className={`p-4 rounded-xl border space-y-2 ${
                    isDarkMode ? 'bg-blue-950/60 border-blue-500/40 text-blue-100' : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white">
                        PARENT CIVIC ISSUE #{parentIssue.id}
                      </span>
                      <span className="text-xs font-bold text-amber-400">
                        Priority: {parentIssue.priority_level} ({parentIssue.priority_score}/100)
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-white">
                      {parentIssue.issue_title}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 font-semibold text-blue-200">
                      <div className="p-2 rounded bg-blue-900/40 border border-blue-500/20">
                        <span className="block text-[10px] text-blue-300">Affected Citizens</span>
                        <strong className="text-white text-sm">👥 {parentIssue.affected_citizen_count} citizens</strong>
                      </div>
                      <div className="p-2 rounded bg-blue-900/40 border border-blue-500/20">
                        <span className="block text-[10px] text-blue-300">Total Reports</span>
                        <strong className="text-white text-sm">📋 {parentIssue.report_count} reports</strong>
                      </div>
                    </div>
                    <p className="text-[11px] text-blue-300 italic pt-1">
                      Your report <strong>#{activeTicket.Complaint_ID}</strong> is part of this overall civic problem.
                    </p>
                  </div>
                )}

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
                    {activeTicket.Assigned_Officer || 'Ward Nodal Officer (Er. Rajesh Sharma)'}
                  </span>
                </div>

                {/* AI ROUTING TRANSPARENCY CARD */}
                <div className={`p-4 rounded-xl border space-y-2 font-sans ${
                  isDarkMode ? 'bg-blue-950/60 border-blue-500/40 text-blue-100' : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                      🧭 AI AUTHORITY ROUTING DECISION
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      🟢 {activeTicket.routing_confidence || 94}% {activeTicket.routing_status || 'Automatically Routed'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs font-semibold">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-300">Responsible Authority:</span>
                      <strong className="text-white text-right">{activeTicket.responsible_authority || 'Municipal Corporation of Greater Mumbai'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-300">Department:</span>
                      <strong className="text-white text-right">{activeTicket.Department}</strong>
                    </div>
                  </div>
                  <div className="p-2 rounded bg-blue-900/40 border border-blue-500/30 text-[11px] text-blue-200 mt-1">
                    <span className="block font-bold text-white mb-0.5">Why was this routed here?</span>
                    <p className="whitespace-pre-line leading-relaxed opacity-90">
                      {activeTicket.routing_reason || `• Complaint text analyzed for semantic keywords.\n• Jurisdiction mapped to ${activeTicket.Ward} under Municipal Corporation.\n• Designated nodal officer assigned.`}
                    </p>
                  </div>
                </div>

                {/* MULTI-AGENCY DECOMPOSITION RESOLUTION PLAN CARD */}
                {activeTicket.resolution_plan && (
                  <ResolutionPlanCard plan={activeTicket.resolution_plan} isDarkMode={isDarkMode} />
                )}

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

            </div>
          </div>

          {/* 4-Step Stepper & SLA Countdown (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
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
                  <span>{t.slaRemaining}</span>
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
                      {t.step2}
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5 font-medium`}>
                      Categorized under <strong>{activeTicket.Department}</strong> with priority score <strong>{activeTicket.Priority_Score}/100</strong>.
                      {activeTicket.Duplicate_Group && (
                        <span className="text-amber-500 font-bold block mt-0.5">
                          Linked to Duplicate Cluster #{activeTicket.Duplicate_Group}
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
                      {t.step3}
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5 font-medium`}>
                      Assigned to <strong>{activeTicket.Assigned_Officer}</strong> for field inspection and resource allocation in {activeTicket.Ward}.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex items-start space-x-4">
                  <div className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                    activeTicket.Status === 'Resolved'
                      ? 'bg-emerald-600 text-white'
                      : activeTicket.Status === 'Escalated'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-200 text-slate-600 border border-slate-300'
                  }`}>
                    {activeTicket.Status === 'Resolved' ? '✓' : '4'}
                  </div>
                  <div>
                    <h4 className={`font-extrabold text-sm ${
                      activeTicket.Status === 'Resolved' ? 'text-emerald-500' :
                      activeTicket.Status === 'Escalated' ? 'text-rose-500' : 'text-slate-400'
                    }`}>
                      {t.step4}
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5 font-medium`}>
                      {activeTicket.Status === 'Resolved' 
                        ? 'Field repair completed and verified by civic inspector.'
                        : 'Field execution team in progress on-site. Target completion within mandatory SLA.'}
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

    </div>
  );
};
