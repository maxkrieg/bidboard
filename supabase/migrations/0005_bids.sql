-- 0005_bids.sql
-- contractors, bids, bid_line_items, bid_documents

-- ─── contractors ────────────────────────────────────────────────────────────
create table public.contractors (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  phone               text,
  email               text,
  website             text,
  location            text,
  google_place_id     text unique,
  google_rating       numeric(2,1),
  google_review_count int,
  address             text,
  bbb_rating          text,
  bbb_accredited      boolean,
  license_number      text,
  license_status      text,
  enriched_at         timestamptz,
  created_at          timestamptz not null default now()
);

alter table public.contractors enable row level security;

-- Any authenticated user can read contractors (shared lookup)
create policy "contractors: select for authenticated"
  on public.contractors for select
  using (auth.role() = 'authenticated');

-- Only service role can insert/update (enrichment runs server-side)
create policy "contractors: insert for service role"
  on public.contractors for insert
  with check (auth.role() = 'service_role');

create policy "contractors: update for service role"
  on public.contractors for update
  using (auth.role() = 'service_role');

-- ─── helper: is_project_member ───────────────────────────────────────────────
-- Returns true if the current user is the project owner OR an accepted collaborator.
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = auth.uid()
  )
  or exists (
    select 1 from public.project_collaborators
    where project_id = p_project_id
      and user_id = auth.uid()
      and status = 'accepted'
  );
$$;

-- ─── bids ────────────────────────────────────────────────────────────────────
create table public.bids (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  contractor_id   uuid not null references public.contractors(id) on delete restrict,
  total_price     numeric(12,2) not null,
  bid_date        date not null,
  expiry_date     date,
  estimated_days  int,
  notes           text,
  status          text not null default 'pending'
                    check (status in ('pending','accepted','rejected')),
  created_at      timestamptz not null default now()
);

alter table public.bids enable row level security;

create policy "bids: select for project members"
  on public.bids for select
  using (is_project_member(project_id));

create policy "bids: insert for project members"
  on public.bids for insert
  with check (is_project_member(project_id));

create policy "bids: update for project members"
  on public.bids for update
  using (is_project_member(project_id));

create policy "bids: delete for project members"
  on public.bids for delete
  using (is_project_member(project_id));

-- ─── bid_line_items ──────────────────────────────────────────────────────────
create table public.bid_line_items (
  id          uuid primary key default gen_random_uuid(),
  bid_id      uuid not null references public.bids(id) on delete cascade,
  description text not null,
  quantity    numeric(10,2) not null default 1,
  unit        text,
  unit_price  numeric(12,2) not null,
  created_at  timestamptz not null default now()
);

alter table public.bid_line_items enable row level security;

create policy "bid_line_items: select for project members"
  on public.bid_line_items for select
  using (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_member(b.project_id)
    )
  );

create policy "bid_line_items: insert for project members"
  on public.bid_line_items for insert
  with check (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_member(b.project_id)
    )
  );

create policy "bid_line_items: update for project members"
  on public.bid_line_items for update
  using (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_member(b.project_id)
    )
  );

create policy "bid_line_items: delete for project members"
  on public.bid_line_items for delete
  using (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_member(b.project_id)
    )
  );

-- ─── bid_documents ───────────────────────────────────────────────────────────
create table public.bid_documents (
  id           uuid primary key default gen_random_uuid(),
  bid_id       uuid not null references public.bids(id) on delete cascade,
  filename     text not null,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

alter table public.bid_documents enable row level security;

create policy "bid_documents: select for project members"
  on public.bid_documents for select
  using (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_member(b.project_id)
    )
  );

create policy "bid_documents: insert for project members"
  on public.bid_documents for insert
  with check (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_member(b.project_id)
    )
  );

create policy "bid_documents: delete for project members"
  on public.bid_documents for delete
  using (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_member(b.project_id)
    )
  );
