import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { getTeamById, getTeamsByDivision } from "@/data/teams-catalog";
import type { DivisionId } from "@/data/competitions";
import { useTeamsSync } from "@/lib/teams-sync";
import { Game, type Difficulty } from "@/components/Game";
import { Penales } from "@/components/Penales";
import { fetchGameSettings } from "@/lib/game-settings";
import {
  buildCopaBracket,
  simulateCopaRoundExceptUser,
  simulateRemainingCopa,
  recordCopaUserMatch,
  nextCopaMatchForUser,
  isCopaFinished,
  isCopaUnlocked,
  isCopaEligibleTeam,
  COPA_FINAL_QUOTAS,
  COPA_FINAL_TEAM_COUNT,
  COPA_ROUND_ORDER,
  COPA_ROUND_LABEL,
  type CopaState,
} from "@/lib/copaArgentina";

export const Route = createFileRoute("/copa-argentina")({
  validateSearch: (s: Record<string, unknown>) => ({
    teamId: (s.teamId as string) ?? "",
    season: Math.max(1, Number(s.season ?? 1)),
    difficulty: (s.difficulty as Difficulty) ?? "normal",
  }),
  head: () => ({
    meta: [
      { title: "Copa Argentina AXION Energy · Primera Heads" },
      { name: "description", content: "Copa Argentina 2026 en Primera Heads: 64 equipos, eliminación directa, partido único y cancha neutral." },
      { property: "og:title", content: "Copa Argentina AXION Energy · Primera Heads" },
      { property: "og:description", content: "Elegí tu club y jugá la Copa Argentina en Primera Heads." },
    ],
  }),
  component: CopaArgentinaPage,
});

const STORAGE_PREFIX = "ph_copa_argentina_v2";

function storageKey(teamId: string, season: number) {
  return `${STORAGE_PREFIX}:${teamId}:${season}`;
}

function loadOrBuild(teamId: string, season: number): CopaState {
  try {
    const raw = localStorage.getItem(storageKey(teamId, season));
    if (raw) {
      const parsed = JSON.parse(raw) as CopaState;
      if (parsed.userTeamId === teamId && parsed.season === season && parsed.rounds?.["32avos"]) return parsed;
    }
  } catch { /* noop */ }
  const fresh = buildCopaBracket(teamId, season);
  try { localStorage.setItem(storageKey(teamId, season), JSON.stringify(fresh)); } catch { /* noop */ }
  return fresh;
}

function saveState(state: CopaState) {
  try { localStorage.setItem(storageKey(state.userTeamId, state.season), JSON.stringify(state)); } catch { /* noop */ }
}

const SELECTABLE_DIVISIONS: DivisionId[] = [
  "primera_division",
  "primera_nacional",
  "primera_b",
  "primera_c",
  "federal_a",
];

