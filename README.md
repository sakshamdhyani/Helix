# Helix

A container orchestrator built from scratch in Node.js. Helix manages Docker containers, maintains desired replica counts, self-heals crashed containers, and performs HTTP health checks — without using Kubernetes or Docker Compose.

## Why

Most engineers use Kubernetes without understanding what it actually does. Helix was built to understand the internals — the control loop, event-driven reconciliation, desired vs actual state, and how self-healing really works.

## How it works

Helix runs a continuous reconciliation loop. You declare how many replicas you want. Helix compares that to what is actually running and corrects any difference.

```
declare desired state
         ↓
connect to Docker
         ↓
loop every 10 seconds:
    sync cluster state from Docker
    run HTTP health checks on each container
    compare actual vs desired
    create or remove containers as needed
    clean up dead containers
```

In parallel, Helix subscribes to Docker's event stream. When a container crashes, the event fires instantly and Helix reconciles immediately without waiting for the next loop.

A mutex prevents the event listener and the control loop from reconciling at the same time.

## Features

- Maintains desired replica count at all times
- Instant crash detection via Docker event stream
- HTTP health checks catch application-level failures, not just process failures
- LIFO scale down — removes newest containers first, keeps the most stable ones
- Label-based container ownership — Helix only manages what it created
- Port mapping per replica — each container gets its own host port automatically
- Dead container cleanup after replacement

## Architecture

```
Helix
│
├── DockerService
│      └── Talks to Docker Engine via dockerode
│
├── Orchestrator
│      └── Control loop, reconciliation, self-healing
│
└── ClusterState
       └── In-memory view of running containers
```

## Project structure

```
helix/
│
├── controller/
│   └── src/
│       ├── server.js
│       ├── services/
│       │   └── docker.service.js
│       ├── orchestrator/
│       │   ├── orchestrator.js
│       │   └── cluster-state.js
│       └── config/
│           └── cluster.config.js
│
├── sample-app/
│   ├── index.js
│   ├── Dockerfile
│   └── package.json
│
└── package.json
```

## Getting started

### Prerequisites

- Node.js 18+
- Docker

### Build the sample app image

```bash
cd sample-app
docker build -t app-server .
```

### Install dependencies

```bash
cd controller
npm install
```

### Run Helix

```bash
npm run dev
```

Helix will connect to Docker and start managing containers based on the config.

## How self-healing works

```
container crashes
       ↓
Docker fires a die event
       ↓
Helix receives it instantly
       ↓
syncClusterState() rebuilds from Docker
       ↓
reconcile() sees actual < desired
       ↓
creates a replacement container
       ↓
removes the dead container
```

Without the event stream, Helix would still catch this on the next 10 second loop. The event stream just makes recovery instant.

## Container naming and port strategy

Each replica gets a numbered name and a corresponding host port:

```
app-server-1 → host port 8001
app-server-2 → host port 8002
app-server-3 → host port 8003
```

Formula: `hostPort = servicePort + replicaNumber`

When scaling down, Helix removes the newest containers first using creation timestamp. The oldest containers have proven stability and are kept running.

## Sample app endpoints

The included sample app exposes:

```
GET /         → service info and hostname
GET /health   → health status, memory, uptime
GET /crash    → forces the process to exit (for testing self-healing)
```

## Key concepts learned

**Control loop** — the core pattern of every orchestrator. Observe actual state, compare to desired state, act on the difference, repeat.

**Event-driven reconciliation** — polling catches eventual drift, events catch immediate failures. You need both.

**Mutex** — when two reconciliations can run at the same time (loop + event), a lock prevents them from creating duplicate containers.

**Desired vs actual state** — separating what you want from what exists is the fundamental idea behind Kubernetes, Nomad, and every modern orchestrator.

## What is next

- MongoDB integration for persistent desired state and runtime configuration changes without restarting Helix
- REST API to control services at runtime — scale replicas, add services, update config
- Frontend dashboard to visualize cluster state, manage services, and monitor health
- Load balancer to distribute traffic across replicas automatically