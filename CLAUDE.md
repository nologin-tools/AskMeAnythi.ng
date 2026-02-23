# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AskMeAnything (askmeanythi.ng) - A disposable AMA event platform, use-and-go, no registration required.

- **GitHub**: https://github.com/nologin-tools/AskMeAnythi.ng
- **Live URL**: https://askmeanythi.ng
- **License**: MIT

**Tech Stack**:
- Backend: Cloudflare Workers + Hono.js + D1 + KV + Durable Objects
- Frontend: SolidJS + TypeScript + Vite + Tailwind CSS
- Build: pnpm + Turbo

## Common Commands

```bash
# Development
pnpm dev                    # Start all apps (API port 8787, Web port 5173)
pnpm --filter api dev       # Start backend only
pnpm --filter web dev       # Start frontend only

# Build & Deploy
pnpm build                  # Build all apps
pnpm --filter api deploy    # Deploy API to Cloudflare (manual)
# Auto-deploy: push to main triggers GitHub Actions (see .github/workflows/ci-deploy.yml)

# Database
pnpm db:migrate             # Local database migration (full)
pnpm --filter api db:migrate:remote  # Remote database migration (full)
pnpm --filter api db:migrate:limits  # Local: question limits migration
pnpm --filter api db:migrate:limits:remote  # Remote: question limits migration
pnpm --filter api db:migrate:rate-limits  # Local: rate limits migration
pnpm --filter api db:migrate:rate-limits:remote  # Remote: rate limits migration

# Checks
pnpm lint                   # Full TypeScript type checking
```

## Directory Structure

```
AskMeAnythi.ng/
├── .github/
│   └── workflows/
│       └── ci-deploy.yml             # GitHub Actions CI/CD workflow
├── apps/
│   ├── api/                          # Backend API (Cloudflare Workers)
│   │   ├── src/
│   │   │   ├── index.ts              # Hono entry, CORS config, scheduled export
│   │   │   ├── scheduled.ts          # Cron job to clean expired sessions
│   │   │   ├── types.ts              # Environment type definitions
│   │   │   ├── middleware/
│   │   │   │   └── rate-limit.ts     # IP-based rate limiting middleware
│   │   │   ├── utils/
│   │   │   │   └── auth.ts           # Shared admin token verification
│   │   │   ├── routes/               # API routes
│   │   │   │   ├── sessions.ts       # Session CRUD
│   │   │   │   ├── questions.ts      # Question CRUD
│   │   │   │   ├── answers.ts        # Answer CRUD
│   │   │   │   ├── votes.ts          # Voting
│   │   │   │   └── reactions.ts      # Emoji reactions
│   │   │   ├── durable-objects/
│   │   │   │   └── session-room.ts   # WebSocket Durable Object
│   │   │   └── db/
│   │   │       ├── schema.sql        # D1 database schema
│   │   │       ├── 0001_add_question_limits.sql  # Question limits migration
│   │   │       └── 0002_add_rate_limits.sql      # IP rate limits migration
│   │   └── wrangler.toml             # Workers configuration
│   │
│   └── web/                          # Frontend app (SolidJS)
│       ├── src/
│       │   ├── index.tsx             # App entry, SolidJS Router mount
│       │   ├── index.css             # Global styles, Tailwind imports
│       │   ├── App.tsx               # Route definitions
│       │   ├── pages/                # Page components (11)
│       │   │   ├── Home.tsx          # Homepage, create session
│       │   │   ├── About.tsx         # Product introduction
│       │   │   ├── Privacy.tsx       # Privacy policy
│       │   │   ├── Terms.tsx         # Terms of service
│       │   │   ├── FAQ.tsx           # Frequently asked questions
│       │   │   ├── Contact.tsx       # Contact info
│       │   │   ├── SessionPublic.tsx  # Public page, ask & vote
│       │   │   ├── SessionAdmin.tsx   # Admin dashboard
│       │   │   ├── SessionProjector.tsx # Projector mode
│       │   │   ├── SessionEnded.tsx   # Session ended page
│       │   │   └── NotFound.tsx       # 404 page
│       │   ├── components/           # UI components (12)
│       │   │   ├── Logo.tsx          # Brand logo
│       │   │   ├── StaticPageLayout.tsx # Static page shared layout
│       │   │   ├── QuestionCard.tsx   # Question card
│       │   │   ├── QuestionInput.tsx  # Question input box
│       │   │   ├── AnswerEditor.tsx   # Answer editor
│       │   │   ├── FilterBar.tsx      # Filter and sort toolbar
│       │   │   ├── Avatar.tsx         # Avatar component
│       │   │   ├── Modal.tsx          # Modal dialog
│       │   │   ├── Toast.tsx          # Toast notification
│       │   │   ├── Loading.tsx        # Loading animation
│       │   │   ├── ConnectionStatus.tsx # WebSocket connection status
│       │   │   └── CopyButton.tsx     # Copy button
│       │   └── lib/                  # Utility libraries
│       │       ├── api.ts            # API request wrapper
│       │       ├── websocket.ts      # WebSocket connection manager
│       │       ├── storage.ts        # Local storage manager
│       │       ├── markdown.ts       # Markdown parsing & rendering
│       │       ├── time.ts           # Time formatting
│       │       └── sort.ts           # Question sorting logic
│       └── vite.config.ts            # Vite config (includes API proxy)
│
├── packages/
│   └── shared/                       # Shared package
│       └── src/
│           ├── types.ts              # All type definitions
│           ├── constants.ts          # Constants
│           └── utils/
│               ├── id.ts             # ID generation (SessionId, AdminToken, VisitorId)
│               └── avatar.ts         # Hash Avatar generation (SVG)
│
├── turbo.json                        # Turbo build pipeline config
├── package.json                      # Root workspace config
└── CLAUDE.md                         # This file
```

