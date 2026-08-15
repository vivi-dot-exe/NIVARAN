import { useState } from 'react';
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
  const [activeTicket, setActiveTicket] = useState<Grievance | null>(
    grievances.find((g) => g.Complaint_ID.toUpperCase() === initialTicketId.toUpperCase()) || grievances[0] || null
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = grievances.find(
      (g) => g.Complaint_ID.toLowerCase() === searchId.toLowerCase().trim()
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
    <div className="space-y-6">
      
      {/* Search Header */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
      }`}>
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h2 className={`text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Track Grievance Status & SLA Timer
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Enter your 5-digit DARPG Complaint Ticket ID (e.g. G-1001, G-1004, G-1008) to inspect real-time nodal assignment and SLA timers.
          </p>

          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Ticket ID (e.g. G-1001)"
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
              Track Ticket
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
                  <span className="text-xs text-slate-500 font-mono font-semibold block">Ticket Reference</span>
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
                <div>
                  <span className="text-slate-500 font-bold block mb-1">Original Grievance Text</span>
                  <p className={`p-3 rounded-xl border leading-relaxed font-medium ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                      <span>Department</span>
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs">{activeTicket.Department}</span>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-slate-500 font-bold flex items-center space-x-1 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ward</span>
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs">{activeTicket.Ward}</span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-slate-500 font-bold flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#7A0C38]" />
                    <span>Nodal Officer</span>
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
                    <span>Submitted On</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800">
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
                  <span>SLA Progress Stepper</span>
                </h3>

                <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                  <span>SLA Countdown: 14h 32m remaining</span>
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
                      1. Grievance Submitted & Encrypted
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
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
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600 border border-slate-300'
                  }`}>
                    {getStepIndex(activeTicket.Status) >= 1 ? '✓' : '2'}
                  </div>
                  <div>
                    <h4 className={`font-extrabold text-sm ${
                      getStepIndex(activeTicket.Status) >= 1 ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-slate-400'
                    }`}>
                      2. AI Triage & BERTopic Cluster Assignment
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Categorized under <strong>{activeTicket.Department}</strong> with priority score <strong>{activeTicket.Priority_Score}/100</strong>.
                      {activeTicket.Duplicate_Group && (
                        <span className="text-amber-700 font-bold block mt-0.5">
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
                      3. Nodal Officer Dispatch
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
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
                      activeTicket.Status === 'Resolved' ? 'text-emerald-700' :
                      activeTicket.Status === 'Escalated' ? 'text-rose-700' : 'text-slate-400'
                    }`}>
                      4. Verification & Grievance Resolution
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
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
          <h3 className="text-lg font-extrabold text-slate-900">No Grievance Ticket Found</h3>
          <p className="text-xs text-slate-600 font-medium">
            Please check the Ticket ID (e.g., G-1001, G-1004) and try again.
          </p>
        </div>
      )}

    </div>
  );
};
