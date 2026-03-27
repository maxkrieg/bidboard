CREATE TABLE project_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  summary text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX project_summaries_project_id_idx ON project_summaries(project_id);

ALTER TABLE project_summaries ENABLE ROW LEVEL SECURITY;

-- Project members can read
CREATE POLICY "project members can read project summaries"
  ON project_summaries FOR SELECT
  USING (is_project_member(project_id));

-- Only service_role writes (admin client used in API route)

-- Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE project_summaries;
