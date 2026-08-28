// ============================================================================
// Motor de reglas de competición del fútbol argentino — configurable, no
// hardcodeado. Cada división declara sus propias reglas de ascenso/descenso,
// no existe una "pirámide simple" implícita en el código.
//
// IMPORTANTE: la pirámide jugable usa divisiones independientes y el Regional
// reemplaza por completo a la antigua categoría inferior metropolitana. Los planteles
// se leen del catálogo central y los movimientos de carrera modifican los
// rosters de la temporada siguiente.
// ============================================================================

export type DivisionId =
  | "primera_division"
  | "primera_nacional"
  | "primera_b"
  | "primera_c"
  | "federal_a"
  | "regional_federal_amateur";

// Sistema de afiliación: determina qué ruta de ascenso/descenso le corresponde
// a un club cuando la división de origen tiene más de un posible destino
// (p.ej. Primera Nacional reparte descensos entre el circuito metropolitano
// y el federal, no todos los clubes van al mismo lugar).
export type AffiliationSystem = "metropolitano" | "federal";

export type PromotionRule = {
  // A qué división asciende
  to: DivisionId;
  // Cupos que se deciden por posición en la tabla (sin pasar por playoff)
  directSlots: number;
  // Cupos que se deciden por playoff/reducido (0 si esa división no usa)
  playoffSlots: number;
};

export type RelegationRule = {
  // A qué división desciende. Puede haber más de un destino posible: el que
  // corresponda depende del `affiliation` del club (ver resolveRelegation).
  to: DivisionId;
  affiliation?: AffiliationSystem; // si se omite, aplica a cualquier afiliación
  slots: number; // cantidad de equipos que bajan por esta vía
};

export type CompetitionRules = {
  division: DivisionId;
  name: string;
  shortName: string;
  // Divisiones que tiene por debajo en el organigrama (sólo informativo/UI,
  // el destino real de ascensos/descensos lo definen promotion/relegation)
  tier: number; // 1 = más alta
  hasZones: boolean;
  zones: string[]; // p.ej. ["A", "B"]; [] si no tiene
  matchesPerTeam?: number; // partidos de fase regular por equipo (si corresponde)
  formatLabel?: string; // resumen legible del formato para UI
  promotion: PromotionRule[]; // a dónde puede ascender un equipo de esta división
  relegation: RelegationRule[]; // a dónde puede descender un equipo de esta división
  // true si esta división distingue entre afiliación metropolitana/federal
  // para decidir el destino de un descenso
  usesAffiliation: boolean;
};

