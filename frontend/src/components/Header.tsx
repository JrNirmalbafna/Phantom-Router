import React from 'react';
import { Cpu, Zap, Activity, Clock } from 'lucide-react';

interface Props {
  globalRps: number;
  nodeCount: number;
  isConnected: boolean;
}

const Header: React.FC<Props> = ({ globalRps, nodeCount, isConnected }) => {
  return (
    <header className="glass-pane p-4 flex justify-between items-center mb-6">
      <div className="flex items-center gap-6">
        {/* Branding */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon-green flex items-center justify-center">
            <Cpu className="text-black" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none">PHANTOM</h1>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Intelligent Engine v0.1</p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="h-8 w-px bg-white/5 mx-2" />
        <div className="flex gap-8">
          <div className="flex items-center gap-3">
            <Zap className="text-neon-blue" size={16} />
            <div>
              <p className="text-xs font-black">{globalRps.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Global RPS</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Activity className="text-neon-green" size={16} />
            <div>
              <p className="text-xs font-black">{nodeCount}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Active Nodes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <Clock size={12} className="text-slate-500" />
          <span className="text-[10px] font-mono text-slate-400">UPTIME: 03:22:45</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-neon-green animate-pulse' : 'bg-neon-red'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {isConnected ? 'LIVE TELEMETRY' : 'LINK DISCONNECTED'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
