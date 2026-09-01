import { getTeamById, getRegionalTeamMeta, getPromocionalTeamMeta } from "@/data/teams-catalog";
import type { Team } from "@/data/teams";
import { FIXTURE_2026, isClasicoMatch } from "@/data/fixture2026";
import type { DivisionId } from "@/data/competitions";

export type MatchPhase =
  | "apertura" | "interzonal" | "clausura" | "liga" | "reducido"
  | "federal" | "regional" | "regional_playoff" | "regional_final"
  | "promocional" | "promocional_final" | "promocional_reducido";

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
  teamId: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

export type DivisionResolution = {
  promoted: string[];
  relegated: string[];
  extraPromoted?: string[];
  championshipWinner?: string | null;
  secondaryChampion?: string | null;
  phaseStandings?: Record<string, StandingRow[]>;
  matches?: Match[];
};

const REGIONAL_REGIONS = [
  "Norte", "Litoral Norte", "Litoral Sur", "Centro", "Cuyo",
  "Pampeana Norte", "Pampeana Sur", "Patagonia",
] as const;

export function buildOfficialFixture(): Match[] {
  return FIXTURE_2026.map(([round, home, away]) => {
    const ht = getTeamById(home);
    return {
      id: `F${round}-${home}-${away}`,
      round,
      home,
      away,
      played: false,
      isClasico: !!ht?.rivals?.includes(away) || isClasicoMatch(home, away),
    };
  });
}

function stableSortIds(teamIds: string[]): string[] {
  return [...teamIds].sort((a, b) => {
    const an = getTeamById(a)?.name ?? a;
    const bn = getTeamById(b)?.name ?? b;
    return an.localeCompare(bn, "es") || a.localeCompare(b);
  });
}

function balancedMap(teamIds: string[], sizes: number[]): Record<string, string> {
  const ids = stableSortIds(teamIds);
  const labels = sizes.map((_, i) => String.fromCharCode(65 + i));
  const map: Record<string, string> = {};
  let cursor = 0;
  // Serpentina estable para que clubes similares no queden siempre juntos.
  const order: string[] = [];
  const remaining = [...labels];
  for (let i = 0; i < ids.length; i++) {
    const row = Math.floor(i / labels.length);
    const pos = row % 2 === 0 ? i % labels.length : labels.length - 1 - (i % labels.length);
    order.push(labels[pos]);
  }
  const counts = Object.fromEntries(labels.map(l => [l, 0])) as Record<string, number>;
  for (const id of ids) {
    let target = order[cursor] ?? labels[0];
    if (counts[target] >= (sizes[labels.indexOf(target)] ?? ids.length)) {
      target = labels.find(l => counts[l] < (sizes[labels.indexOf(l)] ?? ids.length)) ?? labels[0];
    }
    map[id] = target;
    counts[target]++;
    cursor++;
  }
  void remaining;
  return map;
}

export function generateRoundRobin(teamIds: string[], zone: "A" | "B" | string, startRound = 1, invertHome = false): Match[] {
  const ids = [...teamIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push("__BYE__");
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const matches: Match[] = [];
  let arr = [...ids];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a0 = arr[i], b0 = arr[n - 1 - i];
      if (a0 === "__BYE__" || b0 === "__BYE__") continue;
      const swap = ((r + i) % 2 === 0) !== invertHome;
      const home = swap ? a0 : b0;
      const away = swap ? b0 : a0;
      const ht = getTeamById(home);
      matches.push({
        id: `${zone}-r${startRound + r}-${home}-${away}`,
        round: startRound + r,
        home,
        away,
        played: false,
        isClasico: !!ht?.rivals?.includes(away) || isClasicoMatch(home, away),
      });
    }
    arr = [arr[0], ...arr.slice(-1), ...arr.slice(1, -1)];
  }
  return matches;
}

export function generateDoubleRoundRobin(teamIds: string[], zone: string, startRound = 1): Match[] {
  const first = generateRoundRobin(teamIds, zone, startRound, false);
  const rounds = Math.max(0, first.reduce((m, x) => Math.max(m, x.round), startRound - 1) - startRound + 1);
  const second = first.map(m => ({
    ...m,
    id: `${zone}-r${m.round + rounds}-${m.away}-${m.home}`,
    round: m.round + rounds,
    home: m.away,
    away: m.home,
    isClasico: m.isClasico,
  }));
  return [...first, ...second];
}

export function generateMultiRoundRobin(teamIds: string[], zone: string, wheels = 4, startRound = 1): Match[] {
  const base = generateRoundRobin(teamIds, zone, startRound, false);
  const rounds = base.length ? Math.max(...base.map(m => m.round)) - startRound + 1 : 0;
  const out: Match[] = [...base];
  for (let wheel = 1; wheel < wheels; wheel++) {
    const offset = rounds * wheel;
    out.push(...base.map(m => ({
      ...m,
      id: `${zone}-w${wheel + 1}-r${m.round + offset}-${m.away}-${m.home}`,
      round: m.round + offset,
      home: wheel % 2 === 1 ? m.away : m.home,
      away: wheel % 2 === 1 ? m.home : m.away,
    })));
  }
  return out;
}

function buildPerfectCrossZoneRounds(zoneA: string[], zoneB: string[], count: number, prefix: string, startRound: number): Match[] {
  const a = stableSortIds(zoneA), b = stableSortIds(zoneB);
  const n = Math.min(a.length, b.length);
  const matches: Match[] = [];
  const usedPairs = new Set<string>();
  for (let round = 0; round < count; round++) {
    for (let i = 0; i < n; i++) {
      // Rotación para que cada club cambie de rival entre rondas.
      const j = (i + round) % n;
      const home = round % 2 === 0 ? a[i] : b[j];
      const away = round % 2 === 0 ? b[j] : a[i];
      const pairKey = [home, away].sort().join("::");
      if (usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);
      matches.push({ id: `${prefix}-r${startRound + round}-${home}-${away}`, round: startRound + round, home, away, played: false });
    }
  }
  return matches;
}