// ============================================================================
// Reglas por división. Esto es lo que se edita cuando cambia un reglamento de
// temporada — nunca hay que tocar la lógica del motor para eso.
// ============================================================================
export const COMPETITIONS: Record<DivisionId, CompetitionRules> = {
  primera_division: {
    division: "primera_division", name: "Primera División", shortName: "1ra. División", tier: 1,
    hasZones: true, zones: ["A", "B"], matchesPerTeam: 44,
    formatLabel: "Apertura por 2 zonas de 15 + fecha interzonal; Clausura todos contra todos (29 fechas)",
    promotion: [],
    relegation: [{ to: "primera_nacional", slots: 2 }],
    usesAffiliation: false,
  },
  primera_nacional: {
    division: "primera_nacional",
    name: "Primera Nacional",
    shortName: "Prim. Nacional",
    tier: 2,
    hasZones: true,
    zones: ["A", "B"],
    promotion: [
      { to: "primera_division", directSlots: 1, playoffSlots: 1 },
    ],
    matchesPerTeam: 38,
    formatLabel: "2 zonas de 19 · ida y vuelta",
    relegation: [
      { to: "primera_b", affiliation: "metropolitano", slots: 2 },
      { to: "federal_a", affiliation: "federal", slots: 2 },
    ],
    usesAffiliation: true,
  },
  primera_b: {
    division: "primera_b",
    name: "Primera B Metropolitana",
    shortName: "Primera B",
    tier: 3,
    hasZones: false,
    zones: [],
    promotion: [{ to: "primera_nacional", directSlots: 1, playoffSlots: 1 }],
    relegation: [{ to: "primera_c", slots: 2 }],
    matchesPerTeam: 42,
    formatLabel: "Todos contra todos, ida y vuelta",
    usesAffiliation: false,
  },
  primera_c: {
    division: "primera_c",
    name: "Primera C",
    shortName: "Primera C",
    tier: 4,
    hasZones: false,
    zones: [],
    promotion: [{ to: "primera_b", directSlots: 1, playoffSlots: 1 }],
    relegation: [],
    matchesPerTeam: 48,
    formatLabel: "Apertura y Clausura, todos contra todos a una rueda",
    usesAffiliation: false,
  },
  regional_federal_amateur: {
    division: "regional_federal_amateur",
    name: "Torneo Regional Federal Amateur",
    shortName: "Regional Federal",
    tier: 4,
    hasZones: true,
    zones: ["Norte", "Litoral Norte", "Litoral Sur", "Centro", "Cuyo", "Pampeana Norte", "Pampeana Sur", "Patagonia"],
    promotion: [{ to: "federal_a", directSlots: 4, playoffSlots: 0 }],
    relegation: [],
    matchesPerTeam: 6,
    formatLabel: "8 regiones · zonas de 3/4 ida y vuelta · eliminatorias regionales a doble partido · 4 finales nacionales",
    usesAffiliation: false,
  },
  federal_a: {
    division: "federal_a",
    name: "Torneo Federal A",
    shortName: "Federal A",
    tier: 3, // paralela a Primera B dentro del sistema federal
    hasZones: true,
    zones: ["A", "B", "C", "D"],
    promotion: [{ to: "primera_nacional", directSlots: 2, playoffSlots: 0 }],
    relegation: [{ to: "regional_federal_amateur", slots: 4 }],
    formatLabel: "37 equipos · 4 zonas geográficas (10+9+9+9) · Fase 1 ida y vuelta + Campeonato/Reválida",
    usesAffiliation: false,
  },
};

// Orden de visualización sugerido para menús (Equipos, elegir división, etc.)
export const DIVISION_ORDER: DivisionId[] = [
  "primera_division",
  "primera_nacional",
  "primera_b",
  "primera_c",
  "federal_a",
  "regional_federal_amateur",
];

// ============================================================================
// Resolución de destino: dada una división de origen, la posición final y
// (si aplica) la afiliación del club, calcula a qué división pasa la
// temporada siguiente. Devuelve `null` si el club se mantiene en su división.
//
// standingsSize = cantidad de equipos en esa competición esa temporada
// position = puesto final (1 = campeón)
// wonPlayoff = si correspondía definir por reducido/playoff, si lo ganó o no
// ============================================================================
export function resolveNextDivision(params: {
  division: DivisionId;
  position: number;
  standingsSize: number;
  affiliation?: AffiliationSystem;
  wonPromotionPlayoff?: boolean;
}): DivisionId | null {
  const { division, position, standingsSize, affiliation, wonPromotionPlayoff } = params;
  const rules = COMPETITIONS[division];

  // --- Ascenso ---
  for (const promo of rules.promotion) {
    if (position <= promo.directSlots) return promo.to;
    if (
      promo.playoffSlots > 0 &&
      position > promo.directSlots &&
      position <= promo.directSlots + promo.playoffSlots * 4 && // rango razonable de clasificados al reducido
      wonPromotionPlayoff
    ) {
      return promo.to;
    }
  }

  // --- Descenso ---
  const applicableRelegations = rules.relegation.filter(
    r => !r.affiliation || r.affiliation === affiliation
  );
  const totalRelegationSlots = applicableRelegations.reduce((sum, r) => sum + r.slots, 0);
  if (totalRelegationSlots > 0 && position > standingsSize - totalRelegationSlots) {
    // Si hay más de un destino posible para esta afiliación, se reparten por
    // orden de tabla (los últimos van al primer destino de la lista, etc.)
    let remaining = standingsSize - position + 1; // 1 = último, 2 = anteúltimo...
    for (const r of applicableRelegations) {
      if (remaining <= r.slots) return r.to;
      remaining -= r.slots;
    }
  }

  return null; // se mantiene en la misma división
}

export function getCompetition(division: DivisionId): CompetitionRules {
  return COMPETITIONS[division];
}
