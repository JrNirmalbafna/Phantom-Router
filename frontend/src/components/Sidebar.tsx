import React from 'react';
import {
  LayoutDashboard, Server, Activity, GitBranch,
  BrainCircuit, Gauge, Search, Settings,
} from 'lucide-react';

const NAV = [
  { id: 'overview',  label: 'Overview',    icon: LayoutDashboard },
  { id: 'nodes',     label: 'Nodes',       icon: Server          },
  { id: 'traffic',   label: 'Traffic',     icon: Activity        },
  { id: 'decisions', label: 'Decisions',   icon: GitBranch       },
  { id: 'predictor', label: 'AI Predictor',icon: BrainCircuit    },
  { id: 'benchmark', label: 'Benchmark',   icon: Gauge           },
  { id: 'requests',  label: 'Requests',    icon: Search          },
  { id: 'config',    label: 'Config',      icon: Settings        },
];

interface Props {
  active: string;
  onSelect: (id: string) => void;
  isConnected: boolean;
}

const Sidebar: React.FC<Props> = ({ active, onSelect, isConnected }) => (
  <aside style={{
    width: 216,
    minWidth: 216,
    height: '100vh',
    position: 'sticky',
    top: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 14px 20px',
    gap: 4,
    /* subtle right edge only — no hard border */
    borderRight: '1px solid rgba(255,255,255,0.045)',
    background: 'rgba(6,11,18,0.98)',
  }}>
    {/* Brand */}
    <div style={{ padding: '0 4px 22px', marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Icon mark — soft aurora glow */}
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, #1E40AF 0%, #0EA5E9 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(14,165,233,0.25)',
        }}>
          <Activity size={15} color="#fff" />
        </div>
        <div>
          <p style={{
            fontWeight: 650, fontSize: 14.5, lineHeight: 1,
            color: '#E2E8F0', letterSpacing: '-0.025em',
          }}>FluxRoute</p>
          <p style={{
            fontSize: 9.5, color: '#334155', marginTop: 3,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Adaptive Router</p>
        </div>
      </div>
    </div>

    {/* Sep */}
    <div className="sep" style={{ marginBottom: 8 }} />

    {/* Nav */}
    <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {NAV.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`nav-item${active === id ? ' active' : ''}`}
          onClick={() => onSelect(id)}
        >
          <Icon size={15} style={{ opacity: active === id ? 1 : 0.6, flexShrink: 0 }} />
          {label}
        </button>
      ))}
    </nav>

    {/* Status footer */}
    <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.045)' }}>
      <p style={{
        fontSize: 9.5, color: '#334155', textTransform: 'uppercase',
        letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8,
      }}>System Status</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          className="dot-live"
          style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: isConnected ? '#22C55E' : '#F87171',
          }}
        />
        <span style={{
          fontSize: 11.5,
          color: isConnected ? '#4ADE80' : '#F87171',
          fontWeight: 500,
        }}>
          {isConnected ? 'All Systems Operational' : 'Backend Offline'}
        </span>
      </div>
    </div>
  </aside>
);

export default Sidebar;
