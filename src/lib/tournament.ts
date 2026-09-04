import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ZONE_A, ZONE_B } from "@/data/teams";
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

export type TDifficulty =
  | "easy"
  | "normal"
  | "hard"
  | "expert";

type PlayoffDivision =
  | "primera_nacional"
  | "primera_b"
  | "primera_c"
  | "promocional_amateur"
  | "regional_federal_amateur";

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
  objetivo:
    | "ascenso_directo"
    | "reducido"
    | "mantener";
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
  recordUserMatch: (
    matchId: string,
    hg: number,
    ag: number
  ) => void;
  simulateUserMatch: (
    matchId: string
  ) => { hg: number; ag: number } | null;
  startPlayoffs: () => void;
  advanceBracket: () => void;
  setIntroVista: (v: boolean) => void;
  setDifficulty: (d: TDifficulty) => void;
  setObjetivo: (
    o:
      | "ascenso_directo"
      | "reducido"
      | "mantener"
  ) => void;
  setLastRoundSummarized: (r: number) => void;
  newSeason: () => void;
  seedFromCareer: (args: SeedArgs) => void;
};

const aIds = () =>
  ZONE_A.map(t => t.id);

const bIds = () =>
  ZONE_B.map(t => t.id);

const buildFix = () =>
  buildOfficialFixture();

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
    const aa =
      a[i + 1]?.teamId;

    const bb =
      b[6 - i]?.teamId;

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

