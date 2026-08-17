import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TEAMS,
  TEAMS_BY_ID,
  ZONE_A,
  ZONE_B,
  type Team,
  type Narrator,
} from "@/data/teams";

export type DbTeam = {
  id: string;
  name?: string | null;
  short?: string | null;
  city?: string | null;
  zone?: "A" | "B" | null;
  division?: string | null;

  primary_color?: string | null;
  secondary_color?: string | null;
  stripe?: string | null;

  speed?: number | null;
  jump?: number | null;
  power?: number | null;
  defense?: number | null;

  logo_url?: string | null;
  flag_urls?: string[] | null;
  rivals?: string[] | null;

  sort_order?: number | null;

  goal_audio_urls?: string[] | null;
  hinchada_urls?: string[] | null;
  narrators?: Narrator[] | null;

  full_name?: string | null;
  founded_year?: number | null;
  province?: string | null;
  nickname?: string | null;
  rival_id?: string | null;
  primera_seasons?: number | null;
  achievements?: string | null;
  history?: string | null;
};

type State = {
  version: number;
  loaded: boolean;
};

const useStore = create<State>(() => ({
  version: 0,
  loaded: false,
}));

function cloneArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? [...value] : [];
}

function findOriginalTeam(id: string): Team | undefined {
  return TEAMS.find((team) => team.id === id);
}

function rowToTeam(row: DbTeam): Team {
  const original = findOriginalTeam(row.id);

  if (!original) {
    return {
      id: row.id,
      name: row.name ?? "Equipo",
      short: row.short ?? "",
      city: row.city ?? "",
      zone: row.zone ?? "A",
      division: "primera_nacional",

      primary: row.primary_color ?? "#1a55a6",
      secondary: row.secondary_color ?? "#ffffff",
      stripe: (row.stripe as Team["stripe"]) ?? "solid",

      stats: {
        speed: Number(row.speed ?? 70),
        jump: Number(row.jump ?? 70),
        power: Number(row.power ?? 70),
        defense: Number(row.defense ?? 70),
      },

      rivals: cloneArray(row.rivals),

      logoUrl: row.logo_url ?? null,
      flagUrls: cloneArray(row.flag_urls),
      goalAudios: cloneArray(row.goal_audio_urls),
      hinchadas: cloneArray(row.hinchada_urls),
      narrators: cloneArray(row.narrators),

      fullName: row.full_name ?? null,
      foundedYear: row.founded_year ?? null,
      province: row.province ?? null,
      nickname: row.nickname ?? null,
      rivalId: row.rival_id ?? null,
      primeraSeasons: row.primera_seasons ?? null,
      achievements: row.achievements ?? null,
      history: row.history ?? null,
    };
  }

  // IMPORTANTE:
  // El equipo original sigue siendo la fuente principal.
  // Supabase solamente completa/modifica lo que realmente tiene.

  return {
    ...original,

    name: row.name ?? original.name,
    short: row.short ?? original.short,
    city: row.city ?? original.city,
    zone: row.zone ?? original.zone,

    primary: row.primary_color ?? original.primary,
    secondary: row.secondary_color ?? original.secondary,
    stripe:
      (row.stripe as Team["stripe"]) ??
      original.stripe,

    stats: {
      speed: Number(row.speed ?? original.stats.speed),
      jump: Number(row.jump ?? original.stats.jump),
      power: Number(row.power ?? original.stats.power),
      defense: Number(row.defense ?? original.stats.defense),
    },

    // Si Supabase tiene logo, usa ese.
    // Si no, conserva el de teams.ts.
    logoUrl:
      row.logo_url && row.logo_url.trim()
        ? row.logo_url
        : original.logoUrl ?? null,

    flagUrls:
      row.flag_urls?.length
        ? cloneArray(row.flag_urls)
        : cloneArray(original.flagUrls),

    goalAudios:
      row.goal_audio_urls?.length
        ? cloneArray(row.goal_audio_urls)
        : cloneArray(original.goalAudios),

    hinchadas:
      row.hinchada_urls?.length
        ? cloneArray(row.hinchada_urls)
        : cloneArray(original.hinchadas),

    narrators:
      row.narrators?.length
        ? cloneArray(row.narrators)
        : cloneArray(original.narrators),

    rivals:
      row.rivals?.length
        ? cloneArray(row.rivals)
        : cloneArray(original.rivals),

    fullName:
      row.full_name ?? original.fullName ?? null,

    foundedYear:
      row.founded_year ?? original.foundedYear ?? null,

    province:
      row.province ?? original.province ?? null,

    nickname:
      row.nickname ?? original.nickname ?? null,

    rivalId:
      row.rival_id ?? original.rivalId ?? null,

    primeraSeasons:
      row.primera_seasons ?? original.primeraSeasons ?? null,

    achievements:
      row.achievements ?? original.achievements ?? null,

    history:
      row.history ?? original.history ?? null,
  };
}

