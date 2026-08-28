import { getTeamById, getRegionalTeamMeta } from "@/data/teams-catalog";
import { FIXTURE_2026, isClasicoMatch } from "@/data/fixture2026";
import type { DivisionId } from "@/data/competitions";

export type MatchPhase = "apertura" | "interzonal" | "clausura" | "liga" | "reducido" | "federal" | "regional" | "regional_playoff" | "regional_final";

export function buildOfficialFixture(): Match[] {
  return FIXTURE_2026.map(([round, home, away]) => {
    const ht = getTeamById(home);
    return { id: `F${round}-${home}-${away}`, round, home, away, played: false, isClasico: !!(ht?.rivals?.includes(away)) || isClasicoMatch(home, away) };
  });
}

export type Match = {
  id: string; round: number; home: string; away: string;
  homeGoals?: number; awayGoals?: number; played: boolean;
  isClasico?: boolean; phase?: MatchPhase;
};

export type StandingRow = {
  teamId: string; pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; dg: number; pts: number;
};

export function generateRoundRobin(teamIds: string[], zone: "A" | "B" | string): Match[] {
  const ids = [...teamIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push("__BYE__");
  const n = ids.length, rounds = n - 1, half = n / 2;
  const matches: Match[] = [];
  let arr = [...ids];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a0 = arr[i], b0 = arr[n - 1 - i];
      if (a0 === "__BYE__" || b0 === "__BYE__") continue;
      const swap = (r + i) % 2 === 0;
      const home = swap ? a0 : b0;
      const away = swap ? b0 : a0;
      const ht = getTeamById(home);
      matches.push({ id: `${zone}-r${r + 1}-${home}-${away}`, round: r + 1, home, away, played: false, isClasico: !!(ht?.rivals?.includes(away)) || isClasicoMatch(home, away) });
    }
    arr = [arr[0], ...arr.slice(-1), ...arr.slice(1, -1)];
  }
  return matches;
}

export function generateDoubleRoundRobin(teamIds: string[], zone: string): Match[] {
  const first = generateRoundRobin(teamIds, zone);
  const rounds = Math.max(0, first.reduce((m, x) => Math.max(m, x.round), 0));
  const second = first.map(m => ({ ...m, id: `${zone}-r${m.round + rounds}-${m.away}-${m.home}`, round: m.round + rounds, home: m.away, away: m.home }));
  return [...first, ...second];
}

export function generateMultiRoundRobin(teamIds: string[], zone: string, wheels = 4): Match[] {
  const base = generateRoundRobin(teamIds, zone);
  const rounds = Math.max(0, base.reduce((m, x) => Math.max(m, x.round), 0));
  const out: Match[] = [...base];
  for (let wheel = 1; wheel < wheels; wheel++) {
    const offset = rounds * wheel;
    const copy = base.map((m, i) => ({
      ...m,
      id: `${zone}-w${wheel + 1}-r${m.round + offset}-${m.away}-${m.home}`,
      round: m.round + offset,
      home: wheel % 2 === 1 ? m.away : m.home,
      away: wheel % 2 === 1 ? m.home : m.away,
    }));
    out.push(...copy);
  }
  return out;
}


export type RegionalSeasonResult = {
  groupStandings: Record<string, StandingRow[]>;
  regionalChampions: string[];
  promotedToFederalA: string[];
  matches: Match[];
};

const REGIONAL_REGIONS = [
  "Norte", "Litoral Norte", "Litoral Sur", "Centro", "Cuyo",
  "Pampeana Norte", "Pampeana Sur", "Patagonia",
] as const;

