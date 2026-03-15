# spec-projects.md — Projects & Collaborators

## Overview
A project is the top-level container for everything in BidBoard. It holds bids, messages, analyses, and collaborators. A user can own multiple projects and be a collaborator on others.

---

## User Stories
- As a user, I can create a new project with a name, description, location, budget, and target date
- As a user, I can view all projects I own or collaborate on from my dashboard
- As a user, I can archive a project I own when it's complete or no longer active
- As a project owner, I can view and manage collaborators on my project
- As a collaborator, I can view the project and all its bids but cannot delete the project

---

## Pages

### `/dashboard`
- Displays a grid of project cards for all projects the logged-in user owns or collaborates on
- Each card shows: project name, location, bid count, active/archived status, last activity date
- "New Project" button in the top right
- Empty state for new users with a CTA: "Create your first project"
- Query: join `projects` with `project_collaborators` to fetch all relevant projects for the user

### `/projects/new`
- Single-column form
- Fields:
  - Project name (required, text)
  - Description (optional, textarea)
  - Location (required, text — used for contractor enrichment geo context)
  - Target budget (optional, numeric — display as currency input)
  - Target completion date (optional, date picker)
- Submit: "Create Project" → calls Server Action `createProject`
- On success: redirect to `/projects/[id]`

### `/projects/[id]`
- Three-tab layout: **Bids** (default), **Messages**, **Collaborators**
- Project name + location displayed in page header
- Owner sees an "Archive Project" option in a dropdown menu
- Tabs are rendered as client components to manage active tab state

---

## Server Actions — `actions/projects.ts`

### `createProject(data: CreateProjectInput)`
```ts
type CreateProjectInput = {
  name: string
  description?: string
  location: string
  target_budget?: number
  target_date?: string
}
```
1. Verify authenticated user
2. Validate input with Zod
3. Insert into `projects` with `owner_id = user.id`, `status = active`
4. Return `{ success: true, data: { id } }` for redirect

### `archiveProject(projectId: string)`
1. Verify authenticated user is the project owner
2. Update `projects` set `status = archived` where `id = projectId`
3. Return result

### `getProjectById(projectId: string)`
- Used in server components
- Fetches project + collaborators + bid count
- Verifies the requesting user is owner or collaborator — throw if not

---

## Collaborators Tab UI

- List of current collaborators showing: avatar/initials, name or email, status badge (Pending / Accepted)
- Owner is listed at the top with an "Owner" label
- "Invite Collaborator" input: email field + "Send Invite" button
- Invite button is disabled if collaborator count is already at 3
- Owner can remove a pending invite (delete the `project_collaborators` row)
- Owner cannot remove accepted collaborators in v1 (future feature)

---

## Database — Key Queries

### Fetch all projects for a user (dashboard)
```sql
select p.*, 
  (select count(*) from bids where project_id = p.id) as bid_count
from projects p
left join project_collaborators pc on pc.project_id = p.id
where p.owner_id = auth.uid()
   or pc.user_id = auth.uid()
order by p.created_at desc;
```

### Verify user has access to a project
```sql
select 1 from projects p
left join project_collaborators pc on pc.project_id = p.id
where p.id = $1
  and (p.owner_id = auth.uid() or pc.user_id = auth.uid())
limit 1;
```

---

## RLS Policies

```sql
-- projects: owners and collaborators can read
create policy "projects: read" on projects
  for select using (
    owner_id = auth.uid() or
    exists (
      select 1 from project_collaborators
      where project_id = id and user_id = auth.uid()
    )
  );

-- projects: only owner can insert
create policy "projects: insert" on projects
  for insert with check (owner_id = auth.uid());

-- projects: only owner can update
create policy "projects: update" on projects
  for update using (owner_id = auth.uid());

-- project_collaborators: owner can insert
create policy "collaborators: insert" on project_collaborators
  for insert with check (
    exists (
      select 1 from projects
      where id = project_id and owner_id = auth.uid()
    )
  );

-- project_collaborators: project members can read
create policy "collaborators: read" on project_collaborators
  for select using (
    exists (
      select 1 from projects
      where id = project_id and (
        owner_id = auth.uid() or
        exists (
          select 1 from project_collaborators pc2
          where pc2.project_id = project_id and pc2.user_id = auth.uid()
        )
      )
    )
  );
```

---

## Files to Create
| File | Purpose |
|---|---|
| `app/(app)/dashboard/page.tsx` | Project grid dashboard |
| `app/(app)/projects/new/page.tsx` | New project form |
| `app/(app)/projects/[id]/page.tsx` | Project view with tabs |
| `actions/projects.ts` | createProject, archiveProject, getProjectById |
| `components/projects/ProjectCard.tsx` | Dashboard project card |
| `components/projects/ProjectForm.tsx` | New project form fields |
| `components/projects/CollaboratorsTab.tsx` | Collaborators list + invite |
| `supabase/migrations/0002_projects.sql` | projects + project_collaborators tables + RLS |
