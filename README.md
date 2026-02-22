# AskMeAnythi.ng

Disposable AMA (Ask Me Anything) sessions — no sign-up required.

Create a session, share the link, and let your audience ask questions, vote, and react in real-time. When the event is over, it's gone.

**Live:** [askmeanythi.ng](https://askmeanythi.ng) · **GitHub:** [nologin-tools/AskMeAnythi.ng](https://github.com/nologin-tools/AskMeAnythi.ng)

## Features

- **Zero registration** — visitors ask questions and vote with no sign-up
- **Real-time updates** — WebSocket-powered live question feed, votes, and reactions
- **Projector mode** — full-screen display with keyboard shortcuts for live events
- **Markdown support** — rich text answers with Markdown rendering
- **QR code sharing** — instant audience access via QR code
- **Admin dashboard** — pin, answer, reject, and moderate questions
- **Emoji reactions** — quick reactions on questions and answers
- **Auto-expiry** — sessions self-destruct after 1–7 days
- **Minimalist design** — clean black & white UI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | [Cloudflare Workers](https://workers.cloudflare.com/) + [Hono](https://hono.dev/) |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) |
| Real-time | [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) (WebSocket) |
| Frontend | [SolidJS](https://www.solidjs.com/) + [Tailwind CSS](https://tailwindcss.com/) |
| Build | [Vite](https://vitejs.dev/) + [Turbo](https://turbo.build/) + [pnpm](https://pnpm.io/) |
| Language | TypeScript |

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm 9.15.0

### Install & Run

```bash
git clone https://github.com/nologin-tools/AskMeAnythi.ng.git
cd AskMeAnythi.ng
pnpm install
pnpm dev
```

- **Web:** http://localhost:5173
- **API:** http://localhost:8787

## Project Structure

```
AskMeAnythi.ng/
├── apps/
│   ├── api/                  # Cloudflare Workers backend
│   │   ├── src/
│   │   │   ├── index.ts      # Hono entry point & CORS
│   │   │   ├── types.ts      # Environment type definitions
│   │   │   ├── routes/       # API routes (sessions, questions, answers, votes, reactions)
│   │   │   ├── durable-objects/  # WebSocket Durable Object (SessionRoom)
│   │   │   └── db/           # D1 schema & migrations
│   │   └── wrangler.toml     # Cloudflare Workers config
│   │
│   └── web/                  # SolidJS frontend
│       ├── src/
│       │   ├── index.tsx      # App entry point
│       │   ├── index.css      # Global styles & Tailwind
│       │   ├── App.tsx        # Router & route definitions
│       │   ├── pages/         # Page components (6)
│       │   ├── components/    # UI components (11)
│       │   └── lib/           # Utilities (api, websocket, storage, markdown, time, sort)
│       └── vite.config.ts     # Vite config with API proxy
│
├── packages/
│   └── shared/               # Shared package
│       └── src/
│           ├── types.ts       # Type definitions & WebSocket events
│           ├── constants.ts   # Constants & config values
│           └── utils/         # ID generation, avatar generation
│
├── turbo.json                # Turbo pipeline config
└── package.json              # Root workspace config
```

## Development

```bash
# Start all apps
pnpm dev

# Start individual apps
pnpm --filter api dev       # Backend only (port 8787)
pnpm --filter web dev       # Frontend only (port 5173)

# Build
pnpm build                  # Build all apps

# Deploy
pnpm --filter api deploy    # Deploy API to Cloudflare Workers

# Database
pnpm db:migrate                      # Local D1 migration
pnpm --filter api db:migrate:remote  # Remote D1 migration

# Type check
pnpm lint                   # TypeScript type checking
```

## Architecture

### Authentication

| Identity | Mechanism | Header |
|----------|-----------|--------|
| Visitor | UUID (auto-generated, stored in localStorage) | `X-Visitor-Id` |
| Admin/Host | 32-char Base64 token (returned on session creation) | `X-Admin-Token` |

Session IDs are 5-character Base58 strings — short, readable, and easy to share.

### Real-time Communication

WebSocket connections are managed by a Cloudflare Durable Object (`SessionRoom`) using hibernation mode for efficient resource usage.

- **Endpoint:** `/ws/:sessionId`
- **Events:** `question_added`, `question_updated`, `vote_changed`, `answer_added`, `answer_updated`, `reaction_changed`, `session_updated`, `session_ended`

### Data Model

- **Session** — a time-limited AMA room (1–7 day TTL)
- **Question** — visitor-submitted, with status: `pending` → `approved` → `answered` / `rejected`
- **Answer** — host response to a question (one per question)
- **Vote** — upvote on a question (one per visitor per question)
- **Reaction** — emoji reaction on a question or answer

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/sessions` | — | Create a new session |
| `GET` | `/api/sessions/:id` | — | Get session (public) |
| `GET` | `/api/sessions/:id/admin` | Admin | Get session (admin) |
| `PATCH` | `/api/sessions/:id` | Admin | Update session settings |
| `DELETE` | `/api/sessions/:id` | Admin | Delete session |
| `GET` | `/api/questions/session/:sessionId` | — | List questions |
| `POST` | `/api/questions/session/:sessionId` | Visitor | Submit a question |
| `PATCH` | `/api/questions/:id` | Admin | Update question status / pin |
| `DELETE` | `/api/questions/:id` | Admin | Delete a question |
| `PUT` | `/api/answers/question/:questionId` | Admin | Create / update answer |
| `POST` | `/api/answers/question/:questionId/mark-answered` | Admin | Mark answered (no text) |
| `DELETE` | `/api/answers/question/:questionId` | Admin | Delete answer |
| `POST` | `/api/votes/question/:questionId` | Visitor | Toggle vote |
| `GET` | `/api/votes/session/:sessionId` | Visitor | Get visitor's votes |
| `POST` | `/api/reactions` | Visitor | Toggle reaction |
| `GET` | `/api/reactions/:targetType/:targetId` | Visitor | Get reactions |

All API responses follow the format: `{ success: boolean, data?: T, error?: string }`

## License

[MIT](LICENSE) © [nologin.tools](https://nologin.tools)
