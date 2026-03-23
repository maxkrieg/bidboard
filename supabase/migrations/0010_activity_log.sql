CREATE TYPE activity_event_type AS ENUM (
  'bid_created',
  'bid_updated',
  'bid_status_changed',
  'bid_deleted',
  'document_uploaded',
  'collaborator_joined',
  'analysis_completed',
  'comment_added',
  'message_sent'
);

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type activity_event_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members can read activity"
  ON activity_log FOR SELECT
  USING (is_project_member(project_id));

ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
