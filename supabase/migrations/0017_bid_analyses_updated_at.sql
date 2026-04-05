ALTER TABLE bid_analyses ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
