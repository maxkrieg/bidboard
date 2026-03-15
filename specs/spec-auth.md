# spec-auth.md — Authentication, Invite Flow & User Setup

## Overview
Authentication is handled entirely by Supabase Auth using magic link (email OTP). There are no passwords. Users are created on first login and a corresponding record is inserted into the `users` table via a database trigger.

---

## User Stories
- As a new user, I can enter my email and receive a magic link to sign in
- As a returning user, I can sign in with my email and be returned to my dashboard
- As a project owner, I can invite someone by email to collaborate on my project
- As an invited user, I can click a link in my email and land directly on the shared project after signing in

---

## Pages

### `/login`
- Centered card layout, clean minimal design
- Single email input field
- Submit button: "Send Magic Link"
- On submit: call `supabase.auth.signInWithOtp({ email })`
- Transition to confirmation state: "Check your email — we sent a link to [email]"
- No password field, no OAuth in v1

### `/auth/callback`
- Next.js route handler that exchanges the OTP token for a session
- After session is established, redirect logic:
  - If user arrived via a project invite link (stored in cookie pre-login), redirect to that project
  - Otherwise redirect to `/dashboard`

---

## Database Trigger — User Creation

When a new user signs up via Supabase Auth, a trigger automatically inserts a row into the `users` table:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Invite Flow

### Sending an Invite
1. Project owner enters a collaborator's email on the project collaborators tab
2. Server Action `inviteCollaborator(projectId, email)` is called
3. Action checks the user is the project owner
4. Inserts a row into `project_collaborators`:
   - `project_id`, `invited_email`, `status: pending`
   - `user_id` is null until the invitee accepts
5. Triggers a notification email via `/api/notifications` with a signed invite URL

### Invite URL Format
```
https://app.com/invite?token=[signed-jwt]
```
The JWT payload contains: `{ project_id, invited_email, expires_at }`
Sign with `SUPABASE_SERVICE_ROLE_KEY` — verify on redemption.

### Redeeming an Invite
1. User clicks invite link → lands on `/invite?token=...`
2. Route verifies and decodes the JWT
3. If user is not logged in: store `token` in a cookie, redirect to `/login`
4. After login (via `/auth/callback`): check for invite cookie
5. Server Action `acceptInvite(token)`:
   - Verify token is valid and not expired
   - Verify `invited_email` matches the logged-in user's email
   - Update `project_collaborators` row: set `user_id`, `status: accepted`
   - Clear invite cookie
6. Redirect to `/projects/[id]`

### Edge Cases
- If invitee already has an account: flow still works, they just sign in instead of signing up
- If token is expired: show error page with option to request a new invite
- If email mismatch: reject and show error — do not allow invite token reuse across emails
- Maximum 3 collaborators per project in v1 — validate this before inserting

---

## Session Handling

- Use Supabase's Next.js Auth Helpers (`@supabase/ssr`) for cookie-based session management
- Create two Supabase clients:
  - `lib/supabase/client.ts` — browser client using `createBrowserClient`
  - `lib/supabase/server.ts` — server client using `createServerClient` with cookie access
- Middleware (`middleware.ts`) refreshes session on every request and redirects unauthenticated users away from protected routes

```ts
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()
  
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isInviteRoute = request.nextUrl.pathname.startsWith('/invite')
  
  if (!user && !isAuthRoute && !isInviteRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

---

## Protected Routes
All routes under `/(app)/` are protected. The middleware handles redirection. Individual server components should still verify the session as a second layer.

---

## RLS Policies — `users` Table
```sql
-- Users can read their own record
create policy "users: read own" on users
  for select using (auth.uid() = id);

-- Users can update their own record
create policy "users: update own" on users
  for update using (auth.uid() = id);
```

---

## Files to Create
| File | Purpose |
|---|---|
| `app/(auth)/login/page.tsx` | Magic link login UI |
| `app/auth/callback/route.ts` | OTP exchange + redirect |
| `app/invite/page.tsx` | Invite redemption page |
| `middleware.ts` | Session refresh + route protection |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client |
| `actions/collaborators.ts` | `inviteCollaborator`, `acceptInvite` |
| `supabase/migrations/0001_init.sql` | users table + trigger |
