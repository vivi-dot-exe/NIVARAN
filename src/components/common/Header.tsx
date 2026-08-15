import React from 'react';
import type { Language } from '../../utils/translations';
import { TRANSLATIONS } from '../../utils/translations';
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
  Server
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
  onGoHome
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

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
          
          {/* Ashoka Lion Capital Emblem & Department Title */}
          <div className="flex items-center space-x-4">
            <div className="w-14 h-16 shrink-0 flex flex-col items-center justify-center p-1 bg-amber-50/50 rounded-xl border border-amber-200/40" style={{ width: '56px', height: '64px', minWidth: '56px' }}>
              <svg 
                viewBox="0 0 100 120" 
                className="w-10 h-12 text-amber-800 fill-current" 
                style={{ width: '40px', height: '48px', minWidth: '40px', minHeight: '48px', maxWidth: '40px', maxHeight: '48px' }}
              >
                <path d="M50 5 C55 15, 65 15, 70 5 C75 25, 80 40, 75 60 C70 80, 60 90, 50 115 C40 90, 30 80, 25 60 C20 40, 25 25, 30 5 C35 15, 45 15, 50 5 Z" stroke="currentColor" strokeWidth="2.5" fill="none" />
                <circle cx="50" cy="45" r="16" stroke="currentColor" strokeWidth="3" fill="none" />
                <circle cx="50" cy="45" r="4" fill="currentColor" />
                <path d="M 50 29 L 50 61 M 34 45 L 66 45 M 39 34 L 61 56 M 39 56 L 61 34" stroke="currentColor" strokeWidth="1.5" />
                <text x="50" y="108" textAnchor="middle" fontSize="10" fontWeight="extrabold" fill="#7A0C38">सत्यमेव जयते</text>
              </svg>
            </div>

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
          </div>

          {/* OFFICIAL NIVARAN BRAND BADGE */}
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
          </nav>

          {/* Right Action Menu (Language selector, Theme Toggle Button, Sign in) */}
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

            {/* Real-time Language Selector Dropdown */}
            <div className="flex items-center space-x-1 bg-[#5C082A] px-2.5 py-1 rounded border border-[#961247]">
              <Globe className="w-3.5 h-3.5 text-amber-300" style={{ width: '14px', height: '14px' }} />
              <select
                value={currentLanguage}
                onChange={(e) => onLanguageChange(e.target.value as Language)}
                className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
              >
                <option value="en" className="bg-slate-900 text-white">Language: English</option>
                <option value="hi" className="bg-slate-900 text-white">भाषा: हिंदी</option>
                <option value="hinglish" className="bg-slate-900 text-white">Language: Hinglish</option>
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

            {/* Official Sign In Button (Amber Yellow) */}
            <button className="px-4 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition shadow-sm flex items-center space-x-1">
              <span>{t.signIn}</span>
              <span>&rarr;</span>
            </button>
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
