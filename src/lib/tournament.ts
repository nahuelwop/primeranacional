import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ZONE_A, ZONE_B } from "@/data/teams";

import {
  applyMatchToStandings,
  emptyStandings,
  type Match,
  simulateMatch,
  sortStandings,
  type StandingRow,
  type Pair,
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

export type CareerPair = Pair & {
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

  seedFromCareer: (
    args: SeedArgs
  ) => void;
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

/* =========================================================
   BRACKETS
   ========================================================= */

function buildPnBracket(
  standA: StandingRow[],
  standB: StandingRow[],
  extraSeed?: string
) {
  const a = sortStandings(standA);
  const b = sortStandings(standB);

  const octavos: CareerPair[] = [];

  /*
   Primera Nacional:
   2A vs 8B
   3A vs 7B
   4A vs 6B
   5A vs 5B
   6A vs 4B
   7A vs 3B
   8A vs 2B
   */

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

  /*
   El perdedor de la final directa
   entra como octavo clasificado con BYE.
  */
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
    p => !!p.a && !!p.b
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

  /*
   2A vs 7B
   3A vs 6B
   4A vs 5B
   5A vs 4B
   6A vs 3B
   7A vs 2B
  */

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

  /*
   Promocional Amateur:

   2A vs 4B
   2B vs 4A
   3A vs 3B

   + perdedor de la final directa
  */

  const triples: [
    string | undefined,
    string | undefined
  ][] = [
    [
      a[1]?.teamId,
      b[3]?.teamId,
    ],
    [
      b[1]?.teamId,
      a[3]?.teamId,
    ],
    [
      a[2]?.teamId,
      b[2]?.teamId,
    ],
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

  /*
   El perdedor de la final entra con BYE.
  */
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
  const clean = Array.from(
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
      standA.map(
        r => r.teamId
      )
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

/* =========================================================
   SIMULACIÓN
   ========================================================= */

function playOne(
  p: CareerPair,
  userId?: string
): CareerPair {
  /*
   Partido ya resuelto.
  */
  if (
    !p.a ||
    !p.b ||
    p.winner
  ) {
    return p;
  }

  /*
   Nunca simulamos automáticamente
   el cruce del usuario.
  */
  if (
    userId &&
    (
      p.a === userId ||
      p.b === userId
    )
  ) {
    return p;
  }

  /*
   SERIE A DOS PARTIDOS
  */
  if (p.legs === 2) {
    const ida =
      simulateMatch(
        p.a,
        p.b
      );

    const vuelta =
      simulateMatch(
        p.b,
        p.a
      );

    /*
     Ida:
     A local
     B visitante

     Vuelta:
     B local
     A visitante
    */

    const totalA =
      ida.hg +
      vuelta.ag;

    const totalB =
      ida.ag +
      vuelta.hg;

    const winner =
      totalA > totalB
        ? p.a
        : totalB > totalA
          ? p.b
          : p.a;

    return {
      ...p,

      leg1a: ida.hg,
      leg1b: ida.ag,

      leg2a: vuelta.hg,
      leg2b: vuelta.ag,

      winner,
    };
  }

  /*
   PARTIDO ÚNICO
  */
  const score =
    simulateMatch(
      p.a,
      p.b
    );

  const winner =
    score.hg >= score.ag
      ? p.a
      : p.b;

  return {
    ...p,

    ag: score.hg,
    bg: score.ag,

    winner,
  };
}

/*
 Construye la siguiente ronda usando
 exclusivamente los ganadores.
*/
function advancePairs(
  pairs: CareerPair[],
  legs: 1 | 2
): CareerPair[] {
  const winners =
    pairs
      .map(
        p => p.winner
      )
      .filter(Boolean) as string[];

  const result: CareerPair[] = [];

  for (
    let i = 0;
    i < winners.length;
    i += 2
  ) {
    const first =
      winners[i];

    const second =
      winners[i + 1];

    if (first && second) {
      result.push({
        a: first,
        b: second,
        legs,
      });
    } else if (first) {
      /*
       BYE
      */
      result.push({
        a: first,
        winner: first,
        legs,
      });
    }
  }

  return result;
}

/* =========================================================
   STORE
   ========================================================= */

export const useTournament =
  create<State & Actions>()(
    persist(
      (set, get) => ({
        ...baseState(),

        /* ---------------------------------------------
           INIT
        --------------------------------------------- */

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

        /* ---------------------------------------------
           RESET
        --------------------------------------------- */

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

        /* ---------------------------------------------
           USER TEAM
        --------------------------------------------- */

        setUserTeam: id =>
          set({
            userTeamId: id,
          }),

        /* ---------------------------------------------
           IMPORTAR CARRERA
        --------------------------------------------- */

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

            /*
             LIMPIAMOS TODO EL PLAYOFF ANTERIOR
            */

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

        /* ---------------------------------------------
           CONFIG
        --------------------------------------------- */

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

        /* ---------------------------------------------
           NUEVA TEMPORADA
        --------------------------------------------- */

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

        /* ---------------------------------------------
           PARTIDO NORMAL
        --------------------------------------------- */

        simulateUserMatch:
          matchId => {
            const {
              fixture,
              standA,
              standB,
              currentRound,
            } = get();

            const match =
              fixture.find(
                x =>
                  x.id ===
                  matchId
              );

            if (
              !match ||
              match.played
            ) {
              return null;
            }

            const {
              hg,
              ag,
            } =
              simulateMatch(
                match.home,
                match.away
              );

            const played = {
              ...match,

              homeGoals:
                hg,

              awayGoals:
                ag,

              played: true,
            };

            const rows =
              applyBoth(
                standA,
                standB,
                played
              );

            const newFixture =
              fixture.map(
                x =>
                  x.id ===
                  matchId
                    ? played
                    : x
              );

            const roundDone =
              newFixture
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
                newFixture,

              standA:
                rows.a,

              standB:
                rows.b,

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

        /* ---------------------------------------------
           SIMULAR RONDA
        --------------------------------------------- */

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

          const newFixture =
            fixture.map(
              match => {
                if (
                  match.round !==
                    round ||
                  match.played
                ) {
                  return match;
                }

                /*
                 No simular partido del usuario.
                */
                if (
                  userTeamId &&
                  (
                    match.home ===
                      userTeamId ||
                    match.away ===
                      userTeamId
                  )
                ) {
                  return match;
                }

                const score =
                  simulateMatch(
                    match.home,
                    match.away
                  );

                const played =
                  {
                    ...match,

                    homeGoals:
                      score.hg,

                    awayGoals:
                      score.ag,

                    played: true,
                  };

                const rows =
                  applyBoth(
                    a,
                    b,
                    played
                  );

                a = rows.a;
                b = rows.b;

                return played;
              }
            );

          const roundDone =
            newFixture
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
              newFixture,

            standA: a,

            standB: b,

            currentRound:
              roundDone
                ? round + 1
                : round,
          });
        },

        /* ---------------------------------------------
           SIMULAR TODO
        --------------------------------------------- */

        playAll: () => {
          const totalRounds =
            Math.max(
              ...get()
                .fixture
                .map(
                  m =>
                    m.round
                ),
              0
            );

          for (
            let round =
              get()
                .currentRound;
            round <=
            totalRounds;
            round++
          ) {
            const before =
              get()
                .currentRound;

            get().playRound(
              round
            );

            if (
              get()
                .currentRound ===
              before
            ) {
              break;
            }
          }
        },

        /* ---------------------------------------------
           REGISTRAR PARTIDO NORMAL
        --------------------------------------------- */

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

          const newFixture =
            fixture.map(
              match => {
                if (
                  match.id !==
                    matchId ||
                  match.played
                ) {
                  return match;
                }

                const played =
                  {
                    ...match,

                    homeGoals:
                      hg,

                    awayGoals:
                      ag,

                    played: true,
                  };

                const rows =
                  applyBoth(
                    a,
                    b,
                    played
                  );

                a = rows.a;
                b = rows.b;

                playedRound =
                  played.round;

                return played;
              }
            );

          const roundDone =
            newFixture
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
              newFixture,

            standA:
              a,

            standB:
              b,

            currentRound:
              roundDone &&
              playedRound >=
                currentRound
                ? playedRound +
                  1
                : currentRound,
          });
        },

        /* ---------------------------------------------
           INICIAR PLAYOFFS
        --------------------------------------------- */

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

          /* ===========================================
             REGIONAL FEDERAL AMATEUR
          =========================================== */

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

            /*
             Simular inmediatamente
             todos los partidos que
             no sean del usuario.
            */
            get()
              .advanceBracket();

            return;
          }

          /* ===========================================
             FINAL DIRECTA
          =========================================== */

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
              finalDirecta =
                {
                  a: a1,

                  b: b1,

                  legs:
                    division ===
                    "primera_c"
                      ? 2
                      : 1,
                };
            } else {
              /*
               Si el usuario NO está
               en la final directa,
               se simula automáticamente.
              */
              const direct =
                {
                  a: a1,

                  b: b1,

                  legs:
                    division ===
                    "primera_c"
                      ? 2
                      : 1,
                } satisfies CareerPair;

              const resolved =
                playOne(
                  direct
                );

              finalDirecta =
                resolved;

              champion =
                resolved.winner;
            }

            /*
             El perdedor de la final
             entra al Reducido.
            */
            if (
              champion
            ) {
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

          /*
           Simular todos los cruces
           rivales posibles.
          */
          get()
            .advanceBracket();
        },

        /* ---------------------------------------------
           AVANZAR EL CUADRO
        --------------------------------------------- */

        advanceBracket: () => {
          const state =
            get();

          if (
            !state.bracket
          ) {
            return;
          }

          let octavos =
            [
              ...state
                .bracket
                .octavos,
            ];

          let cuartos =
            [
              ...state
                .bracket
                .cuartos,
            ];

          let semis =
            [
              ...state
                .bracket
                .semis,
            ];

          let final =
            [
              ...state
                .bracket
                .final,
            ];

          const userTeamId =
            state.userTeamId;

          const division =
            state.division ??
            "primera_nacional";

          /*
           Primera Nacional usa
           partidos únicos en el Reducido.

           B / C / Promo / Regional
           usan dos partidos.
          */
          const playoffLegs:
            1 | 2 =
            division ===
              "primera_nacional"
              ? 1
              : 2;

          /*
           Procesa una fase completa.

           Los rivales se simulan.

           El usuario NO se simula.
          */
          const processStage = (
            pairs: CareerPair[]
          ) => {
            let changed = false;

            const processed =
              pairs.map(
                pair => {
                  const before =
                    JSON.stringify(
                      pair
                    );

                  const after =
                    playOne(
                      pair,
                      userTeamId
                    );

                  if (
                    before !==
                    JSON.stringify(
                      after
                    )
                  ) {
                    changed = true;
                  }

                  return after;
                }
              );

            return {
              pairs: processed,
              changed,
            };
          };

          /*
           Evitamos loops infinitos
           en estados guardados viejos.
          */
          for (
            let guard = 0;
            guard < 20;
            guard++
          ) {
            let changedAnything =
              false;

            /* =======================================
               OCTAVOS
            ======================================= */

            if (
              octavos.length
            ) {
              const processed =
                processStage(
                  octavos
                );

              octavos =
                processed.pairs;

              changedAnything =
                changedAnything ||
                processed.changed;

              /*
               Hay algún partido
               pendiente del usuario.
               Frenamos acá.
              */
              if (
                octavos.some(
                  p =>
                    !p.winner
                )
              ) {
                break;
              }
            }

            /*
             Todos los octavos
             terminaron.
            */
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
                  playoffLegs
                );

              changedAnything =
                true;
            }

            /* =======================================
               CUARTOS
            ======================================= */

            if (
              cuartos.length
            ) {
              const processed =
                processStage(
                  cuartos
                );

              cuartos =
                processed.pairs;

              changedAnything =
                changedAnything ||
                processed.changed;

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
                  playoffLegs
                );

              changedAnything =
                true;
            }

            /* =======================================
               SEMIS
            ======================================= */

            if (
              semis.length
            ) {
              const processed =
                processStage(
                  semis
                );

              semis =
                processed.pairs;

              changedAnything =
                changedAnything ||
                processed.changed;

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
                  playoffLegs
                );

              changedAnything =
                true;
            }

            /* =======================================
               FINAL REDUCIDO
            ======================================= */

            if (
              final.length
            ) {
              const processed =
                processStage(
                  final
                );

              final =
                processed.pairs;

              changedAnything =
                changedAnything ||
                processed.changed;

              if (
                final.some(
                  p =>
                    !p.winner
                )
              ) {
                /*
                 El usuario tiene que
                 jugar la final.
                */
                break;
              }
            }

            /*
             Campeón del Reducido.
            */
            if (
              final.length === 1 &&
              !!final[0]?.winner
            ) {
              const winner =
                final[0]
                  .winner;

              let regionalChampion =
                state.regionalChampion;

              let regionalNationalFinal =
                state.regionalNationalFinal;

              /*
               Regional:
               campeón regional ->
               final nacional.
              */
              if (
                division ===
                  "regional_federal_amateur" &&
                winner
              ) {
                regionalChampion =
                  winner;

                if (
                  winner ===
                    userTeamId &&
                  state.regionalNationalOpponent &&
                  state.regionalNationalOpponent !==
                    userTeamId
                ) {
                  regionalNationalFinal =
                    {
                      a: userTeamId,
                      b: state.regionalNationalOpponent,
                      legs: 1,
                    };
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
                  winner,

                regionalChampion,

                regionalNationalFinal,
              });

              return;
            }

            /*
             Si no hubo cambios,
             no seguimos iterando.
            */
            if (
              !changedAnything
            ) {
              break;
            }
          }

          /*
           Guardado final.
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

/* =========================================================
   UTILIDADES DE SERIES
   ========================================================= */

