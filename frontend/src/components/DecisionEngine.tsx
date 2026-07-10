import React, { useState, useEffect } from 'react';
import {
  Settings2, Zap, BrainCircuit, Activity, ArrowRight, ShieldCheck, Cpu, Server,
  TrendingUp, TrendingDown, AlertTriangle, ChevronDown
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  YAxis, AreaChart, Area, Tooltip
} from 'recharts';
import type { PhantomTelemetry } from '../hooks/usePhantomSocket';

/* ─── Sub-components ───────────────────────────── */

const Panel: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
  <div className={`surface-ghost p-5 ${className}`} style={{ background: '#0B0F15', ...style }}>
    {children}
  </div>
);

/* Animated pipeline connector */
const FlowArrow: React.FC<{ active?: boolean }> = ({ active = true }) => (
  <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '0 4px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    {active && (
      <div
        style={{
          position: 'absolute', left: 0, width: '100%', height: '100%',
          display: 'flex', alignItems: 'center',
          animation: 'flowPulse 1.8s ease-in-out infinite',
        }}
      >
        <div style={{ width: 24, height: 2, borderRadius: 2, background: 'linear-gradient(90deg, transparent, #38BDF8, transparent)' }} />
      </div>
    )}
    <ArrowRight size={14} color="#334155" style={{ flexShrink: 0, marginLeft: -4 }} />
  </div>
);

/* Stat tile */
const StatTile: React.FC<{
  label: string; value: string; sub?: string; color: string;
  icon: React.ElementType; trend?: 'up' | 'down' | null;
}> = ({ label, value, sub, color, icon: Icon, trend }) => (
  <Panel style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{label}</span>
      </div>
      {trend === 'up' && <TrendingUp size={13} color="#22C55E" />}
      {trend === 'down' && <TrendingDown size={13} color="#F87171" />}
    </div>
    <p style={{ fontSize: 22, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ fontSize: 10, color: '#64748B' }}>{sub}</p>}
  </Panel>
);

/* Circular confidence gauge */
const ConfidenceGauge: React.FC<{ value: number }> = ({ value }) => {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const fill = (value / 100) * circ;
  const color = value >= 90 ? '#22C55E' : value >= 75 ? '#F59E0B' : '#F87171';

  return (
    <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <p style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value.toFixed(1)}</p>
        <p style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>% Confidence</p>
      </div>
    </div>
  );
};

/* Custom tooltip for recharts */
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#E2E8F0' }}>
      <p style={{ color: '#64748B', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 500 }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>
      ))}
    </div>
  );
};

/* ─── Main Component ──────────────────────────── */

interface Props {
  data: PhantomTelemetry | null;
}

