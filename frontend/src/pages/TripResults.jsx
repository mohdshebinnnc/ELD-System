import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ShieldAlert, ShieldCheck, MapPin, Gauge, Clock, Calendar, AlertTriangle } from 'lucide-react';
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

// Custom Leaflet marker icons
const createNodeIcon = (letter, bgColor) => {
  return L.divIcon({
    html: `<div style="width:26px;height:26px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;background:${bgColor};box-shadow:0 2px 4px rgba(0,0,0,0.15)">${letter}</div>`,
    className: 'custom-leaflet-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26]
  });
};

function TripResults({ tripId, tripData }) {
  const [mapData, setMapData] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);

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

  const normalizedEvents = (tripData.violations || []).map(v => {
    if (typeof v === 'object' && v !== null) {
      return v;
    }
    // Parse legacy string format
    let severity = 'amber';
    let category = 'REST_BREAK';
    let message = v;
    let time = '';
    
    const parts = v.split(': ');
    if (parts.length >= 2) {
      time = parts[0];
      message = parts.slice(1).join(': ');
    }
    
    if (message.includes('8-hour')) {
      severity = 'amber';
      category = 'REST_BREAK';
      message = 'Required 30-Minute Rest Break';
    } else if (message.includes('11-hour')) {
      severity = 'amber';
      category = 'END_OF_SHIFT';
      message = 'End Driving Shift (11-Hour Driving Limit Reached)';
    } else if (message.includes('14-hour')) {
      severity = 'amber';
      category = 'SLEEPER_BERTH';
      message = 'Begin Off-Duty / Sleeper Berth Period';
    } else if (message.includes('70-hour')) {
      severity = 'amber';
      category = 'SLEEPER_BERTH';
      message = 'Begin Off-Duty / 34-Hour Cycle Restart';
    } else if (message.includes('❌')) {
      severity = 'red';
      message = message.replace('❌', '').trim();
    }
    
    return {
      time,
      category,
      severity,
      message,
      location: ''
    };
  });

  const hasRedViolations = normalizedEvents.some(e => e.severity === 'red');
  const redViolationsCount = normalizedEvents.filter(e => e.severity === 'red').length;

  // Swap OSRM coordinates [lon, lat] -> [lat, lon] for Leaflet
  const leafletPolyline = mapData?.route_coordinates
    ? mapData.route_coordinates.map(pt => [pt[1], pt[0]])
    : [];

  // Map center location
  const mapCenter = mapData?.origin?.coordinates || [39.8283, -98.5795];

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance */}
        <div className={`bg-white border rounded-xl px-5 py-4 h-[100px] flex items-center gap-4 ${
          hasRedViolations ? 'border-[#FECACA]' : 'border-[#BBF7D0]'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            hasRedViolations ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F0FDF4] text-[#16A34A]'
          }`}>
            {hasRedViolations ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#6B7280]">Compliance Planning Status</p>
            <p className={`text-[16px] font-bold ${
              hasRedViolations ? 'text-[#DC2626]' : 'text-[#16A34A]'
            }`}>
              {hasRedViolations
                ? `${redViolationsCount} Violation${redViolationsCount > 1 ? 's' : ''}`
                : 'Fully Compliant'}
            </p>
          </div>
        </div>

        {/* Miles */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 h-[100px] flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#F8FAFC] text-[#6B7280]">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#6B7280]">Total Route Miles</p>
            <p className="text-[22px] font-bold text-black">{tripData.total_miles.toFixed(1)} <span className="text-[13px] font-medium text-[#6B7280]">mi</span></p>
          </div>
        </div>

        {/* Drive Time */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 h-[100px] flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#F8FAFC] text-[#6B7280]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#6B7280]">Drive Time</p>
            <p className="text-[22px] font-bold text-black">{(tripData.total_miles / 55.0).toFixed(1)} <span className="text-[13px] font-medium text-[#6B7280]">hrs</span></p>
          </div>
        </div>

        {/* Days */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 h-[100px] flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#F8FAFC] text-[#6B7280]">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#6B7280]">Total Trip Days</p>
            <p className="text-[22px] font-bold text-black">{tripData.days ? tripData.days.length : 0} <span className="text-[13px] font-medium text-[#6B7280]">days</span></p>
          </div>
        </div>
      </div>

      {/* ── FMCSA Compliance Schedule ── */}
      {normalizedEvents.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F0F0F0]">
            <ShieldCheck className="h-5 w-5 text-[#191970]" />
            <h4 className="text-[16px] font-semibold text-black">FMCSA Compliance Schedule</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {normalizedEvents.map((event, i) => {
              let iconEmoji = 'ℹ️';
              let badgeColor = 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]'; // Blue default
              if (event.severity === 'red') {
                iconEmoji = '❌';
                badgeColor = 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]';
              } else if (event.severity === 'amber') {
                iconEmoji = '⚠️';
                badgeColor = 'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]';
                if (event.category === 'SLEEPER_BERTH' || event.category === 'END_OF_SHIFT') {
                  iconEmoji = '🛌';
                }
              } else if (event.category === 'FUEL_STOP') {
                iconEmoji = '⛽';
              } else if (event.category === 'PICKUP') {
                iconEmoji = '📦';
              } else if (event.category === 'DROPOFF') {
                iconEmoji = '📥';
              }
              
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${badgeColor}`}>
                  <span className="text-[20px] leading-none shrink-0">{iconEmoji}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold font-mono tracking-wide uppercase opacity-75">
                        {event.category.replace(/_/g, ' ')}
                      </span>
                      {event.time && (
                        <span className="text-[11px] font-medium opacity-70">
                          {event.time}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] font-semibold mt-1 leading-snug">
                      {event.message}
                    </p>
                    {event.location && (
                      <p className="text-[11px] font-medium opacity-75 mt-0.5">
                        Location: {event.location}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Map + Timeline (70/30) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
        {/* Map */}
        <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col h-[520px]">
          <h3 className="text-[16px] font-semibold text-black mb-3 shrink-0">Route Map</h3>

          <div className="flex-grow bg-[#F8FAFC] rounded-xl relative overflow-hidden border border-[#E5E7EB]">
            {mapLoading ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2">
                <div className="h-5 w-5 border-2 border-[#191970] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[13px] text-[#6B7280]">Loading map...</span>
              </div>
            ) : (
              <MapContainer center={mapCenter} zoom={5} scrollWheelZoom={true}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <RecenterMap center={mapCenter} />

                {leafletPolyline.length > 0 && (
                  <Polyline positions={leafletPolyline} color="#191970" weight={3} opacity={0.8} />
                )}

                {mapData?.origin?.coordinates && (
                  <Marker position={mapData.origin.coordinates} icon={createNodeIcon('O', '#374151')}>
                    <Popup>
                      <div className="text-xs">
                        <strong>Current Location (Origin)</strong>
                        <p>{mapData.origin.name}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {mapData?.pickup?.coordinates && (
                  <Marker position={mapData.pickup.coordinates} icon={createNodeIcon('P', '#16A34A')}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-[#16A34A]">Pickup Location (Loading)</strong>
                        <p>{mapData.pickup.name}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {mapData?.dropoff?.coordinates && (
                  <Marker position={mapData.dropoff.coordinates} icon={createNodeIcon('D', '#DC2626')}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-[#DC2626]">Dropoff Location (Unloading)</strong>
                        <p>{mapData.dropoff.name}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {mapData?.fuel_stops?.map((fuel, idx) => (
                  <Marker key={`fuel-${idx}`} position={fuel.coordinates} icon={createNodeIcon('F', '#2563EB')}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-[#2563EB]">Fuel Stop (On Duty 30 mins)</strong>
                        <p>{fuel.location}</p>
                        <p className="text-[10px] text-[#6B7280]">Day {fuel.day} at {fuel.time}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {mapData?.rest_stops?.map((rest, idx) => (
                  <Marker key={`rest-${idx}`} position={rest.coordinates} icon={createNodeIcon('R', '#F59E0B')}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-[#F59E0B]">Mandatory 30-Min Rest Break</strong>
                        <p>{rest.location}</p>
                        <p className="text-[10px] text-[#6B7280]">Day {rest.day} at {rest.time}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {mapData?.overnight_stops?.map((night, idx) => (
                  <Marker key={`night-${idx}`} position={night.coordinates} icon={createNodeIcon('S', '#191970')}>
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-[#191970]">10-Hour Sleeper Berth / Restart</strong>
                        <p>{night.location}</p>
                        <p className="text-[10px] text-[#6B7280]">Day {night.day} at {night.time}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-3 bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col h-[520px]">
          <h3 className="text-[16px] font-semibold text-black mb-4 shrink-0">Trip Timeline</h3>

          <div className="flex-grow overflow-y-auto space-y-5 pr-1">
            {tripData.days?.map(day => (
              <div key={day.id} className="space-y-3">
                {/* Day Header */}
                <div className="flex items-center gap-2 sticky top-0 bg-white py-1 z-10">
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-[#F3F4F6] text-[#374151] rounded-md border border-[#E5E7EB]">
                    DAY {day.day_number}
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-medium">{day.date}</span>
                  <div className="flex-grow border-t border-[#F3F4F6]"></div>
                </div>

                {/* Segments */}
                <div className="pl-4 border-l-2 border-[#E5E7EB] space-y-3 ml-3">
                  {day.segments?.map((seg, sIdx) => {
                    let statusColor = '#6B7280';
                    let statusBg = '#F3F4F6';
                    let statusLabel = 'Off-Duty';
                    if (seg.status === 'D') {
                      statusColor = '#2563EB'; statusBg = '#EFF6FF'; statusLabel = 'Driving';
                    } else if (seg.status === 'ON') {
                      statusColor = '#F59E0B'; statusBg = '#FFFBEB'; statusLabel = 'On-Duty';
                    } else if (seg.status === 'SB') {
                      statusColor = '#191970'; statusBg = '#EEF2FF'; statusLabel = 'Sleeper';
                    }

                    return (
                      <div key={sIdx} className="relative">
                        <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full border-2 border-white" style={{ background: statusColor }}></div>
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <span
                              className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider"
                              style={{ color: statusColor, background: statusBg }}
                            >
                              {statusLabel} · {seg.duration}h
                            </span>
                            <p className="text-[12px] font-medium text-black mt-1 leading-snug">
                              {seg.description}
                            </p>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5 flex items-center gap-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{seg.location.split(',')[0]}</span>
                            </p>
                          </div>
                          <span className="text-[10px] font-mono font-medium text-[#6B7280] bg-[#F8FAFC] px-2 py-0.5 border border-[#E5E7EB] rounded shrink-0 whitespace-nowrap">
                            {seg.start}–{seg.end}
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
