# CLAUDE.md

You are building **BidBoard** — a collaborative web app for homeowners to collect, compare, and analyze contractor bids for home improvement projects. Multiple users can be invited to a project to view bids, discuss via comments and messaging, and leverage AI-powered analysis.

Before doing anything else, read the following files in full:
1. `AGENTS.md` — architecture principles, conventions, and rules you must follow
2. `specs/spec-auth.md`
3. `specs/spec-projects.md`
4. `specs/spec-bids.md`
5. `specs/spec-contractor-enrichment.md`
6. `specs/spec-ai-analysis.md`
7. `specs/spec-collaboration.md`
8. `specs/spec-notifications.md`

Do not write any code until you have read all of the above.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database + Auth + Realtime + Storage:** Supabase
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Contractor Enrichment:** Google Places API + Firecrawl
- **Email:** Resend
- **Deployment:** Vercel

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values. Do not hardcode any of these values in source files.

```bash
cp .env.local.example .env.local
```

**When adding a new environment variable**, you must also add it to `.env.local.example` (with an empty value and a short comment explaining what it is). This keeps the example file authoritative as the canonical list of required variables.

### `NEXT_PUBLIC_SITE_URL` on Vercel

When deploying to Vercel, set `NEXT_PUBLIC_SITE_URL` to your production URL (e.g. `https://bidboard.vercel.app`) in the Vercel dashboard under Project → Settings → Environment Variables.

Vercel provides `NEXT_PUBLIC_VERCEL_URL` automatically, but it is hostname-only (no `https://` prefix) and should not be used as a substitute here — all email links and internal API fetch calls depend on `NEXT_PUBLIC_SITE_URL` being a fully-qualified URL.

---

## Local Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Generate Supabase types (run after any schema change)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts

