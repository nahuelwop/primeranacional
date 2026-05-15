import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TEAMS, TEAMS_BY_ID, ZONE_A, ZONE_B, type Team } from "@/data/teams";

const CACHE_KEY = "primera-heads-teams-cache-v1";

type DbTeam = {
  id: string;
  name: string;
  short: string;
  city: string;
  zone: "A" | "B";
  primary_color: string;
  secondary_color: string;
  stripe: string;
  speed: number;
  jump: number;
  power: number;
  defense: number;
  logo_url: string | null;
  rivals: string[];
  sort_order: number;
};

type State = { version: number; loaded: boolean };
const useStore = create<State>(() => ({ version: 0, loaded: false }));

function rowToTeam(row: DbTeam): Team {
  return {
    id: row.id,
    name: row.name,
    short: row.short,
    city: row.city,
    zone: row.zone,
    primary: row.primary_color,
    secondary: row.secondary_color,
    stripe: (row.stripe as Team["stripe"]) ?? "solid",
    stats: { speed: row.speed, jump: row.jump, power: row.power, defense: row.defense },
    rivals: row.rivals ?? [],
    logoUrl: row.logo_url,
  };
}

function replaceTeams(teams: Team[]) {
  TEAMS.length = 0;
  ZONE_A.length = 0;
  ZONE_B.length = 0;
  for (const k of Object.keys(TEAMS_BY_ID)) delete TEAMS_BY_ID[k];
  for (const team of teams) {
    TEAMS.push(team);
    TEAMS_BY_ID[team.id] = team;
    if (team.zone === "A") ZONE_A.push(team); else ZONE_B.push(team);
  }
}

function saveCache() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(TEAMS));
}

function hydrateCache() {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const teams = JSON.parse(raw) as Team[];
    if (!Array.isArray(teams) || teams.length === 0) return false;
    replaceTeams(teams);
    useStore.setState(s => ({ version: s.version + 1, loaded: true }));
    return true;
  } catch {
    window.localStorage.removeItem(CACHE_KEY);
    return false;
  }
}

hydrateCache();

function applyDbRow(row: DbTeam) {
  const existing = TEAMS_BY_ID[row.id];
  const team = rowToTeam(row);
  if (existing) {
    Object.assign(existing, team);
  } else {
    TEAMS.push(team);
    TEAMS_BY_ID[team.id] = team;
    if (team.zone === "A") ZONE_A.push(team); else ZONE_B.push(team);
  }
}

function removeTeam(id: string) {
  const i = TEAMS.findIndex(t => t.id === id);
  if (i >= 0) TEAMS.splice(i, 1);
  delete TEAMS_BY_ID[id];
  const ai = ZONE_A.findIndex(t => t.id === id);
  if (ai >= 0) ZONE_A.splice(ai, 1);
  const bi = ZONE_B.findIndex(t => t.id === id);
  if (bi >= 0) ZONE_B.splice(bi, 1);
}

let booted = false;
async function loadAll() {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error || !data) return;
  replaceTeams((data as DbTeam[]).map(rowToTeam));
  saveCache();
  useStore.setState(s => ({ version: s.version + 1, loaded: true }));
}

function bootOnce() {
  if (booted) return;
  booted = true;
  loadAll();
  supabase
    .channel("teams-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, (payload) => {
      if (payload.eventType === "DELETE") removeTeam((payload.old as DbTeam).id);
      else applyDbRow(payload.new as DbTeam);
      saveCache();
      useStore.setState(s => ({ version: s.version + 1, loaded: true }));
    })
    .subscribe();
}

export function useTeamsSync() {
  const version = useStore(s => s.version);
  useEffect(() => { bootOnce(); }, []);
  return version;
}

export function bumpTeamsVersion() {
  useStore.setState(s => ({ version: s.version + 1, loaded: true }));
}

export async function reloadTeams() { await loadAll(); }