/*
 Game siempre entrega:

 hg = goles del equipo LOCAL
 ag = goles del equipo VISITANTE

 En una serie:

 IDA:
 A local / B visitante

 VUELTA:
 B local / A visitante
*/

function resolveTwoLegUserPair(
  p: CareerPair,
  hg: number,
  ag: number
) {
  const firstLeg =
    p.leg1a === undefined;

  if (firstLeg) {
    /*
     IDA:
     A = local
     B = visitante
    */
    return {
      aGoals: hg,
      bGoals: ag,
    };
  }

  /*
   VUELTA:
   B = local
   A = visitante
  */
  return {
    aGoals: ag,
    bGoals: hg,
  };
}

function resolveSingleWinner(
  p: CareerPair,
  hg: number,
  ag: number
) {
  if (
    hg >
    ag
  ) {
    return p.a!;
  }

  if (
    ag >
    hg
  ) {
    return p.b!;
  }

  /*
   Empate:
   ventaja al primer equipo.
  */
  return p.a!;
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
    resolveTwoLegUserPair(
      p,
      hg,
      ag
    );

  /*
   leg1a = goles de A en la ida
   leg1b = goles de B en la ida
  */

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

  /*
   Empate global:
   ventaja al equipo A.
  */
  return p.a!;
}