# Apply migrations
npx supabase db push
```

---

## Build Order

Work through these phases in sequence. Complete and verify each phase before starting the next. Do not skip ahead.

**After completing each phase:** update this file — mark the phase complete, record any files that drifted from the plan (different names, extra files, removed steps), and note any conventions discovered that future phases should follow.

---

### Phase 1 — Project Scaffold & Auth ✅ COMPLETE
**Goal:** A working Next.js app with Supabase auth and a protected dashboard route.

Steps:
1. Initialize Next.js 16 with TypeScript and Tailwind: `npx create-next-app@latest . --typescript --tailwind --app`
2. Install dependencies:
   ```bash
   npm install @supabase/ssr @supabase/supabase-js @anthropic-ai/sdk
   npm install resend zod
   npx shadcn@latest init
   npx shadcn@latest add button input label card badge avatar tabs separator dropdown-menu dialog popover toast
   ```
3. Create `lib/supabase/client.ts` and `lib/supabase/server.ts`
4. Create `middleware.ts` for session refresh and route protection
5. Create `supabase/migrations/0001_init.sql` — users table + auth trigger
6. Create `/login` page with magic link flow
7. Create `/auth/callback` route handler
8. Create `/dashboard` as a protected empty page (just a heading for now)

**Verify:** User can sign in via magic link and land on `/dashboard`. Unauthenticated users are redirected to `/login`.

---

### Phase 2 — Projects ✅ COMPLETE
**Goal:** Users can create projects and see them on the dashboard.

Steps:
1. Create `supabase/migrations/0002_projects.sql` — projects + project_collaborators tables + RLS
2. Create `actions/projects.ts` — `createProject`, `archiveProject`, `getProjectById`
3. Create `/dashboard` page — project card grid, empty state
4. Create `/projects/new` page — project creation form
5. Create `/projects/[id]` page — tabbed layout (Bids, Messages, Collaborators tabs as empty placeholders)
6. Create `components/projects/ProjectCard.tsx`
7. Create `components/projects/ProjectForm.tsx`

**Verify:** User can create a project, see it on the dashboard, and navigate to the project view.

**Drift notes:**
- Two extra fix migrations were needed after this phase: `0003_fix_rls_recursion.sql` and `0004_fix_collaborators_fk.sql`. This shifted all subsequent migration numbers up by 2.

---

### Phase 3 — Bids ✅ COMPLETE
**Goal:** Users can add, view, and manage bids on a project.

Steps:
1. Create `supabase/migrations/0005_bids.sql` — contractors, bids, bid_line_items, bid_documents tables + RLS *(was 0003 in original plan — shifted by fix migrations)*
2. Create `actions/bids.ts` — `createBid`, `updateBid`, `deleteBid`, `updateBidStatus`, `uploadBidDocument`, `deleteBidDocument`, `getBidById`
3. Create `/projects/[id]/bids/new` page — bid creation form
4. Create `/projects/[id]/bids/[bidId]` page — bid detail (comments column empty for now)
5. Create `/projects/[id]/bids/[bidId]/edit` page
6. Create `/projects/[id]/compare` page — comparison table
7. Create `components/bids/BidCard.tsx`
8. Create `components/bids/BidForm.tsx`
9. Create `components/bids/LineItemsTable.tsx`
10. Create `components/bids/BidStatusActions.tsx`
11. Create `components/bids/ComparisonTable.tsx`
12. Create `components/bids/BidDocuments.tsx` *(not in original plan)*
13. Create `components/bids/DeleteBidButton.tsx` *(not in original plan)*
14. Create `components/shared/StatusBadge.tsx` *(not in original plan)*
15. Wire "Add Bid" button into the Bids tab on the project view

**Verify:** User can add a bid with line items, see it as a card on the project, view its detail, edit it, change its status, and view the comparison table.

**Drift notes:**
- `actions/bids.ts` grew to include `uploadBidDocument`, `deleteBidDocument`, and `getBidById` beyond the original plan.
- Extra shared/bid components were added: `BidDocuments`, `DeleteBidButton`, `StatusBadge`.
- `is_project_member(p_project_id uuid)` SQL helper function was defined in `0005_bids.sql` and is reused in all subsequent RLS policies — always use it for project-scoped access checks.

---

### Phase 4 — Contractor Enrichment ✅ COMPLETE
**Goal:** When a bid is saved, the contractor is automatically researched and the data is displayed.

Steps:
1. Create `lib/google-places.ts`
2. Create `lib/firecrawl.ts`
3. Create `lib/license-states.ts`
4. Create `app/api/enrich-contractor/route.ts`
5. Update `createBid` in `actions/bids.ts` to fire enrichment after save
6. Create `components/bids/ContractorCard.tsx` with loading skeleton and realtime update
7. Wire Supabase Realtime subscription on `contractors` table in `ContractorCard`

**Verify:** After adding a bid, the contractor card shows a loading state then populates with Google rating, review count, address, and website within a few seconds.

**Drift notes:**
- An additional migration `0006_contractors_realtime.sql` was created to add the contractors table to the Realtime publication (it was not included in `0005_bids.sql`).
- The browser Supabase client is exported as `createClient()` from `lib/supabase/client.ts` — not `createBrowserClient()`. Use this name in all client components.

---

### Phase 5 — AI Analysis ✅ COMPLETE
**Goal:** Users can trigger AI analysis of all bids and see a structured comparison.

Steps:
1. Create `supabase/migrations/0007_bid_analyses.sql` *(was 0005 in original plan — shifted by fix migrations)*
2. Create `lib/claude.ts` — Anthropic client, `ANALYZE_BIDS_PROMPT` constant, `analyzeBids()` function
3. Create `app/api/analyze-bids/route.ts`
4. Create `components/bids/AnalysisPanel.tsx`
5. Create `components/bids/AnalysisBidSection.tsx`
6. Wire analysis panel into the Bids tab below the bid cards

**Verify:** With 2+ bids on a project, clicking "Run AI Analysis" returns a summary, red flags, highlights, and questions for each bid within 15 seconds.

---

### Phase 6 — Collaboration ✅ COMPLETE
**Goal:** Project members can comment on bids and message each other in real time.

Steps:
1. Create `supabase/migrations/0008_collaboration.sql` — comments + messages tables + RLS + Realtime *(was 0006 in original plan — shifted by fix migrations)*
2. Create `actions/comments.ts` — `createComment`, `updateComment`, `deleteComment`
3. Create `actions/messages.ts` — `createMessage`
4. Create `components/comments/CommentsPanel.tsx` with Supabase Realtime
5. Create `components/comments/CommentItem.tsx`
6. Create `components/comments/CommentInput.tsx`
7. Create `components/messages/MessagesTab.tsx` with Supabase Realtime
8. Create `components/messages/MessageItem.tsx`
9. Create `components/messages/MessageInput.tsx`
10. Wire comments panel into the right column of the Bid Detail page
11. Wire messages into the Messages tab on the project view

**Verify:** Two browser sessions logged in as different users can post comments and messages and see each other's activity in real time without refreshing.

**Drift notes:**
- `deleteComment` uses a soft-delete (sets `body=null`, `deleted=true`) when the comment has replies; hard-deletes otherwise.
- Comments support one level of threading via `parent_id`. Replies are rendered indented beneath their parent in `CommentsPanel`.
- `CommentsPanel` and `MessagesTab` maintain an author profile cache (`useRef`) to avoid redundant DB fetches for authors already seen in `initialComments`/`initialMessages`.

---

### Phase 7 — Invites & Notifications ✅ COMPLETE
**Goal:** Project owners can invite collaborators and all members receive email notifications.

Steps:
1. Create `supabase/migrations/0009_notifications.sql` *(next available number — was 0007 in original plan)*
2. Create `lib/resend.ts` — Resend client + email template functions
3. Create `app/api/notifications/route.ts`
4. Create `actions/notifications.ts` — `markNotificationRead`, `markAllNotificationsRead`
5. Create `actions/collaborators.ts` — `inviteCollaborator`, `acceptInvite`
6. Create `app/invite/page.tsx` — invite redemption flow
7. Wire invite form into the Collaborators tab on the project view
8. Create `components/shared/NotificationBell.tsx` — navbar bell + dropdown
9. Wire notification triggers into bid, comment, and message actions

**Verify:** Owner can invite a collaborator by email. Invitee receives an email, clicks the link, signs in, and lands on the shared project. Notification bell shows unread count when activity occurs.

**Drift notes:**
- `jose` was installed for edge-safe JWT signing/verification.
- Login page was split into `page.tsx` (Server Component) + `LoginForm.tsx` (Client Component) to satisfy the Next.js Suspense requirement for `useSearchParams`.
- `app/auth/callback/route.ts` was updated to respect `?next=` query param (checked before cookie-based invite redirect).
- `NEXT_PUBLIC_SITE_URL` (already present from Phase 1) is used for all absolute URL construction in emails and notification fetch calls.
- `DropdownMenuTrigger` in this codebase does not support `asChild`; `NotificationBell` renders the trigger as a plain styled button instead.

---

## Key Rules (Summary)

- Always read `AGENTS.md` for full conventions — this is just a summary
- Use Server Actions for all mutations — no client-side fetch for writes
- Use API routes only for external integrations and async jobs
- Validate all user input with Zod before it touches the database
- Never disable RLS on any Supabase table
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY` to the client
- Never use `any` in TypeScript
- Do not modify files in `components/ui/` — these are shadcn-managed
- Complete and verify each phase before moving to the next
- Run `npx supabase gen types typescript` after every schema migration

---

## When You Are Ready

Read all spec and AGENTS files, then say:
- Which phase you are starting
- What files you will create
- Any questions or blockers before you begin

**Current status: Phases 1–7 complete. All phases done.**
