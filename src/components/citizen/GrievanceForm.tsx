import React, { useState, useEffect } from 'react';
import type { Grievance, TriageResult } from '../../types/grievance';
import type { Language } from '../../utils/translations';
import { TRANSLATIONS } from '../../utils/translations';
import { performAiTriage } from '../../utils/aiTriageEngine';
import { WARDS_LIST } from '../../mockData/grievances';
import { NvIcon } from '../common/NvIcon';
import {
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
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GrievanceFormProps {
  existingGrievances: Grievance[];
  onAddGrievance: (grievance: Grievance) => void;
  onUpvoteGrievance: (id: string) => void;
  isDarkMode: boolean;
  onTrackTicket: (ticketId: string) => void;
  currentLanguage: Language;
}

export const GrievanceForm: React.FC<GrievanceFormProps> = ({
  existingGrievances,
  onAddGrievance,
  onUpvoteGrievance,
  isDarkMode,
  onTrackTicket,
  currentLanguage
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  const [complaintText, setComplaintText] = useState('');
  const [selectedWard, setSelectedWard] = useState(WARDS_LIST[0]);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<Grievance | null>(null);
  const [upvotedId, setUpvotedId] = useState<string | null>(null);

  // Debounced real-time AI Triage calculation as user types
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
  };

  // Voice Assistant speech-to-text with Web Speech API & fallback
  const triggerVoiceAssistant = () => {
    // Check for native browser SpeechRecognition API
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang =
          currentLanguage === 'hi' ? 'hi-IN' : currentLanguage === 'mr' ? 'mr-IN' : 'en-IN';

        setIsListening(true);
        recognition.start();

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          if (transcript) {
            setComplaintText(transcript);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Microphone permission / Speech recognition fallback:', err);
          fallbackVoiceDictation();
        };

        recognition.onend = () => {
          setIsListening(false);
        };
        return;
      } catch (e) {
        console.warn('SpeechRecognition error:', e);
      }
    }

    fallbackVoiceDictation();
  };

  const fallbackVoiceDictation = () => {
    setIsListening(true);
    setTimeout(() => {
      setComplaintText(
        currentLanguage === 'hi'
          ? 'वार्ड 4 में 3 दिन से पेयजल आपूर्ति बंद है और सड़क पर पाइप फटने से पानी बह रहा है।'
          : currentLanguage === 'mr'
          ? 'वॉर्ड ४ मध्ये ३ दिवसांपासून पाण्याची पाइपलाइन फुटली आहे आणि पिण्याच्या पाण्याचा पुरवठा बंद आहे.'
          : 'Ward 4 me 3 din se drinking water supply band hai aur sadak par pipe phat ke paani beh raha hai.'
      );
      setSelectedWard('Ward 4 - Andheri West');
      setIsListening(false);
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim() || !triage) return;

    setIsSubmitting(true);
    setTimeout(() => {
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
      setIsSubmitting(false);
      setComplaintText('');
    }, 600);
  };

  const handleUpvote = (id: string) => {
    onUpvoteGrievance(id);
    setUpvotedId(id);
  };

  return (
    <div className="space-y-6">
      
      {/* ROYAL BLUE HERO BANNER (CPGRAMS / NIVARAN Portal Style) */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#1E3A8A] via-[#1E40AF] to-[#1D4ED8] text-white p-6 sm:p-8 shadow-xl border border-blue-400/30">
        
        {/* Decorative Background Patterns */}
        <div className="absolute inset-0 bg-[radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400/40 text-blue-200 text-xs font-mono font-bold">
              <NvIcon />
              <span>NIVARAN AI Voice Triage Module</span>
            </div>

            <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight leading-tight text-white font-heading">
              {t.heroTitle}
            </h2>

            <p className="text-sm sm:text-lg font-bold text-blue-100">
              {t.heroHindiSubtitle}
            </p>

            <p className="text-xs sm:text-sm text-blue-200 max-w-2xl leading-relaxed">
              {t.heroDesc}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={triggerVoiceAssistant}
                disabled={isListening}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md transition flex items-center space-x-2"
              >
                <Mic className={`w-4 h-4 text-slate-950 ${isListening ? 'animate-ping' : ''}`} />
                <span>{isListening ? t.listening : t.useVoiceTool}</span>
              </button>

              <div className="flex items-center space-x-1.5 text-xs text-blue-200 font-mono">
                <Volume2 className="w-4 h-4 text-cyan-300" />
                <span>{t.supportsLanguages}</span>
              </div>
            </div>

            {/* Quick Preset Fillers */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-blue-300 font-semibold">{t.demoPresets}</span>
              <button
                type="button"
                onClick={() => fillPreset('Ward 4 me SV road near Shoppers Stop paani ki pipe phat gayi hai. Supply band hai aur rasta paani se bhara hai.', 'Ward 4 - Andheri West')}
                className="px-2.5 py-1 text-xs rounded-md bg-blue-900/60 text-sky-200 border border-blue-400/30 hover:bg-blue-800 transition font-medium"
              >
                {t.waterLeak}
              </button>
              <button
                type="button"
                onClick={() => fillPreset('बांद्रा ईस्ट स्टेशन के बाहर पिछले 5 दिन से कचरा नहीं उठाया गया है। बदबू फैल रही है।', 'Ward 7 - Bandra East')}
                className="px-2.5 py-1 text-xs rounded-md bg-blue-900/60 text-emerald-200 border border-blue-400/30 hover:bg-blue-800 transition font-medium"
              >
                {t.garbageHeap}
              </button>
              <button
                type="button"
                onClick={() => fillPreset('Transformer blast near BKC Connector. Complete blackout and high voltage sparks.', 'Ward 7 - Bandra East')}
                className="px-2.5 py-1 text-xs rounded-md bg-blue-900/60 text-rose-200 border border-blue-400/30 hover:bg-blue-800 transition font-medium"
              >
                {t.transformerBlast}
              </button>
            </div>
          </div>

          {/* Right AI Assistant Widget (Samadhan Didi) */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-blue-400/30 p-5 rounded-2xl shadow-xl text-center space-y-3 relative w-full max-w-xs">
              
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-500 p-1 shadow-lg relative">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-[#7A0C38] flex items-center justify-center font-extrabold text-xl text-amber-300 font-mono">
                    🙏
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1 rounded-full border-2 border-slate-900">
                  <Mic className="w-3 h-3" />
                </div>
              </div>

              <div>
                <div className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-extrabold text-[10px] inline-block">
                  NIVARAN AI CHATBOT
                </div>
                <h3 className="font-extrabold text-xs text-white mt-1">
                  {t.samadhanDidi}
                </h3>
                <p className="text-[10px] text-blue-200">
                  {t.aiChatbotSubtitle}
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
            isDarkMode 
              ? 'bg-slate-900 border-slate-800' 
              : 'bg-white border-slate-300 shadow-sm'
          } space-y-5`}>
            
            {/* Ward Selector */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-800'
              }`}>
                {t.selectWard}
              </label>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold focus:ring-2 focus:ring-[#7A0C38] focus:outline-none transition ${
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
                <label className={`text-xs font-bold uppercase tracking-wider ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-800'
                }`}>
                  {t.describeIssue}
                </label>
                {triage && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center space-x-1 ${
                    isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}>
                    <Globe className="w-3 h-3" />
                    <span>Auto-Detected: {triage.language}</span>
                  </span>
                )}
              </div>

              <textarea
                rows={5}
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder={t.placeholderText}
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-[#7A0C38] focus:outline-none transition resize-none ${
                  isDarkMode 
                    ? 'bg-slate-955 border-slate-700 text-slate-100 placeholder-slate-500' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
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
                  className={`p-4 rounded-xl border space-y-3 ${
                    isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
                        {t.duplicateDetected} {selectedWard}!
                      </h4>
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                        An active ticket <strong className="underline cursor-pointer text-amber-800" onClick={() => onTrackTicket(triage.duplicateMatch!.Complaint_ID)}>#{triage.duplicateMatch.Complaint_ID}</strong> already matches your issue:
                      </p>
                      <p className={`text-xs italic p-2 rounded border mt-2 ${
                        isDarkMode ? 'bg-slate-900/60 border-amber-500/20 text-slate-300' : 'bg-white border-amber-200 text-slate-800'
                      }`}>
                        "{triage.duplicateMatch.Complaint}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-300/40">
                    <span className="text-xs font-semibold text-amber-800">
                      {t.upvoteMsg}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpvote(triage.duplicateMatch!.Complaint_ID)}
                      disabled={upvotedId === triage.duplicateMatch.Complaint_ID}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-xs hover:bg-amber-400 transition flex items-center space-x-1.5 shadow-md"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>
                        {upvotedId === triage.duplicateMatch.Complaint_ID 
                          ? `${t.upvoted} (${triage.duplicateMatch.Upvotes + 1})` 
                          : `${t.upvoteBtn} #${triage.duplicateMatch.Complaint_ID} (${triage.duplicateMatch.Upvotes})`}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <span className={`text-xs flex items-center space-x-1 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Info className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.encryptedNotice}</span>
              </span>

              <button
                type="submit"
                disabled={!triage || isSubmitting}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 transition shadow-md ${
                  triage && !isSubmitting
                    ? 'bg-[#7A0C38] hover:bg-[#961247] text-white font-extrabold shadow-rose-900/20'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin text-white" />
                    <span>{t.submitting}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t.submitGrievance}</span>
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
                className={`p-6 rounded-2xl border shadow-lg space-y-4 ${
                  isDarkMode ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-100' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-emerald-800">
                      {t.registeredSuccess}
                    </h3>
                    <p className="text-xs text-emerald-700">
                      Tracking Complaint ID: <strong className="text-slate-900 text-sm font-mono">{submittedTicket.Complaint_ID}</strong>
                    </p>
                  </div>
                </div>

                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl border text-xs ${
                  isDarkMode ? 'bg-slate-900/80 border-emerald-500/20' : 'bg-white border-emerald-200'
                }`}>
                  <div>
                    <span className="text-slate-500 block">{t.department}</span>
                    <span className="font-bold text-slate-900">{submittedTicket.Department}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Priority</span>
                    <span className="font-bold text-emerald-700">{submittedTicket.Priority} ({submittedTicket.Priority_Score}/100)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t.ward}</span>
                    <span className="font-bold text-slate-900">{submittedTicket.Ward}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">SLA Resolution Window</span>
                    <span className="font-bold text-amber-700">Within 24 Hours</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => onTrackTicket(submittedTicket.Complaint_ID)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-500 transition shadow-md"
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
            isDarkMode 
              ? 'bg-slate-900 border-slate-800' 
              : 'bg-white border-slate-300 shadow-sm'
          } space-y-6 sticky top-20`}>
            
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <NvIcon />
                <h3 className={`font-extrabold text-sm uppercase tracking-wider ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {t.triageTitle}
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                isDarkMode ? 'bg-slate-800 text-amber-400 border-slate-700' : 'bg-slate-100 text-[#7A0C38] border-slate-300'
              }`}>
                {t.debouncedRealtime}
              </span>
            </div>

            {triage ? (
              <div className="space-y-5">
                
                {/* Predicted Department Pill */}
                <div>
                  <span className={`text-xs font-semibold block mb-1.5 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {t.predictedDept}
                  </span>
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {triage.department}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                      {Math.round(triage.confidence * 100)}% {t.matchConfidence}
                    </span>
                  </div>
                </div>

                {/* Topic Pill */}
                <div>
                  <span className={`text-xs font-semibold block mb-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {t.bertopicCategory}
                  </span>
                  <div className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center space-x-2 ${
                    isDarkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>{triage.topic}</span>
                  </div>
                </div>

                {/* 3 Metrics: Severity, Urgency, Affected Scope */}
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-xl border text-center ${
                    isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">{t.severity}</span>
                    <span className="text-lg font-black text-amber-600">{triage.severity} / 5</span>
                  </div>

                  <div className={`p-3 rounded-xl border text-center ${
                    isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">{t.urgency}</span>
                    <span className="text-lg font-black text-rose-600">{triage.urgency} / 5</span>
                  </div>

                  <div className={`p-3 rounded-xl border text-center ${
                    isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">{t.scope}</span>
                    <span className="text-lg font-black text-blue-600">{triage.affectedScope} / 5</span>
                  </div>
                </div>

                {/* Priority Gauge Bar (0-100) */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{t.priorityGauge}</span>
                    <span className={`font-mono ${
                      triage.priority === 'Critical' ? 'text-rose-600' :
                      triage.priority === 'High' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {triage.priorityScore} / 100 ({triage.priority})
                    </span>
                  </div>
                  <div className={`w-full h-3 rounded-full overflow-hidden border relative p-0.5 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'
                  }`}>
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
                <NvIcon className="mx-auto" />
                <p className="text-xs font-medium">
                  {t.startTyping}
                </p>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
