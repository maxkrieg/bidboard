CREATE TABLE bid_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bid_id, user_id)
);

ALTER TABLE bid_ratings ENABLE ROW LEVEL SECURITY;

-- Project members can read ratings on project bids
CREATE POLICY "project members can read bid ratings"
  ON bid_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bids b
      WHERE b.id = bid_id AND is_project_member(b.project_id)
    )
  );

-- Users can insert their own rating
CREATE POLICY "users can insert own rating"
  ON bid_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own rating
CREATE POLICY "users can update own rating"
  ON bid_ratings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
