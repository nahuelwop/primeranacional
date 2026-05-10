import { Team, TEAMS_BY_ID, teamRating } from "@/data/teams";

export type Match = {
  id: string;
  round: number;          // fecha
  home: string;           // team id
  away: string;
  homeGoals?: number;
  awayGoals?: number;
  played: boolean;
  isClasico?: boolean;
};

export type StandingRow = {
  teamId: string;
  pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; dg: number; pts: number;
};

// Algoritmo round-robin (circle method) para todos contra todos.
export function generateRoundRobin(teamIds: string[], zone: "A" | "B"): Match[] {
  const ids = [...teamIds];
  if (ids.length % 2 === 1) ids.push("__BYE__");
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const matches: Match[] = [];
  let arr = [...ids];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home !== "__BYE__" && away !== "__BYE__") {
        // alternar localía
        const swap = (r + i) % 2 === 0;
        const h = swap ? home : away;
        const a = swap ? away : home;
        const ht = TEAMS_BY_ID[h];
        const isClasico = !!(ht?.rivals?.includes(a));
        matches.push({
          id: `${zone}-r${r + 1}-${h}-${a}`,
          round: r + 1,
          home: h, away: a,
          played: false,
          isClasico,
        });
      }
    }
    // rotar manteniendo el primero fijo
    arr = [arr[0], ...arr.slice(-1), ...arr.slice(1, -1)];
  }
  return matches;
}

// Construye fixture: round-robin por zona + 1 fecha interzonal de clásicos.
export function buildFixture(
  zoneA: string[], zoneB: string[],
  interzonales: Array<[string, string]> = []
): Match[] {
  const a = generateRoundRobin(zoneA, "A");
  const b = generateRoundRobin(zoneB, "B");
  const totalRounds = Math.max(...a.map(m => m.round), ...b.map(m => m.round));
  const interRound = totalRounds + 1;
  const inter: Match[] = interzonales.map(([h, v], i) => ({
    id: `INT-r${interRound}-${h}-${v}`,
    round: interRound,
    home: h, away: v,
    played: false,
    isClasico: true,
  }));
  return [...a, ...b, ...inter];
}

// Simulación de partido por estadísticas (Poisson aproximada).
export function simulateMatch(homeId: string, awayId: string): { hg: number; ag: number } {
  const h = TEAMS_BY_ID[homeId], a = TEAMS_BY_ID[awayId];
  const homeAttack = (h.stats.power + h.stats.speed) / 2 + 5; // bonus de local
  const homeDefense = h.stats.defense + h.stats.jump / 2;
  const awayAttack = (a.stats.power + a.stats.speed) / 2;
  const awayDefense = a.stats.defense + a.stats.jump / 2;

  const hLambda = Math.max(0.2, (homeAttack - awayDefense * 0.6) / 35 + 1.1);
  const aLambda = Math.max(0.2, (awayAttack - homeDefense * 0.6) / 35 + 0.9);

  const poisson = (l: number) => {
    const L = Math.exp(-l);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  };
  return { hg: Math.min(7, poisson(hLambda)), ag: Math.min(7, poisson(aLambda)) };
}

export function emptyStandings(teamIds: string[]): StandingRow[] {
  return teamIds.map(id => ({ teamId: id, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 }));
}

export function applyMatchToStandings(rows: StandingRow[], m: Match): StandingRow[] {
  if (!m.played || m.homeGoals == null || m.awayGoals == null) return rows;
  return rows.map(r => {
    if (r.teamId !== m.home && r.teamId !== m.away) return r;
    const isHome = r.teamId === m.home;
    const gf = isHome ? m.homeGoals! : m.awayGoals!;
    const gc = isHome ? m.awayGoals! : m.homeGoals!;
    const win = gf > gc, draw = gf === gc;
    return {
      ...r,
      pj: r.pj + 1,
      pg: r.pg + (win ? 1 : 0),
      pe: r.pe + (draw ? 1 : 0),
      pp: r.pp + (!win && !draw ? 1 : 0),
      gf: r.gf + gf,
      gc: r.gc + gc,
      dg: r.gf + gf - (r.gc + gc),
      pts: r.pts + (win ? 3 : draw ? 1 : 0),
    };
  });
}

export function sortStandings(rows: StandingRow[]) {
  return [...rows].sort((a, b) =>
    b.pts - a.pts || b.dg - a.dg || b.gf - a.gf
    || (TEAMS_BY_ID[a.teamId]?.name ?? "").localeCompare(TEAMS_BY_ID[b.teamId]?.name ?? "")
  );
}

// Reducido: 2°-8° de cada zona = 14 equipos. Hacemos llave de octavos con 16 cupos
// usando los dos finalistas (1° de cada zona compiten antes en final directa por
// 1er ascenso; el perdedor ingresa al reducido como cabeza de serie).
export type Bracket = {
  octavos: Pair[];
  cuartos: Pair[];
  semis: Pair[];
  final: Pair[];
};
export type Pair = { a?: string; b?: string; winner?: string; ag?: number; bg?: number };

export function buildReducido(
  standA: StandingRow[], standB: StandingRow[], extraSeed?: string
): Bracket {
  const top8A = sortStandings(standA).slice(1, 8).map(r => r.teamId); // 2°-8°
  const top8B = sortStandings(standB).slice(1, 8).map(r => r.teamId);
  // 14 equipos + perdedor de la final directa = 15. Completamos con el 9° de zona A.
  const ninthA = sortStandings(standA)[8]?.teamId;
  const seeds = [extraSeed, ...top8A, ...top8B, ninthA].filter(Boolean) as string[];
  // mezclamos cruces A vs B
  const aSide = seeds.filter(id => standA.some(r => r.teamId === id));
  const bSide = seeds.filter(id => standB.some(r => r.teamId === id));
  while (aSide.length < 8) aSide.push(bSide.pop()!);
  while (bSide.length < 8) bSide.push(aSide.pop()!);
  const octavos: Pair[] = aSide.slice(0, 8).map((a, i) => ({ a, b: bSide[i] }));
  return { octavos, cuartos: [], semis: [], final: [] };
}
