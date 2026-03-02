INSERT INTO storage.buckets (id, name, public)
VALUES ('post-thumbnails', 'post-thumbnails', true);

CREATE POLICY "Public read post-thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-thumbnails');

CREATE POLICY "Service role upload post-thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-thumbnails');

CREATE POLICY "Service role delete post-thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-thumbnails');