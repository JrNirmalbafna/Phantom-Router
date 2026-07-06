import React from 'react';
import { LayoutGrid, Timer } from 'lucide-react';

interface Props {
  // We'll simulate heatmap distribution from the global RPS + Node health
  globalHealth: number;
}

const LatencyHeatmap: React.FC<Props> = ({ globalHealth }) => {
  // Generate 60 tiles (12 columns x 5 rows) for the heatmap
  const tiles = Array.from({ length: 60 }, (_, i) => {
    // Inject some jitter based on current health
    const intensity = Math.random() * (110 - globalHealth); 
    let color = 'rgba(0, 255, 136, 0.1)'; // Healthy Mint
    
    if (intensity > 40) color = 'rgba(0, 255, 136, 0.3)';
    if (intensity > 60) color = 'rgba(255, 170, 0, 0.4)'; // Amber
    if (intensity > 85) color = 'rgba(255, 49, 49, 0.5)'; // Red
    
    return { id: i, color };
  });

  return (
    <div className="glass-pane p-6 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <LayoutGrid className="text-neon-blue" size={20} />
          <h3 className="text-sm font-black tracking-widest uppercase text-gradient">Latency Heatmap</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <Timer size={12} />
          REAL-TIME (ms)
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-1.5 mt-2">
        {tiles.map(tile => (
          <div 
            key={tile.id}
            className="rounded-sm transition-colors duration-500"
            style={{ backgroundColor: tile.color }}
          />
        ))}
      </div>

      <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-600 tracking-widest">
        <span>0ms</span>
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-neon-green/30" />
          <div className="w-2 h-2 bg-neon-amber/40" />
          <div className="w-2 h-2 bg-neon-red/50" />
        </div>
        <span>500ms+</span>
      </div>
    </div>
  );
};

export default LatencyHeatmap;
