-- Game settings
-- Safe to run when the table, policies and trigger already exist.


-- =========================================================
-- TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.game_settings (
  id text PRIMARY KEY DEFAULT 'global',
  intro_video_url text,
  coimas_enabled boolean NOT NULL DEFAULT false,
  coimas_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  anular_goles_ratio integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- =========================================================
-- PERMISSIONS
-- =========================================================

GRANT SELECT
ON public.game_settings
TO anon, authenticated;

GRANT ALL
ON public.game_settings
TO service_role;

GRANT INSERT, UPDATE
ON public.game_settings
TO authenticated;


-- =========================================================
-- RLS
-- =========================================================

ALTER TABLE public.game_settings
ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- POLICIES
-- =========================================================

DROP POLICY IF EXISTS "Public read game settings"
ON public.game_settings;

CREATE POLICY "Public read game settings"
ON public.game_settings
FOR SELECT
TO anon, authenticated
USING (true);


DROP POLICY IF EXISTS "Admins insert game settings"
ON public.game_settings;

CREATE POLICY "Admins insert game settings"
ON public.game_settings
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);


DROP POLICY IF EXISTS "Admins update game settings"
ON public.game_settings;

CREATE POLICY "Admins update game settings"
ON public.game_settings
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);


-- =========================================================
-- TRIGGER
-- =========================================================

DROP TRIGGER IF EXISTS game_settings_updated_at
ON public.game_settings;

CREATE TRIGGER game_settings_updated_at
BEFORE UPDATE
ON public.game_settings
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();


-- =========================================================
-- DEFAULT ROW
-- =========================================================

INSERT INTO public.game_settings (id)
VALUES ('global')
ON CONFLICT (id) DO NOTHING;
