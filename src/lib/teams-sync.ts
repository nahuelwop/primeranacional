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

const CACHE_KEY = "primera-heads-teams-cache-v4";

const CATALOG_FALLBACK = new Map<string, Team>();

for (const team of TEAMS) {
  CATALOG_FALLBACK.set(team.id, {
    ...team,
    stats: { ...team.stats },
    rivals: [...(team.rivals ?? [])],
    flagUrls: [...(team.flagUrls ?? [])],
    goalAudios: [...(team.goalAudios ?? [])],
    hinchadas: [...(team.hinchadas ?? [])],
    narrators: [...(team.narrators ?? [])],
  });
}

export type DbTeam = {
  id: string;
  name: string;
  short: string;
  city: string;
  zone: "A" | "B";
  division?: string | null;

  primary_color: string;
  secondary_color: string;
  stripe: string;

  speed: number;
  jump: number;
  power: number;
  defense: number;

  logo_url: string | null;
  flag_urls?: string[] | null;
  rivals: string[];

  sort_order: number;

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

function nonEmptyArray<T>(
  value: T[] | null | undefined,
  fallback: T[] = [],
): T[] {
  return Array.isArray(value) && value.length > 0
    ? [...value]
    : [...fallback];
}

function rowToTeam(row: DbTeam): Team {
  const fallback = CATALOG_FALLBACK.get(row.id);

  const logoUrl =
    row.logo_url &&
    row.logo_url.trim().length > 0
      ? row.logo_url
      : fallback?.logoUrl ?? null;

  const flagUrls = nonEmptyArray(
    row.flag_urls,
    fallback?.flagUrls ?? [],
  );

  const goalAudios = nonEmptyArray(
    row.goal_audio_urls,
    fallback?.goalAudios ?? [],
  );

  const hinchadas = nonEmptyArray(
    row.hinchada_urls,
    fallback?.hinchadas ?? [],
  );

  const narrators = nonEmptyArray(
    row.narrators,
    fallback?.narrators ?? [],
  );

  return {
    id: row.id,

    name:
      row.name ||
      fallback?.name ||
      "Equipo",

    short:
      row.short ||
      fallback?.short ||
      "",

    city:
      row.city ||
      fallback?.city ||
      "",

    zone: row.zone,

    division:
      (row.division as Team["division"]) ??
      fallback?.division ??
      "primera_nacional",

    primary:
      row.primary_color ||
      fallback?.primary ||
      "#1a55a6",

    secondary:
      row.secondary_color ||
      fallback?.secondary ||
      "#ffffff",

    stripe:
      (row.stripe as Team["stripe"]) ??
      fallback?.stripe ??
      "solid",

    stats: {
      speed: Number(
        row.speed ??
        fallback?.stats.speed ??
        70,
      ),

      jump: Number(
        row.jump ??
        fallback?.stats.jump ??
        70,
      ),

      power: Number(
        row.power ??
        fallback?.stats.power ??
        70,
      ),

      defense: Number(
        row.defense ??
        fallback?.stats.defense ??
        70,
      ),
    },

    rivals:
      row.rivals?.length
        ? [...row.rivals]
        : cloneArray(fallback?.rivals),

    logoUrl,

    flagUrls,

    goalAudios,

    hinchadas,

    narrators,

    fullName:
      row.full_name ??
      fallback?.fullName ??
      null,

    foundedYear:
      row.founded_year ??
      fallback?.foundedYear ??
      null,

    province:
      row.province ??
      fallback?.province ??
      null,

    nickname:
      row.nickname ??
      fallback?.nickname ??
      null,

    rivalId:
      row.rival_id ??
      fallback?.rivalId ??
      null,

    primeraSeasons:
      row.primera_seasons ??
      fallback?.primeraSeasons ??
      null,

    achievements:
      row.achievements ??
      fallback?.achievements ??
      null,

    history:
      row.history ??
      fallback?.history ??
      null,
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

function saveCache() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify(TEAMS),
    );
  } catch {
    // No bloquear el juego.
  }
}

