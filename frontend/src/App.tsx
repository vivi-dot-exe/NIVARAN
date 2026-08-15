import { useState, useEffect, useCallback } from 'react';
import type { Grievance } from './types/grievance';
import { INITIAL_GRIEVANCES } from './mockData/grievances';
import { Header } from './components/common/Header';
import { GrievanceForm } from './components/citizen/GrievanceForm';
import { CitizenTracker } from './components/citizen/CitizenTracker';
import { KpiCards } from './components/admin/KpiCards';
import { AnalyticsCharts } from './components/admin/AnalyticsCharts';
import { BerTopicScatter } from './components/admin/BerTopicScatter';
import { GeographicHeatmap } from './components/admin/GeographicHeatmap';
import { GrievanceTable } from './components/admin/GrievanceTable';
import { ActionDrawer } from './components/admin/ActionDrawer';
import { BatchIngestionDemo } from './components/demo/BatchIngestionDemo';
import { checkBackendHealth, fetchTicketsFromApi, backendTicketToGrievance } from './services/api';
import { Search, FileText } from 'lucide-react';

export function App() {
  const [grievances, setGrievances] = useState<Grievance[]>(INITIAL_GRIEVANCES);
  const [activeTab, setActiveTab] = useState<'citizen' | 'admin' | 'demo'>('citizen');
  const [citizenSubTab, setCitizenSubTab] = useState<'form' | 'tracker'>('form');
  const [trackingTicketId, setTrackingTicketId] = useState<string>('G-1001');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Backend sync states
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Admin filter states
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [activeActionGrievance, setActiveActionGrievance] = useState<Grievance | null>(null);

  // Fetch tickets from FastAPI backend and merge with initial mock data
  const syncWithBackend = useCallback(async () => {
    setIsSyncing(true);
    try {
      const isHealthy = await checkBackendHealth();
      setIsBackendConnected(isHealthy);

      if (isHealthy) {
        const backendTickets = await fetchTicketsFromApi();
        if (backendTickets && backendTickets.length > 0) {
          const converted = backendTickets.map(backendTicketToGrievance);
          // Merge: backend tickets take precedence, retain INITIAL_GRIEVANCES if not in backend
          setGrievances((prev) => {
            const backendIds = new Set(converted.map((c) => c.Complaint_ID));
            const remainingPrev = prev.filter((p) => !backendIds.has(p.Complaint_ID));
            return [...converted, ...remainingPrev];
          });
        }
      }
    } catch (err) {
      console.warn('Backend sync failed, running with local dataset:', err);
      setIsBackendConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initial mount: check backend and sync
  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  // Breached count for SLA ticker
  const breachedCount = grievances.filter(
    (g) => g.Status === 'Escalated' || (g.Priority_Score >= 90 && g.Status !== 'Resolved')
  ).length;

  const handleAddGrievance = (newTicket: Grievance) => {
    setGrievances((prev) => [newTicket, ...prev]);
  };

  const handleUpvoteGrievance = (id: string) => {
    setGrievances((prev) =>
      prev.map((g) => (g.Complaint_ID === id ? { ...g, Upvotes: g.Upvotes + 1 } : g))
    );
  };

  const handleUpdateGrievance = (updated: Grievance) => {
    setGrievances((prev) =>
      prev.map((g) => (g.Complaint_ID === updated.Complaint_ID ? updated : g))
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

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDarkMode ? 'bg-slate-955 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        breachedCount={breachedCount}
        isBackendConnected={isBackendConnected}
        isSyncing={isSyncing}
        onRefreshBackend={syncWithBackend}
      />

      {/* Main Page Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW 1: CITIZEN PORTAL */}
        {activeTab === 'citizen' && (
          <div className="space-y-6">
            
            {/* Citizen Sub-nav Bar */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setCitizenSubTab('form')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                  citizenSubTab === 'form'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>1. Lodge Grievance (NIVARAN AI Triage)</span>
              </button>

              <button
                onClick={() => setCitizenSubTab('tracker')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                  citizenSubTab === 'tracker'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>2. Track Status & SLA Timer</span>
              </button>
            </div>

            {citizenSubTab === 'form' ? (
              <GrievanceForm
                existingGrievances={grievances}
                onAddGrievance={handleAddGrievance}
                onUpvoteGrievance={handleUpvoteGrievance}
                isDarkMode={isDarkMode}
                onTrackTicket={handleNavigateToTracker}
              />
            ) : (
              <CitizenTracker
                grievances={grievances}
                initialTicketId={trackingTicketId}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        )}

        {/* VIEW 2: NODAL OFFICER DASHBOARD */}
        {activeTab === 'admin' && (
          <div className="space-y-8">
            {/* KPI Metric Summary Cards */}
            <KpiCards grievances={grievances} isDarkMode={isDarkMode} />

            {/* CRITICAL DATA VISUALIZATIONS: Category Breakdown & Status Distribution & Priority Tracking */}
            <AnalyticsCharts
              grievances={grievances}
              isDarkMode={isDarkMode}
            />

            {/* 2D BERTopic Scatter Cluster Map */}
            <BerTopicScatter
              grievances={grievances}
              selectedClusterId={selectedClusterId}
              onSelectCluster={setSelectedClusterId}
              isDarkMode={isDarkMode}
            />

            {/* Geographic Ward Heatmap */}
            <GeographicHeatmap grievances={grievances} isDarkMode={isDarkMode} />

            {/* Comprehensive Grievance Master Table */}
            <GrievanceTable
              grievances={grievances}
              selectedClusterId={selectedClusterId}
              onSelectGrievance={setActiveActionGrievance}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {/* VIEW 3: BATCH INGESTION DEMO */}
        {activeTab === 'demo' && (
          <BatchIngestionDemo
            onInjectBatch={handleInjectBatch}
            onRefreshFromBackend={syncWithBackend}
            grievancesCount={grievances.length}
            isDarkMode={isDarkMode}
          />
        )}

      </main>

      {/* Action Drawer Modal */}
      <ActionDrawer
        grievance={activeActionGrievance}
        isOpen={Boolean(activeActionGrievance)}
        onClose={() => setActiveActionGrievance(null)}
        onUpdate={handleUpdateGrievance}
        isDarkMode={isDarkMode}
      />

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-slate-800 mt-12 text-center text-xs text-slate-500">
        <p>Department of Administrative Reforms & Public Grievances (DARPG) • Centralized Public Grievance Redress System (NIVARAN) v2.4 • SIH 2026</p>
      </footer>
    </div>
  );
}

export default App;
