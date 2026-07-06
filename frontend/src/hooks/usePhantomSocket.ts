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
  sensor_dna: Record<string, number>; // The 32+ additional Hardware metrics
};

export type PhantomTelemetry = {
  timestamp: number;
  nodes: NodeStats[];
  decisions: string[];
  global_rps: number;
  latency_histogram: number[]; // Distribution [0-1, 1-2, 2-5, 5-10, 10-50, 50+]
};

export const usePhantomSocket = (url: string) => {
  const [data, setData] = useState<PhantomTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => setIsConnected(true);
      socket.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          setData(rawData);
        } catch (err) {
          console.error('[WS] Parse Error:', err);
        }
      };
      socket.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 2000);
      };
    };

    connect();
    return () => socketRef.current?.close();
  }, [url]);

  return { data, isConnected };
};
