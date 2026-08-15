import React, { useState } from 'react';
import { X, HelpCircle, ChevronDown, Sparkles, ShieldCheck, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FaqsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const FaqsModal: React.FC<FaqsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'How does the NIVARAN AI Triage Engine categorize my civic grievance?',
      a: 'NIVARAN uses a lightweight SentenceTransformer model (all-MiniLM-L6-v2) that vectorizes your complaint text in real-time. It measures cosine similarity against canonical department anchor definitions to assign the complaint to Water Supply, Roads & Infra, Sanitation & Waste, Electricity, or Public Distribution automatically.'
    },
    {
      q: 'What happens if my complaint is a duplicate of an existing issue in my ward?',
      a: 'The system checks semantic vector proximity against existing open tickets in your municipal ward. If a duplicate is found (e.g. water pipeline burst or garbage dump), NIVARAN alerts you immediately and lets you 1-click Upvote the existing master ticket. This merges urgency scores without duplicating field repair work.'
    },
    {
      q: 'How is the Composite Priority Score (0-100) calculated?',
      a: 'Priority score combines 3 dynamic criteria: Severity (technical risk), Urgency (time-sensitivity & danger), and Affected Scope (number of citizens/household impact). Complaints scoring >= 85 are tagged Critical with automatic escalation.'
    },
    {
      q: 'What is the mandatory SLA resolution window under DARPG guidelines?',
      a: 'Under DARPG mandate, civic grievances carry a strict 24-hour SLA window. Critical complaints (scores >= 85) trigger a crimson warning pulse on the Nodal Officer Dashboard and auto-escalate if unassigned within 4 hours.'
    },
    {
      q: 'Can I lodge grievances in regional Indian languages?',
      a: 'Yes! The NIVARAN Samadhan Didi voice utility assistant supports 22 Indian languages, Devanagari Hindi, and Hinglish. Voice input is transcribed and vectorized automatically.'
    },
    {
      q: 'What is BERTopic dynamic auto-clustering and how does it help Nodal Officers?',
      a: 'BERTopic runs HDBSCAN clustering over batches of grievances to detect emerging local hotspots (e.g., sudden monsoon road cave-ins or transformer failures). Officers can trigger bulk emergency dispatches with 1 click.'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          {/* Header Bar */}
          <div className="bg-[#7A0C38] text-white p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold uppercase tracking-wide font-heading">
                  FAQs & Help Desk • NIVARAN DARPG
                </h3>
                <p className="text-xs text-amber-200">
                  Frequently Asked Questions & Platform Guidelines
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
          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto font-sans">
            
            {/* Quick Badges */}
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>AI Vector Triage</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>DARPG Guidelines</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>24h SLA Guarantee</span>
              </span>
            </div>

            {/* Accordion FAQ List */}
            <div className="space-y-3 pt-2">
              {faqs.map((item, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border transition overflow-hidden ${
                      isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : idx)}
                      className="w-full p-4 text-left font-extrabold text-xs sm:text-sm flex items-center justify-between space-x-3 cursor-pointer"
                    >
                      <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{item.q}</span>
                      <ChevronDown className={`w-4 h-4 text-[#7A0C38] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`} />
                    </button>

                    {isOpen && (
                      <div className={`p-4 border-t text-xs leading-relaxed font-medium ${
                        isDarkMode ? 'border-slate-700/80 bg-slate-950/60 text-slate-300' : 'border-slate-200 bg-white text-slate-700'
                      }`}>
                        {item.a}
                      </div>
                    )}
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
              Close Help Desk
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
