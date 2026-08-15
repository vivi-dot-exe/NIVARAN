import { useState, useEffect } from 'react';
import type { Grievance } from '../../types/grievance';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import { DEPARTMENTS_LIST } from '../../mockData/grievances';

interface GeographicHeatmapProps {
  grievances: Grievance[];
  isDarkMode: boolean;
}

// Leaflet resize listener component to fix tile rendering/cutoff glitch on mount
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
              Geographic Ward Density Heatmap (Leaflet.js)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7A0C38] text-white">
              GeoJSON Ward Layer
            </span>
          </div>
          <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Ward-level spatial density mapping of registered civic grievances with departmental layer toggles.
          </p>
        </div>

        {/* Department Layer Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedDeptFilter(null)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
              selectedDeptFilter === null
                ? 'bg-[#7A0C38] text-white border-[#961247]'
                : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Departments ({grievances.length})
          </button>
          {DEPARTMENTS_LIST.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDeptFilter(dept === selectedDeptFilter ? null : dept)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                selectedDeptFilter === dept
                  ? 'bg-[#7A0C38] text-white border-[#961247]'
                  : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {dept.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Leaflet Map Container */}
      <div className="h-96 w-full rounded-xl overflow-hidden border border-slate-300 relative shadow-inner" style={{ minHeight: '384px' }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={12}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '384px', minHeight: '384px', borderRadius: '0.75rem' }}
        >
          {/* Map Resize Listener to prevent tile glitching */}
          <MapResizeListener />

          {/* Tile Layer */}
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
                fillOpacity: 0.75,
                weight: g.Priority_Score >= 85 ? 3 : 1.5
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div className="text-xs font-bold font-mono">
                  #{g.Complaint_ID} ({g.Department})
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
                  <div className="text-[10px] text-slate-600 pt-1 border-t flex justify-between font-bold">
                    <span>📍 {g.Ward}</span>
                    <span className="text-emerald-700">{g.Status}</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className={`absolute bottom-3 left-3 z-[1000] p-2.5 rounded-xl border backdrop-blur-md text-[10px] space-y-1 ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-300 text-slate-800 shadow-md'
        }`}>
          <span className="font-extrabold block uppercase text-slate-500">Map Layer Legend</span>
          <div className="flex items-center space-x-3 font-bold">
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