function crossPairsWithRivals(zoneA: string[], zoneB: string[], startRound: number): Match[] {
  const a = stableSortIds(zoneA);
  const b = stableSortIds(zoneB);
  const bSet = new Set(b);
  const usedA = new Set<string>();
  const usedB = new Set<string>();
  const pairs: Array<[string, string]> = [];

  // Primero intentamos respetar los clásicos/rivalidades declarados.
  for (const aid of a) {
    const rival = getTeamById(aid)?.rivals?.find(r => bSet.has(r));
    if (rival && !usedA.has(aid) && !usedB.has(rival)) {
      pairs.push([aid, rival]);
      usedA.add(aid); usedB.add(rival);
    }
  }
  const freeA = a.filter(id => !usedA.has(id));
  const freeB = b.filter(id => !usedB.has(id));
  for (let i = 0; i < Math.min(freeA.length, freeB.length); i++) {
    pairs.push([freeA[i], freeB[i]]);
  }
  const out: Match[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const [aId, bId] = pairs[i];
    out.push({ id: `PD-CLAS-r${startRound}-${aId}-${bId}`, round: startRound, home: aId, away: bId, played: false, isClasico: !!getTeamById(aId)?.rivals?.includes(bId), phase: "interzonal" });
  }
  return out;
}

function buildSecondInterzonalRound(firstPairs: Match[], zoneA: string[], zoneB: string[], startRound: number): Match[] {
  const used = new Set(firstPairs.map(m => [m.home, m.away].sort().join("::")));
  const a = stableSortIds(zoneA), b = stableSortIds(zoneB);
  const out: Match[] = [];
  for (let shift = 0; shift < b.length; shift++) {
    const candidate: Array<[string, string]> = [];
    for (let i = 0; i < a.length; i++) candidate.push([a[i], b[(i + shift) % b.length]]);
    const valid = candidate.filter(([x, y]) => !used.has([x, y].sort().join("::")));
    if (valid.length === a.length) {
      for (const [x, y] of valid) out.push({ id: `PD-SORT-r${startRound}-${x}-${y}`, round: startRound, home: y, away: x, played: false, phase: "interzonal" });
      return out;
    }
  }
  // Fallback determinista.
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let j = (i + 1) % b.length;
    while (j !== i && used.has([a[i], b[j]].sort().join("::"))) j = (j + 1) % b.length;
    out.push({ id: `PD-SORT-r${startRound}-${b[j]}-${a[i]}`, round: startRound, home: b[j], away: a[i], played: false, phase: "interzonal" });
  }
  return out;
}

export type RegionalSeasonResult = {
  groupStandings: Record<string, StandingRow[]>;
  regionalChampions: string[];
  promotedToFederalA: string[];
  matches: Match[];
};

export function buildRegionalGroupMap(teamIds: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of teamIds) {
    const meta = getRegionalTeamMeta(id);
    if (meta) map[id] = `${meta.region}::${meta.group}`;
  }
  // Los clubes que ingresan desde Federal A conservan una región razonable por provincia.
  const byProvince: Record<string, string> = {
    tucuman: "Norte", salta: "Norte", jujuy: "Norte", catamarca: "Norte",
    formosa: "Litoral Norte", chaco: "Litoral Norte", corrientes: "Litoral Norte", misiones: "Litoral Norte",
    "santa fe": "Litoral Sur", "entre rios": "Litoral Sur",
    "santiago del estero": "Centro",
    mendoza: "Cuyo", "san luis": "Cuyo", "san juan": "Cuyo",
    "la pampa": "Pampeana Sur", "buenos aires": "Pampeana Norte",
    "rio negro": "Patagonia", chubut: "Patagonia", "santa cruz": "Patagonia", "tierra del fuego": "Patagonia", neuquen: "Patagonia",
  };
  const counts = new Map<string, number>();
  for (const value of Object.values(map)) {
    const [r] = value.split("::"); counts.set(`${r}::new`, (counts.get(`${r}::new`) ?? 0) + 1);
  }
  for (const id of teamIds) {
    if (map[id]) continue;
    const team = getTeamById(id);
    const key = (team?.province ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const region = byProvince[key] ?? REGIONAL_REGIONS[0];
    const existingGroups = Array.from({ length: 8 }, (_, i) => String(i + 1));
    const group = existingGroups
      .map(g => `${g}`)
      .sort((a, b) => {
        const ca = teamIds.filter(t => map[t] === `${region}::${a}`).length;
        const cb = teamIds.filter(t => map[t] === `${region}::${b}`).length;
        return ca - cb || Number(a) - Number(b);
      })[0] ?? "1";
    map[id] = `${region}::${group}`;
  }
  return map;
}

function tieBreakOnAggregate(a: string, b: string, aTotal: number, bTotal: number): string {
  if (aTotal > bTotal) return a;
  if (bTotal > aTotal) return b;
  return teamSimulationStrength(a) >= teamSimulationStrength(b) ? a : b;
}

function simulateTwoLegSeries(a: string, b: string, tag: string, roundBase = 1): { winner: string; matches: Match[] } {
  const first = simulateMatch(a, b);
  const second = simulateMatch(b, a);
  const winner = tieBreakOnAggregate(a, b, first.hg + second.ag, first.ag + second.hg);
  return {
    winner,
    matches: [
      { id: `${tag}-1-${a}-${b}`, round: roundBase, home: a, away: b, homeGoals: first.hg, awayGoals: first.ag, played: true, phase: "regional_playoff" },
      { id: `${tag}-2-${b}-${a}`, round: roundBase + 1, home: b, away: a, homeGoals: second.hg, awayGoals: second.ag, played: true, phase: "regional_playoff" },
    ],
  };
}

function simulateSingleMatch(a: string, b: string, tag: string, round: number, neutral = false): { winner: string; match: Match } {
  const score = simulateMatch(a, b, neutral);
  // En partido único no neutral, empate = ventaja deportiva del local.
  const winner = score.hg > score.ag ? a : score.ag > score.hg ? b : (neutral ? (teamSimulationStrength(a) >= teamSimulationStrength(b) ? a : b) : a);
  return {
    winner,
    match: { id: `${tag}-${a}-${b}`, round, home: a, away: b, homeGoals: score.hg, awayGoals: score.ag, played: true, phase: neutral ? "regional_final" : "reducido" },
  };
}

