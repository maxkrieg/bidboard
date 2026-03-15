-- 0003_fix_rls_recursion.sql
-- The projects SELECT policy queries project_collaborators, whose SELECT policy
-- queries back to projects — causing infinite recursion. Fix: a security definer
-- function that checks project ownership without going through RLS, breaking the cycle.

create or replace function public.current_user_owns_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id
      and owner_id = auth.uid()
  );
$$;

-- Replace the project_collaborators SELECT policy to use the function instead of
-- an exists subquery on projects (which triggered projects RLS -> recursion).
drop policy if exists "project_collaborators: select for owner or self" on public.project_collaborators;

create policy "project_collaborators: select for owner or self"
  on public.project_collaborators for select
  using (
    user_id = auth.uid()
    or current_user_owns_project(project_id)
  );
