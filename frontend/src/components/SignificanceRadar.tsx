import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Target, Activity } from 'lucide-react';
import type { NodeStats } from '../hooks/usePhantomSocket';

interface Props {
  node: NodeStats | null;
}

const SignificanceRadar: React.FC<Props> = ({ node }) => {
  if (!node) {
    return (
      <div className="glass-pane p-6 h-full flex items-center justify-center text-slate-600 font-bold uppercase text-[10px] tracking-widest">
        Awaiting Node Selection...
      </div>
    );
  }

  // Map core 15 features to radar data
  // We normalize them for visualization significance
  const radarData = [
    { subject: 'LATENCY', A: node.dna.current_latency_ms * 10, fullMark: 100 },
    { subject: 'LOAD', A: (node.dna.requests_per_second / 2000) * 100, fullMark: 100 },
    { subject: 'CONN', A: (node.dna.active_connections / 100) * 100, fullMark: 100 },
    { subject: 'P99', A: node.dna.latency_percentile_p99 * 5, fullMark: 100 },
    { subject: 'DELTA', A: Math.abs(node.dna.latency_delta_last_5s * 500), fullMark: 100 },
    { subject: 'ERR', A: node.dna.error_rate_5xx * 1000, fullMark: 100 },
  ];

  return (
    <div className="glass-pane p-6 h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Target className="text-neon-amber" size={20} />
          <div>
            <h3 className="text-sm font-black tracking-widest uppercase text-gradient">AI Sensory Significance</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase">Multidimensional Neural Signature</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-neon-amber/10">
          <Activity size={10} className="text-neon-amber" />
          <span className="text-[9px] font-black text-neon-amber uppercase tracking-tighter">{node.id}</span>
        </div>
      </div>

      <div className="flex-1 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.05)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800 }} />
            <Radar
              name={node.id}
              dataKey="A"
              stroke="var(--neon-amber)"
              fill="var(--neon-amber)"
              fillOpacity={0.2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[8px] font-black uppercase text-slate-600 tracking-[0.3em] text-center">
        PREDICTIVE NEURAL PROFILE ACTIVE
      </div>
    </div>
  );
};

export default SignificanceRadar;
