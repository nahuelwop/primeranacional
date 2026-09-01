import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ZONE_A, ZONE_B } from "@/data/teams";
import type { DivisionId } from "@/data/competitions";
import {
  applyMatchToStandings, emptyStandings,
  Match, simulateMatch, sortStandings, StandingRow,
  Bracket, Pair,
  buildOfficialFixture,
} from "@/lib/tournament";

export type TDifficulty = "easy" | "normal" | "hard" | "expert";
type PlayoffDivision = "primera_nacional" | "primera_b" | "primera_c" | "promocional_amateur";
type PlayoffKind = "pn" | "pb" | "pc" | "promocional";

// Pair conserva el resultado de una serie. Para B Metro / C / Reducido Promo
// se usan dos piernas; para Primera Nacional y las finales directas del Promo/C
// se usa una sola.
type CareerPair = Pair & {
  leg1a?: number;
  leg1b?: number;
  leg2a?: number;
  leg2b?: number;
  legs?: 1 | 2;
};

type State = {
  fixture: Match[];
  standA: StandingRow[];
  standB: StandingRow[];
  currentRound: number;
  userTeamId?: string;
  division?: PlayoffDivision;
  season: number;
  finalDirecta?: CareerPair;
  bracket?: { octavos: CareerPair[]; cuartos: CareerPair[]; semis: CareerPair[]; final: CareerPair[] };
  champion?: string;
  reducidoChampion?: string;
  introVista: boolean;
  difficulty: TDifficulty;
  objetivo: "ascenso_directo" | "reducido" | "mantener";
  lastRoundSummarized: number;
};

type SeedArgs = {
  standA: StandingRow[];
  standB: StandingRow[];
  userTeamId: string;
  season: number;
  difficulty: TDifficulty;
  division?: PlayoffDivision;
};

type Actions = {
  init: () => void;
  reset: () => void;
  setUserTeam: (id: string) => void;
  playRound: (round: number) => void;
  playAll: () => void;
  recordUserMatch: (matchId: string, hg: number, ag: number) => void;
  simulateUserMatch: (matchId: string) => { hg: number; ag: number } | null;
  startPlayoffs: () => void;
  advanceBracket: () => void;
  setIntroVista: (v: boolean) => void;
  setDifficulty: (d: TDifficulty) => void;
  setObjetivo: (o: "ascenso_directo" | "reducido" | "mantener") => void;
  setLastRoundSummarized: (r: number) => void;
  newSeason: () => void;
  seedFromCareer: (args: SeedArgs) => void;
};

const aIds = () => ZONE_A.map(t => t.id);
const bIds = () => ZONE_B.map(t => t.id);
const buildFix = () => buildOfficialFixture();
const applyBoth = (a: StandingRow[], b: StandingRow[], m: Match) => ({
  a: applyMatchToStandings(a, m),
  b: applyMatchToStandings(b, m),
});

function baseState(): State {
  return {
    fixture: [], standA: [], standB: [], currentRound: 1,
    season: 1, introVista: false, difficulty: "normal", objetivo: "reducido", lastRoundSummarized: 0,
  };
}

function buildPnBracket(standA: StandingRow[], standB: StandingRow[], extraSeed?: string) {
  const a = sortStandings(standA), b = sortStandings(standB);
  const octavos: CareerPair[] = [];
  for (let i = 0; i < 7; i++) {
    const aa = a[i + 1]?.teamId;
    const bb = b[6 - i]?.teamId;
    if (aa && bb) octavos.push({ a: aa, b: bb, legs: 1 });
  }
  if (extraSeed) octavos.push({ a: extraSeed, winner: extraSeed, legs: 1 });
  return { octavos, cuartos: [], semis: [], final: [] };
}

function buildPbBracket(standA: StandingRow[]) {
  const a = sortStandings(standA);
  const pairs: CareerPair[] = [
    { a: a[1]?.teamId, b: a[8]?.teamId, legs: 2 },
    { a: a[2]?.teamId, b: a[7]?.teamId, legs: 2 },
    { a: a[3]?.teamId, b: a[6]?.teamId, legs: 2 },
    { a: a[4]?.teamId, b: a[5]?.teamId, legs: 2 },
  ].filter(p => p.a && p.b) as CareerPair[];
  // En B Metropolitana el Reducido empieza directamente en cuartos (8 equipos).
  return { octavos: [], cuartos: pairs, semis: [], final: [] };
}

