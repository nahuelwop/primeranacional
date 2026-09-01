import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS_BY_ID } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { useTournament, recordUserPlayoff } from "@/store/tournament";
import { Pair } from "@/lib/tournament";
import { careerTeam, type CareerState } from "@/lib/career";
import { Game } from "@/components/Game";
import { useAuth } from "@/lib/auth";
import { fetchCareer } from "@/lib/career-api";

export const Route = createFileRoute("/reducido")({
  head: () => ({
    meta: [
      { title: "Fase Final · Primera Heads" },
      { name: "description", content: "Final directa por el primer ascenso y reducido por el segundo." },
    ],
  }),
  component: Reducido,
});

type PlayCtx = {
  kind: "final" | "octavos" | "cuartos" | "semis" | "final_reducido";
  idx: number;
  pair: Pair;
};

function Reducido() {
  useTeamsSync();
  const s = useTournament();
  const { user } = useAuth();
  const [play, setPlay] = useState<PlayCtx | null>(null);
  // El fixture se arma una sola vez; sin esto el estado quedaba vacío
  // y la fase final nunca se habilitaba.
  useEffect(() => { s.init(); }, []);

  // Guard de identidad: userTeamId vive en un store local (localStorage) que solo
  // se actualiza al pasar por "Ir a Fase Final" desde Carrera. Si quedó desincronizado
  // con el club real de la carrera activa (guardada en Supabase) — por ej. porque el
  // usuario entró acá directo, o jugó antes con otro club — todo el bracket se arma
  // comparando contra el club viejo y termina "invirtiendo" al usuario con el rival.
  const [teamMismatch, setTeamMismatch] = useState<{ real: string } | null | undefined>(undefined);
  const [careerState, setCareerState] = useState<CareerState | null>(null);
  useEffect(() => {
    if (!user || !s.userTeamId) { setTeamMismatch(null); return; }
    let active = true;
    fetchCareer(user.id).then(save => {
      if (!active) return;
      if (save) {
        if (save.team_id !== s.userTeamId) setTeamMismatch({ real: save.team_id });
        else {
          setTeamMismatch(null);
          setCareerState((save.state as CareerState) ?? null);
        }
      } else setTeamMismatch(null);
    }).catch(() => active && setTeamMismatch(null));
    return () => { active = false; };
  }, [user, s.userTeamId]);

  const allPlayed = s.fixture.length > 0 && s.fixture.every(m => m.played);

  if (teamMismatch) {
    const realTeam = TEAMS_BY_ID[teamMismatch.real];
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 grid place-items-center px-4">
          <div className="text-center max-w-md">
            <h1 className="font-display text-4xl">Fase final desactualizada</h1>
            <p className="text-muted-foreground mt-2">
              Esta fase final quedó armada para otro club. Volvé a Modo Carrera con {realTeam?.short ?? "tu equipo actual"} y
              entrá de nuevo a la Fase Final para reconstruirla con los datos correctos.
            </p>
            <Link to="/carrera" className="mt-5 inline-block px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider">IR A MODO CARRERA</Link>
          </div>
        </main>
      </div>
    );
  }

  if (!allPlayed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 grid place-items-center px-4">
          <div className="text-center max-w-md">
            <h1 className="font-display text-4xl">Falta terminar la fase regular</h1>
            <p className="text-muted-foreground mt-2">Disputá todas las fechas de la temporada en Modo Carrera para habilitar la fase final.</p>
            <Link to="/carrera" className="mt-5 inline-block px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider">IR A MODO CARRERA</Link>
          </div>
        </main>
      </div>
    );
  }

  const isUserPair = (p?: Pair) => !!p && !!s.userTeamId && (p.a === s.userTeamId || p.b === s.userTeamId);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <h1 className="font-display text-5xl">{s.division === "primera_b" ? "REDUCIDO" : "FASE DE ASCENSO"}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {s.division === "primera_b" ? "Segundo ascenso a Primera Nacional · 2° al 9°" :
           s.division === "primera_c" ? "Final por el 1° ascenso · Reducido por el 2° ascenso" :
           s.division === "promocional_amateur" ? "Final por el ascenso · Reducido por la segunda oportunidad" :
           s.division === "regional_federal_amateur" ? "Eliminatorias regionales · final regional · etapa nacional" :
           "Primer ascenso por final directa · Segundo por Reducido"}
        </p>

        {!s.finalDirecta && !s.bracket ? (
          <button onClick={() => s.startPlayoffs()}
            className="mt-6 px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider glow-celeste">
            {s.division === "primera_b" ? "INICIAR REDUCIDO" : s.division === "regional_federal_amateur" ? "INICIAR ELIMINATORIAS REGIONALES" : "INICIAR FASE DE ASCENSO"}
          </button>
        ) : (
          <div className={`mt-6 grid ${s.division === "primera_b" || s.division === "regional_federal_amateur" ? "lg:grid-cols-1" : "lg:grid-cols-3"} gap-6`}>
            {s.division !== "primera_b" && s.division !== "regional_federal_amateur" && (
              <div className="rounded-2xl bg-gradient-to-br from-celeste/20 to-accent/10 border border-celeste/40 p-5">
                <div className="font-display text-celeste text-xl">FINAL POR EL 1° ASCENSO</div>
                {s.finalDirecta ? <PairView pair={s.finalDirecta} big /> : <div className="text-xs text-muted-foreground mt-3">Esperando que comience la final.</div>}
                {s.finalDirecta && !s.finalDirecta.winner && isUserPair(s.finalDirecta) && (
                  <button onClick={() => setPlay({ kind: "final", idx: 0, pair: s.finalDirecta! })}
                    className="mt-3 w-full px-4 py-3 rounded-lg bg-celeste text-primary-foreground font-display tracking-wider glow-celeste">
                    {s.finalDirecta.legs === 2 && s.finalDirecta.leg1a !== undefined ? "JUGAR VUELTA" : "JUGAR FINAL"}
                  </button>
                )}
                {s.champion && (
                  <div className="mt-4 text-center">
                    <div className="text-xs text-muted-foreground">CAMPEÓN · 1° ASCENSO</div>
                    <div className="font-display text-2xl text-celeste">{TEAMS_BY_ID[s.champion]?.name}</div>
                  </div>
                )}
              </div>
            )}

            <div className={`${s.division === "primera_b" ? "lg:col-span-1" : "lg:col-span-2"} rounded-2xl bg-card border border-border p-5`}>
              <div className="flex items-center justify-between">
                <div className="font-display text-xl">{s.division === "regional_federal_amateur" ? "ELIMINATORIAS REGIONALES" : "REDUCIDO · 2° ASCENSO"}</div>
                <button onClick={() => s.advanceBracket()}
                  disabled={!!s.reducidoChampion}
                  className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-display tracking-wider disabled:opacity-40">
                  SIMULAR RIVALES
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                <BracketCol title={s.division === "regional_federal_amateur" ? "Ronda regional 1" : "Octavos"} pairs={s.bracket?.octavos ?? []} kind="octavos" onPlay={setPlay} userId={s.userTeamId} />
                <BracketCol title="Cuartos" pairs={s.bracket?.cuartos ?? []} kind="cuartos" onPlay={setPlay} userId={s.userTeamId} />
                <BracketCol title="Semis"   pairs={s.bracket?.semis ?? []}   kind="semis"   onPlay={setPlay} userId={s.userTeamId} />
                <BracketCol title="Final"   pairs={s.bracket?.final ?? []}   kind="final_reducido" onPlay={setPlay} userId={s.userTeamId} />
              </div>

              {s.reducidoChampion && s.division !== "regional_federal_amateur" && (
                <div className="mt-6 text-center p-4 rounded-xl bg-accent/10 border border-accent/40">
                  <div className="text-xs text-muted-foreground">CAMPEÓN DEL REDUCIDO · 2° ASCENSO</div>
                  <div className="font-display text-3xl text-accent">{TEAMS_BY_ID[s.reducidoChampion]?.name}</div>
                </div>
              )}

              {s.division === "regional_federal_amateur" && s.regionalNationalFinal && (
                <div className="mt-6 rounded-2xl bg-gradient-to-br from-celeste/15 to-accent/10 border border-celeste/40 p-5">
                  <div className="font-display text-celeste text-xl">ETAPA FINAL NACIONAL · ASCENSO AL FEDERAL A</div>
                  <PairView pair={s.regionalNationalFinal} big />
                  {!s.regionalNationalFinal.winner && isUserPair(s.regionalNationalFinal) && (
                    <button onClick={() => setPlay({ kind: "final", idx: 0, pair: s.regionalNationalFinal! })}
                      className="mt-3 w-full px-4 py-3 rounded-lg bg-celeste text-primary-foreground font-display tracking-wider">
                      JUGAR FINAL NACIONAL
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {play && play.pair.a && play.pair.b && (() => {
          const userIsAway = play.pair.b === s.userTeamId;
          const left = userIsAway
            ? (careerState ? careerTeam(careerState, play.pair.b) : TEAMS_BY_ID[play.pair.b])
            : (careerState ? careerTeam(careerState, play.pair.a) : TEAMS_BY_ID[play.pair.a]);
          const right = userIsAway
            ? (careerState ? careerTeam(careerState, play.pair.a) : TEAMS_BY_ID[play.pair.a])
            : (careerState ? careerTeam(careerState, play.pair.b) : TEAMS_BY_ID[play.pair.b]);
          const label = play.kind === "final" ? "FINAL POR EL 1° ASCENSO"
            : play.kind === "final_reducido" ? "FINAL DEL REDUCIDO"
            : `${play.kind.toUpperCase()} · REDUCIDO`;
          return (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-4 flex items-start justify-center">
              <div className="w-full max-w-4xl bg-card rounded-2xl border border-border p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-display text-2xl text-celeste">JUGÁ TU PARTIDO</h2>
                  <button onClick={() => setPlay(null)}
                    className="px-3 py-1 rounded-lg bg-secondary border border-border text-sm">CERRAR</button>
                </div>
                <Game
                  home={left}
                  away={right}
                  duration={60}
                  aiDifficulty="hard"
                  mode="1vAI"
                  crowdIntensity="ascenso"
                  matchLabel={label}
                  onEnd={(lg, rg) => {
                    const hg = userIsAway ? rg : lg;
                    const ag = userIsAway ? lg : rg;
                    recordUserPlayoff(play.kind, play.idx, hg, ag);
                    setPlay(null);
                  }}
                />
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}

function BracketCol({ title, pairs, kind, onPlay, userId }: {
  title: string; pairs: Pair[];
  kind: PlayCtx["kind"]; onPlay: (c: PlayCtx) => void; userId?: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="space-y-2">
        {pairs.length === 0 && <div className="text-xs text-muted-foreground/60">—</div>}
        {pairs.map((p, i) => {
          const isUser = userId && (p.a === userId || p.b === userId);
          const canPlay = isUser && p.a && p.b && !p.winner;
          return (
            <div key={i} className="space-y-1">
              <PairView pair={p} />
              {canPlay && (
                <button onClick={() => onPlay({ kind, idx: i, pair: p })}
                  className="w-full px-2 py-1 rounded bg-celeste text-primary-foreground font-display text-xs tracking-wider">
                  JUGAR
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PairView({ pair, big }: { pair: Pair; big?: boolean }) {
  const a = pair.a ? TEAMS_BY_ID[pair.a] : null;
  const b = pair.b ? TEAMS_BY_ID[pair.b] : null;
  const cls = big ? "text-base p-3" : "text-xs p-2";
  return (
    <div className={`rounded-lg bg-background border border-border ${cls}`}>
      <Row team={a} g={pair.ag} winner={pair.winner === pair.a} big={big} />
      <Row team={b} g={pair.bg} winner={pair.winner === pair.b} big={big} />
    </div>
  );
}

function Row({ team, g, winner, big }: { team: any; g?: number; winner?: boolean; big?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 ${winner ? "text-celeste font-bold" : ""}`}>
      <div className="flex items-center gap-2 min-w-0">
        {team ? <Shield team={team} size={big ? 28 : 18} /> : <div className="w-4 h-4 rounded bg-muted" />}
        <span className="truncate">{team?.name ?? "—"}</span>
      </div>
      <span className="font-display">{g ?? ""}</span>
    </div>
  );
}