export function simulateRegionalTournament(roster: string[]): RegionalSeasonResult {
  const regionalMap = buildRegionalGroupMap(roster);
  const groupStandings: Record<string, StandingRow[]> = {};
  const allGroupMatches: Match[] = [];
  const byRegion = new Map<string, Array<{ key: string; rows: StandingRow[] }>>();

  const groups = new Map<string, string[]>();
  for (const id of roster) {
    const key = regionalMap[id];
    if (!key) continue;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(id);
  }
  for (const [key, ids] of groups) {
    const fixtures = generateDoubleRoundRobin(ids, `RFE-${key}`).map(m => ({ ...m, phase: "regional" as const }));
    let rows = emptyStandings(ids);
    for (const m of fixtures) {
      const s = simulateMatch(m.home, m.away);
      const played = { ...m, played: true, homeGoals: s.hg, awayGoals: s.ag };
      rows = applyMatchToStandings(rows, played);
      allGroupMatches.push(played);
    }
    groupStandings[key] = sortStandings(rows);
    const region = key.split("::")[0];
    (byRegion.get(region) ?? byRegion.set(region, []).get(region)!).push({ key, rows: groupStandings[key] });
  }

  const regionalChampions: string[] = [];
  const playoffMatches: Match[] = [];
  for (const [region, regionGroups] of byRegion) {
    const seeds = regionGroups.flatMap(g => [g.rows[0], g.rows[1]].filter(Boolean)) as StandingRow[];
    const ordered = [...seeds].sort((a, b) => {
      const ap = a.pts / Math.max(1, a.pj), bp = b.pts / Math.max(1, b.pj);
      return bp - ap || b.dg - a.dg || teamSimulationStrength(b.teamId) - teamSimulationStrength(a.teamId);
    });
    const target = 2 ** Math.ceil(Math.log2(Math.max(2, Math.min(32, ordered.length))));
    const current = ordered.slice(0, Math.min(target, ordered.length)).map(r => r.teamId);
    let round = 10;
    while (current.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < current.length; i += 2) {
        if (!current[i + 1]) { next.push(current[i]); continue; }
        const tie = simulateTwoLegSeries(current[i], current[i + 1], `RFE-${region}-R${round}`, round);
        playoffMatches.push(...tie.matches);
        next.push(tie.winner);
      }
      current.splice(0, current.length, ...next);
      round += 2;
    }
    if (current[0]) regionalChampions.push(current[0]);
  }

  const promotedToFederalA: string[] = [];
  for (let i = 0; i + 1 < regionalChampions.length; i += 2) {
    const a = regionalChampions[i], b = regionalChampions[i + 1];
    const single = simulateSingleMatch(a, b, "RFE-NAC", 99, true);
    promotedToFederalA.push(single.winner);
    playoffMatches.push(single.match);
  }
  return { groupStandings, regionalChampions, promotedToFederalA, matches: [...allGroupMatches, ...playoffMatches] };
}

export function buildFederalZoneMap(teamIds: string[]): Record<string, string> {
  // Distribución fija y geográfica para 37 equipos: 10 + 9 + 9 + 9.
  // No usamos el viejo campo zone A/B del catálogo porque ese campo nació
  // para otras competencias.
  const fixed: Record<string, "A" | "B" | "C" | "D"> = {
    // A · Norte / NEA
    "9dejulio": "A", "bartolomemitre": "A", "bocaunidos": "A", "defensores": "A", "juventudantoniana": "A",
    "sanmartin": "A", "sarmiento": "A", "sarmiento2": "A", "soldeamerica": "A", "tucumancentral": "A",
    // B · Centro / Cuyo
    "atenas": "B", "atleticoclubsanmartin": "B", "costabrava": "B", "deportivoargentino": "B", "fadep": "B",
    "huracanlasheras": "B", "juventudunidauniversitario": "B", "sportivoatleticoclub": "B", "sportivobelgrano": "B",
    // C · Buenos Aires / litoral sur
    "circulodeportivo": "C", "defensoresdebelgrano2": "C", "douglashaig": "C", "ellinqueno": "C", "escobarfutbolclub": "C",
    "gimnasiayesgrima": "C", "independiente2": "C", "santamarina": "C", "kimberley": "C",
    // D · Patagonia y extremo sur; Alvarado completa el corredor bonaerense sur.
    "alvarado": "D", "cipolletti": "D", "deportivorincon": "D", "germinal": "D", "gimnasiayesgrima2": "D",
    "guillermobrown": "D", "olimpo": "D", "soldemayo": "D", "villamitre": "D",
  };

  const valid = new Set(teamIds);
  const map: Record<string, string> = {};
  for (const [id, zone] of Object.entries(fixed)) if (valid.has(id)) map[id] = zone;

  const sizes = { A: 10, B: 9, C: 9, D: 9 } as const;
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const z of Object.values(map)) counts[z as keyof typeof counts]++;

  // Fallback para equipos que lleguen por ascenso/descenso o tengan un ID nuevo:
  // completamos los cupos manteniendo la estabilidad y sin volver a usar A/B legacy.
  const pending = stableSortIds(teamIds.filter(id => !map[id]));
  for (const id of pending) {
    const target = (Object.keys(sizes) as Array<keyof typeof sizes>).sort((a, b) => counts[a] - counts[b] || a.localeCompare(b))[0];
    map[id] = target;
    counts[target]++;
  }
  return map;
}

