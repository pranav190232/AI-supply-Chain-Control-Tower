import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap, Circle, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Shipment, Location } from '../types';
import { Package, Navigation2, Zap, Clock, CloudSun, CloudRain, Wind, CloudFog, Sun, Thermometer } from 'lucide-react';
import { cn } from '../lib/utils';
import { Weather } from '../types';

// Fix Leaflet marker icons by using CDNs as fallback
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  shipments: Shipment[];
  selectedId: string | null;
  onSelect: (id: string, latlng?: [number, number]) => void;
  optimizedRoute?: Location[] | null;
}

// Simulated High-Density Traffic Zones
const TRAFFIC_HOTSPOTS = [
  { center: [1.2902, 103.8519], radius: 300000, density: 'CRITICAL', label: 'STRAIT OF MALACCA' },
  { center: [30.5852, 32.2654], radius: 250000, density: 'HIGH', label: 'SUEZ CANAL' },
  { center: [9.0800, -79.6800], radius: 200000, density: 'HIGH', label: 'PANAMA CANAL' },
  { center: [50.5, 0.5], radius: 350000, density: 'CRITICAL', label: 'ENGLISH CHANNEL' },
  { center: [22.3, 114.1], radius: 280000, density: 'HIGH', label: 'PEARL RIVER DELTA' },
  { center: [34.0, -118.2], radius: 220000, density: 'MODERATE', label: 'LONG BEACH' },
  { center: [35.6, 139.7], radius: 240000, density: 'HIGH', label: 'TOKYO BAY' }
];

function getPointOnPath(path: Location[], progress: number) {
  if (!path || path.length === 0) return null;
  if (path.length === 1) return path[0];
  if (progress >= 1) return path[path.length - 1];
  if (progress <= 0) return path[0];
  
  const continuous: Location[] = [{...path[0]}];
  let lastLng = path[0].lng;
  for (let i = 1; i < path.length; i++) {
    let lng = path[i].lng;
    while (lng - lastLng > 180) lng -= 360;
    while (lng - lastLng < -180) lng += 360;
    continuous.push({ lat: path[i].lat, lng: lng });
    lastLng = lng;
  }
  
  const totalSegments = continuous.length - 1;
  const segmentIndex = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
  const segmentProgress = (progress * totalSegments) - segmentIndex;
  
  const p1 = { lat: continuous[segmentIndex].lat, lng: continuous[segmentIndex].lng };
  const p2 = { lat: continuous[segmentIndex + 1].lat, lng: continuous[segmentIndex + 1].lng };
  
  const interpolated = interpolate(p1, p2, segmentProgress);
  let wrappedLng = ((interpolated.lng + 180) % 360 + 360) % 360 - 180;
  return { lat: interpolated.lat, lng: wrappedLng };
}