function CopaArgentinaPage() {
  useTeamsSync();
  const navigate = useNavigate();
  const { teamId, season, difficulty } = useSearch({ from: "/copa-argentina" });
  const [state, setState] = useState<CopaState | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showPenales, setShowPenales] = useState(false);
  const [pendingScore, setPendingScore] = useState<{ h: number; a: number } | null>(null);
  const [introVideo, setIntroVideo] = useState<string | null>(null);
  const [introSeen, setIntroSeen] = useState(false);

  const standalone = !teamId;
  const selectedTeam = teamId ? getTeamById(teamId) : undefined;

  useEffect(() => {
    if (!teamId || !isCopaEligibleTeam(teamId)) {
      setState(null);
      return;
    }
    try {
      setState(loadOrBuild(teamId, season));
    } catch {
      setState(null);
    }
    setPlaying(false);
    setShowPenales(false);
    setPendingScore(null);
  }, [teamId, season]);

  useEffect(() => {
    if (state) saveState(state);
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
    try { localStorage.setItem(`ph_copa_intro_seen_${season}`, "1"); } catch { /* noop */ }
    setIntroSeen(true);
  }

  function selectTeam(id: string) {
    navigate({ to: "/copa-argentina", search: { teamId: id, season: 1, difficulty } });
  }

  const nextMatch = state ? nextCopaMatchForUser(state) : null;
  const home = nextMatch ? getTeamById(nextMatch.home) : undefined;
  const away = nextMatch ? getTeamById(nextMatch.away) : undefined;
  const finished = state ? isCopaFinished(state) : false;
  const currentRoundIndex = nextMatch ? COPA_ROUND_ORDER.indexOf(nextMatch.round) : COPA_ROUND_ORDER.length - 1;

  function applyPlayedState(next: CopaState) {
    const completed = next.userEliminated ? simulateRemainingCopa(next) : next;
    setState(completed);
    setPlaying(false);
  }

  if (teamId && !isCopaEligibleTeam(teamId)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
          <div className="hud-panel p-8 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <div className="font-display text-3xl">CLUB NO HABILITADO</div>
            <p className="text-muted-foreground mt-3">La edición 2026 de la Copa Argentina recibe clubes de Primera División, Primera Nacional, Primera B Metropolitana, Primera C y Federal A. Regional Amateur y Promocional Amateur no integran la Fase Final de 64.</p>
            <Link to="/copa-argentina" className="inline-block mt-6 px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider">ELEGIR OTRO CLUB</Link>
          </div>
        </main>
      </div>
    );
  }

  if (!teamId) {
    return <CopaTeamSelector season={season} difficulty={difficulty} onSelect={selectTeam} />;
  }

  if (!isCopaUnlocked(season)) return null;

  if (state && introVideo && !introSeen) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4">
        <video src={introVideo} autoPlay playsInline className="max-h-[88vh] max-w-[96vw] w-auto rounded-xl shadow-2xl" onEnded={skipIntro} />
        <button onClick={skipIntro} className="absolute bottom-8 px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-widest">SALTAR INTRO</button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 grid place-items-center px-4">
          <div className="hud-panel p-8 max-w-lg text-center">
            <div className="font-display text-2xl">No se pudo iniciar la Copa Argentina</div>
            <p className="text-sm text-muted-foreground mt-2">Probá volver a elegir el club.</p>
            <Link to="/copa-argentina" className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-celeste text-primary-foreground font-display">VOLVER</Link>
          </div>
        </main>
      </div>
    );
  }

  if (playing && home && away && nextMatch) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5">
          <div className="copa-match-header">
            <span className="copa-match-kicker">COPA ARGENTINA · {COPA_ROUND_LABEL[nextMatch.round]}</span>
            <span className="copa-match-note">CANCHA NEUTRAL · PARTIDO ÚNICO</span>
          </div>
          {!showPenales ? (
            <Game
              home={home}
              away={away}
              duration={60}
              aiDifficulty={difficulty}
              mode="1vAI"
              matchLabel="Copa Argentina AXION Energy"
              onEnd={(hg, ag) => {
                if (hg === ag) {
                  setPendingScore({ h: hg, a: ag });
                  setShowPenales(true);
                  return;
                }
                const winner = hg > ag ? nextMatch.home : nextMatch.away;
                const next = recordCopaUserMatch(state, nextMatch.id, hg, ag, winner);
                applyPlayedState(next);
              }}
              onExit={() => setPlaying(false)}
            />
          ) : (
            <Penales
              home={home}
              away={away}
              mode="1vAI"
              onEnd={(winner) => {
                const winnerId = winner === "H" ? nextMatch.home : nextMatch.away;
                const next = recordCopaUserMatch(state, nextMatch.id, pendingScore?.h ?? 0, pendingScore?.a ?? 0, winnerId);
                setShowPenales(false);
                setPendingScore(null);
                applyPlayedState(next);
              }}
            />
          )}
        </main>
      </div>
    );
  }

  const participantCount = state.qualification.reduce((sum, q) => sum + q.qualified.length, 0);
  const progressPct = finished ? 100 : Math.round(((currentRoundIndex) / COPA_ROUND_ORDER.length) * 100);

  return (
    <div className="min-h-screen flex flex-col copa-page">
      <Nav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5">
        <section className="copa-hero hud-panel overflow-hidden mb-4">
          <div className="copa-hero-glow" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 p-5 sm:p-7">
            <div>
              <div className="copa-eyebrow">AFA · EDICIÓN 2026</div>
              <div className="font-display text-5xl sm:text-7xl leading-[.9] tracking-wide mt-2">COPA <span className="text-celeste">ARGENTINA</span></div>
              <div className="font-display text-xl sm:text-2xl text-white/80 tracking-[.25em] mt-3">AXION ENERGY</div>
              <p className="max-w-2xl text-sm text-white/65 mt-4">El torneo más federal del fútbol argentino. Elegí tu club, avanzá partido a partido y buscá levantar la Copa.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0 lg:min-w-[430px]">
              {[['64', 'EQUIPOS'], ['6', 'RONDAS'], ['1', 'PARTIDO'], ['0', 'ALARGUE']].map(([v, l]) => (
                <div key={l} className="copa-stat-card"><div className="font-display text-2xl text-celeste">{v}</div><div className="text-[9px] tracking-[.18em] text-white/50">{l}</div></div>
              ))}
            </div>
          </div>
          <div className="copa-progress"><div style={{ width: `${progressPct}%` }} /></div>
        </section>

        <section className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
          <div className="space-y-4">
            {finished ? (
              <div className="copa-champion hud-panel p-6 text-center">
                <div className="text-6xl">🏆</div>
                <div className="copa-eyebrow mt-2">HISTORIA DEL CERTAMEN</div>
                {state.champion === state.userTeamId ? (
                  <div className="font-display text-4xl sm:text-5xl text-hud-green mt-2">¡CAMPEÓN DE COPA ARGENTINA!</div>
                ) : (
                  <div className="font-display text-2xl sm:text-3xl mt-2">CAMPEÓN: {getTeamById(state.champion ?? "")?.name ?? "—"}</div>
                )}
                <div className="text-sm text-muted-foreground mt-3">{state.userEliminated ? `Tu camino terminó en ${COPA_ROUND_LABEL[state.rounds["32avos"].find(m => m.home === teamId || m.away === teamId)?.round ?? "32avos"]}.` : "Levantaste el trofeo y quedaste inscripto en la historia del certamen."}</div>
                <div className="grid sm:grid-cols-2 gap-3 mt-5 max-w-xl mx-auto text-left">
                  <div className="copa-award-card"><span>🌎</span><div><strong>Libertadores</strong><small>Plaza continental del año siguiente.</small></div></div>
                  <div className="copa-award-card"><span>🏆</span><div><strong>Supercopa Argentina</strong><small>Desafío ante el ganador del Trofeo de Campeones.</small></div></div>
                </div>
              </div>
            ) : nextMatch && home && away ? (
              <div className="copa-next hud-panel p-5">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div><div className="copa-eyebrow">TU PRÓXIMO PARTIDO</div><div className="font-display text-2xl mt-1">{COPA_ROUND_LABEL[nextMatch.round]}</div></div>
                  <button onClick={() => setPlaying(true)} className="copa-play-btn">JUGAR <span>▶</span></button>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <CopaTeamCard team={home} align="right" />
                  <div className="copa-vs">VS</div>
                  <CopaTeamCard team={away} align="left" />
                </div>
                <div className="mt-4 text-center text-[11px] uppercase tracking-[.2em] text-white/40">Cancha neutral · sin ventaja de localía · penales si termina empatado</div>
              </div>
            ) : (
              <div className="hud-panel p-6 text-center text-muted-foreground">
                La ronda está esperando resultados.
                <button
                  onClick={() => setState(s => s ? simulateCopaRoundExceptUser(s, COPA_ROUND_ORDER.find(r => s.rounds[r].some(m => !m.played)) ?? "32avos") : s)}
                  className="block mx-auto mt-3 text-xs text-celeste hover:underline"
                >
                  Simular partidos restantes
                </button>
              </div>
            )}

            <BracketView state={state} />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="hud-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div><div className="font-display text-lg">TU CLUB</div><div className="text-[10px] text-muted-foreground">Fase final · 2026</div></div>
                <button onClick={() => navigate({ to: "/copa-argentina" })} className="text-[10px] text-celeste underline">CAMBIAR</button>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-celeste/25 bg-celeste/5 p-3">
                {selectedTeam && <Shield team={selectedTeam} size={52} />}
                <div className="min-w-0"><div className="font-display truncate">{selectedTeam?.name}</div><div className="text-[10px] text-muted-foreground">{selectedTeam?.city}</div></div>
              </div>
            </div>

            <div className="hud-panel p-4">
              <div className="font-display text-lg mb-3">GRILLA OFICIAL · 64</div>
              <div className="space-y-1.5">
                {COPA_FINAL_QUOTAS.map(q => {
                  const item = state.qualification.find(x => x.division === q.division);
                  return <div key={q.division} className="flex items-center gap-3 text-xs"><span className="w-5 font-display text-celeste">{q.count}</span><span className="flex-1 truncate">{q.label}</span><span className="text-white/40">{item?.entrants ?? 0} cargados</span></div>;
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-xs"><span className="text-muted-foreground">Participantes finales</span><span className="font-display">{participantCount}/{COPA_FINAL_TEAM_COUNT}</span></div>
            </div>

            <div className="hud-panel p-4">
              <div className="font-display text-lg mb-3">CAMINO AL TÍTULO</div>
              <div className="space-y-2">
                {COPA_ROUND_ORDER.map((round, i) => {
                  const done = currentRoundIndex > i || finished;
                  const active = currentRoundIndex === i && !finished;
                  return <div key={round} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${active ? "bg-celeste/10 border border-celeste/30" : "bg-white/[.025]"}`}><span className={`grid w-6 h-6 place-items-center rounded-full text-[10px] font-display ${done ? "bg-celeste text-primary-foreground" : "border border-white/15 text-white/40"}`}>{done ? "✓" : i + 1}</span><span className={`text-xs ${active ? "text-celeste" : "text-white/60"}`}>{COPA_ROUND_LABEL[round]}</span></div>;
                })}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function CopaTeamSelector({ season, difficulty, onSelect }: { season: number; difficulty: Difficulty; onSelect: (id: string) => void }) {
  const [division, setDivision] = useState<DivisionId>("primera_division");
  const teams = useMemo(() => getTeamsByDivision(division).filter(t => isCopaEligibleTeam(t.id)), [division]);
  return (
    <div className="min-h-screen flex flex-col copa-page">
      <Nav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6">
        <section className="copa-selection-hero hud-panel p-6 sm:p-8 mb-4">
          <div className="copa-eyebrow">MODO COPA · EDICIÓN 2026</div>
          <div className="font-display text-4xl sm:text-6xl mt-2">ELEGÍ TU CLUB</div>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">Podés jugar la Copa Argentina por fuera de Carrera. Elegís un club habilitado, arrancás su cuadro y el gameplay es el mismo motor de partido de Primera Heads.</p>
          <div className="flex flex-wrap gap-2 mt-5">
            {SELECTABLE_DIVISIONS.map(d => <button key={d} onClick={() => setDivision(d)} className={`px-3 py-2 rounded-lg text-xs font-display border ${division === d ? "bg-celeste text-primary-foreground border-celeste" : "border-white/10 text-white/60 hover:text-white"}`}>{d === "primera_division" ? "PRIMERA" : d === "primera_nacional" ? "NACIONAL" : d === "primera_b" ? "B METRO" : d === "primera_c" ? "PRIMERA C" : "FEDERAL A"}</button>)}
          </div>
        </section>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
          {teams.map(team => (
            <button key={team.id} onClick={() => onSelect(team.id)} className="group text-left rounded-xl border border-white/10 bg-card/50 hover:bg-celeste/8 hover:border-celeste/40 p-3 transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-center h-20"><Shield team={team} size={58} /></div>
              <div className="font-display text-sm truncate mt-2">{team.short}</div>
              <div className="text-[10px] text-muted-foreground truncate">{team.name}</div>
            </button>
          ))}
        </div>
        <div className="mt-5 text-center text-[10px] text-muted-foreground tracking-[.18em] uppercase">Primera División 30 · Federal A 10 · Primera Nacional 15 · B Metropolitana 5 · Primera C 4</div>
      </main>
    </div>
  );
}

function CopaTeamCard({ team, align }: { team: NonNullable<ReturnType<typeof getTeamById>>; align: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-3 min-w-0 ${align === "right" ? "justify-end text-right" : ""}`}>
      <div className="min-w-0"><div className="font-display text-lg sm:text-2xl truncate">{team.short}</div><div className="text-[10px] text-muted-foreground truncate">{team.name}</div></div>
      <Shield team={team} size={68} />
    </div>
  );
}

function BracketView({ state }: { state: CopaState }) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
      {COPA_ROUND_ORDER.map(round => {
        const matches = state.rounds[round];
        if (!matches?.length) return null;
        return (
          <div key={round} className="hud-panel p-3">
            <div className="flex items-center justify-between mb-2"><div className="font-display text-sm text-celeste tracking-wider">{COPA_ROUND_LABEL[round]}</div><span className="text-[9px] text-white/35">{matches.length * 2} CLUBES</span></div>
            <div className="space-y-1.5">
              {matches.map(m => {
                const h = getTeamById(m.home); const a = getTeamById(m.away);
                const mine = m.home === state.userTeamId || m.away === state.userTeamId;
                return <div key={m.id} className={`text-[11px] rounded-lg px-2.5 py-2 flex items-center justify-between gap-2 ${mine ? "bg-celeste/10 border border-celeste/35" : "bg-card/40 border border-border/30"}`}><span className="truncate"><span className="font-semibold">{h?.short ?? "?"}</span> <span className="text-white/25">vs</span> <span className="font-semibold">{a?.short ?? "?"}</span></span><span className="font-display tabular-nums shrink-0">{m.played ? `${m.homeGoals}-${m.awayGoals}${m.wentToPenalties ? " (p)" : ""}` : "—"}</span></div>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
