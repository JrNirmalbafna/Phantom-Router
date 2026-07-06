import { useState, useEffect } from 'react';
import Header from './components/Header';
import NodeCard from './components/NodeCard';
import IntelligencePanel from './components/IntelligencePanel';
import VitalsSection from './components/VitalsSection';
import BehavioralDNA from './components/BehavioralDNA';
import LatencyHistogram from './components/LatencyHistogram';
import SignificanceRadar from './components/SignificanceRadar';
import { usePhantomSocket } from './hooks/usePhantomSocket';

function App() {
  const { data, isConnected } = usePhantomSocket('ws://localhost:9001');
  const [history, setHistory] = useState<{ time: string; rps: number }[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Auto-select first node if none selected
  useEffect(() => {
    if (data?.nodes.length && !selectedNodeId) {
      setSelectedNodeId(data.nodes[0].id);
    }
  }, [data, selectedNodeId]);

  useEffect(() => {
    if (data) {
      setHistory(prev => {
        const next = [...prev, { 
          time: new Date().toLocaleTimeString(), 
          rps: data.global_rps || 0 
        }];
        return next.slice(-40); // Slightly longer history for smoother jitter visibility
      });
    }
  }, [data]);

  const selectedNode = data?.nodes.find(n => n.id === selectedNodeId) || null;

  return (
    <div className="min-h-screen bg-[#050505] p-3 lg:p-4 flex flex-col gap-3 max-w-[1920px] mx-auto overflow-hidden">
      {/* 1. Header (Panel 1 - Summary) */}
      <Header 
        globalRps={data?.global_rps || 0} 
        nodeCount={data?.nodes.length || 0} 
        isConnected={isConnected} 
      />

      <main className="flex-1 grid grid-cols-12 gap-3 overflow-hidden">
        
        {/* LEFT COLUMN (9 Units - Master Control) */}
        <div className="col-span-12 xl:col-span-9 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Panel 2: Node Matrix (Variance Fixed) */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.nodes.map(node => (
              <div key={node.id} onClick={() => setSelectedNodeId(node.id)} className="cursor-pointer">
                <NodeCard node={node} />
              </div>
            ))}
            {(!data || data.nodes.length === 0) && (
              <div className="col-span-full h-48 glass-pane flex items-center justify-center text-slate-600 font-bold uppercase tracking-[0.3em] animate-pulse text-xs">
                Awaiting Deep Telemetry Stream...
              </div>
            )}
          </section>

          {/* THREE-BOX ROW (System Distribution & Flux) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-[300px]">
            {/* Panel 3: Global System Flux */}
            <div className="md:col-span-1">
              <VitalsSection data={history} />
            </div>
            
            {/* Panel 4: Latency Histogram (REPLACED HEATMAP) */}
            <div className="md:col-span-1">
              <LatencyHistogram histogram={data?.latency_histogram || []} />
            </div>

            {/* Panel 5: Significance Radar (NEW SECTION) */}
            <div className="md:col-span-1">
              <SignificanceRadar node={selectedNode} />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (3 Units - Intelligence & DNA) */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-3 overflow-hidden">
          
          {/* Panel 6: Deep Sensor DNA (47 Metrics) */}
          <div className="flex-1 min-h-[400px]">
            <BehavioralDNA node={selectedNode} />
          </div>

          {/* Intelligence Panel (Minimized but readable) */}
          <div className="h-[200px]">
            <IntelligencePanel decisions={data?.decisions || []} />
          </div>

        </div>

      </main>

      {/* Futuristic Tactical Footer */}
      <footer className="flex justify-between items-center opacity-30 text-[8px] font-black uppercase tracking-[0.5em] px-2 py-1.5 border-t border-white/5">
        <div className="flex gap-4">
          <span>PHANTOM_CORE_SYNAPSE_OS</span>
          <span className="text-neon-green">STATUS_OPERATIONAL</span>
        </div>
        <div className="flex gap-8">
          <span>TX: {((data?.global_rps || 0)/1000).toFixed(1)}k/s</span>
          <span>LATENCY_DIST_BINS: OK</span>
          <span>VIBECON_POC_V02_POLISHED</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
