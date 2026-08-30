import { ZONE_A, ZONE_B, type Team } from "@/data/teams";
import { getTeamsByDivision, getTeamById } from "@/data/teams-catalog";
import { COMPETITIONS, type DivisionId } from "@/data/competitions";
import { buildDivisionCareerFixture, simulateMatch, simulateRegionalTournament, simulateDivisionSeason as simulateDivisionSeasonEngine, resolveDivisionSeason, emptyStandings, applyMatchToStandings, sortStandings, type Match, type StandingRow } from "@/lib/tournament";

// ============ Stadium upgrades ============
export type StadiumUpgradeKey = keyof StadiumUpgrades;
export const STADIUM_UPGRADE_CATALOG: Array<{
  key: StadiumUpgradeKey; name: string; desc: string; cost: number; incomeBonusPct: number;
}> = [
  { key: "capacity", name: "Ampliar cancha",          desc: "+10% ingresos por partido.",  cost: 400,  incomeBonusPct: 10 },
  { key: "pitch",    name: "Mejorar césped",          desc: "+15% ingresos y mejor imagen.", cost: 650,  incomeBonusPct: 15 },
  { key: "led",      name: "Publicidad LED",          desc: "+10% ingresos por sponsors.",  cost: 500,  incomeBonusPct: 10 },
  { key: "vip",      name: "Palcos VIP",              desc: "+25% ingresos por hinchada premium.", cost: 1200, incomeBonusPct: 25 },
];

// ============ Corruption ============
export const CORRUPTION_CATALOG: Array<{
  kind: CorruptionKind; name: string; cost: number; matches: number;
  desc: string; penaltyPct: number;
  effects: { startingScore?: { h: number; a: number }; cancelOpponentGoals?: number; doubleGoalChance?: number };
}> = [
  { kind: "leve",      name: "Coima leve",     cost: 150, matches: 3,  penaltyPct: 20,
    desc: "El VAR anula 1 gol rival por partido durante 3 fechas.",
    effects: { cancelOpponentGoals: 1 } },
  { kind: "medio",     name: "Arreglo medio",  cost: 400, matches: 5,  penaltyPct: 40,
    desc: "20% de chance de que tus goles cuenten doble durante 5 fechas.",
    effects: { doubleGoalChance: 0.2 } },
  { kind: "obvio",     name: "Arreglo obvio",  cost: 900, matches: 8,  penaltyPct: 70,
    desc: "Empezás 1-0 arriba y el VAR anula 2 goles rivales por partido (8 fechas).",
    effects: { startingScore: { h: 1, a: 0 }, cancelOpponentGoals: 2 } },
  { kind: "seca_nuca", name: "Seca nuca",      cost: 0,   matches: 20, penaltyPct: 90,
    desc: "Sin costo pero robás sin disimulo: 3-0 arriba, todos los goles rivales anulados, tus goles cuentan doble. Ingresos -90% por 20 fechas.",
    effects: { startingScore: { h: 3, a: 0 }, cancelOpponentGoals: Infinity, doubleGoalChance: 0.5 } },
];

export type StadiumUpgrades = {
  capacity: boolean;   // +10%
  pitch: boolean;      // +15%
  vip: boolean;        // +25%
  led: boolean;        // +10%
};

export type CorruptionKind = "leve" | "medio" | "obvio" | "seca_nuca";
export type ActiveCorruption = { kind: CorruptionKind; matchesLeft: number } | null;
export type IncomePenalty = { pct: number; matchesLeft: number } | null;

export type Objetivo = "ascenso_directo" | "reducido" | "mantener" | "salir_campeon";
export const OBJETIVO_LABEL: Record<Objetivo, string> = {
  ascenso_directo: "Ascender a Primera División",
  reducido: "Entrar al Reducido",
  mantener: "Mantener la categoría",
  salir_campeon: "Salir campeón de Primera División",
};

export type SeasonSnapshot = {
  season: number;
  division: DivisionId;
  standings: StandingRow[];
};

export type AverageRow = {
  teamId: string;
  seasons: number;
  pj: number;
  pts: number;
  avgPtsPerMatch: number;
  dg: number;
};

