-- =========================================================
-- TEAM PLAYERS + TEAM STADIUMS
-- Safe / idempotent migration
-- =========================================================


-- =========================================================
-- 1. TEAM PLAYERS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.team_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  position text NOT NULL CHECK (
    position IN ('arquero', 'defensa', 'medio', 'delantero')
  ),
  shirt_number integer,
  birth_date date,
  height_cm integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- =========================================================
-- 2. PERMISSIONS - TEAM PLAYERS
-- =========================================================

GRANT SELECT
ON public.team_players
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.team_players
TO authenticated;

GRANT ALL
ON public.team_players
TO service_role;


-- =========================================================
-- 3. RLS - TEAM PLAYERS
-- =========================================================

ALTER TABLE public.team_players
ENABLE ROW LEVEL SECURITY;


-- Public read
DROP POLICY IF EXISTS "players readable"
ON public.team_players;

CREATE POLICY "players readable"
ON public.team_players
FOR SELECT
USING (true);


-- Admin insert
DROP POLICY IF EXISTS "admins insert players"
ON public.team_players;

CREATE POLICY "admins insert players"
ON public.team_players
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);


-- Admin update
DROP POLICY IF EXISTS "admins update players"
ON public.team_players;

CREATE POLICY "admins update players"
ON public.team_players
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);


-- Admin delete
DROP POLICY IF EXISTS "admins delete players"
ON public.team_players;

CREATE POLICY "admins delete players"
ON public.team_players
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);


-- =========================================================
-- 4. INDEX - TEAM PLAYERS
-- =========================================================

CREATE INDEX IF NOT EXISTS team_players_team_idx
ON public.team_players(team_id, sort_order);


-- =========================================================
-- 5. UPDATED_AT TRIGGER - TEAM PLAYERS
-- =========================================================

DROP TRIGGER IF EXISTS team_players_touch
ON public.team_players;

CREATE TRIGGER team_players_touch
BEFORE UPDATE ON public.team_players
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();


-- =========================================================
-- 6. TEAM STADIUMS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.team_stadiums (
  team_id text NOT NULL PRIMARY KEY
    REFERENCES public.teams(id)
    ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  capacity integer,
  founded integer,
  city text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- =========================================================
-- 7. PERMISSIONS - TEAM STADIUMS
-- =========================================================

GRANT SELECT
ON public.team_stadiums
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.team_stadiums
TO authenticated;

GRANT ALL
ON public.team_stadiums
TO service_role;


-- =========================================================
-- 8. RLS - TEAM STADIUMS
-- =========================================================

ALTER TABLE public.team_stadiums
ENABLE ROW LEVEL SECURITY;


-- Public read
DROP POLICY IF EXISTS "stadiums readable"
ON public.team_stadiums;

CREATE POLICY "stadiums readable"
ON public.team_stadiums
FOR SELECT
USING (true);


-- Admin insert
DROP POLICY IF EXISTS "admins insert stadiums"
ON public.team_stadiums;

CREATE POLICY "admins insert stadiums"
ON public.team_stadiums
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);


-- Admin update
DROP POLICY IF EXISTS "admins update stadiums"
ON public.team_stadiums;

CREATE POLICY "admins update stadiums"
ON public.team_stadiums
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);


-- Admin delete
DROP POLICY IF EXISTS "admins delete stadiums"
ON public.team_stadiums;

CREATE POLICY "admins delete stadiums"
ON public.team_stadiums
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);


-- =========================================================
-- 9. UPDATED_AT TRIGGER - TEAM STADIUMS
-- =========================================================

DROP TRIGGER IF EXISTS team_stadiums_touch
ON public.team_stadiums;

CREATE TRIGGER team_stadiums_touch
BEFORE UPDATE ON public.team_stadiums
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();
