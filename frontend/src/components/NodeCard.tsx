import React, { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { NodeStats } from '../hooks/usePhantomSocket';

/* ─── SVG health arc ─────────────────────────────────────── */
const HealthRing: React.FC<{ value: number; color: string; size?: number }> = ({
  value, color, size = 52,
}) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3}
      />
      {/* Arc */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 5px ${color}66)`, transition: 'stroke-dasharray 0.5s ease' }}
      />
      {/* Center text */}
      <text
        x="50%" y="50%"
        dominantBaseline="central" textAnchor="middle"
        fill={color}
        style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFamily: 'Inter, sans-serif' }}
      >
        {value.toFixed(0)}
      </text>
    </svg>
  );
};

/* ─── Micro bar ──────────────────────────────────────────── */
const MiniBar: React.FC<{ v: number; color: string }> = ({ v, color }) => (
  <div style={{
    height: 2, flex: 1,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 1, overflow: 'hidden',
  }}>
    <div style={{
      height: '100%', width: `${Math.min(v, 100)}%`,
      background: color, borderRadius: 1,
      transition: 'width 0.4s ease',
    }} />
  </div>
);

/* ─── Row metric ─────────────────────────────────────────── */
const Row: React.FC<{ label: string; value: string; color: string; bar?: number }> = ({
  label, value, color, bar,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 10.5, color: '#475569', width: 46, flexShrink: 0 }}>{label}</span>
    {bar !== undefined && <MiniBar v={bar} color={color} />}
    <span className="tabular" style={{ fontSize: 10.5, color, fontWeight: 500, flexShrink: 0, minWidth: 40, textAlign: 'right' }}>
      {value}
    </span>
  </div>
);

/* ─── NodeCard ───────────────────────────────────────────── */
const NodeCard: React.FC<{ node: NodeStats }> = ({ node }) => {
  const [hist, setHist] = useState<{ v: number }[]>([]);

  useEffect(() => {
    setHist(prev => [...prev, { v: node.dna.current_latency_ms }].slice(-24));
  }, [node.dna.current_latency_ms]);

  const isOpen   = node.circuit_state === 'OPEN';
  const isHalf   = node.circuit_state === 'HALF-OPEN';
  const hColor   =
    node.health >= 90 ? '#4ADE80' :
    node.health >= 70 ? '#F59E0B' :
    '#F87171';
  const statusLabel = isOpen ? 'Circuit Open' : isHalf ? 'Half-Open' : 'Healthy';
  const statusColor = isOpen ? '#F87171' : isHalf ? '#F59E0B' : '#4ADE80';

  const cpuPct   = Math.min((node.dna.requests_per_second / 200) * 100, 100);
  const qPct     = Math.min((node.dna.queue_depth / 50) * 100, 100);
  const errPct   = Math.min((node.dna.error_rate_5xx) * 100, 100);

  return (
    <div
      className="surface"
      style={{
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        /* transcendental: top highlight line only */
        borderTop: `2px solid ${hColor}55`,
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: `linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.016) 100%)`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            className="dot-live"
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor, flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', letterSpacing: '-0.01em' }}>
            {node.id}
          </span>
        </div>
        <span style={{
          fontSize: 9.5, color: statusColor, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: `${statusColor}18`,
          padding: '2px 7px', borderRadius: 4,
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Health ring + sparkline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <HealthRing value={node.health} color={hColor} size={52} />
        <div style={{ flex: 1, height: 38, opacity: 0.65 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hist} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`sg-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={hColor} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={hColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone" dataKey="v"
                stroke={hColor} fill={`url(#sg-${node.id})`}
                strokeWidth={1.5} dot={false} isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row label="CPU"     value={`${cpuPct.toFixed(0)}%`}                             color="#60A5FA" bar={cpuPct}   />
        <Row label="Queue"   value={`${node.dna.queue_depth.toFixed(0)}`}                color="#A78BFA" bar={qPct}     />
        <Row label="Errors"  value={`${(node.dna.error_rate_5xx * 100).toFixed(2)}%`}   color="#F87171" bar={errPct}   />
        <Row label="Latency" value={`${node.dna.current_latency_ms.toFixed(1)} ms`}      color="#64748B"               />
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span className="tabular" style={{ fontSize: 11, color: '#475569' }}>
          <span style={{ color: '#94A3B8', fontWeight: 500 }}>{node.active_conns}</span> conn
        </span>
        <span className="tabular" style={{ fontSize: 11, color: '#475569' }}>
          <span style={{ color: '#94A3B8', fontWeight: 500 }}>{node.rps.toFixed(0)}</span> rps
        </span>
        <span className="tabular" style={{
          fontSize: 11,
          color: node.failure_prob > 0.1 ? '#F87171' : '#475569',
          fontWeight: node.failure_prob > 0.1 ? 600 : 400,
        }}>
          {(node.failure_prob * 100).toFixed(1)}% risk
        </span>
      </div>
    </div>
  );
};

export default NodeCard;
