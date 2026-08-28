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
import { OTHER_DIVISION_TEAMS } from "@/data/teams-other-divisions";

const CACHE_KEY =
  "primera-heads-teams-cache-v4";

const CATALOG_FALLBACK =
  new Map<string, Team>();

for (const team of TEAMS) {
  CATALOG_FALLBACK.set(team.id, {
    ...team,

    stats: {
      ...team.stats,
    },

    rivals: [
      ...(team.rivals ?? []),
    ],

    flagUrls: [
      ...(team.flagUrls ?? []),
    ],

    goalAudios: [
      ...(team.goalAudios ?? []),
    ],

    hinchadas: [
      ...(team.hinchadas ?? []),
    ],

    narrators: [
      ...(team.narrators ?? []),
    ],
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
  regional_region?: string | null;
  regional_group?: string | null;
};

type State = {
  version: number;
  loaded: boolean;
};

const useStore = create<State>(() => ({
  version: 0,
  loaded: false,
}));

function cloneArray<T>(
  value: T[] | null | undefined,
): T[] {
  return Array.isArray(value)
    ? [...value]
    : [];
}

function rowToTeam(
  row: DbTeam,
): Team {
  const fallback =
    CATALOG_FALLBACK.get(
      row.id,
    );

  const logoUrl =
    typeof row.logo_url ===
      "string" &&
    row.logo_url.trim().length > 0
      ? row.logo_url
      : fallback?.logoUrl ??
        null;

  const flagUrls =
    Array.isArray(
      row.flag_urls,
    ) &&
    row.flag_urls.length > 0
      ? cloneArray(
          row.flag_urls,
        )
      : cloneArray(
          fallback?.flagUrls,
        );

  const goalAudios =
    Array.isArray(
      row.goal_audio_urls,
    ) &&
    row.goal_audio_urls.length > 0
      ? cloneArray(
          row.goal_audio_urls,
        )
      : cloneArray(
          fallback?.goalAudios,
        );

  const hinchadas =
    Array.isArray(
      row.hinchada_urls,
    ) &&
    row.hinchada_urls.length > 0
      ? cloneArray(
          row.hinchada_urls,
        )
      : cloneArray(
          fallback?.hinchadas,
        );

  const narrators =
    Array.isArray(
      row.narrators,
    ) &&
    row.narrators.length > 0
      ? cloneArray(
          row.narrators,
        )
      : cloneArray(
          fallback?.narrators,
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

    zone: row.zone || fallback?.zone || "A",

    regionalRegion: row.regional_region ?? fallback?.regionalRegion ?? null,
    regionalGroup: row.regional_group ?? fallback?.regionalGroup ?? null,

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
      Array.isArray(row.rivals) &&
      row.rivals.length > 0
        ? [
            ...row.rivals,
          ]
        : cloneArray(
            fallback?.rivals,
          ),

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
  for (const key of Object.keys(TEAMS_BY_ID)) delete TEAMS_BY_ID[key];

  const nonPn = teams.filter(t => (t.division ?? "primera_nacional") !== "primera_nacional");
  OTHER_DIVISION_TEAMS.length = 0;

  for (const team of teams) {
    TEAMS_BY_ID[team.id] = team;
    if ((team.division ?? "primera_nacional") === "primera_nacional") {
      TEAMS.push(team);
      if (team.zone === "A") ZONE_A.push(team);
      else ZONE_B.push(team);
    }
  }
  OTHER_DIVISION_TEAMS.push(...nonPn);
}

function saveCache() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify(
        [...TEAMS, ...OTHER_DIVISION_TEAMS],
      ),
    );
  } catch {
    // No bloquear el juego si localStorage falla.
  }
}

function hydrateCache() {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  try {
    const raw =
      window.localStorage.getItem(
        CACHE_KEY,
      );

    if (!raw) {
      return false;
    }

    const teams =
      JSON.parse(
        raw,
      ) as Team[];

    if (
      !Array.isArray(
        teams,
      ) ||
      teams.length === 0
    ) {
      return false;
    }

    const repaired =
      teams.map(
        (team) => {
          const fallback =
            CATALOG_FALLBACK.get(
              team.id,
            );

          if (!fallback) {
            return team;
          }

          return {
            ...fallback,

            ...team,

            stats: {
              ...fallback.stats,
              ...(team.stats ??
                {}),
            },

            logoUrl:
              team.logoUrl ||
              fallback.logoUrl ||
              null,

            flagUrls:
              team.flagUrls?.length
                ? [
                    ...team.flagUrls,
                  ]
                : [
                    ...(fallback.flagUrls ??
                      []),
                  ],

            goalAudios:
              team.goalAudios?.length
                ? [
                    ...team.goalAudios,
                  ]
                : [
                    ...(fallback.goalAudios ??
                      []),
                  ],

            hinchadas:
              team.hinchadas?.length
                ? [
                    ...team.hinchadas,
                  ]
                : [
                    ...(fallback.hinchadas ??
                      []),
                  ],

            narrators:
              team.narrators?.length
                ? [
                    ...team.narrators,
                  ]
                : [
                    ...(fallback.narrators ??
                      []),
                  ],

            rivals:
              team.rivals?.length
                ? [
                    ...team.rivals,
                  ]
                : [
                    ...(fallback.rivals ??
                      []),
                  ],
          };
        },
      );

    replaceTeams(
      repaired,
    );

    useStore.setState(
      (state) => ({
        version:
          state.version + 1,

        loaded: true,
      }),
    );

    console.log(
      "[TEAMS] Cache cargado:",
      repaired.length,
      "equipos",
    );

    return true;
  } catch (error) {
    console.error(
      "[TEAMS] Error reparando cache:",
      error,
    );

    try {
      window.localStorage.removeItem(
        CACHE_KEY,
      );
    } catch {}

    return false;
  }
}

