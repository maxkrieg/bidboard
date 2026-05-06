-- Storage bucket for bid document uploads (PDF + images)
-- Bucket was created manually in the Supabase dashboard; this migration captures it as code.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bid-documents',
  'bid-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can download bid documents" ON storage.objects;
CREATE POLICY "Authenticated users can download bid documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bid-documents'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can upload bid documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload bid documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bid-documents'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete bid documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete bid documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bid-documents'
  AND auth.role() = 'authenticated'
);