export type CareerState = {
  zone: string;
  division?: DivisionId;
  matches: Match[];
  standings: StandingRow[];
  otherStandings?: StandingRow[];
  otherMatches?: Match[];
  totalGoalsScored: number;
  streakUnbeaten: number;
  bestUnbeaten: number;
  zoneChampions: { season: number; zone: string; teamId: string }[];
  seasonHistory?: SeasonSnapshot[];
  stadiumUpgrades?: StadiumUpgrades;
  activeCorruption?: ActiveCorruption;
  incomePenalty?: IncomePenalty;
  difficulty?: "easy" | "normal" | "hard" | "expert";
  objetivo?: Objetivo;
  sponsor?: {
    sponsorId: string; name: string; initial: number; weekly: number; bonus: number;
    seasons: number; since: number; color: string; logo_url?: string | null;
  } | null;
  introVista?: boolean;
  lastRoundSummarized?: number;
  // Planteles vigentes de cada categoría. Se modifican al cerrar la temporada para
  // que ascensos y descensos sean reales y no sólo informativos.
  leagueRosters?: Partial<Record<DivisionId, string[]>>;
  federalZoneMap?: Record<string, string>;
  careerEnded?: boolean;
  careerEndReason?: string;
  userTeamId?: string;
};

export function teamZone(teamId: string): string {
  if (ZONE_A.some(t => t.id === teamId)) return "A";
  if (ZONE_B.some(t => t.id === teamId)) return "B";
  return getTeamById(teamId)?.zone ?? "A";
}

export function careerDivision(state: CareerState | null | undefined, teamId?: string): DivisionId {
  return state?.division ?? (teamId ? (getTeamById(teamId)?.division ?? "primera_nacional") : "primera_nacional");
}

function combinedStandings(state: CareerState): StandingRow[] {
  const all = [...state.standings, ...(state.otherStandings ?? [])];
  const map = new Map<string, StandingRow>();
  for (const row of all) {
    const cur = map.get(row.teamId);
    if (!cur) map.set(row.teamId, { ...row });
    else map.set(row.teamId, {
      ...cur, pj: cur.pj + row.pj, pg: cur.pg + row.pg, pe: cur.pe + row.pe, pp: cur.pp + row.pp,
      gf: cur.gf + row.gf, gc: cur.gc + row.gc, dg: cur.dg + row.dg, pts: cur.pts + row.pts,
    });
  }
  return sortStandings([...map.values()]);
}

export function isFirstDivision(state: CareerState | null | undefined, teamId?: string): boolean {
  return careerDivision(state, teamId) === "primera_division";
}

export function initialLeagueRosters(): Partial<Record<DivisionId, string[]>> {
  const result: Partial<Record<DivisionId, string[]>> = {};
  const divisions: DivisionId[] = ["primera_division", "primera_nacional", "primera_b", "primera_c", "promocional_amateur", "federal_a", "regional_federal_amateur"];
  for (const d of divisions) result[d] = getTeamsByDivision(d).map(t => t.id);
  return result;
}

function rosterFor(rosters: Partial<Record<DivisionId, string[]>> | undefined, division: DivisionId): string[] {
  const ids = rosters?.[division];
  return ids && ids.length ? [...ids] : getTeamsByDivision(division).map(t => t.id);
}

