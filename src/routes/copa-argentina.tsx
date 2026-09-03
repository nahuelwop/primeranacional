import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS_BY_ID } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { Game, type Difficulty } from "@/components/Game";
import { Penales } from "@/components/Penales";
import { fetchGameSettings } from "@/lib/game-settings";
import {
  buildCopaBracket, simulateCopaRoundExceptUser, recordCopaUserMatch, nextCopaMatchForUser,
  isCopaFinished, isCopaUnlocked, COPA_ROUND_ORDER, COPA_ROUND_LABEL,
  type CopaState, type CopaRound,
} from "@/lib/copaArgentina";

export const Route = createFileRoute("/copa-argentina")({
  validateSearch: (s: Record<string, unknown>) => ({
    teamId: (s.teamId as string) ?? "",
    season: Number(s.season ?? 1),
    difficulty: (s.difficulty as Difficulty) ?? "normal",
  }),
  head: () => ({
    meta: [
      { title: "Copa Argentina · Primera Heads" },
      { name: "description", content: "Eliminación directa a partido único, cancha neutral. 64 equipos, un campeón." },
    ],
  }),
  component: CopaArgentinaPage,
});

const STORAGE_KEY = "ph_copa_argentina_v1";

function loadOrBuild(teamId: string, season: number): CopaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as CopaState;
      if (saved.userTeamId === teamId && saved.season === season) return saved;
    }
  } catch { /* noop */ }
  const fresh = buildCopaBracket(teamId, season);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch { /* noop */ }
  return fresh;
}

function CopaArgentinaPage() {
  useTeamsSync();
  const { teamId, season, difficulty } = useSearch({ from: "/copa-argentina" });
  const [state, setState] = useState<CopaState | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showPenales, setShowPenales] = useState(false);
  const [pendingScore, setPendingScore] = useState<{ h: number; a: number } | null>(null);
  const [introVideo, setIntroVideo] = useState<string | null>(null);
  const [introSeen, setIntroSeen] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    setState(loadOrBuild(teamId, season));
  }, [teamId, season]);

  useEffect(() => {
    if (state) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ } }
  }, [state]);

  useEffect(() => {
    let active = true;
    fetchGameSettings().then(settings => {
      if (!active) return;
      setIntroVideo(settings.intro_videos?.copa_argentina ?? null);
      try { setIntroSeen(localStorage.getItem(`ph_copa_intro_seen_${season}`) === "1"); } catch { setIntroSeen(false); }
    }).catch(() => {});
    return () => { active = false; };
  }, [season]);

  function skipIntro() {
    try { localStorage.setItem(`ph_copa_intro_seen_${season}`, "1"); } catch {}
    setIntroSeen(true);
  }

  const nextMatch = state ? nextCopaMatchForUser(state) : null;
  const home = nextMatch ? TEAMS_BY_ID[nextMatch.home] : undefined;
  const away = nextMatch ? TEAMS_BY_ID[nextMatch.away] : undefined;

  if (state && introVideo && !introSeen) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4">
        <video src={introVideo} autoPlay playsInline className="max-h-[86vh] max-w-[96vw] w-auto rounded-xl shadow-2xl" onEnded={skipIntro} />
        <button onClick={skipIntro} className="absolute bottom-8 px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-widest">SALTAR INTRO</button>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 text-center">
          <div className="font-display text-3xl">Copa Argentina</div>
          <p className="text-muted-foreground mt-3">Entrá desde tu Modo Carrera (botón "Copa Argentina" en Inicio) para jugarla con tu equipo.</p>
          <Link to="/carrera" className="inline-block mt-6 px-5 py-2.5 rounded-lg bg-celeste text-primary-foreground font-display tracking-wider">
            Ir a Modo Carrera
          </Link>
        </main>
      </div>
    );
  }

  if (!isCopaUnlocked(season)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 text-center">
          <div className="font-display text-3xl">Copa Argentina</div>
          <p className="text-muted-foreground mt-3">Se juega recién a partir de la 2ª temporada de tu carrera. Todavía estás en la 1ª.</p>
          <Link to="/carrera" className="inline-block mt-6 px-5 py-2.5 rounded-lg bg-celeste text-primary-foreground font-display tracking-wider">
            Volver a Carrera
          </Link>
        </main>
      </div>
    );
  }

  if (!state) return null;

  // Partido del usuario en curso
  if (playing && home && away && nextMatch) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
          <div className="text-center mb-3">
            <div className="text-[11px] uppercase tracking-[0.3em] text-celeste">{COPA_ROUND_LABEL[nextMatch.round]} · Cancha neutral</div>
          </div>
          {!showPenales ? (
            <Game
              home={home} away={away} duration={60} aiDifficulty={difficulty} mode="1vAI"
              matchLabel="Copa Argentina — a partido único"
              onEnd={(hg, ag) => {
                if (hg === ag) { setPendingScore({ h: hg, a: ag }); setShowPenales(true); return; }
                const winner = hg > ag ? nextMatch.home : nextMatch.away;
                setState(s => s && recordCopaUserMatch(s, nextMatch.id, hg, ag, winner));
                setPlaying(false);
              }}
              onExit={() => setPlaying(false)}
            />
          ) : (
            <Penales
              home={home} away={away} mode="1vAI"
              onEnd={(winner) => {
                const winnerId = winner === "H" ? nextMatch.home : nextMatch.away;
                setState(s => s && recordCopaUserMatch(s, nextMatch.id, pendingScore?.h ?? 0, pendingScore?.a ?? 0, winnerId));
                setShowPenales(false); setPendingScore(null); setPlaying(false);
              }}
            />
          )}
        </main>
      </div>
    );
  }

  const finished = isCopaFinished(state);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <div className="font-display text-3xl">COPA ARGENTINA</div>
          <div className="text-xs text-muted-foreground">64 equipos · eliminación directa · cancha neutral · penales si hay empate</div>
        </div>

        {finished ? (
          <div className="hud-panel p-6 text-center">
            {state.champion === state.userTeamId ? (
              <div className="font-display text-2xl text-hud-green">🏆 ¡Campeón de la Copa Argentina!</div>
            ) : state.userEliminated ? (
              <div className="font-display text-xl text-destructive">Quedaste eliminado. Campeón: {TEAMS_BY_ID[state.champion ?? ""]?.name ?? "—"}</div>
            ) : (
              <div className="font-display text-xl">Campeón: {TEAMS_BY_ID[state.champion ?? ""]?.name ?? "—"}</div>
            )}
          </div>
        ) : nextMatch && home && away ? (
          <div className="hud-panel p-6 text-center mb-6">
            <div className="text-[11px] uppercase tracking-[0.25em] text-celeste mb-3">{COPA_ROUND_LABEL[nextMatch.round]}</div>
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <Shield team={home} size={64} />
                <div className="font-display text-lg mt-2">{home.short}</div>
              </div>
              <div className="font-display text-2xl text-muted-foreground">VS</div>
              <div className="text-center">
                <Shield team={away} size={64} />
                <div className="font-display text-lg mt-2">{away.short}</div>
              </div>
            </div>
            <button
              onClick={() => setPlaying(true)}
              className="mt-6 px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-widest"
            >
              JUGAR PARTIDO
            </button>
          </div>
        ) : (
          <div className="hud-panel p-6 text-center mb-6 text-muted-foreground">
            Esperando que se complete la ronda…
            <button
              onClick={() => setState(s => {
                if (!s) return s;
                const r = COPA_ROUND_ORDER.find(rd => s.rounds[rd].some(m => !m.played));
                return r ? simulateCopaRoundExceptUser(s, r) : s;
              })}
              className="block mx-auto mt-3 text-xs text-celeste hover:underline"
            >
              Avanzar ronda
            </button>
          </div>
        )}

        <BracketView state={state} />
      </main>
    </div>
  );
}

