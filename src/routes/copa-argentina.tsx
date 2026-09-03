import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { CopaArgentinaIntro } from "@/components/CopaArgentinaIntro";
import { TEAMS_BY_ID } from "@/data/teams";
import { getTeamsByDivision, getTeamById } from "@/data/teams-catalog";
import { useTeamsSync } from "@/lib/teams-sync";
import { Game, type Difficulty } from "@/components/Game";
import { Penales } from "@/components/Penales";
import { fetchGameSettings } from "@/lib/game-settings";
import {
  buildCopaBracket, simulateCopaRoundExceptUser, recordCopaUserMatch, nextCopaMatchForUser,
  isCopaFinished, COPA_ROUND_ORDER, COPA_ROUND_LABEL,
  type CopaState, type CopaRound,
} from "@/lib/copaArgentina";

export const Route = createFileRoute("/copa-argentina")({
  validateSearch: (s: Record<string, unknown>) => ({
    teamId: (s.teamId as string) ?? "",
    season: Math.max(1, Number(s.season ?? 1)),
    difficulty: (s.difficulty as Difficulty) ?? "normal",
    mode: s.mode === "career" ? "career" : "standalone",
  }),
  head: () => ({
    meta: [
      { title: "Copa Argentina · Primera Heads" },
      { name: "description", content: "Eliminación directa a partido único, cancha neutral. 64 equipos, un campeón." },
    ],
  }),
  component: CopaArgentinaPage,
});

const STANDALONE_STORAGE_PREFIX = "ph_copa_argentina_standalone_v2";
const CAREER_STORAGE_PREFIX = "ph_copa_argentina_career_v2";

function storageKey(mode: "standalone" | "career", teamId: string, season: number) {
  const prefix = mode === "career" ? CAREER_STORAGE_PREFIX : STANDALONE_STORAGE_PREFIX;
  return `${prefix}:${season}:${teamId}`;
}

function loadOrBuild(teamId: string, season: number, mode: "standalone" | "career"): CopaState {
  const key = storageKey(mode, teamId, season);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const saved = JSON.parse(raw) as CopaState;
      if (saved.userTeamId === teamId && saved.season === season) return saved;
    }
  } catch { /* ignore broken local state and rebuild */ }

  const fresh = buildCopaBracket(teamId, season);
  try { localStorage.setItem(key, JSON.stringify(fresh)); } catch { /* ignore storage failure */ }
  return fresh;
}

const DIVISION_ORDER = [
  { id: "primera_division", label: "PRIMERA DIVISIÓN" },
  { id: "primera_nacional", label: "PRIMERA NACIONAL" },
  { id: "federal_a", label: "FEDERAL A" },
  { id: "primera_b", label: "PRIMERA B METROPOLITANA" },
  { id: "primera_c", label: "PRIMERA C" },
] as const;

