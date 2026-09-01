import { getTeamsByDivision } from "@/data/teams-catalog";
import { simulateMatch } from "@/lib/tournament";
import type { DivisionId } from "@/data/competitions";

// ===== Copa Argentina =====
// 64 equipos, eliminación directa a partido único, cancha neutral, sin ventaja
// de localía, definición por penales si hay empate. Se arma un cupo por
// categoría (aproximado a la distribución real) y se completa al azar con lo
// que haya disponible si a alguna categoría le faltan equipos.

export type CopaRound = "32avos" | "16avos" | "octavos" | "cuartos" | "semis" | "final";
export const COPA_ROUND_ORDER: CopaRound[] = ["32avos", "16avos", "octavos", "cuartos", "semis", "final"];
export const COPA_ROUND_LABEL: Record<CopaRound, string> = {
  "32avos": "32avos de Final", "16avos": "16avos de Final", "octavos": "Octavos de Final",
  "cuartos": "Cuartos de Final", "semis": "Semifinales", final: "Final",
};

export type CopaMatch = {
  id: string;
  round: CopaRound;
  home: string;
  away: string;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
  winner?: string;
  wentToPenalties?: boolean;
};

export type CopaState = {
  season: number;
  userTeamId: string;
  rounds: Record<CopaRound, CopaMatch[]>;
  champion: string | null;
  userEliminated: boolean;
};

// Cupos aproximados a la distribución real (30+15+5+5+10 ronda 1 más chica para
// que sumen 64 exacto según lo que haya cargado en cada categoría del juego).
const QUOTA: { division: DivisionId; count: number }[] = [
  { division: "primera_division", count: 30 },
  { division: "primera_nacional", count: 15 },
  { division: "primera_b", count: 5 },
  { division: "primera_c", count: 5 },
  { division: "federal_a", count: 9 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isCopaUnlocked(season: number): boolean {
  return season >= 2; // no se juega en la primera temporada de la carrera
}

export function buildCopaBracket(userTeamId: string, season: number): CopaState {
  const pool: string[] = [];
  for (const { division, count } of QUOTA) {
    const ids = shuffle(getTeamsByDivision(division).map(t => t.id)).slice(0, count);
    pool.push(...ids);
  }
  // Asegura que el equipo del usuario esté adentro, aunque su categoría ya
  // estuviera completa (le gana el cupo al último agregado de esa división).
  if (!pool.includes(userTeamId)) pool[Math.floor(Math.random() * pool.length)] = userTeamId;

  // Completa a 64 si alguna categoría no tenía suficientes equipos cargados.
  const allTeams = QUOTA.flatMap(q => getTeamsByDivision(q.division).map(t => t.id));
  const extra = shuffle(allTeams.filter(id => !pool.includes(id)));
  while (pool.length < 64 && extra.length) pool.push(extra.pop()!);

  const draw = shuffle(pool.slice(0, 64));
  const round1: CopaMatch[] = [];
  for (let i = 0; i < draw.length; i += 2) {
    round1.push({ id: `copa-s${season}-32avos-${i / 2}`, round: "32avos", home: draw[i], away: draw[i + 1], played: false });
  }

  const rounds = { "32avos": round1, "16avos": [], octavos: [], cuartos: [], semis: [], final: [] } as Record<CopaRound, CopaMatch[]>;
  return { season, userTeamId, rounds, champion: null, userEliminated: false };
}

// Resuelve un partido entre dos CPU (cancha neutral, sin ventaja): si empatan
// se define por penales al azar ponderado por poder ofensivo/defensivo real.
function resolveCpuMatch(home: string, away: string): { hg: number; ag: number; winner: string; wentToPenalties: boolean } {
  const { hg, ag } = simulateMatch(home, away, true);
  if (hg !== ag) return { hg, ag, winner: hg > ag ? home : away, wentToPenalties: false };
  // Penales simulados: 50/50 con un pequeño sesgo aleatorio, sin ventaja de local.
  const winner = Math.random() < 0.5 ? home : away;
  return { hg, ag, winner, wentToPenalties: true };
}

// Avanza TODOS los partidos de una ronda que no involucren al usuario (se
// simulan en paralelo, "al mismo tiempo" que el usuario juega el suyo), y arma
// automáticamente la ronda siguiente en cuanto la actual queda completa.
export function simulateCopaRoundExceptUser(state: CopaState, round: CopaRound): CopaState {
  const rounds = { ...state.rounds, [round]: state.rounds[round].map(m => ({ ...m })) };
  let userEliminated = state.userEliminated;
  let champion = state.champion;

  for (const m of rounds[round]) {
    if (m.played) continue;
    if (m.home === state.userTeamId || m.away === state.userTeamId) continue;
    const res = resolveCpuMatch(m.home, m.away);
    m.played = true; m.homeGoals = res.hg; m.awayGoals = res.ag; m.winner = res.winner; m.wentToPenalties = res.wentToPenalties;
  }

  if (rounds[round].every(m => m.played)) {
    if (rounds[round].some(m => (m.home === state.userTeamId || m.away === state.userTeamId) && m.winner !== state.userTeamId)) {
      userEliminated = true;
    }
    const nextRound = COPA_ROUND_ORDER[COPA_ROUND_ORDER.indexOf(round) + 1];
    if (nextRound) {
      const winners = rounds[round].map(m => m.winner!);
      const next: CopaMatch[] = [];
      for (let i = 0; i < winners.length; i += 2) {
        next.push({ id: `copa-s${state.season}-${nextRound}-${i / 2}`, round: nextRound, home: winners[i], away: winners[i + 1], played: false });
      }
      rounds[nextRound] = next;
    } else {
      champion = rounds[round][0]?.winner ?? null;
    }
  }

  return { ...state, rounds, userEliminated, champion };
}

export function recordCopaUserMatch(state: CopaState, matchId: string, hg: number, ag: number, winner: string): CopaState {
  const round = COPA_ROUND_ORDER.find(r => state.rounds[r].some(m => m.id === matchId));
  if (!round) return state;
  const rounds = { ...state.rounds, [round]: state.rounds[round].map(m => m.id === matchId ? { ...m, played: true, homeGoals: hg, awayGoals: ag, winner, wentToPenalties: hg === ag } : m) };
  return simulateCopaRoundExceptUser({ ...state, rounds }, round);
}

export function nextCopaMatchForUser(state: CopaState): CopaMatch | null {
  for (const r of COPA_ROUND_ORDER) {
    const m = state.rounds[r].find(x => !x.played && (x.home === state.userTeamId || x.away === state.userTeamId));
    if (m) return m;
  }
  return null;
}

export function isCopaFinished(state: CopaState): boolean {
  return state.champion !== null || state.userEliminated;
}
