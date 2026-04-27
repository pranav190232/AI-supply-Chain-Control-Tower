import React from 'react';
import { Box, Map as MapIcon, BarChart3, Settings, ShieldCheck, Database, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const items = [
    { icon: MapIcon, label: 'Control Center', active: true },
    { icon: Box, label: 'Shipments', active: false },
    { icon: BarChart3, label: 'Analytics', active: false },
    { icon: ShieldCheck, label: 'Security', active: false },
    { icon: Database, label: 'Data Nodes', active: false },
    { icon: Settings, label: 'System Config', active: false },
  ];

  return (
    <div className="w-16 md:w-60 flex flex-col h-full bg-[#050505] border-r border-zinc-800 shrink-0">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <span className="hidden md:block font-serif italic text-lg text-white font-bold tracking-tight">Vanguard</span>
      </div>

      <div className="flex-1 py-6 flex flex-col gap-2">
        <div className="px-6 mb-2 hidden md:block">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono">Main Operations</p>
        </div>
        
        {items.map((item, i) => (
          <button
            key={i}
            className={cn(
               "w-full flex items-center gap-3 px-6 py-3 transition-colors group",
               item.active ? "text-blue-500 bg-blue-500/5 border-r-2 border-blue-500" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/30"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="hidden md:block font-mono text-xs uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="p-6 border-t border-zinc-800 mt-auto">
        <button className="flex items-center gap-3 text-zinc-500 hover:text-red-400 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="hidden md:block font-mono text-[10px] uppercase tracking-wider">Decommission</span>
        </button>
      </div>
    </div>
  );
}
