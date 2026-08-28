import { TEAMS, TEAMS_BY_ID, type Team } from "./teams";
import { OTHER_DIVISION_TEAMS } from "./teams-other-divisions";
import { REGIONAL_FEDERAL_AMATEUR_TEAMS, REGIONAL_META } from "./regional-amateur";
import type { DivisionId } from "./competitions";

/**
 * Catálogo central de clubes de Primera Heads.
 *
 * TEAMS:
 * - Primera Nacional
 * - sincronizados con Supabase
 *
 * OTHER_DIVISION_TEAMS:
 * - Primera División
 * - Primera B Metropolitana
 * - Primera C
 * - Federal A
 *
 * No modificamos TEAMS para evitar que teams-sync.ts
 * elimine los equipos estáticos de las otras categorías.
 */

// -----------------------------------------------------------------------------
// CATÁLOGO UNIFICADO
// -----------------------------------------------------------------------------

export function getAllTeams(): Team[] {
  const byId = new Map<string, Team>();
  // TEAMS_BY_ID is updated by teams-sync with live Supabase rows.
  for (const team of Object.values(TEAMS_BY_ID)) byId.set(team.id, team);
  for (const team of OTHER_DIVISION_TEAMS) {
    if (!byId.has(team.id)) byId.set(team.id, team);
  }
  for (const team of REGIONAL_FEDERAL_AMATEUR_TEAMS) {
    if (!byId.has(team.id)) byId.set(team.id, team);
  }
  return Array.from(byId.values());
}

export const ALL_TEAMS: Team[] = getAllTeams();

// -----------------------------------------------------------------------------
// BÚSQUEDAS
// -----------------------------------------------------------------------------

export function getTeamsByDivision(
  division: DivisionId,
): Team[] {
  return getAllTeams().filter(
    (team) => (team.division ?? "primera_nacional") === division,
  );
}

export function getTeamsByZone(
  division: DivisionId,
  zone: string,
): Team[] {
  if (division === "regional_federal_amateur") {
    return getTeamsByDivision(division).filter(team => team.regionalRegion === zone);
  }
  return getTeamsByDivision(division).filter(
    (team) => team.zone === zone,
  );
}

export function getTeamById(
  id: string,
): Team | undefined {
  return getAllTeams().find(
    (team) => team.id === id,
  );
}

// -----------------------------------------------------------------------------
// ZONAS DISPONIBLES
// -----------------------------------------------------------------------------

export function getZonesByDivision(
  division: DivisionId,
): string[] {
  const zones = getTeamsByDivision(division)
    .map((team) => team.zone)
    .filter(Boolean);

  return Array.from(new Set(zones)).sort();
}

// -----------------------------------------------------------------------------
// CANTIDAD DE EQUIPOS
// -----------------------------------------------------------------------------

export function getTeamCountByDivision(
  division: DivisionId,
): number {
  return getTeamsByDivision(division).length;
}

// -----------------------------------------------------------------------------
// DEBUG / INFORMACIÓN
// -----------------------------------------------------------------------------

export function getDivisionTeamSummary(): Record<string, number> {
  return getAllTeams().reduce<Record<string, number>>(
    (summary, team) => {
      const division =
        team.division ?? "primera_nacional";

      summary[division] =
        (summary[division] ?? 0) + 1;

      return summary;
    },
    {},
  );
}

export function getRegionalTeamMeta(id: string) { return REGIONAL_META.get(id); }