function hashText(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

function inferredRegionalRegion(teamId: string): string {
  const team = getTeamById(teamId);
  const province = (team?.province ?? "").toLowerCase();
  if (["tucumán", "salta", "jujuy", "catamarca"].some(p => province.includes(p))) return "Norte";
  if (["formosa", "chaco", "corrientes", "misiones"].some(p => province.includes(p))) return "Litoral Norte";
  if (["santa fe", "entre ríos"].some(p => province.includes(p))) return "Litoral Sur";
  if (["santiago del estero"].some(p => province.includes(p))) return "Centro";
  if (["mendoza", "san luis", "san juan"].some(p => province.includes(p))) return "Cuyo";
  if (province.includes("la pampa") || province.includes("buenos aires")) {
    // Para nuevos descendidos del Federal A sin región histórica disponible,
    // se reparte de forma estable entre las dos regiones pampeanas.
    return hashText(teamId) % 2 === 0 ? "Pampeana Norte" : "Pampeana Sur";
  }
  if (["río negro", "chubut", "santa cruz", "tierra del fuego", "neuquén"].some(p => province.includes(p))) return "Patagonia";
  return REGIONAL_REGIONS[hashText(teamId) % REGIONAL_REGIONS.length];
}

function inferredRegionalGroup(teamId: string, region: string, existing: Record<string, string>): string {
  const counts = new Map<string, number>();
  for (const value of Object.values(existing)) {
    const [r, g] = value.split("::");
    if (r === region) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const groups = Array.from({ length: 8 }, (_, i) => String(i + 1));
  // Elegimos primero un grupo que aún tenga menos de 4 clubes, minimizando
  // la variación para no romper las zonas oficiales ya cargadas.
  groups.sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0) || Number(a) - Number(b));
  const candidates = groups.filter(g => (counts.get(g) ?? 0) < 4);
  const pool = candidates.length ? candidates : groups;
  return pool[hashText(`${teamId}:${region}`) % pool.length];
}

export function buildRegionalGroupMap(teamIds: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of teamIds) {
    const meta = getRegionalTeamMeta(id);
    if (meta) map[id] = `${meta.region}::${meta.group}`;
  }
  for (const id of teamIds) {
    if (map[id]) continue;
    const region = inferredRegionalRegion(id);
    const group = inferredRegionalGroup(id, region, map);
    map[id] = `${region}::${group}`;
  }
  return map;
}

function simulateTie(a: string, b: string): { winner: string; matches: Match[] } {
  const h1 = simulateMatch(a, b);
  const h2 = simulateMatch(b, a);
  const aTotal = h1.hg + h2.ag;
  const bTotal = h1.ag + h2.hg;
  let winner: string;
  if (aTotal > bTotal) winner = a;
  else if (bTotal > aTotal) winner = b;
  else winner = teamSimulationStrength(a) >= teamSimulationStrength(b) ? a : b;
  return {
    winner,
    matches: [
      { id: `RFE-${a}-${b}-1`, round: 1, home: a, away: b, homeGoals: h1.hg, awayGoals: h1.ag, played: true, phase: "regional_playoff" },
      { id: `RFE-${b}-${a}-2`, round: 2, home: b, away: a, homeGoals: h2.hg, awayGoals: h2.ag, played: true, phase: "regional_playoff" },
    ],
  };
}