export function buildSeason(
  teamId: string,
  division: DivisionId = getTeamById(teamId)?.division ?? "primera_nacional",
  leagueRosters?: Partial<Record<DivisionId, string[]>>,
  federalZoneMap?: Record<string, string>,
): CareerState {
  const rosters = leagueRosters ?? initialLeagueRosters();
  const ids = rosterFor(rosters, division);
  if (!ids.includes(teamId)) ids.push(teamId);
  if (ids.length === 1) ids.push(...getTeamsByDivision(division).map(t => t.id).filter(id => id !== teamId));

  const fixture = buildDivisionCareerFixture(division, ids, teamId, federalZoneMap);
  let standings = emptyStandings(fixture.activeTeamIds);
  let otherStandings: StandingRow[] | undefined;
  let otherMatches: Match[] | undefined;

  if (fixture.otherMatches.length > 0) {
    otherMatches = fixture.otherMatches.map(m => {
      const { hg, ag } = simulateMatch(m.home, m.away);
      return { ...m, played: true, homeGoals: hg, awayGoals: ag };
    });
    // Los partidos ya simulados deben alimentar toda tabla cuyo equipo participe
    // en ellos. Esto es especialmente importante para interzonales de Primera
    // Nacional/C y para la tabla anual de Primera División.
    for (const m of otherMatches) standings = applyMatchToStandings(standings, m);
    const activeSet = new Set(fixture.activeTeamIds);
    const otherIds = Array.from(new Set(otherMatches.flatMap(m => [m.home, m.away]).filter(id => !activeSet.has(id))));
    if (otherIds.length) {
      otherStandings = emptyStandings(otherIds);
      for (const m of otherMatches) otherStandings = applyMatchToStandings(otherStandings, m);
    }
  }

  return {
    zone: fixture.zone, division, matches: fixture.matches, standings, otherStandings, otherMatches,
    totalGoalsScored: 0, streakUnbeaten: 0, bestUnbeaten: 0, zoneChampions: [], seasonHistory: [],
    stadiumUpgrades: { capacity: false, pitch: false, vip: false, led: false },
    activeCorruption: null, incomePenalty: null,
    leagueRosters: rosters,
    federalZoneMap: fixture.zoneMap ?? federalZoneMap,
    careerEnded: false,
    userTeamId: teamId,
  };
}

export type LeagueSeasonResult = {
  division: DivisionId;
  standings: StandingRow[];
  standingsByZone: Record<string, StandingRow[]>;
  matches: Match[];
  zoneMap?: Record<string, string>;
};

export function simulateDivisionSeason(division: DivisionId, roster: string[], userState?: CareerState): LeagueSeasonResult {
  return simulateDivisionSeasonCore(division, roster, userState);
}

function simulateDivisionSeasonCore(division: DivisionId, roster: string[], userState?: CareerState): LeagueSeasonResult {
  const source = simulateDivisionSeasonEngine(division, roster, userState ? {
    zone: userState.zone, standings: userState.standings, otherStandings: userState.otherStandings,
    matches: userState.matches, otherMatches: userState.otherMatches, federalZoneMap: userState.federalZoneMap,
  } : undefined);
  return source;
}

function nationalAffiliation(teamId: string): "metropolitano" | "federal" {
  // Los clubes que llegan a la Nacional desde B Metro conservan el circuito
  // metropolitano; los que llegan desde Federal A conservan el circuito federal.
  // Para los planteles originales, usamos las listas históricas de la Nacional.
  const sourceDivision = getTeamById(teamId)?.division;
  if (sourceDivision === "primera_b") return "metropolitano";
  if (sourceDivision === "federal_a") return "federal";
  if (ZONE_A.some(t => t.id === teamId) || ZONE_B.some(t => t.id === teamId)) return "metropolitano";
  return "federal";
}

export type LeagueMovement = { teamId: string; from: DivisionId; to: DivisionId | null; reason: string };

/**
 * Resuelve la pirámide usando el reglamento de cada categoría. Los playoffs son
 * simulados al finalizar la fase regular y el ganador efectivo es el que se mueve
 * de división; no se muestran ascensos ficticios.
 */
