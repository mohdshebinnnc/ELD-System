import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ShieldAlert, ShieldCheck, MapPin, Gauge, Hourglass, Calendar, Navigation, Info } from 'lucide-react';
import apiService from '../services/api';

// Center map view helper component
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 6);
    }
  }, [center, map]);
  return null;
}

// Custom Leaflet marker icons using HTML/Tailwind
const createNodeIcon = (letter, bgClass) => {
  return L.divIcon({
    html: `<div class="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-extrabold text-white shadow-lg ${bgClass}">${letter}</div>`,
    className: 'custom-leaflet-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

function TripResults({ tripId, tripData }) {
  const [mapData, setMapData] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    let cancelled = false;
    const fetchMapData = async () => {
      setMapLoading(true);
      try {
        const data = await apiService.getTripMap(tripId);
        if (!cancelled) {
          setMapData(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching map coordinates:', err);
        }
      } finally {
        if (!cancelled) {
          setMapLoading(false);
        }
      }
    };
    fetchMapData();
    return () => { cancelled = true; };
  }, [tripId]);

  if (!tripData) return null;

  // Swap OSRM coordinates [lon, lat] -> [lat, lon] for Leaflet
  const leafletPolyline = mapData?.route_coordinates
    ? mapData.route_coordinates.map(pt => [pt[1], pt[0]])
    : [];

  // Map center location
  const mapCenter = mapData?.origin?.coordinates || [39.8283, -98.5795]; // center of USA

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Compliance Card */}
        <div className={`p-5 rounded-2xl border flex items-center space-x-4 shadow-sm ${
          tripData.violations?.length > 0 
            ? 'bg-rose-50 border-rose-200 text-rose-950 dark:bg-rose-950/20 dark:border-rose-900/50' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-900/50'
        }`}>
          <div className={`p-3 rounded-xl ${
            tripData.violations?.length > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
            {tripData.violations?.length > 0 ? <ShieldAlert className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">HOS Status</p>
            <h4 className="text-sm font-extrabold mt-0.5">
              {tripData.violations?.length > 0 
                ? `${tripData.violations.length} Violation(s) Found` 
                : '100% Fully Compliant'}
            </h4>
          </div>
        </div>

        {/* Total Miles */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-blue-500 text-white rounded-xl">
            <Gauge className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Route Miles</p>
            <h4 className="text-lg font-black dark:text-white">{tripData.total_miles.toFixed(1)} Miles</h4>
          </div>
        </div>

        {/* Driving Hours */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-indigo-500 text-white rounded-xl">
            <Hourglass className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Drive Time (Avg 55mph)</p>
            <h4 className="text-lg font-black dark:text-white">{(tripData.total_miles / 55.0).toFixed(1)} Hours</h4>
          </div>
        </div>

        {/* Total days */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-amber-500 text-white rounded-xl">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Trip Days</p>
            <h4 className="text-lg font-black dark:text-white">{tripData.days ? tripData.days.length : 0} Days</h4>
          </div>
        </div>
      </div>

      {/* Violation Warnings Banner */}
      {tripData.violations?.length > 0 && (
        <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-sm space-y-2">
          <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400 flex items-center space-x-2">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>FMCSA HOS Violations Warning</span>
          </h4>
          <ul className="space-y-1.5 pl-7 list-disc text-xs text-rose-700 dark:text-rose-300">
            {tripData.violations.map((v, i) => (
              <li key={i} className="font-semibold">{v}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Layout Split: Left Map, Right Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Box */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-[500px]">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center space-x-2 shrink-0">
            <Navigation className="h-5 w-5 text-blue-500" />
            <span>Interactive Map & Route Milestones</span>
          </h3>

          <div className="flex-grow bg-slate-100 dark:bg-slate-950 rounded-xl relative overflow-hidden border border-slate-200 dark:border-slate-800/80">
            {mapLoading ? (
              <div className="absolute inset-0 flex items-center justify-center space-x-2 bg-slate-50/50 dark:bg-slate-950/50 z-10">
                <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-semibold text-slate-500">Loading Leaflet Map...</span>
              </div>
            ) : (
              <MapContainer center={mapCenter} zoom={5} scrollWheelZoom={true}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Center helper */}
                <RecenterMap center={mapCenter} />

                {/* Draw Route Polyline */}
                {leafletPolyline.length > 0 && (
                  <Polyline positions={leafletPolyline} color="#2563EB" weight={4} opacity={0.8} />
                )}

                {/* Origin Marker */}
                {mapData?.origin?.coordinates && (
                  <Marker position={mapData.origin.coordinates} icon={createNodeIcon('O', 'bg-slate-700')}>
                    <Popup>
                      <div className="text-xs">
                        <strong>Current Location (Origin)</strong>
                        <p>{mapData.origin.name}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Pickup Marker */}
                {mapData?.pickup?.coordinates && (
                  <Marker position={mapData.pickup.coordinates} icon={createNodeIcon('P', 'bg-emerald-600')}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-emerald-600">Pickup Location (Loading)</strong>
                        <p>{mapData.pickup.name}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Dropoff Marker */}
                {mapData?.dropoff?.coordinates && (
                  <Marker position={mapData.dropoff.coordinates} icon={createNodeIcon('D', 'bg-rose-600')}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-rose-600">Dropoff Location (Unloading)</strong>
                        <p>{mapData.dropoff.name}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Fuel Stop Markers */}
                {mapData?.fuel_stops?.map((fuel, idx) => (
                  <Marker key={`fuel-${idx}`} position={fuel.coordinates} icon={createNodeIcon('F', 'bg-blue-600')}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-blue-600">Fuel Stop (On Duty 30 mins)</strong>
                        <p>{fuel.location}</p>
                        <p className="text-[10px] text-slate-400">Day {fuel.day} at {fuel.time}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Rest Stop Markers */}
                {mapData?.rest_stops?.map((rest, idx) => (
                  <Marker key={`rest-${idx}`} position={rest.coordinates} icon={createNodeIcon('R', 'bg-amber-500')}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-amber-600">Mandatory 30-Min Rest Break</strong>
                        <p>{rest.location}</p>
                        <p className="text-[10px] text-slate-400">Day {rest.day} at {rest.time}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Sleeper stops */}
                {mapData?.overnight_stops?.map((night, idx) => (
                  <Marker key={`night-${idx}`} position={night.coordinates} icon={createNodeIcon('S', 'bg-indigo-700')}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-indigo-700">10-Hour Sleeper Berth / Restart</strong>
                        <p>{night.location}</p>
                        <p className="text-[10px] text-slate-400">Day {night.day} at {night.time}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Timeline Timeline Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-[500px]">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center space-x-2 shrink-0">
            <Info className="h-5 w-5 text-indigo-500" />
            <span>Itinerary Timeline</span>
          </h3>

          <div className="flex-grow overflow-y-auto space-y-6 pr-2">
            {tripData.days?.map(day => (
              <div key={day.id} className="space-y-3">
                {/* Day Divider Label */}
                <div className="flex items-center space-x-2 sticky top-0 bg-white dark:bg-slate-900 py-1.5 z-10">
                  <span className="text-xs font-black px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md">
                    DAY {day.day_number}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{day.date}</span>
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                </div>

                {/* Day events segments */}
                <div className="pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-4 ml-6">
                  {day.segments?.map((seg, sIdx) => {
                    let pillColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                    let statusLabel = 'Off-Duty';
                    if (seg.status === 'D') {
                      pillColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/20';
                      statusLabel = 'Driving';
                    } else if (seg.status === 'ON') {
                      pillColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/20';
                      statusLabel = 'On-Duty';
                    } else if (seg.status === 'SB') {
                      pillColor = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/20';
                      statusLabel = 'Sleeper';
                    }

                    return (
                      <div key={sIdx} className="relative group">
                        <div className="absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-400 dark:border-slate-900 group-hover:scale-110 transition-transform"></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${pillColor} uppercase tracking-wider`}>
                              {statusLabel} ({seg.duration} hrs)
                            </span>
                            <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2">
                              {seg.description}
                            </h5>
                            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center">
                              <MapPin className="h-3 w-3 shrink-0 mr-1" />
                              <span>{seg.location.split(',')[0]}</span>
                            </p>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 border border-slate-100 dark:border-slate-850 rounded">
                            {seg.start} - {seg.end}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TripResults;