function CopaArgentinaPage() {
  const teamsSyncVersion = useTeamsSync();
  const navigate = useNavigate();
  const { teamId, season, difficulty, mode } = useSearch({ from: "/copa-argentina" });
  const [state, setState] = useState<CopaState | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showPenales, setShowPenales] = useState(false);
  const [pendingScore, setPendingScore] = useState<{ h: number; a: number } | null>(null);
  const [introVideo, setIntroVideo] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  const selectableTeams = useMemo(() => {
    const groups = DIVISION_ORDER.map(group => ({
      ...group,
      teams: getTeamsByDivision(group.id),
    }));
    return groups.filter(group => group.teams.length > 0);
  }, [teamsSyncVersion]);

  useEffect(() => {
    if (!teamId) {
      setState(null);
      setPlaying(false);
      setShowPenales(false);
      setShowIntro(false);
      return;
    }
    const selected = getTeamById(teamId);
    if (!selected) return;
    setState(loadOrBuild(teamId, season, mode));
    setPlaying(false);
    setShowPenales(false);
    setPendingScore(null);
    // La intro es por inicio de Copa y por equipo. No se marca como vista
    // globalmente por temporada: al elegir otro club vuelve a aparecer.
    setShowIntro(true);
  }, [teamId, season, mode]);

  useEffect(() => {
    let active = true;
    fetchGameSettings().then(settings => {
      if (active) setIntroVideo(settings.intro_videos?.copa_argentina ?? null);
    }).catch(() => {
      if (active) setIntroVideo(null);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!state || !teamId) return;
    try { localStorage.setItem(storageKey(mode, teamId, season), JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, teamId, season, mode]);

  const nextMatch = state ? nextCopaMatchForUser(state) : null;
  const home = nextMatch ? TEAMS_BY_ID[nextMatch.home] : undefined;
  const away = nextMatch ? TEAMS_BY_ID[nextMatch.away] : undefined;

  function startNewTeam(nextTeamId: string) {
    if (!isCopaEligibleTeam(nextTeamId)) return;
    navigate({
      to: "/copa-argentina",
      search: { teamId: nextTeamId, season, difficulty, mode },
      replace: true,
    });
  }

  function startNewStandalone() {
    setState(null);
    setPlaying(false);
    setShowPenales(false);
    setPendingScore(null);
    setShowIntro(false);
    navigate({ to: "/copa-argentina", search: { teamId: "", season: 1, difficulty, mode: "standalone" }, replace: true });
  }

  if (!teamId) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Nav />
        <main className="relative min-h-[calc(100vh-65px)] overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.16),transparent_45%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#02060b_0%,#03070d_45%,#000_100%)]" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12">
            <div className="text-center max-w-3xl mx-auto">
              <div className="text-[11px] uppercase tracking-[0.4em] text-celeste mb-3">TORNEO INDEPENDIENTE</div>
              <h1 className="font-display text-5xl md:text-7xl tracking-widest">COPA ARGENTINA</h1>
              <p className="mt-3 text-white/60">Elegí cualquier club habilitado, incluso sin iniciar sesión. Esta Copa queda separada de tu Modo Carrera.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 text-[10px] uppercase tracking-widest text-white/50">
                <span className="hud-card px-3 py-2 rounded-full">64 CLUBES</span>
                <span className="hud-card px-3 py-2 rounded-full">PARTIDO ÚNICO</span>
                <span className="hud-card px-3 py-2 rounded-full">CANCHA NEUTRAL</span>
                <span className="hud-card px-3 py-2 rounded-full">PENALES</span>
              </div>
            </div>

            <div className="mt-10 grid gap-8">
              {selectableTeams.map(group => (
                <section key={group.id}>
                  <div className="flex items-end justify-between gap-4 mb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-celeste/80">Participantes</div>
                      <h2 className="font-display text-2xl md:text-3xl tracking-widest">{group.label}</h2>
                    </div>
                    <span className="text-xs text-white/40">{group.teams.length} clubes</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {group.teams.map(team => (
                      <button
                        key={team.id}
                        onClick={() => startNewTeam(team.id)}
                        className="group hud-card rounded-xl p-3 text-left border border-white/10 hover:border-celeste/60 hover:bg-celeste/5 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Shield team={team} size={38} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{team.name}</div>
                            <div className="text-[10px] text-white/40 truncate">{team.city}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-[9px] uppercase tracking-[0.15em] text-celeste/0 group-hover:text-celeste transition-colors">Elegir club →</div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const selectedTeam = getTeamById(teamId);
  if (!selectedTeam || !isCopaEligibleTeam(teamId) || !state) return null;

  if (showIntro) {
    return (
      <CopaArgentinaIntro
        team={selectedTeam}
        season={season}
        mode={mode}
        videoUrl={introVideo}
        onDone={() => setShowIntro(false)}
      />
    );
  }

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
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-celeste">{mode === "career" ? "MODO CARRERA · COPA ARGENTINA" : "TORNEO INDEPENDIENTE"}</div>
            <div className="font-display text-3xl md:text-4xl tracking-widest">COPA ARGENTINA</div>
            <div className="text-xs text-muted-foreground mt-1">{selectedTeam.name} · Temporada {season}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowIntro(true)} className="px-4 py-2 rounded-lg border border-white/15 hover:border-celeste/60 hover:bg-celeste/5 text-xs font-display tracking-widest">VER INTRO</button>
            {mode === "standalone" && <button onClick={startNewStandalone} className="px-4 py-2 rounded-lg border border-white/15 hover:border-celeste/60 hover:bg-celeste/5 text-xs font-display tracking-widest">CAMBIAR EQUIPO</button>}
            {mode === "career" && <Link to="/carrera" className="px-4 py-2 rounded-lg border border-white/15 hover:border-celeste/60 hover:bg-celeste/5 text-xs font-display tracking-widest">VOLVER A CARRERA</Link>}
          </div>
        </div>

        {finished ? (
          <div className="hud-panel p-6 text-center">
            {state.champion === state.userTeamId ? (
              <div className="font-display text-2xl text-hud-green">🏆 ¡Campeón de la Copa Argentina!</div>
            ) : (
              <div className="font-display text-xl">Campeón: {TEAMS_BY_ID[state.champion ?? ""]?.name ?? "—"}</div>
            )}
            {mode === "standalone" ? (
              <button onClick={startNewStandalone} className="mt-5 px-5 py-2.5 rounded-lg bg-celeste text-primary-foreground font-display tracking-widest">ELEGIR OTRO EQUIPO</button>
            ) : (
              <Link to="/carrera" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-celeste text-primary-foreground font-display tracking-widest">VOLVER A CARRERA</Link>
            )}
          </div>
        ) : nextMatch && home && away ? (
          <div className="hud-panel p-6 text-center mb-6">
            <div className="text-[11px] uppercase tracking-[0.25em] text-celeste mb-3">{COPA_ROUND_LABEL[nextMatch.round]}</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-5">{selectedTeam.name} · camino al título</div>
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
            <button onClick={() => setPlaying(true)} className="mt-6 px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-widest">JUGAR PARTIDO</button>
            <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/35">Sin cuenta · progreso guardado en este dispositivo</div>
          </div>
        ) : (
          <div className="hud-panel p-6 text-center mb-6 text-muted-foreground">Esperando que se complete la ronda…</div>
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
