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

Before starting, create a `.env.local` file in the project root with the following keys. Do not hardcode any of these values in source files.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
GOOGLE_PLACES_API_KEY=
FIRECRAWL_API_KEY=
RESEND_API_KEY=
FROM_EMAIL=
INVITE_JWT_SECRET=
INTERNAL_API_SECRET=
```

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

---

### Phase 1 — Project Scaffold & Auth
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

### Phase 2 — Projects
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

---

### Phase 3 — Bids
**Goal:** Users can add, view, and manage bids on a project.

Steps:
1. Create `supabase/migrations/0003_bids.sql` — contractors, bids, bid_line_items, bid_documents tables + RLS
2. Create `actions/bids.ts` — `createBid`, `updateBid`, `deleteBid`, `updateBidStatus`
3. Create `/projects/[id]/bids/new` page — bid creation form
4. Create `/projects/[id]/bids/[bidId]` page — bid detail (comments column empty for now)
5. Create `/projects/[id]/bids/[bidId]/edit` page
6. Create `/projects/[id]/compare` page — comparison table
7. Create `components/bids/BidCard.tsx`
8. Create `components/bids/BidForm.tsx`
9. Create `components/bids/LineItemsTable.tsx`
10. Create `components/bids/BidStatusActions.tsx`
11. Create `components/bids/ComparisonTable.tsx`
12. Wire "Add Bid" button into the Bids tab on the project view

**Verify:** User can add a bid with line items, see it as a card on the project, view its detail, edit it, change its status, and view the comparison table.

---

### Phase 4 — Contractor Enrichment
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

---

### Phase 5 — AI Analysis
**Goal:** Users can trigger AI analysis of all bids and see a structured comparison.

Steps:
1. Create `supabase/migrations/0005_bid_analyses.sql`
2. Create `lib/claude.ts` — Anthropic client, `ANALYZE_BIDS_PROMPT` constant, `analyzeBids()` function
3. Create `app/api/analyze-bids/route.ts`
4. Create `components/bids/AnalysisPanel.tsx`
5. Create `components/bids/AnalysisBidSection.tsx`
6. Wire analysis panel into the Bids tab below the bid cards

**Verify:** With 2+ bids on a project, clicking "Run AI Analysis" returns a summary, red flags, highlights, and questions for each bid within 15 seconds.

---

### Phase 6 — Collaboration
**Goal:** Project members can comment on bids and message each other in real time.

Steps:
1. Create `supabase/migrations/0006_collaboration.sql` — comments + messages tables + RLS
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

---

### Phase 7 — Invites & Notifications
**Goal:** Project owners can invite collaborators and all members receive email notifications.

Steps:
1. Create `supabase/migrations/0007_notifications.sql`
2. Create `lib/resend.ts` — Resend client + email template functions
3. Create `app/api/notifications/route.ts`
4. Create `actions/notifications.ts` — `markNotificationRead`, `markAllNotificationsRead`
5. Create `actions/collaborators.ts` — `inviteCollaborator`, `acceptInvite`
6. Create `app/invite/page.tsx` — invite redemption flow
7. Wire invite form into the Collaborators tab on the project view
8. Create `components/shared/NotificationBell.tsx` — navbar bell + dropdown
9. Wire notification triggers into bid, comment, and message actions

**Verify:** Owner can invite a collaborator by email. Invitee receives an email, clicks the link, signs in, and lands on the shared project. Notification bell shows unread count when activity occurs.

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

Then start Phase 1.
