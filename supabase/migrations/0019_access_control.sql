-- 0019_access_control.sql
-- Adds access control fields to public.users.
-- status: 'pending' (default) | 'approved' | 'rejected'
-- notification_sent: prevents duplicate admin emails on repeated sign-ins

alter table public.users
  add column status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'));

alter table public.users
  add column notification_sent boolean not null default false;

-- Update the handle_new_user trigger to set both new columns explicitly.
-- New signups start as 'pending'; admin server action updates to 'approved'/'rejected'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url, status, notification_sent)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'pending',
    false
  );

  -- Link any pending project invites whose invited_email matches the new user's email
  update public.project_collaborators
  set user_id = new.id,
      status  = 'accepted'
  where lower(invited_email) = lower(new.email)
    and user_id is null
    and status = 'pending';

  return new;
end;
$$;