function removeFromArrayById(list: Team[], id: string) {
  const i = list.findIndex(t => t.id === id);
  if (i >= 0) list.splice(i, 1);
}

function applyDbRow(row: DbTeam) {
  const team = rowToTeam(row);
  const existing = TEAMS_BY_ID[row.id];
  const oldDivision = existing?.division ?? "primera_nacional";
  const newDivision = team.division ?? "primera_nacional";

  if (existing) Object.assign(existing, team);
  else TEAMS_BY_ID[team.id] = team;

  const live = TEAMS_BY_ID[team.id];
  if (oldDivision === "primera_nacional" && newDivision !== "primera_nacional") {
    removeFromArrayById(TEAMS, team.id);
    removeFromArrayById(ZONE_A, team.id);
    removeFromArrayById(ZONE_B, team.id);
    if (!OTHER_DIVISION_TEAMS.some(t => t.id === team.id)) OTHER_DIVISION_TEAMS.push(live);
  } else if (oldDivision !== "primera_nacional" && newDivision === "primera_nacional") {
    removeFromArrayById(OTHER_DIVISION_TEAMS, team.id);
    if (!TEAMS.some(t => t.id === team.id)) TEAMS.push(live);
    if (live.zone === "A") { if (!ZONE_A.some(t => t.id === team.id)) ZONE_A.push(live); }
    else { if (!ZONE_B.some(t => t.id === team.id)) ZONE_B.push(live); }
  } else if (newDivision !== "primera_nacional") {
    const oi = OTHER_DIVISION_TEAMS.findIndex(t => t.id === team.id);
    if (oi >= 0) Object.assign(OTHER_DIVISION_TEAMS[oi], live);
    else OTHER_DIVISION_TEAMS.push(live);
  } else {
    const legacy = TEAMS.find(t => t.id === team.id);
    if (legacy) Object.assign(legacy, live);
    else TEAMS.push(live);
    removeFromArrayById(ZONE_A, team.id);
    removeFromArrayById(ZONE_B, team.id);
    if (live.zone === "A") ZONE_A.push(live); else ZONE_B.push(live);
  }
}

function removeTeam(id: string) {
  removeFromArrayById(TEAMS, id);
  removeFromArrayById(ZONE_A, id);
  removeFromArrayById(ZONE_B, id);
  removeFromArrayById(OTHER_DIVISION_TEAMS, id);
  delete TEAMS_BY_ID[id];
}

let booted = false;

async function loadAll() {
  console.log("[TEAMS] Cargando equipos desde Supabase...");
  const { data, error } = await supabase.from("teams").select("*").order("sort_order", { ascending: true });
  if (error) {
    console.error("[TEAMS] Error de Supabase:", error);
    hydrateCache();
    return;
  }
  if (!data || data.length === 0) {
    console.warn("[TEAMS] Supabase devolvió 0 equipos; usando cache/local como fallback.");
    hydrateCache();
    return;
  }
  console.log("[TEAMS] Equipos recibidos desde Supabase:", data.length);
  syncTeamsFromDbRows(data as unknown as DbTeam[]);
}

export function syncTeamsFromDbRows(
  rows: DbTeam[],
) {
  if (
    !Array.isArray(
      rows,
    ) ||
    rows.length === 0
  ) {
    console.warn(
      "[TEAMS] No se recibieron equipos.",
    );

    return;
  }

  const teams = rows.map(rowToTeam);
  replaceTeams(teams);
  saveCache();

  useStore.setState(
    (state) => ({
      version:
        state.version + 1,

      loaded: true,
    }),
  );
}

export function hydrateTeamsFromDbRows(
  rows: DbTeam[],
) {
  if (
    !Array.isArray(
      rows,
    ) ||
    rows.length === 0
  ) {
    return;
  }

  replaceTeams(
    rows.map(
      rowToTeam,
    ),
  );

  useStore.setState(
    (state) => ({
      version:
        state.version + 1,

      loaded: true,
    }),
  );
}

function bootOnce() {
  if (booted) {
    return;
  }

  booted = true;

  void loadAll();

  supabase
    .channel(
      "teams-live",
    )
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
          payload.eventType,
        );

        if (
          payload.eventType ===
          "DELETE"
        ) {
          removeTeam(
            (
              payload.old as DbTeam
            ).id,
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
    .subscribe(
      (status) => {
        console.log(
          "[TEAMS] Realtime:",
          status,
        );
      },
    );
}

export function useTeamsSync() {
  const version = useStore((state) => state.version);
  useEffect(() => { bootOnce(); }, []);
  return version;
}

export function bumpTeamsVersion() {
  useStore.setState(
    (state) => ({
      version:
        state.version + 1,

      loaded: true,
    }),
  );
}

export async function reloadTeams() {
  await loadAll();
}
