import React, { useMemo } from 'react';
import type { Grievance } from '../../types/grievance';
import type { Language } from '../../utils/translations';
import { TRANSLATIONS } from '../../utils/translations';
import { INITIAL_CLUSTERS } from '../../mockData/grievances';
import { NvIcon } from '../common/NvIcon';
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
import { Layers, RefreshCw } from 'lucide-react';

interface BerTopicScatterProps {
  grievances: Grievance[];
  selectedClusterId: string | null;
  onSelectCluster: (clusterId: string | null) => void;
  isDarkMode: boolean;
  currentLanguage?: Language;
}

// Deterministic stable coordinate generator to prevent dot jittering
function getStableCoord(id: string, salt: number): number {
  let hash = salt;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 140) - 70;
}

export const BerTopicScatter: React.FC<BerTopicScatterProps> = ({
  grievances,
  selectedClusterId,
  onSelectCluster,
  isDarkMode,
  currentLanguage = 'en'
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  // Stable memoized scatter coordinates derived from ticket metadata
  const scatterData = useMemo(() => {
    return grievances.map((g) => {
      const x = g.Cluster_X ?? getStableCoord(g.Complaint_ID, 17);
      const y = g.Cluster_Y ?? getStableCoord(g.Complaint_ID, 31);
      return {
        x,
        y,
        z: (g.Priority_Score || 50) * 4,
        grievance: g
      };
    });
  }, [grievances]);

  const getClusterColor = (dept: string) => {
    switch (dept) {
      case 'Water Supply':
        return '#0284c7';
      case 'Roads & Infra':
        return '#d97706';
      case 'Sanitation & Waste':
        return '#16a34a';
      case 'Electricity':
        return '#dc2626';
      case 'Public Distribution':
        return '#9333ea';
      default:
        return '#64748b';
    }
  };

  return (
    <div className={`p-6 rounded-2xl border ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
    } space-y-4`}>
      
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#7A0C38]" />
            <h3 className={`font-extrabold text-base uppercase tracking-wide ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {t.scatterTitle}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7A0C38] text-white">
              {t.hdbscanBadge}
            </span>
          </div>
          <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.scatterSub}
          </p>
        </div>

        {/* Filter Indicator & Reset */}
        <div className="flex items-center space-x-2">
          {selectedClusterId && (
            <button
              onClick={() => onSelectCluster(null)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-955 border border-amber-400 text-xs font-extrabold shadow-sm hover:bg-amber-400 transition flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.resetFilter} ({selectedClusterId})</span>
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-2 ${
                isSelected
                  ? 'bg-[#7A0C38] text-white border-[#961247] shadow-md'
                  : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cls.color }} />
              <span>{cls.topic}</span>
              <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                isSelected ? 'bg-black/30 text-white' : 'bg-slate-200 text-slate-900'
              }`}>
                {cls.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Recharts Scatter Map */}
      <div className={`h-80 w-full relative rounded-xl border p-2 overflow-hidden ${
        isDarkMode ? 'bg-slate-955 border-slate-800' : 'bg-slate-50 border-slate-300'
      }`}>
        
        {/* Background Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis
              type="number"
              dataKey="x"
              domain={[-100, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
              name="UMAP Dim 1"
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[-100, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
              name="UMAP Dim 2"
            />
            <ZAxis type="number" dataKey="z" range={[100, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (payload && payload.length) {
                  const data = (payload[0].payload as { grievance: Grievance }).grievance;
                  return (
                    <div className="p-3 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-2xl text-xs space-y-1.5 max-w-xs">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                        <span className="font-mono font-bold text-amber-400">#{data.Complaint_ID}</span>
                        <span className="font-bold text-rose-400">Priority {data.Priority_Score}/100</span>
                      </div>
                      <p className="text-slate-200 line-clamp-2 leading-relaxed font-medium">
                        "{data.Complaint}"
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <span>📍 {data.Ward}</span>
                        <span className="font-bold text-sky-400">{data.Department}</span>
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
                  onSelectCluster(selectedClusterId === g.Duplicate_Group ? null : g.Duplicate_Group);
                }
              }}
            >
              {scatterData.map((entry, index) => {
                const isMatchCluster = selectedClusterId
                  ? entry.grievance.Duplicate_Group === selectedClusterId
                  : true;

                return (
                  <Cell
                    key={`cell-${entry.grievance.Complaint_ID}-${index}`}
                    fill={getClusterColor(entry.grievance.Department)}
                    opacity={isMatchCluster ? 0.95 : 0.25}
                    stroke={isMatchCluster ? (isDarkMode ? '#ffffff' : '#000000') : 'none'}
                    strokeWidth={isMatchCluster ? 2 : 0}
                    style={{ cursor: 'pointer', transition: 'fill-opacity 0.2s, stroke-width 0.2s' }}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-white/90 border border-slate-300 text-[10px] font-mono font-bold text-slate-700 flex items-center space-x-1.5 shadow-sm">
          <NvIcon />
          <span>{t.pointSizeLegend}</span>
        </div>
      </div>

    </div>
  );
};
