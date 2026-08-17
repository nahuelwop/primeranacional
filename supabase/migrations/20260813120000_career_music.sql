-- =========================================================
-- MODO CARRERA - MÚSICA
-- Safe migration: no borra datos existentes
-- =========================================================


-- =========================================================
-- 1. CAREER MUSIC TRACKS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.career_music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL DEFAULT '',
  audio_url text NOT NULL,
  cover_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT
ON public.career_music_tracks
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE
ON public.career_music_tracks
TO authenticated;

GRANT ALL
ON public.career_music_tracks
TO service_role;

ALTER TABLE public.career_music_tracks
ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- POLICIES - MUSIC TRACKS
-- =========================================================

DROP POLICY IF EXISTS "music tracks readable"
ON public.career_music_tracks;

CREATE POLICY "music tracks readable"
ON public.career_music_tracks
FOR SELECT
TO anon, authenticated
USING (true);


DROP POLICY IF EXISTS "admins insert music tracks"
ON public.career_music_tracks;

CREATE POLICY "admins insert music tracks"
ON public.career_music_tracks
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);


DROP POLICY IF EXISTS "admins update music tracks"
ON public.career_music_tracks;

CREATE POLICY "admins update music tracks"
ON public.career_music_tracks
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);


DROP POLICY IF EXISTS "admins delete music tracks"
ON public.career_music_tracks;

CREATE POLICY "admins delete music tracks"
ON public.career_music_tracks
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);


-- =========================================================
-- 2. USER MUSIC PREFERENCES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_music_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  music_enabled boolean NOT NULL DEFAULT true,
  disabled_track_ids uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE
ON public.user_music_prefs
TO authenticated;

GRANT ALL
ON public.user_music_prefs
TO service_role;

ALTER TABLE public.user_music_prefs
ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- POLICIES - USER MUSIC PREFERENCES
-- =========================================================

DROP POLICY IF EXISTS "users read own music prefs"
ON public.user_music_prefs;

CREATE POLICY "users read own music prefs"
ON public.user_music_prefs
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS "users insert own music prefs"
ON public.user_music_prefs;

CREATE POLICY "users insert own music prefs"
ON public.user_music_prefs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS "users update own music prefs"
ON public.user_music_prefs;

CREATE POLICY "users update own music prefs"
ON public.user_music_prefs
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);


-- =========================================================
-- 3. TRIGGER USER MUSIC PREFS
-- =========================================================

DROP TRIGGER IF EXISTS user_music_prefs_touch
ON public.user_music_prefs;

CREATE TRIGGER user_music_prefs_touch
BEFORE UPDATE
ON public.user_music_prefs
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();
