
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS goal_audio_urls text[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  CREATE POLICY "team-audios public read" ON storage.objects FOR SELECT USING (bucket_id = 'team-audios');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "team-audios admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-audios' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "team-audios admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'team-audios' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "team-audios admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team-audios' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