export function simulateRegionalTournament(roster: string[]): RegionalSeasonResult {
  const groupStandings: Record<string, StandingRow[]> = {};
  const allGroupMatches: Match[] = [];
  const byRegion = new Map<string, string[][]>();
  const groups = new Map<string, string[]>();
  const regionalMap = buildRegionalGroupMap(roster);
  for (const id of roster) {
    const key = regionalMap[id];
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(id);
  }
  for (const [key, ids] of groups) {
    const played = generateDoubleRoundRobin(ids, `RFE-${key}`).map(m => ({ ...m, phase: "regional" as const }));
    let rows = emptyStandings(ids);
    for (const m of played) {
      const { hg, ag } = simulateMatch(m.home, m.away);
      const pm = { ...m, played: true, homeGoals: hg, awayGoals: ag };
      allGroupMatches.push(pm);
      rows = applyMatchToStandings(rows, pm);
    }
    groupStandings[key] = sortStandings(rows);
    const region = key.split("::")[0];
    const list = byRegion.get(region) ?? [];
    list.push(rows.map(r => r.teamId));
    byRegion.set(region, list);
  }

  const regionalChampions: string[] = [];
  const playoffMatches: Match[] = [];
  for (const [region, regionGroups] of byRegion) {
    const candidates: string[] = [];
    // Campeones de zona + segundos; el corte se hace por rendimiento cuando hay más de 16.
    const seconds: StandingRow[] = [];
    for (const ids of regionGroups) {
      const key = regionalMap[ids[0]];
      const rows = groupStandings[key] ?? [];
      if (rows[0]) candidates.push(rows[0].teamId);
      if (rows[1]) seconds.push(rows[1]);
    }
    const desired = Math.max(2, Math.min(16, 2 ** Math.ceil(Math.log2(Math.max(2, candidates.length + seconds.length)))));
    for (const row of seconds.sort((a,b) => teamSimulationStrength(b.teamId)-teamSimulationStrength(a.teamId)).slice(0, Math.max(0, desired - candidates.length))) candidates.push(row.teamId);
    let current = [...candidates];
    while (current.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < current.length; i += 2) {
        if (!current[i + 1]) { next.push(current[i]); continue; }
        const tie = simulateTie(current[i], current[i + 1]);
        playoffMatches.push(...tie.matches.map(m => ({ ...m, id: `${region}-${m.id}` })));
        next.push(tie.winner);
      }
      current = next;
    }
    if (current[0]) regionalChampions.push(current[0]);
  }

  // Ocho campeones regionales -> cuatro finales nacionales a partido único.
  const promotedToFederalA: string[] = [];
  for (let i = 0; i + 1 < regionalChampions.length; i += 2) {
    const a = regionalChampions[i], b = regionalChampions[i + 1];
    const sa = simulateMatch(a, b);
    const winner = sa.hg > sa.ag ? a : sa.ag > sa.hg ? b : (teamSimulationStrength(a) >= teamSimulationStrength(b) ? a : b);
    promotedToFederalA.push(winner);
    playoffMatches.push({ id: `RFE-NAC-${a}-${b}`, round: 99, home: a, away: b, homeGoals: sa.hg, awayGoals: sa.ag, played: true, phase: "regional_final" });
  }
  return { groupStandings, regionalChampions, promotedToFederalA: promotedToFederalA.slice(0, 4), matches: [...allGroupMatches, ...playoffMatches] };
}

/** Asigna de forma estable un plantel de Federal A a cuatro zonas. */
export function buildFederalZoneMap(teamIds: string[]): Record<string, string> {
  const zones = ["A", "B", "C", "D"];
  const sorted = [...teamIds].sort((a, b) => a.localeCompare(b));
  const map: Record<string, string> = {};
  sorted.forEach((id, i) => { map[id] = zones[i % zones.length]; });
  return map;
}

