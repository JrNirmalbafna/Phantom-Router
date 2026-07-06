import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LineChart, BarChart3 } from 'lucide-react';

interface Props {
  data: any[]; // Historical points for global RPS
}

const VitalsSection: React.FC<Props> = ({ data }) => {
  return (
    <div className="glass-pane p-6 h-full flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-neon-green" size={20} />
          <h3 className="text-sm font-black tracking-widest uppercase">System Flux (Global Throughput)</h3>
        </div>
        <div className="flex gap-2">
          <div className="px-2 py-1 rounded bg-white/5 text-[10px] font-bold text-slate-400">RPS TREND</div>
          <div className="px-2 py-1 rounded bg-neon-green/10 text-[10px] font-bold text-neon-green">LIVE</div>
        </div>
      </div>

      <div className="flex-1 min-h-[180px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--neon-green)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--neon-green)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="time" 
              hide 
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={10} 
              tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(5, 5, 5, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: 'var(--neon-green)', fontSize: '12px' }}
            />
            <Area 
              type="monotone" 
              dataKey="rps" 
              stroke="var(--neon-green)" 
              fillOpacity={1} 
              fill="url(#colorRps)" 
              strokeWidth={3}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase font-bold">P99 Latency</p>
          <p className="text-sm font-black text-neon-blue">0.82ms</p>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Failure Rate</p>
          <p className="text-sm font-black text-neon-green">0.00%</p>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Shedded</p>
          <p className="text-sm font-black text-slate-400">0</p>
        </div>
      </div>
    </div>
  );
};

export default VitalsSection;
