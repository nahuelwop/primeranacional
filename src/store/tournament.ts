import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ZONE_A, ZONE_B } from "@/data/teams";
import type { DivisionId } from "@/data/competitions";
import {
  applyMatchToStandings,
  emptyStandings,
  Match,
  simulateMatch,
  sortStandings,
  StandingRow,
  Pair,
  buildOfficialFixture,
} from "@/lib/tournament";

export type TDifficulty = "easy" | "normal" | "hard" | "expert";

type PlayoffDivision =
  | "primera_nacional"
  | "primera_b"
  | "primera_c"
  | "promocional_amateur"
  | "regional_federal_amateur";

type PlayoffKind = "pn" | "pb" | "pc" | "promocional";

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

  bracket?: {
    octavos: CareerPair[];
    cuartos: CareerPair[];
    semis: CareerPair[];
    final: CareerPair[];
  };

  champion?: string;
  reducidoChampion?: string;

  regionalNationalFinal?: CareerPair;
  regionalChampion?: string;
  regionalNationalOpponent?: string;

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
  regionalNationalOpponent?: string;
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

const applyBoth = (
  a: StandingRow[],
  b: StandingRow[],
  m: Match
) => ({
  a: applyMatchToStandings(a, m),
  b: applyMatchToStandings(b, m),
});

function baseState(): State {
  return {
    fixture: [],
    standA: [],
    standB: [],
    currentRound: 1,
    season: 1,
    introVista: false,
    difficulty: "normal",
    objetivo: "reducido",
    lastRoundSummarized: 0,
  };
}

function buildPnBracket(
  standA: StandingRow[],
  standB: StandingRow[],
  extraSeed?: string
) {
  const a = sortStandings(standA);
  const b = sortStandings(standB);

  const octavos: CareerPair[] = [];

  for (let i = 0; i < 7; i++) {
    const aa = a[i + 1]?.teamId;
    const bb = b[6 - i]?.teamId;

    if (aa && bb) {
      octavos.push({
        a: aa,
        b: bb,
        legs: 1,
      });
    }
  }

  if (extraSeed) {
    octavos.push({
      a: extraSeed,
      winner: extraSeed,
      legs: 1,
    });
  }

  return {
    octavos,
    cuartos: [],
    semis: [],
    final: [],
  };
}

function buildPbBracket(standA: StandingRow[]) {
  const a = sortStandings(standA);

  const pairs: CareerPair[] = [
    {
      a: a[1]?.teamId,
      b: a[8]?.teamId,
      legs: 2,
    },
    {
      a: a[2]?.teamId,
      b: a[7]?.teamId,
      legs: 2,
    },
    {
      a: a[3]?.teamId,
      b: a[6]?.teamId,
      legs: 2,
    },
    {
      a: a[4]?.teamId,
      b: a[5]?.teamId,
      legs: 2,
    },
  ].filter(p => p.a && p.b) as CareerPair[];

  return {
    octavos: [],
    cuartos: pairs,
    semis: [],
    final: [],
  };
}

function buildPcBracket(
  standA: StandingRow[],
  standB: StandingRow[],
  extraSeed?: string
) {
  const a = sortStandings(standA);
  const b = sortStandings(standB);

  const octavos: CareerPair[] = [];

  const aSeeds = a.slice(1, 7).map(r => r.teamId);
  const bSeeds = b.slice(1, 7).map(r => r.teamId);

  for (let i = 0; i < 6; i++) {
    const aa = aSeeds[i];
    const bb = bSeeds[5 - i];

    if (aa && bb) {
      octavos.push({
        a: aa,
        b: bb,
        legs: 2,
      });
    }
  }

  if (extraSeed) {
    octavos.push({
      a: extraSeed,
      winner: extraSeed,
      legs: 2,
    });
  }

  return {
    octavos,
    cuartos: [],
    semis: [],
    final: [],
  };
}

