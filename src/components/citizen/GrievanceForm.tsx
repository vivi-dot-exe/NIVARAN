import React, { useState, useEffect } from 'react';
import type { Grievance, TriageResult } from '../../types/grievance';
import type { Language } from '../../utils/translations';
import { TRANSLATIONS } from '../../utils/translations';
import { performAiTriage, getH3Index } from '../../utils/aiTriageEngine';

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
  Volume2,
  MapPin,
  Crosshair,
  Clock,
  Sparkles,
  ShieldCheck
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

const WARD_BASE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Ward 4 - Andheri West': { lat: 19.1197, lng: 72.8464 },
  'Ward 7 - Bandra East': { lat: 19.0620, lng: 72.8480 },
  'Ward 2 - Malad West': { lat: 19.1860, lng: 72.8485 },
  'Ward 9 - Dadar West': { lat: 19.0178, lng: 72.8478 },
  'Ward 12 - Kurla East': { lat: 19.0650, lng: 72.8790 }
};

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
  // Ward is DERIVED from GPS — never manually entered to prevent false location claims.
  const [selectedWard, setSelectedWard] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquiring' | 'geocoding' | 'confirmed' | 'denied'>('idle');
  const [geocodedLabel, setGeocodedLabel] = useState<string>(''); // human-readable "Suburb, District, State"

  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<Grievance | null>(null);
  const [upvotedId, setUpvotedId] = useState<string | null>(null);

  // Reverse geocode real-world GPS coordinates to a human-readable ward/locality label
  // using OpenStreetMap Nominatim — free, no API key, covers all of India.
  const reverseGeocodeWard = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!res.ok) throw new Error('Nominatim error');
      const data = await res.json();
      const a = data.address || {};
      // Build the best available locality string from coarse → fine granularity
      const locality =
        a.suburb || a.neighbourhood || a.quarter ||
        a.village || a.town || a.city_district || a.city || a.county;
      const district = a.county || a.state_district || a.city;
      const state = a.state;
      const parts: string[] = [];
      if (locality) parts.push(locality);
      if (district && district !== locality) parts.push(district);
      if (state) parts.push(state);
      return parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      // Graceful fallback: show raw coordinates so the form is never permanently blocked
      return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
    }
  };

  // Auto-request GPS on mount so the citizen doesn't have to click anything.
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }
    setGpsStatus('acquiring');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setGpsStatus('geocoding');
        const ward = await reverseGeocodeWard(lat, lng);
        setSelectedWard(ward);
        setGeocodedLabel(ward);
        setGpsStatus('confirmed');
      },
      () => {
        // GPS denied — show warning, don't allow free ward selection.
        setGpsStatus('denied');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  const handleRetryGps = () => {
    if (!navigator.geolocation) return;
    setGpsStatus('acquiring');
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setGpsStatus('geocoding');
        const ward = await reverseGeocodeWard(lat, lng);
        setSelectedWard(ward);
        setGeocodedLabel(ward);
        setGpsStatus('confirmed');
        setIsLocating(false);
      },
      () => {
        setGpsStatus('denied');
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };


  useEffect(() => {
    const timer = setTimeout(() => {
      if (complaintText.trim().length > 3 && latitude !== null && longitude !== null) {
        const result = performAiTriage(complaintText, latitude, longitude, existingGrievances);
        setTriage(result);
      } else {
        setTriage(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [complaintText, latitude, longitude, existingGrievances]);

  const fillPreset = (text: string, ward: string, lat?: number, lng?: number) => {
    setComplaintText(text);
    if (lat && lng) {
      setLatitude(lat);
      setLongitude(lng);
      // For presets: use the ward label passed in directly (it's already a real place name)
      setSelectedWard(ward);
      setGeocodedLabel(ward);
    } else {
      const coords = WARD_BASE_COORDS[ward] || { lat: 19.1197, lng: 72.8464 };
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      setSelectedWard(ward);
      setGeocodedLabel(ward);
    }
    // Unlock form even if GPS wasn't confirmed — presets are demo data
    setGpsStatus('confirmed');
    setSubmittedTicket(null);
  };

  const triggerVoiceAssistant = () => {
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

        recognition.onerror = () => {
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
      const lat = 19.1197;
      const lng = 72.8464;
      setComplaintText(
        currentLanguage === 'hi'
          ? 'वार्ड 4 में 3 दिन से पेयजल आपूर्ति बंद है और सड़क पर पाइप फटने से पानी बह रहा है।'
          : currentLanguage === 'mr'
          ? 'वॉर्ड ४ मध्ये ३ दिवसांपासून पाण्याची पाइपलाइन फुटली आहे आणि पिण्याच्या पाण्याचा पुरवठा बंद आहे.'
          : 'Ward 4 me 3 din se drinking water supply band hai aur sadak par pipe phat ke paani beh raha hai.'
      );
      // Use existing GPS if confirmed, otherwise set preset coords
      if (gpsStatus !== 'confirmed') {
        setLatitude(lat);
        setLongitude(lng);
        // Preset ward label for voice demo — real GPS would use reverseGeocodeWard
        setSelectedWard('Ward 4 - Andheri West');
        setGeocodedLabel('Ward 4 - Andheri West');
      }
      setIsListening(false);
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Block submission if GPS not confirmed — prevents false location claims.
    if (!complaintText.trim() || !triage || gpsStatus !== 'confirmed' || latitude === null || longitude === null) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newId = `G-${Math.floor(1000 + Math.random() * 9000)}`;

      const deptCentroids: Record<string, { cx: number; cy: number }> = {
        'Water Supply': { cx: 18.4, cy: 72.1 },
        'Roads & Infra': { cx: 62.8, cy: 33.8 },
        'Sanitation & Waste': { cx: -45.0, cy: 80.0 },
        'Electricity': { cx: 85.0, cy: -50.0 },
        'Public Distribution': { cx: -75.0, cy: -45.0 },
        'Public Health & Healthcare': { cx: -20.0, cy: -60.0 }
      };

      const baseCentroid = deptCentroids[triage.department] || { cx: 0, cy: 0 };
      const offsetFactor = Math.random() - 0.5;

      const newTicket: Grievance = {
        Complaint_ID: newId,
        Complaint: complaintText.trim(),
        Language: triage.language,
        Department: triage.department,
        Topic: triage.topic,
        Severity: triage.severity,
        Urgency: triage.urgency,
        Affected_Scope: triage.affectedScope,
        Base_Severity: triage.baseSeverity,
        Priority_Score: triage.priorityScore,
        Priority: triage.priority,
        Duplicate_Group: triage.duplicateMatch ? triage.duplicateMatch.Duplicate_Group || `DUP-CLUSTER-${Math.floor(100 + Math.random() * 900)}` : null,
        Ward: selectedWard,
        Status: 'Pending',
        Date_Submitted: new Date().toISOString(),
        Latitude: latitude,
        Longitude: longitude,
        H3_Index: triage.h3Index,
        Upvotes: 1,
        Verification_Status: 'unverified',
        Falsified_Attempts: 0,
        Transfers_Count: 0,
        Assigned_Officer: `Er. ${triage.department.split(' ')[0]} Nodal Officer`,
        Cluster_X: Number((baseCentroid.cx + offsetFactor * 12).toFixed(2)),
        Cluster_Y: Number((baseCentroid.cy + offsetFactor * 12).toFixed(2)),
        Audit_Trail: [
          {
            timestamp: new Date().toISOString(),
            event: 'TICKET_LODGED',
            details: `Ticket registered by citizen at GPS (${latitude}, ${longitude}) with H3 Hex ${triage.h3Index}`
          }
        ]
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

  const currentH3 = latitude !== null && longitude !== null ? getH3Index(latitude, longitude, 10) : '—';

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#1E3A8A] via-[#1E40AF] to-[#1D4ED8] text-white p-6 sm:p-8 shadow-xl border border-blue-400/30">
        <div className="absolute inset-0 bg-[radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400/40 text-blue-200 text-xs font-mono font-bold">
              <NvIcon />
              <span>NIVARAN AI Spatio-Semantic Triage Engine</span>
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

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-blue-300 font-semibold">{t.demoPresets}</span>
              <button
                type="button"
                onClick={() => fillPreset('Ward 4 me SV road near Shoppers Stop paani ki pipe phat gayi hai. Supply band hai aur rasta paani se bhara hai.', 'Ward 4 - Andheri West', 19.1197, 72.8464)}
                className="px-2.5 py-1 text-xs rounded-md bg-blue-900/60 text-sky-200 border border-blue-400/30 hover:bg-blue-800 transition font-medium"
              >
                {t.waterLeak} (35m Duplication Test)
              </button>
              <button
                type="button"
                onClick={() => fillPreset('बांद्रा ईस्ट स्टेशन के बाहर पिछले 5 दिन से कचरा नहीं उठाया गया है। बदबू फैल रही है।', 'Ward 7 - Bandra East', 19.0620, 72.8480)}
                className="px-2.5 py-1 text-xs rounded-md bg-blue-900/60 text-emerald-200 border border-blue-400/30 hover:bg-blue-800 transition font-medium"
              >
                {t.garbageHeap}
              </button>
              <button
                type="button"
                onClick={() => fillPreset('Transformer blast near BKC Connector. Complete blackout and high voltage sparks.', 'Ward 7 - Bandra East', 19.0645, 72.8510)}
                className="px-2.5 py-1 text-xs rounded-md bg-blue-900/60 text-rose-200 border border-blue-400/30 hover:bg-blue-800 transition font-medium"
              >
                {t.transformerBlast}
              </button>
            </div>
          </div>

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

              <div className="flex justify-center items-center space-x-2 text-xs font-bold text-amber-300/80 pt-1 border-t border-blue-500/30">
                <span>अ</span>
                <span>•</span>
                <span>ए</span>
                <span>•</span>
                <span>आ</span>
                <span>•</span>
                <span>A</span>
                <span>•</span>
                <span>क</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSubmit}
            className={`p-6 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
            } space-y-5`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h3 className={`font-extrabold text-sm uppercase tracking-wider flex items-center space-x-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <ShieldCheck className="w-4 h-4 text-[#7A0C38]" />
                <span>{t.formTitle}</span>
              </h3>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  Uber H3 Res-10 Spatial Gate (35m)
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {/* GPS Location Verification — replaces free ward selector */}
              {(gpsStatus === 'acquiring' || gpsStatus === 'geocoding') && (
                <div className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
                  isDarkMode ? 'bg-blue-950/40 border-blue-500/30 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  <Activity className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-extrabold block">
                      {gpsStatus === 'geocoding' ? 'Detecting your area...' : 'Acquiring GPS Signal...'}
                    </span>
                    <span className="text-[11px] opacity-70">
                      {gpsStatus === 'geocoding'
                        ? 'GPS locked — resolving your locality via OpenStreetMap.'
                        : 'Please allow location access. Your area will be auto-detected.'}
                    </span>
                  </div>
                </div>
              )}

              {gpsStatus === 'denied' && (
                <div className={`p-3.5 rounded-xl border space-y-2 ${
                  isDarkMode ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-extrabold">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>GPS Required to File a Complaint</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetryGps}
                      disabled={isLocating}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center space-x-1.5 transition"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>{isLocating ? 'Trying...' : 'Enable GPS & Retry'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-80">
                    GPS location is mandatory to prevent false ward claims. Open your browser/system settings, allow location for this page, then tap Retry.
                  </p>
                </div>
              )}

              {gpsStatus === 'confirmed' && latitude !== null && longitude !== null && (
                <div className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isDarkMode ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-extrabold text-emerald-400">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>GPS Verified — Location Locked</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetryGps}
                      disabled={isLocating}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Crosshair className="w-3 h-3 inline mr-1" />
                      Refresh GPS
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2.5 rounded-lg border ${
                      isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <span className={`text-[10px] font-bold uppercase block mb-0.5 ${ isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Detected Locality</span>
                      <span className={`font-extrabold text-xs flex items-center space-x-1 ${ isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <span>📍</span>
                        <span>{geocodedLabel || selectedWard}</span>
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${
                      isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <span className={`text-[10px] font-bold uppercase block mb-0.5 ${ isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Coordinates</span>
                      <span className="font-mono text-[11px] text-blue-400 font-bold">{latitude.toFixed(4)}°, {longitude.toFixed(4)}°</span>
                    </div>
                  </div>
                </div>
              )}

              <div className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono ${
                isDarkMode ? 'bg-slate-955 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-[#7A0C38]" />
                  <span>GPS: <strong>{latitude !== null ? `${latitude.toFixed(4)}° N, ${longitude!.toFixed(4)}° E` : 'Awaiting signal...'}</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-500">H3 Cell:</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                    {currentH3}
                  </span>
                </div>
              </div>
            </div>

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
                rows={4}
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

            <AnimatePresence>
              {triage?.duplicateMatch && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-xl border space-y-3 ${
                    isDarkMode ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <AlertOctagon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1 w-full">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 flex items-center space-x-1.5">
                          <span>Nearby Matching Grievance Found ({triage.distanceMeters ?? '< 35'}m Away)</span>
                        </h4>
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                          {Math.round(triage.similarityScore * 100)}% Semantic Match
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        An active ticket <strong className="underline cursor-pointer text-amber-600 font-mono" onClick={() => onTrackTicket(triage.duplicateMatch!.Complaint_ID)}>#{triage.duplicateMatch.Complaint_ID}</strong> was already reported at this exact location:
                      </p>

                      <p className={`text-xs italic p-2.5 rounded-lg border ${
                        isDarkMode ? 'bg-slate-900/90 border-amber-500/30 text-slate-200' : 'bg-white border-amber-200 text-slate-800'
                      }`}>
                        "{triage.duplicateMatch.Complaint}"
                      </p>

                      <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        <span>📍 {triage.duplicateMatch.Ward}</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Status: <strong>{triage.duplicateMatch.Status}</strong></span>
                        </span>
                        <span className="font-bold text-amber-600">
                          {/* P1-4 FIX: Pull live count from existingGrievances, not the stale triage snapshot */}
                          Current Consensus: {(existingGrievances.find(g => g.Complaint_ID === triage.duplicateMatch?.Complaint_ID)?.Upvotes ?? triage.duplicateMatch.Upvotes)} Citizens
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-400/30">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Boost Priority instead of creating ticket flood:</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleUpvote(triage.duplicateMatch!.Complaint_ID)}
                      disabled={upvotedId === triage.duplicateMatch.Complaint_ID}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center space-x-2 shadow-md shadow-amber-500/20"
                    >
                      <ThumbsUp className="w-4 h-4 text-slate-950" />
                      <span>
                        {upvotedId === triage.duplicateMatch.Complaint_ID
                          ? (() => {
                              // P1-4 FIX: Show live upvote count from state, not stale snapshot
                              const liveCount = existingGrievances.find(g => g.Complaint_ID === triage.duplicateMatch?.Complaint_ID)?.Upvotes ?? triage.duplicateMatch.Upvotes;
                              return `✓ Upvoted! (${liveCount} Citizens)`;
                            })()
                          : `I Am Also Affected (+1 Upvote)`}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between pt-2">
              <span className={`text-xs flex items-center space-x-1 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Info className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.encryptedNotice}</span>
              </span>

              <button
                type="submit"
                disabled={!triage || isSubmitting || (gpsStatus !== 'confirmed')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 transition shadow-md ${
                  triage && !isSubmitting && gpsStatus === 'confirmed'
                    ? 'bg-[#7A0C38] hover:bg-[#961247] text-white font-extrabold shadow-rose-900/20'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin text-white" />
                    <span>{t.submitting}</span>
                  </>
                ) : gpsStatus === 'geocoding' ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Detecting area...</span>
                  </>
                ) : gpsStatus !== 'confirmed' ? (
                  <>
                    <MapPin className="w-4 h-4" />
                    <span>Enable GPS to Submit</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{triage?.duplicateMatch ? 'Lodge As New Master Ticket Anyway' : t.submitGrievance}</span>
                  </>
                )}
              </button>
            </div>
          </form>

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
                    <span className="text-slate-500 block">Dynamic Priority</span>
                    <span className="font-bold text-emerald-700">{submittedTicket.Priority} ({submittedTicket.Priority_Score}/100)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t.ward}</span>
                    <span className="font-bold text-slate-900">{submittedTicket.Ward}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">SLA Target</span>
                    <span className="font-bold text-amber-700">24.0 Hours</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => onTrackTicket(submittedTicket.Complaint_ID)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-500 transition shadow-md"
                  >
                    Track Live Inaction Clock & Sub-tasks &rarr;
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                      Dynamic Priority Score
                    </span>
                    <span className={`font-mono font-extrabold ${
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

                  <span className="text-[10px] text-slate-500 font-mono block mt-1">
                    Formula: min(100, Base {triage.baseSeverity} + 10·log₂(Upvotes) + Elapsed·0.75)
                  </span>
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