export function buildDivisionCareerFixture(division: DivisionId, teamIds: string[], userTeamId?: string, persistedZoneMap?: Record<string, string>): {
  matches: Match[];
  zone: string;
  otherMatches: Match[];
  activeTeamIds: string[];
  zoneMap?: Record<string, string>;
} {
  const ids = [...new Set(teamIds)];

  if (division === "primera_division") {
    const zm = balancedMap(ids, [Math.ceil(ids.length / 2), Math.floor(ids.length / 2)]);
    const zoneA = ids.filter(id => zm[id] === "A");
    const zoneB = ids.filter(id => zm[id] === "B");
    const userZone = userTeamId && zm[userTeamId] === "B" ? "B" : "A";
    const own = userZone === "A" ? zoneA : zoneB;
    const other = userZone === "A" ? zoneB : zoneA;
    // Apertura: 14 partidos contra la propia zona + 2 interzonales.
    const aperturaOwn = generateRoundRobin(own, userZone, 1).map(m => ({ ...m, phase: "apertura" as const }));
    const aperturaOther = generateRoundRobin(other, userZone === "A" ? "B" : "A", 1).map(m => ({ ...m, phase: "apertura" as const }));
    const aperturaClassico = crossPairsWithRivals(zoneA, zoneB, 15).map(m => ({ ...m, phase: "apertura" as const }));
    const aperturaInter = buildSecondInterzonalRound(aperturaClassico, zoneA, zoneB, 16).map(m => ({ ...m, phase: "apertura" as const }));
    const aperturaInterzonal = [...aperturaClassico, ...aperturaInter];

    // Clausura: exactamente el mismo formato, invirtiendo las localías.
    const clausuraOwn = generateRoundRobin(own, userZone, 17, true).map(m => ({ ...m, phase: "clausura" as const }));
    const clausuraOther = generateRoundRobin(other, userZone === "A" ? "B" : "A", 17, true).map(m => ({ ...m, phase: "clausura" as const }));
    const clausuraInterzonal = aperturaInterzonal.map(m => ({
      ...m,
      id: m.id.replace("apertura", "clausura"),
      round: m.round + 16,
      home: m.away,
      away: m.home,
      phase: "clausura" as const,
    }));

    const userIds = new Set(own);
    const matches = [
      ...aperturaOwn,
      ...aperturaInterzonal,
      ...clausuraOwn,
      ...clausuraInterzonal,
    ].filter(m => userIds.has(m.home) || userIds.has(m.away))
      .sort((a, b) => a.round - b.round || a.id.localeCompare(b.id));
    // Los interzonales se mantienen en el calendario activo porque afectan a ambas zonas.
    const otherMatches = [
      ...aperturaOther,
      ...clausuraOther,
    ].sort((a, b) => a.round - b.round || a.id.localeCompare(b.id));
    return { matches, otherMatches, zone: userZone, activeTeamIds: ids, zoneMap: zm };
  }

  if (division === "primera_nacional") {
    const zm = balancedMap(ids, [Math.ceil(ids.length / 2), Math.floor(ids.length / 2)]);
    const zoneA = ids.filter(id => zm[id] === "A");
    const zoneB = ids.filter(id => zm[id] === "B");
    const userZone = userTeamId && zm[userTeamId] === "B" ? "B" : "A";
    const own = userZone === "A" ? zoneA : zoneB;
    const other = userZone === "A" ? zoneB : zoneA;
    const ownRegular = generateDoubleRoundRobin(own, `PN-${userZone}`, 1).map(m => ({ ...m, phase: "liga" as const }));
    const otherRegular = generateDoubleRoundRobin(other, `PN-${userZone === "A" ? "B" : "A"}`, 1).map(m => ({ ...m, phase: "liga" as const }));
    const inter = buildPerfectCrossZoneRounds(zoneA, zoneB, 2, "PN-INT", ownRegular.length ? Math.max(...ownRegular.map(m => m.round)) + 1 : 35).map(m => ({ ...m, phase: "interzonal" as const }));
    const userIds = new Set(own);
    return {
      matches: [...ownRegular, ...inter].filter(m => userIds.has(m.home) || userIds.has(m.away)).sort((a, b) => a.round - b.round),
      otherMatches: [...otherRegular, ...inter].filter(m => !userIds.has(m.home) && !userIds.has(m.away)).sort((a, b) => a.round - b.round),
      zone: userZone,
      activeTeamIds: own,
      zoneMap: zm,
    };
  }

  if (division === "primera_b") {
    const matches = generateDoubleRoundRobin(ids, "PB", 1).map(m => ({ ...m, phase: "liga" as const }));
    return { matches, otherMatches: [], zone: "A", activeTeamIds: ids };
  }

  if (division === "primera_c") {
    const zm = balancedMap(ids, [Math.ceil(ids.length / 2), Math.floor(ids.length / 2)]);
    const zoneA = ids.filter(id => zm[id] === "A");
    const zoneB = ids.filter(id => zm[id] === "B");
    const userZone = userTeamId && zm[userTeamId] === "B" ? "B" : "A";
    const own = userZone === "A" ? zoneA : zoneB;
    const other = userZone === "A" ? zoneB : zoneA;
    const ownRegular = generateDoubleRoundRobin(own, `PC-${userZone}`, 1).map(m => ({ ...m, phase: "liga" as const }));
    const otherRegular = generateDoubleRoundRobin(other, `PC-${userZone === "A" ? "B" : "A"}`, 1).map(m => ({ ...m, phase: "liga" as const }));
    const inter = buildPerfectCrossZoneRounds(zoneA, zoneB, 6, "PC-INT", 27).map(m => ({ ...m, phase: "interzonal" as const }));
    const userIds = new Set(own);
    return {
      matches: [...ownRegular, ...inter].filter(m => userIds.has(m.home) || userIds.has(m.away)).sort((a, b) => a.round - b.round),
      otherMatches: [...otherRegular, ...inter].filter(m => !userIds.has(m.home) && !userIds.has(m.away)).sort((a, b) => a.round - b.round),
      zone: userZone,
      activeTeamIds: own,
      zoneMap: zm,
    };
  }

  if (division === "promocional_amateur") {
    const zoneA = ids.filter(id => getPromocionalTeamMeta(id)?.zone === "A");
    const zoneB = ids.filter(id => getPromocionalTeamMeta(id)?.zone === "B");
    const userZone = userTeamId && zoneB.includes(userTeamId) ? "B" : "A";
    const active = new Set(userZone === "A" ? zoneA : zoneB);
    const a = generateRoundRobin(zoneA, "PROMO-A", 1).map(m => ({ ...m, phase: "promocional" as const }));
    const b = generateRoundRobin(zoneB, "PROMO-B", 1).map(m => ({ ...m, phase: "promocional" as const }));
    const allRegular = [...a, ...b];
    // La final de ascenso NO forma parte de la fase regular. Se juega en /reducido
    // una vez terminadas las zonas, por lo que nunca puede dejar la temporada bloqueada
    // esperando un partido que todavía no corresponde disputar.
    const activeMatches = allRegular.filter(m => active.has(m.home) || active.has(m.away));
    const otherMatches = allRegular.filter(m => !active.has(m.home) && !active.has(m.away));
    return {
      matches: activeMatches.sort((a,b)=>a.round-b.round),
      otherMatches: otherMatches.sort((a,b)=>a.round-b.round),
      zone: userZone, activeTeamIds: [...active], zoneMap: Object.fromEntries([...zoneA.map(id=>[id,"A"]),...zoneB.map(id=>[id,"B"])]),
    };
  }

  if (division === "federal_a") {
    const zoneMap = persistedZoneMap ?? buildFederalZoneMap(ids);
    const groups = new Map<string, string[]>([["A", []], ["B", []], ["C", []], ["D", []]]);
    for (const id of ids) (groups.get(zoneMap[id] ?? "A") ?? groups.get("A")!).push(id);
    const userZone = zoneMap[userTeamId ?? ""] ?? "A";
    const all: Match[] = [];
    for (const [z, group] of groups) all.push(...generateDoubleRoundRobin(group, `FA-${z}`, 1).map(m => ({ ...m, phase: "federal" as const })));
    const active = new Set(groups.get(userZone) ?? []);
    return {
      matches: all.filter(m => active.has(m.home) || active.has(m.away)).sort((a, b) => a.round - b.round),
      otherMatches: all.filter(m => !active.has(m.home) && !active.has(m.away)).sort((a, b) => a.round - b.round),
      zone: userZone,
      activeTeamIds: groups.get(userZone) ?? [],
      zoneMap,
    };
  }

  const metaMap = buildRegionalGroupMap(ids);
  const userKey = metaMap[userTeamId ?? ""] ?? `${REGIONAL_REGIONS[0]}::1`;
  const userIds = new Set(ids.filter(id => metaMap[id] === userKey));
  const all = ids.flatMap(id => [] as Match[]);
  void all;
  const userMatches = generateDoubleRoundRobin([...userIds], `RFE-${userKey}`, 1).map(m => ({ ...m, phase: "regional" as const }));
  const otherMatches: Match[] = [];
  const groups = new Map<string, string[]>();
  for (const id of ids) (groups.get(metaMap[id]) ?? groups.set(metaMap[id], []).get(metaMap[id])!).push(id);
  for (const [key, group] of groups) {
    if (key === userKey) continue;
    otherMatches.push(...generateDoubleRoundRobin(group, `RFE-${key}`, 1).map(m => ({ ...m, phase: "regional" as const })));
  }
  return { matches: userMatches, otherMatches, zone: userKey.split("::")[0], activeTeamIds: [...userIds] };
}

