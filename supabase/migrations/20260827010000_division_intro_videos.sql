ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS intro_videos jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.game_settings
SET intro_videos = CASE
  WHEN intro_video_url IS NULL OR intro_video_url = '' THEN '{}'::jsonb
  ELSE jsonb_build_object('primera_nacional', intro_video_url)
END
WHERE id = 'global'
  AND (intro_videos IS NULL OR intro_videos = '{}'::jsonb);
