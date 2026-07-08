import React, { useState } from 'react';
import { Settings2, Zap } from 'lucide-react';

const healthColor = (v: number) =>
  v >= 90 ? '#4ADE80' : v >= 70 ? '#F59E0B' : '#F87171';

interface Props {
  globalRps: number;
  avgLatency: number;
  activeConns: number;
  errorRate: number;
  clusterHealth: number;
  nodesOnline: number;
  totalNodes: number;
  isConnected: boolean;
}

const TopBar: React.FC<Props> = ({
  globalRps, avgLatency, activeConns, errorRate,
  clusterHealth, nodesOnline, totalNodes, isConnected,
}) => {
  const hColor = healthColor(clusterHealth);
  const [strategy, setStrategy] = useState('Hybrid');
  const [hedgingEnabled, setHedgingEnabled] = useState(true);

  const changeStrategy = async (newStrategy: string) => {
    setStrategy(newStrategy);
    try {
      await fetch(`http://localhost:8081/api/strategy?name=${newStrategy}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to update strategy', e);
    }
  };

  const toggleHedging = async () => {
    const newState = !hedgingEnabled;
    setHedgingEnabled(newState);
    // Assuming an endpoint exists for this based on Phase 4 plan
    try {
      await fetch(`http://localhost:8081/api/hedging?enabled=${newState}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to toggle hedging', e);
    }
  };

  const stats = [
    {
      label: 'Requests / sec',
      value: globalRps >= 1000
        ? `${(globalRps / 1000).toFixed(1)}k`
        : globalRps.toFixed(0),
      color: '#E2E8F0',
      sub: 'Global throughput',
    },
    {
      label: 'Avg Latency',
      value: `${avgLatency.toFixed(1)}`,
      unit: 'ms',
      color: '#E2E8F0',
      sub: 'Per request mean',
    },
    {
      label: 'Active Connections',
      value: activeConns.toLocaleString(),
      color: '#E2E8F0',
      sub: 'Open sockets',
    },
    {
      label: 'Error Rate',
      value: `${(errorRate * 100).toFixed(2)}`,
      unit: '%',
      color: errorRate > 0.01 ? '#F87171' : errorRate > 0.001 ? '#F59E0B' : '#4ADE80',
      sub: '5xx responses',
    },
  ];

  return (
    <div style={{ padding: '28px 32px 0' }}>
      {/* Title + cluster health */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 650, color: '#F1F5F9',
            letterSpacing: '-0.03em', lineHeight: 1,
          }}>
            Cluster Overview
          </h1>
          <p style={{ fontSize: 12.5, color: '#475569', marginTop: 6, fontWeight: 400 }}>
            Real-time telemetry · FluxRoute v0.1
          </p>
        </div>

        {/* Right: health + live badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Cluster health */}
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: 9.5, color: '#334155', textTransform: 'uppercase',
              letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4,
            }}>Cluster Health</p>
            <p className="tabular" style={{
              fontSize: 30, fontWeight: 700, lineHeight: 1,
              color: hColor, letterSpacing: '-0.04em',
              textShadow: `0 0 20px ${hColor}55`,
            }}>
              {clusterHealth.toFixed(0)}%
            </p>
          </div>

          {/* Live badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 14px',
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
          }}>
            <span
              className="dot-live"
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: isConnected ? '#4ADE80' : '#F87171',
              }}
            />
            <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
            <span style={{
              fontSize: 11, color: '#334155',
              paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.07)',
              marginLeft: 2,
            }}>
              {nodesOnline}/{totalNodes} nodes
            </span>
          </div>
          
          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: 24 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings2 size={14} color="#94A3B8" />
              <select
                value={strategy}
                onChange={(e) => changeStrategy(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.035)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 6, padding: '4px 8px', fontSize: 11, outline: 'none', cursor: 'pointer', appearance: 'none', paddingRight: 24
                }}
              >
                <option value="Hybrid">Hybrid ML</option>
                <option value="LowestLatency">Lowest Latency</option>
                <option value="RoundRobin">Round Robin</option>
                <option value="LeastConnections">Least Connections</option>
                <option value="ConsistentHashing">Consistent Hashing</option>
              </select>
            </div>
            
            <button
              onClick={toggleHedging}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: hedgingEnabled ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.035)',
                border: `1px solid ${hedgingEnabled ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.07)'}`,
                color: hedgingEnabled ? '#A78BFA' : '#64748B',
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <Zap size={12} color={hedgingEnabled ? '#A78BFA' : '#64748B'} />
              {hedgingEnabled ? 'Hedging ON' : 'Hedging OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Stat strip — floating numbers, no boxes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0,
        borderTop: '1px solid rgba(255,255,255,0.055)',
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        paddingTop: 20,
        paddingBottom: 20,
      }}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              paddingLeft: i === 0 ? 0 : 32,
              paddingRight: 32,
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.055)' : 'none',
            }}
          >
            <p style={{
              fontSize: 9.5, color: '#475569', textTransform: 'uppercase',
              letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8,
            }}>
              {s.label}
            </p>
            <p className="tabular" style={{
              fontSize: 26, fontWeight: 700, color: s.color,
              letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              {s.value}
              {s.unit && (
                <span style={{ fontSize: 14, color: '#475569', fontWeight: 500, marginLeft: 4 }}>
                  {s.unit}
                </span>
              )}
            </p>
            <p style={{ fontSize: 11, color: '#334155', marginTop: 5 }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopBar;