function buildPromoBracket(
  standA: StandingRow[],
  standB: StandingRow[],
  extraSeed?: string
) {
  const a = sortStandings(standA);
  const b = sortStandings(standB);

  const octavos: CareerPair[] = [];

  const triples: [
    string | undefined,
    string | undefined
  ][] = [
    [a[1]?.teamId, b[3]?.teamId],
    [b[1]?.teamId, a[3]?.teamId],
    [a[2]?.teamId, b[2]?.teamId],
  ];

  for (const [x, y] of triples) {
    if (x && y) {
      octavos.push({
        a: x,
        b: y,
        legs: 2,
      });
    }
  }

  if (extraSeed) {
    octavos.push({
      a: extraSeed,
      winner: extraSeed,
      legs: 2,
    });
  }

  return {
    octavos,
    cuartos: [],
    semis: [],
    final: [],
  };
}

function buildRegionalBracket(
  seeds: string[]
): {
  octavos: CareerPair[];
  cuartos: CareerPair[];
  semis: CareerPair[];
  final: CareerPair[];
} {
  const clean = Array.from(
    new Set(seeds.filter(Boolean))
  );

  const size = Math.min(16, clean.length);
  const selected = clean.slice(0, size);

  const octavos: CareerPair[] = [];

  for (let i = 0; i + 1 < selected.length; i += 2) {
    octavos.push({
      a: selected[i],
      b: selected[i + 1],
      legs: 2,
    });
  }

  if (selected.length === 1) {
    octavos.push({
      a: selected[0],
      winner: selected[0],
      legs: 2,
    });
  }

  return {
    octavos,
    cuartos: [],
    semis: [],
    final: [],
  };
}

function bracketForDivision(
  division: PlayoffDivision,
  standA: StandingRow[],
  standB: StandingRow[],
  extraSeed?: string
) {
  if (division === "regional_federal_amateur") {
    return buildRegionalBracket(
      standA.map(r => r.teamId)
    );
  }

  if (division === "primera_nacional") {
    return buildPnBracket(
      standA,
      standB,
      extraSeed
    );
  }

  if (division === "primera_b") {
    return buildPbBracket(standA);
  }

  if (division === "primera_c") {
    return buildPcBracket(
      standA,
      standB,
      extraSeed
    );
  }

  return buildPromoBracket(
    standA,
    standB,
    extraSeed
  );
}

function playOne(
  p: CareerPair,
  userId?: string
): CareerPair {
  if (!p.a || !p.b || p.winner) {
    return p;
  }

  if (
    userId &&
    (p.a === userId || p.b === userId)
  ) {
    return p;
  }

  const s1 = simulateMatch(p.a, p.b);

  if (p.legs === 2) {
    const s2 = simulateMatch(p.b, p.a);

    const aTotal =
      s1.hg + s2.ag;

    const bTotal =
      s1.ag + s2.hg;

    const winner =
      aTotal > bTotal
        ? p.a
        : bTotal > aTotal
          ? p.b
          : p.a;

    return {
      ...p,
      leg1a: s1.hg,
      leg1b: s1.ag,
      leg2a: s2.ag,
      leg2b: s2.hg,
      winner,
    };
  }

  return {
    ...p,
    ag: s1.hg,
    bg: s1.ag,
    winner:
      s1.hg >= s1.ag
        ? p.a
        : p.b,
  };
}

function advancePairs(
  pairs: CareerPair[],
  legs: 1 | 2
): CareerPair[] {
  const winners = pairs
    .map(p => p.winner)
    .filter(Boolean) as string[];

  const out: CareerPair[] = [];

  for (
    let i = 0;
    i < winners.length;
    i += 2
  ) {
    if (!winners[i]) {
      continue;
    }

    if (winners[i + 1]) {
      out.push({
        a: winners[i],
        b: winners[i + 1],
        legs,
      });
    } else {
      out.push({
        a: winners[i],
        winner: winners[i],
        legs,
      });
    }
  }

  return out;
}

