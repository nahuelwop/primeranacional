ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS whistle_audio_url text;