function BracketView({ state }: { state: CopaState }) {
  return (
    <section className="copa-bracket-section">
      <div className="copa-bracket-heading">
        <div>
          <div className="copa-bracket-kicker">CAMINO AL TÍTULO</div>
          <h2 className="copa-bracket-title">CUADRO DE ELIMINACIÓN</h2>
          <p className="copa-bracket-subtitle">
            Partido único · cancha neutral · si empatan, penales directos
          </p>
        </div>
        <div className="copa-bracket-badge">
          <span className="copa-bracket-badge-dot" />
          64 CLUBES
        </div>
      </div>

      <div className="copa-bracket-viewport">
        <div className="copa-bracket-track">
          {COPA_ROUND_ORDER.map((round, roundIndex) => {
            const matches = state.rounds[round];
            if (!matches || matches.length === 0) return null;

            return (
              <div className={`copa-round copa-round-${roundIndex + 1}`} key={round}>
                <div className="copa-round-header">
                  <div className="copa-round-number">FASE {String(roundIndex + 1).padStart(2, "0")}</div>
                  <div className="copa-round-title">{COPA_ROUND_LABEL[round]}</div>
                </div>

                <div className="copa-round-matches">
                  {matches.map((m, matchIndex) => {
                    const h = TEAMS_BY_ID[m.home];
                    const a = TEAMS_BY_ID[m.away];
                    const mine = m.home === state.userTeamId || m.away === state.userTeamId;
                    const winner = m.played ? m.winner : null;
                    const neutralLabel = roundIndex === 0 ? "32AVOS" : COPA_ROUND_LABEL[round].toUpperCase();

                    return (
                      <article
                        key={m.id}
                        className={`copa-match ${mine ? "is-user" : ""} ${m.played ? "is-played" : "is-pending"}`}
                      >
                        <div className="copa-match-topline">
                          <span>{neutralLabel}</span>
                          <span>{m.played ? (m.wentToPenalties ? "PENALES" : "FINALIZADO") : `LLAVE ${String(matchIndex + 1).padStart(2, "0")}`}</span>
                        </div>

                        <div className={`copa-team-row ${winner === m.home ? "is-winner" : ""}`}>
                          <div className="copa-team-info">
                            <div className="copa-mini-shield">
                              {h ? <Shield team={h} size={30} /> : <span>?</span>}
                            </div>
                            <span className="copa-team-name">{h?.short ?? "POR DEFINIR"}</span>
                          </div>
                          <span className="copa-team-score">{m.played ? m.homeGoals : "·"}</span>
                        </div>

                        <div className="copa-match-divider">
                          <span>VS</span>
                          <i />
                        </div>

                        <div className={`copa-team-row ${winner === m.away ? "is-winner" : ""}`}>
                          <div className="copa-team-info">
                            <div className="copa-mini-shield">
                              {a ? <Shield team={a} size={30} /> : <span>?</span>}
                            </div>
                            <span className="copa-team-name">{a?.short ?? "POR DEFINIR"}</span>
                          </div>
                          <span className="copa-team-score">{m.played ? m.awayGoals : "·"}</span>
                        </div>

                        <div className="copa-match-footer">
                          <span>{mine ? "TU PARTIDO" : "CANCHA NEUTRAL"}</span>
                          <span className="copa-live-dot" aria-hidden="true" />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="copa-bracket-legend">
        <div><span className="copa-legend-swatch copa-legend-user" /> Tu camino</div>
        <div><span className="copa-legend-swatch copa-legend-played" /> Partido jugado</div>
        <div><span className="copa-legend-swatch copa-legend-pending" /> Por jugar</div>
      </div>
    </section>
  );
}