export const useTournament =
  create<State & Actions>()(
    persist(
      (set, get) => ({
        ...baseState(),

        init: () => {
          if (get().fixture.length) {
            return;
          }

          set({
            fixture: buildFix(),
            standA: emptyStandings(aIds()),
            standB: emptyStandings(bIds()),
            currentRound: 1,
          });
        },

        reset: () =>
          set({
            ...baseState(),
            fixture: buildFix(),
            standA: emptyStandings(aIds()),
            standB: emptyStandings(bIds()),
          }),

        setUserTeam: id =>
          set({
            userTeamId: id,
          }),

        seedFromCareer: ({
          standA,
          standB,
          userTeamId,
          season,
          difficulty,
          division = "primera_nacional",
          regionalNationalOpponent,
        }) =>
          set({
            fixture: [
              {
                id: `career-import-${division}-${season}`,
                round: 1,
                home: userTeamId,
                away: userTeamId,
                played: true,
                homeGoals: 0,
                awayGoals: 0,
              },
            ],
            standA,
            standB,
            userTeamId,
            season,
            difficulty,
            division,
            regionalNationalOpponent,
            currentRound: 1,
            finalDirecta: undefined,
            bracket: undefined,
            champion: undefined,
            reducidoChampion: undefined,
            regionalNationalFinal: undefined,
            regionalChampion: undefined,
            introVista: false,
            lastRoundSummarized: 0,
          }),

        setIntroVista: v =>
          set({
            introVista: v,
          }),

        setDifficulty: d =>
          set({
            difficulty: d,
          }),

        setObjetivo: o =>
          set({
            objetivo: o,
          }),

        setLastRoundSummarized: r =>
          set({
            lastRoundSummarized: r,
          }),

        newSeason: () =>
          set(state => ({
            ...baseState(),
            fixture: buildFix(),
            standA: emptyStandings(aIds()),
            standB: emptyStandings(bIds()),
            season: state.season + 1,
          })),

        simulateUserMatch: matchId => {
          const {
            fixture,
            standA,
            standB,
            currentRound,
          } = get();

          const m = fixture.find(
            x => x.id === matchId
          );

          if (!m || m.played) {
            return null;
          }

          const {
            hg,
            ag,
          } = simulateMatch(
            m.home,
            m.away
          );

          const played = {
            ...m,
            homeGoals: hg,
            awayGoals: ag,
            played: true,
          };

          const r = applyBoth(
            standA,
            standB,
            played
          );

          const newFix = fixture.map(
            x =>
              x.id === matchId
                ? played
                : x
          );

          const roundDone =
            newFix
              .filter(
                x =>
                  x.round ===
                  played.round
              )
              .every(
                x => x.played
              );

          set({
            fixture: newFix,
            standA: r.a,
            standB: r.b,
            currentRound:
              roundDone &&
              played.round >=
                currentRound
                ? played.round + 1
                : currentRound,
          });

          return {
            hg,
            ag,
          };
        },

        playRound: round => {
          const {
            fixture,
            standA,
            standB,
            userTeamId,
          } = get();

          let a = standA;
          let b = standB;

          const newFix =
            fixture.map(m => {
              if (
                m.round !== round ||
                m.played
              ) {
                return m;
              }

              if (
                userTeamId &&
                (m.home === userTeamId ||
                  m.away === userTeamId)
              ) {
                return m;
              }

              const s = simulateMatch(
                m.home,
                m.away
              );

              const next = {
                ...m,
                homeGoals: s.hg,
                awayGoals: s.ag,
                played: true,
              };

              const r =
                applyBoth(
                  a,
                  b,
                  next
                );

              a = r.a;
              b = r.b;

              return next;
            });

          const roundDone =
            newFix
              .filter(
                m =>
                  m.round ===
                  round
              )
              .every(
                m => m.played
              );

          set({
            fixture: newFix,
            standA: a,
            standB: b,
            currentRound:
              roundDone
                ? round + 1
                : round,
          });
        },

        playAll: () => {
          const totalRounds =
            Math.max(
              ...get().fixture.map(
                m => m.round
              ),
              0
            );

          for (
            let r = get()
              .currentRound;
            r <= totalRounds;
            r++
          ) {
            const before =
              get().currentRound;

            get().playRound(r);

            if (
              get().currentRound ===
              before
            ) {
              break;
            }
          }
        },

        recordUserMatch: (
          matchId,
          hg,
          ag
        ) => {
          const {
            fixture,
            standA,
            standB,
            currentRound,
          } = get();

          let a = standA;
          let b = standB;
          let playedRound =
            currentRound;

          const newFix =
            fixture.map(m => {
              if (
                m.id !== matchId ||
                m.played
              ) {
                return m;
              }

              const next = {
                ...m,
                homeGoals: hg,
                awayGoals: ag,
                played: true,
              };

              const r =
                applyBoth(
                  a,
                  b,
                  next
                );

              a = r.a;
              b = r.b;
              playedRound =
                next.round;

              return next;
            });

          const roundDone =
            newFix
              .filter(
                m =>
                  m.round ===
                  playedRound
              )
              .every(
                m => m.played
              );

          set({
            fixture: newFix,
            standA: a,
            standB: b,
            currentRound:
              roundDone &&
              playedRound >=
                currentRound
                ? playedRound + 1
                : currentRound,
          });
        },

        startPlayoffs: () => {
          const {
            standA,
            standB,
            userTeamId,
            division =
              "primera_nacional",
            regionalNationalOpponent,
          } = get();

          const a =
            sortStandings(
              standA
            );

          const b =
            sortStandings(
              standB
            );

          if (
            division ===
            "regional_federal_amateur"
          ) {
            const seeds =
              a.map(
                r =>
                  r.teamId
              );

            const bracket =
              buildRegionalBracket(
                seeds
              );

            set({
              finalDirecta:
                undefined,
              bracket,
              champion:
                undefined,
              reducidoChampion:
                undefined,
              regionalChampion:
                undefined,
              regionalNationalFinal:
                undefined,
              regionalNationalOpponent,
            });

            get().advanceBracket();
            return;
          }

          const hasDirectFinal =
            division ===
              "primera_nacional" ||
            division ===
              "primera_c" ||
            division ===
              "promocional_amateur";

          let finalDirecta:
            CareerPair | undefined;

          let loser:
            string | undefined;

          let champion:
            string | undefined;

          if (hasDirectFinal) {
            const a1 =
              a[0]?.teamId;

            const b1 =
              b[0]?.teamId;

            if (!a1 || !b1) {
              return;
            }

            const userInFinal =
              userTeamId === a1 ||
              userTeamId === b1;

            if (userInFinal) {
              finalDirecta = {
                a: a1,
                b: b1,
                legs:
                  division ===
                  "primera_c"
                    ? 2
                    : 1,
              };
            } else {
              const p: CareerPair = {
                a: a1,
                b: b1,
                legs:
                  division ===
                  "primera_c"
                    ? 2
                    : 1,
              };

              const done =
                playOne(p);

              finalDirecta =
                done;

              champion =
                done.winner;
            }

            if (champion) {
              loser =
                champion === a1
                  ? b1
                  : a1;
            }
          }

          const bracket =
            bracketForDivision(
              division,
              standA,
              standB,
              loser
            );

          set({
            finalDirecta,
            bracket,
            champion,
          });

          get().advanceBracket();
        },

        advanceBracket: () => {
          const state =
            get();

          if (!state.bracket) {
            return;
          }

          let octavos =
            [...state.bracket.octavos];

          let cuartos =
            [...state.bracket.cuartos];

          let semis =
            [...state.bracket.semis];

          let final =
            [...state.bracket.final];

          const {
            userTeamId,
            division =
              "primera_nacional",
            regionalNationalOpponent,
          } = state;

          const legs: 1 | 2 =
            division ===
            "primera_nacional"
              ? 1
              : 2;

          for (
            let guard = 0;
            guard < 20;
            guard++
          ) {
            let progressed =
              false;

            if (
              octavos.length
            ) {
              const before =
                JSON.stringify(
                  octavos
                );

              octavos =
                octavos.map(
                  p =>
                    playOne(
                      p,
                      userTeamId
                    )
                );

              if (
                before !==
                JSON.stringify(
                  octavos
                )
              ) {
                progressed =
                  true;
              }

              if (
                octavos.some(
                  p => !p.winner
                )
              ) {
                break;
              }
            }

            if (
              !cuartos.length &&
              octavos.length &&
              octavos.every(
                p => !!p.winner
              )
            ) {
              cuartos =
                advancePairs(
                  octavos,
                  legs
                );

              progressed = true;
            }

            if (
              cuartos.length
            ) {
              const before =
                JSON.stringify(
                  cuartos
                );

              cuartos =
                cuartos.map(
                  p =>
                    playOne(
                      p,
                      userTeamId
                    )
                );

              if (
                before !==
                JSON.stringify(
                  cuartos
                )
              ) {
                progressed =
                  true;
              }

              if (
                cuartos.some(
                  p => !p.winner
                )
              ) {
                break;
              }
            }

            if (
              !semis.length &&
              cuartos.length &&
              cuartos.every(
                p => !!p.winner
              )
            ) {
              semis =
                advancePairs(
                  cuartos,
                  legs
                );

              progressed = true;
            }

            if (
              semis.length
            ) {
              const before =
                JSON.stringify(
                  semis
                );

              semis =
                semis.map(
                  p =>
                    playOne(
                      p,
                      userTeamId
                    )
                );

              if (
                before !==
                JSON.stringify(
                  semis
                )
              ) {
                progressed =
                  true;
              }

              if (
                semis.some(
                  p => !p.winner
                )
              ) {
                break;
              }
            }

            if (
              !final.length &&
              semis.length &&
              semis.every(
                p => !!p.winner
              )
            ) {
              final =
                advancePairs(
                  semis,
                  legs
                );

              progressed = true;
            }

            if (
              final.length
            ) {
              const before =
                JSON.stringify(
                  final
                );

              final =
                final.map(
                  p =>
                    playOne(
                      p,
                      userTeamId
                    )
                );

              if (
                before !==
                JSON.stringify(
                  final
                )
              ) {
                progressed =
                  true;
              }
            }

            const reducedWinner =
              final.length === 1 &&
              !!final[0]?.winner
                ? final[0].winner
                : undefined;

            let regionalChampion =
              state.regionalChampion;

            let regionalNationalFinal =
              state.regionalNationalFinal;

            if (
              division ===
                "regional_federal_amateur" &&
              reducedWinner &&
              !regionalChampion
            ) {
              regionalChampion =
                reducedWinner;

              if (
                reducedWinner ===
                  userTeamId &&
                regionalNationalOpponent &&
                regionalNationalOpponent !==
                  userTeamId
              ) {
                regionalNationalFinal =
                  {
                    a: userTeamId,
                    b: regionalNationalOpponent,
                    legs: 1,
                  };
              }
            }

            if (
              !progressed ||
              (
                final.length === 1 &&
                !!final[0]?.winner
              )
            ) {
              set({
                bracket: {
                  octavos,
                  cuartos,
                  semis,
                  final,
                },
                reducidoChampion:
                  reducedWinner ??
                  get()
                    .reducidoChampion,
                regionalChampion,
                regionalNationalFinal,
              });

              return;
            }
          }

          set({
            bracket: {
              octavos,
              cuartos,
              semis,
              final,
            },
            reducidoChampion:
              final.length === 1 &&
              !!final[0]?.winner
                ? final[0].winner
                : get()
                    .reducidoChampion,
          });
        },
      }),
      {
        name:
          "primera-nacional-heads-2026",
      }
    )
  );

