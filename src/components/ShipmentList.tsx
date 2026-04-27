import React from 'react';
import { Package, Truck, AlertTriangle, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { Shipment } from '../types';
import { cn } from '../lib/utils';

interface ShipmentListProps {
  shipments: Shipment[];
  selectedId: string | null;
  onSelect: (id: string, latlng?: [number, number]) => void;
}

export default function ShipmentList({ shipments, selectedId, onSelect }: ShipmentListProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">      
      <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
        {shipments.map((s) => {
          const isSelected = selectedId === s.id;
          const isHighRisk = s.status === 'At Risk' && (s.risk || 0) > 0.7;
          
          const statusColors = {
            'In Transit': 'text-bento-accent',
            'At Risk': isHighRisk ? 'text-bento-danger' : 'text-bento-warning',
            'Delayed': 'text-bento-danger',
            'Optimizing': 'text-bento-warning',
            'Rerouted': 'text-purple-500',
            'Arrived': 'text-zinc-500',
          };

          return (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={cn(
                "group cursor-pointer border-b border-bento-border/50 transition-all duration-200",
                isSelected ? "bg-zinc-900/50" : "hover:bg-zinc-800/30"
              )}
              id={`shipment-${s.id}`}
            >
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-7 h-7 bg-zinc-900 border border-white/10 flex items-center justify-center transition-colors shadow-inner",
                      isSelected ? "border-bento-accent/50 bg-bento-accent/10 glow-blue" : "border-white/5"
                    )}>
                      {(s.status === 'Delayed' || s.status === 'At Risk') ? (
                        <AlertTriangle className={cn(
                          "w-3.5 h-3.5", 
                          (s.status === 'At Risk' && !isHighRisk) ? "text-bento-warning" : "text-bento-danger animate-pulse"
                        )} />
                      ) : (
                        <Package className={cn("w-3.5 h-3.5", isSelected ? "text-bento-accent" : "text-zinc-500")} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-bold text-white tracking-widest leading-none">{s.id}</div>
                        <div className="text-[8px] bg-white/5 px-1 py-0.5 rounded text-zinc-400 font-mono tracking-widest leading-none uppercase">
                          {(s.status === 'Delayed' || s.status === 'At Risk' || s.status === 'Optimizing') ? 'Risk' : 'Stability'}: {Math.round((s.risk || 0) * 100)}%
                        </div>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-mono tracking-tight leading-tight mt-1">{s.vessel}</div>
                    </div>
                  </div>
                  <div className={cn("text-[9px] font-bold px-1.5 py-0.5 border text-bento-accent flex flex-col items-center min-w-[40px]", isSelected ? "bg-bento-accent/10 border-bento-accent/20" : "bg-transparent border-transparent opacity-50")}>
                    <span className="text-[7px] uppercase tracking-tighter opacity-50 mb-0.5">Prog</span>
                    {Math.round(s.progress * 100)}%
                  </div>
                </div>

                <div className="mt-1 space-y-1.5">
                  <div className="flex justify-between items-end">
                    <div className={cn("text-[8px] font-bold tracking-widest uppercase flex items-center gap-1.5", statusColors[s.status as keyof typeof statusColors])}>
                      <div className={cn("w-1.5 h-1.5", (s.status === 'Delayed' || isHighRisk) ? "bg-red-500 animate-pulse glow-red" : "bg-current")} />
                      {s.status}
                    </div>
                    {s.timeToReach && (
                       <div className="text-[9px] font-mono text-zinc-400">
                         ETA: <span className="text-white font-bold">{s.timeToReach}</span>
                       </div>
                    )}
                  </div>
                  <div className="flex justify-between text-[7px] text-zinc-500 font-mono tracking-widest uppercase pb-1">
                    <span>{s.origin.split(',')[0]}</span>
                    <span>{s.destination.split(',')[0]}</span>
                  </div>
                  <div className="w-full h-[3px] bg-white/5 overflow-hidden relative rounded-full">
                    <div 
                      className={cn(
                        "absolute top-0 left-0 h-full transition-all duration-1000",
                        s.status === 'Delayed' ? "bg-bento-danger glow-red" : s.status === 'Rerouted' ? "bg-purple-500 shadow-[0_0_10px_purple]" : "bg-bento-accent glow-blue"
                      )}
                      style={{ width: `${Math.max(5, s.progress * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