function buildPcBracket(standA: StandingRow[], standB: StandingRow[], extraSeed?: string) {
  const a = sortStandings(standA), b = sortStandings(standB);
  const octavos: CareerPair[] = [];
  const aSeeds = a.slice(1, 7).map(r => r.teamId); // 2°-7°
  const bSeeds = b.slice(1, 7).map(r => r.teamId);
  for (let i = 0; i < 6; i++) {
    const aa = aSeeds[i], bb = bSeeds[5 - i];
    if (aa && bb) octavos.push({ a: aa, b: bb, legs: 2 });
  }
  if (extraSeed) octavos.push({ a: extraSeed, winner: extraSeed, legs: 2 });
  return { octavos, cuartos: [], semis: [], final: [] };
}

function buildPromoBracket(standA: StandingRow[], standB: StandingRow[], extraSeed?: string) {
  const a = sortStandings(standA), b = sortStandings(standB);
  const octavos: CareerPair[] = [];
  const triples: [string | undefined, string | undefined][] = [
    [a[1]?.teamId, b[3]?.teamId],
    [b[1]?.teamId, a[3]?.teamId],
    [a[2]?.teamId, b[2]?.teamId],
  ];
  for (const [x, y] of triples) if (x && y) octavos.push({ a: x, b: y, legs: 2 });
  if (extraSeed) octavos.push({ a: extraSeed, winner: extraSeed, legs: 2 });
  return { octavos, cuartos: [], semis: [], final: [] };
}

function bracketForDivision(division: PlayoffDivision, standA: StandingRow[], standB: StandingRow[], extraSeed?: string) {
  if (division === "primera_nacional") return buildPnBracket(standA, standB, extraSeed);
  if (division === "primera_b") return buildPbBracket(standA);
  if (division === "primera_c") return buildPcBracket(standA, standB, extraSeed);
  return buildPromoBracket(standA, standB, extraSeed);
}

function pairRank(standA: StandingRow[], standB: StandingRow[], id: string): number {
  const all = [...sortStandings(standA), ...sortStandings(standB)];
  const i = all.findIndex(r => r.teamId === id);
  return i < 0 ? 999 : i + 1;
}

function playOne(p: CareerPair, userId?: string): CareerPair {
  if (!p.a || !p.b || p.winner) return p;
  if (userId && (p.a === userId || p.b === userId)) return p;
  const s1 = simulateMatch(p.a, p.b);
  if (p.legs === 2) {
    const s2 = simulateMatch(p.b, p.a);
    const aTotal = s1.hg + s2.ag, bTotal = s1.ag + s2.hg;
    const winner = aTotal > bTotal ? p.a : bTotal > aTotal ? p.b : (s1.hg + s2.ag >= s1.ag + s2.hg ? p.a : p.b);
    return { ...p, leg1a: s1.hg, leg1b: s1.ag, leg2a: s2.hg, leg2b: s2.ag, winner };
  }
  return { ...p, ag: s1.hg, bg: s1.ag, winner: s1.hg >= s1.ag ? p.a : p.b };
}

function advancePairs(pairs: CareerPair[], legs: 1 | 2): CareerPair[] {
  const winners = pairs.map(p => p.winner).filter(Boolean) as string[];
  const out: CareerPair[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (!winners[i]) continue;
    if (winners[i + 1]) out.push({ a: winners[i], b: winners[i + 1], legs });
    else out.push({ a: winners[i], winner: winners[i], legs });
  }
  return out;
}

