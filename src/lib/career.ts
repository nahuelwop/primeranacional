import { TEAMS_BY_ID, ZONE_A, ZONE_B, type Team } from "@/data/teams";
import { generateRoundRobin, simulateMatch, emptyStandings, applyMatchToStandings, sortStandings, type Match, type StandingRow } from "@/lib/tournament";

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

export type CareerState = {
  zone: "A" | "B";
  matches: Match[];           // partidos de la zona del usuario
  standings: StandingRow[];   // tabla del usuario
  otherStandings?: StandingRow[]; // tabla de la otra zona (simulada)
  otherMatches?: Match[];         // partidos de la otra zona
  totalGoalsScored: number;
  streakUnbeaten: number;
  bestUnbeaten: number;
  zoneChampions: { season: number; zone: "A" | "B"; teamId: string }[];
  stadiumUpgrades?: StadiumUpgrades;
  activeCorruption?: ActiveCorruption;
  incomePenalty?: IncomePenalty;
};

export function teamZone(teamId: string): "A" | "B" {
  return ZONE_A.some(t => t.id === teamId) ? "A" : "B";
}

export function buildSeason(teamId: string): CareerState {
  const zone = teamZone(teamId);
  const ids = (zone === "A" ? ZONE_A : ZONE_B).map(t => t.id);
  const matches = generateRoundRobin(ids, zone);
  const standings = emptyStandings(ids);
  return { zone, matches, standings, totalGoalsScored: 0, streakUnbeaten: 0, bestUnbeaten: 0, zoneChampions: [] };
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
  return id ? TEAMS_BY_ID[id] : undefined;
}
