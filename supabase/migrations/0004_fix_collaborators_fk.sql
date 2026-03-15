-- 0004_fix_collaborators_fk.sql
-- project_collaborators.user_id referenced auth.users, which PostgREST cannot
-- traverse for nested selects. Re-point the FK to public.users so the
-- users(...) join works via the Supabase client.

alter table public.project_collaborators
  drop constraint if exists project_collaborators_user_id_fkey;

alter table public.project_collaborators
  add constraint project_collaborators_user_id_fkey
  foreign key (user_id)
  references public.users (id)
  on delete set null;
