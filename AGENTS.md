# AGENTS.md

This file defines conventions, architecture, and guidance for AI coding agents (Claude, Copilot, Cursor, etc.) working on this codebase. Read this file in full before making any changes.

---

## Project Overview

**App Name:** BidBoard  
**Purpose:** A collaborative web app for homeowners to collect, compare, and analyze contractor bids for home improvement projects. Multiple users can be invited to a project to view bids, discuss via comments and messaging, and leverage AI-powered analysis.

**Stack:**
- **Frontend + API:** Next.js 16 (App Router) with TypeScript
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
│   │   ├── layout.tsx          # Auth guard + app shell (navbar)
│   │   ├── dashboard/          # Project list
│   │   ├── projects/
│   │   │   ├── new/            # Create project form
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # Project view — Bids / Messages / Collaborators tabs
│   │   │       ├── compare/    # Side-by-side bid comparison table
│   │   │       └── bids/
│   │   │           ├── new/            # Add bid form
│   │   │           └── [bidId]/
│   │   │               ├── page.tsx    # Bid detail + comments (Phase 6)
│   │   │               └── edit/       # Edit bid form
│   └── api/
│       ├── enrich-contractor/  # Google Places + Firecrawl enrichment (stub until Phase 4)
│       ├── analyze-bids/       # Claude AI analysis (Phase 5)
│       └── notifications/      # Email notification triggers (Phase 7)
├── components/
│   ├── ui/                     # shadcn/ui base components (do not edit)
│   ├── bids/                   # Bid-specific components
│   │   ├── BidCard.tsx
│   │   ├── BidDocuments.tsx
│   │   ├── BidForm.tsx
│   │   ├── BidStatusActions.tsx
│   │   ├── ComparisonTable.tsx
│   │   ├── ContractorCard.tsx
│   │   ├── DeleteBidButton.tsx
│   │   └── LineItemsTable.tsx
│   ├── projects/               # Project-specific components
│   │   ├── ArchiveDropdown.tsx
│   │   ├── BidsTab.tsx
│   │   ├── CollaboratorsTab.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectForm.tsx
│   │   └── ProjectTabs.tsx
│   ├── comments/               # Comment thread components (Phase 6)
│   ├── messages/               # Project messaging components (Phase 6)
│   └── shared/
│       └── StatusBadge.tsx     # Reusable pending/accepted/rejected badge
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client (cookie-based session)
│   │   ├── admin.ts            # Service-role client — bypasses RLS, server-only
│   │   └── types.ts            # DB types (manually maintained — see note below)
│   ├── claude.ts               # Anthropic client + prompt functions (Phase 5)
│   ├── google-places.ts        # Google Places API helpers (Phase 4)
│   ├── firecrawl.ts            # Firecrawl scraping helpers (Phase 4)
│   └── utils.ts                # Shared utility functions
├── actions/                    # Next.js Server Actions (mutations only)
│   ├── projects.ts             # createProject, archiveProject, getProjectById
│   ├── bids.ts                 # createBid, updateBid, deleteBid, updateBidStatus,
│   │                           #   rejectOtherBids, uploadBidDocument, deleteBidDocument,
│   │                           #   getBidById
│   ├── comments.ts             # (Phase 6)
│   ├── messages.ts             # (Phase 6)
│   ├── notifications.ts        # (Phase 7)
│   └── collaborators.ts        # (Phase 7)
├── types/                      # Shared TypeScript types (not DB types)
│   └── index.ts
├── supabase/
│   └── migrations/             # SQL migration files (numbered, never modify existing)
│       ├── 0001_init.sql
│       ├── 0002_projects.sql
│       ├── 0003_fix_rls_recursion.sql
│       ├── 0004_fix_collaborators_fk.sql
│       └── 0005_bids.sql
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
- Database types live in `lib/supabase/types.ts`. Ideally regenerated via `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts` after every schema change. Until the Supabase CLI is connected to the project, manually add new table shapes to this file to match the migration — keep Row / Insert / Update / Relationships in sync with the SQL
- Shared app-level types (not DB types) live in `types/index.ts`

---

## Environment Variables

| Variable | Used In |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` — service-role client, bypasses RLS |
| `NEXT_PUBLIC_SITE_URL` | Server Actions (building absolute URLs for API calls, e.g. enrich-contractor) |
| `ANTHROPIC_API_KEY` | `lib/claude.ts` (Phase 5) |
| `GOOGLE_PLACES_API_KEY` | `lib/google-places.ts` (Phase 4) |
| `FIRECRAWL_API_KEY` | `lib/firecrawl.ts` (Phase 4) |
| `RESEND_API_KEY` | `lib/resend.ts` (Phase 7) |
| `FROM_EMAIL` | `lib/resend.ts` (Phase 7) |
| `INVITE_JWT_SECRET` | `actions/collaborators.ts` (Phase 7) |
| `INTERNAL_API_SECRET` | API route auth for internal calls (Phase 7) |

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

## Admin Client

`lib/supabase/admin.ts` exports `createAdminClient()` — a service-role client that bypasses RLS. Use it only server-side when the anon client cannot perform the operation (e.g. inserting contractors, deleting storage objects). Never import it in client components or expose the service-role key to the browser.

---

## Supabase Storage

One bucket: **`bid-documents`** (private). Storage path convention: `{project_id}/{bid_id}/{timestamp}.{ext}`. All upload/delete operations go through server actions using the admin client. The bucket must exist in the Supabase dashboard before document upload/delete will work.

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

## Dev Workflow

### Code changes (no schema changes)
Develop locally, push to `main`, Vercel auto-deploys. No extra steps.

### Schema changes (new migrations)
1. Add a new `supabase/migrations/00XX_*.sql` file — **never modify existing migration files**
2. Link CLI to dev and push locally:
   ```bash
   npx supabase link --project-ref <DEV_PROJECT_REF>
   npx supabase db push
   ```
3. Test against dev. When ready, apply to prod before or alongside the code deploy:
   ```bash
   npx supabase link --project-ref <PROD_PROJECT_REF>
   npx supabase db push
   ```
4. Regenerate types from prod and commit:
   ```bash
   npx supabase gen types typescript --project-id <PROD_PROJECT_REF> > lib/supabase/types.ts
   ```
5. Push to `main` to trigger Vercel deploy

Run `npx supabase status` to confirm which project the CLI is linked to before running `db push`.

---

## Getting Started (for Agents)

1. Read this file completely
2. Check `/supabase/migrations/` to understand the current DB schema (migrations 0001–0020 are applied to prod)
3. Check `/types/index.ts` for shared app-level types
4. Check `/actions/` to understand existing mutation patterns before adding new ones
5. After any schema change: run `npx supabase gen types typescript --project-id <PROD_PROJECT_REF> > lib/supabase/types.ts` and commit the result
6. **All phases complete (1–7).** Production is live at `https://bidboard.maxkrieg.com`