/**
 * Convierte el resultado mostrado en pantalla
 * al resultado desde el punto de vista del cuadro.
 *
 * Ida:
 * A local / B visitante
 *
 * Vuelta:
 * B local / A visitante
 *
 * Esto permite jugar la vuelta con localía invertida.
 */
function resolveTwoLegUserPair(
  p: CareerPair,
  hg: number,
  ag: number,
  userTeamId: string
) {
  const firstLeg =
    p.leg1a === undefined;

  const userIsA =
    p.a === userTeamId;

  if (firstLeg) {
    if (userIsA) {
      return {
        aGoals: hg,
        bGoals: ag,
      };
    }

    return {
      aGoals: ag,
      bGoals: hg,
    };
  }

  /**
   * En la vuelta se invierte la localía.
   * p.b es local y p.a visitante.
   */
  if (userIsA) {
    return {
      aGoals: ag,
      bGoals: hg,
    };
  }

  return {
    aGoals: hg,
    bGoals: ag,
  };
}

function updateUserBracketAfterMatch(
  kind: "octavos" | "cuartos" | "semis" | "final_reducido",
  idx: number,
  hg: number,
  ag: number
) {
  const s =
    useTournament.getState();

  const br =
    s.bracket;

  if (!br) {
    return {
      finished: false,
      winner: undefined as string | undefined,
    };
  }

  const roundKey =
    kind === "final_reducido"
      ? "final"
      : kind;

  const arr =
    [
      ...(br[
        roundKey
      ] as CareerPair[])
    ];

  const p =
    arr[idx];

  if (
    !p?.a ||
    !p.b
  ) {
    return {
      finished: false,
      winner: p?.winner,
    };
  }

  if (p.winner) {
    return {
      finished: true,
      winner: p.winner,
    };
  }

  const userTeamId =
    s.userTeamId ?? "";

  /**
   * SERIES A DOS PARTIDOS
   */
  if (p.legs === 2) {
    /**
     * IDA
     */
    if (
      p.leg1a === undefined
    ) {
      const {
        aGoals,
        bGoals,
      } =
        resolveTwoLegUserPair(
          p,
          hg,
          ag,
          userTeamId
        );

      arr[idx] = {
        ...p,
        leg1a:
          aGoals,
        leg1b:
          bGoals,
      };

      useTournament.setState({
        bracket: {
          ...br,
          [roundKey]:
            arr,
        } as any,
      });

      return {
        finished: false,
        winner: undefined,
      };
    }

    /**
     * VUELTA
     */
    const {
      aGoals,
      bGoals,
    } =
      resolveTwoLegUserPair(
        p,
        hg,
        ag,
        userTeamId
      );

    const at =
      (p.leg1a ?? 0) +
      bGoals;

    const bt =
      (p.leg1b ?? 0) +
      aGoals;

    const winner =
      at > bt
        ? p.a
        : bt > at
          ? p.b
          : userTeamId === p.a
            ? p.a
            : p.b;

    arr[idx] = {
      ...p,
      leg2a:
        aGoals,
      leg2b:
        bGoals,
      winner,
    };

    const nextBr =
      {
        ...br,
        [roundKey]:
          arr,
      } as {
        octavos: CareerPair[];
        cuartos: CareerPair[];
        semis: CareerPair[];
        final: CareerPair[];
      };

    useTournament.setState({
      bracket:
        nextBr,
      reducidoChampion:
        kind ===
        "final_reducido"
          ? winner
          : s.reducidoChampion,
    });

    /**
     * IMPORTANTE:
     * ahora el resultado está realmente guardado.
     * recién después construimos la siguiente ronda.
     */
    useTournament
      .getState()
      .advanceBracket();

    return {
      finished: true,
      winner,
    };
  }

  /**
   * PARTIDO ÚNICO
   */
  const winner =
    hg >= ag
      ? p.a
      : p.b;

  arr[idx] = {
    ...p,
    ag: hg,
    bg: ag,
    winner,
  };

  const nextBr =
    {
      ...br,
      [roundKey]:
        arr,
    } as {
      octavos: CareerPair[];
      cuartos: CareerPair[];
      semis: CareerPair[];
      final: CareerPair[];
    };

  useTournament.setState({
    bracket:
      nextBr,
    reducidoChampion:
      kind ===
      "final_reducido"
        ? winner
        : s.reducidoChampion,
  });

  /**
   * Construye inmediatamente la siguiente fase.
   */
  useTournament
    .getState()
    .advanceBracket();

  return {
    finished: true,
    winner,
  };
}

