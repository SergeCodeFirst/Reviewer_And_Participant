Great,here's the mini challenge. We don't hire without it. Get it done fast, we'll set up a small informal interview, and then get you started right away.

🧩 Mini-Project Challenge — Redis + PUML Edition

Thank you for your interest in joining our team!
As a first step, we’d like you to take on a small but meaningful challenge.
The goal is to show how you connect a modern web app’s pieces — frontend, backend, realtime, typed contracts, persistence, and third-party APIs — while keeping the scope tight and local-only.


---

🧠 Overview

Build a tiny web app with two frontends and one backend where a Reviewer speaks a short list of items and a Participant hears polite clarifying questions generated from that list.

You will also illustrate the architecture and data flow by creating a .puml (PlantUML) file diagram that clearly shows:

Frontend–Backend–Redis interactions

Pub/Sub and Stream flows

WebSocket event flow between clients and the server

OpenAI API integration point


This diagram should live at /docs/architecture.puml.


---

🖥️ Frontend A: Reviewer (React + TypeScript)

UI: Mic button + optional text fallback

Voice capture: Browser SpeechRecognition (Web Speech API) or stubbed recorder; text input fallback is fine

Normalization: Split on commas, trim, drop empties

Action: Send normalized list to the server over WebSocket

Status: Show simple sending/acknowledged states



---

🎧 Frontend B: Participant (React + TypeScript)

Realtime: Subscribe over WebSocket

Display: Render generated clarifying questions in a lightweight chat/feed

Speech: Use Speech Synthesis to speak the received questions aloud (no overlapping playback)

Reconnect: On reconnect, request missed messages from the backend using Redis Stream IDs



---

⚙️ Backend: Node.js (Fastify) + WebSockets + Redis

Endpoints

GET /health → { ok: true }


WebSocket Events

followup:create (list of items)

agent:questions (generated text)


Redis Usage

Streams — store ordered follow-ups (followups:stream) and generated questions (questions:stream)

Pub/Sub — broadcast questions in realtime (questions:live)

Rate limits & deduplication — simple counters and hash keys to reject spam or duplicates

Replay — when a Participant reconnects, send missed messages since their last stream ID


OpenAI

On followup:create, call the Chat Completions API with a fixed system prompt that turns the item list into 2–4 concise, polite clarifying questions

Preserve message order; avoid duplicates

Share strict TypeScript types (no any)



---

🧩 Shared Types

Located in /packages/shared:

type FollowUpPayload = { items: string[]; createdAt: number };
type AgentQuestions = { text: string; createdAt: number; streamId?: string };
interface ClientToServerEvents { "followup:create": (payload: FollowUpPayload) => void; }
interface ServerToClientEvents { "agent:questions": (data: AgentQuestions) => void; }


---

⚙️ Environment / Config

.env in the server:

OPENAI_API_KEY=...
REDIS_URL=redis://localhost:6379

Reject empty lists, cap items (e.g., 8) and total char length (e.g., 300).


---

🏗️ Hosting / Deploy (Local-only)

All services should run on localhost:

Service	Port	URL

Reviewer	5173	http://localhost:5173
Participant	5174	http://localhost:5174
API / WS	3000	http://localhost:3000


Optionally, provide a docker-compose.yml for one-command local setup (include Redis).


---

📦 Deliverables

GitHub repo including:

✅ Monorepo structure (/apps/reviewer, /apps/participant, /services/server, /packages/shared)

✅ Setup & scripts (pnpm/yarn workspaces recommended)

✅ .env.example

✅ Instructions for local run (Reviewer, Participant, Server)

✅ Brief note on OpenAI usage (model, prompt, token limits)

✅ Redis integration for ordering, replay, and rate limiting

✅ A docs/architecture.puml PlantUML diagram showing system flow

✅ A 60–90 s screen capture showing the acceptance test



---

🧪 Acceptance Test (Happy Path)

1. Start Redis, the server, and both frontends on localhost


2. Open Participant → auto-connects and shows “ready.”


3. Open Reviewer → press Mic and say: “latency, retry logic, error states.”


4. Server calls OpenAI and broadcasts


5. Participant displays and speaks:

> “Sorry to circle back — could you help me clarify latency, retry logic, and error states?”




6. Send a second list quickly — messages play in order, no overlap


7. Close and reopen Participant → missed messages replay in correct order (from Redis stream)


8. Include the .puml architecture diagram in your submission to visualize this flow