export function resolveLeagueMovements(currentState: CareerState, season: number): {
  rosters: Partial<Record<DivisionId, string[]>>;
  movements: LeagueMovement[];
  userNextDivision: DivisionId | null;
  ended: boolean;
  endReason?: string;
} {
  const currentDivision = careerDivision(currentState);
  const base = currentState.leagueRosters ?? initialLeagueRosters();
  const divisions: DivisionId[] = [
    "primera_division", "primera_nacional", "primera_b", "primera_c", "promocional_amateur", "federal_a", "regional_federal_amateur",
  ];
  const rosters: Partial<Record<DivisionId, string[]>> = Object.fromEntries(
    divisions.map(d => [d, rosterFor(base, d)])
  ) as Partial<Record<DivisionId, string[]>>;
  const snapshotRosters = Object.fromEntries(divisions.map(d => [d, [...(rosters[d] ?? [])]])) as Partial<Record<DivisionId, string[]>>;

  const results = new Map<DivisionId, LeagueSeasonResult>();
  for (const d of divisions) {
    results.set(d, simulateDivisionSeasonCore(d, snapshotRosters[d] ?? [], d === currentDivision ? currentState : undefined));
  }

  const moves: LeagueMovement[] = [];
  const move = (teamId: string, from: DivisionId, to: DivisionId | null, reason: string) => {
    if (!teamId || moves.some(m => m.teamId === teamId)) return;
    moves.push({ teamId, from, to, reason });
    rosters[from] = (rosters[from] ?? []).filter(id => id !== teamId);
    if (to) rosters[to] = Array.from(new Set([...(rosters[to] ?? []), teamId]));
  };

  // 1) Primera División: 1 anual + 1 promedio; si coinciden, el descenso anual
  // se corre al 29º.
  const pd = results.get("primera_division")!;
  const annual = sortStandings(pd.standings);
  const annualBottom = annual.at(-1)?.teamId;
  const averageBottom = buildAverageTableForSeasonHistory(currentState, pd.standings).at(-1)?.teamId;
  const annualDrop = annualBottom && annualBottom === averageBottom ? annual.at(-2)?.teamId : annualBottom;
  if (annualDrop) move(annualDrop, "primera_division", "primera_nacional", "Descenso · último de la Tabla Anual");
  if (averageBottom) move(averageBottom, "primera_division", "primera_nacional", "Descenso · último de la Tabla de Promedios");

  // 2) Primera Nacional: 1er ascenso por final de zona + 2º por Reducido; 2 últimos
  // de cada zona descienden y cada club conserva su circuito de afiliación.
  const pn = results.get("primera_nacional")!;
  const za = sortStandings(pn.standingsByZone.A ?? []), zb = sortStandings(pn.standingsByZone.B ?? []);
  const pnResolved = resolveDivisionSeason("primera_nacional", snapshotRosters.primera_nacional ?? [], pn.standings, { A: za, B: zb }, pn.matches);
  if (pnResolved.promoted[0]) move(pnResolved.promoted[0], "primera_nacional", "primera_division", "Ascenso · ganador de la final por el 1er ascenso");
  if (pnResolved.promoted[1]) move(pnResolved.promoted[1], "primera_nacional", "primera_division", "Ascenso · ganador del Reducido (2º ascenso)");
  for (const row of [...za.slice(-2), ...zb.slice(-2)]) {
    const aff = nationalAffiliation(row.teamId);
    move(row.teamId, "primera_nacional", aff === "metropolitano" ? "primera_b" : "federal_a",
      aff === "metropolitano" ? "Descenso · Primera B Metropolitana" : "Descenso · Federal A");
  }

  // 3) Primera B Metropolitana: 1º campeón + ganador del Reducido 2º-9º;
  // últimos dos a C.
  const pb = results.get("primera_b")!;
  const pbRes = resolveDivisionSeason("primera_b", snapshotRosters.primera_b ?? [], pb.standings, { A: pb.standings }, pb.matches);
  if (pbRes.promoted[0]) move(pbRes.promoted[0], "primera_b", "primera_nacional", "Ascenso · campeón de Primera B Metropolitana");
  if (pbRes.promoted[1]) move(pbRes.promoted[1], "primera_b", "primera_nacional", "Ascenso · ganador del Reducido (2º-9º)");
  for (const id of pbRes.relegated) move(id, "primera_b", "primera_c", "Descenso · últimos 2 de Primera B Metropolitana");

  // 4) Primera C: dos zonas, final entre líderes y Reducido (2º-7º + perdedor de final).
  // Primera C desciende al Promocional Amateur dentro del circuito metropolitano.
  const pc = results.get("primera_c")!;
  const pcRes = resolveDivisionSeason("primera_c", snapshotRosters.primera_c ?? [], pc.standings, pc.standingsByZone, pc.matches);
  if (pcRes.promoted[0]) move(pcRes.promoted[0], "primera_c", "primera_b", "Ascenso · ganador de la final de Primera C");
  if (pcRes.promoted[1]) move(pcRes.promoted[1], "primera_c", "primera_b", "Ascenso · ganador del Reducido de Primera C");
  const cBottom = sortStandings(pc.standings).at(-1)?.teamId;
  if (cBottom) move(cBottom, "primera_c", "promocional_amateur", "Descenso · último de Primera C → Promocional Amateur");

  // 5) Promocional Amateur: 1° de cada zona -> final; segundo camino por Reducido.
  // La fuente no especifica descenso del Promocional. Los dos equipos que ascienden
  // se mueven realmente a Primera C.
  const promo = results.get("promocional_amateur");
  if (promo) {
    const promoRes = resolveDivisionSeason("promocional_amateur", snapshotRosters.promocional_amateur ?? [], promo.standings, promo.standingsByZone, promo.matches, promo.zoneMap);
    if (promoRes.promoted[0]) move(promoRes.promoted[0], "promocional_amateur", "primera_c", "Ascenso · ganador de la final del Promocional Amateur");
    if (promoRes.promoted[1]) move(promoRes.promoted[1], "promocional_amateur", "primera_c", "Ascenso · ganador del Reducido del Promocional Amateur");
  }

  // 5) Federal A: Fase 1 10+9+9+9; luego 18 al Campeonato, 19 a Reválida.
  // Campeón del carril y ganador de Reválida ascienden; últimos 4 de Reválida bajan.
  const fa = results.get("federal_a")!;
  const faRes = resolveDivisionSeason("federal_a", snapshotRosters.federal_a ?? [], fa.standings, fa.standingsByZone, fa.matches, fa.zoneMap);
  if (faRes.promoted[0]) move(faRes.promoted[0], "federal_a", "primera_nacional", "Ascenso · ganador Zona Campeonato / 1er ascenso");
  if (faRes.promoted[1]) move(faRes.promoted[1], "federal_a", "primera_nacional", "Ascenso · ganador Fase Reválida / 2º ascenso");
  for (const id of faRes.relegated) move(id, "federal_a", "regional_federal_amateur", "Descenso · últimos 4 de la Fase Reválida");

  // 6) Regional Amateur: 8 campeones regionales -> 4 finales nacionales -> 4 ascensos.
  const regionalRoster = snapshotRosters.regional_federal_amateur ?? [];
  const regional = simulateRegionalTournament(regionalRoster);
  for (const id of regional.promotedToFederalA) move(id, "regional_federal_amateur", "federal_a", "Ascenso · ganador de final nacional del Regional Federal Amateur");

  const userId = currentState.userTeamId;
  const userMove = userId ? moves.find(m => m.teamId === userId) : undefined;
  return { rosters, movements: moves, userNextDivision: userMove?.to ?? currentDivision, ended: false };
}