function hydrateCache() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw =
      window.localStorage.getItem(CACHE_KEY);

    if (!raw) {
      return false;
    }

    const teams = JSON.parse(raw) as Team[];

    if (
      !Array.isArray(teams) ||
      teams.length === 0
    ) {
      return false;
    }

    const repaired = teams.map((team) => {
      const fallback =
        CATALOG_FALLBACK.get(team.id);

      if (!fallback) {
        return team;
      }

      return {
        ...fallback,
        ...team,

        logoUrl:
          team.logoUrl ||
          fallback.logoUrl ||
          null,

        flagUrls:
          team.flagUrls?.length
            ? team.flagUrls
            : fallback.flagUrls ?? [],

        goalAudios:
          team.goalAudios?.length
            ? team.goalAudios
            : fallback.goalAudios ?? [],

        hinchadas:
          team.hinchadas?.length
            ? team.hinchadas
            : fallback.hinchadas ?? [],

        narrators:
          team.narrators?.length
            ? team.narrators
            : fallback.narrators ?? [],
      };
    });

    replaceTeams(repaired);

    useStore.setState((state) => ({
      version: state.version + 1,
      loaded: true,
    }));

    return true;
  } catch {
    try {
      window.localStorage.removeItem(
        CACHE_KEY,
      );
    } catch {}

    return false;
  }
}

hydrateCache();

function applyDbRow(row: DbTeam) {
  const team = rowToTeam(row);

  const existing =
    TEAMS_BY_ID[row.id];

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
  const index =
    TEAMS.findIndex(
      (team) => team.id === id,
    );

  if (index >= 0) {
    TEAMS.splice(index, 1);
  }

  delete TEAMS_BY_ID[id];

  const zoneAIndex =
    ZONE_A.findIndex(
      (team) => team.id === id,
    );

  if (zoneAIndex >= 0) {
    ZONE_A.splice(zoneAIndex, 1);
  }

  const zoneBIndex =
    ZONE_B.findIndex(
      (team) => team.id === id,
    );

  if (zoneBIndex >= 0) {
    ZONE_B.splice(zoneBIndex, 1);
  }
}

let booted = false;

async function loadAll() {
  const {
    data,
    error,
  } = await supabase
    .from("teams")
    .select("*")
    .order("sort_order", {
      ascending: true,
    });

  if (error) {
    console.error(
      "[teams-sync] Error cargando equipos:",
      error,
    );

    return;
  }

  if (!data) {
    console.warn(
      "[teams-sync] Supabase devolvió data null",
    );

    return;
  }

  console.log(
    "[teams-sync] Equipos cargados desde Supabase:",
    data.length,
  );

  syncTeamsFromDbRows(
    data as unknown as DbTeam[],
  );
}

export function syncTeamsFromDbRows(
  rows: DbTeam[],
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return;
  }

  const teams =
    rows.map(rowToTeam);

  replaceTeams(teams);

  saveCache();

  useStore.setState((state) => ({
    version: state.version + 1,
    loaded: true,
  }));
}

export function hydrateTeamsFromDbRows(
  rows: DbTeam[],
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return;
  }

  replaceTeams(
    rows.map(rowToTeam),
  );

  saveCache();

  useStore.setState((state) => ({
    version: state.version + 1,
    loaded: true,
  }));
}

function bootOnce() {
  if (booted) {
    return;
  }

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
        if (
          payload.eventType ===
          "DELETE"
        ) {
          removeTeam(
            (payload.old as DbTeam).id,
          );
        } else {
          applyDbRow(
            payload.new as DbTeam,
          );
        }

        saveCache();

        useStore.setState(
          (state) => ({
            version:
              state.version + 1,
            loaded: true,
          }),
        );
      },
    )
    .subscribe();
}

export function useTeamsSync() {
  const version = useStore(
    (state) => state.version,
  );

  useEffect(() => {
    bootOnce();
  }, []);

  return version;
}

export function bumpTeamsVersion() {
  useStore.setState((state) => ({
    version:
      state.version + 1,
    loaded: true,
  }));
}

export async function reloadTeams() {
  await loadAll();
}
