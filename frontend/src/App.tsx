import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import NodeCard from './components/NodeCard';
import ChartsRow from './components/ChartsRow';
import DecisionsTable from './components/DecisionsTable';
import NodeAnalytics from './components/NodeAnalytics';
import DecisionEngine from './components/DecisionEngine';
import LiveTraffic from './components/LiveTraffic';
import { usePhantomSocket } from './hooks/usePhantomSocket';
import type { NodeStats } from './hooks/usePhantomSocket';

/* ─── Placeholder for future dashboards ─────────────────── */
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  }}>
    <p style={{ fontSize: 16, fontWeight: 600, color: '#334155', letterSpacing: '-0.02em' }}>{title}</p>
    <p style={{ fontSize: 12, color: '#1E293B' }}>Next dashboard — coming soon</p>
  </div>
);

/* ─── Dashboard 1: Cluster Overview ─────────────────────── */
const ClusterOverview: React.FC<{
  nodes: NodeStats[];
  totalRps: number;
  isConnected: boolean;
  rpsHistory: { time: string; v: number }[];
  latencyHistory: { time: string; v: number }[];
  decisions: string[];
  onSelectNode: (id: string) => void;
}> = ({ nodes, totalRps, isConnected, rpsHistory, latencyHistory, decisions, onSelectNode }) => {
  const avgLatency = nodes.length
    ? nodes.reduce((s, n) => s + n.dna.current_latency_ms, 0) / nodes.length : 0;
  const activeConns = nodes.reduce((s, n) => s + n.active_conns, 0);
  const avgError    = nodes.length
    ? nodes.reduce((s, n) => s + n.dna.error_rate_5xx, 0) / nodes.length : 0;
  const health      = nodes.length
    ? nodes.reduce((s, n) => s + n.health, 0) / nodes.length : 0;
  const online      = nodes.filter(n => n.circuit_state !== 'OPEN').length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <TopBar
        globalRps={totalRps}
        avgLatency={avgLatency}
        activeConns={activeConns}
        errorRate={avgError}
        clusterHealth={health}
        nodesOnline={online}
        totalNodes={nodes.length || 4}
        isConnected={isConnected}
      />

      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Nodes label */}
        <p style={{
          fontSize: 10, fontWeight: 600, color: '#334155',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>Nodes</p>

        {/* Node grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 12,
        }}>
          {nodes.length > 0
            ? nodes.map(n => (
              <div key={n.id} onClick={() => onSelectNode(n.id)} style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <NodeCard node={n} />
              </div>
            ))
            : (
              <div style={{
                gridColumn: '1/-1', height: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#1E293B', fontSize: 12, letterSpacing: '0.04em',
              }}>
                Waiting for backend connection...
              </div>
            )
          }
        </div>

        {/* Charts */}
        <ChartsRow
          nodes={nodes}
          totalRps={totalRps}
          rpsHistory={rpsHistory}
          latencyHistory={latencyHistory}
        />

        {/* Decisions */}
        <DecisionsTable decisions={decisions} />
      </div>
    </div>
  );
};

/* ─── Root ───────────────────────────────────────────────── */
function App() {
  const { data, isConnected } = usePhantomSocket('ws://localhost:9001');
  const [page, setPage]       = useState('overview');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rpsHist, setRpsHist] = useState<{ time: string; v: number }[]>([]);
  const [latHist, setLatHist] = useState<{ time: string; v: number }[]>([]);

  useEffect(() => {
    if (!data) return;
    const t = new Date().toLocaleTimeString('en', { hour12: false });
    const avgLat = data.nodes.length
      ? data.nodes.reduce((s, n) => s + n.dna.current_latency_ms, 0) / data.nodes.length : 0;

    setRpsHist(prev => [...prev, { time: t, v: data.global_rps }].slice(-50));
    setLatHist(prev => [...prev, { time: t, v: avgLat           }].slice(-50));
  }, [data]);

  const renderPage = () => {
    switch (page) {
      case 'overview':
        return (
          <ClusterOverview
            nodes={data?.nodes || []}
            totalRps={data?.global_rps || 0}
            isConnected={isConnected}
            rpsHistory={rpsHist}
            latencyHistory={latHist}
            decisions={data?.decisions || []}
            onSelectNode={(id) => {
              setSelectedNodeId(id);
              setPage('nodes');
            }}
          />
        );
      case 'nodes': {
        const selectedNode = data?.nodes.find(n => n.id === selectedNodeId) || (data?.nodes[0] ?? null);
        return (
          <NodeAnalytics
            node={selectedNode}
            allNodes={data?.nodes || []}
            onSelectNode={(id) => setSelectedNodeId(id)}
          />
        );
      }
      case 'traffic':   return <LiveTraffic data={data} />;
      case 'decisions': return <DecisionEngine data={data} />;
      case 'predictor': return <PlaceholderPage title="AI Predictor" />;
      case 'benchmark': return <PlaceholderPage title="Benchmark Center" />;
      case 'requests':  return <PlaceholderPage title="Request Explorer" />;
      case 'config':    return <PlaceholderPage title="Configuration" />;
      default:          return null;
    }
  };

  return (
    /*
      Outermost layer: the "transcendental" background
      — very dark blue-black base
      — two subtle radial glows bleeding in from top corners (aurora)
      — faint bg-grid texture overlay
    */
    <div
      className="bg-grid"
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#060B12',
        position: 'relative',
      }}
    >
      {/* Aurora radial — top right */}
      <div style={{
        position: 'absolute',
        top: -120, right: -80,
        width: 480, height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      {/* Aurora radial — bottom left (subtle violet) */}
      <div style={{
        position: 'absolute',
        bottom: -100, left: 120,
        width: 360, height: 360,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.045) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Sidebar */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Sidebar active={page} onSelect={setPage} isConnected={isConnected} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
