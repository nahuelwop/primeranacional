import { TEAMS, type Team } from "./teams";
import { OTHER_DIVISION_TEAMS } from "./teams-other-divisions";
import type { DivisionId } from "./competitions";
import {
  REGIONAL_FEDERAL_AMATEUR_TEAMS,
  REGIONAL_META,
} from "./regional-amateur";
import {
  PROMOCIONAL_AMATEUR_TEAMS,
  PROMOCIONAL_TEAM_META,
} from "./promocional-amateur";

/**
 * Catálogo dinámico de clubes.
 *
 * IMPORTANTE:
 * No se guarda ALL_TEAMS en una constante calculada una sola vez.
 * Los equipos pueden cambiar desde el Panel Admin y teams-sync.ts
 * actualiza TEAMS / OTHER_DIVISION_TEAMS en tiempo real.
 *
 * Prioridad:
 * 1. TEAMS / OTHER_DIVISION_TEAMS sincronizados desde Supabase
 * 2. Catálogo estático de Promocional / Regional como fallback
 */

function buildAllTeams(): Team[] {
  const byId = new Map<string, Team>();

  // 1) Equipos sincronizados dinámicamente
  for (const team of TEAMS) {
    byId.set(team.id, team);
  }

  for (const team of OTHER_DIVISION_TEAMS) {
    byId.set(team.id, team);
  }

  // 2) Fallback estático para Promocional
  for (const team of PROMOCIONAL_AMATEUR_TEAMS) {
    if (!byId.has(team.id)) {
      byId.set(team.id, team);
    }
  }

  // 3) Fallback estático para Regional
  for (const team of REGIONAL_FEDERAL_AMATEUR_TEAMS) {
    if (!byId.has(team.id)) {
      byId.set(team.id, team);
    }
  }

  return Array.from(byId.values());
}

export function getTeamsByDivision(
  division: DivisionId,
): Team[] {
  return buildAllTeams().filter(
    (team) => (team.division ?? "primera_nacional") === division,
  );
}

export function getTeamsByZone(
  division: DivisionId,
  zone: string,
): Team[] {
  const teams = getTeamsByDivision(division);

  // Regional: "zone" NO representa los grupos.
  // zone = región geográfica.
  if (division === "regional_federal_amateur") {
    return teams.filter(
      (team) => team.regionalRegion === zone,
    );
  }

  return teams.filter(
    (team) => team.zone === zone,
  );
}

export function getTeamById(
  id: string,
): Team | undefined {
  return buildAllTeams().find(
    (team) => team.id === id,
  );
}

export function getZonesByDivision(
  division: DivisionId,
): string[] {
  if (division === "regional_federal_amateur") {
    return [
      "Norte",
      "Litoral Norte",
      "Litoral Sur",
      "Centro",
      "Cuyo",
      "Pampeana Norte",
      "Pampeana Sur",
      "Patagonia",
    ];
  }

  const zones = getTeamsByDivision(division)
    .map((team) => team.zone)
    .filter(Boolean);

  return Array.from(new Set(zones)).sort();
}

export function getTeamCountByDivision(
  division: DivisionId,
): number {
  return getTeamsByDivision(division).length;
}

export function getDivisionTeamSummary(): Record<string, number> {
  return getTeamsByDivision as never
    ? buildAllTeams().reduce<Record<string, number>>(
        (summary, team) => {
          const division =
            team.division ?? "primera_nacional";

          summary[division] =
            (summary[division] ?? 0) + 1;

          return summary;
        },
        {},
      )
    : {};
}

export function getRegionalTeamMeta(
  id: string,
): {
  region: string;
  group: string;
} | null {
  const meta = REGIONAL_META.get(id);

  if (!meta) {
    const team = getTeamById(id);

    if (
      team?.division === "regional_federal_amateur" &&
      team.regionalRegion &&
      team.regionalGroup
    ) {
      return {
        region: team.regionalRegion,
        group: team.regionalGroup,
      };
    }

    return null;
  }

  return {
    region: meta.region,
    group: meta.group,
  };
}

export function getPromocionalTeamMeta(
  id: string,
): {
  zone: "A" | "B";
} | null {
  const meta = PROMOCIONAL_TEAM_META.get(id);

  if (!meta) {
    const team = getTeamById(id);

    if (
      team?.division === "promocional_amateur" &&
      (team.zone === "A" || team.zone === "B")
    ) {
      return {
        zone: team.zone,
      };
    }

    return null;
  }

  return {
    ...meta,
  };
}