/** Fixture realista por división. Cada división usa exclusivamente sus propios clubes. */
export function buildDivisionCareerFixture(division: DivisionId, teamIds: string[], userTeamId?: string, persistedZoneMap?: Record<string, string>): {
  matches: Match[]; zone: string; otherMatches: Match[]; activeTeamIds: string[]; zoneMap?: Record<string, string>;
} {
  const ids = [...teamIds];

  if (division === "primera_division") {
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    const mid = Math.ceil(sorted.length / 2);
    const zoneA = sorted.slice(0, mid), zoneB = sorted.slice(mid);
    const zone = userTeamId && zoneB.includes(userTeamId) ? "B" : "A";
    const own = zone === "A" ? zoneA : zoneB;
    const other = zone === "A" ? zoneB : zoneA;
    const openingOwn = generateRoundRobin(own, zone).map(m => ({ ...m, phase: "apertura" as const }));
    const openingOther = generateRoundRobin(other, zone === "A" ? "B" : "A").map(m => ({ ...m, phase: "apertura" as const }));
    const openingRounds = Math.max(...openingOwn.map(m => m.round), ...openingOther.map(m => m.round), 0);
    const interRound = openingRounds + 1;
    const inter: Match[] = [];
    for (let i = 0; i < Math.min(zoneA.length, zoneB.length); i++) {
      const home = zoneA[i], away = zoneB[i];
      const ht = getTeamById(home);
      inter.push({ id: `PD-INT-r${interRound}-${home}-${away}`, round: interRound, home, away, played: false, phase: "interzonal", isClasico: !!(ht?.rivals?.includes(away)) || isClasicoMatch(home, away) });
    }
    const clausuraStart = interRound + 1;
    const clausura = generateRoundRobin(sorted, "PD").map(m => ({ ...m, round: m.round + clausuraStart - 1, id: `PD-CLA-r${m.round + clausuraStart - 1}-${m.home}-${m.away}`, phase: "clausura" as const }));
    return { matches: [...openingOwn, ...openingOther, ...inter, ...clausura].sort((a, b) => a.round - b.round || a.id.localeCompare(b.id)), otherMatches: [], zone, activeTeamIds: sorted };
  }

  if (division === "primera_nacional") {
    const zone = userTeamId && ids.includes(userTeamId) && getTeamById(userTeamId)?.zone === "B" ? "B" : "A";
    const ownIds = ids.filter(id => (getTeamById(id)?.zone ?? "A") === zone);
    const otherIds = ids.filter(id => (getTeamById(id)?.zone ?? "A") !== zone);
    const own = generateDoubleRoundRobin(ownIds, zone).map(m => ({ ...m, phase: "liga" as const }));
    const other = generateDoubleRoundRobin(otherIds, zone === "A" ? "B" : "A").map(m => ({ ...m, phase: "liga" as const }));
    return { matches: own, otherMatches: other, zone, activeTeamIds: ownIds };
  }

  if (division === "primera_b") {
    return { matches: generateDoubleRoundRobin(ids, "B").map(m => ({ ...m, phase: "liga" as const })), otherMatches: [], zone: "A", activeTeamIds: ids };
  }

  if (division === "primera_c") {
    const apertura = generateRoundRobin(ids, "C-Apertura").map(m => ({ ...m, phase: "apertura" as const }));
    const baseRounds = Math.max(0, apertura.reduce((n, m) => Math.max(n, m.round), 0));
    const clausura = generateRoundRobin(ids, "C-Clausura").map(m => ({ ...m, round: m.round + baseRounds, id: `C-clausura-r${m.round + baseRounds}-${m.home}-${m.away}`, phase: "clausura" as const }));
    return { matches: [...apertura, ...clausura], otherMatches: [], zone: "A", activeTeamIds: ids };
  }

  if (division === "regional_federal_amateur") {
    const meta = getRegionalTeamMeta(userTeamId ?? "");
    const userGroup = meta ? `${meta.region}::${meta.group}` : "Norte::1";
    const matches = generateDoubleRoundRobin(ids.filter(id => buildRegionalGroupMap(ids)[id] === userGroup), `RFE-${userGroup}`).map(m => ({ ...m, phase: "regional" as const }));
    const other = ids.filter(id => buildRegionalGroupMap(ids)[id] !== userGroup);
    const otherMatches: Match[] = [];
    const groupMap = buildRegionalGroupMap(ids);
    const grouped = new Map<string,string[]>();
    for (const id of other) { const key = groupMap[id]; if (key) (grouped.get(key) ?? grouped.set(key, []).get(key)!).push(id); }
    for (const [key, group] of grouped) otherMatches.push(...generateDoubleRoundRobin(group, `RFE-${key}`).map(m => ({ ...m, phase: "regional" as const })));
    return { matches, otherMatches, zone: meta?.region ?? "Norte", activeTeamIds: ids.filter(id => groupMap[id] === userGroup) };
  }

  if (division === "federal_a") {
    const zoneMap = persistedZoneMap ?? buildFederalZoneMap(ids);
    const groups = new Map<string, string[]>();
    for (const z of ["A", "B", "C", "D"]) groups.set(z, []);
    for (const id of ids) groups.get(zoneMap[id] ?? "A")!.push(id);
    const userZone = zoneMap[userTeamId ?? ""] ?? "A";
    const matches: Match[] = [];
    const otherMatches: Match[] = [];
    for (const [z, group] of groups) {
      const fs = generateMultiRoundRobin(group, `FA-${z}`, 4).map(m => ({ ...m, phase: "federal" as const }));
      if (z === userZone) matches.push(...fs); else otherMatches.push(...fs);
    }
    return { matches: matches.sort((a, b) => a.round - b.round), otherMatches: otherMatches.sort((a, b) => a.round - b.round), zone: userZone, activeTeamIds: groups.get(userZone) ?? [], zoneMap };
  }

  return { matches: generateDoubleRoundRobin(ids, "D").map(m => ({ ...m, phase: "liga" as const })), otherMatches: [], zone: "A", activeTeamIds: ids };
}

