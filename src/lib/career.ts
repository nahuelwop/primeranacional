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

export type TeamRating = { speed: number; jump: number; power: number; defense: number };
export type TeamRatings = Record<string, TeamRating>;

export type ClubDevelopment = {
  academy: number;
  training: number;
  scouting: number;
  medical: number;
  marketing: number;
  analytics: number;
};

export const CLUB_DEVELOPMENT_CATALOG: Array<{
  key: keyof ClubDevelopment;
  name: string;
  desc: string;
  costs: number[];
}> = [
  { key: "academy", name: "Cantera", desc: "Mejora gradual del potencial y reduce la caída de rendimiento entre temporadas.", costs: [500, 900, 1500] },
  { key: "training", name: "Centro de entrenamiento", desc: "Mayor crecimiento de stats cuando la temporada es buena.", costs: [600, 1100, 1800] },
  { key: "scouting", name: "Red de scouting", desc: "Hace más estables las renovaciones de stats y beneficia a clubes con buenos resultados.", costs: [450, 850, 1400] },
  { key: "medical", name: "Centro médico", desc: "Aumenta la estabilidad del plantel y evita bajones fuertes.", costs: [550, 1000, 1600] },
  { key: "marketing", name: "Departamento de marketing", desc: "+8% ingresos por nivel y mejor caja al ganar partidos.", costs: [400, 800, 1300] },
  { key: "analytics", name: "Departamento de análisis", desc: "Pequeño bono de rendimiento en simulaciones y menor azar.", costs: [650, 1200, 1900] },
];

