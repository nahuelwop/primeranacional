-- =========================================================
-- PRIMERA NACIONAL
-- SCHEMA REPAIR
-- No borra datos ni recrea tablas existentes
-- =========================================================


-- =========================================================
-- 1. TEAMS - campos que faltan
-- =========================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS flag_urls text[] NOT NULL DEFAULT '{}';


-- =========================================================
-- 2. GAME SETTINGS - silbato
-- =========================================================

ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS whistle_audio_url text;


-- =========================================================
-- 3. SPONSORS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slogan text NOT NULL DEFAULT '',
  logo_url text,
  color text NOT NULL DEFAULT '#22c55e',
  prestige numeric NOT NULL DEFAULT 3,
  initial_payment bigint NOT NULL DEFAULT 10000000,
  weekly_payment bigint NOT NULL DEFAULT 400000,
  bonus_payment bigint NOT NULL DEFAULT 2500000,
  duration_seasons int NOT NULL DEFAULT 1,
  objectives text[] NOT NULL DEFAULT '{}',
  conditions text NOT NULL DEFAULT '',
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sponsors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsors readable"
ON public.sponsors;

CREATE POLICY "sponsors readable"
ON public.sponsors
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "admins insert sponsors"
ON public.sponsors;

CREATE POLICY "admins insert sponsors"
ON public.sponsors
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "admins update sponsors"
ON public.sponsors;

CREATE POLICY "admins update sponsors"
ON public.sponsors
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "admins delete sponsors"
ON public.sponsors;

CREATE POLICY "admins delete sponsors"
ON public.sponsors
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);


-- =========================================================
-- 4. TRIGGER DE SPONSORS
-- =========================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_sponsors_updated_at
ON public.sponsors;

CREATE TRIGGER update_sponsors_updated_at
BEFORE UPDATE ON public.sponsors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =========================================================
-- 5. SPONSORS INICIALES
-- Solo se insertan si no existen por nombre
-- =========================================================

INSERT INTO public.sponsors (
  name,
  slogan,
  color,
  prestige,
  initial_payment,
  weekly_payment,
  bonus_payment,
  duration_seasons,
  objectives,
  conditions,
  featured,
  sort_order
)
SELECT
  'Fútbol Total',
  'Pasión que une',
  '#22c55e',
  4,
  12000000,
  500000,
  3000000,
  1,
  ARRAY[
    'Clasificar al Reducido',
    'Mantener la valla invicta',
    'Ganar 5 partidos'
  ],
  'Requiere: Estadio en buen estado',
  true,
  0
WHERE NOT EXISTS (
  SELECT 1
  FROM public.sponsors
  WHERE name = 'Fútbol Total'
);

INSERT INTO public.sponsors (
  name,
  slogan,
  color,
  prestige,
  initial_payment,
  weekly_payment,
  bonus_payment,
  duration_seasons,
  objectives,
  conditions,
  featured,
  sort_order
)
SELECT
  'Andes Energía',
  'Energía que mueve',
  '#3b82f6',
  3,
  10000000,
  420000,
  2500000,
  1,
  ARRAY[
    'Clasificar al Reducido',
    'Mantener la valla invicta',
    'Ganar 4 partidos'
  ],
  'Requiere: Cancha en buen estado',
  false,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM public.sponsors
  WHERE name = 'Andes Energía'
);

INSERT INTO public.sponsors (
  name,
  slogan,
  color,
  prestige,
  initial_payment,
  weekly_payment,
  bonus_payment,
  duration_seasons,
  objectives,
  conditions,
  featured,
  sort_order
)
SELECT
  'Nova Tech',
  'Tecnología para el futuro',
  '#8b5cf6',
  4,
  11000000,
  450000,
  2800000,
  1,
  ARRAY[
    'Clasificar al Reducido',
    'Ganar 5 partidos',
    'Anotar 10 goles'
  ],
  'Requiere: Equipo en buena forma',
  false,
  2
WHERE NOT EXISTS (
  SELECT 1
  FROM public.sponsors
  WHERE name = 'Nova Tech'
);

INSERT INTO public.sponsors (
  name,
  slogan,
  color,
  prestige,
  initial_payment,
  weekly_payment,
  bonus_payment,
  duration_seasons,
  objectives,
  conditions,
  featured,
  sort_order
)
SELECT
  'Agrodelta',
  'Crecemos juntos',
  '#16a34a',
  3,
  9500000,
  400000,
  2400000,
  1,
  ARRAY[
    'Clasificar al Reducido',
    'Ganar 4 partidos',
    'Mantener el arco en cero'
  ],
  'Requiere: Cancha en buen estado',
  false,
  3
