-- Remove the approval gate: new signups are immediately approved.
-- The handle_new_user trigger previously set status = 'pending'.
-- notification_sent stays false so the auth callback can send one
-- informational "new user signed up" email to the admin.

alter table public.users
  alter column status set default 'approved';

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
    'approved',
    false
  );

  update public.project_collaborators
  set user_id = new.id,
      status  = 'accepted'
  where lower(invited_email) = lower(new.email)
    and user_id is null
    and status = 'pending';

  return new;
end;
$$;