function clubPrestige(id: string): number {
  const prestige: Record<string, number> = {
    riverplate: 10, bocajuniors: 10, racingclub: 8, independiente: 8, sanlorenzo: 8,
    estudiantesdelaplata: 8, velezsarsfield: 8, rosariocentral: 7, newellsoldboys: 7,
    argentinosjuniors: 7, lanus: 7, huracan: 6, belgrano: 6, talleresdecordoba: 7,
    colon: 6, gimnasialaplata: 6, gimnasia: 6, sanmartintucuman: 6,
  };
  return prestige[id] ?? 0;
}

export function teamSimulationStrength(teamId: string): number {
  const t = getTeamById(teamId);
  if (!t) return 50;
  const raw = (t.stats.speed + t.stats.jump + t.stats.power + t.stats.defense) / 4;
  return raw * 0.90 + (50 + clubPrestige(teamId) * 2.5) * 0.10;
}

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return Math.min(7, k - 1);
}

export function simulateMatch(homeId: string, awayId: string, neutral = false): { hg: number; ag: number } {
  const home = getTeamById(homeId), away = getTeamById(awayId);
  if (!home || !away) return { hg: 0, ag: 0 };
  const h = teamSimulationStrength(homeId);
  const a = teamSimulationStrength(awayId);
  const diff = Math.max(-15, Math.min(15, h - a));
  const homeAdv = neutral ? 0 : 0.12;
  const hLambda = Math.max(0.35, Math.min(2.05, 1.02 + homeAdv + diff * 0.032));
  const aLambda = Math.max(0.30, Math.min(1.65, 0.82 - diff * 0.028));
  let hg = poisson(hLambda);
  let ag = poisson(aLambda);

  // Menos varianza para clubes de nivel muy alto: evita temporadas absurdas sin volverlos invencibles.
  const hp = clubPrestige(homeId), ap = clubPrestige(awayId);
  if (hp >= 8 && h >= a + 7 && hg < ag && Math.random() < 0.60) hg = Math.max(ag - 1, 0);
  if (ap >= 8 && a >= h + 7 && ag < hg && Math.random() < 0.60) ag = Math.max(hg - 1, 0);
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
    const win = gf > gc;
    const draw = gf === gc;
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

export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) =>
    b.pts - a.pts || b.dg - a.dg || b.gf - a.gf ||
    teamSimulationStrength(b.teamId) - teamSimulationStrength(a.teamId) ||
    (getTeamById(a.teamId)?.name ?? "").localeCompare(getTeamById(b.teamId)?.name ?? ""));
}

export type Bracket = { octavos: Pair[]; cuartos: Pair[]; semis: Pair[]; final: Pair[] };
export type Pair = { a?: string; b?: string; winner?: string; ag?: number; bg?: number };

