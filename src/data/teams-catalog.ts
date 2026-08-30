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
 * Catálogo central dinámico.
 *
 * IMPORTANTE:
 * Los equipos sincronizados desde Supabase tienen prioridad.
 *
 * Esto permite que:
 * - los escudos modificados desde Admin permanezcan;
 * - colores, stats, audios y demás cambios persistan;
 * - Regional Amateur y Promocional no queden atados
 *   permanentemente al catálogo estático;
 * - /equipos se actualice cuando teams-sync recibe cambios.
 */

function buildAllTeams(): Team[] {
  const byId = new Map<string, Team>();

  // ==========================================================================
  // 1. FUENTE DINÁMICA: equipos cargados/sincronizados desde Supabase
  // ==========================================================================

  for (const team of TEAMS) {
    byId.set(team.id, team);
  }

  for (const team of OTHER_DIVISION_TEAMS) {
    byId.set(team.id, team);
  }

  // ==========================================================================
  // 2. FALLBACK ESTÁTICO
  // ==========================================================================
  // Estos catálogos solamente se utilizan si el equipo todavía no llegó
  // desde Supabase.
  //
  // El equipo de Supabase SIEMPRE tiene prioridad si existe el mismo ID.

  for (const team of PROMOCIONAL_AMATEUR_TEAMS) {
    if (!byId.has(team.id)) {
      byId.set(team.id, team);
    }
  }

  for (const team of REGIONAL_FEDERAL_AMATEUR_TEAMS) {
    if (!byId.has(team.id)) {
      byId.set(team.id, team);
    }
  }

  return Array.from(byId.values());
}

// ============================================================================
// EQUIPOS POR DIVISIÓN
// ============================================================================

export function getTeamsByDivision(
  division: DivisionId,
): Team[] {
  return buildAllTeams().filter(
    (team) =>
      (team.division ?? "primera_nacional") === division,
  );
}

// ============================================================================
// EQUIPOS POR ZONA / REGIÓN
// ============================================================================

export function getTeamsByZone(
  division: DivisionId,
  zone: string,
): Team[] {
  const teams = getTeamsByDivision(division);

  // --------------------------------------------------------------------------
  // Regional Federal Amateur
  // --------------------------------------------------------------------------
  // En Regional "zone" NO representa la región.
  // La separación real es:
  //
  // Norte
  // Litoral Norte
  // Litoral Sur
  // Centro
  // Cuyo
  // Pampeana Norte
  // Pampeana Sur
  // Patagonia
  //
  // Los grupos internos se manejan mediante regionalGroup.

  if (division === "regional_federal_amateur") {
    return teams.filter(
      (team) => team.regionalRegion === zone,
    );
  }

  // --------------------------------------------------------------------------
  // Resto de divisiones
  // --------------------------------------------------------------------------

  return teams.filter(
    (team) => team.zone === zone,
  );
}

// ============================================================================
// EQUIPO POR ID
// ============================================================================

export function getTeamById(
  id: string,
): Team | undefined {
  return buildAllTeams().find(
    (team) => team.id === id,
  );
}

// ============================================================================
// ZONAS / REGIONES DISPONIBLES
// ============================================================================

export function getZonesByDivision(
  division: DivisionId,
): string[] {
  // Regional Amateur usa regiones geográficas.
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
    .filter(
      (zone): zone is string =>
        typeof zone === "string" &&
        zone.length > 0,
    );

  return Array.from(new Set(zones)).sort();
}

// ============================================================================
// CANTIDAD DE EQUIPOS
// ============================================================================

export function getTeamCountByDivision(
  division: DivisionId,
): number {
  return getTeamsByDivision(division).length;
}

// ============================================================================
// RESUMEN
// ============================================================================

export function getDivisionTeamSummary(): Record<string, number> {
  return buildAllTeams().reduce<Record<string, number>>(
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

// ============================================================================
// METADATA DEL REGIONAL
// ============================================================================

export function getRegionalTeamMeta(
  id: string,
): {
  region: string;
  group: string;
} | null {
  const staticMeta = REGIONAL_META.get(id);

  if (staticMeta) {
    return {
      region: staticMeta.region,
      group: staticMeta.group,
    };
  }

  // Fallback dinámico: permite utilizar la metadata que vino desde Supabase.
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

// ============================================================================
// METADATA DEL PROMOCIONAL AMATEUR
// ============================================================================

export function getPromocionalTeamMeta(
  id: string,
): {
  zone: "A" | "B";
} | null {
  const staticMeta = PROMOCIONAL_TEAM_META.get(id);

  if (staticMeta) {
    return {
      ...staticMeta,
    };
  }

  const team = getTeamById(id);

  if (
    team?.division === "promocional_amateur" &&
    (team.zone === "A" ||
      team.zone === "B")
  ) {
    return {
      zone: team.zone,
    };
  }

  return null;
}
