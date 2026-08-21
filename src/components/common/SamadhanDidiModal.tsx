import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Mic, MicOff, User, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { performAiTriage } from '../../utils/aiTriageEngine';
import type { Language } from '../../utils/translations';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  actionPayload?: {
    text: string;
    ward: string;
    category?: string;
  };
}

interface SamadhanDidiModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  currentLanguage?: Language;
  onAutoSubmitGrievance?: (text: string, ward: string) => void;
}

export const SamadhanDidiModal: React.FC<SamadhanDidiModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onAutoSubmitGrievance
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: 'Namaste! 🙏 I am Samadhan Didi (समाधान दीदी), your NIVARAN AI Assistant. Tell me what issue you are facing in your area, and I will route it directly to the responsible authority!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputMessage.trim();
    if (!query) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');

    // Simulate AI Assistant Processing
    setTimeout(() => {
      let botResponseText = '';
      let actionPayload: Message['actionPayload'] = undefined;

      const lower = query.toLowerCase();

      if (lower.includes('track') || lower.includes('status') || /g-\d+/i.test(query)) {
        botResponseText = '🔍 I checked NIVARAN database! Complaint G-1001 is currently In Progress with Municipal Roads Department (Ward 4). Nodal Officer Er. Rajesh Sharma has dispatched a repair crew.';
      } else if (lower.length > 5) {
        const triage = performAiTriage(query, 'Ward 4 - Andheri West');
        const plan = triage.resolution_plan;

        if (plan && plan.is_multi_agency && plan.sub_issues.length > 1) {
          const deptsList = plan.sub_issues
            .map((sub, i) => `${i + 1}️⃣ ${sub.category === 'Water Supply' ? '💧' : sub.category === 'Roads & Infra' ? '🛣️' : sub.category === 'Electricity' ? '⚡' : '🏛️'} ${sub.responsible_department} (${sub.responsible_authority})\n   • Action: ${sub.title}`)
            .join('\n\n');

          botResponseText = `Got it! I analyzed your grievance:

📌 Problem: ${plan.primary_issue_title}
⚡ Multi-Department Coordinated Action Plan (${plan.sub_issues.length} Departments Involved):

${deptsList}

Would you like me to lodge this multi-agency grievance into NIVARAN now?`;
        } else {
          const assignedOff = triage.routing?.assigned_officer || 'Ward Nodal Officer';
          botResponseText = `Got it! I analyzed your grievance:

📌 Problem: ${triage.topic}
🏛️ Department: ${triage.department} (${triage.routing?.authority || 'Municipal Authority'})
👤 Assigned Nodal Officer: ${assignedOff}

Would you like me to lodge this grievance into NIVARAN now?`;
        }

        actionPayload = {
          text: query,
          ward: 'Ward 4 - Andheri West',
          category: triage.department
        };
      } else {
        botResponseText = 'Please describe the problem you are facing (e.g. pothole on main road, water pipeline leak, broken streetlight, or garbage overflow).';
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionPayload
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 800);
  };

  const handleMicVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const voiceText = 'There is a large water pipeline burst near Lokhandwala Market in Ward 4, water is flooding the street.';
      setInputMessage(voiceText);
    }, 2000);
  };

  const handleConfirmSubmit = (payload: Message['actionPayload']) => {
    if (!payload) return;
    if (onAutoSubmitGrievance) {
      onAutoSubmitGrievance(payload.text, payload.ward);
    }
    const confirmMsg: Message = {
      id: `sys-${Date.now()}`,
      sender: 'bot',
      text: '✅ Grievance successfully lodged into NIVARAN! It has been assigned to Ward 4 Nodal Officer.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, confirmMsg]);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-955/85 backdrop-blur-md font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col h-[85vh] ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          {/* Header Bar */}
          <div className="bg-[#7A0C38] text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-xl">
                🙏
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide">
                    SAMADHAN DIDI (समाधान दीदी)
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-400 text-slate-950">
                    AI CHATBOT
                  </span>
                </div>
                <p className="text-[11px] text-amber-200">
                  Real-time Public Grievance Assistant
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 ${
                  msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#7A0C38] text-amber-300'
                }`}>
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : '🙏'}
                </div>

                <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-2 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : (isDarkMode ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none' : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-none')
                }`}>
                  <p className="whitespace-pre-line font-medium">{msg.text}</p>

                  {/* Action Button if Bot generated an actionable payload */}
                  {msg.actionPayload && (
                    <button
                      onClick={() => handleConfirmSubmit(msg.actionPayload)}
                      className="mt-2 w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-1.5 shadow"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit Grievance to NIVARAN</span>
                    </button>
                  )}

                  <span className="block text-[9px] opacity-60 text-right font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          <div className="px-4 py-2 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto text-[11px]">
            <span className="text-slate-400 font-bold shrink-0">Quick Ask:</span>
            <button
              onClick={() => handleSendMessage('Water pipeline leak under main road in Ward 4')}
              className="px-2.5 py-1 rounded-lg bg-blue-950 border border-blue-500/30 text-blue-200 whitespace-nowrap hover:bg-blue-900 transition"
            >
              🚰 Water Pipe Burst
            </button>
            <button
              onClick={() => handleSendMessage('Potholes causing traffic jams on Andheri West main road')}
              className="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-500/30 text-amber-200 whitespace-nowrap hover:bg-amber-900 transition"
            >
              🛣️ Road Damage
            </button>
            <button
              onClick={() => handleSendMessage('Track status of my complaint G-1001')}
              className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/30 text-emerald-200 whitespace-nowrap hover:bg-emerald-900 transition"
            >
              🔍 Track G-1001
            </button>
          </div>

          {/* Input Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-955 flex items-center space-x-2">
            <button
              onClick={handleMicVoiceInput}
              className={`p-2.5 rounded-xl border transition ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse border-rose-400'
                  : 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
              }`}
              title={isListening ? 'Listening...' : 'Voice Input'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isListening ? 'Listening to your voice...' : 'Type your grievance in English, Hindi, Marathi...'}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />

            <button
              onClick={() => handleSendMessage()}
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