export function buildReducido(standA: StandingRow[], standB: StandingRow[], extraSeed?: string): Bracket {
  const a = sortStandings(standA), b = sortStandings(standB);
  const seedsA = a.slice(1, 8).map((r, i) => ({ id: r.teamId, rank: i + 2 }));
  const seedsB = b.slice(1, 8).map((r, i) => ({ id: r.teamId, rank: i + 2 }));
  const octavos: Pair[] = [];

  // Primera fase del Reducido: 14 equipos, 7 cruces cruzados.
  // 2A-8B, 3A-7B, 4A-6B, 5A-5B, 6A-4B, 7A-3B, 8A-2B.
  for (let i = 0; i < 7; i++) {
    const aa = seedsA[i];
    const bb = seedsB[6 - i];
    if (!aa || !bb) continue;
    octavos.push(aa.rank <= bb.rank ? { a: aa.id, b: bb.id } : { a: bb.id, b: aa.id });
  }

  // El perdedor de la final entra directamente en cuartos. Lo representamos
  // como un octavo participante con bye para que advanceBracket construya
  // correctamente 4 cruces a partir de 8 equipos.
  if (extraSeed) octavos.push({ a: extraSeed, winner: extraSeed });

  return { octavos, cuartos: [], semis: [], final: [] };
}
export function buildFixture(zoneA: string[], zoneB: string[], interzonales: Array<[string, string]> = []): Match[] {
  const a = generateRoundRobin(zoneA, "A"), b = generateRoundRobin(zoneB, "B");
  const totalRounds = Math.max(...a.map(m => m.round), ...b.map(m => m.round), 0);
  const interRound = totalRounds + 1;
  const inter = interzonales.map(([home, away]) => ({ id: `INT-r${interRound}-${home}-${away}`, round: interRound, home, away, played: false, isClasico: true, phase: "interzonal" as const }));
  return [...a, ...b, ...inter];
}

function simulateAllMatches(matches: Match[]): { rows: StandingRow[]; played: Match[] } {
  const ids = Array.from(new Set(matches.flatMap(m => [m.home, m.away])));
  let rows = emptyStandings(ids);
  const played: Match[] = [];
  for (const m of matches) {
    const s = simulateMatch(m.home, m.away);
    const pm = { ...m, played: true, homeGoals: s.hg, awayGoals: s.ag };
    rows = applyMatchToStandings(rows, pm);
    played.push(pm);
  }
  return { rows, played };
}

function simulateElimination(ids: string[], tag: string, legs: 1 | 2, neutralFinal = false): { winner: string; matches: Match[] } {
  let current = stableSortIds(ids);
  const matches: Match[] = [];
  let round = 1;
  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      if (!current[i + 1]) { next.push(current[i]); continue; }
      if (legs === 2) {
        const r = simulateTwoLegSeries(current[i], current[i + 1], `${tag}-R${round}`, round * 2);
        matches.push(...r.matches); next.push(r.winner);
      } else {
        const r = simulateSingleMatch(current[i], current[i + 1], `${tag}-R${round}`, round, neutralFinal && current.length === 2);
        matches.push(r.match); next.push(r.winner);
      }
    }
    current = next; round++;
  }
  return { winner: current[0] ?? "", matches };
}

function resolvePrimeraDivision(standingsByZone: Record<string, StandingRow[]>, allRegularMatches: Match[]): DivisionResolution {
  const a = sortStandings(standingsByZone.A ?? []), b = sortStandings(standingsByZone.B ?? []);
  const playRound = (zoneA: StandingRow[], zoneB: StandingRow[]) => {
    const seeds: string[] = [];
    for (let i = 0; i < 8; i++) { if (zoneA[i]) seeds.push(zoneA[i].teamId); if (zoneB[i]) seeds.push(zoneB[i].teamId); }
    const winners: string[] = [];
    const matches: Match[] = [];
    for (let i = 0; i < 8; i++) {
      const home = zoneA[i]?.teamId, away = zoneB[7 - i]?.teamId;
      if (!home || !away) continue;
      const r = simulateSingleMatch(home, away, "PD-OCT", i + 1, false);
      winners.push(r.winner); matches.push(r.match);
    }
    const q = simulateElimination(winners, "PD-Q", 1);
    const s = simulateElimination(q.winner ? [q.winner] : [], "PD-S", 1, true);
    return { winner: s.winner || q.winner || winners[0], matches: [...matches, ...q.matches, ...s.matches] };
  };
  const apertura = playRound(a, b);
  const clausura = playRound(b, a);
  const annualWinner = sortStandings(Array.from(new Map([...a, ...b].map(r => [r.teamId, r])).values()))[0]?.teamId ?? null;
  return {
    promoted: [],
    relegated: [],
    championshipWinner: annualWinner,
    secondaryChampion: clausura.winner || null,
    phaseStandings: { A: a, B: b },
    matches: [...allRegularMatches, ...apertura.matches, ...clausura.matches],
  };
}

