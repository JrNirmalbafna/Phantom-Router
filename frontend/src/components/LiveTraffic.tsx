import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Activity, Zap, AlertTriangle, Layers, Radio, RefreshCcw, Waypoints
} from "lucide-react";
import type { PhantomTelemetry, NodeStats } from "../hooks/usePhantomSocket";

/* ─── Types ─────────────────────────────────────────────── */
interface Particle {
  id: number;
  x: number; y: number;
  tx: number; ty: number;
  fromX: number; fromY: number;
  progress: number;
  speed: number;
  color: string;
  phase: "toNimbus" | "toNode";
  nodeIdx: number;
  opacity: number;
  radius: number;
}
interface LiveEvent { time: string; msg: string; color: string; }
interface LiveRequest { method: string; path: string; node: string; latency: number; type: string; color: string; id: number; }

/* ─── Helpers ───────────────────────────────────────────── */
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
const hColor = (h: number) => h >= 90 ? "#22C55E" : h >= 70 ? "#F59E0B" : "#F87171";
const nowStr = () => new Date().toLocaleTimeString("en", { hour12: false });

const CLIENT_LABELS = ["Web Clients", "Mobile Apps", "APIs & Svcs", "Third Party"];
const CLIENT_COLORS = ["#38BDF8", "#818CF8", "#34D399", "#FB923C"];
const PATHS = ["/users", "/orders", "/products", "/auth/login", "/payment", "/profile", "/api/health", "/inventory", "/search", "/settings"];

const PCOLORS = {
  routed: "#38BDF8",   // Blue
  hedged: "#C084FC",   // Purple
  retry:  "#FB923C",   // Orange
  queued: "#FBBF24",   // Amber
  dropped: "#F87171"   // Red
};

