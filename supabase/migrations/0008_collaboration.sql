-- 0008_collaboration.sql
-- comments (bid-scoped) + messages (project-scoped)

-- ─── comments ────────────────────────────────────────────────────────────────

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  bid_id      uuid not null references public.bids(id) on delete cascade,
  author_id   uuid not null references public.users(id) on delete cascade,
  parent_id   uuid references public.comments(id) on delete cascade,
  body        text,
  deleted     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.comments enable row level security;

-- Read: project members (via bid → project)
create policy "comments: select for project members"
  on public.comments for select
  using (
    exists (
      select 1 from public.bids b
      where b.id = bid_id
        and is_project_member(b.project_id)
    )
  );

-- Insert: project members; author must be self
create policy "comments: insert for project members"
  on public.comments for insert
  with check (
    author_id = auth.uid() and
    exists (
      select 1 from public.bids b
      where b.id = bid_id
        and is_project_member(b.project_id)
    )
  );

-- Update: author only
create policy "comments: update own"
  on public.comments for update
  using (author_id = auth.uid());

-- Delete: author only
create policy "comments: delete own"
  on public.comments for delete
  using (author_id = auth.uid());

-- ─── messages ────────────────────────────────────────────────────────────────

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  author_id   uuid not null references public.users(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages: select for project members"
  on public.messages for select
  using (is_project_member(project_id));

create policy "messages: insert for project members"
  on public.messages for insert
  with check (
    author_id = auth.uid() and is_project_member(project_id)
  );

-- ─── realtime ────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.messages;
