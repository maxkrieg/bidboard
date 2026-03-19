create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete cascade,
  type          text not null,
  reference_id  uuid,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications: read own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications: update own"
  on public.notifications for update
  using (user_id = auth.uid());
-- Insert is service-role only (no auth-user insert policy)
