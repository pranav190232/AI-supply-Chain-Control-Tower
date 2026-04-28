/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import ShipmentList from './components/ShipmentList';
import PredictivePanel from './components/PredictivePanel';
import ChatBot from './components/ChatBot';
import { Shipment, Location } from './types';
import { Activity, Clock, Globe2, Layers, Bot, Navigation2, CheckCircle2, Maximize, Minimize, Play, Pause, FastForward, Timer, Package, Navigation } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<Location[] | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [maximizedSection, setMaximizedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simSpeed, setSimSpeed] = useState(1);
  const [isSimPaused, setIsSimPaused] = useState(false);
  const [isPollPaused, setIsPollPaused] = useState(false);

  const shipmentsRef = React.useRef(shipments);
  shipmentsRef.current = shipments;

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const fetchShipments = async (isRetry = false, retryCount = 0) => {
    if (isPollPaused && isRetry) return; // Don't poll if paused locally

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/shipments', {
        signal: abortControllerRef.current.signal
      });
      
      const contentType = res.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!res.ok || !isJson) {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        throw new Error('Received non-JSON response (likely server initialization)');
      }

      const data = await res.json();
      setShipments(data);
      setError(null);
      setSelectedId(prev => {
        if (prev === null && data.length > 0) return data[0].id;
        return prev;
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      // Suppress 'Failed to fetch' error logs during polls (often caused by HMR/server restart)
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
         console.warn("Shipments fetch failed (server possibly restarting).");
      } else if (err instanceof Error && err.message.includes('Received non-JSON response')) {
         console.warn("Shipments fetch failed (Received non-JSON response, server possibly initializing).");
      } else {
         console.error("Error fetching shipments:", err);
      }
      
      // Automatic retry for typical network errors or early startup failures
      // Increase initial retries to 5 to handle slower Vite startup
      if (retryCount < 5 && shipmentsRef.current.length === 0) {
        console.log(`Retrying fetch (${retryCount + 1}/5 in ${2000 + (retryCount * 1000)}ms)...`);
        setTimeout(() => fetchShipments(isRetry, retryCount + 1), 2000 + (retryCount * 1000));
        return;
      }

      // Only set a blocking error if we don't have any shipments yet
      if (shipmentsRef.current.length === 0) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (!isRetry) setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(() => {
      fetchShipments(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPollPaused]);

  useEffect(() => {
    // Initial fetch of simulation config
    fetch('/api/simulation/config')
      .then(async (res) => {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Received non-JSON response');
        }
        return res.json();
      })
      .then(data => {
        setSimSpeed(data.speed);
        setIsSimPaused(data.isPaused);
      })
      .catch((err) => {
        if (err.message !== 'Received non-JSON response') {
           console.error(err);
        }
      });
  }, []);

  const updateSimConfig = async (updates: { speed?: number, isPaused?: boolean }) => {
    try {
      const res = await fetch('/api/simulation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (updates.speed !== undefined) setSimSpeed(data.speed);
      if (updates.isPaused !== undefined) setIsSimPaused(data.isPaused);
    } catch (err) {
      console.error('Failed to update simulation config:', err);
    }
  };

  const handleDecision = async (id: string, action: 'reroute' | 'ignore', scenarioId?: string) => {
    try {
      if (action === 'reroute') {
        const optRes = await fetch('/api/optimize-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipmentId: id, scenarioId })
        });
        const optData = await optRes.json();
        setOptimizedRoute(optData.optimizedRoute);
      } else {
        setOptimizedRoute(null);
      }

      await fetch('/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: id, action, scenarioId })
      });
      
      // Immediate fetch to catch synchronously applied state (e.g. status='Optimizing')
      fetchShipments();

      // Trigger another fetch exactly when the backend 3000ms reroute calculation finishes
      // so the ETA drop updates dynamically and instantly on the UI
      if (action === 'reroute') {
        setTimeout(() => {
          fetchShipments();
        }, 3200);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectedShipment = shipments.find(s => s.id === selectedId) || null;

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] text-bento-accent font-mono gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#020617] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] pointer-events-none" />
        <div className="w-[800px] h-full absolute inset-0 bg-bento-accent/5 pointer-events-none animate-pulse blur-[100px] rounded-full mx-auto" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <Activity className="w-12 h-12 animate-pulse drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
            <div className="absolute inset-0 bg-bento-accent/20 blur-xl rounded-full pt-1" />
          </div>
          <div className="text-center space-y-2">
            <div className="tracking-[0.4em] text-[11px] uppercase font-bold text-white glow-blue">Initializing Core Uplink</div>
            <div className="tracking-[0.2em] text-[9px] uppercase text-zinc-500 animate-pulse">Syncing Orbital Telemetry Network...</div>
          </div>
          
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden mt-4">
             <div className="h-full bg-bento-accent w-1/3 animate-[spin_2s_linear_infinite] rounded-full glow-blue" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bento-bg text-bento-danger font-mono p-10 text-center gap-4">
        <Activity className="w-12 h-12" />
        <div className="text-xl font-bold uppercase tracking-widest">Neural Link Failure</div>
        <div className="text-xs text-zinc-500 max-w-md uppercase leading-relaxed">
          The control tower was unable to establish a secure data uplink.
          <br/>
          Error: <span className="text-white">{error}</span>
        </div>
        <button 
          onClick={() => { setLoading(true); fetchShipments(); }}
          className="mt-6 px-8 py-2.5 bg-bento-danger/10 border border-bento-danger/30 hover:bg-bento-danger text-white text-[10px] uppercase tracking-[0.2em] transition-all rounded-sm font-bold"
        >
          FORCE_UPLINK_RESYNC
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bento-bg overflow-hidden selection:bg-bento-accent/30">
      <header className="h-[50px] px-6 border-b border-white/5 flex items-center justify-between bg-black z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-bento-success rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
            <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
              LOGI-CORE <span className="text-bento-accent">NEXUS</span>
            </h1>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="text-[9px] font-mono tracking-widest text-zinc-500">
            SYS_OVR_v2.4.1
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-3 py-1 rounded backdrop-blur-sm self-center h-8">
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 pr-3 border-r border-white/10">
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-tighter">Simulation</span>
                <button 
                  onClick={() => updateSimConfig({ isPaused: !isSimPaused })}
                  className={cn(
                    "p-1 rounded transition-all",
                    isSimPaused ? "text-bento-warning bg-bento-warning/10" : "text-bento-success bg-bento-success/10 hover:bg-bento-success/20"
                  )}
                  title={isSimPaused ? "Resume Global Simulation" : "Pause Global Simulation"}
                >
                  {isSimPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                </button>
                <div className="flex bg-black/40 p-0.5 rounded border border-white/5 gap-0.5">
                  {[1, 5, 20].map(speed => (
                    <button
                      key={speed}
                      onClick={() => updateSimConfig({ speed })}
                      className={cn(
                        "text-[8px] font-mono w-5 h-4 flex items-center justify-center rounded-xs transition-all",
                        simSpeed === speed ? "bg-bento-accent text-white" : "text-zinc-500 hover:text-white"
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pl-1">
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-tighter">Live Uplink</span>
                <button 
                  onClick={() => setIsPollPaused(!isPollPaused)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest border transition-all",
                    isPollPaused 
                      ? "bg-zinc-800 text-zinc-400 border-zinc-700" 
                      : "bg-bento-accent/10 text-bento-accent border-bento-accent/30 animate-pulse"
                  )}
                >
                  <Timer className="w-2.5 h-2.5" />
                  {isPollPaused ? "Paused" : "Active"}
                </button>
              </div>
           </div>
        </div>
        
        <div className="hidden md:flex items-center gap-6 text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1 rounded-sm shadow-inner">
            ACTIVE UNITS: <span className="text-white font-bold">{shipments.length || '...'}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1 rounded-sm shadow-inner">
            DELAY RISK: <span className={cn(
              "font-bold",
              shipments.some(s => s.status === 'Delayed' || s.status === 'At Risk') ? "text-bento-danger animate-pulse glow-red" : "text-bento-success"
            )}>
              {shipments.length > 0 ? `${Math.round((shipments.filter(s => s.status === 'Delayed' || s.status === 'At Risk').length / shipments.length) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1 rounded-sm shadow-inner">
            SYS NODE: <span className="text-bento-accent font-bold">ONLINE</span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-6 ml-2">
            <span className="text-white/50">{new Date().toISOString().split('T')[0]}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-4 grid-rows-[minmax(0,1fr)_1fr_1fr_min-content] gap-3 p-3 min-h-0 bg-[#020617]">
        {/* Map Area - Grid Default with Optional Overlay */}
        <div className={cn(
          "bento-card relative backdrop-blur-md shadow-[inset_0_1px_rgba(255,255,255,0.1)] border border-white/5 transition-all duration-500 ease-in-out p-0",
          isMapFullscreen 
            ? "fixed inset-0 z-[100] bg-[#020617] !col-auto !row-auto !border-none !rounded-none" 
            : "col-span-3 row-span-2",
          maximizedSection && !isMapFullscreen && "opacity-20 scale-[0.98] blur-[2px] pointer-events-none"
        )}>
          <div className="absolute top-4 left-4 z-[9999] pointer-events-none space-y-1">
            <h3 className="text-white text-[11px] uppercase font-bold tracking-widest font-mono shadow-sm bg-black/40 px-2 py-1 rounded backdrop-blur-md border border-white/5 w-fit">Live Fleet Vectors</h3>
            <div className="text-[8px] text-bento-accent font-mono uppercase tracking-widest flex items-center gap-1.5 glow-blue bg-bento-accent/10 w-fit px-1.5 py-0.5 rounded border border-bento-accent/20">
              <div className="w-1.5 h-1.5 rounded-full bg-bento-accent animate-pulse" /> TARGETING: ONLINE
            </div>
          </div>
          
          <button 
            onClick={() => {
              setIsMapFullscreen(p => !p);
              setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
            }}
            className="absolute top-4 right-4 z-[9999] p-2 bg-black/50 backdrop-blur-md rounded border border-white/10 text-white hover:bg-white/10 transition-all cursor-pointer shadow-xl flex items-center gap-2"
          >
            {isMapFullscreen ? <><Minimize className="w-3.5 h-3.5" /> <span className="text-[9px] font-mono tracking-widest uppercase hidden md:inline">Collapse</span></> : <><Maximize className="w-3.5 h-3.5" /> <span className="text-[9px] font-mono tracking-widest uppercase hidden md:inline">Expand</span></>}
          </button>

          <div className="flex-1 rounded overflow-hidden bg-transparent data-grid h-full w-full">
            <Map 
              shipments={shipments} 
              selectedId={selectedId} 
              onSelect={(id) => {
                setSelectedId(id);
                setOptimizedRoute(null);
              }}
              optimizedRoute={optimizedRoute}
            />
          </div>
        </div>

        {/* Fleet Card */}
        <div className={cn(
          "bento-card flex flex-col bg-black/40 transition-all duration-700 ease-in-out",
          maximizedSection === 'fleet' 
            ? "fixed inset-0 m-4 md:m-12 z-[100] bg-black/95 !col-auto !row-auto shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/20" 
            : "col-span-1 row-span-2",
          maximizedSection && maximizedSection !== 'fleet' && "opacity-20 scale-[0.98] blur-[2px] pointer-events-none"
        )}>
          <div className="bento-title flex justify-between items-center group shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3 text-bento-accent" /> ACTIVE FLEET
            </div>
            <button 
              onClick={() => setMaximizedSection(maximizedSection === 'fleet' ? null : 'fleet')}
              className="p-1 hover:bg-white/10 rounded cursor-pointer transition-colors"
            >
              {maximizedSection === 'fleet' ? <Minimize className="w-3 h-3 text-bento-accent" /> : <Maximize className="w-3 h-3 text-zinc-600 group-hover:text-white" />}
            </button>
          </div>
          <div className="flex-1 overflow-hidden min-h-0 bg-black/20">
            <ShipmentList 
              shipments={shipments} 
              selectedId={selectedId} 
              onSelect={(id) => {
                setSelectedId(id);
                setOptimizedRoute(null);
              }} 
            />
          </div>
        </div>
        
        {/* Alerts Card */}
        <div className={cn(
          "bento-card flex flex-col border-bento-danger/30 relative overflow-hidden transition-all duration-700 ease-in-out",
          maximizedSection === 'alerts'
            ? "fixed inset-0 m-4 md:m-12 z-[100] bg-black/95 !col-auto !row-auto shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-bento-danger/50"
            : "col-span-1 row-start-3",
          maximizedSection && maximizedSection !== 'alerts' && "opacity-20 scale-[0.98] blur-[2px] pointer-events-none"
        )}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-bento-danger/5 rounded-full blur-[60px] pointer-events-none" />
          <div className="bento-title text-bento-danger flex justify-between items-center group shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 animate-pulse" /> CRITICAL DISRUPTIONS
            </div>
            <button 
              onClick={() => setMaximizedSection(maximizedSection === 'alerts' ? null : 'alerts')}
              className="p-1 hover:bg-white/10 rounded cursor-pointer transition-colors"
            >
              {maximizedSection === 'alerts' ? <Minimize className="w-3 h-3 text-bento-danger" /> : <Maximize className="w-3 h-3 text-zinc-600 group-hover:text-white" />}
            </button>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto z-10 relative pr-1 pb-1 flex-1 min-h-0 bg-black/20 p-2">
            {shipments.filter(s => s.disruption).length > 0 ? (
              shipments.filter(s => s.disruption).map(s => (
                <div 
                  key={`disruption-${s.id}`}
                  className={cn(
                    "p-3 rounded border border-white/5 shadow-inner transition-all hover:bg-white/5 cursor-pointer",
                    selectedId === s.id && "ring-1 ring-bento-danger bg-bento-danger/5",
                    s.disruption?.severity === 'critical' 
                      ? "bg-bento-danger/10 border-bento-danger/30" 
                      : "bg-bento-warning/10 border-bento-warning/30"
                  )}
                  onClick={() => setSelectedId(s.id)}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div className={cn(
                      "text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                      s.disruption?.severity === 'critical' ? "text-bento-danger drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "text-bento-warning drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", s.disruption?.severity === 'critical' ? "bg-bento-danger glow-red" : "bg-bento-warning")} />
                      {s.disruption?.type}
                    </div>
                    <div className="text-[9px] bg-black/40 text-zinc-300 px-1.5 py-0.5 rounded-sm font-mono tracking-widest border border-white/10 shadow-inner">
                      {s.id}
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-300 leading-relaxed font-mono">
                    {`> `}{s.disruption?.description}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 py-4">
                <CheckCircle2 className="w-5 h-5 opacity-20" />
                <div className="text-[9px] font-mono uppercase tracking-[0.2em]">Network Nominal</div>
              </div>
            )}
          </div>
        </div>

        {/* Manifest Detail Card */}
        <div className={cn(
          "bento-card flex flex-col transition-all duration-700 ease-in-out",
          maximizedSection === 'manifest'
            ? "fixed inset-0 m-4 md:m-12 z-[100] bg-black/95 !col-auto !row-auto shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/20"
            : "col-span-1 row-start-3",
          maximizedSection && maximizedSection !== 'manifest' && "opacity-20 scale-[0.98] blur-[2px] pointer-events-none"
        )}>
           <div className="bento-title flex justify-between items-center group shrink-0">
             <div className="flex items-center gap-2">
               <Activity className="w-3 h-3 text-bento-accent animate-pulse" /> UNIT MANIFEST
             </div>
             <button 
                onClick={() => setMaximizedSection(maximizedSection === 'manifest' ? null : 'manifest')}
                className="p-1 hover:bg-white/10 rounded cursor-pointer transition-colors"
              >
                {maximizedSection === 'manifest' ? <Minimize className="w-3 h-3 text-bento-accent" /> : <Maximize className="w-3 h-3 text-zinc-600 group-hover:text-white" />}
              </button>
           </div>
           <div className={cn("flex-1 overflow-y-auto scrollbar-hide min-h-0 bg-black/20", maximizedSection === 'manifest' ? "py-6 px-6" : "py-3 px-3")}>
              {selectedShipment ? (
                <div className={cn("space-y-3 mx-auto", maximizedSection === 'manifest' ? "max-w-3xl" : "w-full")}>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/40 p-3 rounded border border-white/5 shadow-2xl flex flex-col justify-center">
                        <div className={cn("text-zinc-500 uppercase font-mono tracking-widest", maximizedSection === 'manifest' ? "text-[10px] mb-2" : "text-[8px] mb-1")}>Carrier</div>
                        <div className={cn("text-white font-bold tracking-wider truncate", maximizedSection === 'manifest' ? "text-[20px]" : "text-[12px]")} title={selectedShipment.carrier}>{selectedShipment.carrier}</div>
                      </div>
                      <div className="bg-black/40 p-3 rounded border border-white/5 shadow-2xl flex flex-col justify-center overflow-hidden">
                        <div className={cn("text-zinc-500 uppercase font-mono tracking-widest", maximizedSection === 'manifest' ? "text-[10px] mb-2" : "text-[8px] mb-1")}>Vessel Name</div>
                        <div className={cn("text-white font-bold tracking-wider truncate break-all", maximizedSection === 'manifest' ? "text-[20px]" : "text-[12px]")} title={selectedShipment.vessel}>{selectedShipment.vessel}</div>
                      </div>
                   </div>
                   <div className={cn("bg-black/40 w-full rounded border border-white/5 shadow-2xl flex justify-between items-center group relative overflow-hidden", maximizedSection === 'manifest' ? "p-6" : "p-3 flex-col items-start gap-2")}>
                      <div className="absolute inset-0 bg-gradient-to-r from-bento-accent/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div>
                        <div className={cn("text-zinc-500 uppercase font-mono tracking-widest", maximizedSection === 'manifest' ? "text-[10px] mb-2" : "text-[8px] mb-1")}>Active Cargo Profile</div>
                        <div className={cn("text-bento-accent font-bold tracking-wider uppercase drop-shadow-[0_0_10px_rgba(56,189,248,0.3)] font-mono", maximizedSection === 'manifest' ? "text-[22px]" : "text-[13px]")}>{selectedShipment.cargoType}</div>
                      </div>
                      <div className={cn("font-mono text-zinc-400 bg-white/5 rounded border border-white/10 shrink-0", maximizedSection === 'manifest' ? "text-[14px] px-4 py-2" : "text-[9px] px-2 py-1 relative z-10 w-full truncate")}>
                         UID: {selectedShipment.id}
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div className="bg-black/40 p-3 rounded border border-white/5 shadow-2xl overflow-hidden">
                        <div className={cn("text-zinc-500 uppercase font-mono tracking-widest flex items-center gap-2", maximizedSection === 'manifest' ? "text-[10px] mb-2" : "text-[8px] mb-1")}><Navigation className="w-3 h-3" /> Origin Point</div>
                        <div className={cn("text-zinc-300 font-mono tracking-tight leading-relaxed uppercase truncate", maximizedSection === 'manifest' ? "text-[15px]" : "text-[10px]")} title={selectedShipment.origin}>{selectedShipment.origin}</div>
                     </div>
                     <div className="bg-black/40 p-3 rounded border border-white/5 shadow-2xl overflow-hidden">
                        <div className={cn("text-zinc-500 uppercase font-mono tracking-widest flex items-center gap-2", maximizedSection === 'manifest' ? "text-[10px] mb-2" : "text-[8px] mb-1")}><Navigation className="w-3 h-3 rotate-90" /> Destination</div>
                        <div className={cn("text-zinc-300 font-mono tracking-tight leading-relaxed uppercase truncate", maximizedSection === 'manifest' ? "text-[15px]" : "text-[10px]")} title={selectedShipment.destination}>{selectedShipment.destination}</div>
                     </div>
                   </div>
                   {selectedShipment.disruption && (
                     <div className={cn("bg-bento-danger/10 rounded border border-bento-danger/30 shadow-2xl relative overflow-hidden", maximizedSection === 'manifest' ? "p-5" : "p-3")}>
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(239,68,68,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[slide_1s_linear_infinite]" />
                        <div className={cn("text-bento-danger uppercase font-mono tracking-widest flex items-center gap-2 font-bold animate-pulse relative z-10", maximizedSection === 'manifest' ? "text-[11px] mb-3" : "text-[9px] mb-2")}>
                          <Activity className="w-3 h-3" /> System Alert: Active Disruption
                        </div>
                        <div className={cn("text-red-200/90 font-mono italic relative z-10", maximizedSection === 'manifest' ? "text-[14px]" : "text-[10px] leading-tight line-clamp-2")}>
                          {`> `}{selectedShipment.disruption.description}
                        </div>
                     </div>
                   )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-30 py-12">
                  <Package className="w-16 h-16 stroke-[0.5px] animate-pulse" />
                  <div className={cn("font-mono uppercase tracking-[0.4em] text-center", maximizedSection === 'manifest' ? "text-[14px]" : "text-[10px]")}>Establish Unit<br/>Uplink To Continue</div>
                </div>
              )}
           </div>
        </div>

        {/* Predictive & Optimization Engine Combined */}
        <div className={cn(
          "bento-card flex flex-col transition-all duration-700 ease-in-out",
          maximizedSection === 'optimization'
            ? "fixed inset-0 m-4 md:m-12 z-[100] bg-black/95 !col-auto !row-auto shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/20"
            : "col-span-1 row-start-3",
          maximizedSection && maximizedSection !== 'optimization' && "opacity-20 scale-[0.98] blur-[2px] pointer-events-none"
        )}>
          <div className="bento-title flex justify-between items-center group shrink-0">
             <div className="flex items-center gap-2">
               <Navigation2 className="w-3 h-3 text-bento-accent" /> PREDICTIVE OPTIMIZATION
             </div>
             <button 
                onClick={() => setMaximizedSection(maximizedSection === 'optimization' ? null : 'optimization')}
                className="p-1 hover:bg-white/10 rounded cursor-pointer transition-colors"
              >
                {maximizedSection === 'optimization' ? <Minimize className="w-3 h-3 text-bento-accent" /> : <Maximize className="w-3 h-3 text-zinc-600 group-hover:text-white" />}
              </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 bg-black/20">
             <PredictivePanel 
                shipment={selectedShipment} 
                onDecision={handleDecision}
                variant="full"
             />
          </div>
        </div>

        {/* AI Assistant */}
        <div className={cn(
          "bento-card flex flex-col border-white/5 bg-gradient-to-b from-[#0b101e]/80 to-transparent transition-all duration-700 ease-in-out",
          maximizedSection === 'ai'
            ? "fixed inset-0 m-4 md:m-12 z-[100] bg-[#020617]/95 !col-auto !row-auto shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/20"
            : "col-span-1 row-start-3",
          maximizedSection && maximizedSection !== 'ai' && "opacity-20 scale-[0.98] blur-[2px] pointer-events-none"
        )}>
          <div className="bento-title flex justify-between items-center group shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-3 h-3 text-bento-accent" /> LOGISTICS SYS_AI
            </div>
            <button 
                onClick={() => setMaximizedSection(maximizedSection === 'ai' ? null : 'ai')}
                className="p-1 hover:bg-white/10 rounded cursor-pointer transition-colors"
              >
                {maximizedSection === 'ai' ? <Minimize className="w-3 h-3 text-bento-accent" /> : <Maximize className="w-3 h-3 text-zinc-600 group-hover:text-white" />}
              </button>
          </div>
          <div className="flex-1 min-h-0">
            <ChatBot shipments={shipments} inline />
          </div>
        </div>

        {/* Status Deck (Tiny Footer row item) */}
        <div className="col-span-4 row-start-4 flex items-center justify-between border-t border-white/5 pt-2 px-1 gap-4">
           <div className="flex gap-4 font-mono text-[9px] text-zinc-600 tracking-wider">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-bento-success rounded-full opacity-60"/> [SYNC] Telemetry verified</div>
              <div className="flex items-center gap-1.5 hidden md:flex"><div className="w-1.5 h-1.5 bg-bento-success rounded-full opacity-60"/> [AUTH] AIS_CORE successful</div>
           </div>
           <div className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded">
              Active Nodes: <span className="text-white font-bold">{shipments.length}</span>
           </div>
        </div>
      </main>
    </div>
  );
}
