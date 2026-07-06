import React from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Cell, Tooltip } from 'recharts';
import { BarChart3, Activity } from 'lucide-react';

interface Props {
  histogram: number[]; // [0-1, 1-2, 2-5, 5-10, 10-50, 50+]
}

const LatencyHistogram: React.FC<Props> = ({ histogram }) => {
  const chartData = [
    { name: '0-1', val: histogram[0] || 0, color: '#00ff88' },
    { name: '1-2', val: histogram[1] || 0, color: '#00ff88' },
    { name: '2-5', val: histogram[2] || 0, color: '#ffaa00' },
    { name: '5-10', val: histogram[3] || 0, color: '#ffaa00' },
    { name: '10-50', val: histogram[4] || 0, color: '#ff3131' },
    { name: '50+', val: histogram[5] || 0, color: '#ff3131' },
  ];

  return (
    <div className="glass-pane p-6 h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-neon-blue" size={20} />
          <div>
            <h3 className="text-sm font-black tracking-widest uppercase">Latency Distribution</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase">System-wide Response Bins</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-neon-blue/10">
          <Activity size={12} className="text-neon-blue animate-pulse" />
          <span className="text-[9px] font-black text-neon-blue uppercase">Live Flux</span>
        </div>
      </div>

      <div className="flex-1 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              fontSize={9} 
              stroke="rgba(255,255,255,0.3)" 
              tickFormatter={(val) => `${val}ms`}
            />
            <Tooltip 
              cursor={{fill: 'rgba(255,255,255,0.05)'}}
              contentStyle={{ backgroundColor: '#050505', border: '1px solid #222', borderRadius: '8px' }}
              itemStyle={{ fontSize: '10px' }}
            />
            <Bar dataKey="val" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.6} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center pt-2 text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">
        <span>Ultra-Low</span>
        <span>Operational Range</span>
        <span>Degraded</span>
      </div>
    </div>
  );
};

export default LatencyHistogram;
