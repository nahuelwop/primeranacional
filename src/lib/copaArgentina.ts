import { getTeamsByDivision, getTeamById } from "@/data/teams-catalog";
import type { DivisionId } from "@/data/competitions";
import { simulateMatch } from "@/lib/tournament";

// ============================================================================
// COPA ARGENTINA — 2026
// Fase Final: 64 equipos, eliminación directa, partido único, cancha neutral.
// El juego mantiene la duración configurada del motor (no se altera acá).
// ============================================================================

export type CopaRound = "32avos" | "16avos" | "octavos" | "cuartos" | "semis" | "final";
export const COPA_ROUND_ORDER: CopaRound[] = ["32avos", "16avos", "octavos", "cuartos", "semis", "final"];
export const COPA_ROUND_LABEL: Record<CopaRound, string> = {
  "32avos": "32avos de Final",
  "16avos": "16avos de Final",
  "octavos": "Octavos de Final",
  "cuartos": "Cuartos de Final",
  semis: "Semifinales",
  final: "Final",
};

export const COPA_FINAL_QUOTAS: ReadonlyArray<{ division: DivisionId; count: number; label: string }> = [
  { division: "primera_division", count: 30, label: "Primera División" },
  { division: "federal_a", count: 10, label: "Federal A" },
  { division: "primera_nacional", count: 15, label: "Primera Nacional" },
  { division: "primera_b", count: 5, label: "Primera B Metropolitana" },
  { division: "primera_c", count: 4, label: "Primera C" },
];

export const COPA_FINAL_TEAM_COUNT = 64;
export const COPA_ELIGIBLE_DIVISIONS: DivisionId[] = [
  "primera_division",
  "federal_a",
  "primera_nacional",
  "primera_b",
  "primera_c",
];

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
  neutral?: boolean;
};

export type CopaQualification = {
  division: DivisionId;
  entrants: number;
  qualified: string[];
  note: string;
};

export type CopaState = {
  season: number;
  userTeamId: string;
  rounds: Record<CopaRound, CopaMatch[]>;
  champion: string | null;
  userEliminated: boolean;
  qualification: CopaQualification[];
  createdAt: string;
};

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

function seededSort<T>(values: T[], key: (value: T) => string): T[] {
  return [...values].sort((a, b) => hash(key(a)) - hash(key(b)));
}

function cpuPenaltyWinner(home: string, away: string, season: number, round: CopaRound): string {
  return hash(`${season}:${round}:${home}:${away}`) % 2 === 0 ? home : away;
}

function resolveCpuMatch(home: string, away: string, season: number, round: CopaRound) {
  const { hg, ag } = simulateMatch(home, away, true);
  if (hg !== ag) return { hg, ag, winner: hg > ag ? home : away, wentToPenalties: false };
  return { hg, ag, winner: cpuPenaltyWinner(home, away, season, round), wentToPenalties: true };
}

function chooseQuota(div: DivisionId, count: number, userTeamId: string, season: number): string[] {
  const ids = seededSort(getTeamsByDivision(div).map(t => t.id), id => `${season}:copa:${div}:${id}`).slice(0, count);
  if (!ids.length) return [];
  if (ids.includes(userTeamId)) return ids;
  const user = getTeamById(userTeamId);
  if (!user || user.division !== div) return ids;
  ids[ids.length - 1] = userTeamId;
  return Array.from(new Set(ids));
}

function buildParticipants(userTeamId: string, season: number): { teams: string[]; qualification: CopaQualification[] } {
  const selected: string[] = [];
  const qualification: CopaQualification[] = [];

  for (const quota of COPA_FINAL_QUOTAS) {
    const entrants = getTeamsByDivision(quota.division).length;
    const qualified = chooseQuota(quota.division, quota.count, userTeamId, season);
    selected.push(...qualified);
    qualification.push({
      division: quota.division,
      entrants,
      qualified,
      note: quota.division === "primera_division"
        ? "Clasificación directa a 32avos de final."
        : `Cupo de ${quota.count} clubes para la Fase Final 2026.`,
    });
  }

  // Seguridad: el cuadro siempre debe tener 64 equipos únicos.
  const eligiblePool = seededSort(
    COPA_ELIGIBLE_DIVISIONS.flatMap(d => getTeamsByDivision(d).map(t => t.id)),
    id => `${season}:copa:pool:${id}`,
  );
  for (const id of eligiblePool) {
    if (selected.length >= COPA_FINAL_TEAM_COUNT) break;
    if (!selected.includes(id)) selected.push(id);
  }

  const unique = Array.from(new Set(selected));
  if (!unique.includes(userTeamId) && getTeamById(userTeamId)) {
    const division = getTeamById(userTeamId)?.division;
    if (division && COPA_ELIGIBLE_DIVISIONS.includes(division)) {
      const quota = COPA_FINAL_QUOTAS.find(q => q.division === division);
      const replaceIndex = quota ? unique.findIndex(id => getTeamById(id)?.division === division && id !== userTeamId) : -1;
      if (replaceIndex >= 0) unique[replaceIndex] = userTeamId;
      else unique.push(userTeamId);
    }
  }

  return { teams: unique.slice(0, COPA_FINAL_TEAM_COUNT), qualification };
}

export function isCopaUnlocked(_season: number): boolean {
  // La Copa Argentina forma parte de la temporada 2026 y de las siguientes.
  return true;
}

export function isCopaEligibleTeam(teamId: string): boolean {
  const division = getTeamById(teamId)?.division;
  return !!division && COPA_ELIGIBLE_DIVISIONS.includes(division);
}

