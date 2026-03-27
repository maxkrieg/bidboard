-- 0012_link_pending_invites_on_signup.sql
-- When a new user signs up with an email that already has pending invite(s),
-- automatically link their user_id and mark those invites as accepted.
-- This handles the case where an invitee registers directly rather than
-- clicking the invite link.

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

  -- Link any pending invites whose invited_email matches the new user's email
  update public.project_collaborators
  set user_id = new.id,
      status  = 'accepted'
  where lower(invited_email) = lower(new.email)
    and user_id is null
    and status = 'pending';

  return new;
end;
$$;
