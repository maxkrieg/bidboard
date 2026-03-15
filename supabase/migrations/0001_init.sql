-- 0001_init.sql
-- Creates the public users table mirroring auth.users,
-- RLS policies, and a trigger to populate it on signup.

create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.users enable row level security;

-- Users can read their own record
create policy "users: read own"
  on public.users
  for select
  using (auth.uid() = id);

-- Users can update their own record
create policy "users: update own"
  on public.users
  for update
  using (auth.uid() = id);

-- Trigger function: inserts a row into public.users on new auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