function clubPrestige(id: string): number {
  const prestige: Record<string, number> = {
    riverplate: 10, bocajuniors: 10, racingclub: 8, independiente: 8, sanlorenzo: 7,
    estudiantesdelaplata: 7, velezsarsfield: 7, rosariocentral: 6, newellsoldboys: 6,
    argentinosjuniors: 6, lanus: 6, huracan: 5, belgrano: 5, talleresdecordoba: 5,
    colon: 5, gimnasialaplata: 5, "gimnasiayesgrimalaplata": 5,
  };
  return prestige[id] ?? 0;
}

export function teamSimulationStrength(teamId: string): number {
  const t = getTeamById(teamId);
  if (!t) return 50;
  const raw = (t.stats.speed + t.stats.jump + t.stats.power + t.stats.defense) / 4;
  // 85% estadísticas del equipo + 15% jerarquía histórica. Esto SOLO se usa para simulaciones.
  return raw * 0.85 + (50 + clubPrestige(teamId) * 2.2) * 0.15;
}

export function simulateMatch(homeId: string, awayId: string): { hg: number; ag: number } {
  const h = getTeamById(homeId), a = getTeamById(awayId);
  if (!h || !a) return { hg: 0, ag: 0 };
  const diff = Math.max(-14, Math.min(14, (teamSimulationStrength(homeId) - teamSimulationStrength(awayId)) * 0.45));
  const hLambda = Math.max(0.30, Math.min(2.25, 1.16 + diff * 0.045 + 0.10));
  const aLambda = Math.max(0.22, Math.min(1.85, 0.92 - diff * 0.040));
  const poisson = (lambda: number) => {
    const L = Math.exp(-lambda); let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return Math.min(7, k - 1);
  };
  let hg = poisson(hLambda), ag = poisson(aLambda);
  // Evita temporadas absurdas de favoritos: los equipos de élite tienen menos probabilidad de caer en goleadas inexplicables.
  const hp = clubPrestige(homeId), ap = clubPrestige(awayId);
  if (hp >= 8 && hg + 2 < ag && Math.random() < 0.70) hg = Math.max(ag - 1, 0);
  if (ap >= 8 && ag + 2 < hg && Math.random() < 0.70) ag = Math.max(hg - 1, 0);
  return { hg, ag };
}

export function emptyStandings(teamIds: string[]): StandingRow[] {
  return teamIds.map(teamId => ({ teamId, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 }));
}

export function applyMatchToStandings(rows: StandingRow[], m: Match): StandingRow[] {
  if (!m.played || m.homeGoals == null || m.awayGoals == null) return rows;
  return rows.map(r => {
    if (r.teamId !== m.home && r.teamId !== m.away) return r;
    const isHome = r.teamId === m.home;
    const gf = isHome ? m.homeGoals! : m.awayGoals!;
    const gc = isHome ? m.awayGoals! : m.homeGoals!;
    const win = gf > gc, draw = gf === gc;
    return { ...r, pj: r.pj + 1, pg: r.pg + (win ? 1 : 0), pe: r.pe + (draw ? 1 : 0), pp: r.pp + (!win && !draw ? 1 : 0), gf: r.gf + gf, gc: r.gc + gc, dg: (r.gf + gf) - (r.gc + gc), pts: r.pts + (win ? 3 : draw ? 1 : 0) };
  });
}

export function sortStandings(rows: StandingRow[]) {
  return [...rows].sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || teamSimulationStrength(b.teamId) - teamSimulationStrength(a.teamId) || (getTeamById(a.teamId)?.name ?? "").localeCompare(getTeamById(b.teamId)?.name ?? ""));
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

export function buildFixture(zoneA: string[], zoneB: string[], interzonales: Array<[string, string]> = []): Match[] {
  const a = generateRoundRobin(zoneA, "A"), b = generateRoundRobin(zoneB, "B");
  const totalRounds = Math.max(...a.map(m => m.round), ...b.map(m => m.round), 0);
  const interRound = totalRounds + 1;
  const inter = interzonales.map(([home, away]) => ({ id: `INT-r${interRound}-${home}-${away}`, round: interRound, home, away, played: false, isClasico: true, phase: "interzonal" as const }));
  return [...a, ...b, ...inter];
}
