import { useState } from 'react';
import type { Grievance } from '../../types/grievance';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import { DEPARTMENTS_LIST } from '../../mockData/grievances';

interface GeographicHeatmapProps {
  grievances: Grievance[];
  isDarkMode: boolean;
}

export const GeographicHeatmap: React.FC<GeographicHeatmapProps> = ({
  grievances,
  isDarkMode
}) => {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string | null>(null);

  const filteredGrievances = selectedDeptFilter
    ? grievances.filter((g) => g.Department === selectedDeptFilter)
    : grievances;

  // Center over Mumbai Metropolitan Area (Andheri/Bandra/Kurla/Malad)
  const centerLat = 19.1000;
  const centerLng = 72.8500;

  const getMarkerColor = (dept: string) => {
    switch (dept) {
      case 'Water Supply': return '#0284c7';
      case 'Roads & Infra': return '#d97706';
      case 'Sanitation & Waste': return '#16a34a';
      case 'Electricity': return '#dc2626';
      case 'Public Distribution': return '#9333ea';
      default: return '#3b82f6';
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
            <MapPin className="w-5 h-5 text-emerald-400" />
            <h3 className={`font-bold text-base uppercase tracking-wide ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Geographic Ward Density Heatmap (Leaflet.js)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              GeoJSON Ward Layer
            </span>
          </div>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Ward-level spatial density mapping of registered civic grievances with departmental layer toggles.
          </p>
        </div>

        {/* Department Layer Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedDeptFilter(null)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              selectedDeptFilter === null
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            All Departments ({grievances.length})
          </button>
          {DEPARTMENTS_LIST.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDeptFilter(dept === selectedDeptFilter ? null : dept)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                selectedDeptFilter === dept
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {dept.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Leaflet Map */}
      <div className="h-96 w-full rounded-xl overflow-hidden border border-slate-800 relative shadow-inner">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={12}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
        >
          {/* Dark tiles theme or standard tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={
              isDarkMode
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
          />

          {/* Grievance Circle Markers */}
          {filteredGrievances.map((g) => (
            <CircleMarker
              key={g.Complaint_ID}
              center={[g.Latitude, g.Longitude]}
              radius={g.Priority_Score >= 85 ? 12 : g.Priority_Score >= 70 ? 9 : 6}
              pathOptions={{
                color: getMarkerColor(g.Department),
                fillColor: getMarkerColor(g.Department),
                fillOpacity: 0.7,
                weight: g.Priority_Score >= 85 ? 3 : 1.5
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div className="text-xs font-bold font-mono">
                  #{g.Complaint_ID} ({g.Department})
                </div>
              </Tooltip>

              <Popup>
                <div className="p-1 space-y-2 text-xs max-w-xs text-slate-900">
                  <div className="flex items-center justify-between border-b pb-1 font-bold">
                    <span className="font-mono">#{g.Complaint_ID}</span>
                    <span className="text-amber-600 font-mono">{g.Priority} ({g.Priority_Score}/100)</span>
                  </div>
                  <p className="text-slate-800 leading-snug">
                    "{g.Complaint}"
                  </p>
                  <div className="text-[10px] text-slate-600 pt-1 border-t flex justify-between">
                    <span>📍 {g.Ward}</span>
                    <span className="font-semibold text-emerald-700">{g.Status}</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="absolute bottom-3 left-3 z-[1000] p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-[10px] space-y-1 text-slate-300">
          <span className="font-bold block uppercase text-slate-400">Map Legend</span>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /><span>Water</span></span>
            <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /><span>Infra</span></span>
            <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /><span>Sanitation</span></span>
            <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /><span>Electricity</span></span>
          </div>
        </div>
      </div>

    </div>
  );
};
