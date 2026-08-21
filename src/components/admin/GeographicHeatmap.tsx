import React, { useState, useEffect } from 'react';
import type { Grievance } from '../../types/grievance';
import type { Language } from '../../utils/translations';
import { TRANSLATIONS } from '../../utils/translations';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { MapPin, Layers, Flame, ShieldAlert, GitPullRequest, Clock } from 'lucide-react';
import { DEPARTMENTS_LIST } from '../../mockData/grievances';

interface GeographicHeatmapProps {
  grievances: Grievance[];
  isDarkMode: boolean;
  currentLanguage?: Language;
}

type HeatmapLayer = 'department' | 'density' | 'sla_breach' | 'fci_hotspots' | 'jbi_hotspots';

function MapResizeListener() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export const GeographicHeatmap: React.FC<GeographicHeatmapProps> = ({
  grievances,
  isDarkMode,
  currentLanguage = 'en'
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  const [activeLayer, setActiveLayer] = useState<HeatmapLayer>('department');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string | null>(null);

  const centerLat = 19.1000;
  const centerLng = 72.8500;

  // Filter based on department if in department layer mode
  const displayedGrievances = activeLayer === 'department' && selectedDeptFilter
    ? grievances.filter((g) => g.Department === selectedDeptFilter)
    : grievances;

  const getMarkerStyling = (g: Grievance) => {
    if (activeLayer === 'fci_hotspots') {
      const isFci = (g.Falsified_Attempts && g.Falsified_Attempts > 0) || g.Verification_Status === 'rejected_escalated' || g.Status === 'Escalated';
      return {
        color: isFci ? '#e11d48' : '#64748b',
        fillColor: isFci ? '#f43f5e' : '#94a3b8',
        radius: isFci ? 16 : 5,
        fillOpacity: isFci ? 0.9 : 0.25,
        weight: isFci ? 3 : 1
      };
    }

    if (activeLayer === 'jbi_hotspots') {
      const isBounced = (g.Transfers_Count && g.Transfers_Count > 0);
      return {
        color: isBounced ? '#d97706' : '#64748b',
        fillColor: isBounced ? '#f59e0b' : '#94a3b8',
        radius: isBounced ? 14 : 5,
        fillOpacity: isBounced ? 0.9 : 0.25,
        weight: isBounced ? 3 : 1
      };
    }

    if (activeLayer === 'sla_breach') {
      const isBreached = g.Priority_Score >= 80 || g.Status === 'Escalated';
      return {
        color: isBreached ? '#dc2626' : '#10b981',
        fillColor: isBreached ? '#ef4444' : '#34d399',
        radius: isBreached ? 14 : 6,
        fillOpacity: isBreached ? 0.85 : 0.4,
        weight: isBreached ? 3 : 1.5
      };
    }

    if (activeLayer === 'density') {
      const isHighUpvotes = (g.Upvotes || 1) >= 3;
      return {
        color: isHighUpvotes ? '#7c3aed' : '#3b82f6',
        fillColor: isHighUpvotes ? '#8b5cf6' : '#60a5fa',
        radius: Math.min(22, 6 + (g.Upvotes || 1) * 3),
        fillOpacity: 0.8,
        weight: 2
      };
    }

    // Default: Department Layer
    switch (g.Department) {
      case 'Water Supply': return { color: '#0284c7', fillColor: '#0284c7', radius: g.Priority_Score >= 85 ? 12 : 7, fillOpacity: 0.75, weight: 2 };
      case 'Roads & Infra': return { color: '#d97706', fillColor: '#d97706', radius: g.Priority_Score >= 85 ? 12 : 7, fillOpacity: 0.75, weight: 2 };
      case 'Sanitation & Waste': return { color: '#16a34a', fillColor: '#16a34a', radius: g.Priority_Score >= 85 ? 12 : 7, fillOpacity: 0.75, weight: 2 };
      case 'Electricity': return { color: '#dc2626', fillColor: '#dc2626', radius: g.Priority_Score >= 85 ? 12 : 7, fillOpacity: 0.75, weight: 2 };
      case 'Public Distribution': return { color: '#9333ea', fillColor: '#9333ea', radius: g.Priority_Score >= 85 ? 12 : 7, fillOpacity: 0.75, weight: 2 };
      default: return { color: '#3b82f6', fillColor: '#3b82f6', radius: 7, fillOpacity: 0.75, weight: 2 };
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
            <MapPin className="w-5 h-5 text-[#7A0C38]" />
            <h3 className={`font-extrabold text-base uppercase tracking-wide ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {t.heatmapTitle}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7A0C38] text-white">
              Uber H3 Hexagonal Grid
            </span>
          </div>
          <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Observability Map Layer: Spatio-Temporal Pinpoint • True MTTR & FCI Density
          </p>
        </div>

        {/* 5 Layer Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveLayer('department')}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition flex items-center space-x-1 ${
              activeLayer === 'department'
                ? 'bg-[#7A0C38] text-white border-[#961247]'
                : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Department</span>
          </button>

          <button
            onClick={() => setActiveLayer('density')}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition flex items-center space-x-1 ${
              activeLayer === 'density'
                ? 'bg-purple-600 text-white border-purple-500'
                : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Consensus Density</span>
          </button>

          <button
            onClick={() => setActiveLayer('sla_breach')}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition flex items-center space-x-1 ${
              activeLayer === 'sla_breach'
                ? 'bg-red-600 text-white border-red-500'
                : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Breached SLA</span>
          </button>

          <button
            onClick={() => setActiveLayer('fci_hotspots')}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition flex items-center space-x-1 ${
              activeLayer === 'fci_hotspots'
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>False Closure (FCI)</span>
          </button>

          <button
            onClick={() => setActiveLayer('jbi_hotspots')}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition flex items-center space-x-1 ${
              activeLayer === 'jbi_hotspots'
                ? 'bg-amber-600 text-white border-amber-500'
                : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GitPullRequest className="w-3 h-3" />
            <span>Bounce Rate (JBI)</span>
          </button>
        </div>
      </div>

      {/* Sub Department Filter if in department mode */}
      {activeLayer === 'department' && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            onClick={() => setSelectedDeptFilter(null)}
            className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
              selectedDeptFilter === null
                ? 'bg-blue-600 text-white border-blue-500'
                : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            All Departments ({grievances.length})
          </button>
          {DEPARTMENTS_LIST.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDeptFilter(dept === selectedDeptFilter ? null : dept)}
              className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                selectedDeptFilter === dept
                  ? 'bg-blue-600 text-white border-blue-500'
                  : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              {dept.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Leaflet Map Container */}
      <div className="h-96 w-full rounded-xl overflow-hidden border border-slate-300 relative shadow-inner" style={{ minHeight: '384px' }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={12}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '384px', minHeight: '384px', borderRadius: '0.75rem' }}
        >
          <MapResizeListener />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={
              isDarkMode
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
          />

          {displayedGrievances
            .filter((g) => g && g.Latitude != null && g.Longitude != null && !isNaN(Number(g.Latitude)) && !isNaN(Number(g.Longitude)))
            .map((g) => {
            const styling = getMarkerStyling(g);
            return (
              <CircleMarker
                key={g.Complaint_ID}
                center={[Number(g.Latitude), Number(g.Longitude)]}
                radius={styling.radius}
                pathOptions={{
                  color: styling.color,
                  fillColor: styling.fillColor,
                  fillOpacity: styling.fillOpacity,
                  weight: styling.weight
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div className="text-xs font-bold font-mono">
                    #{g.Complaint_ID} • {g.Ward}
                  </div>
                </Tooltip>

                <Popup>
                  <div className="p-1 space-y-2 text-xs max-w-xs text-slate-900 font-sans">
                    <div className="flex items-center justify-between border-b pb-1 font-bold">
                      <span className="font-mono text-[#7A0C38]">#{g.Complaint_ID}</span>
                      <span className="text-amber-700 font-mono">{g.Priority} ({g.Priority_Score}/100)</span>
                    </div>
                    <p className="text-slate-800 leading-snug font-medium">
                      "{g.Complaint}"
                    </p>
                    <div className="text-[10px] text-slate-600 pt-1 border-t space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>📍 {g.Ward}</span>
                        <span className="text-emerald-700">{g.Status}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 font-mono">
                        <span>H3: {g.H3_Index || 'Res-10'}</span>
                        <span>Consensus: {g.Upvotes || 1} Citizens</span>
                      </div>
                      {g.Falsified_Attempts && g.Falsified_Attempts > 0 ? (
                        <div className="text-rose-600 font-black pt-0.5">
                          ⚠️ Flagged False Resolution ({g.Falsified_Attempts} Attempt)
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className={`absolute bottom-3 left-3 z-[1000] p-2.5 rounded-xl border backdrop-blur-md text-[10px] space-y-1 ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-300 text-slate-800 shadow-md'
        }`}>
          <span className="font-extrabold block uppercase text-slate-500">
            {activeLayer === 'fci_hotspots' ? 'False Closure Penalty Mode' :
             activeLayer === 'jbi_hotspots' ? 'Jurisdiction Bounce Index Mode' :
             activeLayer === 'density' ? 'Consensus Cluster Mode' : 'Department View'}
          </span>
          <div className="flex items-center space-x-3 font-bold">
            {activeLayer === 'fci_hotspots' ? (
              <>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block animate-pulse" /><span>Flagged False Closure</span></span>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /><span>Normal Closed/Open</span></span>
              </>
            ) : activeLayer === 'jbi_hotspots' ? (
              <>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /><span>Bounced Ticket (Transfers &gt; 0)</span></span>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /><span>Direct Resolution</span></span>
              </>
            ) : (
              <>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /><span>Water</span></span>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /><span>Infra</span></span>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /><span>Sanitation</span></span>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /><span>Electricity</span></span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

