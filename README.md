# ShipFlow AI

**Turn plain-language feature requests into reviewed, shipped code — with AI reviewing every line against what was actually asked for.**

ShipFlow AI is a multi-tenant B2B platform that governs the entire software delivery lifecycle, from a client's first request to merged, shipped code. Instead of another chatbot or copilot, it's an **AI-governed delivery pipeline** that holds every change accountable to its specification through a dual-AI code review gated on acceptance criteria and full request-to-ship traceability.

---

## What it does

ShipFlow AI takes a feature request through seven governed stages:

1. **Client request** — A client submits a feature request or bug in plain language through a ticketed client portal.
2. **AI discovery** — An AI runs a clarifying conversation to pin down scope and intent before any code is written.
3. **PRD generation** — The AI produces a structured PRD with explicit, numbered **acceptance criteria**.
4. **Task breakdown** — The PRD is decomposed into tasks, exactly **one task per acceptance criterion**, so the entire build is 1:1 traceable to the spec.
5. **Developer Kanban** — Developers pick up tasks on a drag-and-drop board, do the work, and open a GitHub pull request.
6. **Dual-AI code review** — When a PR is submitted, the engine fetches the real diff and reviews it in **two independent passes**:
   - an **implementation critic** that checks the diff against every acceptance criterion, and
   - an **adversarial QA** pass that hunts for security holes, edge cases, and regressions.

   Each issue becomes a **finding** with a severity (S1–S5), a category (security, correctness, performance, requirement, edge-case, code-quality), and **quoted code evidence** from the diff. Blocking findings route the PR back to the developer; a clean review advances it.
7. **Senior-engineer approval** — A senior engineer reviews the AI findings and approves → the request is **shipped**.

### The differentiators

- **Dual-AI review gated on acceptance criteria** — Code is never reviewed in a vacuum. Every PR is checked against the exact spec the client asked for, by two independent AI lenses.
- **End-to-end traceability** — A complete lineage from request → criterion → task → pull request → finding → ship.
- **Role-based multi-tenancy** — Separate, purpose-built portals for Clients, Product Managers, Developers, and Senior Engineers, with workspace isolation, audit logging, and enterprise auth.

---

## Tech stack

**Monorepo & tooling**
- Turborepo (monorepo orchestration)
- pnpm (workspaces)
- TypeScript (strict mode)

**Frontend**
- Next.js (App Router)
- React 19
- Tailwind CSS v4
- Geist Sans + Geist Mono

**Backend & data**
- tRPC v11 (type-safe API layer)
- Prisma (ORM)
- Neon (serverless Postgres)
- BetterAuth (self-hosted authentication, Prisma adapter)
- Upstash Redis (rate limiting — sliding window)

**AI**
- Vercel AI SDK
- OpenAI (structured generation via `generateObject` + Zod schema validation)

**Integrations & infrastructure**
- GitHub App integration (Octokit — PR diff retrieval, HMAC-verified webhooks)
- Inngest (background job orchestration)
- Vercel (deployment)

---

## Architecture highlights

- **Defense-in-depth auth** — A database-validated security boundary (`auth-guard`) enforces workspace membership and role on every protected route, with role-gated portals and post-login role routing.
- **Schema-validated AI output** — All AI generation (PRDs, task breakdowns, review findings) is produced as structured output validated against Zod schemas, not free-text parsing.
- **Acceptance-criteria-driven tasks** — The task breakdown enforces a strict 1:1 mapping between acceptance criteria and tasks, making traceability a structural guarantee rather than a convention.
- **Real diff review** — The review engine pulls the actual unified diff from GitHub via an installation token and reviews it against the PRD's criteria, producing findings with quoted evidence.
- **Auditable state machine** — Every feature request moves through an explicit status lifecycle (Submitted → Discovery → PRD Draft → In Dev → In Review → Fix Needed / Pending Approval → Shipped), with audit logging at each transition.

---

## Roles

| Role | Portal |
|------|--------|
| **Client** | Submit requests, track progress through the pipeline |
| **Product Manager** | Review and edit AI-generated PRDs, approve to start development |
| **Developer** | Work tasks on a Kanban board, submit pull requests for review |
| **Senior Engineer** | Review AI findings, approve and ship or send back for fixes |

---

## Design

A deliberately non-templated, engineered aesthetic: a charcoal-and-off-white foundation with a single rationed indigo-violet accent, monospace as a signature for data and labels, hairline borders, and a precise grid. No gradients, glassmorphism, or decorative flourishes — built to read like a serious developer tool.

---

## Getting started

```bash
# install
pnpm install

# generate the Prisma client
pnpm --filter @shipflow/db prisma generate

# run the dev server
pnpm dev
```

### Required environment variables

```
# Database
DATABASE_URL=                      # Neon pooled connection string

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=                   # production URL in deployment, localhost in dev

# GitHub App
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=            # PEM, with \n escapes (or *_PATH for a file)
GITHUB_APP_WEBHOOK_SECRET=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

---

## Status

Built as a complete, working vertical slice of the full pipeline: client request → AI discovery → PRD → task breakdown → developer Kanban → dual-AI review → senior approval → shipped.