function buildAverageTableForSeasonHistory(state: CareerState, currentStandings: StandingRow[]): AverageRow[] {
  const snapshots = (state.seasonHistory ?? []).filter(s => s.division === "primera_division").sort((a, b) => b.season - a.season).slice(0, 2);
  const all = [{ season: Number.MAX_SAFE_INTEGER, division: "primera_division" as const, standings: currentStandings }, ...snapshots];
  const map = new Map<string, { seasons: number; pj: number; pts: number; dg: number }>();
  for (const snap of all) for (const row of snap.standings) {
    const v = map.get(row.teamId) ?? { seasons: 0, pj: 0, pts: 0, dg: 0 };
    v.seasons++; v.pj += row.pj; v.pts += row.pts; v.dg += row.dg; map.set(row.teamId, v);
  }
  return [...map.entries()].map(([teamId, v]) => ({ teamId, seasons: v.seasons, pj: v.pj, pts: v.pts, avgPtsPerMatch: v.pj ? Number((v.pts / v.pj).toFixed(2)) : 0, dg: v.dg })).sort((a, b) => b.avgPtsPerMatch - a.avgPtsPerMatch || b.pts - a.pts || b.dg - a.dg);
}

export function recordSeasonSnapshot(state: CareerState, season: number): CareerState {
  if (!isSeasonFinished(state)) return state;
  const division = careerDivision(state);
  const snapshot: SeasonSnapshot = {
    season, division, standings: combinedStandings(state).map(r => ({ ...r })),
  };
  const previous = (state.seasonHistory ?? []).filter(s => !(s.season === season && s.division === division));
  return { ...state, seasonHistory: [...previous, snapshot].sort((a, b) => a.season - b.season) };
}

