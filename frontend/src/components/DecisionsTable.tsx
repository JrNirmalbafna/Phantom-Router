import React from 'react';

interface Row {
  time: string; requestId: string; algorithm: string;
  node: string; nodeColor: string; reason: string;
  confidence: number; latency: number;
}

const MOCK: Row[] = [
  { time: '14:21:15', requestId: '8a12f4d9', algorithm: 'Hybrid', node: 'Node B', nodeColor: '#818CF8', reason: 'Health 96%, Latency 11.7ms, Queue 18', confidence: 98, latency: 11.7 },
  { time: '14:21:14', requestId: '9b23c5ea', algorithm: 'Hybrid', node: 'Node A', nodeColor: '#38BDF8', reason: 'Health 98%, Latency 8.3ms, Queue 12',  confidence: 97, latency: 8.3  },
  { time: '14:21:14', requestId: '2c34d6fb', algorithm: 'Hybrid', node: 'Node C', nodeColor: '#4ADE80', reason: 'Health 92%, Latency 15.2ms, Queue 25', confidence: 92, latency: 15.2 },
  { time: '14:21:13', requestId: '7d45e7ac', algorithm: 'Hybrid', node: 'Node D', nodeColor: '#F59E0B', reason: 'Health 90%, Latency 16.9ms, Queue 31', confidence: 90, latency: 16.9 },
  { time: '14:21:12', requestId: '3e56f8bd', algorithm: 'Hybrid', node: 'Node A', nodeColor: '#38BDF8', reason: 'Health 98%, Latency 9.1ms, Queue 10',  confidence: 98, latency: 9.1  },
];

const ConfBar: React.FC<{ v: number }> = ({ v }) => {
  const c = v >= 95 ? '#4ADE80' : v >= 80 ? '#38BDF8' : '#F59E0B';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 52, height: 2, background: 'rgba(255,255,255,0.07)',
        borderRadius: 1, overflow: 'hidden',
      }}>
        <div style={{ height: '100%', width: `${v}%`, background: c, borderRadius: 1 }} />
      </div>
      <span className="tabular" style={{ fontSize: 11, color: '#64748B', fontWeight: 500, minWidth: 30 }}>
        {v}%
      </span>
    </div>
  );
};

const TH: React.CSSProperties = {
  fontSize: 9.5, fontWeight: 600, color: '#334155',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  padding: '0 16px 10px', textAlign: 'left',
  borderBottom: '1px solid rgba(255,255,255,0.055)',
  whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: '11px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.035)',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};

const DecisionsTable: React.FC<{ decisions?: string[] }> = () => (
  <div className="surface" style={{ padding: '18px 0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 16px' }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        Recent Decisions
      </p>
      <span style={{ fontSize: 11.5, color: '#38BDF8', cursor: 'pointer', opacity: 0.8 }}>View all →</span>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={TH}>Time</th>
            <th style={TH}>Request ID</th>
            <th style={TH}>Algorithm</th>
            <th style={TH}>Node</th>
            <th style={{ ...TH, width: '100%' }}>Reason</th>
            <th style={TH}>Confidence</th>
            <th style={TH}>Latency</th>
          </tr>
        </thead>
        <tbody>
          {MOCK.map((r, i) => (
            <tr
              key={i}
              className="tr-hover"
              style={{ cursor: 'default' }}
            >
              <td style={TD}>
                <span className="mono" style={{ fontSize: 11, color: '#334155' }}>{r.time}</span>
              </td>
              <td style={TD}>
                <span className="mono" style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.02em' }}>
                  {r.requestId}
                </span>
              </td>
              <td style={TD}>
                <span style={{
                  fontSize: 9.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(56,189,248,0.1)', color: '#38BDF8',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {r.algorithm}
                </span>
              </td>
              <td style={TD}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.nodeColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{r.node}</span>
                </div>
              </td>
              <td style={{ ...TD, maxWidth: 260 }}>
                <span style={{ fontSize: 11, color: '#475569' }}>{r.reason}</span>
              </td>
              <td style={TD}>
                <ConfBar v={r.confidence} />
              </td>
              <td style={TD}>
                <span className="tabular" style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
                  {r.latency.toFixed(1)} ms
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default DecisionsTable;
