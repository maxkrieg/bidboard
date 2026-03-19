create table bid_analyses (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  summary     text not null,
  analysis    jsonb not null,   -- stores BidAnalysisBid[] array
  created_at  timestamptz default now()
);

-- One analysis per project — upsert on conflict
create unique index bid_analyses_project_id_idx on bid_analyses(project_id);

alter table bid_analyses enable row level security;

-- Project members can read
create policy "project members can read analyses"
  on bid_analyses for select
  using (is_project_member(project_id));

-- Project members can insert
create policy "project members can insert analyses"
  on bid_analyses for insert
  with check (is_project_member(project_id));

-- Project members can update
create policy "project members can update analyses"
  on bid_analyses for update
  using (is_project_member(project_id));
