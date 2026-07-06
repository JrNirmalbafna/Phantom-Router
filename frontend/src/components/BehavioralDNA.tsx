import React from 'react';
import { Fingerprint, BarChart3, TrendingUp, Gauge, Cpu, Zap, Activity } from 'lucide-react';
import type { NodeStats } from '../hooks/usePhantomSocket';

interface Props {
  node: NodeStats | null;
}

const BehavioralDNA: React.FC<Props> = ({ node }) => {
  if (!node) {
    return (
      <div className="glass-pane p-6 h-full flex items-center justify-center text-slate-600 font-bold uppercase text-[10px] tracking-widest">
        Select a Node to View DNA Fingerprint
      </div>
    );
  }

  const aiFeatures = [
    { label: 'Current Latency', val: `${node.dna.current_latency_ms.toFixed(2)}ms`, icon: <TrendingUp size={12}/> },
    { label: 'Rolling Avg (10s)', val: `${node.dna.latency_rolling_avg_10s.toFixed(2)}ms`, icon: <BarChart3 size={12}/> },
    { label: 'Latency P99', val: `${node.dna.latency_percentile_p99.toFixed(2)}ms`, icon: <Gauge size={12}/> },
    { label: 'Requests / Sec', val: node.dna.requests_per_second.toLocaleString(), icon: <TrendingUp size={12}/> },
    { label: 'Active Conns', val: node.dna.active_connections.toFixed(0), icon: <Fingerprint size={12}/> },
    { label: 'Latency Delta (5s)', val: `${node.dna.latency_delta_last_5s > 0 ? '+' : ''}${node.dna.latency_delta_last_5s.toFixed(3)}s`, color: Math.abs(node.dna.latency_delta_last_5s) > 0.05 ? 'var(--neon-amber)' : 'var(--neon-blue)' },
    { label: 'Queue Depth', val: node.dna.queue_depth.toFixed(1), icon: <BarChart3 size={12}/> },
  ];

  // Convert sensor_dna map to array for 32+ extra metrics
  const hardwareSensors = Object.entries(node.sensor_dna).map(([key, val]) => ({
    label: key.replace(/_/g, ' '),
    val: typeof val === 'number' ? (val < 1 ? val.toFixed(3) : val.toLocaleString()) : val,
    icon: key.includes('CPU') ? <Cpu size={12}/> : <Zap size={12}/>
  }));

  return (
    <div className="glass-pane p-6 h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Fingerprint className="text-neon-amber" size={20} />
          <div>
            <h3 className="text-sm font-black tracking-widest uppercase">Deep Sensor Matrix</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase">Multivariate Telemetry (47+ Points)</p>
          </div>
        </div>
        <div className="px-2 py-1 rounded bg-neon-amber/10 text-[10px] font-bold text-neon-amber">
          SENSOR_STREAM_V2
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-6">
        
        {/* Section 1: Core AI DNA (15 Features) */}
        <div>
          <p className="text-[8px] font-black text-slate-600 mb-2 tracking-[0.2em] uppercase">Intelligence Layer (15-Dims)</p>
          <div className="grid grid-cols-1 gap-1.5">
            {aiFeatures.map((f, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded bg-white/[0.02] border border-white/[0.03]">
                <div className="flex items-center gap-3">
                  <span className="opacity-30">{f.icon}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{f.label}</span>
                </div>
                <span className="font-mono text-xs font-bold" style={{ color: f.color || 'var(--text-primary)' }}>
                  {f.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Hardware & Infrastructure (32+ Metrics) */}
        <div>
          <p className="text-[8px] font-black text-slate-600 mb-2 tracking-[0.2em] uppercase">Infrastructure Layer (32+ Sensors)</p>
          <div className="grid grid-cols-1 gap-1.5">
            {hardwareSensors.map((f, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded bg-white/[0.01] border border-white/[0.02]">
                <div className="flex items-center gap-3">
                  <span className="opacity-20">{f.icon}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{f.label}</span>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-400">
                  {f.val}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="pt-4 border-t border-white/5 text-[9px] text-slate-600 font-bold uppercase tracking-widest">
        SYSTEM FLUX // MONITORING_ACTIVE
      </div>
    </div>
  );
};

export default BehavioralDNA;
