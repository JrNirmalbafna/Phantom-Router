# PHANTOM Router
### Predictive Hybrid Adaptive Network Traffic Optimization & Management

> An AI-assisted, production-inspired intelligent reverse proxy and adaptive load balancer built in Rust.

![Rust](https://img.shields.io/badge/Rust-Stable-orange)
![React](https://img.shields.io/badge/Frontend-React-blue)
![Tokio](https://img.shields.io/badge/Async-Tokio-green)
![ONNX](https://img.shields.io/badge/Inference-ONNX_Runtime-red)
![Docker](https://img.shields.io/badge/Deployment-Docker-blue)

---

# Overview

Traditional load balancers make routing decisions using static algorithms such as Round Robin or Least Connections. While effective, these approaches react only after a backend begins degrading.

PHANTOM Router introduces an adaptive routing architecture that continuously monitors backend health, predicts failures using machine learning, evaluates system state through a rule-based decision engine, and dynamically selects the optimal backend before performance deteriorates.

The objective is to reduce latency, improve resiliency, and provide complete observability into every routing decision.

---

# Core Features

## Intelligent Routing

- Hybrid Routing Strategy
- Round Robin
- Least Connections
- Lowest Latency
- AI-Based Routing
- Runtime Strategy Switching

---

## Decision Engine

Every routing decision is explainable.

Each request records:

- Selected backend
- Decision confidence
- Health score
- Failure probability
- Routing reason
- Applied rules
- Request priority

---

## AI Prediction Pipeline

Backend telemetry is transformed into feature vectors which are evaluated using ONNX Runtime.

Prediction outputs include:

- Failure Probability
- Health Score
- Confidence Score

The ML model is designed to support future hot-swappable versions without restarting the router.

---

## Health Monitoring

Multiple health signals are combined into a unified health score.

Current checks include:

- HTTP Health Checks
- Heartbeat Monitoring
- Active Probing
- Passive Health Evaluation

---

## Production Inspired Middleware

Incoming requests pass through a middleware pipeline consisting of:

- Request ID Injection
- Rate Limiting
- Logging
- Metrics Collection
- Validation
- Priority Extraction

---

## Adaptive Scheduler

Supports request prioritization through:

- Priority Queue
- Deadline Queue (planned)
- Retry Queue
- Worker Execution Pool

---

## Reverse Proxy

Features include:

- Connection Pooling
- Persistent Connections
- Retry Handling
- Timeout Management
- Response Enrichment

---

## Event-Driven Architecture

An internal Event Bus decouples major system components.

Events include:

- Metrics
- Health
- Decisions
- Alerts
- Benchmark Results
- Node Updates

---

## Observability

Integrated monitoring stack:

- Prometheus
- Grafana
- Structured Logging
- Request Tracing
- WebSocket Dashboard

---

## Benchmark Framework

Integrated benchmarking system capable of running:

- k6
- wrk
- Criterion Benchmarks

Automatically generates:

- CSV Reports
- HTML Reports
- Latency Graphs
- Throughput Analysis

---

# System Architecture

```text
Client
      │
Middleware
      │
Request Context
      │
Decision Engine
      │
Routing Strategy
      │
Scheduler
      │
Connection Pool
      │
Reverse Proxy
      │
Backend Services
```

Supporting services operate independently:

- Metrics
- Health Monitoring
- ML Predictor
- Registry
- Configuration
- Logging
- Benchmark Controller
- Dashboard

---

# High-Level Architecture

## Component Diagram

![Component Diagram](docs/architecture/Phantom%20Router_Architecture.png)

# Technology Stack

## Backend

- Rust
- Tokio
- Hyper
- DashMap
- Crossbeam
- ONNX Runtime
- Serde
- Tower

## Frontend

- React
- TypeScript
- Vite
- Chart.js / Recharts

## Monitoring

- Prometheus
- Grafana

## Deployment

- Docker
- Docker Compose

---

# Repository Structure

```text
phantom-router/
├── backend/
├── frontend/
├── docs/
├── models/
├── benchmarks/
├── docker/
└── scripts/
```

---

# Routing Strategies

| Strategy | Description |
|-----------|-------------|
| Round Robin | Cyclic distribution |
| Least Connections | Chooses least loaded backend |
| Lowest Latency | Selects backend with minimum latency |
| ML Predictor | AI assisted prediction |
| Hybrid | Weighted combination of all metrics |

---

# Machine Learning Pipeline

```text
Metrics
  ↓
Feature Extraction
  ↓
Normalization
  ↓
ONNX Runtime
  ↓
Prediction
  ↓
Decision Engine
  ↓
Routing Strategy
```

---

# Dashboard

The dashboard provides real-time visualization of:

- Cluster Health
- Active Connections
- Request Rate
- Latency
- Backend Status
- Prediction Confidence
- Decision Timeline
- Benchmark Results

---

# Benchmarks

Performance testing includes:

- Throughput
- Average Latency
- P95 Latency
- P99 Latency
- CPU Usage
- Memory Usage
- Error Rate
- Recovery Time
- Connection Reuse
- ML Inference Time

Example benchmark report:

| Metric | Result |
|----------|---------|
| Throughput | TBD |
| Avg Latency | TBD |
| P99 | TBD |
| Requests/sec | TBD |
| CPU | TBD |

---

# Current Status

| Module | Status |
|---------|--------|
| Middleware | 🚧 |
| Routing Engine | 🚧 |
| Decision Engine | 🚧 |
| ML Predictor | 🚧 |
| Dashboard | 🚧 |
| Benchmark Framework | 🚧 |

---

# Roadmap

## Phase 1
- Reverse Proxy
- Middleware
- Routing Engine
- Dashboard
- Metrics

## Phase 2
- ML Prediction
- Decision Engine
- Hybrid Routing

## Phase 3
- Chaos Testing
- Explainable Routing
- Benchmark Automation

## Phase 4
- Production Hardening
- Distributed Deployment
- Kubernetes Integration

---

# Future Work

- Reinforcement Learning Routing
- Multi-Region Routing
- Adaptive Auto Scaling
- eBPF Telemetry
- OpenTelemetry
- Distributed Control Plane

---

# License

MIT License

---

# Author

Developed as a systems engineering and distributed infrastructure project focused on intelligent routing, adaptive load balancing, and production-grade backend architecture.
