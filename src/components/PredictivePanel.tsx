import React, { useState } from 'react';
import { Brain, Zap, ArrowRight, CheckCircle2, Navigation2, Wind, RefreshCw, Layers, Database, BarChart3, Cloud, Car, Building2, AlertTriangle, Columns2, Scale, X } from 'lucide-react';
import { Shipment, Prediction, Optimization, Scenario } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PredictivePanelProps {
  shipment: Shipment | null;
  onDecision: (id: string, action: 'reroute' | 'ignore', scenarioId?: string) => void;
  variant?: 'stats' | 'route' | 'full';
}

export default function PredictivePanel({ shipment, onDecision, variant = 'full' }: PredictivePanelProps) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [comparedScenarios, setComparedScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);

  const runAnalysis = async () => {
    if (!shipment) return;
    setLoading(true);
    setShowScenarios(false);
    setComparedScenarios([]);
    
    try {
      const predRes = await fetch('/api/predict-delay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: shipment.id })
      });
      const predData = await predRes.json();
      setPrediction(predData);

      if (predData.probability > 0.6) {
        const optRes = await fetch('/api/optimize-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipmentId: shipment.id })
        });
        const optData = await optRes.json();
        setOptimization(optData);
      } else {
        setOptimization(null);
      }
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
         console.warn("Prediction fetch failed (server possibly restarting).");
      } else if (err instanceof SyntaxError && err.message.includes('Unexpected token')) {
         console.warn("Prediction fetch failed (Received non-JSON response, server possibly initializing).");
      } else {
         console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchScenarios = async () => {
    if (!shipment) return;
    setLoading(true);
    try {
      const res = await fetch('/api/routing-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: shipment.id })
      });
      const data = await res.json();
      setScenarios(data);
      setShowScenarios(true);
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
         console.warn("Scenarios fetch failed (server possibly restarting).");
      } else if (err instanceof SyntaxError && err.message.includes('Unexpected token')) {
         console.warn("Scenarios fetch failed (Received non-JSON response, server possibly initializing).");
      } else {
         console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCompare = (scenario: Scenario) => {
    setComparedScenarios(prev => {
      const isAlreadyAdded = prev.find(s => s.id === scenario.id);
      if (isAlreadyAdded) {
        return prev.filter(s => s.id !== scenario.id);
      }
      if (prev.length >= 2) {
        return [prev[1], scenario];
      }
      return [...prev, scenario];
    });
  };

  React.useEffect(() => {
    if (!shipment) {
      setPrediction(null);
      setOptimization(null);
      return;
    }
    runAnalysis();
  }, [shipment?.id, shipment?.status]);

  if (!shipment) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center">
        <div className="text-[10px] font-mono tracking-[0.2em] text-zinc-600 flex flex-col items-center gap-3">
          <Wind className="w-8 h-8 opacity-20" />
          AWAITING TELEMETRY LINK
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* HUD Header */}
      {variant === 'full' && (
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2 text-bento-text-s text-[10px] uppercase font-mono tracking-widest">
            <Brain className="w-4 h-4 text-bento-accent animate-pulse" />
            <span className="text-zinc-400">Node Analysis: {shipment.id}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <RefreshCw className="w-5 h-5 text-bento-accent animate-spin mb-2" />
          <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 animate-pulse">Running Monte Carlo Simulations...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 pr-1 pb-4">
          {(variant === 'full' || variant === 'stats') && prediction && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-bento-warning/5 rounded-full blur-[20px] pointer-events-none" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1">Delay Est.</div>
                    <div className="text-xl font-bold font-mono text-white">{prediction.estimatedDelayHours}<span className="text-[10px] text-zinc-500 ml-1">HRS</span></div>
                  </div>
                  <div>
                    <div className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1">Confidence</div>
                    <div className={cn(
                      "text-xl font-bold font-mono",
                      prediction.probability > 0.6 ? "text-bento-warning" : "text-bento-success"
                    )}>
                      {Math.round(prediction.probability * 100)}%
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-zinc-400 border-t border-white/5 pt-2 mt-2 leading-relaxed italic">
                  "{prediction.reason}"
                </div>

                {prediction.etaForecast && (
                  <div className="col-span-2 mt-4 pt-3 border-t border-white/5 space-y-3">
                    <div className="flex flex-col gap-1 mb-2">
                      <div className="text-[8px] text-zinc-500 uppercase font-mono tracking-[0.2em]">Forecast Variance</div>
                      <div className="text-[9px] text-bento-accent font-bold font-mono tracking-widest bg-bento-accent/10 px-2 py-0.5 rounded border border-bento-accent/10 w-fit">ETA PROBABILITY MODEL</div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 p-2 rounded border border-white/5">
                        <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">Optimistic</div>
                        <div className="text-[10px] font-bold text-white font-mono">{prediction.etaForecast.min}</div>
                      </div>
                      <div className="bg-bento-accent/10 p-2 rounded border border-bento-accent/30">
                        <div className="text-[8px] text-bento-accent uppercase font-mono mb-1">Expected</div>
                        <div className="text-[10px] font-bold text-white font-mono">{prediction.etaForecast.expected}</div>
                      </div>
                      <div className="bg-white/5 p-2 rounded border border-white/5">
                        <div className="text-[8px] text-zinc-500 uppercase font-mono mb-1">Pessimistic</div>
                        <div className="text-[10px] font-bold text-bento-warning font-mono">{prediction.etaForecast.max}</div>
                      </div>
                    </div>

                    <div className="space-y-4 mt-4">
                      <div className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1 shadow-sm flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" /> Impacting Factors
                      </div>
                      {prediction.etaForecast.factors.map((factor, idx) => {
                        const Icon = factor.type === 'weather' ? Cloud : 
                                     factor.type === 'traffic' ? Car : Building2;
                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center justify-between text-[9px] font-mono">
                              <div className="flex items-center gap-2 w-[70%]">
                                <Icon className={cn(
                                  "w-3 h-3",
                                  factor.impact === 'SEVERE' || factor.impact === 'HIGH' ? "text-bento-danger" :
                                  factor.impact === 'MODERATE' ? "text-bento-warning" : "text-zinc-500"
                                )} />
                                <span className="text-zinc-400 truncate" title={factor.description}>
                                  {factor.description}
                                </span>
                              </div>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded uppercase font-bold text-[8px]",
                                factor.impact === 'SEVERE' || factor.impact === 'HIGH' ? "text-bento-danger border border-bento-danger/20" :
                                factor.impact === 'MODERATE' ? "text-bento-warning border border-bento-warning/20" : "text-zinc-500 border border-white/5"
                              )}>
                                {factor.impact}
                              </span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ 
                                  width: factor.impact === 'SEVERE' ? '100%' : 
                                         factor.impact === 'HIGH' ? '75%' : 
                                         factor.impact === 'MODERATE' ? '45%' : '15%' 
                                }}
                                transition={{ duration: 1, delay: idx * 0.1 }}
                                className={cn(
                                  "h-full rounded-full",
                                  factor.impact === 'SEVERE' || factor.impact === 'HIGH' ? "bg-bento-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]" :
                                  factor.impact === 'MODERATE' ? "bg-bento-warning shadow-[0_0_8px_rgba(245,158,11,0.4)]" : "bg-zinc-500"
                                )}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {(variant === 'full' || variant === 'route') && optimization && !loading && (
            <motion.section 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-2"
            >
              <div className="bg-black/50 border border-purple-500/20 rounded-xl overflow-hidden relative shadow-lg">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Navigation2 className="w-3 h-3 text-bento-accent" />
                    <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Intelligence Output</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                      <div className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-0.5">Rec Delta</div>
                      <div className={cn("font-bold font-mono text-xs", optimization.impact.timeDelta.includes('-') ? "text-purple-400" : "text-bento-warning")}>
                        {optimization.impact.timeDelta}
                      </div>
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                      <div className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-0.5">Cons. Eff.</div>
                      <div className="text-purple-400 font-bold font-mono text-xs">{optimization.impact.efficiency}</div>
                    </div>
                  </div>

                  <div className="bg-purple-900/20 border border-purple-500/10 p-2 rounded text-[9px] text-purple-300 leading-relaxed font-mono">
                    {`> `}{optimization.impact.description}
                  </div>
                </div>

                 <button 
                  onClick={() => onDecision(shipment.id, 'reroute')}
                  className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-[10px] font-bold uppercase tracking-[0.1em] transition-all border-t border-purple-500/20 flex items-center justify-center gap-1.5 active:scale-95"
                >
                  EXECUTE OVERRIDE <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </motion.section>
          )}

          {optimization && !loading && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2"
            >
              {!showScenarios ? (
                <button 
                  onClick={fetchScenarios}
                  className="w-full py-2 border border-dashed border-white/10 hover:border-bento-accent/50 hover:bg-bento-accent/5 text-zinc-500 hover:text-bento-accent text-[9px] font-mono uppercase tracking-[0.2em] transition-all rounded-lg flex items-center justify-center gap-2"
                >
                  <Layers className="w-3 h-3" /> Explore Alternative Scenarios
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] text-zinc-500 uppercase font-mono tracking-widest flex items-center gap-2">
                      <Database className="w-3 h-3 text-bento-accent" /> Scenario Matrix
                    </div>
                    <button 
                      onClick={() => setShowScenarios(false)}
                      className="text-[8px] text-zinc-600 hover:text-white uppercase font-mono tracking-widest"
                    >
                      [Close]
                    </button>
                  </div>

                  <AnimatePresence>
                    {comparedScenarios.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-bento-accent/5 border border-bento-accent/20 rounded-xl p-3 mb-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] text-bento-accent font-bold uppercase tracking-widest flex items-center gap-2">
                            <Scale className="w-4 h-4" /> Side-by-Side Analysis
                          </div>
                          <button 
                            onClick={() => setComparedScenarios([])}
                            className="text-[8px] text-zinc-500 hover:text-white"
                          >
                            CLEAR ALL
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {comparedScenarios.map((s, idx) => (
                            <div key={idx} className={cn("space-y-2", idx === 0 && comparedScenarios.length > 1 && "border-r border-white/10 pr-4")}>
                              <div className="flex justify-between items-start">
                                <div className="text-[10px] font-bold text-white uppercase font-mono truncate">{s.name}</div>
                                <button 
                                  onClick={() => onDecision(shipment.id, 'reroute', s.id)}
                                  className="text-[8px] px-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-500 hover:text-white transition-all font-bold"
                                >
                                  EXECUTE
                                </button>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-mono">
                                  <span className="text-zinc-500">ETA DELTA</span>
                                  <span className={cn(s.timeDelta.includes('-') ? "text-purple-400" : "text-bento-warning")}>{s.timeDelta}</span>
                                </div>
                                <div className="flex justify-between text-[8px] font-mono">
                                  <span className="text-zinc-500">EFFICIENCY</span>
                                  <span className="text-bento-accent">{s.efficiency}</span>
                                </div>
                                <div className="flex justify-between text-[8px] font-mono">
                                  <span className="text-zinc-500">RISK</span>
                                  <span className={cn(
                                    s.riskLevel === 'Low' ? "text-bento-success" :
                                    s.riskLevel === 'Medium' ? "text-bento-warning" : "text-bento-danger"
                                  )}>{s.riskLevel}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {comparedScenarios.length === 1 && (
                            <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded font-mono text-[8px] text-zinc-600 uppercase tracking-widest text-center p-2">
                              Select second variant to compare
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid gap-2">
                    {scenarios.length > 0 && (
                      <div className="h-32 w-full bg-black/20 rounded-lg p-2 border border-white/5 mb-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={scenarios.map(s => ({ 
                            name: s.name, 
                            time: parseFloat(s.timeDelta.replace(' HRS', '')),
                            efficiency: parseFloat(s.efficiency.replace('%', '')),
                            color: s.timeDelta.includes('-') ? '#a855f7' : '#f59e0b'
                          }))}>
                            <XAxis dataKey="name" hide />
                            <Tooltip 
                              cursor={{fill: 'transparent'}}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-zinc-900 border border-white/10 p-2 rounded shadow-xl font-mono text-[9px] min-w-[120px]">
                                      <div className="text-zinc-500 uppercase mb-2 border-b border-white/5 pb-1">{payload[0].payload.name}</div>
                                      <div className="space-y-1">
                                        <div className="flex justify-between gap-4">
                                          <span className="text-zinc-400">DELTA:</span>
                                          <span className={cn("font-bold", payload[0].payload.time < 0 ? "text-purple-400" : "text-bento-warning")}>
                                            {payload[0].payload.time > 0 ? `+${payload[0].payload.time}` : payload[0].payload.time} HRS
                                          </span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                          <span className="text-zinc-400">EFFICIENCY:</span>
                                          <span className="text-bento-accent font-bold">+{payload[0].payload.efficiency}%</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="time" radius={[2, 2, 0, 0]} name="Time Delta">
                              {scenarios.map((entry, index) => (
                                <Cell key={`cell-time-${index}`} fill={entry.timeDelta.includes('-') ? '#a855f7' : '#f59e0b'} />
                              ))}
                            </Bar>
                            <Bar dataKey="efficiency" radius={[2, 2, 0, 0]} name="Efficiency">
                              {scenarios.map((entry, index) => (
                                <Cell key={`cell-eff-${index}`} fill="#38bdf8" />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {scenarios.map((s) => (
                      <motion.div 
                        key={s.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "bg-black/30 border rounded-lg p-2.5 transition-all group relative",
                          comparedScenarios.find(cs => cs.id === s.id) ? "border-bento-accent shadow-[0_0_10px_rgba(56,189,248,0.1)]" : "border-white/5 hover:border-bento-accent/30"
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="text-[10px] font-bold text-white uppercase font-mono">{s.name}</div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCompare(s);
                              }}
                              className={cn(
                                "text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider transition-all",
                                comparedScenarios.find(cs => cs.id === s.id) 
                                  ? "bg-bento-accent text-zinc-900" 
                                  : "text-zinc-500 border border-white/10 hover:border-bento-accent/50 hover:text-bento-accent"
                              )}
                            >
                              {comparedScenarios.find(cs => cs.id === s.id) ? 'Selected' : 'Compare'}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDecision(shipment.id, 'reroute', s.id);
                              }}
                              className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-all shadow-lg active:scale-95"
                            >
                              EXECUTE OVERRIDE
                            </button>
                            <div className={cn(
                              "text-[8px] px-1 rounded font-mono uppercase border",
                              s.riskLevel === 'Low' ? "bg-bento-success/20 text-bento-success border-bento-success/20" :
                              s.riskLevel === 'Medium' ? "bg-bento-warning/20 text-bento-warning border-bento-warning/20" : "bg-bento-danger/20 text-bento-danger border-bento-danger/20"
                            )}>
                              {s.riskLevel}
                            </div>
                          </div>
                        </div>
                        <div className="text-[9px] text-zinc-500 leading-relaxed mb-2 line-clamp-1">{s.description}</div>
                        <div className="flex gap-3">
                          <div className="text-[8px] font-mono">
                            <span className="text-zinc-600 uppercase tracking-tighter">Time:</span> <span className={cn(s.timeDelta.includes('-') ? "text-purple-400" : "text-bento-warning")}>{s.timeDelta}</span>
                          </div>
                          <div className="text-[8px] font-mono">
                            <span className="text-zinc-600 uppercase tracking-tighter">Eff:</span> <span className="text-bento-accent">{s.efficiency}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {variant === 'route' && !optimization && !loading && (
            <div className="h-full flex items-center justify-center border border-dashed border-white/5 bg-white/5 rounded-xl p-4 gap-2">
              <CheckCircle2 className="w-5 h-5 text-bento-success opacity-50" />
              <div className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Trajectory Optimal</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
