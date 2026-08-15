import { useState, useEffect } from 'react';
import type { Grievance } from '../../types/grievance';
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
  initialTicketId?: string;
  isDarkMode: boolean;
}

export const CitizenTracker: React.FC<CitizenTrackerProps> = ({
  grievances,
  initialTicketId = 'G-1001',
  isDarkMode
}) => {
  const [searchId, setSearchId] = useState(initialTicketId);
  const [activeTicket, setActiveTicket] = useState<Grievance | null>(null);

  useEffect(() => {
    if (initialTicketId) {
      setSearchId(initialTicketId);
      const found = grievances.find(
        (g) => g.Complaint_ID.toUpperCase() === initialTicketId.toUpperCase().trim()
      );
      if (found) {
        setActiveTicket(found);
      } else if (grievances.length > 0) {
        setActiveTicket(grievances[0]);
      }
    }
  }, [initialTicketId, grievances]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.toLowerCase().trim();
    const found = grievances.find(
      (g) => g.Complaint_ID.toLowerCase() === query || g.Complaint_ID.toLowerCase().replace('g-', '').replace('tick-', '') === query
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

  // Dynamically compute 3-4 sample test ticket IDs from active grievances
  const testIds = grievances.slice(0, 4).map((g) => g.Complaint_ID);

  return (
    <div className="space-y-6">
      
      {/* Search Header */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Track Grievance Status & SLA Timer
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Enter your DARPG Complaint Ticket ID (e.g. {testIds[0] || 'G-1001'}) to inspect real-time nodal assignment and SLA timers.
          </p>

          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Ticket ID (e.g. G-1001 or TICK-XXXX)"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none transition ${
                  isDarkMode 
                    ? 'bg-slate-955 border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              Track Ticket
            </button>
          </form>

          {/* Quick preset links */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs pt-1">
            <span className="text-slate-500">Quick Test IDs:</span>
            {testIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSearchId(id);
                  const found = grievances.find((g) => g.Complaint_ID === id);
                  if (found) setActiveTicket(found);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono border border-slate-700 cursor-pointer"
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
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            } space-y-5`}>
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs text-slate-400 block font-mono">Ticket Reference</span>
                  <h3 className="text-xl font-extrabold text-white font-mono flex items-center space-x-2">
                    <span>{activeTicket.Complaint_ID}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-sans font-semibold ${
                      activeTicket.Status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      activeTicket.Status === 'Escalated' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {activeTicket.Status}
                    </span>
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Priority</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    activeTicket.Priority === 'Critical' ? 'bg-rose-500/20 text-rose-400' :
                    activeTicket.Priority === 'High' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {activeTicket.Priority} ({activeTicket.Priority_Score}/100)
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Original Grievance Text</span>
                  <p className={`p-3 rounded-xl border leading-relaxed ${
                    isDarkMode ? 'bg-slate-955 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    "{activeTicket.Complaint}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <span className="text-slate-400 flex items-center space-x-1 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Department</span>
                    </span>
                    <span className="font-bold text-white text-xs">{activeTicket.Department}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <span className="text-slate-400 flex items-center space-x-1 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <span>Ward</span>
                    </span>
                    <span className="font-bold text-white text-xs">{activeTicket.Ward}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span>Nodal Officer</span>
                  </span>
                  <span className="font-semibold text-teal-300">
                    {activeTicket.Assigned_Officer || 'Unassigned'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Submitted On</span>
                  </span>
                  <span className="font-mono text-slate-300">
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
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            } space-y-6`}>
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm uppercase tracking-wider text-white flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>SLA Progress Stepper</span>
                </h3>

                <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>SLA Countdown: 14h 32m remaining</span>
                </div>
              </div>

              {/* 4-Step Vertical Stepper */}
              <div className="space-y-6 relative pl-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                
                {/* Step 1 */}
                <div className="relative flex items-start space-x-4">
                  <div className="absolute -left-6 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">1. Grievance Submitted & Encrypted</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Logged into central DARPG grievance repository via citizen web portal.
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
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {getStepIndex(activeTicket.Status) >= 1 ? '✓' : '2'}
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${getStepIndex(activeTicket.Status) >= 1 ? 'text-white' : 'text-slate-500'}`}>
                      2. AI Triage & BERTopic Cluster Assignment
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Categorized under <strong>{activeTicket.Department}</strong> with priority score <strong>{activeTicket.Priority_Score}/100</strong>.
                      {activeTicket.Duplicate_Group && (
                        <span className="text-amber-400 font-semibold block mt-0.5">
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
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {getStepIndex(activeTicket.Status) >= 2 ? '✓' : '3'}
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${getStepIndex(activeTicket.Status) >= 2 ? 'text-white' : 'text-slate-500'}`}>
                      3. Nodal Officer Dispatch
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Assigned to <strong>{activeTicket.Assigned_Officer}</strong> for field inspection and resource allocation in {activeTicket.Ward}.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex items-start space-x-4">
                  <div className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                    activeTicket.Status === 'Resolved'
                      ? 'bg-emerald-500 text-slate-950'
                      : activeTicket.Status === 'Escalated'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {activeTicket.Status === 'Resolved' ? '✓' : '4'}
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${
                      activeTicket.Status === 'Resolved' ? 'text-emerald-400' :
                      activeTicket.Status === 'Escalated' ? 'text-rose-400' : 'text-slate-500'
                    }`}>
                      4. Verification & Grievance Resolution
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
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
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Grievance Ticket Found</h3>
          <p className="text-xs text-slate-400">
            Please check the Ticket ID (e.g., G-1001, {testIds[0] || 'G-1004'}) and try again.
          </p>
        </div>
      )}

    </div>
  );
};