/* =========================================================
   REGISTRAR PARTIDO DEL USUARIO
   ========================================================= */

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

  const pairs =
    [
      ...(bracket[
        roundKey
      ] as CareerPair[]),
    ];

  const pair =
    pairs[idx];

  if (
    !pair?.a ||
    !pair.b
  ) {
    return {
      finished: false,
      winner:
        pair?.winner,
    };
  }

  /*
   Ya está resuelto.
  */
  if (
    pair.winner
  ) {
    return {
      finished: true,
      winner:
        pair.winner,
    };
  }

  /* ==========================================
     SERIE A DOS PARTIDOS
  ========================================== */

  if (
    pair.legs === 2
  ) {
    /*
     IDA
    */
    if (
      pair.leg1a ===
      undefined
    ) {
      const {
        aGoals,
        bGoals,
      } =
        resolveTwoLegUserPair(
          pair,
          hg,
          ag
        );

      pairs[idx] =
        {
          ...pair,

          leg1a:
            aGoals,

          leg1b:
            bGoals,
        };

      useTournament.setState(
        {
          bracket: {
            ...bracket,

            [roundKey]:
              pairs,
          } as any,
        }
      );

      /*
       La serie todavía NO terminó.
      */
      return {
        finished: false,
        winner:
          undefined,
      };
    }

    /*
     VUELTA
    */
    const winner =
      resolveTwoLegWinner(
        pair,
        hg,
        ag
      );

    pairs[idx] =
      {
        ...pair,

        /*
         Se guardan tal como
         aparecieron en Game:
         local / visitante.
        */
        leg2a:
          hg,

        leg2b:
          ag,

        winner,
      };

    const nextBracket = {
      ...bracket,

      [roundKey]:
        pairs,
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

    /*
     MUY IMPORTANTE:
     el resultado ya fue guardado,
     recién ahora avanzamos el cuadro.
    */
    useTournament
      .getState()
      .advanceBracket();

    return {
      finished: true,
      winner,
    };
  }

  /* ==========================================
     PARTIDO ÚNICO
  ========================================== */

  const winner =
    resolveSingleWinner(
      pair,
      hg,
      ag
    );

  pairs[idx] =
    {
      ...pair,

      ag: hg,
      bg: ag,

      winner,
    };

  const nextBracket = {
    ...bracket,

    [roundKey]:
      pairs,
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

  /*
   Avanzar inmediatamente.
  */
  useTournament
    .getState()
    .advanceBracket();

  return {
    finished: true,
    winner,
  };
}

/* =========================================================
   API PÚBLICA PARA REDUCIDO
   ========================================================= */

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
  const state =
    useTournament.getState();

  const division =
    state.division ??
    "primera_nacional";

  /* ==========================================
     FINAL NACIONAL REGIONAL
  ========================================== */

  if (
    kind === "final" &&
    division ===
      "regional_federal_amateur"
  ) {
    const pair =
      state.regionalNationalFinal;

    if (
      !pair?.a ||
      !pair.b ||
      pair.winner
    ) {
      return {
        finished:
          !!pair?.winner,

        winner:
          pair?.winner,
      };
    }

    const winner =
      resolveSingleWinner(
        pair,
        hg,
        ag
      );

    useTournament.setState(
      {
        regionalNationalFinal:
          {
            ...pair,

            ag: hg,
            bg: ag,

            winner,
          },

        champion:
          winner,

        reducidoChampion:
          winner ===
          state.userTeamId
            ? winner
            : state.reducidoChampion,
      }
    );

    return {
      finished: true,
      winner,
    };
  }

  /* ==========================================
     FINAL DIRECTA
  ========================================== */

  if (
    kind === "final"
  ) {
    const pair =
      state.finalDirecta;

    if (
      !pair?.a ||
      !pair.b
    ) {
      return {
        finished: false,
        winner:
          undefined as
            | string
            | undefined,
      };
    }

    /* ------------------------------------------
       FINAL A DOS PARTIDOS
    ------------------------------------------ */

    if (
      pair.legs === 2
    ) {
      /*
       IDA
      */
      if (
        pair.leg1a ===
        undefined
      ) {
        const {
          aGoals,
          bGoals,
        } =
          resolveTwoLegUserPair(
            pair,
            hg,
            ag
          );

        useTournament.setState(
          {
            finalDirecta:
              {
                ...pair,

                leg1a:
                  aGoals,

                leg1b:
                  bGoals,
              },
          }
        );

        return {
          finished: false,
          winner:
            undefined,
        };
      }

      /*
       VUELTA
      */
      const winner =
        resolveTwoLegWinner(
          pair,
          hg,
          ag
        );

      const loser =
        winner === pair.a
          ? pair.b
          : pair.a;

      useTournament.setState(
        {
          finalDirecta:
            {
              ...pair,

              leg2a:
                hg,

              leg2b:
                ag,

              winner,
            },

          champion:
            winner,
        }
      );

      /*
       Primera C:
       el perdedor entra al Reducido.

       Promocional:
       el perdedor también entra.
      */
      if (
        division ===
          "primera_c" ||
        division ===
          "promocional_amateur"
      ) {
        const bracket =
          bracketForDivision(
            division,
            state.standA,
            state.standB,
            loser
          );

        useTournament.setState(
          {
            bracket,
          }
        );

        useTournament
          .getState()
          .advanceBracket();
      }

      return {
        finished: true,
        winner,
      };
    }

    /* ------------------------------------------
       FINAL A UN PARTIDO
    ------------------------------------------ */

    const winner =
      resolveSingleWinner(
        pair,
        hg,
        ag
      );

    const loser =
      winner === pair.a
        ? pair.b
        : pair.a;

    useTournament.setState(
      {
        finalDirecta:
          {
            ...pair,

            ag: hg,
            bg: ag,

            winner,
          },

        champion:
          winner,
      }
    );

    /*
     Perdedor al Reducido.
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
          state.standA,
          state.standB,
          loser
        );

      useTournament.setState(
        {
          bracket,
        }
      );

      /*
       Ahora simulamos rivales
       y armamos la siguiente fase.
      */
      useTournament
        .getState()
        .advanceBracket();
    }

    return {
      finished: true,
      winner,
    };
  }

  /* ==========================================
     PARTIDO DEL REDUCIDO
  ========================================== */

  return recordBracketUserMatch(
    kind,
    idx,
    hg,
    ag
  );
}