## Core Concepts

### Authentication

- **Visitor ID**: UUID v4, passed via `X-Visitor-Id` header, used for voting/reactions/asking questions, stored in localStorage (`ama_visitor_id`). When creating questions, the Visitor ID from the request header is enforced as author_id (prevents identity spoofing)
- **Admin Token**: 32-char URL-safe Base64, passed via `X-Admin-Token` header, used for admin operations, stored in localStorage (`ama_admin_tokens`). Uses constant-time comparison (`timingSafeEqual`) to prevent timing attacks. Tokens from URL hash are format-validated before storage
- **Session ID**: 5-char Base58 encoding (excludes 0/O/I/1/l), uses rejection sampling to avoid modulo bias, has collision retry on creation (up to 3 attempts)

### Data Models

| Model | Description | Status / Lifecycle |
|-------|-------------|-------------------|
| **Session** | AMA event room | TTL 1-7 days, auto-expires; supports per-visitor question limit and rate limiting |
| **Question** | Visitor-submitted question | `pending` → `approved` → `answered` / `rejected` |
| **Answer** | Admin's answer to a question | One answer per question max, supports Markdown |
| **Vote** | Question upvote | One vote per visitor per question, toggleable |
| **Reaction** | Emoji reaction | Target type: `question` / `answer`, toggleable |

### Real-time Communication

- **WebSocket endpoint**: `/ws/:sessionId`
- **Implementation**: Cloudflare Durable Object (`SessionRoom`), using hibernation mode
- **Reconnection strategy**: 3-second interval, max 10 attempts

**Event list**:

| Event | Data Type | Trigger |
|-------|-----------|---------|
| `question_added` | `QuestionAddedData` | New question added |
| `question_updated` | `QuestionUpdatedData` | Question status/pin changed |
| `vote_changed` | `VoteChangedData` | Vote count changed |
| `answer_added` | `AnswerAddedData` | New answer added |
| `answer_updated` | `AnswerUpdatedData` | Answer content updated |
| `reaction_changed` | `ReactionChangedData` | Emoji reaction changed |
| `session_updated` | `SessionUpdatedData` | Session settings updated |
| `session_ended` | — | Session ended/deleted |

