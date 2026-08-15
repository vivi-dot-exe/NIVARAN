import React from 'react';
import {
  ShieldCheck,
  UserCheck,
  LayoutDashboard,
  Layers,
  Sun,
  Moon,
  Activity,
  AlertTriangle,
  Globe,
  Home,
  HelpCircle,
  PhoneCall,
  FileText,
  RefreshCw,
  Server
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'citizen' | 'admin' | 'demo';
  setActiveTab: (tab: 'citizen' | 'admin' | 'demo') => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  breachedCount: number;
  isBackendConnected?: boolean;
  isSyncing?: boolean;
  onRefreshBackend?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  breachedCount,
  isBackendConnected = true,
  isSyncing = false,
  onRefreshBackend
}) => {
  return (
    <header className="w-full shadow-lg transition-colors duration-200">
      
      {/* 1. TOPMOST NATIONAL BAR (Deep Maroon #700a2b) */}
      <div className="bg-[#700a2b] text-slate-100 text-[11px] py-1.5 px-4 sm:px-8 border-b border-[#8c1039] flex flex-col sm:flex-row items-center justify-between font-sans">
        <div className="flex items-center space-x-3 text-slate-200">
          <span className="font-semibold">भारत सरकार | Government of India</span>
          <span className="text-slate-400">|</span>
          <span className="hidden md:inline text-slate-300">
            कार्मिक, लोक शिकायत और पेंशन मंत्रालय | Ministry of Personnel, Public Grievances & Pensions
          </span>
        </div>

        <div className="flex items-center space-x-4 mt-1 sm:mt-0 text-slate-300">
          <span className="flex items-center space-x-1 hover:text-white cursor-pointer transition">
            <Home className="w-3 h-3 text-amber-400" />
            <span>Home</span>
          </span>
          <span>|</span>
          <span className="flex items-center space-x-1 hover:text-white cursor-pointer transition">
            <PhoneCall className="w-3 h-3 text-amber-400" />
            <span>Contact Us</span>
          </span>
          <span>|</span>
          <span className="flex items-center space-x-1 hover:text-white cursor-pointer transition">
            <HelpCircle className="w-3 h-3 text-amber-400" />
            <span>FAQs / Help</span>
          </span>
          <span>|</span>
          <span className="flex items-center space-x-1 hover:text-white cursor-pointer transition">
            <FileText className="w-3 h-3 text-amber-400" />
            <span>Site Map</span>
          </span>
        </div>
      </div>

      {/* 2. MAIN DEPARTMENT BRANDING HEADER (White / Slate Dark Mode) */}
      <div className={`py-4 px-4 sm:px-8 border-b ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Ashoka Emblem & Department Title */}
          <div className="flex items-center space-x-4">
            {/* Ashoka Emblem SVG Representation */}
            <div className="w-12 h-14 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 120" className="w-full h-full text-amber-600 fill-current">
                <path d="M50 5 C55 15, 65 15, 70 5 C75 25, 80 40, 75 60 C70 80, 60 90, 50 115 C40 90, 30 80, 25 60 C20 40, 25 25, 30 5 C35 15, 45 15, 50 5 Z" stroke="currentColor" strokeWidth="2" fill="none" />
                <circle cx="50" cy="45" r="16" stroke="currentColor" strokeWidth="3" fill="none" />
                <circle cx="50" cy="45" r="4" fill="currentColor" />
                <text x="50" y="105" textAnchor="middle" fontSize="11" fontWeight="bold" fill="currentColor">सत्यमेव जयते</text>
              </svg>
            </div>

            <div>
              <span className={`text-xs font-bold block ${isDarkMode ? 'text-amber-400' : 'text-rose-900'}`}>
                प्रशासनिक सुधार और लोक शिकायत विभाग
              </span>
              <h1 className={`text-sm sm:text-base font-extrabold uppercase tracking-tight ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                DEPARTMENT OF ADMINISTRATIVE REFORMS & PUBLIC GRIEVANCES
              </h1>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Government of India • Centralized Grievance Redressal & Auto-Clustering Platform (SIH 2026)
              </p>
            </div>
          </div>

          {/* NIVARAN BRAND BADGE */}
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-3 rounded-2xl border-2 border-blue-400/40 shadow-xl text-center min-w-[220px]">
              <div className="flex items-center justify-center space-x-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <span className="text-2xl font-black tracking-widest text-white font-mono drop-shadow-md">
                  NIVARAN
                </span>
              </div>
              <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider mt-0.5">
                DARPG Mandate Civic Redressal Portal
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. SUB-NAVBAR MENU (Maroon #700a2b) */}
      <div className="bg-[#700a2b] text-white px-4 sm:px-8 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between py-1.5 gap-2">
          
          {/* Main Navigation Tabs */}
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('citizen')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'citizen'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'text-slate-200 hover:bg-[#8c1039] hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Citizen Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition relative cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'text-slate-200 hover:bg-[#8c1039] hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Nodal Officer Dashboard</span>
              {breachedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping absolute top-1 right-1" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('demo')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'demo'
                  ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 shadow-md'
                  : 'text-slate-200 hover:bg-[#8c1039] hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-300" />
              <span>Batch Ingestion Demo</span>
            </button>
          </nav>

          {/* Right Action Menu (Backend status, Refresh, Language, Theme) */}
          <div className="flex items-center space-x-2.5 text-xs">
            {/* Backend Connection Status Badge */}
            <div className="flex items-center space-x-1.5 bg-[#570720] px-2.5 py-1 rounded-lg border border-[#8c1039]">
              <Server className={`w-3.5 h-3.5 ${isBackendConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="font-mono text-[11px] font-semibold text-slate-200">
                {isBackendConnected ? 'FastAPI 8000' : 'Local Mode'}
              </span>
              {onRefreshBackend && (
                <button
                  onClick={onRefreshBackend}
                  disabled={isSyncing}
                  title="Sync with FastAPI backend"
                  className="ml-1 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              )}
            </div>

            {/* Live Monitoring Badge */}
            <div className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              breachedCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-400/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
            }`}>
              {breachedCount > 0 ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
                  <span>{breachedCount} SLA Breached</span>
                </>
              ) : (
                <>
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span>SLA Active</span>
                </>
              )}
            </div>

            {/* Language Selector Dropdown */}
            <div className="flex items-center space-x-1 bg-[#570720] px-2 py-1 rounded border border-[#8c1039]">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <select className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer">
                <option value="en" className="bg-slate-900 text-white">EN</option>
                <option value="hi" className="bg-slate-900 text-white">हिंदी</option>
                <option value="hinglish" className="bg-slate-900 text-white">Hinglish</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1 rounded bg-[#570720] hover:bg-[#8c1039] text-amber-400 border border-[#8c1039] transition cursor-pointer"
              title="Toggle Dark/Light Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </div>

      {/* 4. ANNOUNCEMENT TICKER BAR (Bottom Maroon Alert Bar) */}
      <div className="bg-[#570720] text-amber-300 text-[11px] font-semibold py-1 px-4 text-center border-t border-b border-[#8c1039] overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-marquee">
          📢 IMPORTANT NOTICE: Any Grievance sent by email will not be attended to / entertained. Please lodge your civic grievance on this official NIVARAN DARPG portal for mandatory SLA tracking & AI auto-clustering.
        </div>
      </div>

    </header>
  );
};
