import { supabase } from "@/integrations/supabase/client";

export type Position = "arquero" | "defensa" | "medio" | "delantero";

export interface Player {
  id: string;
  team_id: string;
  name: string;
  position: Position;
  shirt_number: number | null;
  birth_date: string | null;
  height_cm: number | null;
  sort_order: number;
}

export interface Stadium {
  team_id: string;
  name: string;
  capacity: number | null;
  founded: number | null;
  city: string;
  address: string;
}

export const POSITION_LABEL: Record<Position, string> = {
  arquero: "Arqueros",
  defensa: "Defensores",
  medio: "Mediocampistas",
  delantero: "Delanteros",
};

export async function fetchPlayers(teamId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from("team_players")
    .select("id,team_id,name,position,shirt_number,birth_date,height_cm,sort_order")
    .eq("team_id", teamId)
    .order("position")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Player[];
}

export async function fetchStadium(teamId: string): Promise<Stadium | null> {
  const { data, error } = await supabase
    .from("team_stadiums")
    .select("team_id,name,capacity,founded,city,address")
    .eq("team_id", teamId)
    .maybeSingle();
  if (error) throw error;
  return (data as Stadium) ?? null;
}

export async function upsertStadium(s: Stadium) {
  const { error } = await supabase.from("team_stadiums").upsert(s, { onConflict: "team_id" });
  if (error) throw error;
}

export async function insertPlayer(p: Omit<Player, "id">) {
  const { error } = await supabase.from("team_players").insert(p);
  if (error) throw error;
}

export async function insertPlayers(rows: Omit<Player, "id">[]) {
  if (!rows.length) return;
  const { error } = await supabase.from("team_players").insert(rows);
  if (error) throw error;
}

export async function updatePlayer(id: string, patch: Partial<Player>) {
  const { error } = await supabase.from("team_players").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePlayer(id: string) {
  const { error } = await supabase.from("team_players").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Parse a free-text squad pasted from a roster page.
 * Detects section headers: "Arqueros", "Defensores", "Mediocampistas", "Delanteros"
 * (also tolerates short forms like "Arq", "Def", "Med", "Del").
 * Any non-empty line after a header that contains at least 2 letters and looks
 * like a person's name is added as a player of the current position.
 */
export function parseSquad(text: string, teamId: string): Omit<Player, "id">[] {
  const lines = text.split(/\r?\n/);
  const out: Omit<Player, "id">[] = [];
  let pos: Position | null = null;
  let order: Record<Position, number> = { arquero: 0, defensa: 0, medio: 0, delantero: 0 };

  const headerMap: { rx: RegExp; pos: Position }[] = [
    { rx: /^\s*arq(?:ueros?)?\b/i, pos: "arquero" },
    { rx: /^\s*def(?:ensores?|ensas?)?\b/i, pos: "defensa" },
    { rx: /^\s*med(?:io(?:campistas?)?)?\b/i, pos: "medio" },
    { rx: /^\s*del(?:anteros?)?\b/i, pos: "delantero" },
  ];

  const skipRx = /^\s*(plantel|entrenador|jugadores|dt|director|asistente|edad|nacimiento|altura)\b/i;
  const isDate = /\d{1,2}\/\d{1,2}\/\d{2,4}/;
  const looksLikeName = /^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ'’\.\- ]{2,}$/;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const h = headerMap.find(h => h.rx.test(line));
    if (h) { pos = h.pos; continue; }
    if (!pos) continue;
    if (skipRx.test(line)) continue;
    if (/^\d+$/.test(line)) continue;          // shirt number alone
    if (isDate.test(line)) continue;            // date row
    if (/^\d+[\.,]\d+$/.test(line)) continue;   // height
    if (line.length < 3) continue;
    if (!looksLikeName.test(line)) continue;
    out.push({
      team_id: teamId,
      name: line,
      position: pos,
      shirt_number: null,
      birth_date: null,
      height_cm: null,
      sort_order: order[pos]++,
    });
  }
  return out;
}