### Frontend Routes

| Route | Component | Function |
|-------|-----------|----------|
| `/` | `Home` | Homepage, create new session |
| `/about` | `About` | Product intro, features, usage |
| `/privacy` | `Privacy` | Privacy policy |
| `/terms` | `Terms` | Terms of service |
| `/faq` | `FAQ` | Frequently asked questions |
| `/contact` | `Contact` | Contact info |
| `/s/:id` | `SessionPublic` | Public page, ask & vote |
| `/s/:id/admin` | `SessionAdmin` | Admin dashboard |
| `/s/:id/projector` | `SessionProjector` | Projector mode (keyboard shortcuts) |
| `/s/:id/ended` | `SessionEnded` | Session ended page |
| `*` | `NotFound` | 404 page |

### API Endpoints

**Sessions**:
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/sessions` | — | Create new session |
| `GET` | `/api/sessions/:id` | — | Get session info (public) |
| `GET` | `/api/sessions/:id/admin` | Admin | Get session info (admin) |
| `PATCH` | `/api/sessions/:id` | Admin | Update session settings |
| `DELETE` | `/api/sessions/:id` | Admin | Delete session |

**Questions**:
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/questions/session/:sessionId` | — | Get question list (filter, sort, paginate) |
| `GET` | `/api/questions/session/:sessionId/quota` | Visitor | Get current visitor's question quota |
| `POST` | `/api/questions/session/:sessionId` | Visitor | Create question (quota limited: 403=total exceeded, 429=rate exceeded) |
| `PATCH` | `/api/questions/:id` | Admin | Update question status/pin |
| `DELETE` | `/api/questions/:id` | Admin | Delete question |

**Answers**:
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PUT` | `/api/answers/question/:questionId` | Admin | Create or update answer |
| `POST` | `/api/answers/question/:questionId/mark-answered` | Admin | Mark as answered (no text) |
| `DELETE` | `/api/answers/question/:questionId` | Admin | Delete answer |

**Votes**:
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/votes/question/:questionId` | Visitor | Vote/unvote |
| `GET` | `/api/votes/session/:sessionId` | Visitor | Get current visitor's vote status |

