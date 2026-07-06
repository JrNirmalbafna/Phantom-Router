---
config:
  layout: elk
title: Phantom Router v4 — Full System Architecture
---
flowchart TB
    subgraph CLIENT["🌐 Client Layer"]
        C1["HTTP Client\n:8080"]
        C2["Web Dashboard\n:5173"]
    end

    subgraph MIDDLEWARE["🔗 Middleware Pipeline"]
        MW1["Request ID Injector"]
        MW2["Rate Limiter\nToken Bucket per-IP"]
        MW1 --> MW2
    end

    CTX["📦 RequestContext\nrequest_id, priority, client_ip, start_time"]

    subgraph DECISION["⚖️ Decision Engine"]
        D1["Decision Processor\nmake_decision(ctx, cluster)"]
        D2["Rule Evaluation\nheartbeat veto · circuit override"]
        D3["Confidence Estimator\n+ Prediction Cache"]
        D4["RoutingDecision Output\nnode · confidence · reason"]
        D5["Decision History\nRingBuffer last 1000"]
        D1 --> D2
        D2 --> D3
        D3 --> D4
        D4 --> D5
    end

    subgraph ROUTER["🧠 Routing Strategy"]
        R1["Routing Algorithm\nHybrid / WRR / LeastConn"]
        R2["Routing Engine\nexecutes decision only"]
        R2 --> R1
    end

    subgraph SCHEDULER["⏱️ Scheduler"]
        SC1["Priority Queue"]
        SC2["Deadline + Retry + Cancel Queues"]
        SC3["Request Executor"]
        SC1 --> SC2
        SC2 --> SC3
    end

    subgraph PROXY["🔀 Proxy Layer"]
        P1["Connection Pool\nArc DashMap per node"]
        P2["Request Forwarder\nhyper client"]
        P3["Retry Handler\n+ Timeout Manager"]
        P4["Response Enricher\nX-Phantom-* headers"]
        P1 --> P2
        P3 --> P4
    end

    subgraph BACKEND["🖥️ Backend Nodes"]
        N1["Node A :5001"]
        N2["Node B :5002"]
        N3["Node C :5003"]
    end

    subgraph HEALTH["❤️ Health Monitor"]
        H1["HTTP Health Checker\nGET /health every 5s"]
        H2["Heartbeat Monitor\npassive pings"]
        H3["Probing Service\nTCP + HTTP probes"]
        H4["Health Evaluator\nUnified Health Score"]
        H1 --> H4
        H2 --> H4
        H3 --> H4
    end

    subgraph PREDICTOR["🤖 ML Predictor"]
        PR1["Feature Extraction\n15-feature vector"]
        PR2["Preprocessing\nnormalization pipeline"]
        PR3["ONNX Inference\nfailure_prob score"]
        PR4["Confidence + Cache\nprediction memoize"]
        PR1 --> PR2
        PR2 --> PR3
        PR3 --> PR4
    end

    subgraph REGISTRY["📋 Registry"]
        RG1["Node Registry\nCRUD"]
        RG2["Service Discovery\nStaticYaml / future Consul"]
        RG3["State Synchronizer\nRegistry to domain states"]
        RG2 --> RG1
        RG1 --> RG3
    end

    subgraph STATE["🗄️ Domain State"]
        ST1["ClusterState\nnodes DashMap + node_ids"]
        ST2["PredictionState\nfailure_prob cache per node"]
        ST3["MetricsState\nP50 · P95 · P99 history"]
        ST4["ConnectionPool\nhyper clients per node"]
    end

    subgraph EVENTBUS["📡 Event Bus"]
        EB1["Typed Event Categories\nMetrics · Decision · Health\nNode · Alert · Benchmark"]
        EB2["Broadcast System\ntokio broadcast channels"]
        EB1 --> EB2
    end

    subgraph METRICS["📊 Metrics"]
        M0["Event Stream\nbroadcast subscriber"]
        M1["Stat Aggregator\nP50 · P95 · P99 windowed"]
        M2["Ring Buffer\n5-min window"]
        M3["Export Endpoint :9090"]
        M0 --> M1
        M1 --> M2
        M2 --> M3
    end

    subgraph LOGGING["📝 Logging"]
        L1["Request Logger\nper-request JSON"]
        L2["Audit Logger\ncircuit + weight audit"]
        L3["Log Sink\nDashboard + stdout + file"]
        L1 --> L3
        L2 --> L3
    end

    subgraph WS["🌐 WebSocket :9001"]
        WS1["WS Server\nsingle /ws endpoint"]
        WS2["Event Broadcaster\ntyped JSON envelope"]
        WS1 --> WS2
    end

    subgraph BENCHMARK["⚡ Benchmark Controller"]
        BM1["Traffic Generator\nsine · spike · ramp · diurnal"]
        BM2["Result Collector\nlatency · throughput · errors"]
        BM3["Report Generator\nCSV + PNG + Markdown"]
        BM1 --> BM2
        BM2 --> BM3
    end

    subgraph CONFIG["⚙️ Control Plane"]
        CF1["Config Loader\nYAML + hot reload"]
        CF2["Health Policies\nthresholds + intervals"]
        CF3["Strategy Config\nruntime algorithm swap"]
    end

    subgraph DASHBOARD["⚛️ Frontend Dashboard"]
        UI1["Cluster Overview"]
        UI2["Latency Visuals"]
        UI3["ML Intelligence Panel"]
        UI4["Benchmark Panel"]
        UI5["Socket Listener"]
    end

    GRAFANA["📈 Grafana / Prometheus"]

    %% ── Hot Path ─────────────────────────────────────────────────────
    C1 -- "HTTP Request" --> MW1
    MW2 -- "build context" --> CTX
    CTX --> D1
    D4 -- "RoutingDecision" --> R2
    R1 --> SC1
    SC3 --> P1
    P2 --> N1 & N2 & N3
    N1 -- "Response" --> P3
    N2 -- "Response" --> P3
    N3 -- "Response" --> P3
    P4 -- "Return" --> C1

    %% ── Decision Engine inputs ────────────────────────────────────────
    PR4 -- "Predictions" --> D1
    H4 -- "Health Score" --> D2

    %% ── Event Bus ────────────────────────────────────────────────────
    P4 -- "emit DecisionEvent" --> EB1
    H4 -- "emit HealthEvent" --> EB1
    BM3 -- "emit BenchmarkEvent" --> EB1
    EB2 --> M0 & L1 & L2 & WS2

    %% ── Dashboard ────────────────────────────────────────────────────
    WS2 -- "WS Messages" --> UI5
    UI5 --> UI1 & UI2 & UI3 & UI4
    C2 -- "Connects" --> UI5

    %% ── State feeds hot path ─────────────────────────────────────────
    ST1 --> CTX
    ST2 --> PR1
    ST3 --> M0
    ST4 --> P1

    %% ── Control Plane → Registry → Domain State ──────────────────────
    CF1 --> RG2
    RG3 --> ST1 & ST2 & ST3 & ST4

    %% ── Health probing ───────────────────────────────────────────────
    H1 -- "GET /health" --> N1 & N2 & N3
    H2 -- "Heartbeat" --> N1 & N2 & N3

    %% ── Metrics output ───────────────────────────────────────────────
    M3 -- "Scrape" --> GRAFANA

    GRAFANA:::infra
    classDef client    fill:#eef2ff,stroke:#818cf8
    classDef backend   fill:#fef2f2,stroke:#f87171
    classDef logic     fill:#f0fdf4,stroke:#4ade80
    classDef storage   fill:#f0fdfa,stroke:#2dd4bf
    classDef analytics fill:#fdf4ff,stroke:#e879f9
    classDef infra     fill:#fff7ed,stroke:#fb923c
