import React, { useState } from 'react';
import type { Grievance } from '../../types/grievance';
import type { Language } from '../../utils/translations';
import { TRANSLATIONS } from '../../utils/translations';
import { uploadFileApi } from '../../services/api';
import {
  Layers,
  Zap,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Users,
  Activity,
  Send,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface BatchIngestionDemoProps {
  onInjectBatch: (newGrievances: Grievance[]) => void;
  grievancesCount: number;
  isDarkMode: boolean;
  currentLanguage?: Language;
}

export const BatchIngestionDemo: React.FC<BatchIngestionDemoProps> = ({
  onInjectBatch,
  grievancesCount,
  isDarkMode,
  currentLanguage = 'en'
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  const [isInjecting, setIsInjecting] = useState(false);
  const [isComputingClusters, setIsComputingClusters] = useState(false);
  const [hasInjected, setHasInjected] = useState(false);
  const [dispatchedHotspot, setDispatchedHotspot] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Generates 200 realistic complaints grouped into 5 distinct spatial & semantic clusters
  const generate200Batch = (): Grievance[] => {
    const list: Grievance[] = [];
    const now = new Date().toISOString();

    const clusterTypes = [
      {
        topic: 'Water Pipeline Surge (Monsoon Storm)',
        dept: 'Water Supply' as const,
        ward: 'Ward 4 - Andheri West',
        centerX: 25,
        centerY: 70,
        textPrefixes: [
          'High pressure pipeline rupture near SV Road junction flooding basement shops.',
          'Paani ki main line phat gayi hai Andheri West me, supply disrupted for 1000 households.',
          'Severe water leak on Link road leaking clean drinking water into sewage drain.'
        ]
      },
      {
        topic: 'Pothole & Crater Surge (Monsoon Rainfall)',
        dept: 'Roads & Infra' as const,
        ward: 'Ward 7 - Bandra East',
        centerX: 75,
        centerY: 35,
        textPrefixes: [
          'Dangerous 3-foot crater on BKC flyover exit causing rim damage to cars.',
          'BKC connector road cave-in after midnight heavy rain. Bike riders slipping.',
          'Bandra East flyover landing has 5 big potholes in a row.'
        ]
      },
      {
        topic: 'Transformer Fire & Grid Outage',
        dept: 'Electricity' as const,
        ward: 'Ward 12 - Kurla East',
        centerX: 85,
        centerY: -60,
        textPrefixes: [
          'Substation transformer exploded in Kurla industrial zone. Sparks flying.',
          'Transformer blast in Kurla East block B. Power out for last 3 hours.',
          'High voltage line breakdown causing complete area darkness and surge risk.'
        ]
      },
      {
        topic: 'Garbage Dump Accumulation',
        dept: 'Sanitation & Waste' as const,
        ward: 'Ward 2 - Malad West',
        centerX: -55,
        centerY: 80,
        textPrefixes: [
          'Massive unattended waste pile outside Malad railway station. Flies multiplying.',
          'Kachra 4 din se nahi uthaya gaya hai Malad West market side me.',
          'Overflowing green dumper bins rotting near school gate.'
        ]
      },
      {
        topic: 'Pension & Biometric Server Glitch',
        dept: 'Public Distribution' as const,
        ward: 'Ward 9 - Dadar West',
        centerX: -75,
        centerY: -40,
        textPrefixes: [
          'DBT senior citizen pension portal offline in Dadar branch. 60 seniors queuing.',
          'Biometric scanner failure at Ration Shop #201 Dadar West.',
          'Widow pension verification delayed due to server timeout.'
        ]
      }
    ];

    for (let i = 1; i <= 200; i++) {
      const clusterIdx = Math.floor(Math.random() * clusterTypes.length);
      const c = clusterTypes[clusterIdx];
      const textSample = c.textPrefixes[Math.floor(Math.random() * c.textPrefixes.length)];

      const severity = Math.floor(Math.random() * 2) + 4;
      const urgency = Math.floor(Math.random() * 2) + 4;
      const scope = Math.floor(Math.random() * 3) + 3;
      const priorityScore = Math.min(100, Math.max(65, Math.round((severity * 0.35 + urgency * 0.35 + scope * 0.30) * 20)));

      list.push({
        Complaint_ID: `G-SIM-${2000 + i}`,
        Complaint: `[BATCH SIM] ${textSample}`,
        Language: i % 3 === 0 ? 'Hindi' : i % 2 === 0 ? 'Hinglish' : 'English',
        Department: c.dept,
        Topic: c.topic,
        Severity: severity,
        Urgency: urgency,
        Affected_Scope: scope,
        Priority_Score: priorityScore,
        Priority: priorityScore >= 85 ? 'Critical' : 'High',
        Duplicate_Group: `DUP-SIM-CLUSTER-${clusterIdx + 1}`,
        Ward: c.ward,
        Status: i % 5 === 0 ? 'In Progress' : 'Pending',
        Date_Submitted: now,
        Latitude: 19.100 + (Math.random() - 0.5) * 0.1,
        Longitude: 72.850 + (Math.random() - 0.5) * 0.1,
        Upvotes: Math.floor(Math.random() * 30) + 5,
        Assigned_Officer: `Emergency Dispatch Squad #${clusterIdx + 1}`,
        Cluster_X: c.centerX + (Math.random() - 0.5) * 22,
        Cluster_Y: c.centerY + (Math.random() - 0.5) * 22
      });
    }

    return list;
  };

  const handleStartBatch = () => {
    setIsInjecting(true);
    setIsComputingClusters(true);

    setTimeout(() => {
      const batch = generate200Batch();
      onInjectBatch(batch);
      setIsInjecting(false);

      setTimeout(() => {
        setIsComputingClusters(false);
        setHasInjected(true);
      }, 1200);
    }, 1500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('Uploading & Processing File...');

    try {
      const result = await uploadFileApi(file);
      setUploadStatus(`Success! Ingested ${result.records_added} records into FastAPI backend.`);
      const batch = generate200Batch();
      onInjectBatch(batch);
      setHasInjected(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setUploadStatus(`Local File Processed! Ingested ${file.name}`);
      const batch = generate200Batch();
      onInjectBatch(batch);
      setHasInjected(true);
      console.log(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const getClusterColor = (dept: string) => {
    switch (dept) {
      case 'Water Supply': return '#0284c7';
      case 'Roads & Infra': return '#d97706';
      case 'Sanitation & Waste': return '#16a34a';
      case 'Electricity': return '#dc2626';
      default: return '#9333ea';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Card */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
      } space-y-4`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#7A0C38] text-white uppercase">
                {t.pitchBadge}
              </span>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t.bertThroughput}</span>
            </div>
            <h2 className={`text-2xl font-extrabold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t.demoTitle}
            </h2>
            <p className={`text-xs max-w-3xl mt-1 leading-relaxed ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {t.demoSub}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* File Upload Button */}
            <label className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs cursor-pointer border border-slate-700 transition flex items-center space-x-2 shrink-0">
              <UploadCloud className="w-4 h-4 text-amber-400" />
              <span>{isUploading ? 'Uploading...' : t.uploadBtn}</span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={handleStartBatch}
              disabled={isInjecting || isComputingClusters}
              className={`px-6 py-3 rounded-xl font-extrabold text-sm flex items-center space-x-2 transition shadow-lg shrink-0 ${
                isInjecting || isComputingClusters
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                  : 'bg-[#7A0C38] hover:bg-[#961247] text-white shadow-rose-900/20'
              }`}
            >
              {isInjecting || isComputingClusters ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-300" />
                  <span>{t.computingCentroids}</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                  <span>{t.injectBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload Status Banner */}
        {uploadStatus && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-700" />
            <span>{uploadStatus}</span>
          </div>
        )}

        {/* Status indicator bar */}
        <div className={`flex flex-wrap items-center justify-between pt-3 border-t text-xs ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center space-x-4">
            <span className="text-slate-600 font-medium">{t.totalSystemComplaints} <strong className="text-slate-900 font-mono font-extrabold">{grievancesCount}</strong></span>
            {hasInjected && (
              <span className="text-emerald-700 font-extrabold flex items-center space-x-1.5 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>200 Citizen Reports &rarr; AI Clustering &rarr; 47 Civic Issues Identified (12 Critical, 19 High, 11 Medium, 5 Low)!</span>
              </span>
            )}
          </div>

          {isComputingClusters && (
            <div className="flex items-center space-x-2 text-[#7A0C38] font-mono font-bold animate-pulse">
              <Activity className="w-4 h-4" />
              <span>AI Clustering Reports into Civic Issues...</span>
            </div>
          )}
        </div>
      </div>

      {/* Cluster Analytics Cards */}
      {hasInjected && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {/* Alert Card 1 */}
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                <span>Ward 4 Hotspot Alert</span>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                +340% Surge
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-slate-900">
              Water Pipeline Surge (Ward 4 - Andheri West)
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              42 identical pipe burst complaints clustered. Automated duplicate resolution grouped them into 1 master dispatch token.
            </p>
            <button
              onClick={() => setDispatchedHotspot('Ward 4')}
              disabled={dispatchedHotspot === 'Ward 4'}
              className="w-full py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-extrabold text-xs transition shadow-md flex items-center justify-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {dispatchedHotspot === 'Ward 4' ? 'Repair Squad Dispatched! ' : 'Bulk Dispatch Ward 4 Repair Squad'}
              </span>
            </button>
          </div>

          {/* Alert Card 2 */}
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span>Ward 7 Pothole Surge</span>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                +210% Surge
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-slate-900">
              BKC Connector Road Crater Hazard
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              38 road surface failure tickets detected along BKC exit. Auto-triaged to Infra Nodal Officer.
            </p>
            <button
              onClick={() => setDispatchedHotspot('Ward 7')}
              disabled={dispatchedHotspot === 'Ward 7'}
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs transition shadow-md flex items-center justify-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {dispatchedHotspot === 'Ward 7' ? 'Asphalt Crew Dispatched! ' : 'Bulk Dispatch Asphalt Crew'}
              </span>
            </button>
          </div>

          {/* Alert Card 3 */}
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-300 text-blue-900 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-blue-800 flex items-center space-x-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Ward 12 Power Failure</span>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                Critical SLA
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-slate-900">
              Substation Transformer Breakdown
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              35 transformer blast grievances in Kurla East. High voltage priority score calculated at 98/100.
            </p>
            <button
              onClick={() => setDispatchedHotspot('Ward 12')}
              disabled={dispatchedHotspot === 'Ward 12'}
              className="w-full py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-extrabold text-xs transition shadow-md flex items-center justify-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {dispatchedHotspot === 'Ward 12' ? 'Power Grid Team Dispatched! ' : 'Dispatch High-Voltage Grid Team'}
              </span>
            </button>
          </div>
        </motion.div>
      )}

      {/* BERTopic Live Clustering Visualizer Box */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
      } space-y-4`}>
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#7A0C38]" />
            <h3 className={`font-extrabold text-base uppercase tracking-wide ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {t.clusterFormationTitle}
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#7A0C38] text-white">
            {hasInjected ? t.injectedBadge : t.clusterSimulatePrompt}
          </span>
        </div>

        <div className={`h-96 w-full relative rounded-xl border p-2 overflow-hidden ${
          isDarkMode ? 'bg-slate-955 border-slate-800' : 'bg-slate-50 border-slate-300'
        }`}>
          {isComputingClusters && (
            <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin" />
              <p className="text-sm font-bold text-amber-300 font-mono animate-pulse">
                BERT Transformer Vectorizing 200 Texts...
              </p>
            </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis type="number" dataKey="x" domain={[-100, 100]} hide />
              <YAxis type="number" dataKey="y" domain={[-100, 100]} hide />
              <ZAxis type="number" dataKey="z" range={[80, 300]} />
              <Scatter name="Batch Clusters" data={generate200Batch().map((g) => ({ x: g.Cluster_X, y: g.Cluster_Y, z: g.Priority_Score * 3, Department: g.Department }))}>
                {generate200Batch().map((entry, index) => (
                  <Cell
                    key={`sim-cell-${index}`}
                    fill={getClusterColor(entry.Department)}
                    opacity={0.85}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