function replaceTeams(teams: Team[]) {
  TEAMS.length = 0;
  ZONE_A.length = 0;
  ZONE_B.length = 0;

  for (const key of Object.keys(TEAMS_BY_ID)) {
    delete TEAMS_BY_ID[key];
  }

  for (const team of teams) {
    TEAMS.push(team);
    TEAMS_BY_ID[team.id] = team;

    if (team.zone === "A") {
      ZONE_A.push(team);
    } else {
      ZONE_B.push(team);
    }
  }
}

function applyDbRow(row: DbTeam) {
  const team = rowToTeam(row);

  const existing = TEAMS_BY_ID[row.id];

  if (existing) {
    Object.assign(existing, team);
  } else {
    TEAMS.push(team);
    TEAMS_BY_ID[team.id] = team;

    if (team.zone === "A") {
      ZONE_A.push(team);
    } else {
      ZONE_B.push(team);
    }
  }
}

function removeTeam(id: string) {
  const index = TEAMS.findIndex(
    (team) => team.id === id
  );

  if (index >= 0) {
    TEAMS.splice(index, 1);
  }

  delete TEAMS_BY_ID[id];

  const zoneAIndex = ZONE_A.findIndex(
    (team) => team.id === id
  );

  if (zoneAIndex >= 0) {
    ZONE_A.splice(zoneAIndex, 1);
  }

  const zoneBIndex = ZONE_B.findIndex(
    (team) => team.id === id
  );

  if (zoneBIndex >= 0) {
    ZONE_B.splice(zoneBIndex, 1);
  }
}

let booted = false;

async function loadAll() {
  console.log("[TEAMS] Cargando equipos desde Supabase...");

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("sort_order", {
      ascending: true,
    });

  if (error) {
    console.error("[TEAMS] Error de Supabase:", error);
    return;
  }

  if (!data) {
    console.error("[TEAMS] Supabase no devolvió datos.");
    return;
  }

  console.log(
    "[TEAMS] Equipos recibidos:",
    data.length
  );

  const rows = data as unknown as DbTeam[];

  const teams = rows.map(rowToTeam);

  replaceTeams(teams);

  useStore.setState((state) => ({
    version: state.version + 1,
    loaded: true,
  }));

  console.log(
    "[TEAMS] Equipos cargados correctamente:",
    TEAMS.length
  );
}

export function syncTeamsFromDbRows(
  rows: DbTeam[]
) {
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("[TEAMS] No se recibieron equipos.");
    return;
  }

  replaceTeams(rows.map(rowToTeam));

  useStore.setState((state) => ({
    version: state.version + 1,
    loaded: true,
  }));
}

export function hydrateTeamsFromDbRows(
  rows: DbTeam[]
) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  replaceTeams(rows.map(rowToTeam));

  useStore.setState((state) => ({
    version: state.version + 1,
    loaded: true,
  }));
}

function bootOnce() {
  if (booted) return;

  booted = true;

  void loadAll();

  supabase
    .channel("teams-live")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "teams",
      },
      (payload) => {
        console.log(
          "[TEAMS] Cambio recibido:",
          payload.eventType
        );

        if (payload.eventType === "DELETE") {
          removeTeam(
            (payload.old as DbTeam).id
          );
        } else {
          applyDbRow(
            payload.new as DbTeam
          );
        }

        useStore.setState((state) => ({
          version: state.version + 1,
          loaded: true,
        }));
      }
    )
    .subscribe((status) => {
      console.log(
        "[TEAMS] Realtime:",
        status
      );
    });
}

export function useTeamsSync() {
  const version = useStore(
    (state) => state.version
  );

  useEffect(() => {
    bootOnce();
  }, []);

  return version;
}

export function bumpTeamsVersion() {
  useStore.setState((state) => ({
    version: state.version + 1,
    loaded: true,
  }));
}

export async function reloadTeams() {
  await loadAll();
}