export function buildCopaBracket(userTeamId: string, season: number): CopaState {
  if (!isCopaEligibleTeam(userTeamId)) {
    throw new Error("Este club no participa de la Copa Argentina en el formato 2026.");
  }

  const { teams, qualification } = buildParticipants(userTeamId, season);
  const draw = seededSort(teams.slice(0, COPA_FINAL_TEAM_COUNT), id => `${season}:copa:draw:${id}`);
  const round1: CopaMatch[] = [];
  for (let i = 0; i + 1 < draw.length; i += 2) {
    round1.push({
      id: `copa-s${season}-32avos-${i / 2}`,
      round: "32avos",
      home: draw[i],
      away: draw[i + 1],
      played: false,
      neutral: true,
    });
  }

  const rounds = {
    "32avos": round1,
    "16avos": [],
    octavos: [],
    cuartos: [],
    semis: [],
    final: [],
  } as Record<CopaRound, CopaMatch[]>;

  return {
    season,
    userTeamId,
    rounds,
    champion: null,
    userEliminated: false,
    qualification,
    createdAt: new Date().toISOString(),
  };
}

function openNextRound(rounds: Record<CopaRound, CopaMatch[]>, round: CopaRound, season: number) {
  const index = COPA_ROUND_ORDER.indexOf(round);
  const nextRound = COPA_ROUND_ORDER[index + 1];
  if (!nextRound) return;
  const winners = rounds[round].map(m => m.winner).filter((id): id is string => !!id);
  const next: CopaMatch[] = [];
  for (let i = 0; i + 1 < winners.length; i += 2) {
    next.push({
      id: `copa-s${season}-${nextRound}-${i / 2}`,
      round: nextRound,
      home: winners[i],
      away: winners[i + 1],
      played: false,
      neutral: true,
    });
  }
  rounds[nextRound] = next;
}

export function simulateCopaRoundExceptUser(state: CopaState, round: CopaRound): CopaState {
  const rounds = { ...state.rounds, [round]: state.rounds[round].map(m => ({ ...m })) };
  let userEliminated = state.userEliminated;
  let champion = state.champion;

  for (const m of rounds[round]) {
    if (m.played) continue;
    if (m.home === state.userTeamId || m.away === state.userTeamId) continue;
    const res = resolveCpuMatch(m.home, m.away, state.season, round);
    Object.assign(m, {
      played: true,
      homeGoals: res.hg,
      awayGoals: res.ag,
      winner: res.winner,
      wentToPenalties: res.wentToPenalties,
      neutral: true,
    });
  }

  if (rounds[round].every(m => m.played)) {
    const userMatch = rounds[round].find(m => m.home === state.userTeamId || m.away === state.userTeamId);
    if (userMatch && userMatch.winner && userMatch.winner !== state.userTeamId) userEliminated = true;

    if (!userEliminated) {
      const nextRound = COPA_ROUND_ORDER[COPA_ROUND_ORDER.indexOf(round) + 1];
      if (nextRound) openNextRound(rounds, round, state.season);
      else champion = rounds[round][0]?.winner ?? null;
    } else if (COPA_ROUND_ORDER.indexOf(round) === COPA_ROUND_ORDER.length - 1) {
      champion = rounds[round][0]?.winner ?? null;
    } else {
      const winners = rounds[round].map(m => m.winner).filter((id): id is string => !!id);
      // El usuario ya está fuera: el resto del cuadro sigue simulándose hasta el campeón.
      const nextRound = COPA_ROUND_ORDER[COPA_ROUND_ORDER.indexOf(round) + 1];
      if (nextRound) {
        const next: CopaMatch[] = [];
        for (let i = 0; i + 1 < winners.length; i += 2) next.push({ id: `copa-s${state.season}-${nextRound}-${i / 2}`, round: nextRound, home: winners[i], away: winners[i + 1], played: false, neutral: true });
        rounds[nextRound] = next;
      }
    }
  }

  return { ...state, rounds, userEliminated, champion };
}

export function recordCopaUserMatch(state: CopaState, matchId: string, hg: number, ag: number, winner: string): CopaState {
  const round = COPA_ROUND_ORDER.find(r => state.rounds[r].some(m => m.id === matchId));
  if (!round) return state;
  const rounds = {
    ...state.rounds,
    [round]: state.rounds[round].map(m => m.id === matchId
      ? { ...m, played: true, homeGoals: hg, awayGoals: ag, winner, wentToPenalties: hg === ag, neutral: true }
      : m),
  };
  return simulateCopaRoundExceptUser({ ...state, rounds }, round);
}

export function nextCopaMatchForUser(state: CopaState): CopaMatch | null {
  for (const round of COPA_ROUND_ORDER) {
    const match = state.rounds[round].find(m => !m.played && (m.home === state.userTeamId || m.away === state.userTeamId));
    if (match) return match;
  }
  return null;
}

export function simulateRemainingCopa(state: CopaState): CopaState {
  let next = state;
  for (const round of COPA_ROUND_ORDER) {
    if (!next.rounds[round]?.length) continue;
    while (next.rounds[round].some(m => !m.played && m.home !== next.userTeamId && m.away !== next.userTeamId)) {
      next = simulateCopaRoundExceptUser(next, round);
      if (!next.rounds[round].some(m => !m.played && m.home !== next.userTeamId && m.away !== next.userTeamId)) break;
    }
    if (next.champion || (next.userEliminated && round === "final")) break;
  }
  return next;
}

export function isCopaFinished(state: CopaState): boolean {
  return !!state.champion || state.userEliminated;
}