const DecisionEngine: React.FC<Props> = ({ data }) => {
  const [history, setHistory] = useState<{
    time: string; confidence: number; hedging: number; clean: number; hedge: number; fallback: number; dropped: number;
  }[]>([]);


  useEffect(() => {
    if (!data?.decision_telemetry) return;
    const dt = data.decision_telemetry;
    const t = new Date().toLocaleTimeString('en', { hour12: false, minute: '2-digit', second: '2-digit' });
    setHistory(prev => {
      const next = [...prev, {
        time: t,
        confidence: dt.confidence_avg,
        hedging: dt.hedging_rate,
        clean: dt.outcomes.clean,
        hedge: dt.outcomes.hedged,
        fallback: dt.outcomes.fallback,
        dropped: dt.outcomes.dropped,
      }];
      return next.length > 40 ? next.slice(next.length - 40) : next;
    });
  }, [data?.decision_telemetry?.requests_optimized]);

  if (!data) {
    return <div className="p-8 text-slate-400">Waiting for backend telemetry...</div>;
  }

  const { decision_telemetry: dt, nodes } = data;
  if (!dt || !dt.strategy_distribution || !dt.outcomes) {
    return <div className="p-8 text-slate-400">Decision Telemetry not available. Please ensure the backend simulator is restarted to broadcast the new telemetry format.</div>;
  }

  const strategyData = [
    { name: 'Hybrid ML', value: dt.strategy_distribution.Hybrid, color: '#A855F7' },
    { name: 'Lowest Latency', value: dt.strategy_distribution.LowestLatency, color: '#38BDF8' },
    { name: 'Round Robin', value: dt.strategy_distribution.RoundRobin, color: '#F59E0B' },
  ];

  const nodeRanking = [...nodes].sort((a, b) => b.health - a.health).map(n => ({
    name: n.id,
    score: parseFloat((n.health / 100).toFixed(2)),
    latency: parseFloat(n.dna.current_latency_ms.toFixed(1)),
    rps: Math.round(n.rps),
    color: n.health >= 90 ? '#22C55E' : n.health >= 70 ? '#F59E0B' : '#F87171',
  }));

  const totalReqs = dt.outcomes.clean + dt.outcomes.hedged + dt.outcomes.fallback + dt.outcomes.dropped;

  const outcomeBuckets = [
    { label: 'Clean Routes', desc: 'Fast, no hedge needed', val: dt.outcomes.clean, color: '#22C55E', icon: ShieldCheck },
    { label: 'Hedge Wins', desc: 'Saved by P99 Hedge', val: dt.outcomes.hedged, color: '#A855F7', icon: Zap },
    { label: 'Fallbacks', desc: 'Rerouted from failure', val: dt.outcomes.fallback, color: '#F59E0B', icon: Activity },
    { label: 'Dropped', desc: 'Hard failures/Timeouts', val: dt.outcomes.dropped, color: '#F87171', icon: AlertTriangle },
  ];

  const pipelineSteps = [
    { label: 'Incoming Request', sub: 'GET /api/data', icon: Activity, color: '#64748B', bgColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', size: 52 },
    { label: 'Feature Extractor', sub: '24 DNA Features', icon: Cpu, color: '#38BDF8', bgColor: 'rgba(56,189,248,0.08)', borderColor: 'rgba(56,189,248,0.25)', size: 52 },
    { label: 'Decision Engine', sub: dt.active_strategy, icon: BrainCircuit, color: '#A855F7', bgColor: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.45)', size: 68, glow: true },
    { label: 'Node Selected', sub: nodeRanking[0]?.name || '—', icon: Server, color: '#22C55E', bgColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)', size: 52 },
    { label: 'Request Forwarded', sub: '200 OK', icon: ShieldCheck, color: '#64748B', bgColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', size: 52 },
  ];

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', height: '100%' }}>

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            background: 'rgba(168, 85, 247, 0.15)', padding: 12, borderRadius: 12,
            border: '1px solid rgba(168, 85, 247, 0.3)',
            boxShadow: '0 0 24px rgba(168,85,247,0.2)',
          }}>
            <BrainCircuit size={28} color="#A855F7" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#F8FAFC', letterSpacing: '-0.02em' }}>Decision Engine</h1>
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
              Real-time intelligent routing — <span style={{ color: '#A855F7', fontWeight: 500 }}>{dt.active_strategy}</span> active
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 8, fontSize: 12, color: '#22C55E',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px #22C55E', animation: 'pulse 2s ease infinite' }} />
            Engine Online
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 12, color: '#E2E8F0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, cursor: 'pointer', outline: 'none' }}>
            Last 15 min <ChevronDown size={13} color="#64748B" />
          </button>
        </div>
      </div>

      {/* ─── Top Metric Tiles ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatTile label="Active Strategy" value={dt.active_strategy === 'Hybrid ML' ? 'Hybrid ML' : dt.active_strategy} color="#38BDF8" icon={Settings2} />
        <StatTile label="Hedging Rate" value={`${dt.hedging_rate.toFixed(1)}%`} sub="P99 hedge triggers" color="#A855F7" icon={Zap} trend="down" />
        <StatTile label="Confidence Avg" value={`${dt.confidence_avg.toFixed(1)}%`} sub="Model certainty" color="#22C55E" icon={BrainCircuit} trend="up" />
        <StatTile label="Requests Optimized" value={dt.requests_optimized.toLocaleString()} sub="Since engine start" color="#F59E0B" icon={ShieldCheck} />
      </div>

      {/* ─── Live Pipeline + Confidence Gauge ─── */}
      <Panel style={{ padding: '28px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h3 style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500 }}>Live Decision Pipeline</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s ease infinite' }} />
            Processing in real-time
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {pipelineSteps.map((step, idx) => (
            <React.Fragment key={step.label}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{
                  width: step.size, height: step.size, borderRadius: step.size === 68 ? 16 : 12,
                  background: step.bgColor, border: `1px solid ${step.borderColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: step.glow ? `0 0 24px rgba(168,85,247,0.25)` : 'none',
                  transition: 'box-shadow 0.3s ease',
                }}>
                  <step.icon size={step.size === 68 ? 30 : 22} color={step.color} />
                </div>
                <div style={{ textAlign: 'center', maxWidth: 90 }}>
                  <p style={{ fontSize: 11, color: '#E2E8F0', fontWeight: step.glow ? 600 : 500, lineHeight: 1.3 }}>{step.label}</p>
                  <p style={{ fontSize: 10, color: step.glow ? step.color : '#64748B', marginTop: 2 }}>{step.sub}</p>
                </div>
              </div>
              {idx < pipelineSteps.length - 1 && <FlowArrow />}
            </React.Fragment>
          ))}

          {/* Confidence gauge on far right */}
          <div style={{ flexShrink: 0, marginLeft: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <ConfidenceGauge value={dt.confidence_avg} />
            <p style={{ fontSize: 10, color: '#64748B' }}>Current Decision</p>
          </div>
        </div>
      </Panel>

      {/* ─── Algorithm + Node Ranking ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>

        {/* Strategy Donut */}
        <Panel>
          <h3 style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500, marginBottom: 16 }}>Algorithm Contribution</h3>
          <div style={{ display: 'flex', alignItems: 'center', height: 180 }}>
            <div style={{ width: 180, height: 180, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={strategyData} innerRadius={55} outerRadius={78} paddingAngle={4} dataKey="value" stroke="none">
                    {strategyData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#F8FAFC', lineHeight: 1 }}>{dt.strategy_distribution.Hybrid}%</p>
                <p style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>Hybrid ML</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, paddingLeft: 20 }}>
              {strategyData.map(s => (
                <div key={s.name}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                      <span style={{ fontSize: 11, color: '#CBD5E1' }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 600 }}>{s.value}%</span>
                  </div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{ width: `${s.value}%`, height: '100%', background: s.color, borderRadius: 1 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Node Ranking Table */}
        <Panel>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500 }}>Live Node Candidates</h3>
            <span style={{ fontSize: 10, color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ranked by Health Score</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 80px 80px', gap: 8, padding: '0 0 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>#</span>
              <span>Node</span>
              <span style={{ textAlign: 'right' }}>Health</span>
              <span style={{ textAlign: 'right' }}>Latency</span>
              <span style={{ textAlign: 'right' }}>RPS</span>
            </div>
            {nodeRanking.map((n, i) => (
              <div key={n.name} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 80px 80px', gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{i + 1}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {i === 0 && (
                    <span style={{ fontSize: 9, color: '#A855F7', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>SELECTED</span>
                  )}
                  <span style={{ fontSize: 12, color: i === 0 ? '#F8FAFC' : '#94A3B8', fontWeight: i === 0 ? 600 : 400 }}>{n.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <div style={{ flex: 1, maxWidth: 40, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{ width: `${n.score * 100}%`, height: '100%', background: n.color, borderRadius: 1 }} />
                  </div>
                  <span style={{ fontSize: 11, color: n.color, fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{(n.score * 100).toFixed(0)}%</span>
                </div>
                <span style={{ fontSize: 11, color: '#94A3B8', textAlign: 'right' }}>{n.latency}ms</span>
                <span style={{ fontSize: 11, color: '#94A3B8', textAlign: 'right' }}>{n.rps.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ─── Confidence + Hedging History ─── */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500 }}>Engine Telemetry <span style={{ color: '#64748B', fontWeight: 400, fontSize: 12 }}>(Last 40 Updates)</span></h3>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 2, background: '#22C55E', display: 'inline-block', borderRadius: 1 }} />Confidence</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 2, background: '#A855F7', display: 'inline-block', borderRadius: 1 }} />Hedging Rate</span>
          </div>
        </div>
        <div style={{ height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="hedgeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="confidence" name="Confidence %" stroke="#22C55E" fill="url(#confGrad)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="hedging" name="Hedging %" stroke="#A855F7" fill="url(#hedgeGrad)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ─── Routing Outcomes ─── */}
      <Panel>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500 }}>Routing Outcomes <span style={{ fontSize: 12, color: '#64748B', fontWeight: 400 }}>(Live)</span></h3>
          <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Distribution of decision results across {totalReqs.toLocaleString()} recent requests.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {outcomeBuckets.map((b) => {
            const pct = totalReqs > 0 ? (b.val / totalReqs) * 100 : 0;
            // SVG ring
            const r = 28;
            const circ = 2 * Math.PI * r;
            const fillLen = (pct / 100) * circ;
            return (
              <div key={b.label} style={{
                background: `linear-gradient(145deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))`,
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: '18px 16px',
                display: 'flex', flexDirection: 'column', gap: 12,
                transition: 'border-color 0.2s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b.icon size={15} color={b.color} />
                    <span style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 500 }}>{b.label}</span>
                  </div>
                  {/* Mini ring */}
                  <svg width="36" height="36" viewBox="0 0 70 70" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
                    <circle cx="35" cy="35" r={r} fill="none" stroke={b.color} strokeWidth="7"
                      strokeDasharray={`${fillLen} ${circ}`} strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.6s ease' }} />
                  </svg>
                </div>

                <div>
                  <p style={{ fontSize: 30, fontWeight: 700, color: b.color, lineHeight: 1 }}>{b.val.toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: '#64748B', marginTop: 6 }}>{b.desc}</p>
                </div>

                <div>
                  <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: b.color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                  <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 6, textAlign: 'right', fontWeight: 500 }}>{pct.toFixed(1)}% of Traffic</p>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

    </div>
  );
};

export default DecisionEngine;
