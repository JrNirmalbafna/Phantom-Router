import React, { useEffect, useRef } from 'react';
import { Terminal, BrainCircuit } from 'lucide-react';

interface Props {
  decisions: string[];
}

const IntelligencePanel: React.FC<Props> = ({ decisions }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [decisions]);

  return (
    <div className="glass-pane p-6 h-full flex flex-col gap-4">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <BrainCircuit className="text-neon-blue" size={20} />
        <h3 className="text-sm font-black tracking-widest uppercase">PHANTOM Intelligence Decider</h3>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 pr-2 custom-scrollbar"
      >
        {decisions.length === 0 ? (
          <div className="text-slate-600 animate-pulse">Waiting for AI telemetry stream...</div>
        ) : (
          decisions.map((log, i) => (
            <div key={i} className="flex gap-3 items-start animate-in fade-in slide-in-from-left duration-300">
              <span className="text-neon-blue font-bold opacity-50">[{new Date().toLocaleTimeString()}]</span>
              <span className={log.includes('CRITICAL') || log.includes('CIRCUIT') ? 'text-neon-red font-bold' : 'text-slate-300'}>
                {log}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="pt-4 border-t border-white/5 flex justify-between items-center opacity-50">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-neon-blue">
          <Terminal size={12} />
          Active Reasoning
        </div>
        <div className="text-[10px] uppercase font-bold text-slate-500">
          500ms Refresh Rate
        </div>
      </div>
    </div>
  );
};

export default IntelligencePanel;
