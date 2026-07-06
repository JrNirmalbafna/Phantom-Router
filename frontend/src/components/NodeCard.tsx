import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Globe, AlertCircle } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { NodeStats } from '../hooks/usePhantomSocket';

const NodeCard: React.FC<{ node: NodeStats }> = ({ node }) => {
  const [history, setHistory] = useState<{ val: number }[]>([]);

  // Update local history for real sparkline
  useEffect(() => {
    setHistory(prev => {
      const next = [...prev, { val: node.dna.current_latency_ms }];
      return next.slice(-20); // Keep last 20 samples
    });
  }, [node.dna.current_latency_ms]);

  const getStatusColor = () => {
    if (node.circuit_state === 'OPEN') return 'var(--neon-red)';
    if (node.health < 60) return 'var(--neon-amber)';
    return 'var(--neon-green)';
  };

  const statusColor = getStatusColor();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-pane scanner-effect p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ borderLeft: `2px solid ${statusColor}` }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: statusColor }} />
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">{node.id}</span>
        </div>
        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${node.circuit_state === 'CLOSED' ? 'bg-green-500/10 text-emerald-400' : 'bg-red-500/10 text-rose-400'}`}>
          {node.circuit_state}
        </div>
      </div>

      {/* Health & Risk */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black">{node.health.toFixed(1)}</h2>
          <p className="text-[9px] text-slate-500 uppercase font-bold">AI Health Score</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono font-bold" style={{ color: statusColor }}>
            {(node.failure_prob * 100).toFixed(1)}% RISK
          </p>
          <p className="text-[9px] text-slate-500 uppercase font-bold">Prob. Failure</p>
        </div>
      </div>

      {/* REAL Sparkline */}
      <div className="h-10 w-full opacity-50">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id={`grad-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={statusColor} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={statusColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="val" 
              stroke={statusColor} 
              fill={`url(#grad-${node.id})`}
              strokeWidth={1.5} 
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Cluster */}
      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-slate-500" />
          <span className="text-[10px] font-mono font-bold text-slate-300">{node.rps.toLocaleString()} <span className="text-[8px] text-slate-600">RPS</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-slate-500" />
          <span className="text-[10px] font-mono font-bold text-slate-300">{node.active_conns} <span className="text-[8px] text-slate-600">ACTIVE</span></span>
        </div>
      </div>
    </motion.div>
  );
};

export default NodeCard;
