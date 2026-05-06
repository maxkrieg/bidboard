-- project_photos table
CREATE TABLE project_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members_view_photos" ON project_photos
  FOR SELECT USING (is_project_member(project_id));

CREATE POLICY "project_owner_insert_photos" ON project_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())
  );

CREATE POLICY "project_owner_update_photos" ON project_photos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())
  );

CREATE POLICY "project_owner_delete_photos" ON project_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())
  );

-- Banner photo on projects (nullable, cleared automatically when photo is deleted)
ALTER TABLE projects
  ADD COLUMN banner_photo_id uuid REFERENCES project_photos(id) ON DELETE SET NULL;

-- Public storage bucket for project photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-photos',
  'project-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Only project owners can upload
CREATE POLICY "project_photos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'project-photos'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE id = (storage.foldername(name))[1]::uuid
        AND owner_id = auth.uid()
    )
  );

-- Only project owners can delete
CREATE POLICY "project_photos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'project-photos'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE id = (storage.foldername(name))[1]::uuid
        AND owner_id = auth.uid()
    )
  );
