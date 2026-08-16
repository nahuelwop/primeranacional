// ============================================================================
// Motor de reglas de competición del fútbol argentino — configurable, no
// hardcodeado. Cada división declara sus propias reglas de ascenso/descenso,
// no existe una "pirámide simple" implícita en el código.
//
// IMPORTANTE — estado actual (léase antes de asumir que algo ya funciona):
// Esta capa define la ESTRUCTURA. Todavía no está conectada a ninguna pantalla
// (Equipos, Amistoso, Carrera siguen funcionando exactamente igual que antes).
// Sólo Primera Nacional tiene equipos reales cargados hoy (los 32 de siempre,
// en TEAMS). El resto de las divisiones están declaradas con reglas reales
// pero SIN equipos todavía — no se inventaron planteles/datos falsos para
// rellenarlas, porque eso sería peor que no tenerlas.
// ============================================================================

export type DivisionId =
  | "primera_division"
  | "primera_nacional"
  | "primera_b"
  | "primera_c"
  | "primera_d"
  | "federal_a";

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
  matchesPerTeam?: number; // si corresponde fijarlo (ida y vuelta, etc.)
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
    division: "primera_division",
    name: "Primera División",
    shortName: "1ra. División",
    tier: 1,
    hasZones: false,
    zones: [],
    promotion: [],
    relegation: [
      { to: "primera_nacional", slots: 2 },
    ],
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
      { to: "primera_division", directSlots: 2, playoffSlots: 1 },
    ],
    relegation: [
      // Un club metropolitano que desciende de Primera Nacional va a Primera B;
      // uno del sistema federal va a Federal A. No es "el mismo camino para todos".
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
    promotion: [
      { to: "primera_nacional", directSlots: 1, playoffSlots: 1 },
    ],
    relegation: [
      { to: "primera_c", slots: 4 },
    ],
    usesAffiliation: false,
  },
  primera_c: {
    division: "primera_c",
    name: "Primera C",
    shortName: "Primera C",
    tier: 4,
    hasZones: false,
    zones: [],
    promotion: [
      { to: "primera_b", directSlots: 1, playoffSlots: 1 },
    ],
    relegation: [
      { to: "primera_d", slots: 2 },
    ],
    usesAffiliation: false,
  },
  primera_d: {
    division: "primera_d",
    name: "Primera D",
    shortName: "Primera D",
    tier: 5,
    hasZones: false,
    zones: [],
    promotion: [
      { to: "primera_c", directSlots: 1, playoffSlots: 1 },
    ],
    relegation: [], // última categoría del circuito metropolitano: no desciende
    usesAffiliation: false,
  },
  federal_a: {
    division: "federal_a",
    name: "Torneo Federal A",
    shortName: "Federal A",
    tier: 3, // paralela a Primera B dentro del sistema federal
    hasZones: true,
    zones: ["A", "B"],
    promotion: [
      { to: "primera_nacional", directSlots: 1, playoffSlots: 1 },
    ],
    relegation: [
      { to: "federal_a", slots: 0 }, // placeholder: el reglamento federal regional
      // no está modelado acá todavía (ligas regionales por debajo de Federal A
      // no forman parte de este juego) — se deja en 0 a propósito, no se inventa.
    ],
    usesAffiliation: false,
  },
};

// Orden de visualización sugerido para menús (Equipos, elegir división, etc.)
export const DIVISION_ORDER: DivisionId[] = [
  "primera_division",
  "primera_nacional",
  "primera_b",
  "primera_c",
  "primera_d",
  "federal_a",
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
