-- 0021_owner_only_bid_mutations.sql
-- Restrict bid INSERT/UPDATE/DELETE (and related tables) to project owners only.
-- Collaborators retain SELECT access but cannot create, modify, or delete bids.

-- ── Helper: is_project_owner ──────────────────────────────────────────────────

create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = auth.uid()
  );
$$;

-- ── bids: replace member-scoped mutation policies with owner-only ─────────────

drop policy if exists "bids: insert for project members" on public.bids;
drop policy if exists "bids: update for project members" on public.bids;
drop policy if exists "bids: delete for project members" on public.bids;

create policy "bids: insert for project owner"
  on public.bids for insert
  with check (is_project_owner(project_id));

create policy "bids: update for project owner"
  on public.bids for update
  using (is_project_owner(project_id));

create policy "bids: delete for project owner"
  on public.bids for delete
  using (is_project_owner(project_id));

-- ── bid_line_items: owner-only mutations ──────────────────────────────────────

drop policy if exists "bid_line_items: insert for project members" on public.bid_line_items;
drop policy if exists "bid_line_items: update for project members" on public.bid_line_items;
drop policy if exists "bid_line_items: delete for project members" on public.bid_line_items;

create policy "bid_line_items: insert for project owner"
  on public.bid_line_items for insert
  with check (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_owner(b.project_id)
    )
  );

create policy "bid_line_items: update for project owner"
  on public.bid_line_items for update
  using (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_owner(b.project_id)
    )
  );

create policy "bid_line_items: delete for project owner"
  on public.bid_line_items for delete
  using (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_owner(b.project_id)
    )
  );

-- ── bid_documents: owner-only mutations ───────────────────────────────────────

drop policy if exists "bid_documents: insert for project members" on public.bid_documents;
drop policy if exists "bid_documents: delete for project members" on public.bid_documents;

create policy "bid_documents: insert for project owner"
  on public.bid_documents for insert
  with check (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_owner(b.project_id)
    )
  );

create policy "bid_documents: delete for project owner"
  on public.bid_documents for delete
  using (
    exists (
      select 1 from public.bids b
      where b.id = bid_id and is_project_owner(b.project_id)
    )
  );
