-- Música de fondo del Modo Carrera: catálogo administrado por el admin
-- (nombre, artista, portada, audio) + preferencias de cada usuario
-- (activar/desactivar música en general, y silenciar canciones puntuales).

CREATE TABLE public.career_music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL DEFAULT '',
  audio_url text NOT NULL,
  cover_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.career_music_tracks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.career_music_tracks TO authenticated;
GRANT ALL ON public.career_music_tracks TO service_role;

ALTER TABLE public.career_music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "music tracks readable" ON public.career_music_tracks FOR SELECT USING (true);
CREATE POLICY "admins insert music tracks" ON public.career_music_tracks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update music tracks" ON public.career_music_tracks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete music tracks" ON public.career_music_tracks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Los buckets "team-audios" (audio) y "team-logos" (portada) ya tienen políticas
-- de admin de migraciones anteriores; guardamos los archivos en las carpetas
-- "career-music/{id}" (audio) y "career-music-covers/{id}" (portada).

-- Preferencias de música por usuario: fila 1 a 1 con el usuario logueado.
CREATE TABLE public.user_music_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  music_enabled boolean NOT NULL DEFAULT true,
  disabled_track_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_music_prefs TO authenticated;
GRANT ALL ON public.user_music_prefs TO service_role;

ALTER TABLE public.user_music_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own music prefs" ON public.user_music_prefs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own music prefs" ON public.user_music_prefs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own music prefs" ON public.user_music_prefs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