export function buildAverageTable(state: CareerState, division: DivisionId = careerDivision(state)): AverageRow[] {
  const snapshots = (state.seasonHistory ?? [])
    .filter(s => s.division === division)
    .sort((a, b) => b.season - a.season);
  if (isSeasonFinished(state) && careerDivision(state) === division) {
    snapshots.unshift({
      season: Number.MAX_SAFE_INTEGER,
      division,
      standings: combinedStandings(state).map(r => ({ ...r })),
    });
  }
  const lastThree = snapshots.slice(0, 3);
  const map = new Map<string, { seasons: number; pj: number; pts: number; dg: number }>();
  for (const snap of lastThree) {
    for (const row of snap.standings) {
      const cur = map.get(row.teamId) ?? { seasons: 0, pj: 0, pts: 0, dg: 0 };
      cur.seasons += 1;
      cur.pj += row.pj;
      cur.pts += row.pts;
      cur.dg += row.dg;
      map.set(row.teamId, cur);
    }
  }
  return [...map.entries()]
    .map(([teamId, v]) => ({
      teamId, seasons: v.seasons, pj: v.pj, pts: v.pts,
      avgPtsPerMatch: v.pj ? Number((v.pts / v.pj).toFixed(2)) : 0, dg: v.dg,
    }))
    .sort((a, b) => b.avgPtsPerMatch - a.avgPtsPerMatch || b.pts - a.pts || b.dg - a.dg);
}

export type RelegationDetail = {
  teamId: string;
  reason: string;
};

export function firstDivisionRelegationDetails(state: CareerState): RelegationDetail[] {
  if (!isFirstDivision(state) || !isSeasonFinished(state)) return [];
  const annual = combinedStandings(state);
  const annualBottom = annual[annual.length - 1]?.teamId;
  const annualFallback = annual[annual.length - 2]?.teamId;
  const averages = buildAverageTable(state, "primera_division");
  const averageBottom = averages[averages.length - 1]?.teamId;
  const annualRelegated = annualBottom && annualBottom === averageBottom ? annualFallback : annualBottom;
  const details: RelegationDetail[] = [];
  if (annualRelegated) {
    details.push({
      teamId: annualRelegated,
      reason: annualBottom === averageBottom
        ? "29° en tabla anual: reemplaza al último porque el mismo club también terminó último en promedios"
        : "Último en la tabla anual",
    });
  }
  if (averageBottom) details.push({ teamId: averageBottom, reason: "Peor promedio histórico (PTS/PJ)" });
  return details.filter((v, i, arr) => arr.findIndex(x => x.teamId === v.teamId) === i);
}

export function firstDivisionRelegated(state: CareerState): string[] {
  return firstDivisionRelegationDetails(state).map(r => r.teamId);
}

// Para las categorías sin promedio, los puestos de descenso se determinan por
// la tabla de la temporada. En Primera Nacional hay dos circuitos de destino
// y el reglamento reparte cuatro descensos entre afiliaciones; por eso la UI
// muestra la regla y no inventa una asignación cuando no existe ese dato en Team.
export function divisionRelegationCandidates(state: CareerState): string[] {
  if (!isSeasonFinished(state)) return [];
  const division = careerDivision(state);
  if (division === "primera_division") return firstDivisionRelegated(state);
  if (division === "primera_nacional") {
    const result = simulateDivisionSeasonCore(division, rosterFor(state.leagueRosters, division), state);
    const a = sortStandings(result.standingsByZone.A ?? []);
    const b = sortStandings(result.standingsByZone.B ?? []);
    return [...a.slice(-2), ...b.slice(-2)].map(r => r.teamId);
  }
  if (division === "primera_b") return sortStandings(state.standings).slice(-2).map(r => r.teamId);
  if (division === "primera_c") return [sortStandings(state.standings).at(-1)?.teamId].filter(Boolean) as string[];
  if (division === "regional_federal_amateur") return [];
  const roster = rosterFor(state.leagueRosters, division);
  const result = simulateDivisionSeasonCore(division, roster, state);
  const resolved = resolveDivisionSeason(division, roster, result.standings, result.standingsByZone, result.matches, result.zoneMap);
  return resolved.relegated;
}

export function divisionPromotionCandidates(state: CareerState): string[] {
  if (!isSeasonFinished(state)) return [];
  const division = careerDivision(state);
  const roster = rosterFor(state.leagueRosters, division);
  const result = simulateDivisionSeasonCore(division, roster, state);
  const resolved = resolveDivisionSeason(division, roster, result.standings, result.standingsByZone, result.matches, result.zoneMap);
  return resolved.promoted;
}

