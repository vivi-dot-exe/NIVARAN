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
  activeTab: 'citizen' | 'admin' | 'demo';
  setActiveTab: (tab: 'citizen' | 'admin' | 'demo') => void;
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
  const isOfficerLoggedIn = Boolean(currentUser && (currentUser.role.includes('Nodal') || currentUser.role.includes('Officer') || currentUser.role.includes('Admin')));

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
            <span>{isBackendConnected ? '🟢 FastAPI Live (port 8000)' : '🟡 Client AI Triage Mode'}</span>
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
          
          {/* OFFICIAL NIVARAN BRAND BADGE (LEFT) */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#1E3A8A] text-white p-3.5 rounded-xl border-2 border-blue-400/40 shadow-md text-center min-w-[240px]">
              <div className="flex items-center justify-center space-x-2">
                <ShieldCheck className="w-6 h-6 text-amber-400" style={{ width: '24px', height: '24px' }} />
                <span className="text-2xl font-black tracking-widest text-white font-mono">
                  NIVARAN
                </span>
              </div>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mt-0.5">
                {t.centralizedSystem}
              </p>
            </div>
          </div>

          {/* Flag of India (Tiranga) & Department Title (RIGHT) */}
          <div className="flex items-center space-x-4 text-right md:text-right">
            <div>
              <span className="text-xs font-bold block text-[#7A0C38]">
                प्रशासनिक सुधार और लोक शिकायत विभाग
              </span>
              <h1 className={`text-base sm:text-lg font-extrabold uppercase tracking-tight font-heading ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {t.govTitle}
              </h1>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {t.govSub}
              </p>
            </div>

            <div className="w-14 h-10 shrink-0 rounded-lg overflow-hidden border border-slate-300/40 shadow-md flex flex-col items-stretch relative" style={{ width: '56px', height: '38px', minWidth: '56px' }}>
              {/* Saffron Band */}
              <div className="h-1/3 bg-[#FF9933] w-full" />
              {/* White Band with Ashoka Chakra */}
              <div className="h-1/3 bg-white w-full flex items-center justify-center relative">
                <svg viewBox="0 0 100 100" className="w-3.5 h-3.5 text-[#000080]" style={{ width: '13px', height: '13px' }}>
                  <circle cx="50" cy="50" r="45" stroke="#000080" strokeWidth="6" fill="none" />
                  <circle cx="50" cy="50" r="8" fill="#000080" />
                  {/* 24 Spokes of Ashoka Chakra */}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <line
                      key={i}
                      x1="50"
                      y1="50"
                      x2={50 + 45 * Math.cos((i * 15 * Math.PI) / 180)}
                      y2={50 + 45 * Math.sin((i * 15 * Math.PI) / 180)}
                      stroke="#000080"
                      strokeWidth="3"
                    />
                  ))}
                </svg>
              </div>
              {/* Green Band */}
              <div className="h-1/3 bg-[#138808] w-full" />
            </div>
          </div>

        </div>
      </div>

      {/* 3. SUB-NAVBAR MENU STRIP (Official GovTech Maroon #7A0C38) */}
      <div className="bg-[#7A0C38] text-white px-4 sm:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between py-1.5 gap-2">
          
          {/* Main Navigation Tabs */}
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('citizen')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-extrabold transition ${
                activeTab === 'citizen'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-white hover:bg-[#961247]'
              }`}
            >
              <UserCheck className="w-4 h-4" style={{ width: '16px', height: '16px' }} />
              <span>{t.citizenPortal}</span>
            </button>

            {/* ONLY RENDER NODAL DASHBOARD & BATCH DEMO IF OFFICER IS LOGGED IN */}
            {isOfficerLoggedIn ? (
              <>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-extrabold transition relative ${
                    activeTab === 'admin'
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'text-white hover:bg-[#961247]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" style={{ width: '16px', height: '16px' }} />
                  <span>{t.nodalDashboard}</span>
                  {breachedCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping absolute top-1 right-1" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('demo')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-extrabold transition ${
                    activeTab === 'demo'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-white hover:bg-[#961247]'
                  }`}
                >
                  <Layers className="w-4 h-4 text-amber-300" style={{ width: '16px', height: '16px' }} />
                  <span>{t.batchDemo}</span>
                </button>
              </>
            ) : (
              /* Officer Login Prompt Pill for Citizens */
              <button
                onClick={onOpenSignIn}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 border border-white/20 text-[11px] font-bold text-amber-200 transition cursor-pointer"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Nodal Officer Portal (Requires Officer Login)</span>
              </button>
            )}
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
                    {currentUser.role === 'SUPER_ADMIN' ? '👑 Admin' : currentUser.role === 'NODAL_OFFICER' ? '🏛️ Nodal Officer' : '👤 Citizen'}
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
