import { useState, useEffect } from 'react';
import type { Grievance } from './types/grievance';
import { INITIAL_GRIEVANCES } from './mockData/grievances';
import { Header } from './components/common/Header';
import { GrievanceForm } from './components/citizen/GrievanceForm';
import { CitizenTracker } from './components/citizen/CitizenTracker';
import { KpiCards } from './components/admin/KpiCards';
import { BerTopicScatter } from './components/admin/BerTopicScatter';
import { GeographicHeatmap } from './components/admin/GeographicHeatmap';
import { GrievanceTable } from './components/admin/GrievanceTable';
import { ActionDrawer } from './components/admin/ActionDrawer';
import { BatchIngestionDemo } from './components/demo/BatchIngestionDemo';
import {
  checkBackendHealth,
  fetchTicketsApi,
  createTicketApi,
  updateTicketStatusApi
} from './services/api';
import { Search, FileText } from 'lucide-react';

export function App() {
  const [grievances, setGrievances] = useState<Grievance[]>(INITIAL_GRIEVANCES);
  const [activeTab, setActiveTab] = useState<'citizen' | 'admin' | 'demo'>('citizen');
  const [citizenSubTab, setCitizenSubTab] = useState<'form' | 'tracker'>('form');
  const [trackingTicketId, setTrackingTicketId] = useState<string>('G-1001');
  
  // DEFAULT TO DARK GOVTECH SLATE MODE (User Preferred Theme)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Admin filter states
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [activeActionGrievance, setActiveActionGrievance] = useState<Grievance | null>(null);

  // Check backend health & sync initial DB tickets
  useEffect(() => {
    let isMounted = true;
    async function initBackendSync() {
      const isAlive = await checkBackendHealth();
      if (isMounted) setIsBackendConnected(isAlive);

      if (isAlive) {
        try {
          const apiTickets = await fetchTicketsApi();
          if (apiTickets.length > 0 && isMounted) {
            setGrievances(apiTickets);
          }
        } catch (err) {
          console.warn('Backend sync warning:', err);
        }
      }
    }

    initBackendSync();
    const interval = setInterval(initBackendSync, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Breached count for SLA ticker
  const breachedCount = grievances.filter(
    (g) => g.Status === 'Escalated' || (g.Priority_Score >= 90 && g.Status !== 'Resolved')
  ).length;

  const handleAddGrievance = async (newTicket: Grievance) => {
    setGrievances((prev) => [newTicket, ...prev]);

    if (isBackendConnected) {
      try {
        const savedApiTicket = await createTicketApi(
          newTicket.Complaint,
          newTicket.Ward,
          newTicket.Department,
          newTicket.Priority_Score
        );
        setGrievances((prev) =>
          prev.map((g) => (g.Complaint_ID === newTicket.Complaint_ID ? savedApiTicket : g))
        );
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
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F4F6F9] text-slate-900'
    }`}>
      
      {/* Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        breachedCount={breachedCount}
        isBackendConnected={isBackendConnected}
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
                <span>1. Lodge Grievance (NIVARAN AI Triage)</span>
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

      {/* Official Government Footer */}
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
