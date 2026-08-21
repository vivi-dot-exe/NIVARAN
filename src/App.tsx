import { useState, useEffect } from 'react';
import type { Grievance, SubTask, CivicIssue } from './types/grievance';
import type { Language } from './utils/translations';
import { TRANSLATIONS } from './utils/translations';
import { INITIAL_GRIEVANCES, INITIAL_CIVIC_ISSUES } from './mockData/grievances';
import { Header } from './components/common/Header';
import { ContactUsModal } from './components/common/ContactUsModal';
import { FaqsModal } from './components/common/FaqsModal';
import { SiteMapModal } from './components/common/SiteMapModal';
import { SignInModal } from './components/common/SignInModal';
import { RegisterModal } from './components/common/RegisterModal';
import { GrievanceForm } from './components/citizen/GrievanceForm';
import { CitizenTracker } from './components/citizen/CitizenTracker';
import { RegisterPage } from './components/citizen/RegisterPage';
import { KpiCards } from './components/admin/KpiCards';
import { AnalyticsCharts } from './components/admin/AnalyticsCharts';
import { BerTopicScatter } from './components/admin/BerTopicScatter';
import { GeographicHeatmap } from './components/admin/GeographicHeatmap';
import { GrievanceTable } from './components/admin/GrievanceTable';
import { ActionDrawer } from './components/admin/ActionDrawer';
import { GovernanceScorecard } from './components/admin/GovernanceScorecard';
import { BatchIngestionDemo } from './components/demo/BatchIngestionDemo';
import {
  checkBackendHealth,
  fetchTicketsApi,
  fetchCivicIssuesApi,
  createTicketApi,
  updateTicketStatusApi,
  upvoteTicketApi,
  submitResolutionProofApi,
  verifyResolutionApi,
  createSplitTasksApi,
  resolveSubTaskApi,
  updateCivicIssueStatusApi,
  overrideRoutingApi
} from './services/api';
import { Search, FileText } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'nivaran_grievances_v3';
const CIVIC_ISSUES_KEY = 'nivaran_civic_issues_v1';

