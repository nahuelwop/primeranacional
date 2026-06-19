-- Career mode, achievements, and match history

CREATE TABLE public.career_saves (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id text NOT NULL,
  season int NOT NULL DEFAULT 1,
  budget int NOT NULL DEFAULT 1000,
  fixture_index int NOT NULL DEFAULT 0,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_saves TO authenticated;
GRANT ALL ON public.career_saves TO service_role;
ALTER TABLE public.career_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career own select" ON public.career_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "career own insert" ON public.career_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "career own update" ON public.career_saves FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "career own delete" ON public.career_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER career_saves_touch BEFORE UPDATE ON public.career_saves FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ach own select" ON public.achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ach own insert" ON public.achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ach own delete" ON public.achievements FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.match_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  home_team_id text NOT NULL,
  away_team_id text NOT NULL,
  home_goals int NOT NULL,
  away_goals int NOT NULL,
  mode text NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.match_history TO authenticated;
GRANT SELECT ON public.match_history TO anon;
GRANT ALL ON public.match_history TO service_role;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history public read" ON public.match_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "history own insert" ON public.match_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "history own delete" ON public.match_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX match_history_user_idx ON public.match_history (user_id, played_at DESC);
CREATE INDEX match_history_teams_idx ON public.match_history (home_team_id, away_team_id);