function mercY(lat: number) {
  const rad = lat * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

function invMercY(y: number) {
  const rad = 2 * Math.atan(Math.exp(y)) - Math.PI / 2;
  return rad * 180 / Math.PI;
}

function interpolate(p1: Location, p2: Location, progress: number) {
  const y1 = mercY(p1.lat);
  const y2 = mercY(p2.lat);
  const lat = invMercY(y1 + (y2 - y1) * progress);
  return {
    lat: lat,
    lng: p1.lng + (p2.lng - p1.lng) * progress
  };
}
function splitLines(path: Location[]): [number, number][][] {
  if (path.length === 0) return [];
  const lines: [number, number][][] = [];
  let currentLine: [number, number][] = [];
  
  let continuous: Location[] = [{...path[0]}];
  let lastLng = path[0].lng;
  for (let i = 1; i < path.length; i++) {
    let lng = path[i].lng;
    while (lng - lastLng > 180) lng -= 360;
    while (lng - lastLng < -180) lng += 360;
    continuous.push({ lat: path[i].lat, lng: lng });
    lastLng = lng;
  }
  
  currentLine.push([continuous[0].lat, continuous[0].lng]);
  
  for (let i = 1; i < continuous.length; i++) {
    const prev = continuous[i-1];
    const curr = continuous[i];
    
    let prevOffset = Math.floor((prev.lng + 180) / 360) * 360;
    let currOffset = Math.floor((curr.lng + 180) / 360) * 360;
    
    if (prevOffset !== currOffset) {
      const crossingLng = prev.lng < curr.lng ? prevOffset + 180 : prevOffset - 180;
      const fraction = Math.abs((crossingLng - prev.lng) / (curr.lng - prev.lng));
      
      const y1 = mercY(prev.lat);
      const y2 = mercY(curr.lat);
      const crossLat = invMercY(y1 + (y2 - y1) * fraction);
      
      currentLine.push([crossLat, crossingLng]);
      lines.push(currentLine.map(p => [p[0], p[1] - prevOffset]));
      
      currentLine = [];
      const newStart = prev.lng < curr.lng ? currOffset - 180 : currOffset + 180;
      currentLine.push([crossLat, newStart]);
    }
    
    currentLine.push([curr.lat, curr.lng]);
  }
  
  if (currentLine.length > 0) {
    const lastOffset = Math.floor((currentLine[currentLine.length - 1][1] + 180) / 360) * 360;
    lines.push(currentLine.map(p => [p[0], p[1] - lastOffset]));
  }
  
  return lines;
}

// Sub-component to sync map view when selected shipment changes
function MapController({ selectedShipment }: { selectedShipment: Shipment | null }) {
  const map = useMap();
  const [lastId, setLastId] = useState<string | null>(null);
  
  useEffect(() => {
    if (selectedShipment) {
      const activeRoute = selectedShipment.newRoute || selectedShipment.route;
      const currentPos = getPointOnPath(activeRoute, selectedShipment.progress);
      
      // We fly if the ID is different, or if it's the first time we see an ID
      if (currentPos && selectedShipment.id !== lastId) {
        map.flyTo([currentPos.lat, currentPos.lng], 8, { 
          duration: 1.5,
          easeLinearity: 0.15
        });
        setLastId(selectedShipment.id);
      }
    } else {
      setLastId(null);
    }
  }, [selectedShipment?.id]);

  // Handle Resize Events (for when fullscreen toggle happens)
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    
    const container = map.getContainer();
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [map]);

  return null;
}

// Simulated Traffic Density Layer
function TrafficDensityLayer() {
  return (
    <>
      {TRAFFIC_HOTSPOTS.map((spot, i) => (
        <Circle 
          key={i}
          center={spot.center as [number, number]}
          radius={spot.radius}
          pathOptions={{
            fillColor: spot.density === 'CRITICAL' ? '#ef4444' : spot.density === 'HIGH' ? '#f59e0b' : '#38bdf8',
            fillOpacity: 0.15,
            color: 'transparent',
            weight: 0
          }}
        >
          <Tooltip sticky direction="top" opacity={0.6}>
             <div className="text-[8px] font-mono tracking-widest uppercase">
               {spot.label} <span className="font-bold opacity-50">// DENSITY: {spot.density}</span>
             </div>
          </Tooltip>
        </Circle>
      ))}
    </>
  );
}

// Weather Icon component helper (unused in direct HTML render but good for reference)
const WeatherIcon = ({ condition, className }: { condition: string, className?: string }) => {
  const cond = condition.toLowerCase();
  if (cond.includes('storm') || cond.includes('sea') || cond.includes('cyclone') || cond.includes('typhoon')) return <Zap className={className} />;
  if (cond.includes('rain')) return <CloudRain className={className} />;
  if (cond.includes('fog')) return <CloudFog className={className} />;
  if (cond.includes('wind') || cond.includes('heavy')) return <Wind className={className} />;
  if (cond.includes('clear') || cond.includes('sun')) return <Sun className={className} />;
  return <CloudSun className={className} />;
};

