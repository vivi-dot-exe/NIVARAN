import { useState, useEffect } from 'react';
import type { Grievance, CivicIssue } from './types/grievance';
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
import { KpiCards } from './components/admin/KpiCards';
import { AnalyticsCharts } from './components/admin/AnalyticsCharts';
import { BerTopicScatter } from './components/admin/BerTopicScatter';
import { GeographicHeatmap } from './components/admin/GeographicHeatmap';
import { GrievanceTable } from './components/admin/GrievanceTable';
import { ActionDrawer } from './components/admin/ActionDrawer';
import { BatchIngestionDemo } from './components/demo/BatchIngestionDemo';
import {
  checkBackendHealth,
  fetchTicketsApi,
  fetchCivicIssuesApi,
  createTicketApi,
  updateTicketStatusApi,
  updateCivicIssueStatusApi,
  overrideRoutingApi
} from './services/api';
import { Search, FileText } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'nivaran_grievances_v2';
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
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; email: string } | null>(() => {
    try {
      const saved = localStorage.getItem('nivaran_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<'citizen' | 'admin' | 'demo'>(() => {
    try {
      const saved = localStorage.getItem('nivaran_active_tab');
      if (saved === 'admin' || saved === 'demo' || saved === 'citizen') {
        return saved;
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

  // Modal dialog states
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isFaqsOpen, setIsFaqsOpen] = useState(false);
  const [isSiteMapOpen, setIsSiteMapOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

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
                    Upvotes: Math.max(existing.Upvotes, t.Upvotes)
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
    (g) => g.Status === 'Escalated' || (g.Priority_Score >= 90 && g.Status !== 'Resolved')
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
          newTicket.Priority_Score
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

  const handleUpvoteGrievance = (id: string) => {
    setGrievances((prev) =>
      prev.map((g) => (g.Complaint_ID === id ? { ...g, Upvotes: g.Upvotes + 1 } : g))
    );
  };

  const handleUpdateGrievance = async (updated: Grievance) => {
    setGrievances((prev) =>
      prev.map((g) => (g.Complaint_ID === updated.Complaint_ID ? updated : g))
    );

    if (isBackendConnected) {
      try {
        await updateTicketStatusApi(updated.Complaint_ID, updated.Status);
      } catch (err) {
        console.warn('FastAPI status patch fallback:', err);
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
        onOpenRegister={() => setIsRegisterOpen(true)}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Main Page Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW 1: CITIZEN PORTAL */}
        {activeTab === 'citizen' && (
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
              />
            ) : (
              <CitizenTracker
                grievances={grievances}
                civicIssues={civicIssues}
                initialTicketId={trackingTicketId}
                isDarkMode={isDarkMode}
                currentLanguage={currentLanguage}
              />
            )}
          </div>
        )}

        {/* VIEW 2: NODAL OFFICER DASHBOARD (LOCKED TO OFFICERS ONLY) */}
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

            {/* Geographic Ward Heatmap */}
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

        {/* VIEW 3: BATCH INGESTION DEMO (LOCKED TO OFFICERS ONLY) */}
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
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Sign In SSO Portal Modal */}
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        isDarkMode={isDarkMode}
        onOpenRegister={() => setIsRegisterOpen(true)}
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