function resolvePrimeraNacional(standingsByZone: Record<string, StandingRow[]>): DivisionResolution {
  const a = sortStandings(standingsByZone.A ?? []), b = sortStandings(standingsByZone.B ?? []);
  const final = a[0] && b[0] ? simulateSingleMatch(a[0].teamId, b[0].teamId, "PN-FINAL", 100, true) : null;
  const first = final?.winner ?? a[0]?.teamId ?? b[0]?.teamId;
  const loser = final?.winner ? (final.winner === a[0]?.teamId ? b[0]?.teamId : a[0]?.teamId) : undefined;

  // Primera fase del Reducido: 2°-8° de cada zona, 7 cruces cruzados.
  const seedsA = a.slice(1, 8), seedsB = b.slice(1, 8);
  const firstPhaseWinners: string[] = [];
  const firstPhaseMatches: Match[] = [];
  for (let i = 0; i < 7; i++) {
    const x = seedsA[i]?.teamId, y = seedsB[6 - i]?.teamId;
    if (!x || !y) continue;
    const rankX = a.findIndex(r => r.teamId === x) + 1;
    const rankY = b.findIndex(r => r.teamId === y) + 1;
    const home = rankX <= rankY ? x : y;
    const away = home === x ? y : x;
    const r = simulateSingleMatch(home, away, `PN-R1-${i}`, 101 + i, false);
    firstPhaseWinners.push(r.winner);
    firstPhaseMatches.push(r.match);
  }

  // 7 ganadores + perdedor de la final = 8 equipos para cuartos.
  const rank = new Map<string, number>();
  [...a, ...b].forEach((r, i) => rank.set(r.teamId, i + 1));
  if (loser) rank.set(loser, 0);
  const qSeeds = loser ? [...firstPhaseWinners, loser] : firstPhaseWinners;
  qSeeds.sort((x, y) => (rank.get(x) ?? 999) - (rank.get(y) ?? 999));
  const reduced = simulateElimination(qSeeds, "PN-R", 1, false);

  return {
    promoted: [first, reduced.winner].filter((x, i, arr) => x && arr.indexOf(x) === i) as string[],
    relegated: [],
    phaseStandings: { A: a, B: b },
    matches: [...(final ? [final.match] : []), ...firstPhaseMatches, ...reduced.matches],
  };
}
function resolvePrimeraB(standings: StandingRow[]): DivisionResolution {
  const rows = sortStandings(standings);
  const direct = rows[0]?.teamId;
  const reduced = rows.slice(1, 9).map(r => r.teamId);
  const playoff = reduced.length ? simulateElimination(reduced, "PB-RED", 2).winner : "";
  return { promoted: [direct, playoff].filter(Boolean) as string[], relegated: rows.slice(-2).map(r => r.teamId) };
}

function resolvePrimeraC(standingsByZone: Record<string, StandingRow[]>): DivisionResolution {
  const a = sortStandings(standingsByZone.A ?? []), b = sortStandings(standingsByZone.B ?? []);
  const final = a[0] && b[0] ? simulateTwoLegSeries(a[0].teamId, b[0].teamId, "PC-FINAL", 100) : null;
  const direct = final?.winner ?? a[0]?.teamId ?? b[0]?.teamId;
  const loser = final ? (final.winner === a[0]?.teamId ? b[0]?.teamId : a[0]?.teamId) : undefined;
  const pool = [...a.slice(1, 7), ...b.slice(1, 7)].map(r => r.teamId);
  if (loser) pool.push(loser);
  const reduced = simulateElimination(pool, "PC-RED", 2);
  return { promoted: [direct, reduced.winner].filter((x, i, arr) => x && arr.indexOf(x) === i) as string[], relegated: [], phaseStandings: { A: a, B: b }, matches: [...(final ? final.matches : []), ...reduced.matches] };
}

function resolveFederalA(zoneMap: Record<string, string>, phase1StandingsByZone: Record<string, StandingRow[]>): DivisionResolution {
  const allPhase1 = Object.values(phase1StandingsByZone).flatMap(x => x);
  const zoneLists = Object.fromEntries(["A", "B", "C", "D"].map(z => [z, sortStandings(phase1StandingsByZone[z] ?? [])])) as Record<string, StandingRow[]>;
  const championshipIds: string[] = [];
  for (const z of ["A", "B", "C", "D"]) championshipIds.push(...zoneLists[z].slice(0, 4).map(r => r.teamId));
  if (zoneLists.A[4]) championshipIds.push(zoneLists.A[4].teamId);
  const remainingFifths = [zoneLists.B[4], zoneLists.C[4], zoneLists.D[4]].filter(Boolean) as StandingRow[];
  remainingFifths.sort((x, y) => y.pts - x.pts || y.dg - x.dg);
  if (remainingFifths[0] && !championshipIds.includes(remainingFifths[0].teamId)) championshipIds.push(remainingFifths[0].teamId);
  const championship = championshipIds.slice(0, 18);
  const rev = allPhase1.filter(r => !championship.includes(r.teamId)).map(r => r.teamId);
  const makeGroups = (ids: string[], sizes: number[]) => {
    const sorted = ids.sort((a, b) => teamSimulationStrength(b) - teamSimulationStrength(a));
    const groups: string[][] = sizes.map(() => []);
    let cursor = 0;
    for (const id of sorted) { groups[cursor % groups.length].push(id); cursor++; }
    // Balance sizes exactly.
    for (let i = 0; i < groups.length; i++) while (groups[i].length > sizes[i]) {
      const moved = groups[i].pop()!;
      const target = groups.findIndex((g, j) => g.length < sizes[j]);
      if (target >= 0) groups[target].push(moved);
    }
    return groups;
  };
  const cc = makeGroups(championship, [9, 9]);
  const rr = makeGroups(rev, [9, 10]);
  const phaseStandings: Record<string, StandingRow[]> = {};
  for (let i = 0; i < cc.length; i++) phaseStandings[`campeonato_${i}`] = simulateAllMatches(generateRoundRobin(cc[i], `FAC${i}`, 1).map(m => ({ ...m, phase: "federal" as const }))).rows;
  for (let i = 0; i < rr.length; i++) phaseStandings[`revalida_${i}`] = simulateAllMatches(generateRoundRobin(rr[i], `FAR${i}`, 1).map(m => ({ ...m, phase: "federal" as const }))).rows;
  const champQual = [0, 1].flatMap(i => sortStandings(phaseStandings[`campeonato_${i}`] ?? []).slice(0, 4).map(r => r.teamId));
  const revQual = [0, 1].flatMap(i => sortStandings(phaseStandings[`revalida_${i}`] ?? []).slice(0, 5).map(r => r.teamId));
  const first = simulateElimination(champQual, "FA-CAM", 2);
  const second = simulateElimination(revQual, "FA-REV", 2);
  const revalAll = [0, 1].flatMap(i => phaseStandings[`revalida_${i}`] ?? []);
  const relegated = sortStandings(revalAll).slice(-4).map(r => r.teamId);
  void zoneMap;
  return { promoted: [first.winner, second.winner].filter(Boolean), relegated, phaseStandings, matches: [...first.matches, ...second.matches] };
}