function buildPbBracket(
  standA: StandingRow[]
) {
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
  ].filter(
    p => p.a && p.b
  ) as CareerPair[];

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

  const aSeeds = a
    .slice(1, 7)
    .map(r => r.teamId);

  const bSeeds = b
    .slice(1, 7)
    .map(r => r.teamId);

  for (let i = 0; i < 6; i++) {
    const aa =
      aSeeds[i];

    const bb =
      bSeeds[5 - i];

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
) {
  const clean =
    Array.from(
      new Set(
        seeds.filter(Boolean)
      )
    );

  const selected =
    clean.slice(0, 16);

  const octavos: CareerPair[] = [];

  for (
    let i = 0;
    i + 1 < selected.length;
    i += 2
  ) {
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
  if (
    division ===
    "regional_federal_amateur"
  ) {
    return buildRegionalBracket(
      standA.map(r => r.teamId)
    );
  }

  if (
    division ===
    "primera_nacional"
  ) {
    return buildPnBracket(
      standA,
      standB,
      extraSeed
    );
  }

  if (
    division ===
    "primera_b"
  ) {
    return buildPbBracket(
      standA
    );
  }

  if (
    division ===
    "primera_c"
  ) {
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
  if (
    !p.a ||
    !p.b ||
    p.winner
  ) {
    return p;
  }

  if (
    userId &&
    (p.a === userId ||
      p.b === userId)
  ) {
    return p;
  }

  if (
    p.legs === 2
  ) {
    const first =
      simulateMatch(
        p.a,
        p.b
      );

    const second =
      simulateMatch(
        p.b,
        p.a
      );

    const aTotal =
      first.hg +
      second.ag;

    const bTotal =
      first.ag +
      second.hg;

    const winner =
      aTotal > bTotal
        ? p.a
        : bTotal > aTotal
          ? p.b
          : p.a;

    return {
      ...p,
      leg1a: first.hg,
      leg1b: first.ag,
      leg2a: second.hg,
      leg2b: second.ag,
      winner,
    };
  }

  const score =
    simulateMatch(
      p.a,
      p.b
    );

  return {
    ...p,
    ag: score.hg,
    bg: score.ag,
    winner:
      score.hg >= score.ag
        ? p.a
        : p.b,
  };
}

function advancePairs(
  pairs: CareerPair[],
  legs: 1 | 2
) {
  const winners =
    pairs
      .map(
        p => p.winner
      )
      .filter(
        Boolean
      ) as string[];

  const out: CareerPair[] = [];

  for (
    let i = 0;
    i < winners.length;
    i += 2
  ) {
    const a =
      winners[i];

    const b =
      winners[i + 1];

    if (a && b) {
      out.push({
        a,
        b,
        legs,
      });
    } else if (a) {
      out.push({
        a,
        winner: a,
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
          if (
            get().fixture.length
          ) {
            return;
          }

          set({
            fixture:
              buildFix(),
            standA:
              emptyStandings(
                aIds()
              ),
            standB:
              emptyStandings(
                bIds()
              ),
            currentRound: 1,
          });
        },

        reset: () =>
          set({
            ...baseState(),
            fixture:
              buildFix(),
            standA:
              emptyStandings(
                aIds()
              ),
            standB:
              emptyStandings(
                bIds()
              ),
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
          division =
            "primera_nacional",
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
            finalDirecta:
              undefined,
            bracket:
              undefined,
            champion:
              undefined,
            reducidoChampion:
              undefined,
            regionalNationalFinal:
              undefined,
            regionalChampion:
              undefined,
            introVista:
              false,
            lastRoundSummarized:
              0,
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
            fixture:
              buildFix(),
            standA:
              emptyStandings(
                aIds()
              ),
            standB:
              emptyStandings(
                bIds()
              ),
            season:
              state.season + 1,
          })),

        simulateUserMatch:
          matchId => {
            const {
              fixture,
              standA,
              standB,
              currentRound,
            } = get();

            const m =
              fixture.find(
                x =>
                  x.id ===
                  matchId
              );

            if (
              !m ||
              m.played
            ) {
              return null;
            }

            const {
              hg,
              ag,
            } =
              simulateMatch(
                m.home,
                m.away
              );

            const played =
              {
                ...m,
                homeGoals: hg,
                awayGoals: ag,
                played: true,
              };

            const r =
              applyBoth(
                standA,
                standB,
                played
              );

            const newFix =
              fixture.map(
                x =>
                  x.id ===
                  matchId
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
                  x =>
                    x.played
                );

            set({
              fixture:
                newFix,
              standA: r.a,
              standB: r.b,
              currentRound:
                roundDone &&
                played.round >=
                  currentRound
                  ? played.round +
                    1
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

          let a =
            standA;

          let b =
            standB;

          const newFix =
            fixture.map(
              m => {
                if (
                  m.round !==
                    round ||
                  m.played
                ) {
                  return m;
                }

                if (
                  userTeamId &&
                  (m.home ===
                    userTeamId ||
                    m.away ===
                      userTeamId)
                ) {
                  return m;
                }

                const score =
                  simulateMatch(
                    m.home,
                    m.away
                  );

                const next =
                  {
                    ...m,
                    homeGoals:
                      score.hg,
                    awayGoals:
                      score.ag,
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
              }
            );

          const roundDone =
            newFix
              .filter(
                m =>
                  m.round ===
                  round
              )
              .every(
                m =>
                  m.played
              );

          set({
            fixture:
              newFix,
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
            let r =
              get()
                .currentRound;
            r <=
            totalRounds;
            r++
          ) {
            const before =
              get()
                .currentRound;

            get().playRound(r);

            if (
              get()
                .currentRound ===
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

          let a =
            standA;

          let b =
            standB;

          let playedRound =
            currentRound;

          const newFix =
            fixture.map(
              m => {
                if (
                  m.id !==
                    matchId ||
                  m.played
                ) {
                  return m;
                }

                const next =
                  {
                    ...m,
                    homeGoals:
                      hg,
                    awayGoals:
                      ag,
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
              }
            );

          const roundDone =
            newFix
              .filter(
                m =>
                  m.round ===
                  playedRound
              )
              .every(
                m =>
                  m.played
              );

          set({
            fixture:
              newFix,
            standA: a,
            standB: b,
            currentRound:
              roundDone &&
              playedRound >=
                currentRound
                ? playedRound +
                  1
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

            get()
              .advanceBracket();

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

          if (
            hasDirectFinal
          ) {
            const a1 =
              a[0]?.teamId;

            const b1 =
              b[0]?.teamId;

            if (
              !a1 ||
              !b1
            ) {
              return;
            }

            const userInFinal =
              userTeamId ===
                a1 ||
              userTeamId ===
                b1;

            if (
              userInFinal
            ) {
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
              const p:
                CareerPair = {
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
                champion ===
                a1
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

          get()
            .advanceBracket();
        },

        advanceBracket: () => {
          const initial =
            get();

          if (
            !initial.bracket
          ) {
            return;
          }

          let octavos =
            [
              ...initial
                .bracket
                .octavos,
            ];

          let cuartos =
            [
              ...initial
                .bracket
                .cuartos,
            ];

          let semis =
            [
              ...initial
                .bracket
                .semis,
            ];

          let final =
            [
              ...initial
                .bracket
                .final,
            ];

          const userTeamId =
            initial.userTeamId;

          const division =
            initial.division ??
            "primera_nacional";

          const legs: 1 | 2 =
            division ===
            "primera_nacional"
              ? 1
              : 2;

          /**
           * Procesa una ronda completa:
           *
           * - Simula automáticamente
           *   todos los partidos rivales.
           * - Nunca simula el partido
           *   del usuario.
           * - Si el usuario todavía
           *   tiene un partido pendiente,
           *   deja esa ronda tal cual.
           */
          const resolveStage = (
            items: CareerPair[]
          ) => {
            let changed = false;

            const next =
              items.map(
                pair => {
                  const before =
                    JSON.stringify(
                      pair
                    );

                  const result =
                    playOne(
                      pair,
                      userTeamId
                    );

                  if (
                    before !==
                    JSON.stringify(
                      result
                    )
                  ) {
                    changed = true;
                  }

                  return result;
                }
              );

            return {
              next,
              changed,
            };
          };

          /**
           * Recorremos las rondas.
           * La lógica se repite hasta
           * encontrar el próximo partido
           * del usuario.
           */
          for (
            let guard = 0;
            guard < 20;
            guard++
          ) {
            let somethingChanged =
              false;

            if (
              octavos.length
            ) {
              const r =
                resolveStage(
                  octavos
                );

              octavos =
                r.next;

              somethingChanged =
                somethingChanged ||
                r.changed;

              if (
                octavos.some(
                  p =>
                    !p.winner
                )
              ) {
                break;
              }
            }

            if (
              octavos.length &&
              octavos.every(
                p =>
                  !!p.winner
              ) &&
              !cuartos.length
            ) {
              cuartos =
                advancePairs(
                  octavos,
                  legs
                );

              somethingChanged =
                true;
            }

            if (
              cuartos.length
            ) {
              const r =
                resolveStage(
                  cuartos
                );

              cuartos =
                r.next;

              somethingChanged =
                somethingChanged ||
                r.changed;

              if (
                cuartos.some(
                  p =>
                    !p.winner
                )
              ) {
                break;
              }
            }

            if (
              cuartos.length &&
              cuartos.every(
                p =>
                  !!p.winner
              ) &&
              !semis.length
            ) {
              semis =
                advancePairs(
                  cuartos,
                  legs
                );

              somethingChanged =
                true;
            }

            if (
              semis.length
            ) {
              const r =
                resolveStage(
                  semis
                );

              semis =
                r.next;

              somethingChanged =
                somethingChanged ||
                r.changed;

              if (
                semis.some(
                  p =>
                    !p.winner
                )
              ) {
                break;
              }
            }

            if (
              semis.length &&
              semis.every(
                p =>
                  !!p.winner
              ) &&
              !final.length
            ) {
              final =
                advancePairs(
                  semis,
                  legs
                );

              somethingChanged =
                true;
            }

            if (
              final.length
            ) {
              const r =
                resolveStage(
                  final
                );

              final =
                r.next;

              somethingChanged =
                somethingChanged ||
                r.changed;
            }

            /**
             * Si llegamos a una final
             * con ganador, terminó el
             * Reducido.
             */
            if (
              final.length ===
                1 &&
              final[0]?.winner
            ) {
              set({
                bracket: {
                  octavos,
                  cuartos,
                  semis,
                  final,
                },
                reducidoChampion:
                  final[0]
                    .winner,
              });

              return;
            }

            /**
             * Si algo cambió, guardamos
             * el bracket inmediatamente.
             */
            if (
              somethingChanged
            ) {
              set({
                bracket: {
                  octavos,
                  cuartos,
                  semis,
                  final,
                },
              });
            } else {
              return;
            }
          }

          /**
           * Guardado final por seguridad.
           */
          set({
            bracket: {
              octavos,
              cuartos,
              semis,
              final,
            },
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
 * Convierte los goles de Game
 * al par A/B del cuadro.
 *
 * Game siempre nos da:
 *
 * hg = goles del local real
 * ag = goles del visitante real
 */
function resolvePairGoals(
  p: CareerPair,
  hg: number,
  ag: number
) {
  /**
   * IDA:
   * A local / B visitante
   */
  if (
    p.leg1a === undefined
  ) {
    return {
      aGoals: hg,
      bGoals: ag,
    };
  }

  /**
   * VUELTA:
   * B local / A visitante
   */
  return {
    aGoals: ag,
    bGoals: hg,
  };
}

function resolveWinner(
  p: CareerPair,
  hg: number,
  ag: number
) {
  if (
    hg > ag
  ) {
    return p.a;
  }

  if (
    ag > hg
  ) {
    return p.b;
  }

  /**
   * En empate de partido único,
   * ventaja al primero del cuadro.
   */
  return p.a;
}

function resolveTwoLegWinner(
  p: CareerPair,
  hg: number,
  ag: number
) {
  const {
    aGoals,
    bGoals,
  } =
    resolvePairGoals(
      p,
      hg,
      ag
    );

  const totalA =
    (p.leg1a ?? 0) +
    aGoals;

  const totalB =
    (p.leg1b ?? 0) +
    bGoals;

  if (
    totalA >
    totalB
  ) {
    return p.a!;
  }

  if (
    totalB >
    totalA
  ) {
    return p.b!;
  }

  /**
   * Desempate determinista.
   */
  return p.a!;
}

function recordBracketUserMatch(
  kind:
    | "octavos"
    | "cuartos"
    | "semis"
    | "final_reducido",
  idx: number,
  hg: number,
  ag: number
) {
  const state =
    useTournament.getState();

  const bracket =
    state.bracket;

  if (!bracket) {
    return {
      finished: false,
      winner:
        undefined as
          | string
          | undefined,
    };
  }

  const roundKey =
    kind ===
    "final_reducido"
      ? "final"
      : kind;

  const arr = [
    ...(bracket[
      roundKey
    ] as CareerPair[]),
  ];

  const p =
    arr[idx];

  if (
    !p?.a ||
    !p.b
  ) {
    return {
      finished: false,
      winner:
        p?.winner,
    };
  }

  if (
    p.winner
  ) {
    return {
      finished: true,
      winner:
        p.winner,
    };
  }

  /**
   * SERIE A DOS PARTIDOS
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
      arr[idx] = {
        ...p,
        leg1a: hg,
        leg1b: ag,
      };

      useTournament.setState({
        bracket: {
          ...bracket,
          [roundKey]:
            arr,
        } as any,
      });

      /**
       * Todavía NO avanza de fase.
       * Hay que jugar la vuelta.
       */
      return {
        finished: false,
        winner:
          undefined,
      };
    }

    /**
     * VUELTA
     *
     * Game habrá mostrado:
     *
     * B local
     * A visitante
     */
    const winner =
      resolveTwoLegWinner(
        p,
        hg,
        ag
      );

    /**
     * Guardamos los goles exactamente
     * como se jugaron:
     *
     * leg2a = goles de B (local)
     * leg2b = goles de A (visitante)
     */
    arr[idx] = {
      ...p,
      leg2a: hg,
      leg2b: ag,
      winner,
    };

    const nextBracket = {
      ...bracket,
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
        nextBracket,
      reducidoChampion:
        kind ===
        "final_reducido"
          ? winner
          : state.reducidoChampion,
    });

    /**
     * AHORA SÍ:
     * simula rivales y arma
     * la siguiente fase.
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
    resolveWinner(
      p,
      hg,
      ag
    );

  arr[idx] = {
    ...p,
    ag: hg,
    bg: ag,
    winner,
  };

  const nextBracket = {
    ...bracket,
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
      nextBracket,
    reducidoChampion:
      kind ===
      "final_reducido"
        ? winner
        : state.reducidoChampion,
  });

  /**
   * Importantísimo:
   * una vez terminado el partido
   * del usuario, avanzar el cuadro.
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
      resolveWinner(
        p,
        hg,
        ag
      );

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
  if (
    kind === "final"
  ) {
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
        useTournament.setState({
          finalDirecta: {
            ...p,
            leg1a: hg,
            leg1b: ag,
          },
        });

        return {
          finished: false,
          winner:
            undefined,
        };
      }

      /**
       * VUELTA
       */
      const winner =
        resolveTwoLegWinner(
          p,
          hg,
          ag
        );

      const loser =
        winner === p.a
          ? p.b
          : p.a;

      useTournament.setState({
        finalDirecta: {
          ...p,
          leg2a: hg,
          leg2b: ag,
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
      resolveWinner(
        p,
        hg,
        ag
      );

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
   * PARTIDO NORMAL DEL REDUCIDO
   */
  return recordBracketUserMatch(
    kind,
    idx,
    hg,
    ag
  );
}
