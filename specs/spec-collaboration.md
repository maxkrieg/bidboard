# spec-collaboration.md — Comments, Messaging & Realtime

## Overview
BidBoard supports two forms of collaboration: threaded comments scoped to individual bids, and a flat project-level message thread for general discussion. Both are real-time via Supabase Realtime so all collaborators see new activity instantly.

---

## User Stories
- As a project member, I can post a comment on a specific bid
- As a project member, I can reply to an existing comment on a bid (one level of threading)
- As a project member, I can edit or delete my own comments
- As a project member, I can see new comments appear in real time without refreshing
- As a project member, I can post a message in the project-level group thread
- As a project member, I can see new messages appear in real time
- As a project member, I can see who posted each comment or message and when

---

## Comments

### Where they live
Comments are displayed in the right column of the Bid Detail page (`/projects/[id]/bids/[bidId]`). The panel is full-height and scrollable.

### Threading Model
- One level of threading only: a top-level comment can have replies, replies cannot have replies
- `comments.parent_id` is null for top-level, set to a comment id for replies
- Replies are indented visually beneath their parent

### Comment Display
Each comment shows:
- User avatar (initials fallback if no avatar)
- User name
- Timestamp (relative: "2 minutes ago", absolute on hover)
- Comment body (support line breaks, no rich text in v1)
- Reply button (on top-level comments only)
- Edit / Delete options (only for the comment author, shown in a dropdown)

### Adding a Comment
- Text input pinned to the bottom of the comments panel
- "Post" button or Cmd/Ctrl+Enter to submit
- Calls Server Action `createComment(bidId, body, parentId?)`
- Optimistically appends comment to the list before server confirms

### Editing a Comment
- Clicking "Edit" replaces the comment body with an inline text input
- "Save" calls `updateComment(commentId, body)`
- "Cancel" reverts to read view

### Deleting a Comment
- Clicking "Delete" shows a confirmation popover
- On confirm: calls `deleteComment(commentId)`
- If the comment has replies: soft delete — replace body with "This comment was deleted" and keep the thread structure intact
- If no replies: hard delete

---

## Server Actions — `actions/comments.ts`

### `createComment(bidId: string, body: string, parentId?: string)`
1. Verify user has access to the project this bid belongs to
2. Validate: body must be non-empty, max 2000 characters
3. If parentId provided: verify parent comment exists and belongs to same bid
4. Insert `comments` row
5. Trigger notification to other project members (see spec-notifications.md)

### `updateComment(commentId: string, body: string)`
1. Verify authenticated user is the comment author (`comments.author_id = auth.uid()`)
2. Validate body
3. Update `comments.body` and `comments.updated_at`

### `deleteComment(commentId: string)`
1. Verify authenticated user is the comment author
2. Check if comment has replies
3. If replies exist: set `body = null`, set `deleted = true` (add this column)
4. If no replies: hard delete

---

## Realtime — Comments

Subscribe to new comments on the current bid in the `CommentsPanel` component:

```ts
useEffect(() => {
  const channel = supabase
    .channel(`comments:bid:${bidId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `bid_id=eq.${bidId}`
      },
      (payload) => {
        setComments(prev => [...prev, payload.new as Comment])
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [bidId])
```

- Also subscribe to `UPDATE` and `DELETE` events to handle edits and deletions in real time
- Initial comments are loaded via a server component fetch — realtime subscription appends/updates from there

---

## Messages

### Where they live
The Messages tab on the project view (`/projects/[id]`).

### Structure
- Flat chronological list (no threading)
- Most recent messages at the bottom
- Auto-scroll to bottom on new message
- Full message history loads on tab open (paginate if > 100 messages in future)

### Message Display
Each message shows:
- User avatar + name
- Timestamp
- Message body
- Messages from the current user are right-aligned (chat bubble style)
- Messages from others are left-aligned

### Adding a Message
- Text input pinned to bottom of the tab
- Enter to send, Shift+Enter for newline
- Calls Server Action `createMessage(projectId, body)`
- Optimistic append before server confirmation

### No edit or delete in v1
Keep messages simple — no editing or deletion for the initial release.

---

## Server Actions — `actions/messages.ts`

### `createMessage(projectId: string, body: string)`
1. Verify user has access to the project
2. Validate: non-empty, max 2000 characters
3. Insert `messages` row
4. Trigger notification to other project members

---

## Realtime — Messages

```ts
useEffect(() => {
  const channel = supabase
    .channel(`messages:project:${projectId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `project_id=eq.${projectId}`
      },
      (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [projectId])
```

---

## RLS Policies

```sql
-- comments: project members can read
create policy "comments: read" on comments
  for select using (
    exists (
      select 1 from bids b
      join projects p on p.id = b.project_id
      left join project_collaborators pc on pc.project_id = p.id
      where b.id = bid_id
        and (p.owner_id = auth.uid() or pc.user_id = auth.uid())
    )
  );

-- comments: project members can insert
create policy "comments: insert" on comments
  for insert with check (
    author_id = auth.uid() and
    exists (
      select 1 from bids b
      join projects p on p.id = b.project_id
      left join project_collaborators pc on pc.project_id = p.id
      where b.id = bid_id
        and (p.owner_id = auth.uid() or pc.user_id = auth.uid())
    )
  );

-- comments: only author can update/delete
create policy "comments: update own" on comments
  for update using (author_id = auth.uid());

create policy "comments: delete own" on comments
  for delete using (author_id = auth.uid());

-- Same access pattern for messages, scoped to project_id
```

---

## Files to Create
| File | Purpose |
|---|---|
| `actions/comments.ts` | createComment, updateComment, deleteComment |
| `actions/messages.ts` | createMessage |
| `components/comments/CommentsPanel.tsx` | Full comments panel with realtime |
| `components/comments/CommentItem.tsx` | Single comment with reply/edit/delete |
| `components/comments/CommentInput.tsx` | Comment input box |
| `components/messages/MessagesTab.tsx` | Full messages tab with realtime |
| `components/messages/MessageItem.tsx` | Single message bubble |
| `components/messages/MessageInput.tsx` | Message input box |
| `supabase/migrations/0006_collaboration.sql` | comments + messages tables + RLS |
