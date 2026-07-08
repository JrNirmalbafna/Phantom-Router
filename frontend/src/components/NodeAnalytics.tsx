import React, { useState, useEffect } from 'react';
import {
  Activity, Clock, AlertOctagon, Heart, ChevronDown, RefreshCw, MoreHorizontal,
  ChevronRight, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight,
  ShieldAlert, Radio, Server, Network
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis, LineChart, Line } from 'recharts';
import type { NodeStats } from '../hooks/usePhantomSocket';

/* ─── Shared Components ───────────────────────── */

const Panel: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
  <div className={`surface-ghost p-5 ${className}`} style={{ background: '#0B0F15', ...style }}>
    {children}
  </div>
);

const TrendIndicator: React.FC<{ value: number; label: string; positiveGood?: boolean }> = ({ value, label, positiveGood = true }) => {
  const isUp = value >= 0;
  const color = (isUp && positiveGood) || (!isUp && !positiveGood) ? '#22C55E' : '#F87171';
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94A3B8' }}>
      <Icon size={12} color={color} />
      <span style={{ color, fontWeight: 500 }}>{Math.abs(value).toFixed(1)}%</span>
      <span>{label}</span>
    </div>
  );
};

/* ─── Metric Card ─────────────────────────────── */

const MetricCard: React.FC<{
  title: string; value: string; trendVal: number; trendLabel: string; positiveGood: boolean; history: number[]; color: string;
}> = ({ title, value, trendVal, trendLabel, positiveGood, history, color }) => {
  const chartData = history.map((v, i) => ({ val: v, i }));
  return (
    <Panel style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px' }}>
      <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{title}</p>
      <span style={{ fontSize: 24, fontWeight: 600, color: '#F8FAFC', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
        <TrendIndicator value={trendVal} label={trendLabel} positiveGood={positiveGood} />
        <div style={{ width: 60, height: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="val" stroke={color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  );
};

/* ─── Mini TimeSeries Chart ───────────────────── */
const MiniChart: React.FC<{ title: string; value: string; data: number[]; color: string; yMax?: number }> = ({ title, value, data, color, yMax }) => {
  const chartData = data.map((v, i) => ({ val: v, i }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, padding: '0 12px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#E2E8F0', fontWeight: 500 }}>{title}</span>
        <span style={{ fontSize: 11, color: color, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 40, marginTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            {yMax !== undefined && <YAxis domain={[0, yMax]} hide />}
            <Area type="monotone" dataKey="val" stroke={color} fill={`${color}10`} strokeWidth={1.5} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748B' }}>
        <span>15m ago</span><span>10m ago</span><span>5m ago</span><span>Now</span>
      </div>
    </div>
  );
};

/* ─── Main Component ──────────────────────────── */

interface Props { node: NodeStats | null; }

const NodeAnalytics: React.FC<Props> = ({ node }) => {
  const [hist, setHist] = useState<{ rps: number; lat: number; err: number; hlth: number; fp: number; cpu: number; mem: number }[]>([]);

  useEffect(() => {
    if (!node) return;
    setHist(prev => {
      const newHist = [...prev, {
        rps: node.rps, 
        lat: node.dna.current_latency_ms,
        err: node.dna.error_rate_5xx * 100, 
        hlth: node.health, 
        fp: node.failure_prob * 100,
        cpu: Math.min((node.rps/4000)*100, 100),
        mem: 46
      }];
      return newHist.length > 60 ? newHist.slice(newHist.length - 60) : newHist;
    });
  }, [node]);

  if (!node) {
    return <div className="p-8 text-slate-400">Select a node from the Overview to view analytics.</div>;
  }

  const hColor = node.health >= 90 ? '#22C55E' : node.health >= 70 ? '#F59E0B' : '#F87171';
  
  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', height: '100%' }}>
      
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748B', marginBottom: 8 }}>
            <span style={{ color: '#38BDF8', cursor: 'pointer' }}>Nodes</span>
            <ChevronRight size={14} />
            <span style={{ color: '#E2E8F0' }}>{node.id}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#F8FAFC', letterSpacing: '-0.02em' }}>{node.id}</h1>
            <div style={{ background: `${hColor}15`, border: `1px solid ${hColor}30`, padding: '2px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: hColor, boxShadow: `0 0 8px ${hColor}` }} />
              <span style={{ fontSize: 11, color: hColor, fontWeight: 500 }}>{node.health >= 90 ? 'Healthy' : 'Degraded'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
            <span>10.0.0.1:8080</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#475569' }} />
            <span>Backend Server</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#475569' }} />
            <span>Added 14 days ago</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="surface-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', fontSize: 12, color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }}>
            Last 15 minutes <ChevronDown size={14} color="#94A3B8" />
          </button>
          <button className="surface-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', fontSize: 12, color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} color="#94A3B8" /> Refresh
          </button>
          <button className="surface-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, border: '1px solid rgba(255,255,255,0.08)' }}>
            <MoreHorizontal size={14} color="#94A3B8" />
          </button>
        </div>
      </div>

      {/* ─── Top Metrics (2 Columns) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        
        {/* Left: 2x2 Metric Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <MetricCard title="Requests / sec" value={node.rps.toLocaleString(undefined, {maximumFractionDigits:0})} trendVal={12.4} trendLabel="vs 15m ago" positiveGood={true} history={hist.map(h => h.rps)} color="#38BDF8" />
          <MetricCard title="Avg Latency" value={`${node.dna.current_latency_ms.toFixed(1)} ms`} trendVal={-8.2} trendLabel="vs 15m ago" positiveGood={false} history={hist.map(h => h.lat)} color="#A855F7" />
          <MetricCard title="P95 Latency" value={`${(node.dna.current_latency_ms * 1.3).toFixed(1)} ms`} trendVal={7.6} trendLabel="vs 15m ago" positiveGood={false} history={hist.map(h => h.lat * 1.3)} color="#22C55E" />
          <MetricCard title="Error Rate" value={`${(node.dna.error_rate_5xx * 100).toFixed(2)}%`} trendVal={-0.01} trendLabel="vs 15m ago" positiveGood={false} history={hist.map(h => h.err)} color="#F87171" />
        </div>

        {/* Right: Large Health Card */}
        <Panel style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 500, marginBottom: 8 }}>Node Health</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                <span style={{ fontSize: 42, fontWeight: 700, color: hColor, lineHeight: 1 }}>{Math.round(node.health)}%</span>
                <div style={{ width: 120, height: 32, paddingBottom: 4 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hist.map((h, i) => ({ val: h.hlth, i }))}>
                      <Line type="monotone" dataKey="val" stroke={hColor} dot={false} strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#64748B', marginTop: 24 }}>Uptime: 14d 3h 22m</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 160 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94A3B8' }}><CheckCircle2 size={12} color="#22C55E"/> Active Probes</span>
                <span style={{ fontSize: 11, color: '#E2E8F0' }}>3 / 3</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94A3B8' }}><Clock size={12} color="#22C55E"/> Last Probe</span>
                <span style={{ fontSize: 11, color: '#E2E8F0' }}>2s ago</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94A3B8' }}><ShieldAlert size={12} color={node.circuit_state === 'OPEN' ? '#F87171' : '#22C55E'}/> Circuit Breaker</span>
                <span style={{ fontSize: 11, color: '#E2E8F0' }}>{node.circuit_state === 'OPEN' ? 'Open' : 'Closed'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94A3B8' }}><Activity size={12} color="#22C55E"/> Rate Limit</span>
                <span style={{ fontSize: 11, color: '#E2E8F0' }}>Normal</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* ─── Row 2: Utilization, Load, Predictive (3 Columns) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {/* Resource Utilization */}
        <Panel style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 500 }}>Resource Utilization</h3>
            <span style={{ fontSize: 11, color: '#94A3B8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>Utilization % <ChevronDown size={12} style={{ display: 'inline' }} /></span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'center' }}>
            {[
              { label: 'CPU', val: Math.min((node.rps/4000)*100, 100), color: '#3B82F6' },
              { label: 'Memory', val: 46, color: '#8B5CF6' },
              { label: 'Disk I/O', val: 28, color: '#F59E0B' },
              { label: 'Network I/O', val: Math.min((node.rps/3000)*100, 100), color: '#22C55E' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 70, fontSize: 12, color: '#CBD5E1' }}>{r.label}</span>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${r.val}%`, height: '100%', background: r.color, borderRadius: 2 }} />
                </div>
                <span style={{ width: 30, textAlign: 'right', fontSize: 12, color: '#F8FAFC', fontWeight: 500 }}>{Math.round(r.val)}%</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Current Load */}
        <Panel style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 500, marginBottom: 20 }}>Current Load</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
            <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-225deg)' }}>
                <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" strokeDasharray="282 377" strokeLinecap="round" />
                {/* Arc color based on load: Green -> Yellow -> Red */}
                <circle cx="70" cy="70" r="60" fill="none" stroke={node.dna.queue_depth > 40 ? "#F59E0B" : "#22C55E"} strokeWidth="12" strokeDasharray={`${Math.min((node.dna.queue_depth/100) * 282, 282)} 377`} strokeLinecap="round" style={{ transition: 'all 0.5s ease' }} />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 600, color: '#F8FAFC' }}>{Math.round(Math.min((node.dna.queue_depth / 50) * 100, 100))}%</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>Load</span>
                <span style={{ fontSize: 11, color: node.dna.queue_depth > 40 ? '#F59E0B' : '#22C55E', fontWeight: 500, marginTop: 2 }}>{node.dna.queue_depth > 40 ? 'Warning' : 'Good'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              <div>
                <p style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>Active Connections</p>
                <p style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500 }}>{node.active_conns}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>Queued Requests</p>
                <p style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500 }}>{node.dna.queue_depth.toFixed(0)}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>Max Connections</p>
                <p style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500 }}>1,000</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>Keep-Alive</p>
                <p style={{ fontSize: 12, color: '#22C55E', fontWeight: 500 }}>Enabled</p>
              </div>
            </div>
          </div>
        </Panel>

        {/* Predictive Insights */}
        <Panel style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 500 }}>Predictive Insights</h3>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>Model: LightGBM • v1.2</span>
          </div>
          
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 100 }}>
              <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>Failure Probability</p>
              <p style={{ fontSize: 24, fontWeight: 600, color: '#22C55E' }}>{(node.failure_prob * 100).toFixed(1)}%</p>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Very Low Risk</p>
            </div>
            <div style={{ flex: 1, height: 60 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hist.map((h, i) => ({ fp: h.fp, i }))}>
                  <YAxis domain={[0, 10]} hide />
                  <Area type="step" dataKey="fp" stroke="#38BDF8" fill="transparent" strokeWidth={1.5} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748B', marginTop: 4 }}>
                <span>15m ago</span><span>10m ago</span><span>5m ago</span><span>Now</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ width: 80, fontSize: 12, color: '#CBD5E1' }}>Confidence</span>
              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `87%`, height: '100%', background: '#8B5CF6', borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <span style={{ width: 80, fontSize: 12, color: '#CBD5E1' }}>Trend</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22C55E', fontSize: 12, fontWeight: 500 }}>
                  <ArrowUpRight size={14} /> Improving
                </div>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Node is predicted to remain stable.</p>
              </div>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>Next 15 min</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* ─── Row 3: Time Series (1 Column Spanning Full) ─── */}
      <Panel style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 500 }}>Time Series <span style={{color: '#64748B', fontWeight: 400}}>(Last 15 Minutes)</span></h3>
          <span style={{ fontSize: 11, color: '#94A3B8', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}>All Metrics <ChevronDown size={12} style={{ display: 'inline' }} /></span>
        </div>
        <div style={{ display: 'flex', width: '100%', marginLeft: -12, marginRight: -12 }}>
          <MiniChart title="Requests / sec" value={`${node.rps.toLocaleString(undefined, {maximumFractionDigits:0})} req/s`} data={hist.map(h => h.rps)} color="#38BDF8" />
          <MiniChart title="Latency (ms)" value={`${node.dna.current_latency_ms.toFixed(1)} ms`} data={hist.map(h => h.lat)} color="#A855F7" />
          <MiniChart title="CPU Usage (%)" value={`${Math.round(Math.min((node.rps/4000)*100, 100))}%`} data={hist.map(h => h.cpu)} color="#3B82F6" yMax={100} />
          <MiniChart title="Memory Usage (%)" value={`46%`} data={hist.map(h => h.mem)} color="#8B5CF6" yMax={100} />
          <MiniChart title="Error Rate (%)" value={`${(node.dna.error_rate_5xx * 100).toFixed(2)}%`} data={hist.map(h => h.err)} color="#F87171" />
        </div>
      </Panel>

      {/* ─── Row 4: Recent Events Table (1 Column Spanning Full) ─── */}
      <Panel style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 500 }}>Recent Events</h3>
          <span style={{ fontSize: 12, color: '#38BDF8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all events <ChevronRight size={14} />
          </span>
        </div>
        
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 250px 1fr 80px', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11, color: '#94A3B8' }}>
          <span>Time</span>
          <span>Event</span>
          <span>Details</span>
          <span style={{ textAlign: 'right' }}>Level</span>
        </div>

        {/* Table Body */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { time: '14:21:34', icon: CheckCircle2, iconColor: '#22C55E', title: 'Health Check Passed', desc: 'HTTP probe 200 OK (142ms)', tag: 'INFO', tagColor: '#38BDF8' },
            { time: '14:20:11', icon: ArrowUpRight, iconColor: '#22C55E', title: 'Latency Improved', desc: `Avg latency improved from ${((node.dna.current_latency_ms || 10) + 1.5).toFixed(1)}ms to ${node.dna.current_latency_ms.toFixed(1)}ms`, tag: 'INFO', tagColor: '#38BDF8' },
            { time: '14:18:55', icon: CheckCircle2, iconColor: '#22C55E', title: 'Queue Normalized', desc: `Queue depth back to normal (${node.dna.queue_depth.toFixed(0)})`, tag: 'INFO', tagColor: '#38BDF8' },
            { time: '14:15:23', icon: AlertTriangle, iconColor: '#F59E0B', title: 'Traffic Spike Detected', desc: 'RPS increased by 24% in 1m', tag: 'WARN', tagColor: '#F59E0B' },
          ].map((e, i) => (
            <div key={i} className="tr-hover" style={{ display: 'grid', gridTemplateColumns: '120px 250px 1fr 80px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>{e.time}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <e.icon size={14} color={e.iconColor} />
                <span style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 500 }}>{e.title}</span>
              </div>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>{e.desc}</span>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 9, color: e.tagColor, border: `1px solid ${e.tagColor}40`, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{e.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

    </div>
  );
};

export default NodeAnalytics;
