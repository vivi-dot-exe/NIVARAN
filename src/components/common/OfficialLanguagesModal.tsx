import React from 'react';
import { INDIAN_OFFICIAL_LANGUAGES } from '../../utils/translations';
import type { Language } from '../../utils/translations';
import { Globe, ExternalLink, X, CheckCircle, Languages, Sparkles } from 'lucide-react';

interface OfficialLanguagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  currentLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
}

export const OfficialLanguagesModal: React.FC<OfficialLanguagesModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  currentLanguage,
  onSelectLanguage
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden transition-all my-8 ${
        isDarkMode ? 'bg-slate-900 border-amber-500/30 text-white' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        
        {/* Header Strip */}
        <div className="bg-[#7A0C38] text-white p-5 border-b border-[#961247] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-400/20 rounded-xl border border-amber-300/40 text-amber-300">
              <Languages className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-300 bg-black/30 px-2 py-0.5 rounded border border-amber-400/30">
                  8th Schedule of Constitution of India
                </span>
                <span className="text-[10px] text-pink-200">Article 344(1) & 351</span>
              </div>
              <h2 className="text-lg font-black tracking-wide uppercase font-heading mt-1">
                22 Official Languages of India Directory
              </h2>
              <p className="text-xs text-pink-100">
                Centralized DARPG Multilingual Accessibility • Direct Wikipedia & Regional Resources
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white transition cursor-pointer"
            title="Close Directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Info Banner */}
        <div className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 text-xs ${
          isDarkMode ? 'bg-slate-955 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-amber-400" />
            <span className="font-bold">
              22 Scheduled Languages + English Link Language Supported for Voice & Text Grievances
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-500 border border-amber-400/30 font-bold">
              Total Speakers: ~1.2 Billion
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold">
              AI BERT Multi-script Tokenization
            </span>
          </div>
        </div>

        {/* Grid of Languages */}
        <div className="p-6 max-h-[70vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INDIAN_OFFICIAL_LANGUAGES.map((lang) => {
            const isSelected = currentLanguage === lang.code;

            return (
              <div
                key={lang.code}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative group ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                    : isDarkMode
                    ? 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div>
                  {/* Top Header line */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={lang.wikiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-extrabold text-base text-amber-400 hover:underline flex items-center space-x-1"
                          title={`Open Wikipedia page for ${lang.name}`}
                        >
                          <span>{lang.name}</span>
                          <ExternalLink className="w-3 h-3 text-amber-300 opacity-70 group-hover:opacity-100" />
                        </a>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {lang.code.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-300 mt-0.5 font-sans">
                        {lang.nativeName}
                      </p>
                    </div>

                    {isSelected ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectLanguage(lang.code);
                        }}
                        className="text-[11px] font-bold px-2.5 py-1 rounded bg-[#7A0C38] hover:bg-[#961247] text-white transition shadow-sm cursor-pointer"
                      >
                        Set Active
                      </button>
                    )}
                  </div>

                  {/* Metadata fields */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Native Speakers:</span>
                      <span className="font-mono font-extrabold text-slate-200">{lang.speakersMillion} Million</span>
                    </div>

                    <div className="flex items-start justify-between text-slate-400 gap-2">
                      <span>Official Region:</span>
                      {lang.regionWikiUrl ? (
                        <a
                          href={lang.regionWikiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-right text-blue-400 hover:underline flex items-center space-x-0.5 shrink truncate max-w-[170px]"
                        >
                          <span className="truncate">{lang.officialRegion}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ) : (
                        <span className="font-semibold text-right text-slate-300 max-w-[170px]">{lang.officialRegion}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Script System:</span>
                      {lang.scriptWikiUrl ? (
                        <a
                          href={lang.scriptWikiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-400 hover:underline flex items-center space-x-0.5"
                        >
                          <span>{lang.script}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="font-semibold text-slate-300">{lang.script}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Scheduled Year:</span>
                      <span className="font-mono font-bold text-amber-300">{lang.yearAdded}</span>
                    </div>
                  </div>
                </div>

                {/* Footer link to Wikipedia */}
                <div className="mt-4 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <a
                    href={lang.wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1"
                  >
                    <span>Read on Wikipedia</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Article 344
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
        }`}>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>NIVARAN DARPG Multi-lingual AI Engine vectorizes grievances in all 22 official scripts.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Close Directory
          </button>
        </div>

      </div>
    </div>
  );
};
