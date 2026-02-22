# AskMeAnything Project Context

## Project Overview

**AskMeAnything** (`askmeanythi.ng`) is a temporary, disposable AMA (Ask Me Anything) platform. It allows users to create session rooms where audiences can ask questions, vote, and react in real-time without requiring registration.

- **GitHub:** https://github.com/nologin-tools/AskMeAnythi.ng
- **Live:** https://askmeanythi.ng
- **License:** MIT

## Tech Stack

The project is a **Monorepo** managed by **Turbo** and **pnpm**.

### Backend (`apps/api`)
*   **Runtime:** Cloudflare Workers
*   **Framework:** Hono
*   **Database:** Cloudflare D1 (SQLite)
*   **Real-time:** Cloudflare Durable Objects (WebSockets)
*   **Language:** TypeScript

### Frontend (`apps/web`)
*   **Framework:** SolidJS
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **Routing:** @solidjs/router
*   **Animations:** solid-motionone
*   **Language:** TypeScript

### Shared (`packages/shared`)
*   Shared TypeScript interfaces, types, and utility functions used by both API and Web apps.

## Project Structure

```text
AskMeAnythi.ng/
├── apps/
│   ├── api/                  # Cloudflare Workers backend
│   │   ├── src/
│   │   │   ├── index.ts      # Hono entry point & CORS
│   │   │   ├── types.ts      # Environment type definitions
│   │   │   ├── routes/       # API routes
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── questions.ts
│   │   │   │   ├── answers.ts
│   │   │   │   ├── votes.ts
│   │   │   │   └── reactions.ts
│   │   │   ├── durable-objects/
│   │   │   │   └── session-room.ts  # WebSocket Durable Object
│   │   │   └── db/
│   │   │       └── schema.sql       # D1 database schema
│   │   └── wrangler.toml    # Cloudflare configuration
│   └── web/                  # SolidJS frontend
│       ├── src/
│       │   ├── index.tsx     # App entry point
│       │   ├── index.css     # Global styles & Tailwind imports
│       │   ├── App.tsx       # Router & route definitions
│       │   ├── components/   # UI Components (11)
│       │   ├── lib/          # Utilities (api, websocket, storage, markdown, time, sort)
│       │   └── pages/        # Route components (6)
│       └── vite.config.ts    # Vite configuration with API proxy
├── packages/
│   └── shared/               # Shared code
│       └── src/
│           ├── types.ts      # Shared interfaces & WebSocket events
│           ├── constants.ts  # Constants & config values
│           └── utils/
│               ├── id.ts     # ID generation (SessionId, AdminToken, VisitorId)
│               └── avatar.ts # Hash avatar generation (SVG)
├── turbo.json                # Turbo pipeline config
├── package.json              # Root scripts and workspace config
└── CLAUDE.md                 # Claude Code project context
```

## Getting Started

### Prerequisites
*   Node.js >= 20.0.0
*   pnpm >= 9.15.0

### Development

Run the development server for all apps:

```bash
pnpm dev
```

*   **API:** http://localhost:8787
*   **Web:** http://localhost:5173

Run specific workspaces:

```bash
pnpm --filter api dev
pnpm --filter web dev
```

### Database Management (Cloudflare D1)

```bash
# Apply migrations locally
pnpm db:migrate

# Apply migrations to remote (production)
pnpm --filter api db:migrate:remote
```

### Building

Build all applications:

```bash
pnpm build
```

### Deployment

Deploy the API to Cloudflare Workers:

```bash
pnpm --filter api deploy
```

### Type Checking

```bash
pnpm lint
```

## Architecture Notes

### Data Model
*   **Sessions:** Short-lived AMA rooms with configurable TTL (1–7 days). Auto-expire after TTL.
*   **Questions:** User-submitted queries. Status flow: `pending` → `approved` → `answered` / `rejected`. Can be pinned.
*   **Answers:** Host responses to questions (one per question). Supports Markdown.
*   **Votes:** Upvotes on questions. One per visitor per question, toggleable.
*   **Reactions:** Emoji reactions on questions or answers (`target_type`: `question` | `answer`). Toggleable.

