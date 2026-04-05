# WideAngle

**Multi-agent AI analysis platform — see every angle.**

WideAngle takes a startup idea or codebase and runs a coordinated team of AI agents that each analyze it from a different expert perspective. The agents work in parallel stages, feed their outputs to each other, and culminate in a synthesized final report — all visualized as a living constellation in deep space.

---

## What It Does

You submit a prompt (startup idea or code). WideAngle:

1. **Plans** — A Planner agent reads your input and designs a DAG (directed acyclic graph) of specialist agents: e.g. Market Analyst, Technical Architect, Risk Assessor, UX Strategist
2. **Executes** — Agents run in parallel stages; later-stage agents receive earlier agents' outputs as context
3. **Synthesizes** — A Meta Synthesizer reads all agent outputs and writes a structured final report
4. **Visualizes** — The entire process is shown as an animated constellation. Stars appear, think, glow, and finally converge into a supernova when the report is ready
5. **Lets you explore** — Click any star to read that agent's full reasoning and chat with it individually

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React)                      │
│                                                             │
│  InputZone ──► SessionPage ──► SpaceCanvas (SVG)           │
│                    │               ├── Ambient starfield     │
│                    │               ├── Agent stars           │
│                    │               └── Constellation lines   │
│                    │                                         │
│                    ├──► AgentPanel (reasoning + chat)       │
│                    └──► SupernovaModal (final report)       │
│                                                             │
│  WebSocket ◄──────────────────────────────────────────────► │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / WebSocket
┌──────────────────────────────▼──────────────────────────────┐
│                     FastAPI Backend                         │
│                                                             │
│  POST /api/sessions        → create session                 │
│  POST /api/sessions/:id/run → start agent pipeline          │
│  GET  /api/sessions/:id    → session state                  │
│  POST /api/sessions/:id/chat → chat with agent              │
│  WS   /ws/sessions/:id     → real-time event stream         │
│                                                             │
│  PlannerAgent → DAG → SessionRunner → ConcreteAgents        │
│                                    → MetaSynthesizer        │
└──────────────────────────────┬──────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
           Ollama           MySQL           Nginx
        (llama3.2:1b)    (sessions,       (reverse
                          chat history)    proxy)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Framer Motion, Zustand, Axios |
| Backend | Python 3.11, FastAPI, SQLAlchemy (async), WebSockets |
| AI | Ollama (local LLM — llama3.2:1b) |
| Database | MySQL 8.0 (via aiomysql) |
| Infrastructure | Docker, Docker Compose, Nginx |

---

## Project Structure

```
WideAngle/
├── backend/
│   ├── agents/
│   │   ├── planner.py        # Reads input, outputs AgentSpec DAG as JSON
│   │   ├── concrete.py       # ConcreteAgent — runs with persona + tools
│   │   ├── meta.py           # MetaSynthesizer — final report writer
│   │   └── base.py           # Abstract Agent base class
│   ├── orchestrator/
│   │   ├── runner.py         # Executes DAG stage by stage
│   │   ├── dag.py            # Stage resolution + context building
│   │   └── queue.py          # Controls agent concurrency
│   ├── api/
│   │   ├── sessions.py       # Session CRUD + /run endpoint
│   │   ├── chat.py           # Per-agent chat endpoint
│   │   └── ws.py             # WebSocket connection manager
│   ├── core/
│   │   ├── ollama.py         # Ollama HTTP client (streaming)
│   │   ├── database.py       # DB init + session factory
│   │   └── websocket.py      # WebSocket broadcast helpers
│   ├── models/               # SQLAlchemy ORM models
│   ├── ingestion/            # Input normalization (text / GitHub URL)
│   └── main.py               # FastAPI app + lifespan
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Canvas/
│       │   │   ├── SpaceCanvas.jsx    # Main SVG canvas, parallax starfield, animation
│       │   │   ├── StarNode.jsx       # Individual agent star with status glow
│       │   │   ├── ConstellationLine.jsx  # Curved bezier connections
│       │   │   └── Nebula.jsx         # Deep-space background layers
│       │   ├── AgentPanel/
│       │   │   └── AgentPanel.jsx     # Slide-in panel: reasoning + inline chat
│       │   ├── AgentCard/
│       │   │   ├── FormattedOutput.jsx    # Markdown-like output renderer
│       │   │   └── StreamingText.jsx      # Live token streaming display
│       │   ├── InputZone/
│       │   │   ├── InputZone.jsx      # Startup / code review input
│       │   │   └── ModeToggle.jsx     # Mode switcher pill
│       │   └── Report/
│       │       └── SupernovaModal.jsx # Final report modal
│       ├── hooks/
│       │   ├── useWebSocket.js    # WS connection + event handler
│       │   ├── useSession.js      # Session creation + navigation
│       │   └── useAgentChat.js    # Per-agent chat messages
│       ├── store/
│       │   └── sessionStore.js    # Zustand global state
│       └── pages/
│           ├── HomePage.jsx
│           └── SessionPage.jsx
│
├── docker-compose.yml
└── .env
```

---

