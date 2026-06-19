import { supabase } from "@/integrations/supabase/client";
import type { CareerState } from "@/lib/career";

export type CareerSaveRow = {
  user_id: string;
  team_id: string;
  season: number;
  budget: number;
  fixture_index: number;
  state: CareerState;
};

export async function fetchCareer(userId: string): Promise<CareerSaveRow | null> {
  const { data, error } = await supabase
    .from("career_saves")
    .select("user_id, team_id, season, budget, fixture_index, state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as CareerSaveRow | null) ?? null;
}

export async function upsertCareer(row: CareerSaveRow): Promise<void> {
  const { error } = await supabase.from("career_saves").upsert({
    user_id: row.user_id,
    team_id: row.team_id,
    season: row.season,
    budget: row.budget,
    fixture_index: row.fixture_index,
    state: row.state as unknown as never,
  });
  if (error) throw error;
}

export async function deleteCareer(userId: string): Promise<void> {
  const { error } = await supabase.from("career_saves").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function fetchAchievements(userId: string): Promise<{ key: string; unlocked_at: string }[]> {
  const { data, error } = await supabase
    .from("achievements")
    .select("key, unlocked_at")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function unlockAchievement(userId: string, key: string): Promise<boolean> {
  const { error } = await supabase
    .from("achievements")
    .insert({ user_id: userId, key })
    .select()
    .single();
  if (error) {
    // duplicate (already unlocked) — ignore
    if (error.code === "23505") return false;
    throw error;
  }
  return true;
}

export async function recordMatchHistory(p: {
  userId: string; home: string; away: string; hg: number; ag: number; mode: string;
}): Promise<void> {
  const { error } = await supabase.from("match_history").insert({
    user_id: p.userId,
    home_team_id: p.home,
    away_team_id: p.away,
    home_goals: p.hg,
    away_goals: p.ag,
    mode: p.mode,
  });
  if (error) throw error;
}

export type HistoryRow = {
  home_team_id: string;
  away_team_id: string;
  home_goals: number;
  away_goals: number;
  mode: string;
  played_at: string;
};

export async function fetchAllHistory(limit = 2000): Promise<HistoryRow[]> {
  const { data, error } = await supabase
    .from("match_history")
    .select("home_team_id, away_team_id, home_goals, away_goals, mode, played_at")
    .order("played_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
