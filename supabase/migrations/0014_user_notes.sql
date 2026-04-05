CREATE TABLE user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bid_id uuid REFERENCES bids(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One project-level note per user per project
CREATE UNIQUE INDEX user_notes_project_idx
  ON user_notes(user_id, project_id) WHERE bid_id IS NULL;

-- One bid-level note per user per bid
CREATE UNIQUE INDEX user_notes_bid_idx
  ON user_notes(user_id, bid_id) WHERE bid_id IS NOT NULL;

ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notes: select own"
  ON user_notes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_notes: insert own"
  ON user_notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_notes: update own"
  ON user_notes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "user_notes: delete own"
  ON user_notes FOR DELETE
  USING (user_id = auth.uid());
