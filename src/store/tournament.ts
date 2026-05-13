import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ZONE_A, ZONE_B } from "@/data/teams";
import {
  applyMatchToStandings, emptyStandings,
  Match, simulateMatch, sortStandings, StandingRow,
  buildReducido, Bracket, Pair, buildOfficialFixture,
} from "@/lib/tournament";

type State = {
  fixture: Match[];
  standA: StandingRow[];
  standB: StandingRow[];
  currentRound: number;
  finalDirecta?: Pair;
  bracket?: Bracket;
  champion?: string;
  reducidoChampion?: string;
};

type Actions = {
  init: () => void;
  reset: () => void;
  playRound: (round: number) => void;
  playAll: () => void;
  recordUserMatch: (matchId: string, hg: number, ag: number) => void;
  startPlayoffs: () => void;
  advanceBracket: () => void;
};

const aIds = ZONE_A.map(t => t.id);
const bIds = ZONE_B.map(t => t.id);
const buildFix = () => buildFixture(aIds, bIds, CLASICOS_INTERZONALES);

// Aplica el resultado a las dos zonas. applyMatchToStandings ignora equipos
// que no estén en la lista, así que sirve para partidos interzonales.
const applyBoth = (a: StandingRow[], b: StandingRow[], m: Match) => ({
  a: applyMatchToStandings(a, m),
  b: applyMatchToStandings(b, m),
});

export const useTournament = create<State & Actions>()(persist((set, get) => ({
  fixture: [],
  standA: [],
  standB: [],
  currentRound: 1,
  init: () => {
    if (get().fixture.length) return;
    set({
      fixture: buildFix(),
      standA: emptyStandings(aIds),
      standB: emptyStandings(bIds),
      currentRound: 1,
    });
  },
  reset: () => set({
    fixture: buildFix(),
    standA: emptyStandings(aIds),
    standB: emptyStandings(bIds),
    currentRound: 1,
    finalDirecta: undefined, bracket: undefined,
    champion: undefined, reducidoChampion: undefined,
  }),
  playRound: (round) => {
    const { fixture, standA, standB } = get();
    let a = standA, b = standB;
    const newFix = fixture.map(m => {
      if (m.round !== round || m.played) return m;
      const { hg, ag } = simulateMatch(m.home, m.away);
      const next = { ...m, homeGoals: hg, awayGoals: ag, played: true };
      const r = applyBoth(a, b, next); a = r.a; b = r.b;
      return next;
    });
    set({ fixture: newFix, standA: a, standB: b, currentRound: round + 1 });
  },
  playAll: () => {
    const totalRounds = Math.max(...get().fixture.map(m => m.round));
    for (let r = get().currentRound; r <= totalRounds; r++) get().playRound(r);
  },
  recordUserMatch: (matchId, hg, ag) => {
    const { fixture, standA, standB } = get();
    let a = standA, b = standB;
    const newFix = fixture.map(m => {
      if (m.id !== matchId || m.played) return m;
      const next = { ...m, homeGoals: hg, awayGoals: ag, played: true };
      const r = applyBoth(a, b, next); a = r.a; b = r.b;
      return next;
    });
    set({ fixture: newFix, standA: a, standB: b });
  },
  startPlayoffs: () => {
    const { standA, standB } = get();
    const a1 = sortStandings(standA)[0]?.teamId;
    const b1 = sortStandings(standB)[0]?.teamId;
    if (!a1 || !b1) return;
    const sim = simulateMatch(a1, b1);
    const winner = sim.hg >= sim.ag ? a1 : b1;
    const loser = winner === a1 ? b1 : a1;
    const finalDirecta: Pair = { a: a1, b: b1, ag: sim.hg, bg: sim.ag, winner };
    const bracket = buildReducido(standA, standB, loser);
    set({ finalDirecta, bracket, champion: winner });
  },
  advanceBracket: () => {
    const br = get().bracket;
    if (!br) return;
    const playRound = (pairs: Pair[]): Pair[] =>
      pairs.map(p => {
        if (!p.a || !p.b || p.winner) return p;
        const s = simulateMatch(p.a, p.b);
        const winner = s.hg >= s.ag ? p.a : p.b;
        return { ...p, ag: s.hg, bg: s.ag, winner };
      });
    const next = (won: Pair[]): Pair[] => {
      const out: Pair[] = [];
      for (let i = 0; i < won.length; i += 2)
        out.push({ a: won[i].winner, b: won[i + 1]?.winner });
      return out;
    };
    let { octavos, cuartos, semis, final } = br;
    if (octavos.some(p => !p.winner)) octavos = playRound(octavos);
    else if (!cuartos.length) cuartos = next(octavos);
    else if (cuartos.some(p => !p.winner)) cuartos = playRound(cuartos);
    else if (!semis.length) semis = next(cuartos);
    else if (semis.some(p => !p.winner)) semis = playRound(semis);
    else if (!final.length) final = next(semis);
    else if (final.some(p => !p.winner)) {
      final = playRound(final);
      set({ reducidoChampion: final[0].winner });
    }
    set({ bracket: { octavos, cuartos, semis, final } });
  },
}), { name: "primera-nacional-heads-v2" }));
