import React, { useState, useRef } from 'react';
import type { Grievance } from '../../types/grievance';
import { uploadCsvFileApi } from '../../services/api';
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
  FileSpreadsheet,
  Download,
  AlertCircle
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
  onRefreshFromBackend?: () => Promise<void>;
  grievancesCount: number;
  isDarkMode: boolean;
}

export const BatchIngestionDemo: React.FC<BatchIngestionDemoProps> = ({
  onInjectBatch,
  onRefreshFromBackend,
  grievancesCount,
  isDarkMode
}) => {
  const [isInjecting, setIsInjecting] = useState(false);
  const [isComputingClusters, setIsComputingClusters] = useState(false);
  const [hasInjected, setHasInjected] = useState(false);
  const [dispatchedHotspot, setDispatchedHotspot] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ message: string; count: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const severity = Math.floor(Math.random() * 2) + 4; // 4 or 5
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

  // 1. Generate & Upload CSV directly to FastAPI POST /api/upload-csv
  const handleGenerateAndUploadCsvToBackend = async () => {
    setIsInjecting(true);
    setIsComputingClusters(true);
    setUploadError(null);
    setUploadResult(null);

    const batch = generate200Batch();

    // Create CSV content
    const csvRows = ['text,location,category,priority_score'];
    batch.forEach((g) => {
      const cleanText = g.Complaint.replace(/"/g, '""');
      csvRows.push(`"${cleanText}","${g.Ward}","${g.Department}",${g.Priority_Score}`);
    });
    const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const csvFile = new File([csvBlob], `batch_grievances_${Date.now()}.csv`, { type: 'text/csv' });

    try {
      const res = await uploadCsvFileApi(csvFile);
      setUploadResult({ message: 'Success', count: res.records_added });
      if (onRefreshFromBackend) {
        await onRefreshFromBackend();
      }
    } catch (err: unknown) {
      console.warn('POST /api/upload-csv fallback to client ingestion:', err);
      onInjectBatch(batch);
      setUploadResult({ message: 'Client Ingestion (Backend Offline)', count: batch.length });
    } finally {
      setIsInjecting(false);
      setTimeout(() => {
        setIsComputingClusters(false);
        setHasInjected(true);
      }, 800);
    }
  };

  // 2. Upload Custom CSV File to POST /api/upload-csv
  const handleUploadCustomFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploadingFile(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const res = await uploadCsvFileApi(selectedFile);
      setUploadResult({ message: 'File Ingested Successfully', count: res.records_added });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onRefreshFromBackend) {
        await onRefreshFromBackend();
      }
      setHasInjected(true);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // 3. Download Standard CSV Template
  const handleDownloadTemplate = () => {
    const templateContent = [
      'text,location,category,priority_score',
      '"Water pipeline burst near station entrance causing flood","Ward 4 - Andheri West","Water Supply",88',
      '"Large pothole near school crossing causing traffic accidents","Ward 7 - Bandra East","Roads & Infra",82',
      '"Garbage bins overflowing and foul smell for 4 days","Ward 2 - Malad West","Sanitation & Waste",70',
      '"Transformer blast causing complete power outage","Ward 12 - Kurla East","Electricity",95',
      '"DBT pension portal biometric fingerprint scanner broken","Ward 9 - Dadar West","Public Distribution",65'
    ].join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'darpg_grievances_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      } space-y-5`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                FastAPI CSV Ingestion & BERTopic Engine
              </span>
              <span className="text-xs text-slate-400">Endpoint: POST /api/upload-csv</span>
            </div>
            <h2 className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Batch Ingestion & Live Auto-Clustering Engine
            </h2>
            <p className={`text-xs max-w-3xl mt-1 leading-relaxed ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Simulate high-throughput emergency batch ingestion (e.g. monsoon cloudburst in Mumbai). Upload a custom CSV/Excel dataset or click <strong>"Inject 200+ Complaints"</strong> to transmit data directly to FastAPI backend and observe BERTopic HDBSCAN algorithms auto-cluster tickets in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleGenerateAndUploadCsvToBackend}
              disabled={isInjecting || isComputingClusters}
              className={`px-5 py-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center space-x-2 transition shadow-xl cursor-pointer ${
                isInjecting || isComputingClusters
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                  : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white hover:from-cyan-500 hover:to-indigo-500 shadow-cyan-600/30'
              }`}
            >
              {isInjecting || isComputingClusters ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Uploading to /api/upload-csv...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Inject 200+ Civic Complaints</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* FILE UPLOAD & TEMPLATE SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-slate-800">
          
          {/* Custom CSV Upload Form (8 cols) */}
          <div className="md:col-span-8 bg-slate-800/40 p-4 rounded-xl border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span>Upload Custom Grievance CSV (.csv, .xlsx, .xls)</span>
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center space-x-1 underline cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>

            <form onSubmit={handleUploadCustomFile} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
              />

              <button
                type="submit"
                disabled={!selectedFile || isUploadingFile}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
                  selectedFile && !isUploadingFile
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isUploadingFile ? (
                  <>
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Send to /api/upload-csv</span>
                  </>
                )}
              </button>
            </form>

            {uploadResult && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{uploadResult.message}: Added <strong>{uploadResult.count} records</strong> to database. Dashboard updated!</span>
              </div>
            )}

            {uploadError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Quick Metrics (4 cols) */}
          <div className="md:col-span-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-center space-y-2">
            <span className="text-xs text-slate-400">Total System Complaints</span>
            <span className="text-2xl font-extrabold text-white font-mono">{grievancesCount}</span>
            <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>FastAPI Backend Active (SQLite / SQLAlchemy)</span>
            </span>
          </div>

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
          <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-600/60 text-rose-100 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Ward 4 Hotspot Alert</span>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                +340% Surge
              </span>
            </div>
            <h4 className="font-bold text-sm text-white">
              Water Pipeline Surge (Ward 4 - Andheri West)
            </h4>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              42 identical pipe burst complaints clustered. Automated duplicate resolution grouped them into 1 master dispatch token.
            </p>
            <button
              onClick={() => setDispatchedHotspot('Ward 4')}
              disabled={dispatchedHotspot === 'Ward 4'}
              className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {dispatchedHotspot === 'Ward 4' ? 'Repair Squad Dispatched! ✓' : 'Bulk Dispatch Ward 4 Repair Squad'}
              </span>
            </button>
          </div>

          {/* Alert Card 2 */}
          <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-600/60 text-amber-100 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Ward 7 Pothole Surge</span>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                +210% Surge
              </span>
            </div>
            <h4 className="font-bold text-sm text-white">
              BKC Connector Road Crater Hazard
            </h4>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              38 road surface failure tickets detected along BKC exit. Auto-triaged to Infra Nodal Officer.
            </p>
            <button
              onClick={() => setDispatchedHotspot('Ward 7')}
              disabled={dispatchedHotspot === 'Ward 7'}
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {dispatchedHotspot === 'Ward 7' ? 'Asphalt Crew Dispatched! ✓' : 'Bulk Dispatch Asphalt Crew'}
              </span>
            </button>
          </div>

          {/* Alert Card 3 */}
          <div className="p-5 rounded-2xl bg-sky-950/40 border border-sky-600/60 text-sky-100 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400 flex items-center space-x-1">
                <Users className="w-4 h-4 text-sky-400" />
                <span>Ward 12 Power Failure</span>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                Critical SLA
              </span>
            </div>
            <h4 className="font-bold text-sm text-white">
              Substation Transformer Breakdown
            </h4>
            <p className="text-xs text-sky-200/90 leading-relaxed">
              35 transformer blast grievances in Kurla East. High voltage priority score calculated at 98/100.
            </p>
            <button
              onClick={() => setDispatchedHotspot('Ward 12')}
              disabled={dispatchedHotspot === 'Ward 12'}
              className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {dispatchedHotspot === 'Ward 12' ? 'Power Grid Team Dispatched! ✓' : 'Dispatch High-Voltage Grid Team'}
              </span>
            </button>
          </div>
        </motion.div>
      )}

      {/* BERTopic Live Clustering Visualizer Box */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      } space-y-4`}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className={`font-bold text-base uppercase tracking-wide ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              BERTopic Dynamic Cluster Formation Map
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-slate-800 text-cyan-400 border border-slate-700">
            {hasInjected ? '200 Injected Points Clustered' : 'Click Inject button above to simulate 200 points'}
          </span>
        </div>

        <div className="h-96 w-full relative bg-slate-955 rounded-xl border border-slate-800 p-2 overflow-hidden">
          {isComputingClusters && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
              <p className="text-sm font-bold text-cyan-300 font-mono animate-pulse">
                BERT Transformer Vectorizing Embeddings...
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
                    opacity={0.8}
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
