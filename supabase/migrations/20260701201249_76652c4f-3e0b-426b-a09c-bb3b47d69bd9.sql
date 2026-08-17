-- =========================================================
-- CAREER MODE + ACHIEVEMENTS + MATCH HISTORY
-- Safe / idempotent migration
-- =========================================================


-- =========================================================
-- 1. CAREER SAVES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.career_saves (
  user_id uuid PRIMARY KEY
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  team_id text NOT NULL,
  season int NOT NULL DEFAULT 1,
  budget int NOT NULL DEFAULT 1000,
  fixture_index int NOT NULL DEFAULT 0,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.career_saves
TO authenticated;

GRANT ALL
ON public.career_saves
TO service_role;

ALTER TABLE public.career_saves
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "career own select"
ON public.career_saves;

CREATE POLICY "career own select"
ON public.career_saves
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS "career own insert"
ON public.career_saves;

CREATE POLICY "career own insert"
ON public.career_saves
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS "career own update"
ON public.career_saves;

CREATE POLICY "career own update"
ON public.career_saves
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS "career own delete"
ON public.career_saves;

CREATE POLICY "career own delete"
ON public.career_saves
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);


-- =========================================================
-- 2. ACHIEVEMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE
ON public.achievements
TO authenticated;

GRANT ALL
ON public.achievements
TO service_role;

ALTER TABLE public.achievements
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "ach own select"
ON public.achievements;

CREATE POLICY "ach own select"
ON public.achievements
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS "ach own insert"
ON public.achievements;

CREATE POLICY "ach own insert"
ON public.achievements
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS "ach own delete"
ON public.achievements;

CREATE POLICY "ach own delete"
ON public.achievements
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);


-- =========================================================
-- 3. MATCH HISTORY
-- =========================================================

CREATE TABLE IF NOT EXISTS public.match_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  home_team_id text NOT NULL,
  away_team_id text NOT NULL,
  home_goals integer NOT NULL,
  away_goals integer NOT NULL,
  mode text NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE
ON public.match_history
TO authenticated;

GRANT ALL
ON public.match_history
TO service_role;

ALTER TABLE public.match_history
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "history own select"
ON public.match_history;

CREATE POLICY "history own select"
ON public.match_history
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS "history public read"
ON public.match_history;


DROP POLICY IF EXISTS "history own insert"
ON public.match_history;

CREATE POLICY "history own insert"
ON public.match_history
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS "history own delete"
ON public.match_history;

CREATE POLICY "history own delete"
ON public.match_history
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);
