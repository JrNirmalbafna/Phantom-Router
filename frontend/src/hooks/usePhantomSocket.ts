import { useState, useEffect, useRef } from 'react';

export type FeatureVector = {
  current_latency_ms: number;
  latency_rolling_avg_10s: number;
  latency_rolling_stddev_10s: number;
  latency_percentile_p99: number;
  requests_per_second: number;
  active_connections: number;
  queue_depth: number;
  error_rate_5xx: number;
  timeout_rate: number;
  connection_refused_count: number;
  latency_delta_last_5s: number;
  load_delta_last_5s: number;
  error_rate_delta_last_5s: number;
  time_since_last_restart: number;
  hour_of_day: number;
};

export type NodeStats = {
  id: string;
  health: number;
  rps: number;
  active_conns: number;
  circuit_state: 'CLOSED' | 'OPEN' | 'HALF-OPEN';
  failure_prob: number;
  dna: FeatureVector;
  sensor_dna: Record<string, number>;
};

export type DecisionTelemetry = {
  active_strategy: string;
  hedging_rate: number;
  confidence_avg: number;
  requests_optimized: number;
  strategy_distribution: {
    Hybrid: number;
    LowestLatency: number;
    RoundRobin: number;
  };
  outcomes: {
    clean: number;
    hedged: number;
    fallback: number;
    dropped: number;
  };
};

export type PhantomTelemetry = {
  timestamp: number;
  nodes: NodeStats[];
  decisions: string[];
  global_rps: number;
  latency_histogram: number[];
  decision_telemetry: DecisionTelemetry;
};

/* ─── Realistic mock that varies over time ─────────────── */
const makeMock = (): PhantomTelemetry => {
  const t = Date.now();
  const jitter = (base: number, pct = 0.08) => base + (Math.random() - 0.5) * base * pct;

  const nodes: NodeStats[] = [
    { id: 'Node A', health: jitter(98), rps: jitter(2512), active_conns: Math.round(jitter(412)), circuit_state: 'CLOSED', failure_prob: jitter(0.02),
      dna: { current_latency_ms: jitter(8.3), latency_rolling_avg_10s: 8.1, latency_rolling_stddev_10s: 0.8, latency_percentile_p99: 14, requests_per_second: jitter(2512), active_connections: 412, queue_depth: jitter(12), error_rate_5xx: 0.0003, timeout_rate: 0.0001, connection_refused_count: 0, latency_delta_last_5s: 0.1, load_delta_last_5s: 0.2, error_rate_delta_last_5s: 0, time_since_last_restart: 8200, hour_of_day: 14 },
      sensor_dna: {} },
    { id: 'Node B', health: jitter(96), rps: jitter(2478), active_conns: Math.round(jitter(398)), circuit_state: 'CLOSED', failure_prob: jitter(0.04),
      dna: { current_latency_ms: jitter(11.7), latency_rolling_avg_10s: 11.5, latency_rolling_stddev_10s: 1.2, latency_percentile_p99: 18, requests_per_second: jitter(2478), active_connections: 398, queue_depth: jitter(18), error_rate_5xx: 0.0008, timeout_rate: 0.0002, connection_refused_count: 0, latency_delta_last_5s: -0.2, load_delta_last_5s: 0.1, error_rate_delta_last_5s: 0, time_since_last_restart: 7600, hour_of_day: 14 },
      sensor_dna: {} },
    { id: 'Node C', health: jitter(92), rps: jitter(2101), active_conns: Math.round(jitter(287)), circuit_state: 'CLOSED', failure_prob: jitter(0.08),
      dna: { current_latency_ms: jitter(15.2), latency_rolling_avg_10s: 15.0, latency_rolling_stddev_10s: 1.8, latency_percentile_p99: 24, requests_per_second: jitter(2101), active_connections: 287, queue_depth: jitter(25), error_rate_5xx: 0.0015, timeout_rate: 0.0003, connection_refused_count: 0, latency_delta_last_5s: 0.4, load_delta_last_5s: -0.1, error_rate_delta_last_5s: 0, time_since_last_restart: 5400, hour_of_day: 14 },
      sensor_dna: {} },
    { id: 'Node D', health: jitter(90), rps: jitter(1843), active_conns: Math.round(jitter(247)), circuit_state: 'CLOSED', failure_prob: jitter(0.10),
      dna: { current_latency_ms: jitter(16.9), latency_rolling_avg_10s: 16.8, latency_rolling_stddev_10s: 2.1, latency_percentile_p99: 28, requests_per_second: jitter(1843), active_connections: 247, queue_depth: jitter(31), error_rate_5xx: 0.002, timeout_rate: 0.0005, connection_refused_count: 0, latency_delta_last_5s: 0.6, load_delta_last_5s: 0.3, error_rate_delta_last_5s: 0.0001, time_since_last_restart: 4100, hour_of_day: 14 },
      sensor_dna: {} },
  ];

  const totalRps = nodes.reduce((s, n) => s + n.rps, 0);

  return {
    timestamp: t,
    nodes,
    decisions: ['Routed 8a12f4d9 → Node B (Hybrid, conf 98%)', 'Routed 9b23c5ea → Node A (Hybrid, conf 97%)'],
    global_rps: totalRps,
    latency_histogram: [120, 340, 280, 180, 60, 12],
    decision_telemetry: {
      active_strategy: 'Hybrid ML',
      hedging_rate: 4.2,
      confidence_avg: jitter(96.5, 0.02),
      requests_optimized: 15842 + Math.floor((t % 100000) / 10),
      strategy_distribution: { Hybrid: 68, LowestLatency: 22, RoundRobin: 10 },
      outcomes: { clean: Math.floor(totalRps * 0.85), hedged: Math.floor(totalRps * 0.1), fallback: Math.floor(totalRps * 0.04), dropped: Math.floor(totalRps * 0.01) }
    }
  };
};

/* ─── Hook ─────────────────────────────────────────────── */
export const usePhantomSocket = (url: string) => {
  const [data, setData]               = useState<PhantomTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const mockTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Try real WebSocket first; fall back to mock after 1.5 s
    let didConnect = false;
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      didConnect = true;
      setIsConnected(true);
      if (mockTimer.current) clearInterval(mockTimer.current);
    };
    socket.onmessage = (e) => {
      try { setData(JSON.parse(e.data)); } catch (_) { /* noop */ }
    };
    socket.onclose = () => {
      setIsConnected(false);
      // If we never connected, start mock mode
      if (!didConnect) startMock();
    };
    socket.onerror = () => {
      if (!didConnect) startMock();
    };

    const startMock = () => {
      if (mockTimer.current) return; // already running
      setData(makeMock());
      setIsConnected(false); // keep offline badge honest
      mockTimer.current = setInterval(() => setData(makeMock()), 1200);
    };

    // Fallback timer — if no onopen within 1.5 s, go mock
    const fallback = setTimeout(() => {
      if (!didConnect) startMock();
    }, 1500);

    return () => {
      clearTimeout(fallback);
      if (mockTimer.current) clearInterval(mockTimer.current);
      socketRef.current?.close();
    };
  }, [url]);

  return { data, isConnected };
};
