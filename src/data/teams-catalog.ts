import { TEAMS, type Team } from "./teams";
import { OTHER_DIVISION_TEAMS } from "./teams-other-divisions";
import type { DivisionId } from "./competitions";
import { REGIONAL_FEDERAL_AMATEUR_TEAMS, REGIONAL_META } from "./regional-amateur";
import { PROMOCIONAL_AMATEUR_TEAMS, PROMOCIONAL_TEAM_META } from "./promocional-amateur";

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

export const ALL_TEAMS: Team[] = (() => {
  const byId = new Map<string, Team>();

  // Primero cargamos los equipos dinámicos de TEAMS.
  for (const team of TEAMS) {
    byId.set(team.id, team);
  }

  // Después agregamos los equipos de las demás divisiones.
  // Si existe el mismo ID en ambas fuentes, TEAMS tiene prioridad.
  for (const team of OTHER_DIVISION_TEAMS) {
    if (!byId.has(team.id)) byId.set(team.id, team);
  }

  for (const team of PROMOCIONAL_AMATEUR_TEAMS) {
    if (!byId.has(team.id)) byId.set(team.id, team);
  }

  // El Regional es una competencia independiente y sus equipos también
  // forman parte del catálogo central.
  for (const team of REGIONAL_FEDERAL_AMATEUR_TEAMS) {
    if (!byId.has(team.id)) byId.set(team.id, team);
  }

  return Array.from(byId.values());
})();

// -----------------------------------------------------------------------------
// BÚSQUEDAS
// -----------------------------------------------------------------------------

export function getTeamsByDivision(
  division: DivisionId,
): Team[] {
  return ALL_TEAMS.filter(
    (team) => (team.division ?? "primera_nacional") === division,
  );
}

export function getTeamsByZone(
  division: DivisionId,
  zone: string,
): Team[] {
  const teams = getTeamsByDivision(division);
  if (division === "regional_federal_amateur") {
    return teams.filter(team => team.regionalRegion === zone);
  }
  return teams.filter(team => team.zone === zone);
}

export function getTeamById(
  id: string,
): Team | undefined {
  return ALL_TEAMS.find(
    (team) => team.id === id,
  );
}

// -----------------------------------------------------------------------------
// ZONAS DISPONIBLES
// -----------------------------------------------------------------------------

export function getZonesByDivision(
  division: DivisionId,
): string[] {
  if (division === "regional_federal_amateur") {
    return [
      "Norte", "Litoral Norte", "Litoral Sur", "Centro", "Cuyo",
      "Pampeana Norte", "Pampeana Sur", "Patagonia",
    ];
  }
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
  return ALL_TEAMS.reduce<Record<string, number>>(
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


export function getRegionalTeamMeta(id: string): { region: string; group: string } | null {
  const meta = REGIONAL_META.get(id);
  return meta ? { region: meta.region, group: meta.group } : null;
}

export function getPromocionalTeamMeta(id: string): { zone: "A" | "B" } | null {
  const meta = PROMOCIONAL_TEAM_META.get(id);
  return meta ? { ...meta } : null;
}