function WeatherLayer({ weather }: { weather: Weather[] }) {
  return (
    <>
      {weather.map((w, i) => {
        const severityColor = w.severity === 'extreme' ? '#ef4444' : w.severity === 'high' ? '#f97316' : w.severity === 'moderate' ? '#f59e0b' : '#38bdf8';
        return (
          <Marker 
            key={i}
            position={[w.lat, w.lng]}
            icon={L.divIcon({
              className: 'weather-icon',
              html: `
                <div class="flex items-center justify-center p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-2xl" style="color: ${severityColor}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    ${w.condition.toLowerCase().includes('storm') || w.condition.toLowerCase().includes('cyclone') 
                      ? '<path d="M13 2 L3 14h9l-1 8 10-12h-9l1-8z"/>' 
                      : '<path d="M17.5 19a3.5 3.5 0 1 1-5.83-2.65 4.81 4.81 0 1 1-8.22-6.10A4.14 4.14 0 1 1 11.43 4.1 4.14 4.14 0 1 1 17.5 19z"/>'}
                  </svg>
                </div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          >
            <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
              <div className="flex flex-col gap-1 bg-black/95 p-2 rounded border border-white/20 font-mono min-w-[120px] shadow-2xl">
                <div className="flex justify-between items-center gap-2 border-b border-white/10 pb-1 mb-1">
                  <span className="text-[10px] font-bold text-white uppercase tracking-tighter">{w.condition}</span>
                  <span className="text-[8px] text-zinc-500 uppercase tracking-widest leading-none" style={{ color: severityColor }}>{w.severity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Thermometer className="w-2.5 h-2.5 text-zinc-500" />
                  <span className="text-[9px] text-zinc-300 font-bold">{w.temperature}°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="w-2.5 h-2.5 text-zinc-500" />
                  <span className="text-[9px] text-zinc-300 font-bold">{w.windSpeed} knots</span>
                </div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

export default function Map({ shipments, selectedId, onSelect, optimizedRoute }: MapProps) {
  const selectedShipment = shipments.find(s => s.id === selectedId) || null;
  const [weather, setWeather] = useState<Weather[]>([]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const url = selectedId ? `/api/weather?shipmentId=${selectedId}` : '/api/weather';
        const res = await fetch(url);
        
        const contentType = res.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        if (res.ok && isJson) {
           const data = await res.json();
           setWeather(data);
        } else if (!isJson) {
           throw new Error('Received non-JSON response');
        }
      } catch (err) {
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
           console.warn("Weather fetch failed (server possibly restarting).");
        } else if (err instanceof Error && err.message.includes('Received non-JSON response')) {
           console.warn("Weather fetch failed (Received non-JSON response, server possibly initializing).");
        } else {
           console.error("Weather fetch failed:", err);
        }
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30000); // 30s updates
    return () => clearInterval(interval);
  }, [selectedId]);

  const getStatusColor = (s: Shipment) => {
    const isHighRisk = s.status === 'At Risk' && (s.risk || 0) > 0.7;
    if (s.status === 'Delayed' || isHighRisk) return '#ef4444'; // Red
    if (s.status === 'At Risk') return '#f59e0b'; // Amber
    if (s.status === 'Rerouted') return '#a855f7'; // Purple
    if (s.status === 'Arrived') return '#38bdf8'; // Blue
    return '#38bdf8'; // Blue
  };

  return (
    <div className="w-full h-full rounded border border-white/5 relative bg-transparent overflow-hidden" id="shipment-map">
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        scrollWheelZoom={true} 
        worldCopyJump={true}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController selectedShipment={selectedShipment} />
        <TrafficDensityLayer />
        <WeatherLayer weather={weather} />

        {shipments.map(s => {
          const isSelected = selectedId === s.id;
          const hasSelection = selectedId !== null;
          const activeRoute = s.newRoute || s.route;
          const routeSegments = splitLines(activeRoute);
          const currentPos = getPointOnPath(activeRoute, s.progress);
          
          let originalSegments: [number, number][][] = [];
          if (s.newRoute && s.route) {
            originalSegments = splitLines(s.route);
          }
          
          const color = getStatusColor(s);

          return (
            <React.Fragment key={s.id}>
              {/* Route lines */}
              {routeSegments.map((segmentPoints, idx) => (
                <React.Fragment key={`route-${s.id}-${idx}`}>
                  {/* Route Highlight Glow */}
                  {isSelected && (
                    <>
                      <Polyline 
                        positions={segmentPoints}
                        pathOptions={{
                          color: color,
                          weight: 24,
                          opacity: 0.05,
                          lineCap: 'round',
                          lineJoin: 'round',
                          className: 'route-glow-outer'
                        }}
                        interactive={false}
                      />
                      <Polyline 
                        positions={segmentPoints}
                        pathOptions={{
                          color: color,
                          weight: 12,
                          opacity: 0.15,
                          lineCap: 'round',
                          lineJoin: 'round',
                          className: 'route-glow-inner'
                        }}
                        interactive={false}
                      />
                    </>
                  )}

                  {/* Main Route Polyline */}
                  <Polyline 
                    positions={segmentPoints}
                    pathOptions={{
                      color: isSelected ? color : '#3f3f46',
                      weight: isSelected ? 4 : 2.5,
                      dashArray: isSelected ? 'none' : '4, 8',
                      lineCap: 'round',
                      lineJoin: 'round',
                      opacity: isSelected ? 1 : (hasSelection ? 0.2 : 0.6),
                      transition: 'opacity 0.3s ease'
                    } as any}
                    eventHandlers={{
                      click: (e) => onSelect(s.id, [e.latlng.lat, e.latlng.lng])
                    }}
                  />

                  {/* Waypoint Dots */}
                  {segmentPoints.map((pt, i) => (
                    <CircleMarker
                      key={`pt-${idx}-${i}`}
                      center={pt}
                      radius={isSelected ? 3.5 : 2.5}
                      pathOptions={{
                        fillColor: '#09090b',
                        fillOpacity: 1,
                        color: isSelected ? color : '#71717a',
                        weight: 1.5,
                        opacity: isSelected ? 1 : (hasSelection ? 0.3 : 0.6)
                      }}
                      eventHandlers={{
                        click: () => onSelect(s.id, [pt[0], pt[1]])
                      }}
                    />
                  ))}
                </React.Fragment>
              ))}

              {/* Original Route if Rerouted */}
              {originalSegments.length > 0 && isSelected && (
                originalSegments.map((origSeg, idx) => (
                  <Polyline 
                    key={`orig-${s.id}-${idx}`}
                    positions={origSeg}
                    pathOptions={{
                      color: '#a1a1aa',
                      weight: 2,
                      dashArray: '2, 4',
                      opacity: 0.3
                    }}
                  />
                ))
              )}

              {/* Focus Pulse for Selected Shipment */}
              {isSelected && currentPos && (
                <Circle 
                  center={[currentPos.lat, currentPos.lng]}
                  radius={120000}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.1,
                    color: color,
                    weight: 1,
                    dashArray: '5, 5',
                    className: 'animate-pulse'
                  }}
                />
              )}

              {/* Next Waypoint Marker */}
              {isSelected && routeSegments.length > 0 && s.progress < 1 && (
                (() => {
                  let next: [number, number] | null = null;
                  if (routeSegments[0].length >= 2) {
                    next = routeSegments[routeSegments.length - 1][routeSegments[routeSegments.length - 1].length - 1]; // Approximation
                  }
                  if (!next) return null;
                  
                  return (
                    <Circle 
                      center={[next[0], next[1]]}
                      radius={30000}
                      pathOptions={{
                        fillColor: color,
                        fillOpacity: 0.8,
                        color: 'white',
                        weight: 2,
                        className: 'animate-pulse'
                      }}
                    >
                      <Tooltip permanent direction="top" offset={[0, -10]} opacity={1}>
                        <div className="flex flex-col items-center bg-black/90 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded text-[8px] font-mono font-bold text-white uppercase tracking-tighter">
                          <span>NEXT WAYPOINT</span>
                        </div>
                      </Tooltip>
                    </Circle>
                  );
                })()
              )}

              {/* Moving Shipment Dot Indicator */}
              {currentPos && (
                      <Marker 
                        position={[currentPos.lat, currentPos.lng]}
                        eventHandlers={{ 
                          click: (e) => {
                            onSelect(s.id, [e.latlng.lat, e.latlng.lng]);
                          } 
                        }}
                        icon={L.divIcon({
                          className: 'custom-div-icon',
                          html: `
                            <div class="relative flex items-center justify-center w-full h-full">
                              ${isSelected ? `<div class="absolute w-8 h-8 rounded-full animate-ping" style="background-color: ${color}44"></div>` : ''}
                              <div class="shipment-dot" style="background: ${color}; border-color: ${isSelected ? 'white' : 'rgba(255,255,255,0.4)'}; box-shadow: 0 0 ${isSelected ? '20px' : '5px'} ${color}, ${isSelected ? '0 0 40px ' + color + '44' : 'none'}; transform: scale(${isSelected ? '1.2' : '1'})"></div>
                              ${isSelected ? `
                                <div class="absolute -top-12 bg-black/90 backdrop-blur-md border border-white/20 px-2 py-1 rounded shadow-2xl z-50 flex flex-col items-center">
                                  <div class="text-[10px] font-bold text-white uppercase font-mono tracking-tighter whitespace-nowrap">${s.id}</div>
                                  <div class="text-[7px] text-zinc-400 font-mono uppercase tracking-widest whitespace-nowrap">${s.status}</div>
                                </div>
                              ` : ''}
                            </div>
                          `,
                          iconSize: [24,24],
                          iconAnchor: [12, 12]
                        })}
                      >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                          <div className="flex flex-col gap-1 bg-black/90 backdrop-blur-md text-white px-3 py-2 rounded border border-white/20 font-mono shadow-2xl min-w-[120px]">
                            <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest">{s.id}</span>
                              <span className={cn("text-[8px] font-bold uppercase", s.status === 'Delayed' ? 'text-red-400' : 'text-blue-400')}>{s.status}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-2.5 h-2.5 text-zinc-500" />
                              <span className="text-[9px] uppercase tracking-wider text-zinc-300">ETA: {new Date(s.eta).toLocaleDateString()}</span>
                            </div>
                            {isSelected && activeRoute.length > 0 && (
                              <div className="flex items-center gap-2 border-t border-white/5 pt-1 mt-1">
                                <Navigation2 className="w-2.5 h-2.5 text-bento-accent fill-current" />
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-zinc-500 uppercase tracking-tighter">NEXT WAYPOINT</span>
                                  <span className="text-[8px] text-white font-bold opacity-80">
                                    {(() => {
                                      const totalSegs = activeRoute.length - 1;
                                      const idx = Math.min(Math.floor(s.progress * totalSegs), totalSegs - 1);
                                      const next = activeRoute[idx + 1];
                                      return next ? `${next.lat.toFixed(2)}°, ${next.lng.toFixed(2)}°` : 'ARRIVING';
                                    })()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </Tooltip>
                        <Popup>
                          <div className="p-1 min-w-[150px] font-sans">
                            <div className="flex justify-between items-center mb-2 gap-4">
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">{s.id}</span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-white/10 border border-white/5 text-zinc-300 font-bold uppercase tracking-widest">{s.status}</span>
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono mb-2 border-b border-white/10 pb-1.5">{s.vessel}</div>
                            <div className="grid grid-cols-2 gap-2 mb-2 bg-black/50 p-2 rounded border border-white/5">
                              <div>
                                <div className="text-[7px] text-zinc-500 uppercase font-mono tracking-widest mb-0.5">ETA</div>
                                <div className="text-[9px] text-white font-bold">{new Date(s.eta).toLocaleDateString()}</div>
                              </div>
                              <div>
                                <div className="text-[7px] text-zinc-500 uppercase font-mono tracking-widest mb-0.5">Risk</div>
                                <div className="text-[9px] text-white font-bold">{s.risk ? Math.round(s.risk * 100) : 0}%</div>
                              </div>
                            </div>
                            <div className="text-[8px] text-zinc-500 font-mono flex items-center justify-between uppercase tracking-widest">
                              <span>{s.origin.split(',')[0]}</span>
                              <span>&rarr;</span>
                              <span>{s.destination.split(',')[0]}</span>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    )}
            </React.Fragment>
          );
        })}

        {/* Optimized Route Preview (Dynamic) */}
        {optimizedRoute && (
          <Polyline 
            positions={optimizedRoute.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: '#a855f7',
              weight: 3,
              dashArray: '6, 12',
              opacity: 0.8
            }}
          />
        )}
      </MapContainer>

      {/* Origin/Destination markers for selected shipment Overlay */}
      {selectedShipment && (
        <div className="absolute top-16 right-4 lg:right-4 z-[1000] p-3 bg-black/80 backdrop-blur-md rounded border border-white/10 shadow-2xl flex flex-col gap-2 min-w-[220px]">
          <div className="text-[10px] font-bold text-white flex items-center gap-2 tracking-widest uppercase font-mono">
            <Navigation2 className="w-3 h-3 text-bento-accent animate-pulse glow-blue" /> VOYAGE PLAN // {selectedShipment.id}
          </div>
          <div className="space-y-1.5 mt-1 border-t border-white/5 pt-2">
            <div className="flex flex-col text-[10px]">
               <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest leading-none">ORIGIN VECTOR</span>
               <span className="text-white font-mono font-bold truncate leading-tight">{selectedShipment.origin}</span>
            </div>
            <div className="flex flex-col text-[10px]">
               <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest leading-none">DEST VECTOR</span>
               <span className="text-white font-mono font-bold truncate leading-tight">{selectedShipment.destination}</span>
            </div>
            {selectedShipment.disruption && (
               <div className="mt-2 text-[8px] text-bento-danger uppercase tracking-[0.2em] bg-bento-danger/10 px-2 py-1 rounded inline-block animation-pulse glow-red font-bold w-fit">
                 ! ANOMALY DETECTED
               </div>
            )}
            {selectedShipment.status === 'Rerouted' && (
               <div className="mt-2 text-[8px] text-purple-400 uppercase tracking-[0.2em] bg-purple-500/10 px-2 py-1 rounded inline-block animation-pulse glow-blue font-bold w-fit">
                 * TRAJECTORY ALTERED
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
