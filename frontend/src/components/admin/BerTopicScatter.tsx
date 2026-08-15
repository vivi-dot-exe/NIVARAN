import React from 'react';
import type { Grievance } from '../../types/grievance';
import { INITIAL_CLUSTERS } from '../../mockData/grievances';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Layers, RefreshCw, Sparkles } from 'lucide-react';

interface BerTopicScatterProps {
  grievances: Grievance[];
  selectedClusterId: string | null;
  onSelectCluster: (clusterId: string | null) => void;
  isDarkMode: boolean;
}

export const BerTopicScatter: React.FC<BerTopicScatterProps> = ({
  grievances,
  selectedClusterId,
  onSelectCluster,
  isDarkMode
}) => {
  // Map grievances into 2D embedding points
  const scatterData = grievances.map((g) => ({
    x: g.Cluster_X ?? (Math.random() * 160 - 80),
    y: g.Cluster_Y ?? (Math.random() * 160 - 80),
    z: g.Priority_Score * 4,
    grievance: g
  }));

  const getClusterColor = (dept: string) => {
    switch (dept) {
      case 'Water Supply':
        return '#0284c7'; // Sky
      case 'Roads & Infra':
        return '#d97706'; // Amber
      case 'Sanitation & Waste':
        return '#16a34a'; // Green
      case 'Electricity':
        return '#dc2626'; // Red
      case 'Public Distribution':
        return '#9333ea'; // Purple
      default:
        return '#64748b';
    }
  };

  return (
    <div className={`p-6 rounded-2xl border ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    } space-y-4`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className={`font-bold text-base uppercase tracking-wide ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              2D BERTopic AI Embeddings Scatter Map
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              HDBSCAN Centroids
            </span>
          </div>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Semantic NLP vector clustering derived from BERT transformers. Click any cluster point to filter table complaints.
          </p>
        </div>

        {/* Filter Indicator & Reset */}
        <div className="flex items-center space-x-2">
          {selectedClusterId && (
            <button
              onClick={() => onSelectCluster(null)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Cluster Filter ({selectedClusterId})</span>
            </button>
          )}
        </div>
      </div>

      {/* Cluster Topic Legend Pills */}
      <div className="flex flex-wrap gap-2 pt-1">
        {INITIAL_CLUSTERS.map((cls) => {
          const isSelected = selectedClusterId === cls.id;
          return (
            <button
              key={cls.id}
              onClick={() => onSelectCluster(isSelected ? null : cls.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-2 ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cls.color }} />
              <span>{cls.topic}</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-900/60 font-mono text-[10px]">
                {cls.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Recharts Scatter Map */}
      <div className="h-80 w-full relative bg-slate-955 rounded-xl border border-slate-800 p-2 overflow-hidden">
        
        {/* Background Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis
              type="number"
              dataKey="x"
              domain={[-100, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              name="UMAP Dim 1"
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[-100, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              name="UMAP Dim 2"
            />
            <ZAxis type="number" dataKey="z" range={[100, 400]} />
            <Tooltip
              content={({ payload }) => {
                if (payload && payload.length) {
                  const data = (payload[0].payload as { grievance: Grievance }).grievance;
                  return (
                    <div className="p-3 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl text-xs space-y-1.5 max-w-xs backdrop-blur-md">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                        <span className="font-mono font-bold text-emerald-400">#{data.Complaint_ID}</span>
                        <span className="font-bold text-amber-400">Priority {data.Priority_Score}/100</span>
                      </div>
                      <p className="text-slate-200 line-clamp-2 leading-relaxed">
                        "{data.Complaint}"
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <span>📍 {data.Ward}</span>
                        <span className="font-semibold text-cyan-300">{data.Department}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter
              name="Grievances"
              data={scatterData}
              onClick={(data) => {
                const g = (data as unknown as { grievance: Grievance }).grievance;
                if (g && g.Duplicate_Group) {
                  onSelectCluster(g.Duplicate_Group);
                }
              }}
            >
              {scatterData.map((entry, index) => {
                const isMatchCluster = selectedClusterId
                  ? entry.grievance.Duplicate_Group === selectedClusterId
                  : true;

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={getClusterColor(entry.grievance.Department)}
                    opacity={isMatchCluster ? 0.9 : 0.2}
                    stroke={isMatchCluster ? '#ffffff' : 'none'}
                    strokeWidth={isMatchCluster ? 1.5 : 0}
                    className="cursor-pointer transition-all hover:scale-125"
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center space-x-1.5">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Point size = Composite Priority Score (0-100)</span>
        </div>
      </div>

    </div>
  );
};
