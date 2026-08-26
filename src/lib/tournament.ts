import { getTeamById } from "@/data/teams-catalog";
import { FIXTURE_2026, isClasicoMatch } from "@/data/fixture2026";

// Fixture oficial 2026 (cruces declarados por el usuario).
export function buildOfficialFixture(): Match[] {
  return FIXTURE_2026.map(([round, home, away]) => {
    const ht = getTeamById(home);
    const rivalRel = !!(ht?.rivals?.includes(away));
    return {
      id: `F${round}-${home}-${away}`,
      round, home, away, played: false,
      isClasico: rivalRel || isClasicoMatch(home, away),
    };
  });
}

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
        const ht = getTeamById(h);
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
  const h = getTeamById(homeId), a = getTeamById(awayId);
  if (!h || !a) return { hg: 0, ag: 0 };

  // Las estadísticas SI afectan la simulación, pero con una compresión fuerte:
  // una diferencia de 20 puntos no debe sentirse como una goleada automática.
  const rating = (team: typeof h) =>
    (team.stats.speed + team.stats.jump + team.stats.power + team.stats.defense) / 4;
  const compressed = (r: number) => 0.30 * (r - 75);
  const diff = Math.max(-9, Math.min(9, compressed(rating(h)) - compressed(rating(a))));

  // Localía pequeña y variabilidad alta: la calidad importa, pero el resultado
  // sigue teniendo bastante componente de azar.
  const hLambda = Math.max(0.25, Math.min(1.85, 1.12 + diff * 0.035 + 0.10));
  const aLambda = Math.max(0.25, Math.min(1.70, 0.98 - diff * 0.030));

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
    || (getTeamById(a.teamId)?.name ?? "").localeCompare(getTeamById(b.teamId)?.name ?? "")
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
