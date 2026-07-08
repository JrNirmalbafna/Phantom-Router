import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, YAxis,
} from 'recharts';
import type { NodeStats } from '../hooks/usePhantomSocket';

const PALETTE = ['#38BDF8', '#818CF8', '#4ADE80', '#F59E0B'];

/* ─── Traffic donut ─────────────────────────────────────── */
const TrafficDonut: React.FC<{ nodes: NodeStats[]; total: number }> = ({ nodes, total }) => {
  const data = nodes.map((n, i) => ({
    name: n.id, value: n.rps, color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="surface" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        Traffic Distribution
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Donut */}
        <div style={{ width: 96, height: 96, flexShrink: 0, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.length ? data : [{ name: '-', value: 1, color: 'rgba(255,255,255,0.05)' }]}
                cx="50%" cy="50%"
                innerRadius={30} outerRadius={44}
                strokeWidth={0} dataKey="value"
                isAnimationActive={false}
              >
                {(data.length ? data : [{ color: 'rgba(255,255,255,0.05)' }]).map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0D1520', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, fontSize: 11 }}
                formatter={(v: number) => [`${v.toFixed(0)} rps`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <p className="tabular" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', lineHeight: 1 }}>
              {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
            </p>
            <p style={{ fontSize: 8.5, color: '#334155', marginTop: 2 }}>req/s</p>
          </div>
        </div>
        {/* Legend */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {data.map(d => (
            <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: '#64748B' }}>{d.name}</span>
              </div>
              <span className="tabular" style={{ fontSize: 11.5, color: '#475569', fontWeight: 500 }}>
                {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
          {data.length === 0 && (
            <p style={{ fontSize: 11, color: '#334155' }}>Awaiting data...</p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Bare area chart ───────────────────────────────────── */
const BareChart: React.FC<{
  data: { time: string; v: number }[];
  label: string;
  color: string;
  unit?: string;
}> = ({ data, label, color, unit = '' }) => {
  const last = data[data.length - 1]?.v ?? 0;
  const displayVal = unit === 'ms'
    ? `${last.toFixed(1)} ms`
    : last >= 1000
      ? `${(last / 1000).toFixed(1)}k`
      : last.toFixed(0);

  return (
    <div className="surface" style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </p>
        <span className="tabular" style={{
          fontSize: 14, fontWeight: 650, color,
          textShadow: `0 0 12px ${color}55`,
        }}>
          {displayVal}
        </span>
      </div>
      <div style={{ height: 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`cg-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={color} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip
              contentStyle={{ background: '#0D1520', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, fontSize: 11 }}
              formatter={(v: number) =>
                [unit === 'ms' ? `${v.toFixed(1)} ms` : v.toFixed(0), label]
              }
              labelStyle={{ display: 'none' }}
            />
            <Area
              type="monotone" dataKey="v"
              stroke={color} fill={`url(#cg-${label})`}
              strokeWidth={1.5} dot={false} isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ─── ChartsRow ─────────────────────────────────────────── */
interface Props {
  nodes: NodeStats[];
  totalRps: number;
  rpsHistory: { time: string; v: number }[];
  latencyHistory: { time: string; v: number }[];
}

const ChartsRow: React.FC<Props> = ({ nodes, totalRps, rpsHistory, latencyHistory }) => (
  <div style={{ display: 'flex', gap: 12 }}>
    <div style={{ width: 280, flexShrink: 0 }}>
      <TrafficDonut nodes={nodes} total={totalRps} />
    </div>
    <BareChart data={rpsHistory}     label="Requests per Second" color="#38BDF8" />
    <BareChart data={latencyHistory} label="Latency"             color="#818CF8" unit="ms" />
  </div>
);

export default ChartsRow;