export const useTournament = create<State & Actions>()(persist((set, get) => ({
  ...baseState(),
  init: () => {
    if (get().fixture.length) return;
    set({ fixture: buildFix(), standA: emptyStandings(aIds()), standB: emptyStandings(bIds()), currentRound: 1 });
  },
  reset: () => set({
    ...baseState(), fixture: buildFix(), standA: emptyStandings(aIds()), standB: emptyStandings(bIds()),
  }),
  setUserTeam: id => set({ userTeamId: id }),
  seedFromCareer: ({ standA, standB, userTeamId, season, difficulty, division = "primera_nacional" }) => set({
    fixture: [{ id: `career-import-${division}-${season}`, round: 1, home: userTeamId, away: userTeamId, played: true, homeGoals: 0, awayGoals: 0 }],
    standA, standB, userTeamId, season, difficulty, division,
    currentRound: 1, finalDirecta: undefined, bracket: undefined, champion: undefined, reducidoChampion: undefined,
    introVista: false, lastRoundSummarized: 0,
  }),
  setIntroVista: v => set({ introVista: v }),
  setDifficulty: d => set({ difficulty: d }),
  setObjetivo: o => set({ objetivo: o }),
  setLastRoundSummarized: r => set({ lastRoundSummarized: r }),
  newSeason: () => set(state => ({
    ...baseState(), fixture: buildFix(), standA: emptyStandings(aIds()), standB: emptyStandings(bIds()),
    season: state.season + 1,
  })),
  simulateUserMatch: matchId => {
    const { fixture, standA, standB, currentRound } = get();
    const m = fixture.find(x => x.id === matchId);
    if (!m || m.played) return null;
    const { hg, ag } = simulateMatch(m.home, m.away);
    const played = { ...m, homeGoals: hg, awayGoals: ag, played: true };
    const r = applyBoth(standA, standB, played);
    const newFix = fixture.map(x => x.id === matchId ? played : x);
    const roundDone = newFix.filter(x => x.round === played.round).every(x => x.played);
    set({ fixture: newFix, standA: r.a, standB: r.b, currentRound: roundDone && played.round >= currentRound ? played.round + 1 : currentRound });
    return { hg, ag };
  },
  playRound: round => {
    const { fixture, standA, standB, userTeamId } = get();
    let a = standA, b = standB;
    const newFix = fixture.map(m => {
      if (m.round !== round || m.played) return m;
      if (userTeamId && (m.home === userTeamId || m.away === userTeamId)) return m;
      const s = simulateMatch(m.home, m.away);
      const next = { ...m, homeGoals: s.hg, awayGoals: s.ag, played: true };
      const r = applyBoth(a, b, next); a = r.a; b = r.b; return next;
    });
    const roundDone = newFix.filter(m => m.round === round).every(m => m.played);
    set({ fixture: newFix, standA: a, standB: b, currentRound: roundDone ? round + 1 : round });
  },
  playAll: () => {
    const totalRounds = Math.max(...get().fixture.map(m => m.round), 0);
    for (let r = get().currentRound; r <= totalRounds; r++) {
      const before = get().currentRound; get().playRound(r); if (get().currentRound === before) break;
    }
  },
  recordUserMatch: (matchId, hg, ag) => {
    const { fixture, standA, standB, currentRound } = get();
    let a = standA, b = standB, playedRound = currentRound;
    const newFix = fixture.map(m => {
      if (m.id !== matchId || m.played) return m;
      const next = { ...m, homeGoals: hg, awayGoals: ag, played: true };
      const r = applyBoth(a, b, next); a = r.a; b = r.b; playedRound = next.round; return next;
    });
    const roundDone = newFix.filter(m => m.round === playedRound).every(m => m.played);
    set({ fixture: newFix, standA: a, standB: b, currentRound: roundDone && playedRound >= currentRound ? playedRound + 1 : currentRound });
  },
  startPlayoffs: () => {
    const { standA, standB, userTeamId, division = "primera_nacional" } = get();
    const a = sortStandings(standA), b = sortStandings(standB);
    const hasDirectFinal = division === "primera_nacional" || division === "primera_c" || division === "promocional_amateur";
    let finalDirecta: CareerPair | undefined;
    let loser: string | undefined;
    let champion: string | undefined;
    if (hasDirectFinal) {
      const a1 = a[0]?.teamId, b1 = b[0]?.teamId;
      if (!a1 || !b1) return;
      const userInFinal = userTeamId === a1 || userTeamId === b1;
      if (userInFinal) finalDirecta = { a: a1, b: b1, legs: division === "primera_c" ? 2 : 1 };
      else {
        const p: CareerPair = { a: a1, b: b1, legs: division === "primera_c" ? 2 : 1 };
        const done = playOne(p);
        finalDirecta = done; champion = done.winner;
      }
      if (champion) loser = champion === a1 ? b1 : a1;
      // Si el usuario no juega la final, el perdedor real entra al reducido.
    }
    const bracket = bracketForDivision(division, standA, standB, loser);
    set({ finalDirecta, bracket, champion });
  },
  advanceBracket: () => {
    const { bracket, userTeamId, division = "primera_nacional", standA, standB } = get();
    if (!bracket) return;
    let { octavos, cuartos, semis, final } = bracket;
    const legs: 1 | 2 = division === "primera_nacional" ? 1 : 2;
    if (octavos.some(p => !p.winner)) octavos = octavos.map(p => playOne(p, userTeamId));
    else if (!cuartos.length) cuartos = advancePairs(octavos, legs);
    else if (cuartos.some(p => !p.winner)) cuartos = cuartos.map(p => playOne(p, userTeamId));
    else if (!semis.length) semis = advancePairs(cuartos, legs);
    else if (semis.some(p => !p.winner)) semis = semis.map(p => playOne(p, userTeamId));
    else if (!final.length) final = advancePairs(semis, legs);
    else if (final.some(p => !p.winner)) final = final.map(p => playOne(p, userTeamId));
    const reducedWinner = final[0]?.winner;
    set({ bracket: { octavos, cuartos, semis, final }, reducidoChampion: reducedWinner || get().reducidoChampion });
    void standA; void standB;
  },
}), { name: "primera-nacional-heads-2026" }));