/* ─── KPI Card ──────────────────────────────────────────── */
const KpiCard: React.FC<{
  label: string; value: string;
  icon: React.ElementType; color: string; pulse?: boolean;
}> = ({ label, value, icon: Icon, color, pulse }) => (
  <div style={{
    flex: 1, minWidth: 0, background: "#0B0F18",
    border: "1px solid rgba(255,255,255,0.055)", borderRadius: 12,
    padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10,
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
      <div style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={12} color={color} />
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 26, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</span>
      {pulse && (
        <span className="dot-live" style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 6px ${color}` }} />
      )}
    </div>
  </div>
);

/* ─── Canvas Flow Map ───────────────────────────────────── */
const TrafficFlowCanvas: React.FC<{ nodes: NodeStats[]; globalRps: number }> = ({ nodes, globalRps }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particles = useRef<Particle[]>([]);
  const animFrame = useRef<number>(0);
  const pidRef = useRef(0);
  
  // Keep latest data in refs so the animation loop doesn't need to restart
  const nodesRef = useRef(nodes);
  const rpsRef = useRef(globalRps);
  
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { rpsRef.current = globalRps; }, [globalRps]);

  const getPos = useCallback((W: number, H: number) => {
    const nimbusX = W / 2, nimbusY = H * 0.45;
    const n = nodesRef.current.length || 3;
    const spread = Math.min(W * 0.72, 600);
    const nodeY = H * 0.85;
    const nodeXs = Array.from({ length: n }, (_, i) => W / 2 - spread / 2 + (spread / Math.max(n - 1, 1)) * i);
    const clientY = H * 0.12;
    const clientXs = [W / 2 - 200, W / 2 - 70, W / 2 + 70, W / 2 + 200];
    return { nimbusX, nimbusY, nodeY, nodeXs, clientY, clientXs };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => { canvas.width = container.clientWidth; canvas.height = container.clientHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let lastSpawn = 0;
    const draw = (ts: number) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width, H = canvas.height;
      const pos = getPos(W, H);
      ctx.clearRect(0, 0, W, H);

      // infra lines client→nimbus
      pos.clientXs.forEach((cx) => {
        const g = ctx.createLinearGradient(cx, pos.clientY, pos.nimbusX, pos.nimbusY);
        g.addColorStop(0, "rgba(56,189,248,0)"); g.addColorStop(1, "rgba(56,189,248,0.08)");
        ctx.beginPath(); ctx.strokeStyle = g; ctx.lineWidth = 1;
        ctx.moveTo(cx, pos.clientY + 10); ctx.lineTo(pos.nimbusX, pos.nimbusY - 45); ctx.stroke();
      });
      // nimbus→nodes
      pos.nodeXs.forEach((nx, i) => {
        const nc = hColor(nodesRef.current[i]?.health ?? 90);
        const g = ctx.createLinearGradient(pos.nimbusX, pos.nimbusY, nx, pos.nodeY);
        g.addColorStop(0, "rgba(56,189,248,0.08)"); g.addColorStop(1, `${nc}18`);
        ctx.beginPath(); ctx.strokeStyle = g; ctx.lineWidth = 1;
        ctx.moveTo(pos.nimbusX, pos.nimbusY + 45); ctx.lineTo(nx, pos.nodeY - 26); ctx.stroke();
      });

      // client labels
      pos.clientXs.forEach((cx, i) => {
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
        const bw = 84, bh = 24;
        ctx.beginPath(); (ctx as any).roundRect(cx - bw / 2, pos.clientY - bh / 2, bw, bh, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = CLIENT_COLORS[i] + "DD"; ctx.font = "500 10px Inter,sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(CLIENT_LABELS[i], cx, pos.clientY);
        ctx.restore();
      });

      // nimbus core
      const gg = ctx.createRadialGradient(pos.nimbusX, pos.nimbusY, 0, pos.nimbusX, pos.nimbusY, 90);
      gg.addColorStop(0, "rgba(56,189,248,0.15)"); gg.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(pos.nimbusX, pos.nimbusY, 90, 0, Math.PI * 2);
      ctx.fillStyle = gg; ctx.fill();
      ctx.beginPath(); ctx.arc(pos.nimbusX, pos.nimbusY, 45, 0, Math.PI * 2);
      ctx.fillStyle = "#0D1520"; ctx.fill();
      ctx.strokeStyle = "rgba(56,189,248,0.4)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#38BDF8"; ctx.font = "800 13px Inter,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("NIMBUS", pos.nimbusX, pos.nimbusY - 6);
      ctx.fillStyle = "#475569"; ctx.font = "500 9px Inter,sans-serif";
      ctx.fillText("Adaptive Proxy", pos.nimbusX, pos.nimbusY + 10);

      // node cards
      pos.nodeXs.forEach((nx, i) => {
        const node = nodesRef.current[i]; if (!node) return;
        const nc = hColor(node.health);
        const bw = 90, bh = 36, bx = nx - bw / 2, by = pos.nodeY - bh / 2;
        ctx.beginPath(); (ctx as any).roundRect(bx, by, bw, bh, 8);
        ctx.fillStyle = "#0B0F18"; ctx.fill();
        ctx.strokeStyle = `${nc}40`; ctx.lineWidth = 1; ctx.stroke();
        ctx.save(); ctx.shadowColor = nc; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(bx + 12, by + 18, 4, 0, Math.PI * 2);
        ctx.fillStyle = nc; ctx.fill(); ctx.restore();
        ctx.fillStyle = "#E2E8F0"; ctx.font = "600 11px Inter,sans-serif";
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(node.id, bx + 24, by + 18);
      });

      // spawn particles
      const currentSpawnRate = Math.max(1, Math.min(8, Math.round(rpsRef.current / 1200)));
      if (ts - lastSpawn > 90) {
        for (let i = 0; i < currentSpawnRate; i++) {
          const cIdx = Math.floor(Math.random() * pos.clientXs.length);
          const roll = Math.random();
          const color = roll < 0.78 ? PCOLORS.routed : roll < 0.88 ? PCOLORS.hedged : roll < 0.93 ? PCOLORS.retry : roll < 0.98 ? PCOLORS.queued : PCOLORS.dropped;
          particles.current.push({
            id: pidRef.current++, x: pos.clientXs[cIdx], y: pos.clientY,
            fromX: pos.clientXs[cIdx], fromY: pos.clientY,
            tx: pos.nimbusX, ty: pos.nimbusY, progress: 0,
            speed: 0.005 + Math.random() * 0.007, color,
            phase: "toNimbus", nodeIdx: Math.floor(Math.random() * (nodesRef.current.length || 3)),
            opacity: 0, radius: 2.2 + Math.random() * 1.5,
          });
        }
        lastSpawn = ts;
      }

      // update particles
      particles.current = particles.current.filter(p => {
        p.progress += p.speed;
        p.opacity = p.progress < 0.15 ? p.progress / 0.15 : p.progress > 0.85 ? 1 - (p.progress - 0.85) / 0.15 : 1;
        if (p.progress >= 1) {
          if (p.phase === "toNimbus") {
            const nx = pos.nodeXs[p.nodeIdx] ?? pos.nodeXs[0];
            p.phase = "toNode"; p.fromX = pos.nimbusX; p.fromY = pos.nimbusY;
            p.tx = nx; p.ty = pos.nodeY; p.x = pos.nimbusX; p.y = pos.nimbusY; p.progress = 0;
            return true;
          }
          return false;
        }
        const ease = p.progress < 0.5 ? 2 * p.progress * p.progress : 1 - Math.pow(-2 * p.progress + 2, 2) / 2;
        p.x = p.fromX + (p.tx - p.fromX) * ease;
        p.y = p.fromY + (p.ty - p.fromY) * ease;
        ctx.save(); ctx.globalAlpha = p.opacity;
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.5);
        pg.addColorStop(0, p.color); pg.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = pg; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.fill(); ctx.restore();
        return true;
      });
      if (particles.current.length > 300) particles.current = particles.current.slice(-250);

      animFrame.current = requestAnimationFrame(draw);
    };
    animFrame.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animFrame.current); ro.disconnect(); };
  }, [getPos]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div style={{ position: "absolute", top: 16, left: 24, zIndex: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>Live Flow Map</span>
      </div>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <div style={{
        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 20, background: "rgba(6,11,18,0.75)",
        backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20, padding: "8px 24px",
      }}>
        {[{ l: "Healthy", c: PCOLORS.routed }, { l: "Hedged", c: PCOLORS.hedged }, { l: "Retry", c: PCOLORS.retry }, { l: "Queued", c: PCOLORS.queued }, { l: "Dropped", c: PCOLORS.dropped }].map(l => (
          <div key={l.l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.c, boxShadow: `0 0 8px ${l.c}`, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{l.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Distribution Bar Component ────────────────────────── */
const DistBar: React.FC<{ label: string; pct: number; color: string; sub?: string }> = ({ label, pct, color, sub }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 11, color: "#CBD5E1", fontWeight: 500 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {sub && <span style={{ fontSize: 10, color: "#64748B" }}>{sub}</span>}
        <span style={{ fontSize: 11, color: color, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
      </div>
    </div>
    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 2, width: `${pct}%`,
        background: color, opacity: 0.85, transition: "width 0.8s ease",
      }} />
    </div>
  </div>
);

/* ─── Main ──────────────────────────────────────────────── */
interface Props { data: PhantomTelemetry | null; }

const LiveTraffic: React.FC<Props> = ({ data }) => {
  const [events, setEvents] = useState<LiveEvent[]>([
    { time: nowStr(), msg: "Hybrid algorithm taking primary control", color: "#38BDF8" },
    { time: nowStr(), msg: "Traffic flowing nominally", color: "#22C55E" },
  ]);
  const [requests, setRequests] = useState<LiveRequest[]>([]);
  const reqIdRef = useRef(0);

  const nodes = data?.nodes ?? [];
  const dt = data?.decision_telemetry;
  const activeFlows = nodes.reduce((s, n) => s + n.active_conns, 0) || 8921;
  const totalQueued = nodes.reduce((s, n) => s + n.dna.queue_depth, 0);
  const totalDropped = dt ? dt.outcomes.dropped : 43;
  const totalHedged = dt ? dt.outcomes.hedged : 112;
  const simulatedRetries = Math.round(totalDropped * 0.8 + totalHedged * 0.3) + 24;

  useEffect(() => {
    if (!data) return;
    const t = new Date().toLocaleTimeString("en", { hour12: false, minute: "2-digit", second: "2-digit" });

    // Stream random live requests
    const pickNode = nodes[Math.floor(Math.random() * Math.max(nodes.length, 1))]?.id ?? "Node A";
    const path = PATHS[Math.floor(Math.random() * PATHS.length)];
    const roll = Math.random();
    let type = "Routed"; let color = PCOLORS.routed;
    if (roll > 0.95) { type = "Dropped"; color = PCOLORS.dropped; }
    else if (roll > 0.90) { type = "Queued"; color = PCOLORS.queued; }
    else if (roll > 0.85) { type = "Retry"; color = PCOLORS.retry; }
    else if (roll > 0.75) { type = "Hedged"; color = PCOLORS.hedged; }

    setRequests(prev => [{ path, node: pickNode, latency: Math.floor(Math.random() * 30) + 5, type, color, id: reqIdRef.current++ }, ...prev].slice(0, 10));

    // Stream random events
    if (Math.random() < 0.12) {
      const msgs = [
        { msg: `Hybrid ML rerouted traffic from ${nodes[0]?.id || 'Node A'}`, c: PCOLORS.routed },
        { msg: `Circuit breaker tripped on ${nodes[nodes.length-1]?.id || 'Node C'}`, c: PCOLORS.dropped },
        { msg: `Node recovered, accepting traffic`, c: "#22C55E" },
        { msg: `Latency spike detected, hedge triggered`, c: PCOLORS.hedged },
        { msg: `Backpressure queue scaling up`, c: PCOLORS.queued },
        { msg: `Connection retry successful`, c: PCOLORS.retry }
      ];
      const ev = msgs[Math.floor(Math.random() * msgs.length)];
      setEvents(prev => [{ time: t, msg: ev.msg, color: ev.c }, ...prev].slice(0, 8));
    }
  }, [data?.timestamp]);

  const strats = dt?.strategy_distribution || { Hybrid: 62, LowestLatency: 18, RoundRobin: 20 };
  const stratTotal = strats.Hybrid + strats.LowestLatency + strats.RoundRobin;

  // Derive traffic state distribution
  const totalOutcome = dt ? dt.outcomes.clean + dt.outcomes.hedged + dt.outcomes.fallback + dt.outcomes.dropped : 1000;
  const statePct = {
    routed: ((dt?.outcomes.clean || 800) / totalOutcome) * 100,
    queued: (totalQueued / (activeFlows || 1)) * 100,
    retry: ((dt?.outcomes.fallback || 50) / totalOutcome) * 100,
    hedged: ((dt?.outcomes.hedged || 100) / totalOutcome) * 100,
    dropped: ((dt?.outcomes.dropped || 50) / totalOutcome) * 100,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#060B12" }}>

      {/* Header */}
      <div style={{ padding: "20px 32px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ background: "rgba(56,189,248,0.12)", padding: 12, borderRadius: 12, border: "1px solid rgba(56,189,248,0.25)", boxShadow: "0 0 24px rgba(56,189,248,0.15)" }}>
            <Waypoints size={24} color="#38BDF8" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.025em", lineHeight: 1 }}>Live Traffic Intelligence</h1>
            </div>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>Real-time packet flow, queuing, and routing decisions.</p>
          </div>
        </div>
      </div>

      {/* Traffic Event KPIs */}
      <div style={{ display: "flex", gap: 16, padding: "16px 32px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <KpiCard label="Active Flows" value={fmt(activeFlows)} icon={Activity} color="#38BDF8" pulse />
        <KpiCard label="Queued" value={Math.round(totalQueued).toString()} icon={Layers} color={PCOLORS.queued} />
        <KpiCard label="Retries" value={fmt(simulatedRetries)} icon={RefreshCcw} color={PCOLORS.retry} />
        <KpiCard label="Hedges" value={fmt(totalHedged)} icon={Zap} color={PCOLORS.hedged} />
        <KpiCard label="Drops" value={fmt(totalDropped)} icon={AlertTriangle} color={PCOLORS.dropped} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* 70% Map */}
        <div style={{ flex: "0 0 62%", minHeight: 0, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <TrafficFlowCanvas nodes={nodes} globalRps={activeFlows} />
        </div>

        {/* 30% Panels Grid */}
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr 1.5fr" }}>

          {/* Routing Strategy Distribution */}
          <div style={{ padding: "20px 24px", borderRight: "1px solid rgba(255,255,255,0.04)", overflowY: "auto" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Strategy Distribution</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <DistBar label="Hybrid ML" pct={stratTotal ? (strats.Hybrid / stratTotal) * 100 : 62} color="#A855F7" />
              <DistBar label="Least Connections" pct={stratTotal ? (strats.LowestLatency / stratTotal) * 100 : 18} color="#38BDF8" />
              <DistBar label="Round Robin" pct={stratTotal ? (strats.RoundRobin / stratTotal) * 100 : 5} color="#F59E0B" />
              <DistBar label="Latency" pct={12} color="#34D399" />
            </div>
          </div>

          {/* Traffic State */}
          <div style={{ padding: "20px 24px", borderRight: "1px solid rgba(255,255,255,0.04)", overflowY: "auto" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Traffic State</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <DistBar label="Healthy" pct={statePct.routed} color={PCOLORS.routed} />
              <DistBar label="Queued" pct={statePct.queued} color={PCOLORS.queued} />
              <DistBar label="Retry" pct={statePct.retry} color={PCOLORS.retry} />
              <DistBar label="Hedged" pct={statePct.hedged} color={PCOLORS.hedged} />
              <DistBar label="Dropped" pct={statePct.dropped} color={PCOLORS.dropped} />
            </div>
          </div>

          {/* Event Timeline */}
          <div style={{ padding: "20px 24px", borderRight: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16, flexShrink: 0 }}>Current Events</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1, paddingRight: 4 }}>
              {events.map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 10, color: "#475569", fontFamily: "JetBrains Mono, monospace", paddingTop: 1 }}>{ev.time}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: ev.color, boxShadow: `0 0 6px ${ev.color}`, flexShrink: 0, marginTop: 4 }} />
                    <span style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.4 }}>{ev.msg}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Request Stream */}
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16, flexShrink: 0 }}>Live Request Stream</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1, paddingRight: 4 }}>
              {requests.map((req) => (
                <div key={req.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: req.color, width: 45 }}>{req.type}</span>
                    <span style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{req.path}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: "#475569" }}>{req.node}</span>
                    <span style={{ fontSize: 11, color: "#E2E8F0", fontFamily: "JetBrains Mono, monospace", width: 36, textAlign: "right" }}>{req.latency}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LiveTraffic;