export type CareerState = {
  pendingPlayoff?: { division: DivisionId; season: number };
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
  teamRatings?: TeamRatings;
  clubDevelopment?: ClubDevelopment;
  totalMatchesPlayed?: number;
  totalWins?: number;
  totalDraws?: number;
  totalLosses?: number;
  careerTrophies?: number;
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

const DEFAULT_DEVELOPMENT: ClubDevelopment = { academy: 0, training: 0, scouting: 0, medical: 0, marketing: 0, analytics: 0 };

export function initialTeamRatings(teamIds: string[] = getTeamsByDivision("primera_nacional").map(t => t.id)): TeamRatings {
  const out: TeamRatings = {};
  for (const id of teamIds) {
    const t = getTeamById(id);
    if (!t) continue;
    out[id] = { speed: t.stats.speed, jump: t.stats.jump, power: t.stats.power, defense: t.stats.defense };
  }
  return out;
}

function normalizeRating(v: number): number { return Math.max(50, Math.min(95, Math.round(v))); }

function ratingWithBase(base: TeamRating, prior?: TeamRating): TeamRating {
  return prior ?? { ...base };
}

function allCareerRows(state: CareerState): StandingRow[] {
  return combinedStandings(state);
}

export function evolveTeamRatings(
  state: CareerState,
  promotedIds: string[] = [],
  relegatedIds: string[] = [],
  performanceRows?: Record<string, StandingRow>,
): TeamRatings {
  const current = { ...(state.teamRatings ?? {}) } as TeamRatings;
  const ratings = initialTeamRatings(Object.keys(state.leagueRosters ?? {}).flatMap(d => rosterFor(state.leagueRosters, d as DivisionId)));
  const rosters = Object.values(state.leagueRosters ?? {}).flatMap(x => x ?? []);
  for (const id of rosters) if (!ratings[id]) ratings[id] = current[id] ?? initialTeamRatings([id])[id];
  const rows = performanceRows ? Object.values(performanceRows) : allCareerRows(state);
  const rowMap = new Map(rows.map(r => [r.teamId, r]));
  const avg = rows.length ? rows.reduce((n, r) => n + r.pts / Math.max(1, r.pj), 0) / rows.length : 1.1;
  const dev = { ...DEFAULT_DEVELOPMENT, ...(state.clubDevelopment ?? {}) };
  for (const id of rosters) {
    const t = getTeamById(id);
    if (!t) continue;
    const base = ratingWithBase(t.stats, current[id] ?? ratings[id]);
    const row = rowMap.get(id);
    const ppg = row ? row.pts / Math.max(1, row.pj) : avg;
    let delta = (ppg - avg) * 1.8;
    if (ppg >= 1.65) delta += 0.8;
    else if (ppg <= 0.65) delta -= 0.8;
    delta += dev.academy * 0.20 + dev.training * 0.35 + dev.scouting * 0.15 + dev.medical * 0.10;
    if (promotedIds.includes(id)) delta += 0.7;
    if (relegatedIds.includes(id)) delta -= 0.5;
    const variance = dev.scouting >= 2 ? 0.15 : 0.35;
    const jitter = (Math.random() - 0.5) * variance;
    const next = (Object.keys(base) as Array<keyof TeamRating>).reduce((acc, k) => ({ ...acc, [k]: normalizeRating(base[k] + delta + jitter) }), {} as TeamRating);
    current[id] = next;
  }
  return current;
}

export function applyTeamRatingsTemporarily<T>(ratings: TeamRatings | undefined, fn: () => T): T {
  if (!ratings || Object.keys(ratings).length === 0) return fn();
  const originals = new Map<string, TeamRating>();
  for (const [id, rating] of Object.entries(ratings)) {
    const t = getTeamById(id);
    if (!t) continue;
    originals.set(id, { ...t.stats });
    t.stats = { ...rating };
  }
  try { return fn(); }
  finally {
    for (const [id, rating] of originals) {
      const t = getTeamById(id);
      if (t) t.stats = { ...rating };
    }
  }
}

export function buyDevelopment(state: CareerState, budget: number, key: keyof ClubDevelopment) {
  const dev = { ...DEFAULT_DEVELOPMENT, ...(state.clubDevelopment ?? {}) };
  const level = dev[key] ?? 0;
  const option = CLUB_DEVELOPMENT_CATALOG.find(x => x.key === key);
  if (!option || level >= option.costs.length) return { state, budget, ok: false, error: "Ya alcanzaste el nivel máximo" };
  const cost = option.costs[level];
  if (budget < cost) return { state, budget, ok: false, error: "Sin presupuesto suficiente" };
  dev[key] = level + 1;
  return { state: { ...state, clubDevelopment: dev }, budget: budget - cost, ok: true };
}

export function developmentIncomeBonus(state: CareerState): number {
  return 1 + ((state.clubDevelopment?.marketing ?? 0) * 0.08);
}

export function checkCareerAchievementKeys(state: CareerState, budget: number): string[] {
  const teamId = state.userTeamId;
  if (!teamId) return [];
  const matches = state.matches.filter(m => m.played && (m.home === teamId || m.away === teamId));
  const wins = matches.filter(m => {
    const mine = m.home === teamId ? m.homeGoals ?? 0 : m.awayGoals ?? 0;
    const opp = m.home === teamId ? m.awayGoals ?? 0 : m.homeGoals ?? 0;
    return mine > opp;
  }).length;
  const cleanSheets = matches.filter(m => (m.home === teamId ? m.awayGoals : m.homeGoals) === 0).length;
  const titleCount = (state.seasonHistory ?? []).filter(s => s.standings[0]?.teamId === teamId).length;
  const devTotal = Object.values(state.clubDevelopment ?? DEFAULT_DEVELOPMENT).reduce((a, b) => a + b, 0);
  const keys: string[] = [];
  const add = (ok: boolean, key: string) => { if (ok) keys.push(key); };
  add(matches.length >= 1, "debut_carrera");
  add(wins >= 1, "primera_victoria");
  add(wins >= 10, "10_victorias");
  add(wins >= 25, "25_victorias");
  add(wins >= 50, "50_victorias");
  add(state.totalGoalsScored >= 100, "100_goles");
  add(state.totalGoalsScored >= 250, "250_goles");
  add(state.totalGoalsScored >= 500, "500_goles");
  add(state.bestUnbeaten >= 10, "10_invicto");
  add(state.bestUnbeaten >= 20, "20_invicto");
  add(cleanSheets >= 10, "10_vallas_invictas");
  add(titleCount >= 1, "primer_titulo");
  add(titleCount >= 3, "tres_titulos");
  add((state.careerTrophies ?? 0) >= 5, "5_trofeos");
  add(budget >= 5000, "caja_5000");
  add(budget >= 15000, "caja_15000");
  add(budget >= 30000, "caja_30000");
  add(devTotal >= 3, "proyecto_club");
  add(devTotal >= 8, "club_de_primera");
  add(state.activeCorruption?.kind === "seca_nuca", "seca_nuca");
  return keys;
}

function rostersForAll(rosters: Partial<Record<DivisionId, string[]>>): string[] { return Array.from(new Set(Object.values(rosters).flatMap(x => x ?? []))); }

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
  let otherMatches: Match[] | undefined = fixture.otherMatches.length > 0 ? fixture.otherMatches.map(m => ({ ...m })) : undefined;

  if (fixture.otherMatches.length > 0) {
    const activeSet = new Set(fixture.activeTeamIds);
    const otherIds = Array.from(new Set(fixture.otherMatches.flatMap(m => [m.home, m.away]).filter(id => !activeSet.has(id))));
    if (otherIds.length) otherStandings = emptyStandings(otherIds);
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
    teamRatings: initialTeamRatings(rostersForAll(rosters)),
    clubDevelopment: { ...DEFAULT_DEVELOPMENT },
    totalMatchesPlayed: 0, totalWins: 0, totalDraws: 0, totalLosses: 0, careerTrophies: 0,
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
  const source = applyTeamRatingsTemporarily(userState?.teamRatings, () => simulateDivisionSeasonEngine(division, roster, userState ? {
    zone: userState.zone, standings: userState.standings, otherStandings: userState.otherStandings,
    matches: userState.matches, otherMatches: userState.otherMatches, federalZoneMap: userState.federalZoneMap,
  } : undefined));
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
export function resolveLeagueMovements(currentState: CareerState, season: number, userPlayoffResult?: { promoted: boolean }): {
  rosters: Partial<Record<DivisionId, string[]>>;
  movements: LeagueMovement[];
  userNextDivision: DivisionId | null;
  ended: boolean;
  endReason?: string;
  teamRatings?: TeamRatings;
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
  const userIdForPlayoff = currentState.userTeamId;
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
  if (userId && userPlayoffResult === undefined && getCareerPlayoffNeed(currentState, userId)) {
    // El club del usuario no puede cambiar de división por un playoff que todavía
    // no disputó. Quitamos cualquier movimiento automático generado por la
    // simulación global y devolvemos la categoría actual.
    for (let i = moves.length - 1; i >= 0; i--) {
      if (moves[i].teamId === userId) {
        const m = moves[i];
        rosters[m.from] = Array.from(new Set([...(rosters[m.from] ?? []), userId]));
        if (m.to) rosters[m.to] = (rosters[m.to] ?? []).filter(id => id !== userId);
        moves.splice(i, 1);
      }
    }
  } else if (userId && userPlayoffResult !== undefined) {
    // Reemplazamos el resultado automático del usuario por el resultado real del
    // Reducido/Final que acaba de disputar.
    for (let i = moves.length - 1; i >= 0; i--) {
      if (moves[i].teamId === userId) {
        const m = moves[i];
        rosters[m.from] = Array.from(new Set([...(rosters[m.from] ?? []), userId]));
        if (m.to) rosters[m.to] = (rosters[m.to] ?? []).filter(id => id !== userId);
        moves.splice(i, 1);
      }
    }
    if (userPlayoffResult.promoted) {
      const target = currentDivision === "primera_b" ? "primera_nacional"
        : currentDivision === "primera_c" ? "primera_b"
        : currentDivision === "promocional_amateur" ? "primera_c"
        : currentDivision === "primera_nacional" ? "primera_division"
        : null;
      if (target) {
        rosters[currentDivision] = (rosters[currentDivision] ?? []).filter(id => id !== userId);
        rosters[target] = Array.from(new Set([...(rosters[target] ?? []), userId]));
        moves.push({ teamId: userId, from: currentDivision, to: target, reason: `Ascenso · resolución del playoff de ${COMPETITIONS[currentDivision].name}` });
      }
    }
  }
  const userMove = userId ? moves.find(m => m.teamId === userId) : undefined;
  const promotedIds = moves.filter(m => m.to && ["primera_nacional", "primera_division", "primera_b", "primera_c", "federal_a"].includes(m.to)).map(m => m.teamId);
  const relegatedIds = moves.filter(m => /descenso/i.test(m.reason)).map(m => m.teamId);
  const performanceRows: Record<string, StandingRow> = {};
  for (const result of results.values()) {
    for (const row of result.standings) performanceRows[row.teamId] = row;
  }
  const nextRatings = evolveTeamRatings(currentState, promotedIds, relegatedIds, performanceRows);
  return { rosters, movements: moves, userNextDivision: userMove?.to ?? currentDivision, ended: false, teamRatings: nextRatings };
}

export function getCareerPlayoffNeed(state: CareerState, teamId: string): { division: DivisionId } | null {
  if (!isSeasonFinished(state)) return null;
  const division = careerDivision(state, teamId);
  if (division === "primera_nacional") {
    const z = state.zone || "A";
    const rows = sortStandings(z === "A" ? state.standings : (state.otherStandings ?? []));
    const pos = rows.findIndex(r => r.teamId === teamId) + 1;
    if (pos >= 1 && pos <= 8) return { division };
  }
  if (division === "primera_b") {
    const pos = sortStandings(state.standings).findIndex(r => r.teamId === teamId) + 1;
    if (pos >= 2 && pos <= 9) return { division };
  }
  if (division === "primera_c" || division === "promocional_amateur") {
    const zoneMap = state.federalZoneMap ?? {};
    const z = zoneMap[teamId] ?? state.zone;
    const rows = sortStandings(z === "B" ? (state.otherStandings ?? []) : state.standings);
    const pos = rows.findIndex(r => r.teamId === teamId) + 1;
    if (division === "promocional_amateur" && pos >= 1 && pos <= 4) return { division };
    if (division === "primera_c" && pos >= 1 && pos <= 7) return { division };
  }
  if (division === "regional_federal_amateur") {
    const rows = sortStandings(state.standings);
    const pos = rows.findIndex(r => r.teamId === teamId) + 1;
    if (pos >= 1 && pos <= 2) return { division };
  }
  return null;
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
  return applyTeamRatingsTemporarily(state.teamRatings, () => {
  const next = {
    ...state,
    matches: [...state.matches],
    standings: [...state.standings],
    otherMatches: state.otherMatches ? [...state.otherMatches] : state.otherMatches,
    otherStandings: state.otherStandings ? [...state.otherStandings] : state.otherStandings,
  };
  for (let i = 0; i < next.matches.length; i++) {
    const m = next.matches[i];
    if (m.round !== round || m.played) continue;
    if (m.home === userTeamId || m.away === userTeamId) continue;
    const { hg, ag } = simulateMatch(m.home, m.away);
    const played = { ...m, played: true, homeGoals: hg, awayGoals: ag };
    next.matches[i] = played;
    next.standings = applyMatchToStandings(next.standings, played);
  }
  // La otra zona (o los interzonales) avanzan EN PARALELO con la tuya, ronda por
  // ronda — antes se resolvían todos de una al arrancar la temporada, y por eso
  // la Zona B ya aparecía terminada desde el primer partido.
  if (next.otherMatches && next.otherMatches.length > 0) {
    const activeIds = new Set(next.standings.map(r => r.teamId));
    for (let i = 0; i < next.otherMatches.length; i++) {
      const m = next.otherMatches[i];
      if (m.round !== round || m.played) continue;
      const { hg, ag } = simulateMatch(m.home, m.away);
      const played = { ...m, played: true, homeGoals: hg, awayGoals: ag };
      next.otherMatches[i] = played;
      // Si participa un equipo de tu propia zona (partido interzonal), suma también ahí.
      if (activeIds.has(played.home) || activeIds.has(played.away)) {
        next.standings = applyMatchToStandings(next.standings, played);
      }
      if (next.otherStandings) {
        next.otherStandings = applyMatchToStandings(next.otherStandings, played);
      }
    }
  }
  return next;
  });
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
  next.totalMatchesPlayed = (state.totalMatchesPlayed ?? 0) + 1;
  next.totalWins = (state.totalWins ?? 0) + (myGoals > oppGoals ? 1 : 0);
  next.totalDraws = (state.totalDraws ?? 0) + (myGoals === oppGoals ? 1 : 0);
  next.totalLosses = (state.totalLosses ?? 0) + (myGoals < oppGoals ? 1 : 0);
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

export function catchUpOtherMatches(state: CareerState): CareerState {
  if (!state.otherMatches || state.otherMatches.every(m => m.played)) return state;
  return applyTeamRatingsTemporarily(state.teamRatings, () => catchUpOtherMatchesInternal(state));
}

function catchUpOtherMatchesInternal(state: CareerState): CareerState {
  // Salvaguarda: si tu fixture ya terminó pero a la otra zona le quedan partidos
  // sin jugar (por ejemplo, por numeración de rondas distinta en interzonales),
  // los resolvemos acá para que la temporada nunca quede trabada esperando algo
  // que ya no le corresponde a vos jugar en tiempo real.
  if (!state.matches.every(m => m.played)) return state;
  const next = {
    ...state,
    otherMatches: [...state.otherMatches],
    otherStandings: state.otherStandings ? [...state.otherStandings] : state.otherStandings,
    standings: [...state.standings],
  };
  const activeIds = new Set(next.standings.map(r => r.teamId));
  for (let i = 0; i < next.otherMatches.length; i++) {
    const m = next.otherMatches[i];
    if (m.played) continue;
    const { hg, ag } = simulateMatch(m.home, m.away);
    const played = { ...m, played: true, homeGoals: hg, awayGoals: ag };
    next.otherMatches[i] = played;
    if (activeIds.has(played.home) || activeIds.has(played.away)) {
      next.standings = applyMatchToStandings(next.standings, played);
    }
    if (next.otherStandings) next.otherStandings = applyMatchToStandings(next.otherStandings, played);
  }
  return next;
}

export function isSeasonFinished(state: CareerState): boolean {
  return state.matches.every(m => m.played) && (!state.otherMatches || state.otherMatches.every(m => m.played));
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

/**
 * Equipo para disputar un partido dentro de una carrera. A diferencia de
 * getTeamById(), aplica los ratings evolucionados de la temporada actual sin
 * mutar el catálogo global. Así los cambios de stats realmente se ven y
 * afectan al gameplay en la temporada siguiente.
 */
export function careerTeam(state: CareerState | null | undefined, id: string): Team | undefined {
  const base = getTeamById(id);
  if (!base) return undefined;
  const rating = state?.teamRatings?.[id];
  return rating ? { ...base, stats: { ...rating } } : { ...base, stats: { ...base.stats } };
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