**Reactions**:
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/reactions` | Visitor | Add/remove reaction |
| `GET` | `/api/reactions/:targetType/:targetId` | Visitor | Get all reactions for a target |

**API response format**: `{ success: boolean, data?: T, error?: string }`

## Development Guidelines

### Development Workflow (must follow for every task)

1. **Implementation** - Complete feature development or bug fix
2. **Testing** - Verify the feature works correctly
3. **Documentation Update (required)** - Sync related documentation:
   - Changed directory structure → Update Directory Structure section
   - Changed routes → Update Frontend Routes section
   - Changed API → Update API Endpoints section
   - Changed commands → Update Common Commands section
4. **Commit** - Use conventional commit messages

**Important**: Code and documentation must be updated in the same commit. CLAUDE.md is the single source of truth for this project.

### Commit Message Convention
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation update
- `refactor:` - Code refactoring

### Code Standards
- API response format: `{ success: boolean, data?: T, error?: string }`
- Use SolidJS reactive primitives: `createSignal`, `createResource`, `createEffect`
- Style: minimalist black-and-white design, Tailwind CSS
- All API inputs must validate length limits (constants defined in `packages/shared/src/constants.ts`)
- Pagination `limit` parameter must be clamped to `[1, MAX_PAGE_SIZE]`

### Validation Constants (`@askmeanything/shared`)

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_QUESTION_LENGTH` | 2000 | Max question content length |
| `MAX_ANSWER_LENGTH` | 10000 | Max answer content length |
| `MAX_TITLE_LENGTH` | 200 | Max session title length |
| `MAX_DESCRIPTION_LENGTH` | 1000 | Max session description length |
| `MAX_AUTHOR_NAME_LENGTH` | 50 | Max author name length |
| `MAX_EMOJI_LENGTH` | 10 | Max emoji length |
| `DEFAULT_PAGE_SIZE` | 50 | Default page size |
| `MAX_PAGE_SIZE` | 100 | Max page size |
| `MIN_TTL_DAYS` | 1 | Min TTL in days |
| `VALID_QUESTION_STATUSES` | `['pending', 'approved', 'answered', 'rejected']` | Valid question status enum |
| `ADMIN_TOKEN_PATTERN` | `/^[A-Za-z0-9_-]{20,64}$/` | Admin token format regex |
| `DEFAULT_MAX_QUESTIONS_PER_VISITOR` | 50 | Default per-visitor question limit (0=unlimited) |
| `DEFAULT_RATE_LIMIT_COUNT` | 5 | Default rate limit count per window (0=unlimited) |
| `DEFAULT_RATE_LIMIT_WINDOW` | 60 | Default rate limit window (seconds) |
| `MAX_QUESTIONS_PER_VISITOR_LIMIT` | 1000 | Per-visitor question limit upper bound |
| `MAX_RATE_LIMIT_COUNT` | 100 | Rate limit count upper bound |
| `MIN_RATE_LIMIT_WINDOW` | 10 | Min rate limit window (seconds) |
| `MAX_RATE_LIMIT_WINDOW` | 3600 | Max rate limit window (seconds) |

### Security Design
- **SQL injection prevention**: All database queries use parameterized bindings (`bind()`)
- **Transaction safety**: Multi-step operations (votes, reactions, answers) use `DB.batch()` for atomicity
- **Identity verification**: Question creation enforces `X-Visitor-Id` header as author_id, does not trust request body
- **Token security**: Admin Token uses `crypto.subtle.timingSafeEqual` for constant-time comparison
- **Input validation**: All API inputs validate length limits, question status updates validate against enum whitelist
- **Markdown safety**: Uses DOMPurify to filter XSS, `renderSimpleMarkdown` additionally filters `javascript:` and other dangerous protocols
- **Error handling**: Production does not leak internal error messages, JSON parse failures return 400
- **WebSocket security**: Validates session exists and is not expired before connection
- **Scheduled cleanup**: Uses `DB.batch()` for atomic cleanup, processes in batches to prevent parameter overflow (50 per batch)
- **IP-based rate limiting**: Global (60 req/min), session creation (10/hour), votes/reactions (30/min). Uses SHA-256 hashed IP (never stores raw IPs). KV-based with fixed time windows and auto-expiring TTL

## Deployment

### Deployment Architecture

```
askmeanythi.ng (same domain)
├── /api/*  → Cloudflare Workers (Workers Routes)
├── /ws/*   → Cloudflare Workers (Workers Routes)
└── /*      → Cloudflare Pages   (static frontend)
```

Workers Routes have higher priority than Pages. `/api/*` and `/ws/*` route to Workers, everything else is handled by Pages.

### GitHub Actions (`.github/workflows/ci-deploy.yml`)

| Job | Trigger | Description |
|-----|---------|-------------|
| `check` | PR + push to main | Lint (`pnpm lint`) + Build (`pnpm build`) |
| `deploy-api` | push to main | D1 migration + Workers deployment (`--env production`) |
| `deploy-web` | push to main | Pages deployment (reuses check build artifacts) |

`deploy-api` and `deploy-web` run in parallel, both depend on `check` passing.

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token (requires Workers Scripts, D1, Pages, Workers Routes permissions) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

## Requirements

- Node.js >= 20.0.0
- pnpm 9.15.0
- Cloudflare account (required for deployment)