function resolveTwoLegUserPair(p: CareerPair, hg: number, ag: number, userTeamId: string) {
  // La ida siempre es a-b; la vuelta se juega b-a. hg/ag son los goles del
  // partido tal como se mostraron en pantalla (local primero).
  const userIsAway = p.b === userTeamId;
  const aGoals = userIsAway ? ag : hg;
  const bGoals = userIsAway ? hg : ag;
  return { aGoals, bGoals };
}

export function recordUserPlayoff(
  kind: "final" | "octavos" | "cuartos" | "semis" | "final_reducido",
  idx: number,
  hg: number,
  ag: number,
) {
  const s = useTournament.getState();
  const division = s.division ?? "primera_nacional";

  if (kind === "final") {
    const p = s.finalDirecta;
    if (!p?.a || !p.b) return { finished: false, winner: undefined as string | undefined };
    if (p.legs === 2 && p.leg1a === undefined) {
      const { aGoals, bGoals } = resolveTwoLegUserPair(p, hg, ag, s.userTeamId ?? "");
      useTournament.setState({ finalDirecta: { ...p, leg1a: aGoals, leg1b: bGoals } });
      return { finished: false, winner: undefined };
    }
    let winner: string;
    if (p.legs === 2) {
      const { aGoals, bGoals } = resolveTwoLegUserPair(p, hg, ag, s.userTeamId ?? "");
      const at = (p.leg1a ?? 0) + bGoals, bt = (p.leg1b ?? 0) + aGoals;
      winner = at > bt ? p.a : bt > at ? p.b : (s.userTeamId === p.a ? p.a : p.b);
      const loser = winner === p.a ? p.b : p.a;
      useTournament.setState({ finalDirecta: { ...p, leg2a: aGoals, leg2b: bGoals, winner }, champion: winner });
      // Perdedor de la final entra al reducido.
      if (division === "primera_c" || division === "promocional_amateur") {
        const bracket = bracketForDivision(division, s.standA, s.standB, loser);
        useTournament.setState({ bracket });
      }
      return { finished: true, winner };
    }
    winner = hg >= ag ? p.a : p.b;
    const loser = winner === p.a ? p.b : p.a;
    useTournament.setState({ finalDirecta: { ...p, ag: hg, bg: ag, winner }, champion: winner });
    if (division === "primera_nacional" || division === "primera_c" || division === "promocional_amateur") {
      const bracket = bracketForDivision(division, s.standA, s.standB, loser);
      useTournament.setState({ bracket });
    }
    return { finished: true, winner };
  }

  const br = s.bracket;
  if (!br) return { finished: false, winner: undefined as string | undefined };
  const roundKey = kind === "final_reducido" ? "final" : kind;
  const arr = [...(br[roundKey] as CareerPair[])];
  const p = arr[idx];
  if (!p?.a || !p.b || p.winner) return { finished: false, winner: p?.winner };

  const isTwoLeg = p.legs === 2;
  if (isTwoLeg && p.leg1a === undefined) {
    const { aGoals, bGoals } = resolveTwoLegUserPair(p, hg, ag, s.userTeamId ?? "");
    arr[idx] = { ...p, leg1a: aGoals, leg1b: bGoals };
    useTournament.setState({ bracket: { ...br, [roundKey]: arr } as any });
    return { finished: false, winner: undefined };
  }

  let winner: string;
  if (isTwoLeg) {
    const { aGoals, bGoals } = resolveTwoLegUserPair(p, hg, ag, s.userTeamId ?? "");
    const at = (p.leg1a ?? 0) + bGoals, bt = (p.leg1b ?? 0) + aGoals;
    winner = at > bt ? p.a : bt > at ? p.b : (s.userTeamId === p.a ? p.a : p.b);
    arr[idx] = { ...p, leg2a: aGoals, leg2b: bGoals, winner };
  } else {
    winner = hg >= ag ? p.a : p.b;
    arr[idx] = { ...p, ag: hg, bg: ag, winner };
  }
  const nextBr = { ...br, [roundKey]: arr } as { octavos: CareerPair[]; cuartos: CareerPair[]; semis: CareerPair[]; final: CareerPair[] };
  useTournament.setState({ bracket: nextBr, reducidoChampion: kind === "final_reducido" ? winner : s.reducidoChampion });
  return { finished: true, winner };
}
