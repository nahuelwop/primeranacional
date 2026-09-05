ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS division_logos jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ui_sfx jsonb NOT NULL DEFAULT '{}'::jsonb;