### Real-time Communication
*   Powered by Cloudflare **Durable Objects** (`SessionRoom` class) using hibernation mode.
*   WebSocket Endpoint: `/ws/:sessionId`.
*   Reconnection: 3s interval, max 10 attempts.
*   Events: `question_added`, `question_updated`, `vote_changed`, `answer_added`, `answer_updated`, `reaction_changed`, `session_updated`, `session_ended` (See `packages/shared/src/types.ts`).

### Authentication
*   **Host:** Identified via `X-Admin-Token` header (32-char URL-safe Base64, generated upon session creation, stored in localStorage as `ama_admin_tokens`).
*   **Visitor:** Identified via `X-Visitor-Id` header (UUID v4, stored in localStorage as `ama_visitor_id`).
*   **Session ID:** 5-char Base58 encoded string (excludes 0/O/1/l/I).

### Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home` | Landing page, create session |
| `/s/:id` | `SessionPublic` | Public session, ask & vote |
| `/s/:id/admin` | `SessionAdmin` | Admin dashboard |
| `/s/:id/projector` | `SessionProjector` | Projector mode (keyboard shortcuts) |
| `/s/:id/ended` | `SessionEnded` | Session ended page |
| `*` | `NotFound` | 404 page |

### API Endpoints

**Sessions:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/sessions` | — | Create session |
| `GET` | `/api/sessions/:id` | — | Get session (public) |
| `GET` | `/api/sessions/:id/admin` | Admin | Get session (admin) |
| `PATCH` | `/api/sessions/:id` | Admin | Update session |
| `DELETE` | `/api/sessions/:id` | Admin | Delete session |

**Questions:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/questions/session/:sessionId` | — | List questions (filter, sort, paginate) |
| `POST` | `/api/questions/session/:sessionId` | Visitor | Create question |
| `PATCH` | `/api/questions/:id` | Admin | Update status / pin |
| `DELETE` | `/api/questions/:id` | Admin | Delete question |

**Answers:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PUT` | `/api/answers/question/:questionId` | Admin | Create / update answer |
| `POST` | `/api/answers/question/:questionId/mark-answered` | Admin | Mark answered (no text) |
| `DELETE` | `/api/answers/question/:questionId` | Admin | Delete answer |

**Votes:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/votes/question/:questionId` | Visitor | Toggle vote |
| `GET` | `/api/votes/session/:sessionId` | Visitor | Get visitor's votes |

**Reactions:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/reactions` | Visitor | Toggle reaction |
| `GET` | `/api/reactions/:targetType/:targetId` | Visitor | Get reactions |

API response format: `{ success: boolean, data?: T, error?: string }`

### Key Constants (`packages/shared/src/constants.ts`)

| Constant | Value | Description |
|----------|-------|-------------|
| `SESSION_ID_LENGTH` | `5` | Session ID length (Base58) |
| `ADMIN_TOKEN_LENGTH` | `32` | Admin token length (Base64) |
| `DEFAULT_TTL_DAYS` | `1` | Default session TTL |
| `MAX_TTL_DAYS` | `7` | Maximum session TTL |
| `TTL_OPTIONS` | `[1, 2, 3, 7]` | Available TTL choices |
| `DEFAULT_TITLE` | `'未命名活动'` | Default session title |
| `QUICK_REACTIONS` | `['👍', '👎', '➕', '➖']` | Quick reaction emojis |
| `PROJECTOR_AUTO_SCROLL_INTERVAL` | `15000` | Projector auto-scroll (ms) |
| `WS_RECONNECT_INTERVAL` | `3000` | WebSocket reconnect interval (ms) |
| `WS_MAX_RECONNECT_ATTEMPTS` | `10` | Max reconnect attempts |
