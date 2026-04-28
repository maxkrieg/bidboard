-- 0020_approve_existing_users.sql
-- One-time migration: approve all users who existed before access control was introduced.
-- Without this, every existing account would be stuck in 'pending' after 0019 runs.

update public.users
  set status = 'approved',
      notification_sent = true;