export function simulateDivisionSeason(division: DivisionId, roster: string[], userState?: { zone: string; standings: StandingRow[]; otherStandings?: StandingRow[]; matches: Match[]; otherMatches?: Match[]; federalZoneMap?: Record<string, string> }): LeagueSeasonResult {
  if (userState) {
    const allPlayed = [...userState.matches, ...(userState.otherMatches ?? [])];
    const allIds = Array.from(new Set(roster));
    let rows = emptyStandings(allIds);
    for (const m of allPlayed) rows = applyMatchToStandings(rows, m);
    const byZone: Record<string, StandingRow[]> = {};
    if (division === "primera_division" || division === "primera_nacional" || division === "primera_c") {
      const zm = buildDivisionCareerFixture(division, roster, undefined).zoneMap ?? balancedMap(roster, [Math.ceil(roster.length / 2), Math.floor(roster.length / 2)]);
      for (const id of roster) (byZone[zm[id] ?? "A"] ??= []).push(rows.find(r => r.teamId === id)!);
    } else if (division === "federal_a") {
      const zm = userState.federalZoneMap ?? buildFederalZoneMap(roster);
      for (const id of roster) (byZone[zm[id] ?? "A"] ??= []).push(rows.find(r => r.teamId === id)!);
    } else if (division === "regional_federal_amateur") {
      const gm = buildRegionalGroupMap(roster);
      for (const id of roster) (byZone[gm[id] ?? "Norte::1"] ??= []).push(rows.find(r => r.teamId === id)!);
    } else byZone.A = sortStandings(rows);
    for (const k of Object.keys(byZone)) byZone[k] = sortStandings(byZone[k].filter(Boolean));
    return { division, standings: sortStandings(rows), standingsByZone: byZone, matches: allPlayed, zoneMap: userState.federalZoneMap };
  }

  const fixture = buildDivisionCareerFixture(division, roster);
  const all = [...fixture.matches, ...fixture.otherMatches];
  const { rows, played } = simulateAllMatches(all);
  const byZone: Record<string, StandingRow[]> = {};
  if (division === "primera_division" || division === "primera_nacional" || division === "primera_c") {
    const zm = fixture.zoneMap ?? balancedMap(roster, [Math.ceil(roster.length / 2), Math.floor(roster.length / 2)]);
    for (const id of roster) (byZone[zm[id] ?? "A"] ??= []).push(rows.find(r => r.teamId === id)!);
  } else if (division === "federal_a") {
    const zm = fixture.zoneMap ?? buildFederalZoneMap(roster);
    for (const id of roster) (byZone[zm[id] ?? "A"] ??= []).push(rows.find(r => r.teamId === id)!);
  } else if (division === "regional_federal_amateur") {
    const gm = buildRegionalGroupMap(roster);
    for (const id of roster) (byZone[gm[id] ?? "Norte::1"] ??= []).push(rows.find(r => r.teamId === id)!);
  } else byZone.A = sortStandings(rows);
  for (const k of Object.keys(byZone)) byZone[k] = sortStandings(byZone[k].filter(Boolean));
  return { division, standings: sortStandings(rows), standingsByZone: byZone, matches: played, zoneMap: fixture.zoneMap };
}

export function resolveDivisionSeason(division: DivisionId, roster: string[], standings: StandingRow[], standingsByZone: Record<string, StandingRow[]>, regularMatches: Match[], zoneMap?: Record<string, string>): DivisionResolution {
  if (division === "primera_division") return resolvePrimeraDivision(standingsByZone, regularMatches);
  if (division === "primera_nacional") return resolvePrimeraNacional(standingsByZone);
  if (division === "primera_b") return resolvePrimeraB(standings);
  if (division === "primera_c") return resolvePrimeraC(standingsByZone);
  if (division === "promocional_amateur") {
    const a = sortStandings(standingsByZone.A ?? []), b = sortStandings(standingsByZone.B ?? []);
    const final = a[0] && b[0] ? simulateSingleMatch(a[0].teamId, b[0].teamId, "PROMO-FINAL", 10, true) : null;
    const direct = final?.winner;
    const loser = final ? (final.winner === a[0]?.teamId ? b[0]?.teamId : a[0]?.teamId) : undefined;
    const pairs = [[a[1]?.teamId,b[3]?.teamId],[b[1]?.teamId,a[3]?.teamId],[a[2]?.teamId,b[2]?.teamId]].filter(([x,y])=>x&&y) as [string,string][];
    const first = pairs.map(([x,y],i)=>simulateSingleMatch(x,y,`PROMO-R1-${i}`,20+i,false));
    const semiSeeds = loser ? [...first.map(r=>r.winner), loser] : first.map(r=>r.winner);
    const semi1 = semiSeeds.length >= 2 ? simulateSingleMatch(semiSeeds[0], semiSeeds[1], "PROMO-S1", 30, false) : null;
    const semi2 = semiSeeds.length >= 4 ? simulateSingleMatch(semiSeeds[2], semiSeeds[3], "PROMO-S2", 31, false) : null;
    const redFinal = semi1?.winner && semi2?.winner ? simulateSingleMatch(semi1.winner, semi2.winner, "PROMO-RF", 32, false) : null;
    const playoffMatches = [...first.map(r=>r.match), ...(semi1 ? [semi1.match] : []), ...(semi2 ? [semi2.match] : []), ...(redFinal ? [redFinal.match] : [])];
    return { promoted: [direct, redFinal?.winner].filter((x,i,arr)=>x&&arr.indexOf(x)===i) as string[], relegated: [], phaseStandings: { A:a, B:b }, matches: [...(final ? [final.match] : []), ...playoffMatches] };
  }
  if (division === "federal_a") return resolveFederalA(zoneMap ?? buildFederalZoneMap(roster), standingsByZone);
  if (division === "regional_federal_amateur") {
    const reg = simulateRegionalTournament(roster);
    return { promoted: reg.promotedToFederalA, relegated: [], matches: reg.matches };
  }
  return { promoted: [], relegated: [] };
}

export type LeagueSeasonResult = {
  division: DivisionId;
  standings: StandingRow[];
  standingsByZone: Record<string, StandingRow[]>;
  matches: Match[];
  zoneMap?: Record<string, string>;
};
