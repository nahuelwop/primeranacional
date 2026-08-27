import { getTeamById, getTeamsByDivision, getTeamsByZone } from "@/data/teams-catalog";
import { FIXTURE_2026, isClasicoMatch } from "@/data/fixture2026";
import type { DivisionId } from "@/data/competitions";

export type MatchPhase = "apertura" | "interzonal" | "clausura" | "liga" | "reducido" | "federal";

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
  round: number;
  home: string;
  away: string;
  homeGoals?: number;
  awayGoals?: number;
  played: boolean;
  isClasico?: boolean;
  phase?: MatchPhase;
};

export type StandingRow = {
  teamId: string; pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; dg: number; pts: number;
};

export function generateRoundRobin(teamIds: string[], zone: "A" | "B" | string): Match[] {
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
        const swap = (r + i) % 2 === 0;
        const h = swap ? home : away;
        const a = swap ? away : home;
        const ht = getTeamById(h);
        matches.push({
          id: `${zone}-r${r + 1}-${h}-${a}`,
          round: r + 1, home: h, away: a, played: false,
          isClasico: !!(ht?.rivals?.includes(a)),
        });
      }
    }
    arr = [arr[0], ...arr.slice(-1), ...arr.slice(1, -1)];
  }
  return matches;
}

/** Segunda rueda usando los mismos cruces con localía invertida. */
export function generateDoubleRoundRobin(teamIds: string[], zone: string): Match[] {
  const first = generateRoundRobin(teamIds, zone);
  const rounds = Math.max(0, first.reduce((m, x) => Math.max(m, x.round), 0));
  const second = first.map(m => ({
    ...m,
    id: `${zone}-r${m.round + rounds}-${m.away}-${m.home}`,
    round: m.round + rounds,
    home: m.away,
    away: m.home,
  }));
  return [...first, ...second];
}

/**
 * Fixture específico de cada categoría para Modo Carrera.
 * Se arma con los clubes realmente cargados en el catálogo, no con Primera Nacional.
 */
export function buildDivisionCareerFixture(division: DivisionId, teamIds: string[], userTeamId?: string): {
  matches: Match[];
  zone: "A" | "B";
  otherMatches: Match[];
  activeTeamIds: string[];
} {
  if (division === "primera_division") {
    // El catálogo actual trae los 30 clubes en un único bloque. Los dividimos 15/15
    // de manera estable para el Apertura y luego todos juegan el Clausura completo.
    const sorted = [...teamIds];
    const zoneA = sorted.slice(0, Math.ceil(sorted.length / 2));
    const zoneB = sorted.slice(Math.ceil(sorted.length / 2));
    const userZone = userTeamId && zoneB.includes(userTeamId) ? "B" : "A";
    const ownZone = userZone === "A" ? zoneA : zoneB;
    const otherZone = userZone === "A" ? zoneB : zoneA;
    const aperturaOwn = generateRoundRobin(ownZone, userZone);
    const otherApertura = generateRoundRobin(otherZone, userZone === "A" ? "B" : "A");
    const interRound = Math.max(
      ...aperturaOwn.map(m => m.round),
      ...otherApertura.map(m => m.round),
      0,
    ) + 1;
    // Fecha interzonal: emparejamos por índice para que haya 15 cruces, manteniendo
    // una estructura fija y reproducible aun cuando los equipos cambien en Admin.
    const inter: Match[] = [];
    for (let i = 0; i < Math.max(zoneA.length, zoneB.length); i++) {
      const h = zoneA[i], a = zoneB[i];
      if (!h || !a) continue;
      const ht = getTeamById(h);
      inter.push({
        id: `INT-r${interRound}-${h}-${a}`,
        round: interRound,
        home: h,
        away: a,
        played: false,
        phase: "interzonal",
        isClasico: !!(ht?.rivals?.includes(a)) || isClasicoMatch(h, a),
      });
    }
    const maxApertura = interRound;
    const clausuraBase = maxApertura + 1;
    const clausura = generateRoundRobin(sorted, "PD").map(m => ({
      ...m,
      round: m.round + clausuraBase - 1,
      id: `CLA-r${m.round + clausuraBase - 1}-${m.home}-${m.away}`,
      phase: "clausura" as const,
    }));
    const all = [
      ...aperturaOwn.map(m => ({ ...m, phase: "apertura" as const })),
      ...otherApertura.map(m => ({ ...m, phase: "apertura" as const })),
      ...inter,
      ...clausura,
    ]
      .sort((a, b) => a.round - b.round || a.id.localeCompare(b.id));
    return { matches: all, zone: userZone, otherMatches: [], activeTeamIds: sorted };
  }

  if (division === "primera_nacional") {
    // La carrera existente conserva el esquema histórico de dos zonas.
    const zone = userTeamId && getTeamsByZone(division, "B").some(t => t.id === userTeamId) ? "B" : "A";
    const ownIds = getTeamsByZone(division, zone).map(t => t.id).filter(id => teamIds.includes(id));
    const otherZone = zone === "A" ? "B" : "A";
    const otherIds = getTeamsByZone(division, otherZone).map(t => t.id).filter(id => teamIds.includes(id));
    const own = generateDoubleRoundRobin(ownIds, zone);
    const other = generateDoubleRoundRobin(otherIds, otherZone);
    return { matches: own, zone, otherMatches: other, activeTeamIds: ownIds };
  }

  if (division === "primera_b") {
    return { matches: generateDoubleRoundRobin(teamIds, "B"), zone: "A", otherMatches: [], activeTeamIds: teamIds };
  }

  if (division === "primera_c") {
    const apertura = generateRoundRobin(teamIds, "C-Apertura").map(m => ({ ...m, phase: "apertura" as const }));
    const base = Math.max(0, apertura.reduce((n, m) => Math.max(n, m.round), 0));
    const clausura = generateRoundRobin(teamIds, "C-Clausura").map(m => ({
      ...m,
      round: m.round + base,
      id: `C-clausura-r${m.round + base}-${m.home}-${m.away}`,
      phase: "clausura" as const,
    }));
    return { matches: [...apertura, ...clausura], zone: "A", otherMatches: [], activeTeamIds: teamIds };
  }

  if (division === "federal_a") {
    // Federal A: conserva la afiliación y el conjunto de equipos de Federal A, sin
    // reutilizar nunca clubes/fixture de Primera Nacional. El catálogo actual trae
    // dos marcas A/B; las tomamos como dos subgrupos estables hasta que Admin cargue
    // una división con cuatro zonas explícitas.
    const aIds = teamIds.filter(id => getTeamById(id)?.zone === "A");
    const bIds = teamIds.filter(id => getTeamById(id)?.zone === "B");
    const zone = userTeamId && bIds.includes(userTeamId) ? "B" : "A";
    const own = generateDoubleRoundRobin(zone === "A" ? aIds : bIds, `FA-${zone}`);
    const other = generateDoubleRoundRobin(zone === "A" ? bIds : aIds, `FA-${zone === "A" ? "B" : "A"}`);
    return { matches: own, zone, otherMatches: other, activeTeamIds: zone === "A" ? aIds : bIds };
  }

  // Primera D: si hay equipos cargados, usa una liga general sin inventar reglas extra.
  return { matches: generateDoubleRoundRobin(teamIds, "D"), zone: "A", otherMatches: [], activeTeamIds: teamIds };
}

