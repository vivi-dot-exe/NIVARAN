import React from 'react';
import { X, FileText, ChevronRight, Layers, LayoutDashboard, UserCheck, Server, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SiteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onNavigateTab: (tab: 'citizen' | 'admin' | 'demo') => void;
}

export const SiteMapModal: React.FC<SiteMapModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onNavigateTab
}) => {
  if (!isOpen) return null;

  const siteMapTree = [
    {
      category: '1. Citizen Portal Module',
      tabKey: 'citizen' as const,
      icon: UserCheck,
      color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
      links: [
        'Lodge Grievance (NIVARAN AI Voice & Text Triage)',
        'Samadhan Didi Multilingual Voice Utility Assistant',
        'Real-time Department & Severity Auto-Categorization',
        'Ward Duplicate Cluster Alert & 1-Click Upvoting',
        'Grievance Stepper & Live 24-Hour SLA Countdown Tracker'
      ]
    },
    {
      category: '2. Nodal Officer Dashboard Module',
      tabKey: 'admin' as const,
      icon: LayoutDashboard,
      color: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
      links: [
        'KPI Metric Cards (Total, Pending, Resolution %, SLA Breached Alerts)',
        '2D BERTopic AI Embeddings Vector Scatter Map',
        'Leaflet.js GeoJSON Ward Density Spatial Heatmap',
        'Comprehensive Grievance Master Data Registry Table',
        '1-Click Nodal Action Drawer Console & Escalation Trail'
      ]
    },
    {
      category: '3. Batch Ingestion & Emergency Demo',
      tabKey: 'demo' as const,
      icon: Layers,
      color: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
      links: [
        'Emergency Surge Simulator (200+ Realistic Complaints)',
        'Drag-and-Drop .CSV / .XLSX Dataset File Ingestion Uploader',
        'HDBSCAN Hotspot Auto-Detection & Bulk Dispatch Console'
      ]
    },
    {
      category: '4. FastAPI & ML Microservice Backend',
      tabKey: null,
      icon: Server,
      color: 'bg-[#7A0C38]/10 border-[#7A0C38]/30 text-[#7A0C38]',
      links: [
        'POST /api/tickets: Automatic ML triage ticket creation',
        'GET /api/tickets: Synchronized SQLite database querying',
        'PATCH /api/tickets/{id}: Status update and dispatch tracking',
        'POST /api/analyze: Zero-shot sentence-transformer classification',
        'POST /api/upload-file: Batch spreadsheet parser'
      ]
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          {/* Header Bar */}
          <div className="bg-[#7A0C38] text-white p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold uppercase tracking-wide font-heading">
                  Interactive Site Map • NIVARAN DARPG
                </h3>
                <p className="text-xs text-amber-200">
                  Complete Architecture & Module Navigation Tree
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto font-sans">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {siteMapTree.map((section, idx) => {
                const IconComp = section.icon;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border space-y-3 ${
                      isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`p-2 rounded-lg border ${section.color}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <h4 className={`font-extrabold text-xs uppercase tracking-wider ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {section.category}
                        </h4>
                      </div>

                      {section.tabKey && (
                        <button
                          onClick={() => {
                            onNavigateTab(section.tabKey!);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded bg-[#7A0C38] text-white font-extrabold text-[10px] hover:bg-[#961247] transition shadow-sm flex items-center space-x-1"
                        >
                          <span>Open</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
                      {section.links.map((link, lIdx) => (
                        <li key={lIdx} className="flex items-start space-x-1.5">
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                          <span>{link}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Footer Close Button */}
          <div className={`p-4 border-t flex justify-end ${
            isDarkMode ? 'border-slate-800 bg-slate-955' : 'border-slate-200 bg-slate-50'
          }`}>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#7A0C38] hover:bg-[#961247] text-white font-extrabold text-xs transition shadow-md"
            >
              Close Site Map
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
