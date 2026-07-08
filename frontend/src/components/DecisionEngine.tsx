import React from 'react';
import { Settings2, Zap, BrainCircuit, Activity, ArrowRight, ShieldCheck, Cpu, Server } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { PhantomTelemetry } from '../hooks/usePhantomSocket';

const Panel: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
  <div className={`surface-ghost p-5 ${className}`} style={{ background: '#0B0F15', ...style }}>
    {children}
  </div>
);

interface Props {
  data: PhantomTelemetry | null;
}

const DecisionEngine: React.FC<Props> = ({ data }) => {
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

  // Calculate ranking based on health/failure_prob 
  const nodeRanking = [...nodes].sort((a, b) => b.health - a.health).map(n => ({
    name: n.id,
    score: (n.health / 100).toFixed(2),
    color: n.health >= 90 ? '#22C55E' : n.health >= 70 ? '#F59E0B' : '#F87171'
  }));

  const totalReqs = dt.outcomes.clean + dt.outcomes.hedged + dt.outcomes.fallback + dt.outcomes.dropped;

  const outcomeBuckets = [
    { label: 'Clean Routes', desc: 'Fast, no hedge needed', val: dt.outcomes.clean, color: '#22C55E', icon: ShieldCheck },
    { label: 'Hedge Wins', desc: 'Saved by P99 Hedge', val: dt.outcomes.hedged, color: '#A855F7', icon: Zap },
    { label: 'Fallbacks', desc: 'Rerouted from failure', val: dt.outcomes.fallback, color: '#F59E0B', icon: Activity },
    { label: 'Dropped', desc: 'Hard failures/Timeouts', val: dt.outcomes.dropped, color: '#F87171', icon: Cpu },
  ];

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', height: '100%' }}>
      
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: 12, borderRadius: 12, border: '1px solid rgba(168, 85, 247, 0.3)' }}>
          <BrainCircuit size={28} color="#A855F7" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#F8FAFC', letterSpacing: '-0.02em' }}>Decision Engine</h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Real-time intelligent routing decisions</p>
        </div>
      </div>

      {/* ─── Top Metrics Row ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Panel>
          <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Settings2 size={14} color="#38BDF8"/> Active Strategy</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: '#F8FAFC' }}>{dt.active_strategy}</p>
        </Panel>
        <Panel>
          <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={14} color="#A855F7"/> Hedging Rate</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: '#A855F7' }}>{dt.hedging_rate.toFixed(1)}%</p>
        </Panel>
        <Panel>
          <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><BrainCircuit size={14} color="#22C55E"/> Confidence Avg</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: '#22C55E' }}>{dt.confidence_avg.toFixed(1)}%</p>
        </Panel>
        <Panel>
          <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={14} color="#F59E0B"/> Requests Optimized</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: '#F8FAFC' }}>{dt.requests_optimized.toLocaleString()}</p>
        </Panel>
      </div>

      {/* ─── Live Decision Flow Pipeline ─── */}
      <Panel style={{ padding: '32px 24px' }}>
        <h3 style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500, marginBottom: 24 }}>Live Decision Flow</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={24} color="#94A3B8" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 500 }}>Incoming Request</p>
              <p style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>GET /api/data</p>
            </div>
          </div>

          <ArrowRight size={20} color="#334155" />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={24} color="#38BDF8" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 500 }}>Feature Extractor</p>
              <p style={{ fontSize: 10, color: '#38BDF8', marginTop: 2 }}>24 DNA Features</p>
            </div>
          </div>

          <ArrowRight size={20} color="#334155" />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 80, height: 80, borderRadius: 16, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(168,85,247,0.2)' }}>
              <BrainCircuit size={32} color="#A855F7" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 600 }}>Decision Engine</p>
              <p style={{ fontSize: 11, color: '#A855F7', marginTop: 2 }}>{dt.active_strategy}</p>
            </div>
          </div>

          <ArrowRight size={20} color="#334155" />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={24} color="#22C55E" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 500 }}>Node Selected</p>
              <p style={{ fontSize: 10, color: '#22C55E', marginTop: 2 }}>{nodeRanking[0]?.name || 'Unknown'}</p>
            </div>
          </div>

          <ArrowRight size={20} color="#334155" />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} color="#94A3B8" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 500 }}>Request Forwarded</p>
              <p style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>200 OK</p>
            </div>
          </div>

        </div>
      </Panel>

      {/* ─── Algorithm & Ranking Row ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        
        {/* Strategy Donut */}
        <Panel>
          <h3 style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500, marginBottom: 16 }}>Algorithm Contribution</h3>
          <div style={{ display: 'flex', alignItems: 'center', height: 180 }}>
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={strategyData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {strategyData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, paddingLeft: 24 }}>
              {strategyData.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: 12, color: '#CBD5E1' }}>{s.name}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 500 }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Node Ranking Bar Chart */}
        <Panel>
          <h3 style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500, marginBottom: 16 }}>Live Node Candidates Ranking</h3>
          <div style={{ height: 180, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nodeRanking} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" domain={[0, 1]} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} width={80} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                  {nodeRanking.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* ─── Routing Outcomes (The Replacement for the Log) ─── */}
      <Panel>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 500 }}>Routing Outcomes (Live)</h3>
          <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Distribution of decision results across {totalReqs.toLocaleString()} recent requests.</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {outcomeBuckets.map((b) => {
            const pct = totalReqs > 0 ? (b.val / totalReqs) * 100 : 0;
            return (
              <div key={b.label} style={{ 
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
                borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <b.icon size={16} color={b.color} />
                  <span style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 500 }}>{b.label}</span>
                </div>
                
                <p style={{ fontSize: 28, fontWeight: 700, color: b.color, lineHeight: 1 }}>{b.val.toLocaleString()}</p>
                <p style={{ fontSize: 11, color: '#64748B', marginTop: 8 }}>{b.desc}</p>
                
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 16, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: b.color, borderRadius: 2 }} />
                </div>
                <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 6, textAlign: 'right' }}>{pct.toFixed(1)}% of Traffic</p>
              </div>
            );
          })}
        </div>
      </Panel>

    </div>
  );
};

export default DecisionEngine;