export function buildFixture(zoneA: string[], zoneB: string[], interzonales: Array<[string, string]> = []): Match[] {
  const a = generateRoundRobin(zoneA, "A");
  const b = generateRoundRobin(zoneB, "B");
  const totalRounds = Math.max(...a.map(m => m.round), ...b.map(m => m.round), 0);
  const interRound = totalRounds + 1;
  const inter: Match[] = interzonales.map(([h, v]) => ({
    id: `INT-r${interRound}-${h}-${v}`,
    round: interRound, home: h, away: v, played: false, isClasico: true,
    phase: "interzonal",
  }));
  return [...a, ...b, ...inter];
}

export function simulateMatch(homeId: string, awayId: string): { hg: number; ag: number } {
  const h = getTeamById(homeId), a = getTeamById(awayId);
  if (!h || !a) return { hg: 0, ag: 0 };
  const rating = (team: typeof h) => (team.stats.speed + team.stats.jump + team.stats.power + team.stats.defense) / 4;
  const compressed = (r: number) => 0.30 * (r - 75);
  const diff = Math.max(-9, Math.min(9, compressed(rating(h)) - compressed(rating(a))));
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
      dg: (r.gf + gf) - (r.gc + gc),
      pts: r.pts + (win ? 3 : draw ? 1 : 0),
    };
  });
}

export function sortStandings(rows: StandingRow[]) {
  return [...rows].sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || (getTeamById(a.teamId)?.name ?? "").localeCompare(getTeamById(b.teamId)?.name ?? ""));
}

export type Bracket = { octavos: Pair[]; cuartos: Pair[]; semis: Pair[]; final: Pair[] };
export type Pair = { a?: string; b?: string; winner?: string; ag?: number; bg?: number };

export function buildReducido(standA: StandingRow[], standB: StandingRow[], extraSeed?: string): Bracket {
  const top8A = sortStandings(standA).slice(1, 8).map(r => r.teamId);
  const top8B = sortStandings(standB).slice(1, 8).map(r => r.teamId);
  const ninthA = sortStandings(standA)[8]?.teamId;
  const seeds = [extraSeed, ...top8A, ...top8B, ninthA].filter(Boolean) as string[];
  const aSide = seeds.filter(id => standA.some(r => r.teamId === id));
  const bSide = seeds.filter(id => standB.some(r => r.teamId === id));
  while (aSide.length < 8 && bSide.length) aSide.push(bSide.pop()!);
  while (bSide.length < 8 && aSide.length) bSide.push(aSide.pop()!);
  const octavos: Pair[] = aSide.slice(0, 8).map((a, i) => ({ a, b: bSide[i] }));
  return { octavos, cuartos: [], semis: [], final: [] };
}