## How the Agent Pipeline Works

### 1. Planning Phase

The `PlannerAgent` receives your input and instructs the LLM to output a JSON array of `AgentSpec` objects:

```json
[
  { "name": "Market Analyst", "persona": "...", "role": "...", "stage": 1, "dependencies": [] },
  { "name": "Risk Assessor",  "persona": "...", "role": "...", "stage": 2, "dependencies": ["Market Analyst"] }
]
```

The `stage` field controls parallelism — all stage-1 agents run at once, stage-2 agents wait for stage-1 to finish, etc. The `dependencies` field tells the orchestrator which agents' outputs to include as context.

### 2. Execution Phase

`SessionRunner` resolves the DAG into ordered stages and runs each stage via `AgentQueue`. Each `ConcreteAgent`:
- Receives a system prompt built from its `persona` and `role`
- Receives context = original input + all dependency agent outputs
- Streams tokens back over WebSocket in real time

### 3. Synthesis Phase

Once all concrete agents finish, `MetaSynthesizer` reads every agent's output and writes a structured report with sections: Executive Summary, Key Findings, Critical Risks, Action Items, Overall Assessment.

### 4. WebSocket Event Flow

```
plan_ready    → frontend creates all agent stars on the canvas
agent_start   → star appears, begins thinking animation
agent_token   → output streams into AgentPanel in real time
agent_done    → star turns white, diffraction spikes appear
session_done  → stars converge → supernova → modal opens
```

---

## Canvas Animation System

The visual experience is built entirely in SVG + Framer Motion:

| Phase | What Happens |
|-------|-------------|
| **Scatter** | Agent stars fly in from random screen edges |
| **Gather** | Stars spring-animate to their constellation positions (per-stage, with organic jitter) |
| **Thinking** | Pulsing golden glow ring around the star core |
| **Done** | Star turns white, 4 diffraction spikes radiate outward |
| **Convergence** | All stars animate toward canvas center, lines fade |
| **Supernova** | Shockwave rings + horizontal lens-flare beam + blinding white core |
| **Modal** | Final report slides in over the supernova |

**Parallax starfield** — 550 ambient stars in 3 depth layers. Moving the mouse shifts each layer at a different speed, creating genuine depth.

**Organic layout** — Agent positions are jittered using a deterministic hash of each agent's name, so the constellation never looks like a grid but is always stable across re-renders.

---

## Running the Project

### Prerequisites

- Docker Desktop
- Git

### 1. Clone and configure

```bash
git clone https://github.com/Hitarth-cpu/WideAngle.git
cd WideAngle
```

Create a `.env` file in the root:

```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=wideangle
MYSQL_USER=wideangle
MYSQL_PASSWORD=wideangle123
```

### 2. Start all services

```bash
docker compose up -d
```

This starts 4 containers: `ollama`, `mysql`, `backend`, `frontend`.

### 3. Pull the AI model (first time only)

```bash
docker exec wideangle-ollama-1 ollama pull llama3.2:1b
```

Wait for the download to finish (~800MB).

### 4. Open the app

```
http://localhost:3000
```

---

## Using the App

### Startup Mode
Describe your startup idea, paste a pitch summary, or share your vision. WideAngle will create a team of analysts — market, technical, financial, UX, risk — to evaluate it from every angle.

### Code Review Mode
Paste your code directly, or enter a public GitHub repository URL. Agents will review architecture, security, performance, and maintainability.

### During Analysis
- **Hover** a star to see the agent's name and status
- **Click** a star to open the Agent Panel on the right — shows full reasoning and lets you chat with that agent
- **Click the same star again** to close the panel
- When all agents finish, stars converge and the supernova plays — click the final report to open it

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions` | Create a new session |
| `POST` | `/api/sessions/:id/run` | Start the agent pipeline |
| `GET`  | `/api/sessions/:id` | Get session state |
| `GET`  | `/api/sessions/:id/agents` | Get all agent states |
| `POST` | `/api/sessions/:id/chat` | Send a message to an agent |
| `WS`   | `/ws/sessions/:id` | Real-time event stream |
| `GET`  | `/health` | Health check |

### WebSocket Event Types

| Event | Payload |
|-------|---------|
| `plan_ready` | `{ agents: [...], dag: { stages: {...} } }` |
| `agent_start` | `{ agent_id, name, stage }` |
| `agent_status` | `{ agent_id, status }` |
| `agent_token` | `{ agent_id, token }` |
| `agent_done` | `{ agent_id, output }` |
| `session_done` | `{ report }` |
| `session_error` | `{ error }` |

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://ollama:11434` | Ollama API endpoint |
| `DATABASE_URL` | set via env | MySQL connection string |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed frontend origins |

To use a different model, change the model name in `backend/core/ollama.py`.

---

## Known Limitations

- Uses `llama3.2:1b` by default — a small, fast model. Output quality improves significantly with larger models (llama3.1:8b, mistral, etc.)
- Chat with agents is stateless per message — the agent re-reads its original output for context each time
- GitHub URL ingestion fetches the repository README and top-level files only

---

## License

MIT
