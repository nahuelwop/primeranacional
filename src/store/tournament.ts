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
  userTeamId?: string;
  finalDirecta?: Pair;
  bracket?: Bracket;
  champion?: string;
  reducidoChampion?: string;
};

type Actions = {
  init: () => void;
  reset: () => void;
  setUserTeam: (id: string) => void;
  playRound: (round: number) => void;
  playAll: () => void;
  recordUserMatch: (matchId: string, hg: number, ag: number) => void;
  startPlayoffs: () => void;
  advanceBracket: () => void;
};

const aIds = ZONE_A.map(t => t.id);
const bIds = ZONE_B.map(t => t.id);
const buildFix = () => buildOfficialFixture();

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
    userTeamId: undefined,
    finalDirecta: undefined, bracket: undefined,
    champion: undefined, reducidoChampion: undefined,
  }),
  setUserTeam: (id) => set({ userTeamId: id }),
  playRound: (round) => {
    const { fixture, standA, standB, userTeamId } = get();
    let a = standA, b = standB;
    let advanced = true;
    const newFix = fixture.map(m => {
      if (m.round !== round || m.played) return m;
      // Si es el partido del usuario, NO simular: lo debe jugar
      if (userTeamId && (m.home === userTeamId || m.away === userTeamId)) {
        advanced = false;
        return m;
      }
      const { hg, ag } = simulateMatch(m.home, m.away);
      const next = { ...m, homeGoals: hg, awayGoals: ag, played: true };
      const r = applyBoth(a, b, next); a = r.a; b = r.b;
      return next;
    });
    // solo avanza la fecha si todos los partidos del round ya están jugados
    const roundDone = newFix.filter(m => m.round === round).every(m => m.played);
    set({ fixture: newFix, standA: a, standB: b, currentRound: roundDone ? round + 1 : round });
  },
  playAll: () => {
    const totalRounds = Math.max(...get().fixture.map(m => m.round));
    for (let r = get().currentRound; r <= totalRounds; r++) {
      const before = get().currentRound;
      get().playRound(r);
      // si no avanzó (partido del usuario pendiente), salimos
      if (get().currentRound === before) break;
    }
  },
  recordUserMatch: (matchId, hg, ag) => {
    const { fixture, standA, standB, currentRound } = get();
    let a = standA, b = standB;
    let playedRound = currentRound;
    const newFix = fixture.map(m => {
      if (m.id !== matchId || m.played) return m;
      const next = { ...m, homeGoals: hg, awayGoals: ag, played: true };
      const r = applyBoth(a, b, next); a = r.a; b = r.b;
      playedRound = next.round;
      return next;
    });
    // si la fecha quedó completa, avanzar
    const roundDone = newFix.filter(m => m.round === playedRound).every(m => m.played);
    set({
      fixture: newFix, standA: a, standB: b,
      currentRound: roundDone && playedRound >= currentRound ? playedRound + 1 : currentRound,
    });
  },
  startPlayoffs: () => {
    const { standA, standB, userTeamId } = get();
    const a1 = sortStandings(standA)[0]?.teamId;
    const b1 = sortStandings(standB)[0]?.teamId;
    if (!a1 || !b1) return;
    const userInFinal = userTeamId === a1 || userTeamId === b1;
    let finalDirecta: Pair;
    let winner: string | undefined;
    let loser: string | undefined;
    if (userInFinal) {
      // Dejar sin jugar; el usuario lo dispara con recordUserPlayoff("final", ...).
      finalDirecta = { a: a1, b: b1 };
    } else {
      const sim = simulateMatch(a1, b1);
      winner = sim.hg >= sim.ag ? a1 : b1;
      loser = winner === a1 ? b1 : a1;
      finalDirecta = { a: a1, b: b1, ag: sim.hg, bg: sim.ag, winner };
    }
    // Si aún no sabemos el perdedor de la final, seedeamos con el 9° de A como placeholder;
    // se corrige cuando el usuario juegue la final.
    const bracket = buildReducido(standA, standB, loser ?? sortStandings(standA)[8]?.teamId);
    set({ finalDirecta, bracket, champion: winner });
  },
  advanceBracket: () => {
    const br = get().bracket;
    const userTeamId = get().userTeamId;
    if (!br) return;
    const playPair = (p: Pair): Pair => {
      if (!p.a || !p.b || p.winner) return p;
      // No autosimular si es partido del usuario
      if (userTeamId && (p.a === userTeamId || p.b === userTeamId)) return p;
      const s = simulateMatch(p.a, p.b);
      const w = s.hg >= s.ag ? p.a : p.b;
      return { ...p, ag: s.hg, bg: s.ag, winner: w };
    };
    const playRound = (pairs: Pair[]): Pair[] => pairs.map(playPair);
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
      if (final[0]?.winner) set({ reducidoChampion: final[0].winner });
    }
    set({ bracket: { octavos, cuartos, semis, final } });
  },
}), { name: "primera-nacional-heads-2026" }));

// ===== Reducido: helpers para partidos jugables del usuario =====
// Nota: como zustand no permite acciones externas fácilmente sin retype,
// se exponen como helpers que reciben el store.
export function recordUserPlayoff(kind: "final" | "octavos" | "cuartos" | "semis" | "final_reducido",
  idx: number, hg: number, ag: number) {
  const s = useTournament.getState();
  if (kind === "final") {
    const p = s.finalDirecta;
    if (!p || !p.a || !p.b) return;
    const winner = hg >= ag ? p.a : p.b;
    const loser = winner === p.a ? p.b : p.a;
    useTournament.setState({
      finalDirecta: { ...p, ag: hg, bg: ag, winner },
      champion: winner,
    });
    // Reseedear el reducido con el perdedor correcto
    const bracket = buildReducido(s.standA, s.standB, loser);
    useTournament.setState({ bracket });
    return;
  }
  const br = s.bracket;
  if (!br) return;
  const roundKey = kind === "final_reducido" ? "final" : kind;
  const arr = [...(br[roundKey] as Pair[])];
  const p = arr[idx];
  if (!p || !p.a || !p.b) return;
  const winner = hg >= ag ? p.a : p.b;
  arr[idx] = { ...p, ag: hg, bg: ag, winner };
  const nextBr = { ...br, [roundKey]: arr } as Bracket;
  useTournament.setState({ bracket: nextBr });
  if (kind === "final_reducido" && winner) {
    useTournament.setState({ reducidoChampion: winner });
  }
}
