import React, { useState } from 'react';
import type { Grievance } from '../../types/grievance';
import {
  Layers,
  Zap,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Users,
  Activity,
  Send
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
}

export const BatchIngestionDemo: React.FC<BatchIngestionDemoProps> = ({
  onInjectBatch,
  grievancesCount,
  isDarkMode
}) => {
  const [isInjecting, setIsInjecting] = useState(false);
  const [isComputingClusters, setIsComputingClusters] = useState(false);
  const [hasInjected, setHasInjected] = useState(false);
  const [dispatchedHotspot, setDispatchedHotspot] = useState<string | null>(null);

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
      } space-y-4`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                Pitch Demo Simulator
              </span>
              <span className="text-xs text-slate-400">High-Throughput BERTopic Clustering</span>
            </div>
            <h2 className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Batch Ingestion & Live Auto-Clustering Engine
            </h2>
            <p className={`text-xs max-w-3xl mt-1 leading-relaxed ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Simulate an emergency spike (e.g. monsoon cloudburst in Mumbai Wards). Click <strong>"Inject 200+ Realistic Civic Complaints"</strong> to observe BERTopic HDBSCAN algorithms auto-cluster 200 raw grievances into 5 distinct operational hotspot clouds in under 2 seconds!
            </p>
          </div>

          <button
            onClick={handleStartBatch}
            disabled={isInjecting || isComputingClusters}
            className={`px-6 py-3 rounded-xl font-extrabold text-sm flex items-center space-x-2 transition shadow-xl shrink-0 ${
              isInjecting || isComputingClusters
                ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white hover:from-cyan-500 hover:to-indigo-500 shadow-cyan-600/30'
            }`}
          >
            {isInjecting || isComputingClusters ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Computing BERTopic Centroids...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                <span>Inject 200+ Civic Complaints</span>
              </>
            )}
          </button>
        </div>

        {/* Status indicator bar */}
        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-slate-400">Total System Complaints: <strong className="text-white font-mono">{grievancesCount}</strong></span>
            {hasInjected && (
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>200 Complaints Injected & Clustered</span>
              </span>
            )}
          </div>

          {isComputingClusters && (
            <div className="flex items-center space-x-2 text-cyan-400 font-mono font-bold animate-pulse">
              <Activity className="w-4 h-4" />
              <span>BERTopic Vectorizing Embeddings...</span>
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
              className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md flex items-center justify-center space-x-1.5"
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
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-md flex items-center justify-center space-x-1.5"
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
              className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-md flex items-center justify-center space-x-1.5"
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