export function promoteFromPrimeraNacional(state: CareerState): boolean {
  if (careerDivision(state) !== "primera_nacional" || !isSeasonFinished(state)) return false;
  return seasonChampion(state) === sortStandings(state.standings)[0]?.teamId;
}

// ============ Ingresos & corrupción ============
export function incomeMultiplier(state: CareerState): number {
  let mult = 1;
  const up = state.stadiumUpgrades;
  if (up) for (const opt of STADIUM_UPGRADE_CATALOG) if (up[opt.key]) mult += opt.incomeBonusPct / 100;
  if (state.incomePenalty) mult *= 1 - state.incomePenalty.pct / 100;
  return Math.max(0.05, mult);
}

export function currentCorruptionEffects(state: CareerState): {
  startingScore?: { h: number; a: number };
  cancelOpponentGoals?: number;
  doubleGoalChance?: number;
} {
  const ac = state.activeCorruption;
  if (!ac || ac.matchesLeft <= 0) return {};
  const opt = CORRUPTION_CATALOG.find(o => o.kind === ac.kind);
  return opt?.effects ?? {};
}

export function buyUpgrade(state: CareerState, budget: number, key: StadiumUpgradeKey):
  { state: CareerState; budget: number; ok: boolean; error?: string } {
  const opt = STADIUM_UPGRADE_CATALOG.find(o => o.key === key);
  if (!opt) return { state, budget, ok: false, error: "Mejora desconocida" };
  if (state.stadiumUpgrades?.[key]) return { state, budget, ok: false, error: "Ya la tenés" };
  if (budget < opt.cost) return { state, budget, ok: false, error: "Sin presupuesto" };
  const upgrades = { ...(state.stadiumUpgrades ?? { capacity: false, pitch: false, vip: false, led: false }) };
  upgrades[key] = true;
  return { state: { ...state, stadiumUpgrades: upgrades }, budget: budget - opt.cost, ok: true };
}

export function activateCorruption(state: CareerState, budget: number, kind: CorruptionKind):
  { state: CareerState; budget: number; ok: boolean; error?: string } {
  const opt = CORRUPTION_CATALOG.find(o => o.kind === kind);
  if (!opt) return { state, budget, ok: false, error: "Opción desconocida" };
  if (state.activeCorruption && state.activeCorruption.matchesLeft > 0)
    return { state, budget, ok: false, error: "Ya hay un arreglo activo" };
  if (budget < opt.cost) return { state, budget, ok: false, error: "Sin presupuesto" };
  return {
    state: {
      ...state,
      activeCorruption: { kind: opt.kind, matchesLeft: opt.matches },
      incomePenalty: { pct: opt.penaltyPct, matchesLeft: opt.matches },
    },
    budget: budget - opt.cost, ok: true,
  };
}

export function tickCorruption(state: CareerState): CareerState {
  const next = { ...state };
  if (next.activeCorruption && next.activeCorruption.matchesLeft > 0) {
    const left = next.activeCorruption.matchesLeft - 1;
    next.activeCorruption = left > 0 ? { ...next.activeCorruption, matchesLeft: left } : null;
  }
  if (next.incomePenalty && next.incomePenalty.matchesLeft > 0) {
    const left = next.incomePenalty.matchesLeft - 1;
    next.incomePenalty = left > 0 ? { ...next.incomePenalty, matchesLeft: left } : null;
  }
  return next;
}

// Avanza simulando todos los partidos NO jugados de una fecha (excepto los del usuario).
export function simulateRoundExceptUser(state: CareerState, round: number, userTeamId: string): CareerState {
  const next = { ...state, matches: [...state.matches], standings: [...state.standings] };
  for (let i = 0; i < next.matches.length; i++) {
    const m = next.matches[i];
    if (m.round !== round || m.played) continue;
    if (m.home === userTeamId || m.away === userTeamId) continue;
    const { hg, ag } = simulateMatch(m.home, m.away);
    const played = { ...m, played: true, homeGoals: hg, awayGoals: ag };
    next.matches[i] = played;
    next.standings = applyMatchToStandings(next.standings, played);
  }
  return next;
}

