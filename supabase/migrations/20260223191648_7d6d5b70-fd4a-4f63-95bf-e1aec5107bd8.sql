
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Service insert avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');
