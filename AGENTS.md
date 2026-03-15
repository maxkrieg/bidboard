# AGENTS.md

This file defines conventions, architecture, and guidance for AI coding agents (Claude, Copilot, Cursor, etc.) working on this codebase. Read this file in full before making any changes.

---

## Project Overview

**App Name:** BidBoard  
**Purpose:** A collaborative web app for homeowners to collect, compare, and analyze contractor bids for home improvement projects. Multiple users can be invited to a project to view bids, discuss via comments and messaging, and leverage AI-powered analysis.

**Stack:**
- **Frontend + API:** Next.js 14 (App Router) with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database + Auth + Realtime + Storage:** Supabase
- **AI Analysis:** Anthropic Claude API
- **Contractor Enrichment:** Google Places API + Firecrawl
- **Deployment:** Vercel

---

## Repository Structure

```
/
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   └── login/              # Magic link login page
│   ├── (app)/
│   │   ├── dashboard/          # Project list
│   │   ├── projects/
│   │   │   ├── new/            # Create project form
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # Project view (bids tab default)
│   │   │       ├── compare/    # Side-by-side bid comparison
│   │   │       └── bids/
│   │   │           └── [bidId]/  # Bid detail + comments
│   └── api/
│       ├── enrich-contractor/  # Google Places enrichment
│       ├── analyze-bids/       # Claude AI analysis
│       └── notifications/      # Email notification triggers
├── components/
│   ├── ui/                     # shadcn/ui base components (do not edit)
│   ├── bids/                   # Bid-specific components
│   ├── projects/               # Project-specific components
│   ├── comments/               # Comment thread components
│   ├── messages/               # Project messaging components
│   └── shared/                 # Layout, navbar, cards, badges
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client
│   │   └── types.ts            # Generated DB types
│   ├── claude.ts               # Anthropic client + prompt functions
│   ├── google-places.ts        # Google Places API helpers
│   ├── firecrawl.ts            # Firecrawl scraping helpers
│   └── utils.ts                # Shared utility functions
├── actions/                    # Next.js Server Actions
│   ├── projects.ts
│   ├── bids.ts
│   ├── comments.ts
│   ├── messages.ts
│   └── collaborators.ts
├── types/                      # Shared TypeScript types
│   └── index.ts
├── supabase/
│   └── migrations/             # SQL migration files
└── AGENTS.md
```

---

## Architecture Principles

### Server Actions for Mutations
All create, update, and delete operations must use **Next.js Server Actions** defined in `/actions`. Do not create API routes for internal mutations.

```ts
// actions/bids.ts
"use server"

export async function createBid(projectId: string, data: CreateBidInput) {
  const supabase = createServerClient()
  // validate, insert, return
}
```

### API Routes for External + Async Operations
Use `/app/api/` routes only for:
- Contractor enrichment (Google Places, Firecrawl)
- Claude AI analysis triggers
- Notification dispatch
- Any webhook receivers

### Server Components by Default
Fetch data in **server components** using the server Supabase client. Only use `"use client"` when you need interactivity (forms, realtime subscriptions, UI state).

### Realtime via Supabase
Comments and messages use Supabase Realtime subscriptions on the client. Follow the existing pattern in `components/comments` and `components/messages` — do not introduce a separate WebSocket library.

---

## Database Conventions

- All tables use `uuid` primary keys with `gen_random_uuid()` as default
- All tables have a `created_at` timestamp defaulting to `now()`
- Foreign keys must have explicit names and `ON DELETE` behavior defined
- Use **Row Level Security (RLS)** on every table — never disable RLS
- All migrations go in `/supabase/migrations/` as numbered SQL files (e.g. `0001_init.sql`)
- Never modify existing migration files — always add a new one

### RLS Policy Pattern
Every table must have policies covering:
1. Users can only read rows they own or are collaborating on
2. Users can only insert rows linked to projects they own or collaborate on
3. Users can only update/delete their own rows

### Key Table Relationships
```
users
  └── projects (owner_id)
        ├── project_collaborators (project_id, user_id)
        ├── bids (project_id)
        │     ├── bid_line_items (bid_id)
        │     ├── bid_documents (bid_id)
        │     └── comments (bid_id)
        ├── messages (project_id)
        ├── bid_analyses (project_id)
        └── notifications (reference_id)

contractors (referenced by bids.contractor_id)
```

