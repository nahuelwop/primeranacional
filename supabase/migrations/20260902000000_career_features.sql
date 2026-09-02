-- Primera Heads: persistencia de intros por competencia + funciones sociales de Carrera.
ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS intro_videos jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.game_settings
SET intro_videos = CASE
  WHEN intro_video_url IS NULL OR intro_video_url = '' THEN '{}'::jsonb
  ELSE jsonb_build_object('primera_nacional', intro_video_url)
END
WHERE id = 'global'
  AND (intro_videos IS NULL OR intro_videos = '{}'::jsonb);

-- Ranking global de Modo Carrera.
create table if not exists public.career_leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Jugador',
  team_id text not null default '',
  score integer not null default 0,
  level integer not null default 1,
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.career_leaderboard to authenticated;
alter table public.career_leaderboard enable row level security;

drop policy if exists "leaderboard public read" on public.career_leaderboard;
create policy "leaderboard public read" on public.career_leaderboard for select using (true);

drop policy if exists "leaderboard own insert" on public.career_leaderboard;
create policy "leaderboard own insert" on public.career_leaderboard for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "leaderboard own update" on public.career_leaderboard;
create policy "leaderboard own update" on public.career_leaderboard for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists career_leaderboard_touch on public.career_leaderboard;
create trigger career_leaderboard_touch before update on public.career_leaderboard for each row execute function public.touch_updated_at();
