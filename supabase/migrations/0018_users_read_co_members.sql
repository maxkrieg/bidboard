-- Allow project members to read each other's profiles.
-- Previously users could only read their own row, which caused author joins
-- (messages, comments) to return null when a collaborator viewed them.
CREATE POLICY "project members can read co-member profiles"
  ON users FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.owner_id = users.id
        AND is_project_member(p.id)
    )
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc
      WHERE pc.user_id = users.id
        AND pc.status = 'accepted'
        AND is_project_member(pc.project_id)
    )
  );