---

## Auth Conventions

- Auth is handled entirely by **Supabase Auth** with magic link (email OTP)
- The `users` table mirrors `auth.users` — a database trigger populates it on signup
- Always use the server Supabase client in Server Actions and API routes to access the session
- Never trust user-supplied IDs for ownership checks — always verify via the session

```ts
// Always do this in server actions
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error("Unauthorized")
```

---

## AI Analysis — Claude Integration

All Claude interactions live in `lib/claude.ts`. 

### Model
Always use `claude-sonnet-4-20250514` unless there is an explicit reason to change it.

### Analysis Output Shape
The AI analysis endpoint must return a structured JSON object conforming to this shape:

```ts
type BidAnalysis = {
  summary: string                  // Plain-English overall comparison
  bids: {
    bid_id: string
    contractor_name: string
    red_flags: string[]            // Array of specific concerns
    questions: string[]            // Suggested questions to ask
    highlights: string[]           // Positive notes
  }[]
}
```

This is stored in `bid_analyses.red_flags` and `bid_analyses.questions` as JSONB.

### Prompt Location
All prompts are defined as named constants in `lib/claude.ts`. Do not inline prompts in API routes or components. When modifying prompts, update the constant and add a comment with the date and reason.

---

## Contractor Enrichment

Enrichment runs as a background API call (`/api/enrich-contractor`) triggered after a bid is saved.

### Flow
1. Bid is saved with contractor name + optional location
2. Client calls `/api/enrich-contractor` with `contractor_id`
3. Route queries Google Places API using contractor name + project location
4. If a match is found, update `contractors` record with Places data
5. Set `enriched_at` timestamp — do not re-enrich if `enriched_at` is less than 7 days old

### Deduplication
Before creating a new contractor record, always check for an existing contractor by `google_place_id`. If found, link the bid to the existing contractor record instead of creating a duplicate.

---

## UI & Styling Conventions

- Use **shadcn/ui** components from `components/ui/` — do not modify these files directly
- All custom components go in `components/bids/`, `components/projects/`, etc.
- Use **Tailwind utility classes** only — no custom CSS files unless absolutely necessary
- Color palette:
  - Primary: `indigo-600`
  - Background: `zinc-50`
  - Card: `white` with `border border-zinc-200`
  - Muted text: `zinc-500`
  - Success: `green-500`, Warning: `amber-500`, Danger: `red-500`
- Bid status badges must always use the `<StatusBadge>` component in `components/shared/`
- All data tables use the shadcn `<Table>` component

---

## TypeScript Conventions

- Strict mode is enabled — no use of `any`
- All Server Action inputs must be validated with **Zod** before hitting the database
- Database types are auto-generated via Supabase CLI and live in `lib/supabase/types.ts` — do not hand-edit this file
- Shared app-level types (not DB types) live in `types/index.ts`

---

## Environment Variables

| Variable | Used In |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (API routes) |
| `ANTHROPIC_API_KEY` | Server only |
| `GOOGLE_PLACES_API_KEY` | Server only |
| `FIRECRAWL_API_KEY` | Server only |

**Never expose server-only keys to the client.** Any variable without `NEXT_PUBLIC_` prefix must only be used in server components, server actions, or API routes.

---

## Error Handling

- Server Actions must return a typed result object, never throw to the client:
```ts
type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string }
```
- API routes return standard HTTP status codes with a JSON `{ error: string }` body on failure
- Log errors server-side with `console.error` including context — do not swallow errors silently

---

## What NOT to Do

- Do not use `getServerSideProps` or `getStaticProps` — this is App Router only
- Do not create client-side data fetching with `useEffect` + `fetch` — use server components or Server Actions
- Do not store sensitive data in `localStorage` or cookies manually — Supabase Auth handles sessions
- Do not add new npm dependencies without checking if shadcn/ui or a native Web API already covers the need
- Do not modify `/components/ui/` files — these are shadcn-managed
- Do not skip Zod validation on any user input that reaches the database
- Do not disable RLS on any Supabase table

---

## Getting Started (for Agents)

1. Read this file completely
2. Check `/supabase/migrations/` to understand the current DB schema
3. Check `/types/index.ts` for shared types
4. Check `/actions/` to understand existing mutation patterns before adding new ones
5. Run `supabase gen types typescript` after any schema changes to regenerate `lib/supabase/types.ts`