WHERE NOT EXISTS (
  SELECT 1
  FROM public.sponsors
  WHERE name = 'Agrodelta'
);

INSERT INTO public.sponsors (
  name,
  slogan,
  color,
  prestige,
  initial_payment,
  weekly_payment,
  bonus_payment,
  duration_seasons,
  objectives,
  conditions,
  featured,
  sort_order
)
SELECT
  'La Central',
  'Siempre con el deporte',
  '#ef4444',
  3.5,
  10500000,
  430000,
  2600000,
  1,
  ARRAY[
    'Clasificar al Reducido',
    'Ganar 5 partidos',
    'Anotar 12 goles'
  ],
  'Requiere: Estadio habilitado',
  false,
  4
WHERE NOT EXISTS (
  SELECT 1
  FROM public.sponsors
  WHERE name = 'La Central'
);

INSERT INTO public.sponsors (
  name,
  slogan,
  color,
  prestige,
  initial_payment,
  weekly_payment,
  bonus_payment,
  duration_seasons,
  objectives,
  conditions,
  featured,
  sort_order
)
SELECT
  'Sur Motors',
  'Movemos tu pasión',
  '#0ea5e9',
  3,
  10000000,
  420000,
  2500000,
  1,
  ARRAY[
    'Clasificar al Reducido',
    'Ganar 4 partidos',
    'Mantener la valla invicta'
  ],
  'Requiere: Plantel competitivo',
  false,
  5
WHERE NOT EXISTS (
  SELECT 1
  FROM public.sponsors
  WHERE name = 'Sur Motors'
);


-- =========================================================
-- 6. BUCKET TEAM-AUDIOS
-- =========================================================

INSERT INTO storage.buckets (
  id,
  name,
  public
)
VALUES (
  'team-audios',
  'team-audios',
  true
)
ON CONFLICT (id)
DO UPDATE SET public = true;


-- =========================================================
-- 7. STORAGE - TEAM AUDIOS
-- =========================================================

DROP POLICY IF EXISTS "team-audios public read"
ON storage.objects;

CREATE POLICY "team-audios public read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'team-audios'
);

DROP POLICY IF EXISTS "team-audios admin write"
ON storage.objects;

CREATE POLICY "team-audios admin write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-audios'
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "team-audios admin update"
ON storage.objects;

CREATE POLICY "team-audios admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-audios'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'team-audios'
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "team-audios admin delete"
ON storage.objects;

CREATE POLICY "team-audios admin delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-audios'
  AND public.has_role(auth.uid(), 'admin')
);


-- =========================================================
-- 8. CORREGIR MATCH HISTORY
-- El historial NO debe ser público
-- Cada usuario solamente ve su propio historial
-- =========================================================

DROP POLICY IF EXISTS "history public read"
ON public.match_history;

CREATE POLICY "history own read"
ON public.match_history
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


-- =========================================================
-- 9. CORREGIR PROFILES
-- Los usuarios autenticados pueden consultar perfiles,
-- pero no usuarios anónimos.
-- =========================================================

DROP POLICY IF EXISTS "profiles readable"
ON public.profiles;

CREATE POLICY "profiles readable"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);


-- =========================================================
-- 10. CORREGIR ROLES
-- Solo el propio usuario o un admin puede leer roles
-- =========================================================

DROP POLICY IF EXISTS "roles self read"
ON public.user_roles;

CREATE POLICY "roles self read"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);


-- =========================================================
-- 11. TOURNAMENT PROGRESS
-- Solo usuarios autenticados
-- =========================================================

DROP POLICY IF EXISTS "own progress select"
ON public.tournament_progress;

CREATE POLICY "own progress select"
ON public.tournament_progress
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "own progress insert"
ON public.tournament_progress;

CREATE POLICY "own progress insert"
ON public.tournament_progress
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "own progress update"
ON public.tournament_progress;

CREATE POLICY "own progress update"
ON public.tournament_progress
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);


-- =========================================================
-- 12. VERIFICACIÓN FINAL
-- =========================================================

SELECT
  'repair_completed' AS status,
  now() AS executed_at;