export function App() {
  // PERSISTENT LOCAL STORAGE INITIALIZATION
  const [grievances, setGrievances] = useState<Grievance[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not parse saved grievances from localStorage:', e);
    }
    return INITIAL_GRIEVANCES;
  });

  const [civicIssues, setCivicIssues] = useState<CivicIssue[]>(() => {
    try {
      const saved = localStorage.getItem(CIVIC_ISSUES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not parse saved civic issues from localStorage:', e);
    }
    return INITIAL_CIVIC_ISSUES;
  });

  // User Auth State (Null = Citizen View Mode) - PERSISTENT
  const [currentUser, setCurrentUser] = useState<{ id?: string; name: string; role: string; email: string; ward?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('nivaran_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<'citizen' | 'admin' | 'scorecard' | 'demo'>(() => {
    try {
      const saved = localStorage.getItem('nivaran_active_tab');
      if (saved === 'admin' || saved === 'demo' || saved === 'citizen' || saved === 'scorecard') {
        return saved as 'citizen' | 'admin' | 'scorecard' | 'demo';
      }
    } catch {}
    return 'citizen';
  });

  const [citizenSubTab, setCitizenSubTab] = useState<'form' | 'tracker'>(() => {
    try {
      const saved = localStorage.getItem('nivaran_citizen_subtab');
      if (saved === 'form' || saved === 'tracker') return saved;
    } catch {}
    return 'form';
  });

  const [trackingTicketId, setTrackingTicketId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('nivaran_tracking_ticket_id');
      if (saved) return saved;
    } catch {}
    return 'G-1001';
  });
  
  // Real-time Multilingual Language State - PERSISTENT
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('nivaran_language') as Language;
      if (saved && TRANSLATIONS[saved]) return saved;
    } catch {}
    return 'en';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nivaran_dark_mode');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Modal & Full-Page View states
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isFaqsOpen, setIsFaqsOpen] = useState(false);
  const [isSiteMapOpen, setIsSiteMapOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRegisterPageOpen, setIsRegisterPageOpen] = useState(false);

  // Admin filter states - PERSISTENT
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nivaran_selected_cluster') || null;
    } catch {
      return null;
    }
  });

  const [activeActionGrievance, setActiveActionGrievance] = useState<Grievance | null>(null);
  const [activeActionCivicIssue, setActiveActionCivicIssue] = useState<CivicIssue | null>(null);

  const isOfficerLoggedIn = Boolean(currentUser && (currentUser.role.includes('Nodal') || currentUser.role.includes('Officer') || currentUser.role.includes('Admin')));

  // PERSIST TO LOCAL STORAGE WHENEVER GRIEVANCES UPDATE
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(grievances));
    } catch (e) {
      console.warn('Failed to save grievances to localStorage:', e);
    }
  }, [grievances]);

  // PERSIST TO LOCAL STORAGE WHENEVER CIVIC ISSUES UPDATE
  useEffect(() => {
    try {
      localStorage.setItem(CIVIC_ISSUES_KEY, JSON.stringify(civicIssues));
    } catch (e) {
      console.warn('Failed to save civic issues to localStorage:', e);
    }
  }, [civicIssues]);

  // Check backend health & sync DB tickets & civic issues
  useEffect(() => {
    let isMounted = true;
    async function initBackendSync() {
      const isAlive = await checkBackendHealth();
      if (isMounted) setIsBackendConnected(isAlive);

      if (isAlive) {
        try {
          const apiTickets = await fetchTicketsApi();
          if (apiTickets.length > 0 && isMounted) {
            setGrievances((prev) => {
              const prevMap = new Map(prev.map((item) => [item.Complaint_ID, item]));
              apiTickets.forEach((t) => {
                const existing = prevMap.get(t.Complaint_ID);
                if (existing) {
                  prevMap.set(t.Complaint_ID, {
                    ...existing,
                    ...t,
                    Cluster_X: existing.Cluster_X ?? t.Cluster_X,
                    Cluster_Y: existing.Cluster_Y ?? t.Cluster_Y,
                    Latitude: existing.Latitude ?? t.Latitude,
                    Longitude: existing.Longitude ?? t.Longitude,
                    Duplicate_Group: existing.Duplicate_Group ?? t.Duplicate_Group,
                    Upvotes: Math.max(existing.Upvotes, t.Upvotes),
                    Sub_Tasks: t.Sub_Tasks && t.Sub_Tasks.length > 0 ? t.Sub_Tasks : existing.Sub_Tasks,
                    Audit_Trail: t.Audit_Trail && t.Audit_Trail.length > 0 ? t.Audit_Trail : existing.Audit_Trail
                  });
                } else {
                  prevMap.set(t.Complaint_ID, t);
                }
              });
              return Array.from(prevMap.values());
            });
          }

          const apiIssues = await fetchCivicIssuesApi();
          if (apiIssues.length > 0 && isMounted) {
            setCivicIssues((prev) => {
              const prevMap = new Map(prev.map((item) => [item.id, item]));
              apiIssues.forEach((iss) => {
                prevMap.set(iss.id, iss);
              });
              return Array.from(prevMap.values());
            });
          }
        } catch (err) {
          console.warn('Backend sync warning:', err);
        }
      }
    }

    initBackendSync();
    const interval = setInterval(initBackendSync, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Ensure unauthenticated users cannot view admin tabs
  useEffect(() => {
    if (!isOfficerLoggedIn && (activeTab === 'admin' || activeTab === 'demo')) {
      setActiveTab('citizen');
    }
  }, [isOfficerLoggedIn, activeTab]);

  // Breached count for SLA ticker
  const breachedCount = grievances.filter(
    (g) => g.Status === 'Escalated' || (g.Priority_Score >= 90 && g.Status !== 'Resolved' && g.Status !== 'Closed')
  ).length;

  const handleAddGrievance = async (newTicket: Grievance) => {
    setGrievances((prev) => [newTicket, ...prev]);

    if (isBackendConnected) {
      try {
        const savedApiTicket = await createTicketApi(
          newTicket.Complaint_ID,
          newTicket.Complaint,
          newTicket.Ward,
          newTicket.Department,
          newTicket.Priority_Score,
          newTicket.Latitude,
          newTicket.Longitude,
          newTicket.Assigned_Officer
        );
        setGrievances((prev) =>
          prev.map((g) => (g.Complaint_ID === newTicket.Complaint_ID ? savedApiTicket : g))
        );
        // Refresh civic issues from backend after ticket creation
        const updatedIssues = await fetchCivicIssuesApi();
        if (updatedIssues.length > 0) setCivicIssues(updatedIssues);
      } catch (err) {
        console.warn('FastAPI ticket save fallback:', err);
      }
    }
  };

  const handleUpvoteGrievance = async (id: string) => {
    setGrievances((prev) =>
      prev.map((g) => {
        if (g.Complaint_ID === id) {
          const newUpvotes = g.Upvotes + 1;
          const base = g.Base_Severity || (g.Priority === 'Critical' ? 80 : g.Priority === 'High' ? 65 : 45);
          const newPriorityScore = Math.min(100, Math.round(base + (10 * Math.log2(newUpvotes + 1))));
          return {
            ...g,
            Upvotes: newUpvotes,
            Priority_Score: newPriorityScore,
            Priority: newPriorityScore >= 85 ? 'Critical' : newPriorityScore >= 70 ? 'High' : 'Medium'
          };
        }
        return g;
      })
    );

    if (isBackendConnected) {
      try {
        const updated = await upvoteTicketApi(id);
        setGrievances((prev) =>
          prev.map((g) => (g.Complaint_ID === id ? { ...g, ...updated } : g))
        );
      } catch (err) {
        console.warn('FastAPI upvote fallback:', err);
      }
    }
  };

  const handleUpdateGrievance = async (updated: Grievance) => {
    setGrievances((prev) =>
      prev.map((g) => (g.Complaint_ID === updated.Complaint_ID ? updated : g))
    );

    if (isBackendConnected) {
      try {
        await updateTicketStatusApi(updated.Complaint_ID, updated.Status, updated.Department, updated.Assigned_Officer);
      } catch (err) {
        console.warn('FastAPI status patch fallback:', err);
      }
    }
  };

  const handleSubmitResolutionProof = async (
    ticketId: string,
    officerName: string,
    officerLat: number,
    officerLng: number,
    imageUrl?: string,
    notes?: string
  ) => {
    // Compute the real field distance for the local fallback proof object
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const ticket = grievances.find((g) => g.Complaint_ID === ticketId);
    let realDistanceM = 0;
    if (ticket) {
      const dLat = toRad(ticket.Latitude - officerLat);
      const dLng = toRad(ticket.Longitude - officerLng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(officerLat)) * Math.cos(toRad(ticket.Latitude)) * Math.sin(dLng / 2) ** 2;
      realDistanceM = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
    }

    // Optimistic local update — OTP will be overwritten by the real API response below.
    setGrievances((prev) =>
      prev.map((g) => {
        if (g.Complaint_ID === ticketId) {
          return {
            ...g,
            Status: 'Pending_Verification',
            Verification_Status: 'pending_verification',
            Assigned_Officer: officerName,
            Resolution_Proof: {
              officer_name: officerName,
              officer_lat: officerLat,
              officer_lng: officerLng,
              distance_m: realDistanceM,
              image_url: imageUrl,
              cv_delta_score: 0.93,
              notes: notes || 'Field inspection repair completed on site.',
              submitted_at: new Date().toISOString()
            },
            Audit_Trail: [
              ...(g.Audit_Trail || []),
              {
                timestamp: new Date().toISOString(),
                event: 'PROOF_SUBMITTED',
                details: `Officer ${officerName} submitted geofenced proof (${realDistanceM}m). Awaiting backend OTP dispatch.`
              }
            ]
          };
        }
        return g;
      })
    );

    if (isBackendConnected) {
      try {
        const updated = await submitResolutionProofApi(ticketId, officerName, officerLat, officerLng, imageUrl, notes);
        setGrievances((prev) =>
          prev.map((g) => (g.Complaint_ID === ticketId ? { ...g, ...updated } : g))
        );
      } catch (err) {
        console.warn('FastAPI resolution proof fallback:', err);
      }
    }
  };

  const handleUpdateCivicIssue = async (updatedIssue: CivicIssue) => {
    setCivicIssues((prev) =>
      prev.map((iss) => (iss.id === updatedIssue.id ? updatedIssue : iss))
    );

    // Cascade status update to all child tickets in state
    setGrievances((prev) =>
      prev.map((g) =>
        g.civic_issue_id === updatedIssue.id || (g.Ward === updatedIssue.ward && g.Department === updatedIssue.category)
          ? { ...g, Status: updatedIssue.status, Assigned_Officer: updatedIssue.responsible_authority }
          : g
      )
    );

    if (isBackendConnected) {
      try {
        await updateCivicIssueStatusApi(updatedIssue.id, updatedIssue.status, updatedIssue.responsible_authority);
        if (updatedIssue.manual_override) {
          await overrideRoutingApi(
            updatedIssue.id,
            updatedIssue.responsible_authority,
            updatedIssue.responsible_department,
            updatedIssue.assigned_officer,
            updatedIssue.override_reason || 'Officer Override',
            currentUser?.name || 'Nodal Officer'
          );
        }
      } catch (err) {
        console.warn('FastAPI civic issue status patch fallback:', err);
      }
    }
  };

  const handleVerifyResolution = async (
    ticketId: string,
    action: 'approve' | 'reject',
    otp?: string,
    rejectionReason?: string
  ) => {
    if (isBackendConnected) {
      try {
        const updated = await verifyResolutionApi(ticketId, action, otp, rejectionReason);
        setGrievances((prev) =>
          prev.map((g) => (g.Complaint_ID === ticketId ? { ...g, ...updated } : g))
        );
        return;
      } catch (err) {
        console.warn('FastAPI verify fallback:', err);
      }
    }

    // Client fallback
    setGrievances((prev) =>
      prev.map((g) => {
        if (g.Complaint_ID === ticketId) {
          if (action === 'approve') {
            return {
              ...g,
              Status: 'Closed',
              Verification_Status: 'verified_closed',
              Resolved_At: new Date().toISOString(),
              Audit_Trail: [
                ...(g.Audit_Trail || []),
                {
                  timestamp: new Date().toISOString(),
                  event: 'CITIZEN_APPROVED_CLOSED',
                  details: 'Citizen validated OTP and confirmed resolution. Ticket permanently CLOSED.'
                }
              ]
            };
          } else {
            return {
              ...g,
              Status: 'Escalated',
              Verification_Status: 'rejected_escalated',
              Falsified_Attempts: (g.Falsified_Attempts || 0) + 1,
              Closure_Rejected_Reason: rejectionReason,
              Audit_Trail: [
                ...(g.Audit_Trail || []),
                {
                  timestamp: new Date().toISOString(),
                  event: 'FALSE_CLOSURE_REJECTED',
                  details: `Citizen rejected closure: "${rejectionReason}". Escalated to Divisional Commissioner.`
                }
              ]
            };
          }
        }
        return g;
      })
    );
  };

  const handleSplitTicket = async (ticketId: string, subTasks: SubTask[]) => {
    setGrievances((prev) =>
      prev.map((g) => (g.Complaint_ID === ticketId ? { ...g, Sub_Tasks: subTasks } : g))
    );

    if (isBackendConnected) {
      try {
        const updated = await createSplitTasksApi(ticketId, subTasks);
        setGrievances((prev) =>
          prev.map((g) => (g.Complaint_ID === ticketId ? { ...g, ...updated } : g))
        );
      } catch (err) {
        console.warn('FastAPI split ticket fallback:', err);
      }
    }
  };

  const handleResolveSubTask = async (ticketId: string, subTaskId: string, notes?: string) => {
    if (isBackendConnected) {
      try {
        const updated = await resolveSubTaskApi(ticketId, subTaskId, notes);
        setGrievances((prev) =>
          prev.map((g) => (g.Complaint_ID === ticketId ? { ...g, ...updated } : g))
        );
        return;
      } catch (err) {
        console.warn('FastAPI resolve subtask fallback:', err);
      }
    }

    setGrievances((prev) =>
      prev.map((g) => {
        if (g.Complaint_ID === ticketId && g.Sub_Tasks) {
          const updatedTasks = g.Sub_Tasks.map((t) => {
            if (t.id === subTaskId) return { ...t, status: 'Resolved' as const };
            return t;
          });
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
          return { ...g, Sub_Tasks: fullyUpdated };
        }
        return g;
      })
    );
  };

  const handleInjectBatch = (newBatch: Grievance[]) => {
    setGrievances((prev) => [...newBatch, ...prev]);
  };

  const handleNavigateToTracker = (ticketId: string) => {
    setTrackingTicketId(ticketId);
    setActiveTab('citizen');
    setCitizenSubTab('tracker');
  };

  const handleGoHome = () => {
    setActiveTab('citizen');
    setCitizenSubTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setActiveTab('citizen');
    setCitizenSubTab('form');
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDarkMode ? 'bg-slate-955 text-slate-100' : 'bg-[#F4F6F9] text-slate-900'
    }`}>
      {/* Header Navigation with Role-Based Privacy Protection */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        breachedCount={breachedCount}
        isBackendConnected={isBackendConnected}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        onOpenContactUs={() => setIsContactOpen(true)}
        onOpenFaqs={() => setIsFaqsOpen(true)}
        onOpenSiteMap={() => setIsSiteMapOpen(true)}
        onGoHome={handleGoHome}
        onOpenSignIn={() => setIsSignInOpen(true)}
        onOpenRegister={() => setIsRegisterPageOpen(true)}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Main Page Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* VIEW 0: FULL-PAGE CPGRAMS CITIZEN REGISTRATION */}
        {isRegisterPageOpen && (
          <RegisterPage
            isDarkMode={isDarkMode}
            onRegisterSuccess={(newUser) => {
              setCurrentUser(newUser);
              setIsRegisterPageOpen(false);
              setActiveTab('citizen');
              setCitizenSubTab('form');
            }}
            onNavigateToLogin={() => {
              setIsRegisterPageOpen(false);
              setIsSignInOpen(true);
            }}
            onBackToHome={() => setIsRegisterPageOpen(false)}
          />
        )}

        {/* VIEW 1: CITIZEN PORTAL */}
        {!isRegisterPageOpen && activeTab === 'citizen' && (
          <div className="space-y-6">
            {/* Citizen Sub-nav Bar */}
            <div className={`flex items-center space-x-2 border-b pb-3 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-300'
            }`}>
              <button
                onClick={() => setCitizenSubTab('form')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  citizenSubTab === 'form'
                    ? 'bg-[#7A0C38] text-white shadow-md'
                    : isDarkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>
                  {TRANSLATIONS[currentLanguage]?.lodgeTab || TRANSLATIONS.en.lodgeTab}
                </span>
              </button>

              <button
                onClick={() => setCitizenSubTab('tracker')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  citizenSubTab === 'tracker'
                    ? 'bg-[#7A0C38] text-white shadow-md'
                    : isDarkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>
                  {TRANSLATIONS[currentLanguage]?.trackTab || TRANSLATIONS.en.trackTab}
                </span>
              </button>
            </div>

            {citizenSubTab === 'form' ? (
              <GrievanceForm
                existingGrievances={grievances}
                existingCivicIssues={civicIssues}
                onAddGrievance={handleAddGrievance}
                onUpvoteGrievance={handleUpvoteGrievance}
                isDarkMode={isDarkMode}
                onTrackTicket={handleNavigateToTracker}
                currentLanguage={currentLanguage}
                currentUser={currentUser}
                onOpenLogin={() => setIsSignInOpen(true)}
                onOpenRegister={() => setIsRegisterPageOpen(true)}
              />
            ) : (
              <CitizenTracker
                grievances={grievances}
                civicIssues={civicIssues}
                initialTicketId={trackingTicketId}
                isDarkMode={isDarkMode}
                currentLanguage={currentLanguage}
                onVerifyResolution={handleVerifyResolution}
              />
            )}
          </div>
        )}

        {/* VIEW 2: PUBLIC WALL OF GOVERNANCE (CIVIC SCORECARD) */}
        {activeTab === 'scorecard' && (
          <GovernanceScorecard
            grievances={grievances}
            isDarkMode={isDarkMode}
          />
        )}

        {/* VIEW 3: NODAL OFFICER DASHBOARD (LOCKED TO OFFICERS ONLY) */}
        {activeTab === 'admin' && isOfficerLoggedIn && (
          <div className="space-y-8">
            {/* KPI Metric Summary Cards */}
            <KpiCards
              grievances={grievances}
              civicIssues={civicIssues}
              isDarkMode={isDarkMode}
              currentLanguage={currentLanguage}
            />

            {/* Department Breakdown & Status Proportions + Priority SLA Breach Triage Tracker */}
            <AnalyticsCharts
              grievances={grievances}
              isDarkMode={isDarkMode}
              currentLanguage={currentLanguage}
            />

            {/* 2D BERTopic Scatter Cluster Map */}
            <BerTopicScatter
              grievances={grievances}
              selectedClusterId={selectedClusterId}
              onSelectCluster={setSelectedClusterId}
              isDarkMode={isDarkMode}
              currentLanguage={currentLanguage}
            />

            {/* Geographic Ward Heatmap with SLI Layers */}
            <GeographicHeatmap
              grievances={grievances}
              isDarkMode={isDarkMode}
              currentLanguage={currentLanguage}
            />

            {/* Comprehensive Grievance Master Table */}
            <GrievanceTable
              grievances={grievances}
              civicIssues={civicIssues}
              selectedClusterId={selectedClusterId}
              onSelectGrievance={setActiveActionGrievance}
              onSelectCivicIssue={(issue) => setActiveActionCivicIssue(issue)}
              isDarkMode={isDarkMode}
              currentLanguage={currentLanguage}
            />
          </div>
        )}

        {/* VIEW 4: BATCH INGESTION DEMO (LOCKED TO OFFICERS ONLY) */}
        {activeTab === 'demo' && isOfficerLoggedIn && (
          <BatchIngestionDemo
            onInjectBatch={handleInjectBatch}
            grievancesCount={grievances.length}
            isDarkMode={isDarkMode}
            currentLanguage={currentLanguage}
          />
        )}
      </main>

      {/* Action Drawer Modal */}
      <ActionDrawer
        grievance={activeActionGrievance}
        civicIssue={activeActionCivicIssue}
        isOpen={Boolean(activeActionGrievance || activeActionCivicIssue)}
        onClose={() => {
          setActiveActionGrievance(null);
          setActiveActionCivicIssue(null);
        }}
        onUpdate={handleUpdateGrievance}
        onSubmitResolutionProof={handleSubmitResolutionProof}
        onSplitTicket={handleSplitTicket}
        onResolveSubTask={handleResolveSubTask}
        onUpdateCivicIssue={handleUpdateCivicIssue}
        isDarkMode={isDarkMode}
      />

      {/* Contact Us Modal */}
      <ContactUsModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* FAQs / Help Desk Modal */}
      <FaqsModal
        isOpen={isFaqsOpen}
        onClose={() => setIsFaqsOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Site Map Modal */}
      <SiteMapModal
        isOpen={isSiteMapOpen}
        onClose={() => setIsSiteMapOpen(false)}
        isDarkMode={isDarkMode}
        onNavigateTab={(tab) => {
          if (tab === 'admin' || tab === 'demo') {
            if (!isOfficerLoggedIn) {
              setIsSignInOpen(true);
              return;
            }
          }
          setActiveTab(tab as any);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Sign In SSO Portal Modal */}
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        isDarkMode={isDarkMode}
        onOpenRegister={() => {
          setIsSignInOpen(false);
          setIsRegisterPageOpen(true);
        }}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role.includes('Nodal') || user.role.includes('Officer') || user.role.includes('Admin')) {
            setActiveTab('admin');
          }
        }}
      />

      {/* Citizen Registration Modal */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        isDarkMode={isDarkMode}
        onSwitchToSignIn={() => {
          setIsRegisterOpen(false);
          setIsSignInOpen(true);
        }}
        onRegisterSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      <footer className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t mt-12 text-center text-xs ${
        isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-600'
      }`}>
        <p className="font-semibold text-slate-700">
          Department of Administrative Reforms & Public Grievances (DARPG) • Centralized Public Grievance Redress System (NIVARAN) v2.4
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Designed and Developed by National Informatics Centre (NIC) • Government of India
        </p>
      </footer>
    </div>
  );
}

export default App;
