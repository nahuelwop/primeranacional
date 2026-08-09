ALTER TABLE public.global_narrators
  ADD COLUMN IF NOT EXISTS penal_goal_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS penal_save_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS penal_decisive_urls text[] NOT NULL DEFAULT '{}'::text[];