export function recordUserPlayoff(
  kind:
    | "final"
    | "octavos"
    | "cuartos"
    | "semis"
    | "final_reducido",
  idx: number,
  hg: number,
  ag: number
) {
  const s =
    useTournament.getState();

  const division =
    s.division ??
    "primera_nacional";

  /**
   * FINAL NACIONAL DEL REGIONAL
   */
  if (
    kind === "final" &&
    division ===
      "regional_federal_amateur"
  ) {
    const p =
      s.regionalNationalFinal;

    if (
      !p?.a ||
      !p.b ||
      p.winner
    ) {
      return {
        finished:
          !!p?.winner,
        winner:
          p?.winner,
      };
    }

    const winner =
      hg > ag
        ? p.a
        : ag > hg
          ? p.b
          : s.userTeamId === p.a
            ? p.a
            : p.b;

    useTournament.setState({
      regionalNationalFinal: {
        ...p,
        ag: hg,
        bg: ag,
        winner,
      },
      champion:
        winner,
      reducidoChampion:
        winner ===
        s.userTeamId
          ? winner
          : s.reducidoChampion,
    });

    return {
      finished: true,
      winner,
    };
  }

  /**
   * FINAL DIRECTA
   */
  if (kind === "final") {
    const p =
      s.finalDirecta;

    if (
      !p?.a ||
      !p.b
    ) {
      return {
        finished: false,
        winner:
          undefined as
            | string
            | undefined,
      };
    }

    /**
     * FINAL A DOS PARTIDOS
     */
    if (
      p.legs === 2
    ) {
      /**
       * IDA
       */
      if (
        p.leg1a === undefined
      ) {
        const {
          aGoals,
          bGoals,
        } =
          resolveTwoLegUserPair(
            p,
            hg,
            ag,
            s.userTeamId ??
              ""
          );

        useTournament.setState({
          finalDirecta: {
            ...p,
            leg1a:
              aGoals,
            leg1b:
              bGoals,
          },
        });

        return {
          finished: false,
          winner:
            undefined as
              | string
              | undefined,
        };
      }

      /**
       * VUELTA
       */
      const {
        aGoals,
        bGoals,
      } =
        resolveTwoLegUserPair(
          p,
          hg,
          ag,
          s.userTeamId ??
            ""
        );

      const at =
        (p.leg1a ?? 0) +
        bGoals;

      const bt =
        (p.leg1b ?? 0) +
        aGoals;

      const winner =
        at > bt
          ? p.a
          : bt > at
            ? p.b
            : s.userTeamId ===
                p.a
              ? p.a
              : p.b;

      const loser =
        winner === p.a
          ? p.b
          : p.a;

      useTournament.setState({
        finalDirecta: {
          ...p,
          leg2a:
            aGoals,
          leg2b:
            bGoals,
          winner,
        },
        champion:
          winner,
      });

      if (
        division ===
          "primera_c" ||
        division ===
          "promocional_amateur"
      ) {
        const bracket =
          bracketForDivision(
            division,
            s.standA,
            s.standB,
            loser
          );

        useTournament.setState({
          bracket,
        });

        useTournament
          .getState()
          .advanceBracket();
      }

      return {
        finished: true,
        winner,
      };
    }

    /**
     * FINAL A UN PARTIDO
     */
    const winner =
      hg >= ag
        ? p.a
        : p.b;

    const loser =
      winner === p.a
        ? p.b
        : p.a;

    useTournament.setState({
      finalDirecta: {
        ...p,
        ag: hg,
        bg: ag,
        winner,
      },
      champion:
        winner,
    });

    /**
     * El perdedor entra al Reducido.
     */
    if (
      division ===
        "primera_nacional" ||
      division ===
        "primera_c" ||
      division ===
        "promocional_amateur"
    ) {
      const bracket =
        bracketForDivision(
          division,
          s.standA,
          s.standB,
          loser
        );

      useTournament.setState({
        bracket,
      });

      useTournament
        .getState()
        .advanceBracket();
    }

    return {
      finished: true,
      winner,
    };
  }

  /**
   * PARTIDO DEL REDUCIDO
   */
  return updateUserBracketAfterMatch(
    kind,
    idx,
    hg,
    ag
  );
}
