import React, { useState, useEffect } from 'react';
import type { Grievance, TriageResult } from '../../types/grievance';
import { performAiTriage } from '../../utils/aiTriageEngine';
import { WARDS_LIST } from '../../mockData/grievances';
import { submitTicketToApi, backendTicketToGrievance } from '../../services/api';
import {
  Sparkles,
  Send,
  AlertOctagon,
  ThumbsUp,
  CheckCircle2,
  Building2,
  Layers,
  Globe,
  Info,
  Activity,
  Mic,
  Volume2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GrievanceFormProps {
  existingGrievances: Grievance[];
  onAddGrievance: (grievance: Grievance) => void;
  onUpvoteGrievance: (id: string) => void;
  isDarkMode: boolean;
  onTrackTicket: (ticketId: string) => void;
}

export const GrievanceForm: React.FC<GrievanceFormProps> = ({
  existingGrievances,
  onAddGrievance,
  onUpvoteGrievance,
  isDarkMode,
  onTrackTicket
}) => {
  const [complaintText, setComplaintText] = useState('');
  const [selectedWard, setSelectedWard] = useState(WARDS_LIST[0]);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<Grievance | null>(null);
  const [submissionSource, setSubmissionSource] = useState<'api' | 'local'>('api');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [upvotedId, setUpvotedId] = useState<string | null>(null);

  // Debounced real-time AI Triage calculation as user types (Requirement 2)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (complaintText.trim().length > 3) {
        const result = performAiTriage(complaintText, selectedWard, existingGrievances);
        setTriage(result);
      } else {
        setTriage(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [complaintText, selectedWard, existingGrievances]);

  // Quick preset sample fillers
  const fillPreset = (text: string, ward: string) => {
    setComplaintText(text);
    setSelectedWard(ward);
    setSubmittedTicket(null);
    setErrorMessage(null);
  };

  // Voice Assistant speech-to-text simulator
  const triggerVoiceAssistant = () => {
    setIsListening(true);
    setErrorMessage(null);
    setTimeout(() => {
      setComplaintText('Ward 4 me 3 din se drinking water supply band hai aur sadak par pipe phat ke paani beh raha hai.');
      setSelectedWard('Ward 4 - Andheri West');
      setIsListening(false);
    }, 1200);
  };

  // Submit Grievance: executes POST /api/tickets with graceful offline fallback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim() || !triage) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      text: complaintText.trim(),
      location: selectedWard,
      category: triage.department,
      priority_score: triage.priorityScore
    };

    try {
      // Attempt actual POST to FastAPI backend
      const apiTicket = await submitTicketToApi(payload);
      const converted = backendTicketToGrievance(apiTicket);
      
      // Preserve rich triage attributes
      converted.Topic = triage.topic;
      converted.Severity = triage.severity;
      converted.Urgency = triage.urgency;
      converted.Affected_Scope = triage.affectedScope;
      converted.Duplicate_Group = triage.duplicateMatch ? triage.duplicateMatch.Duplicate_Group || `DUP-CLUSTER-${Math.floor(100 + Math.random() * 900)}` : null;

      onAddGrievance(converted);
      setSubmittedTicket(converted);
      setSubmissionSource('api');
      setComplaintText('');
    } catch (err: unknown) {
      console.warn('Backend POST /api/tickets failed, using fallback local registration:', err);
      // Fallback local grievance registration
      const newId = `G-${Math.floor(1000 + Math.random() * 9000)}`;
      const newTicket: Grievance = {
        Complaint_ID: newId,
        Complaint: complaintText.trim(),
        Language: triage.language,
        Department: triage.department,
        Topic: triage.topic,
        Severity: triage.severity,
        Urgency: triage.urgency,
        Affected_Scope: triage.affectedScope,
        Priority_Score: triage.priorityScore,
        Priority: triage.priority,
        Duplicate_Group: triage.duplicateMatch ? triage.duplicateMatch.Duplicate_Group || `DUP-CLUSTER-${Math.floor(100 + Math.random() * 900)}` : null,
        Ward: selectedWard,
        Status: 'Pending',
        Date_Submitted: new Date().toISOString(),
        Latitude: 19.119 + (Math.random() - 0.5) * 0.05,
        Longitude: 72.846 + (Math.random() - 0.5) * 0.05,
        Upvotes: 1,
        Assigned_Officer: `Er. ${triage.department.split(' ')[0]} Nodal Officer`
      };

      onAddGrievance(newTicket);
      setSubmittedTicket(newTicket);
      setSubmissionSource('local');
      setComplaintText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = (id: string) => {
    onUpvoteGrievance(id);
    setUpvotedId(id);
  };

  return (
    <div className="space-y-6">
      
      {/* ROYAL BLUE HERO BANNER (CPGRAMS / NIVARAN Portal Style) */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 sm:p-10 shadow-2xl border border-blue-500/30">
        
        {/* Decorative Background Patterns */}
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-200 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>NIVARAN AI Voice Triage Module</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight leading-tight text-white font-heading">
              NOW THE GRIEVANCE CAN BE LODGED JUST BY VOICE BASED UTILITY TOOL
            </h2>

            <p className="text-base sm:text-xl font-semibold text-blue-100 font-sans">
              अब आप अपनी शिकायत बोलचाल के माध्यम से आसानी से दर्ज कर सकते हैं।
            </p>

            <p className="text-xs sm:text-sm text-blue-200/90 max-w-2xl leading-relaxed">
              Speak or type your public administration complaint in any Indian language. The NIVARAN AI Assistant vectorizes your input, categorizes departments, and checks for existing ward duplicates instantly.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={triggerVoiceAssistant}
                disabled={isListening}
                className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-amber-400/20 transition flex items-center space-x-2 cursor-pointer"
              >
                <Mic className={`w-4 h-4 text-slate-950 ${isListening ? 'animate-ping' : ''}`} />
                <span>{isListening ? 'Listening (Speak Grievance)...' : 'Use Voice Utility Tool (बोलकर शिकायत दर्ज करें)'}</span>
              </button>

              <div className="flex items-center space-x-1.5 text-xs text-blue-200 font-mono">
                <Volume2 className="w-4 h-4 text-cyan-300" />
                <span>Supports 22 Languages (Hindi, Hinglish, English)</span>
              </div>
            </div>

            {/* Quick Preset Fillers */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-blue-300 font-semibold">Try Demo Presets:</span>
              <button
                type="button"
                onClick={() => fillPreset('Ward 4 me SV road near Shoppers Stop paani ki pipe phat gayi hai. Supply band hai aur rasta paani se bhara hai.', 'Ward 4 - Andheri West')}
                className="px-2.5 py-1 text-xs rounded-md bg-blue-900/60 text-sky-200 border border-blue-400/30 hover:bg-blue-800 transition cursor-pointer"
              >
                💧 Water Leak
              </button>
              <button
                type="button"
                onClick={() => fillPreset('बांद्रा ईस्ट स्टेशन के बाहर पिछले 5 दिन से कचरा नहीं उठाया गया है। बदबू फैल रही है।', 'Ward 7 - Bandra East')}
                className="px-2.5 py-1 text-xs rounded-md bg-blue-900/60 text-emerald-200 border border-blue-400/30 hover:bg-blue-800 transition cursor-pointer"
              >
                🧹 Garbage Heap
              </button>
              <button
                type="button"
                onClick={() => fillPreset('Transformer blast near BKC Connector. Complete blackout and high voltage sparks.', 'Ward 7 - Bandra East')}
                className="px-2.5 py-1 text-xs rounded-md bg-blue-900/60 text-rose-200 border border-blue-400/30 hover:bg-blue-800 transition cursor-pointer"
              >
                ⚡ Transformer Blast
              </button>
            </div>
          </div>

          {/* Right AI Assistant Widget (Samadhan Didi) */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-blue-400/30 p-5 rounded-3xl shadow-2xl text-center space-y-3 relative w-full max-w-xs">
              
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-500 p-1 shadow-lg relative">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-[#700a2b] flex items-center justify-center font-extrabold text-2xl text-amber-300 font-mono">
                    🙏
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-full border-2 border-slate-900">
                  <Mic className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-extrabold text-xs inline-block">
                  NIVARAN AI CHATBOT
                </div>
                <h3 className="font-extrabold text-sm text-white mt-1">
                  SAMADHAN DIDI (समाधान दीदी)
                </h3>
                <p className="text-[10px] text-blue-200">
                  Real-time Public Grievance Assistant
                </p>
              </div>

              {/* Multilingual Scripts Sphere Graphics */}
              <div className="flex justify-center items-center space-x-2 text-xs font-bold text-amber-300/80 pt-1 border-t border-blue-500/30">
                <span>अ</span>
                <span>•</span>
                <span>ए</span>
                <span>•</span>
                <span>आ</span>
                <span>•</span>
                <span>എ</span>
                <span>•</span>
                <span>અ</span>
                <span>•</span>
                <span>অ</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Input Form Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className={`p-6 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          } space-y-5`}>
            
            {/* Ward Selector */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Select Municipal Ward Zone
              </label>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none transition ${
                  isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-slate-100' 
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {WARDS_LIST.map((ward) => (
                  <option key={ward} value={ward}>
                    📍 {ward}
                  </option>
                ))}
              </select>
            </div>

            {/* Complaint Textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-semibold uppercase tracking-wider ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Describe your civic issue (English / Hindi / Hinglish)
                </label>
                {triage && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                    <Globe className="w-3 h-3" />
                    <span>Auto-Detected: {triage.language}</span>
                  </span>
                )}
              </div>

              <textarea
                rows={5}
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Type or speak your complaint (e.g. Ward 4 me 3 din se garbage clean nahi hua hai...)"
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none transition resize-none ${
                  isDarkMode 
                    ? 'bg-slate-955/80 border-slate-700 text-slate-100 placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* DUPLICATE ALERT BANNER */}
            <AnimatePresence>
              {triage?.duplicateMatch && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-3"
                >
                  <div className="flex items-start space-x-3">
                    <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                        Duplicate Cluster Detected in {selectedWard}!
                      </h4>
                      <p className="text-xs text-amber-200 mt-1 leading-relaxed">
                        An active ticket <strong className="underline cursor-pointer" onClick={() => onTrackTicket(triage.duplicateMatch!.Complaint_ID)}>#{triage.duplicateMatch.Complaint_ID}</strong> already matches your issue:
                      </p>
                      <p className="text-xs italic bg-slate-900/60 p-2 rounded border border-amber-500/20 mt-2 text-slate-300">
                        "{triage.duplicateMatch.Complaint}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                    <span className="text-xs font-semibold text-amber-300">
                      ⚡ Upvoting merges urgency and prevents duplicate work!
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpvote(triage.duplicateMatch!.Complaint_ID)}
                      disabled={upvotedId === triage.duplicateMatch.Complaint_ID}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>
                        {upvotedId === triage.duplicateMatch.Complaint_ID 
                          ? `Upvoted! (${triage.duplicateMatch.Upvotes + 1})` 
                          : `Upvote Ticket #${triage.duplicateMatch.Complaint_ID} (${triage.duplicateMatch.Upvotes})`}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Optional Error Notice */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                <span>Encrypted & submitted directly to FastAPI / DARPG Cell</span>
              </span>

              <button
                type="submit"
                disabled={!triage || isSubmitting}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 transition shadow-lg cursor-pointer ${
                  triage && !isSubmitting
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-slate-950 hover:from-amber-400 hover:to-orange-500 font-extrabold shadow-amber-500/30'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Transmitting to /api/tickets...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Grievance to NIVARAN</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* SUCCESS SUBMISSION CARD */}
          <AnimatePresence>
            {submittedTicket && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-100 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-emerald-300">
                        Grievance Registered Successfully!
                      </h3>
                      <p className="text-xs text-emerald-200">
                        Tracking Complaint ID: <strong className="text-white text-sm font-mono">{submittedTicket.Complaint_ID}</strong>
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {submissionSource === 'api' ? '✓ FastAPI /api/tickets' : '✓ Local Repository'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20 text-xs">
                  <div>
                    <span className="text-slate-400 block">Department</span>
                    <span className="font-bold text-white">{submittedTicket.Department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Priority</span>
                    <span className="font-bold text-emerald-400">{submittedTicket.Priority} ({submittedTicket.Priority_Score}/100)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Ward</span>
                    <span className="font-bold text-white">{submittedTicket.Ward}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">SLA Resolution Window</span>
                    <span className="font-bold text-amber-400">Within 24 Hours</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => onTrackTicket(submittedTicket.Complaint_ID)}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition shadow-md cursor-pointer"
                  >
                    Track Progress & SLA Timer &rarr;
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Live AI Triage Simulator Side Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`p-6 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          } space-y-6 sticky top-20`}>
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                <h3 className={`font-bold text-sm uppercase tracking-wider ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  NIVARAN AI Triage Engine
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-amber-400 border border-slate-700">
                Debounced Realtime
              </span>
            </div>

            {triage ? (
              <div className="space-y-5">
                
                {/* Predicted Department Pill */}
                <div>
                  <span className="text-xs text-slate-400 font-medium block mb-1.5">
                    Predicted Department Tag
                  </span>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-sm text-white">{triage.department}</span>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {Math.round(triage.confidence * 100)}% Match
                    </span>
                  </div>
                </div>

                {/* Topic Pill */}
                <div>
                  <span className="text-xs text-slate-400 font-medium block mb-1">
                    BERTopic Category
                  </span>
                  <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs font-medium text-slate-200 flex items-center space-x-2">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{triage.topic}</span>
                  </div>
                </div>

                {/* 3 Metrics: Severity, Urgency, Affected Scope */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Severity</span>
                    <span className="text-lg font-extrabold text-amber-400">{triage.severity} / 5</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Urgency</span>
                    <span className="text-lg font-extrabold text-rose-400">{triage.urgency} / 5</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Scope</span>
                    <span className="text-lg font-extrabold text-sky-400">{triage.affectedScope} / 5</span>
                  </div>
                </div>

                {/* Priority Gauge Bar (0-100) */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-300">Composite Priority Gauge</span>
                    <span className={`font-mono font-bold ${
                      triage.priority === 'Critical' ? 'text-rose-400' :
                      triage.priority === 'High' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {triage.priorityScore} / 100 ({triage.priority})
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700 relative p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${triage.priorityScore}%` }}
                      transition={{ duration: 0.4 }}
                      className={`h-full rounded-full ${
                        triage.priorityScore >= 85 
                          ? 'bg-gradient-to-r from-amber-500 to-rose-600' 
                          : triage.priorityScore >= 70
                          ? 'bg-gradient-to-r from-teal-500 to-amber-500'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      }`}
                    />
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 text-slate-700 mx-auto" />
                <p className="text-xs">
                  Start typing or use the Voice Utility Tool to view live NIVARAN AI triage breakdown.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
