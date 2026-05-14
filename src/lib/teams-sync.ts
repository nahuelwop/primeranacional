import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TEAMS, TEAMS_BY_ID, ZONE_A, ZONE_B, type Team } from "@/data/teams";

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

function applyDbRow(row: DbTeam) {
  const existing = TEAMS_BY_ID[row.id];
  const team: Team = {
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
  // Replace TEAMS contents fully from DB.
  TEAMS.length = 0;
  ZONE_A.length = 0;
  ZONE_B.length = 0;
  for (const k of Object.keys(TEAMS_BY_ID)) delete TEAMS_BY_ID[k];
  for (const row of data as DbTeam[]) applyDbRow(row);
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
