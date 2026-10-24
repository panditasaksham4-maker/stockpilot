# AI-Powered Self-Healing Cloud Infrastructure Control Center

[![Platform](https://img.shields.io/badge/Platform-FastAPI%20%7C%20React%20%7C%20Vite%20%7C%20Docker-blue.svg)](https://github.com)
[![AI/ML](https://img.shields.io/badge/AI%20Engine-Scikit--Learn%20Isolation%20Forest-emerald.svg)](https://scikit-learn.org)
[![Autonomic](https://img.shields.io/badge/Closed--Loop-MAPE--K%20Architecture-cyan.svg)](https://en.wikipedia.org/wiki/Autonomic_computing)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An intelligent cloud infrastructure monitoring and autonomic recovery platform designed for high-availability systems. It continuously streams telemetry, detects multivariate anomalies using an unsupervised **Scikit-learn Isolation Forest** model, identifies probable root causes, evaluates safety guardrails via a deterministic policy engine, executes automated remediation actions, and verifies physical cluster recovery before resolving incidents.

---

## 🌟 Key Features

- **Cyber Dark Operations Cockpit**: Polished dark-navy interface built with React, Vite, Tailwind CSS, Lucide icons, and Recharts.
- **Unsupervised Anomaly Detection**: Real Scikit-learn `IsolationForest` calibrated on baseline synthetic telemetry with real-time feature contribution scoring and a transparent statistical fallback.
- **Closed-Loop Autonomic Engine (MAPE-K)**: Full lifecycle execution: `OBSERVE` &rarr; `COLLECT` &rarr; `DETECT` &rarr; `ANALYSE` &rarr; `EVALUATE` &rarr; `EXECUTE` &rarr; `VERIFY` &rarr; `RESOLVE` &rarr; `AUDIT`.
- **7 Simulated Real-World Cloud Faults**:
  1. 🔥 **CPU Overload**: Compute saturation &rarr; Horizontal scale-out to balance traffic.
  2. 💧 **Memory Leak**: Monotonic RAM ramp &rarr; Rolling container replacement & recycle.
  3. ⚡ **Sudden Traffic Spike**: 400% RPS surge &rarr; Ingress load balancing & replica scaling.
  4. 💥 **Container Crash (OOM)**: Pod death / exit 137 &rarr; Automated container reboot & health-check.
  5. 🌐 **High Network Latency**: Virtual link degradation &rarr; Connection flush & route rebalancing.
  6. ⚠️ **High Error Rate (5xx)**: Degraded worker threads &rarr; Quarantines bad pod and restarts runtime.
  7. 🔄 **Reset to Normal**: Instantly restores baseline healthy state.
- **Safety Guardrails & Governance**:
  - Action cooldown timers to eliminate thrashing
  - Bounded replica limits (`min_replicas`, `max_replicas`)
  - Maximum retry attempts before operator escalation
  - Manual Operator Approval Mode toggle
  - Emergency **STOP** switch to halt automated actions
- **Empirical Performance Benchmarks**: Compare Mode A (*Monitoring Only / Human SRE*) against Mode B (*Autonomous Self-Healing*) with actual measured MTTR.
- **Persistent SQLite Audit Ledger**: Stores all incident records, timestamps, metrics snapshots, and CSV export.
- **Zero-Downtime Dual-Mode Resilience**: Seamlessly syncs with the FastAPI WebSocket backend, and automatically falls back to an embedded high-fidelity client simulation engine if offline.

---

## 🏗️ System Architecture

```
                  +----------------------------------------------------+
                  |    Frontend Control Center (React + TypeScript)    |
                  |  Overview | Monitoring | Topology | AI | Incidents   |
                  +-------------------------+--------------------------+
                                            | WebSockets / REST
                                            v
+--------------------------------------------------------------------------------------+
|                           FastAPI Autonomic Backend Gateway                          |
|                                                                                      |
|  +--------------------+        +---------------------+        +-------------------+  |
|  | Cloud Simulator    | -----> | Telemetry Collector | -----> | AI Anomaly Engine |  |
|  | - Pod Instances    |        | - Rolling Buffer    |        | - Isolation Forest|  |
|  | - Fault Injections |        +---------------------+        | - Risk Diagnosis  |  |
|  +--------------------+                                       +---------+---------+  |
|            ^                                                            |            |
|            | Executed Actions                                           v            |
|  +---------+----------+        +---------------------+        +---------+---------+  |
|  | Remediation Engine | <----- | Verification Engine | <----- | Policy Engine     |  |
|  | - Scale Out/In     |        | - Threshold Check   |        | - Guardrails      |  |
|  | - Container Reboot |        | - Recovery Confirm  |        | - Approval Gates  |  |
|  +--------------------+        +----------+----------+        +-------------------+  |
|                                           |                                          |
|                                           v                                          |
|                                +---------------------+                               |
|                                | SQLite Audit Ledger |                               |
|                                +---------------------+                               |
+--------------------------------------------------------------------------------------+
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm

### Method 1: One-Click Windows Launch
Double-click `start.bat` or run in terminal:
```powershell
.\start.bat
```

### Method 2: Manual Terminal Launch

#### Step 1: Start Backend (FastAPI)
```bash
cd backend
python -m pip install -r requirements.txt
python main.py
```
*Backend runs on `http://localhost:8000` (Swagger docs available at `http://localhost:8000/docs`).*

#### Step 2: Start Frontend (React + Vite)
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend opens at `http://localhost:3000`.*

### Method 3: Docker Compose
```bash
docker-compose up --build
```

---

## 🧪 Testing Backend & Self-Healing Workflows

Run the automated backend test suite:
```bash
cd backend
python -m pytest tests/ -v
```

Tests cover:
- Baseline telemetry and physics in `test_simulator.py`
- Unsupervised Isolation Forest detection in `test_anomaly_detector.py`
- Policy guardrails, cooldowns, and SQLite logging in `test_remediation.py`

---

## 🎓 Demonstration Scenario for Presentation

1. **Baseline State**: Open `http://localhost:3000`. Show 3 healthy container pods, ~42% CPU, ~50% RAM, ~30ms latency, and 0 active incidents.
2. **Inject CPU Overload**: Click **Simulate Failure** &rarr; select **CPU Overload**.
3. **Observe Anomaly**: CPU climbs above 90%, perceived latency climbs. AI Isolation Forest flags anomaly (score > 85%, Risk: CRITICAL).
4. **Policy Approval & Execution**: Policy checks guardrails & approved horizontal scaling. A new replica (`app-pod-04`) is dynamically provisioned.
5. **Load Balancing & Stabilization**: Load redistributes across healthy pods, CPU drops to ~45%, latency drops below 40ms.
6. **Verified Recovery**: Verification engine observes system for verification window, confirms recovery criteria, and marks incident **RESOLVED** with full audit trail.
7. **Container Crash Scenario**: Click **Container Crash**. An instance dies (unhealthy). The engine diagnoses container failure, executes safe container restart, and restores health.
8. **Manual Approval Mode**: Go to **Remediation Control Center**, toggle ON **Manual Operator Approval Mode**. Inject a fault. Show that remediation pauses and prompts the operator to inspect and click **Authorize & Execute Action**.
9. **Performance Evaluation**: Open the **Performance Evaluation** tab and run a comparative benchmark showing a **5.6x MTTR improvement** over manual recovery.

---

## 📡 REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | System status, engine mode, active replicas |
| `/api/metrics` | GET | Current cluster and instance telemetry |
| `/api/metrics/history`| GET | Rolling history buffer for charts |
| `/api/infrastructure` | GET | Dynamic network topology and edge status |
| `/api/incidents` | GET | Filterable list of all incidents |
| `/api/incidents/{id}` | GET | Full incident timeline and metrics snapshot |
| `/api/faults/{type}` | POST | Triggers fault scenario (e.g. `cpu-overload`, `container-crash`, `reset`) |
| `/api/healing/approve/{id}` | POST | Authorizes queued remediation action |
| `/api/healing/reject/{id}` | POST | Rejects queued action and flags attention |
| `/api/healing/stop` | POST | Engages emergency stop on automated actions |
| `/api/healing/start` | POST | Resumes normal automated remediation |
| `/api/settings` | GET/PUT | Gets or updates policy thresholds & guardrails |
| `/api/tests/run` | POST | Executes benchmark recovery test cycle |
| `/api/export/incidents.csv` | GET | Downloads CSV export of incident records |
| `/ws/telemetry` | WebSocket | Live 1Hz telemetry and event broadcast |

---

## 📜 License
MIT License. Built for advanced cloud computing and autonomic computing research demonstrations.
