import React from 'react';
import type { Language } from '../../utils/translations';
import { TRANSLATIONS, INDIAN_OFFICIAL_LANGUAGES } from '../../utils/translations';
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
  Server,
  User,
  LogOut,
  Lock
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'citizen' | 'admin' | 'scorecard' | 'demo';
  setActiveTab: (tab: 'citizen' | 'admin' | 'scorecard' | 'demo') => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  breachedCount: number;
  isBackendConnected?: boolean;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenContactUs: () => void;
  onOpenFaqs: () => void;
  onOpenSiteMap: () => void;
  onGoHome: () => void;
  onOpenSignIn: () => void;
  onOpenRegister?: () => void;
  currentUser: { id?: string; name: string; role: string; email: string; ward?: string } | null;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  breachedCount,
  isBackendConnected = false,
  currentLanguage,
  onLanguageChange,
  onOpenContactUs,
  onOpenFaqs,
  onOpenSiteMap,
  onGoHome,
  onOpenSignIn,
  onOpenRegister,
  currentUser,
  onSignOut
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  // Officer access flag
  const isOfficerLoggedIn = Boolean(
    currentUser &&
    currentUser.role &&
    (currentUser.role.toUpperCase().includes('NODAL') ||
     currentUser.role.toUpperCase().includes('OFFICER') ||
     currentUser.role.toUpperCase().includes('ADMIN'))
  );

  return (
    <header className="w-full shadow-md transition-colors duration-200">
      
      {/* 1. TOPMOST NATIONAL BAR (Official GovTech Maroon #7A0C38) */}
      <div className="bg-[#7A0C38] text-white text-[11px] py-1.5 px-4 sm:px-8 border-b border-[#961247] flex flex-col sm:flex-row items-center justify-between font-sans">
        <div className="flex items-center space-x-3">
          <span className="font-bold tracking-wide">भारत सरकार | Government of India</span>
          <span className="text-pink-200/60">|</span>
          <span className="hidden md:inline text-pink-100 font-medium">
            कार्मिक, लोक शिकायत और पेंशन मंत्रालय | Ministry of Personnel, Public Grievances & Pensions
          </span>
        </div>

        <div className="flex items-center space-x-4 mt-1 sm:mt-0 text-pink-100">
          {/* Backend Connection Indicator */}
          <div className="flex items-center space-x-1 font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-black/30 border border-white/20">
            <Server className="w-3 h-3 text-amber-300" style={{ width: '12px', height: '12px' }} />
            <span>{isBackendConnected ? 'FastAPI Live (port 8000)' : 'Client AI Triage Mode'}</span>
          </div>

          <span>|</span>

          {/* Interactive Utility Header Buttons */}
          <button
            onClick={onGoHome}
            className="flex items-center space-x-1 hover:text-amber-300 cursor-pointer transition font-bold"
          >
            <Home className="w-3 h-3 text-amber-300" style={{ width: '12px', height: '12px' }} />
            <span>{t.home}</span>
          </button>

          <span>|</span>

          <button
            onClick={onOpenContactUs}
            className="flex items-center space-x-1 hover:text-amber-300 cursor-pointer transition font-bold"
          >
            <PhoneCall className="w-3 h-3 text-amber-300" style={{ width: '12px', height: '12px' }} />
            <span>{t.contactUs}</span>
          </button>

          <span>|</span>

          <button
            onClick={onOpenFaqs}
            className="flex items-center space-x-1 hover:text-amber-300 cursor-pointer transition font-bold"
          >
            <HelpCircle className="w-3 h-3 text-amber-300" style={{ width: '12px', height: '12px' }} />
            <span>{t.faqs}</span>
          </button>

          <span>|</span>

          <button
            onClick={onOpenSiteMap}
            className="flex items-center space-x-1 hover:text-amber-300 cursor-pointer transition font-bold"
          >
            <FileText className="w-3 h-3 text-amber-300" style={{ width: '12px', height: '12px' }} />
            <span>{t.siteMap}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN DEPARTMENT BRANDING HEADER (Crisp White / Slate Dark) */}
      <div className={`py-4 px-4 sm:px-8 border-b ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Ashoka Lion Capital Emblem & Department Title */}
          <div className="flex items-center space-x-4">
            <div className="w-14 h-16 shrink-0 flex flex-col items-center justify-center p-1 bg-amber-50/50 rounded-xl border border-amber-200/40" style={{ width: '56px', height: '64px', minWidth: '56px' }}>
              <svg 
                viewBox="0 0 100 120" 
                className="w-10 h-12 text-amber-800 fill-current" 
                style={{ width: '40px', height: '48px', minWidth: '40px', minHeight: '48px', maxWidth: '40px', maxHeight: '48px' }}
              >
                <circle cx="50" cy="30" r="18" fill="#8B1E3F" opacity="0.9" />
                <path d="M30 50 Q50 40 70 50 L65 80 Q50 75 35 80 Z" fill="#D97706" />
                <rect x="25" y="85" width="50" height="12" rx="3" fill="#1E3A8A" />
                <circle cx="50" cy="91" r="5" fill="#F59E0B" />
                <rect x="20" y="100" width="60" height="8" rx="2" fill="#8B1E3F" />
              </svg>
              <span className="text-[9px] font-black tracking-widest text-[#7A0C38] uppercase mt-0.5">सत्यमेव जयते</span>
            </div>
          </div>

          {/* Department Title & Badges (CENTER/RIGHT) */}
          <div className="flex items-center space-x-4 text-right md:text-right">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7A0C38] text-white">
                  CPGRAMS 7.0 COMPLIANT
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold hidden sm:inline">
                  CIVIC AI CORE v2.4
                </span>
              </div>
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight font-heading ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                NIVARAN • निवारण
              </h1>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t.govSub}
              </p>
            </div>
          </div>

          {/* Right Brand Badges */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="text-right border-r border-slate-700/50 pr-4">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">DARPG Civic Grid</span>
              <span className="text-xs font-extrabold text-[#7A0C38] dark:text-amber-400 font-mono">
                Jurisdiction
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">SLA Standard</span>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                15 Days
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. PRIMARY GOVTECH NAVIGATION TAB BAR (#7A0C38 Royal Maroon Bar) */}
      <div className="bg-[#7A0C38] text-white px-4 sm:px-8 border-b border-[#961247]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between py-2 gap-2">
          
          {/* Main Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto w-full md:w-auto">
            {/* CITIZEN PORTAL TAB */}
            <button
              onClick={() => setActiveTab('citizen')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'citizen'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-white hover:bg-[#961247]'
              }`}
            >
              <UserCheck className="w-4 h-4" style={{ width: '16px', height: '16px' }} />
              <span>{t.citizenPortal}</span>
            </button>

            {/* PUBLIC WALL OF GOVERNANCE TAB */}
            <button
              onClick={() => setActiveTab('scorecard')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'scorecard'
                  ? 'bg-emerald-400 text-slate-950 shadow-md'
                  : 'text-white hover:bg-[#961247]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-cyan-300" style={{ width: '16px', height: '16px' }} />
              <span>Wall of Governance</span>
            </button>

            {/* NODAL OFFICER DASHBOARD TAB */}
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-extrabold transition relative cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-white hover:bg-[#961247]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" style={{ width: '16px', height: '16px' }} />
              <span>{t.nodalDashboard}</span>
              {isOfficerLoggedIn && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-700 text-white font-bold ml-1">
                  Active
                </span>
              )}
              {breachedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping absolute top-1 right-1" />
              )}
            </button>

            {/* BATCH DEMO TAB */}
            <button
              onClick={() => setActiveTab('demo')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'demo'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-white hover:bg-[#961247]'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-300" style={{ width: '16px', height: '16px' }} />
              <span>{t.batchDemo}</span>
            </button>
          </nav>

          {/* Right Action Menu (Language selector, Theme Toggle Button, Sign in / Profile) */}
          <div className="flex items-center space-x-3 text-xs">
            {/* Live Monitoring Badge */}
            <div className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              breachedCount > 0 ? 'bg-rose-500/20 text-rose-200 border-rose-400/40' : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
            }`}>
              {breachedCount > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-300 animate-pulse" style={{ width: '14px', height: '14px' }} />
                  <span>{breachedCount} SLA Breached</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-emerald-300" style={{ width: '14px', height: '14px' }} />
                  <span>SLA Active Monitor</span>
                </>
              )}
            </div>

            {/* Real-time Language Selector Dropdown (All Official Languages of India) */}
            <div className="flex items-center space-x-1 bg-[#5C082A] px-2 py-1 rounded border border-[#961247]">
              <Globe className="w-3.5 h-3.5 text-amber-300" style={{ width: '14px', height: '14px' }} />
              <select
                value={currentLanguage}
                onChange={(e) => onLanguageChange(e.target.value as Language)}
                className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer max-w-[140px] sm:max-w-none"
              >
                {INDIAN_OFFICIAL_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Explicit Theme Mode Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="px-2.5 py-1 rounded bg-[#5C082A] hover:bg-[#961247] border border-[#961247] transition flex items-center space-x-1.5 font-bold text-xs"
              title="Switch Theme Mode"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-300" style={{ width: '14px', height: '14px' }} />
                  <span className="text-amber-200">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-300" style={{ width: '14px', height: '14px' }} />
                  <span className="text-amber-200">Dark Mode</span>
                </>
              )}
            </button>

            {/* Official Sign In / Profile Pill */}
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-[#5C082A] px-3 py-1 rounded border border-amber-400/50 text-amber-300">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <div className="flex flex-col text-left">
                  <span className="font-extrabold text-xs truncate max-w-[130px]">{currentUser.name}</span>
                  <span className="text-[9px] font-mono text-amber-200">
                    {currentUser.role === 'SUPER_ADMIN' ? 'Admin' : currentUser.role === 'NODAL_OFFICER' ? 'Nodal Officer' : 'Citizen'}
                  </span>
                </div>
                <button
                  onClick={onSignOut}
                  className="p-1 rounded hover:bg-black/30 text-rose-300 transition ml-1"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                {onOpenRegister && (
                  <button
                    onClick={onOpenRegister}
                    className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-sm"
                  >
                    Log In
                  </button>
                )}
                <button
                  onClick={onOpenSignIn}
                  className="px-2.5 py-1 rounded bg-[#5C082A] hover:bg-[#961247] border border-amber-400/40 text-amber-300 font-extrabold text-xs transition flex items-center space-x-1"
                >
                  <Lock className="w-3 h-3 text-amber-300" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 4. ANNOUNCEMENT TICKER BAR (Bottom Maroon Alert Bar) */}
      <div className="bg-[#5C082A] text-amber-300 text-[11px] font-semibold py-1.5 px-4 text-center border-t border-b border-[#961247]">
        {t.importantNotice}
      </div>

    </header>
  );
};
