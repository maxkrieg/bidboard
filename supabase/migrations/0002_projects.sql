-- 0002_projects.sql
-- Creates projects and project_collaborators tables with RLS.
-- Tables are created first, then all policies, to avoid forward-reference errors.

-- ============================================================
-- TABLES
-- ============================================================
create table if not exists public.projects (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  description    text,
  location       text not null,
  target_budget  numeric(12, 2),
  target_date    date,
  status         text not null default 'active' check (status in ('active', 'archived')),
  created_at     timestamptz not null default now()
);

create table if not exists public.project_collaborators (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete set null,
  invited_email  text not null,
  status         text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at     timestamptz not null default now()
);

-- ============================================================
-- RLS — enable on both tables before adding policies
-- ============================================================
alter table public.projects enable row level security;
alter table public.project_collaborators enable row level security;

-- ============================================================
-- PROJECTS POLICIES
-- ============================================================
create policy "projects: select for owner or collaborator"
  on public.projects for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.project_collaborators pc
      where pc.project_id = projects.id
        and pc.user_id = auth.uid()
    )
  );

create policy "projects: insert for owner"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "projects: update for owner"
  on public.projects for update
  using (auth.uid() = owner_id);

create policy "projects: delete for owner"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- ============================================================
-- PROJECT_COLLABORATORS POLICIES
-- ============================================================
create policy "project_collaborators: select for owner or self"
  on public.project_collaborators for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_collaborators.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "project_collaborators: insert for project owner"
  on public.project_collaborators for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_collaborators.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "project_collaborators: update for owner or self"
  on public.project_collaborators for update
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_collaborators.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "project_collaborators: delete for owner"
  on public.project_collaborators for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_collaborators.project_id
        and p.owner_id = auth.uid()
    )
  );
