# spec-notifications.md — Notifications

## Overview
BidBoard sends email notifications to keep project collaborators informed of important activity. Notifications are not real-time push — they are delivered as emails triggered by key events. An in-app notification indicator is also maintained for quick awareness.

---

## User Stories
- As an invited collaborator, I receive an email with a link to join the project
- As a project member, I receive an email when a new comment is posted on a bid I'm involved in
- As a project member, I receive an email when a new message is posted in a project I'm part of
- As a project member, I receive an email when a new bid is added to a project
- As a project member, I can see an unread notification count in the navbar
- As a project member, I can mark notifications as read

---

## Notification Types

| Type | Trigger | Recipients |
|---|---|---|
| `invite` | Collaborator invited to project | Invited email address |
| `bid_added` | New bid added to a project | All project members except the adder |
| `comment_added` | Comment posted on a bid | All project members except the commenter |
| `message_added` | Message posted in project thread | All project members except the sender |
| `analysis_ready` | AI analysis completed | All project members |

---

## Email Delivery

### Provider
Use **Resend** for transactional email in v1 — simple API, generous free tier, good Next.js integration.

Add to environment:
```
RESEND_API_KEY=...
FROM_EMAIL=notifications@yourdomain.com
```

### API Route — `/api/notifications`

**Method:** POST  
**Auth:** Internal only — called from Server Actions and other API routes, not directly from the client. Validate a shared secret header.

**Request body:**
```ts
{
  type: 'invite' | 'bid_added' | 'comment_added' | 'message_added' | 'analysis_ready'
  project_id: string
  triggered_by: string        // user_id of the person who caused the event
  reference_id?: string       // bid_id, comment_id, etc.
  metadata?: Record<string, string>  // e.g. { invited_email, invite_token }
}
```

**Logic:**
1. Validate shared secret
2. Fetch project + all members' emails (exclude `triggered_by` user)
3. For `invite` type: send only to `metadata.invited_email`
4. Compose email from template (see Email Templates below)
5. Send via Resend API
6. Insert rows into `notifications` table for each recipient

---

## Notification Batching / Throttle

To avoid spamming collaborators in active projects:
- `comment_added` and `message_added` notifications are **debounced per project per user** — if 3 comments are posted within 10 minutes, send one digest email not 3
- Implement with a simple check: before sending, query `notifications` for same `user_id` + `type` + `project_id` within the last 10 minutes — if found, skip the email (the in-app notification still gets inserted)

---

## Email Templates

Keep templates simple and functional in v1 — plain HTML, no heavy design system.

### Invite Email
```
Subject: [Name] invited you to collaborate on "[Project Name]"

Hi,

[Name] has invited you to review contractor bids for their project "[Project Name]".

[Accept Invitation →]  ← CTA button linking to /invite?token=...

This invitation expires in 7 days.
```

### Bid Added
```
Subject: New bid added to "[Project Name]"

[Name] added a bid from [Contractor Name] ($X,XXX) to your project.

[View Bid →]
```

### Comment Added
```
Subject: New comment on a bid in "[Project Name]"

[Name] commented on the [Contractor Name] bid:

"[Comment excerpt — first 100 characters]"

[View Comment →]
```

### Message Added
```
Subject: New message in "[Project Name]"

[Name] sent a message:

"[Message excerpt — first 100 characters]"

[View Message →]
```

### Analysis Ready
```
Subject: AI analysis ready for "[Project Name]"

Your bid analysis is ready. [Name] ran a comparison of [N] bids.

[View Analysis →]
```

---

## In-App Notifications

### Navbar Indicator
- Bell icon in the top navbar
- Red badge showing unread count (hidden if 0)
- Clicking opens a dropdown of recent notifications (last 10)
- Each notification shows: type icon, short description, timestamp, read/unread state
- "Mark all read" option at the top of the dropdown

### Notification Row Display
```
🔔 Sarah added a bid from Apex Builders    2h ago   ●
💬 Mike commented on the Apex Builders bid  1d ago
📊 AI analysis completed for Deck Project   1d ago   ●
```
● = unread indicator

### Marking as Read
- Clicking a notification marks it read and navigates to the relevant resource
- `updateNotification(notificationId, { read: true })` Server Action

---

## Server Actions — `actions/notifications.ts`

### `markNotificationRead(notificationId: string)`
1. Verify `notifications.user_id = auth.uid()`
2. Set `read = true`

### `markAllNotificationsRead()`
1. Update all `notifications` where `user_id = auth.uid()` and `read = false`

### `getUnreadCount()`
- Called from the navbar server component
- Returns count of unread notifications for the current user

---

## Database

```sql
notifications table (already defined in schema):
  id              uuid PK
  user_id         uuid FK → users
  type            enum
  reference_id    uuid
  read            boolean default false
  created_at      timestamp
```

Add a `project_id` column to `notifications` for easier querying:
```sql
alter table notifications add column project_id uuid references projects(id) on delete cascade;
```

---

## RLS Policies

```sql
-- Users can only read their own notifications
create policy "notifications: read own" on notifications
  for select using (user_id = auth.uid());

-- Users can only update their own notifications (marking read)
create policy "notifications: update own" on notifications
  for update using (user_id = auth.uid());

-- Service role inserts notifications (via API route with service key)
-- No insert policy needed for authenticated users
```

---

## Files to Create
| File | Purpose |
|---|---|
| `app/api/notifications/route.ts` | Notification dispatch API route |
| `lib/resend.ts` | Resend client + email template functions |
| `actions/notifications.ts` | markRead, markAllRead, getUnreadCount |
| `components/shared/NotificationBell.tsx` | Navbar bell icon + dropdown |
| `supabase/migrations/0007_notifications.sql` | notifications table updates + RLS |