export function recordUserMatch(state: CareerState, matchId: string, hg: number, ag: number, userTeamId: string): CareerState {
  const next = { ...state, matches: [...state.matches], standings: [...state.standings] };
  const idx = next.matches.findIndex(m => m.id === matchId);
  if (idx < 0) return state;
  const played = { ...next.matches[idx], played: true, homeGoals: hg, awayGoals: ag };
  next.matches[idx] = played;
  next.standings = applyMatchToStandings(next.standings, played);
  // stats
  const userIsHome = played.home === userTeamId;
  const myGoals = userIsHome ? hg : ag;
  const oppGoals = userIsHome ? ag : hg;
  next.totalGoalsScored = state.totalGoalsScored + myGoals;
  if (myGoals >= oppGoals) {
    next.streakUnbeaten = state.streakUnbeaten + 1;
    next.bestUnbeaten = Math.max(state.bestUnbeaten, next.streakUnbeaten);
  } else {
    next.streakUnbeaten = 0;
  }
  return next;
}

export function nextPendingMatchForUser(state: CareerState, userTeamId: string): Match | null {
  return state.matches.find(m => !m.played && (m.home === userTeamId || m.away === userTeamId)) ?? null;
}

export function isSeasonFinished(state: CareerState): boolean {
  return state.matches.every(m => m.played);
}

export function seasonChampion(state: CareerState): string | null {
  const sorted = sortStandings(state.standings);
  return sorted[0]?.teamId ?? null;
}

// Bonus de presupuesto por resultado del usuario.
export function budgetReward(myGoals: number, oppGoals: number): number {
  if (myGoals > oppGoals) return 50 + myGoals * 5;
  if (myGoals === oppGoals) return 20;
  return 5;
}

export function teamOf(id: string | undefined | null): Team | undefined {
  return id ? getTeamById(id) : undefined;
}

// ============ Indicadores del club (para el panel de Modo Carrera) ============
export type ClubIndicator = { key: string; label: string; icon: string; value: number; hint: string };

export function clubIndicators(state: CareerState, budget: number, userTeamId: string): ClubIndicator[] {
  const table = sortStandings(state.standings);
  const pos = Math.max(0, table.findIndex(r => r.teamId === userTeamId));
  const total = Math.max(1, table.length - 1);
  const posScore = Math.round(100 - (pos / total) * 100);
  const upgrades = state.stadiumUpgrades ?? { capacity: false, pitch: false, vip: false, led: false };
  const upgradeCount = Object.values(upgrades).filter(Boolean).length;
  const infra = Math.round((upgradeCount / STADIUM_UPGRADE_CATALOG.length) * 100);
  const eco = clamp01to100((budget / 3000) * 100);
  const corr = state.activeCorruption && state.activeCorruption.matchesLeft > 0
    ? clamp01to100(40 + state.activeCorruption.matchesLeft * 4) : 10;
  const moral = clamp01to100(30 + state.streakUnbeaten * 10 + (posScore - 50) * 0.4);
  const hinchada = clamp01to100(posScore * 0.7 + infra * 0.3);

  return [
    { key: "economia", label: "Economía", icon: "💰", value: eco, hint: `$${budget} en caja` },
    { key: "influencia", label: "Influencia", icon: "🤝", value: corr, hint: state.activeCorruption?.matchesLeft ? "Arreglo activo" : "Sin arreglos" },
    { key: "moral", label: "Moral del plantel", icon: "🔥", value: moral, hint: `${state.streakUnbeaten} fechas invicto` },
    { key: "hinchada", label: "Hinchada", icon: "📣", value: hinchada, hint: `${pos + 1}° en la zona` },
    { key: "infraestructura", label: "Infraestructura", icon: "🏟️", value: infra, hint: `${upgradeCount}/${STADIUM_UPGRADE_CATALOG.length} mejoras` },
  ];
}

function clamp01to100(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }

// Fecha actual = la primera con partidos pendientes.
export function currentRound(state: CareerState): number {
  const pending = state.matches.filter(m => !m.played);
  if (pending.length === 0) return Math.max(...state.matches.map(m => m.round), 1);
  return Math.min(...pending.map(m => m.round));
}

export function totalRounds(state: CareerState): number {
  return state.matches.reduce((max, m) => Math.max(max, m.round), 0);
}
