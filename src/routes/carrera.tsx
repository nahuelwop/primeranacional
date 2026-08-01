import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS, TEAMS_BY_ID, type Team } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { useAuth } from "@/lib/auth";
import { Game, type MatchStats } from "@/components/Game";
import {
  buildSeason, simulateRoundExceptUser, recordUserMatch, nextPendingMatchForUser,
  isSeasonFinished, seasonChampion, budgetReward, type CareerState,
  STADIUM_UPGRADE_CATALOG, CORRUPTION_CATALOG,
  buyUpgrade, activateCorruption, tickCorruption, currentCorruptionEffects, incomeMultiplier,
  OBJETIVO_LABEL, type Objetivo, clubIndicators, currentRound, totalRounds,
} from "@/lib/career";
import { sortStandings, type Match, type StandingRow } from "@/lib/tournament";
import { ACHIEVEMENTS } from "@/lib/achievements";
import {
  fetchCareer, upsertCareer, deleteCareer,
  fetchAchievements, unlockAchievement, recordMatchHistory,
} from "@/lib/career-api";
import { SeasonIntro } from "@/components/SeasonIntro";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { useGameSettings } from "@/lib/game-settings";
import { DIFFICULTY_INFO, toGameAi } from "@/lib/difficulty";

export const Route = createFileRoute("/carrera")({
  head: () => ({
    meta: [
      { title: "Modo Carrera · Primera Heads" },
      { name: "description", content: "Dirigí tu club en la Primera Nacional: temporadas, calendario, tabla, economía y oficina del club." },
      { property: "og:title", content: "Modo Carrera · Primera Heads" },
      { property: "og:description", content: "Dirigí tu club en la Primera Nacional: temporadas, calendario, tabla, economía y oficina del club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CarreraPage,
});

type TopTab = "inicio" | "calendario" | "competicion" | "club" | "oficina";

const TOP_TABS: { k: TopTab; label: string; icon: string }[] = [
  { k: "inicio", label: "Inicio", icon: "🏠" },
  { k: "calendario", label: "Calendario", icon: "🗓️" },
  { k: "competicion", label: "Competición", icon: "🏆" },
  { k: "club", label: "Club", icon: "🛡️" },
  { k: "oficina", label: "Oficina", icon: "💼" },
];

function CarreraPage() {
  useTeamsSync();
  const { user, loading } = useAuth();
  const { settings } = useGameSettings();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [season, setSeason] = useState(1);
  const [budget, setBudget] = useState(1000);
  const [state, setState] = useState<CareerState | null>(null);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [recentAch, setRecentAch] = useState<string[]>([]);
  const [tab, setTab] = useState<TopTab>("inicio");

  useEffect(() => {
    if (loading) return;
    if (!user) { setBusy(false); return; }
    (async () => {
      try {
        const [save, ach] = await Promise.all([fetchCareer(user.id), fetchAchievements(user.id)]);
        if (save) {
          setTeamId(save.team_id);
          setSeason(save.season);
          setBudget(save.budget);
          setState(save.state as CareerState);
        }
        setUnlocked(new Set(ach.map(a => a.key)));
      } finally { setBusy(false); }
    })();
  }, [user, loading]);

  async function tryUnlock(key: string) {
    if (!user || unlocked.has(key)) return;
    const ok = await unlockAchievement(user.id, key).catch(() => false);
    if (ok) {
      setUnlocked(prev => new Set(prev).add(key));
      setRecentAch(prev => [...prev, key]);
      setTimeout(() => setRecentAch(prev => prev.filter(k => k !== key)), 5000);
    }
  }

  async function startCareer(tid: string) {
    if (!user) return;
    const s = buildSeason(tid);
    setTeamId(tid); setSeason(1); setBudget(1000); setState(s);
    await upsertCareer({ user_id: user.id, team_id: tid, season: 1, budget: 1000, fixture_index: 0, state: s });
  }

  async function abandon() {
    if (!user) return;
    if (!confirm("¿Seguro que querés abandonar la carrera? Se pierde todo el progreso.")) return;
    await deleteCareer(user.id);
    setTeamId(null); setState(null); setSeason(1); setBudget(1000); setTab("inicio");
  }

  async function persist(next: CareerState, nextBudget = budget, nextSeason = season) {
    if (!user || !teamId) return;
    await upsertCareer({ user_id: user.id, team_id: teamId, season: nextSeason, budget: nextBudget, fixture_index: 0, state: next });
  }

  const nextMatch = useMemo(() => state && teamId ? nextPendingMatchForUser(state, teamId) : null, [state, teamId]);
  const team = teamId ? TEAMS_BY_ID[teamId] : undefined;

  async function onMatchEnd(lg: number, rg: number, _stats: MatchStats) {
    if (!state || !teamId || !user || !nextMatch) return;
    const userIsHome = nextMatch.home === teamId;
    const hg = userIsHome ? lg : rg;
    const ag = userIsHome ? rg : lg;
    await recordMatchHistory({ userId: user.id, home: nextMatch.home, away: nextMatch.away, hg, ag, mode: "carrera" }).catch(() => {});
    let next = recordUserMatch(state, nextMatch.id, hg, ag, teamId);
    next = simulateRoundExceptUser(next, nextMatch.round, teamId);
    const mg = userIsHome ? hg : ag;
    const og = userIsHome ? ag : hg;
    const reward = Math.round(budgetReward(mg, og) * incomeMultiplier(next));
    next = tickCorruption(next);
    const nextBudget = budget + reward;
    setBudget(nextBudget); setState(next);
    setPlaying(false);
    if (next.totalGoalsScored >= 100) await tryUnlock("100_goles");
    if (next.bestUnbeaten >= 10) await tryUnlock("10_invicto");
    if (isSeasonFinished(next)) {
      const champ = seasonChampion(next);
      if (champ === teamId) await tryUnlock(next.zone === "A" ? "campeon_zona_a" : "campeon_zona_b");
    }
    await persist(next, nextBudget, season);
  }

  async function onBuyUpgrade(key: typeof STADIUM_UPGRADE_CATALOG[number]["key"]) {
    if (!state) return;
    const r = buyUpgrade(state, budget, key);
    if (!r.ok) { alert(r.error); return; }
    setState(r.state); setBudget(r.budget);
    await persist(r.state, r.budget, season);
  }

  async function onActivateCorruption(kind: typeof CORRUPTION_CATALOG[number]["kind"]) {
    if (!state) return;
    const opt = CORRUPTION_CATALOG.find(o => o.kind === kind)!;
    if (!confirm(`¿Activar "${opt.name}"?\n${opt.desc}\nCosto: $${opt.cost} · Penalidad ingresos: -${opt.penaltyPct}% por ${opt.matches} fechas.`)) return;
    const r = activateCorruption(state, budget, kind);
    if (!r.ok) { alert(r.error); return; }
    setState(r.state); setBudget(r.budget);
    await persist(r.state, r.budget, season);
  }

  async function advanceSeason() {
    if (!state || !teamId || !user) return;
    const fresh = buildSeason(teamId);
    fresh.totalGoalsScored = state.totalGoalsScored;
    fresh.bestUnbeaten = state.bestUnbeaten;
    fresh.streakUnbeaten = 0;
    fresh.zoneChampions = [...state.zoneChampions];
    fresh.difficulty = state.difficulty;
    fresh.objetivo = state.objetivo;
    fresh.introVista = false;
    const champ = seasonChampion(state);
    if (champ) fresh.zoneChampions.push({ season, zone: state.zone, teamId: champ });
    const nextSeason = season + 1;
    setSeason(nextSeason); setState(fresh);
    setTab("inicio");
    await persist(fresh, budget, nextSeason);
  }

  if (loading || busy) {
    return <Shell><div className="p-16 text-center text-muted-foreground font-display tracking-widest">CARGANDO…</div></Shell>;
  }

  if (!user) {
    return (
      <Shell>
        <div className="max-w-md mx-auto mt-16 hud-panel p-8 text-center">
          <h1 className="font-display text-4xl mb-3">MODO CARRERA</h1>
          <p className="text-muted-foreground mb-5">Iniciá sesión para guardar tu progreso y desbloquear logros.</p>
          <Link to="/auth" className="inline-block px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider">Iniciar sesión</Link>
        </div>
      </Shell>
    );
  }

  if (state && teamId && !state.difficulty) {
    return (
      <Shell>
        <DifficultyPicker onPick={async (d) => {
          const next = { ...state, difficulty: d, objetivo: state.objetivo ?? "ascenso_directo" as Objetivo };
          setState(next);
          await persist(next);
        }} />
      </Shell>
    );
  }

  if (state && teamId && state.difficulty && !state.introVista) {
    return (
      <Shell>
        <SeasonIntro season={season} teamId={teamId}
          objetivo={OBJETIVO_LABEL[state.objetivo ?? "ascenso_directo"]}
          videoUrl={settings.intro_video_url}
          onDone={async () => {
            const next = { ...state, introVista: true };
            setState(next);
            await persist(next);
          }} />
      </Shell>
    );
  }

  if (playing && state && team && nextMatch && teamId) {
    const userIsHome = nextMatch.home === teamId;
    const leftTeam = TEAMS_BY_ID[teamId];
    const rightTeam = userIsHome ? TEAMS_BY_ID[nextMatch.away] : TEAMS_BY_ID[nextMatch.home];
    const fx = currentCorruptionEffects(state);
    return (
      <Shell>
        <div className="text-center text-sm text-muted-foreground mb-2">
          Temporada {season} · Fecha {nextMatch.round} · {userIsHome ? "Local" : "Visitante"}
          {state.difficulty && <span className="ml-2 text-celeste">· {DIFFICULTY_INFO[state.difficulty].emoji} {DIFFICULTY_INFO[state.difficulty].label}</span>}
        </div>
        <Game home={leftTeam} away={rightTeam} duration={60} mode="1vAI" sharedNarrator
          aiDifficulty={toGameAi(state.difficulty ?? "normal")}
          startingScore={fx.startingScore}
          cancelOpponentGoals={fx.cancelOpponentGoals ?? 0}
          doubleGoalChance={fx.doubleGoalChance ?? 0}
          onEnd={onMatchEnd} />
      </Shell>
    );
  }

  if (!state || !teamId) {
    return (
      <Shell>
        <div className="hud-panel p-6">
          <h1 className="font-display text-5xl">MODO CARRERA</h1>
          <p className="text-muted-foreground text-sm mt-1">Elegí el club que vas a dirigir. Tu progreso queda guardado.</p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {TEAMS.map(t => (
              <button key={t.id} onClick={() => startCareer(t.id)}
                className="p-3 rounded-xl border border-border bg-card/60 hover:bg-secondary hover:scale-[1.03] transition text-left">
                <Shield team={t} size={48} />
                <div className="text-xs mt-2 font-display truncate">{t.short}</div>
                <div className="text-[10px] text-muted-foreground">Zona {t.zone}</div>
              </button>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  const standings = sortStandings(state.standings);
  const myPos = standings.findIndex(r => r.teamId === teamId) + 1;
  const indicators = clubIndicators(state, budget, teamId);
  const round = currentRound(state);
  const rounds = totalRounds(state);

  return (
    <Shell>
      {/* Barra superior del club */}
      <div className="hud-panel-accent px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {team && <div className="shrink-0"><Shield team={team} size={54} /></div>}
          <div className="min-w-0">
            <div className="font-display text-2xl truncate leading-none">{team?.name}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">
              Zona {state.zone} · Temporada {season} · Fecha {Math.min(round, rounds)}/{rounds} · {myPos}° puesto
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Presupuesto</div>
            <div className="font-display text-2xl text-celeste leading-none">${budget}</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Objetivo</div>
            <div className="font-display text-sm leading-tight max-w-[150px]">{OBJETIVO_LABEL[state.objetivo ?? "ascenso_directo"]}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {TOP_TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-xl font-display text-sm tracking-widest whitespace-nowrap transition ${
              tab === t.k ? "hud-tab-active" : "bg-card/50 border border-border text-muted-foreground hover:text-foreground"
            }`}>
            <span className="mr-1.5">{t.icon}</span>{t.label.toUpperCase()}
          </button>
        ))}
      </nav>

      {recentAch.length > 0 && (
        <div className="mt-3 rounded-xl bg-celeste/10 border border-celeste/40 p-3 animate-fade-in">
          {recentAch.map(k => {
            const a = ACHIEVEMENTS.find(x => x.key === k);
            return <div key={k} className="text-sm">🎉 ¡Logro desbloqueado! <strong>{a?.icon} {a?.name}</strong></div>;
          })}
        </div>
      )}

      <div className="mt-3">
        {tab === "inicio" && (
          <InicioTab
            state={state} teamId={teamId} season={season} nextMatch={nextMatch}
            indicators={indicators} standings={standings}
            onPlay={() => setPlaying(true)} onAdvance={advanceSeason} onGo={setTab}
          />
        )}
        {tab === "calendario" && <CalendarioTab state={state} teamId={teamId} />}
        {tab === "competicion" && <CompeticionTab state={state} teamId={teamId} />}
        {tab === "club" && (
          <ClubTab state={state} teamId={teamId} budget={budget} unlocked={unlocked.size} onBuy={onBuyUpgrade} />
        )}
        {tab === "oficina" && (
          <OficinaTab state={state} budget={budget} onActivate={onActivateCorruption} onAbandon={abandon} />
        )}
      </div>
    </Shell>
  );
}

/* ============================ INICIO ============================ */

function InicioTab({ state, teamId, season, nextMatch, indicators, standings, onPlay, onAdvance, onGo }: {
  state: CareerState; teamId: string; season: number; nextMatch: Match | null;
  indicators: ReturnType<typeof clubIndicators>; standings: StandingRow[];
  onPlay: () => void; onAdvance: () => void; onGo: (t: TopTab) => void;
}) {
  const rival = nextMatch ? (nextMatch.home === teamId ? nextMatch.away : nextMatch.home) : null;
  const rivalTeam = rival ? TEAMS_BY_ID[rival] : undefined;
  const myTeam = TEAMS_BY_ID[teamId];
  const flags = [...(myTeam?.flagUrls ?? []), ...(rivalTeam?.flagUrls ?? [])].slice(0, 6);
  const lastResults = state.matches
    .filter(m => m.played && (m.home === teamId || m.away === teamId))
    .slice(-5).reverse();

  return (
    <div className="grid lg:grid-cols-[200px_minmax(0,1fr)_300px] gap-3">
      {/* Menú lateral simplificado */}
      <aside className="hud-panel p-3 space-y-1.5 order-2 lg:order-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 pb-1">Accesos</div>
        {[
          { k: "calendario" as TopTab, icon: "🗓️", label: "Calendario" },
          { k: "competicion" as TopTab, icon: "🏆", label: "Tabla de zonas" },
          { k: "club" as TopTab, icon: "🏟️", label: "Estadio y plantel" },
          { k: "oficina" as TopTab, icon: "💼", label: "Oficina" },
        ].map(i => (
          <button key={i.k} onClick={() => onGo(i.k)}
            className="w-full text-left px-3 py-2.5 rounded-lg bg-card/50 hover:bg-secondary border border-border/50 transition font-display text-sm tracking-wide">
            <span className="mr-2">{i.icon}</span>{i.label}
          </button>
        ))}
        <Link to="/equipos/$id" params={{ id: teamId }}
          className="block px-3 py-2.5 rounded-lg bg-card/50 hover:bg-secondary border border-border/50 transition font-display text-sm tracking-wide">
          <span className="mr-2">📋</span>Ficha del club
        </Link>
        <Link to="/logros"
          className="block px-3 py-2.5 rounded-lg bg-card/50 hover:bg-secondary border border-border/50 transition font-display text-sm tracking-wide">
          <span className="mr-2">🏅</span>Logros
        </Link>
      </aside>

      {/* Panel central */}
      <section className="space-y-3 order-1 lg:order-2">
        <div className="hud-panel p-5">
          {nextMatch ? (
            <>
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-widest text-celeste">Próximo partido</div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Fecha {nextMatch.round} · {nextMatch.home === teamId ? "Local" : "Visitante"}
                  {nextMatch.isClasico && <span className="ml-2 text-accent">🔥 Clásico</span>}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <TeamBig team={TEAMS_BY_ID[nextMatch.home]} />
                <div className="text-center">
                  <div className="font-display text-4xl text-muted-foreground">VS</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Temporada {season}</div>
                </div>
                <TeamBig team={TEAMS_BY_ID[nextMatch.away]} />
              </div>
              <button onClick={onPlay}
                className="mt-6 w-full py-4 rounded-xl bg-celeste text-primary-foreground font-display text-xl tracking-[0.3em] glow-celeste hover:scale-[1.01] transition">
                JUGAR PARTIDO
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-[11px] uppercase tracking-widest text-celeste">Temporada terminada</div>
              <div className="font-display text-3xl mt-2">
                Campeón Zona {state.zone}: {TEAMS_BY_ID[seasonChampion(state) ?? ""]?.short ?? "—"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Terminaste {standings.findIndex(r => r.teamId === teamId) + 1}° en la tabla.</div>
              <button onClick={onAdvance}
                className="mt-5 px-8 py-3 rounded-xl bg-celeste text-primary-foreground font-display text-lg tracking-[0.2em]">
                NUEVA TEMPORADA
              </button>
            </div>
          )}
        </div>

        {/* Indicadores del club */}
        <div className="hud-panel p-4">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Estado del club</div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {indicators.map(ind => (
              <div key={ind.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-display tracking-wide">{ind.icon} {ind.label}</span>
                  <span className="text-muted-foreground tabular-nums">{ind.value}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-celeste transition-all" style={{ width: `${ind.value}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{ind.hint}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* La previa */}
      <aside className="hud-panel p-4 order-3 space-y-3">
        <div className="text-[11px] uppercase tracking-widest text-celeste">La previa</div>
        {flags.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {flags.map((url, i) => (
              <img key={url + i} src={url} alt="Bandera de la hinchada" loading="lazy"
                className="h-20 w-full object-cover rounded-lg border border-border" />
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3">
            Todavía no hay banderas cargadas para estos clubes. El admin puede subirlas desde el panel de equipos.
          </div>
        )}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Últimos resultados</div>
          <div className="space-y-1">
            {lastResults.length === 0 && <div className="text-xs text-muted-foreground">Sin partidos jugados aún.</div>}
            {lastResults.map(m => (
              <div key={m.id} className="flex items-center justify-between text-xs bg-card/50 rounded-lg px-2 py-1.5 border border-border/50">
                <span className="truncate">{TEAMS_BY_ID[m.home]?.short} vs {TEAMS_BY_ID[m.away]?.short}</span>
                <span className="font-display tabular-nums">{m.homeGoals}-{m.awayGoals}</span>
              </div>
            ))}
          </div>
        </div>
        {rivalTeam && (
          <div className="text-xs text-muted-foreground border-t border-border pt-2">
            <span className="text-foreground font-display">{rivalTeam.name}</span> te espera en {rivalTeam.city}.
          </div>
        )}
      </aside>
    </div>
  );
}

function TeamBig({ team }: { team?: Team }) {
  if (!team) return <div />;
  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      <Shield team={team} size={72} />
      <div className="font-display text-lg text-center truncate w-full">{team.short}</div>
    </div>
  );
}

/* ============================ CALENDARIO ============================ */

function CalendarioTab({ state, teamId }: { state: CareerState; teamId: string }) {
  const byRound = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of state.matches) {
      if (!map.has(m.round)) map.set(m.round, []);
      map.get(m.round)!.push(m);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [state.matches]);

  return (
    <div className="hud-panel p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Calendario · Zona {state.zone}</div>
      <div className="grid md:grid-cols-2 gap-3">
        {byRound.map(([round, ms]) => (
          <div key={round} className="rounded-xl border border-border/60 bg-card/40 p-3">
            <div className="font-display text-sm tracking-widest text-celeste mb-2">FECHA {round}</div>
            <div className="space-y-1">
              {ms.map(m => {
                const mine = m.home === teamId || m.away === teamId;
                return (
                  <div key={m.id} className={`flex items-center justify-between text-xs rounded-lg px-2 py-1.5 ${mine ? "bg-celeste/15 border border-celeste/40" : ""}`}>
                    <span className="truncate">{TEAMS_BY_ID[m.home]?.short} <span className="text-muted-foreground">vs</span> {TEAMS_BY_ID[m.away]?.short}</span>
                    <span className="font-display tabular-nums ml-2 shrink-0">
                      {m.played ? `${m.homeGoals}-${m.awayGoals}` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ COMPETICIÓN ============================ */

function CompeticionTab({ state, teamId }: { state: CareerState; teamId: string }) {
  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <TablaZona title={`Zona ${state.zone}`} rows={sortStandings(state.standings)} highlight={teamId} />
      {state.otherStandings && state.otherStandings.length > 0 && (
        <TablaZona title={`Zona ${state.zone === "A" ? "B" : "A"} (simulada)`} rows={sortStandings(state.otherStandings)} />
      )}
    </div>
  );
}

function TablaZona({ title, rows, highlight }: { title: string; rows: StandingRow[]; highlight?: string }) {
  return (
    <div className="hud-panel overflow-hidden">
      <div className="px-4 py-2.5 font-display text-sm uppercase tracking-widest text-celeste border-b border-border">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] text-muted-foreground uppercase">
            <tr>
              <th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Equipo</th>
              <th className="px-2 py-2">PJ</th><th className="px-2 py-2">PG</th><th className="px-2 py-2">PE</th>
              <th className="px-2 py-2">PP</th><th className="px-2 py-2">DG</th><th className="px-2 py-2">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const t = TEAMS_BY_ID[r.teamId];
              const mine = r.teamId === highlight;
              return (
                <tr key={r.teamId} className={`border-t border-border/60 ${mine ? "bg-celeste/15" : ""} ${i === 0 ? "text-accent" : ""}`}>
                  <td className="px-3 py-1.5 tabular-nums">{i + 1}</td>
                  <td className="px-3 py-1.5 flex items-center gap-2 min-w-0"><Shield team={t} size={20} /> <span className="truncate">{t?.short}</span></td>
                  <td className="text-center tabular-nums">{r.pj}</td>
                  <td className="text-center tabular-nums">{r.pg}</td>
                  <td className="text-center tabular-nums">{r.pe}</td>
                  <td className="text-center tabular-nums">{r.pp}</td>
                  <td className="text-center tabular-nums">{r.dg}</td>
                  <td className="text-center tabular-nums font-display">{r.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================ CLUB ============================ */

function ClubTab({ state, teamId, budget, unlocked, onBuy }: {
  state: CareerState; teamId: string; budget: number; unlocked: number;
  onBuy: (k: typeof STADIUM_UPGRADE_CATALOG[number]["key"]) => void;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <div className="hud-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-lg tracking-wide">🏟️ Mejoras del estadio</div>
          <div className="text-xs text-muted-foreground">Ingresos ×{incomeMultiplier(state).toFixed(2)}</div>
        </div>
        <div className="space-y-2">
          {STADIUM_UPGRADE_CATALOG.map(opt => {
            const owned = state.stadiumUpgrades?.[opt.key];
            return (
              <div key={opt.key} className="flex items-center gap-2 border border-border/60 rounded-xl p-2.5 bg-card/40">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-display">{opt.name}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
                {owned ? (
                  <span className="text-xs px-2 py-1 rounded bg-celeste/20 text-celeste font-display shrink-0">ACTIVA</span>
                ) : (
                  <button onClick={() => onBuy(opt.key)} disabled={budget < opt.cost}
                    className="text-xs px-3 py-1.5 rounded bg-celeste text-primary-foreground font-display disabled:opacity-40 shrink-0">
                    ${opt.cost}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hud-panel p-4 space-y-3">
        <div className="font-display text-lg tracking-wide">📊 Historial del club</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Goles totales" value={state.totalGoalsScored} />
          <Stat label="Mejor invicto" value={state.bestUnbeaten} />
          <Stat label="Logros" value={`${unlocked}/${ACHIEVEMENTS.length}`} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Títulos de zona</div>
          {state.zoneChampions.length === 0 ? (
            <div className="text-xs text-muted-foreground">Todavía sin campeonatos.</div>
          ) : (
            <div className="space-y-1">
              {state.zoneChampions.map((z, i) => (
                <div key={i} className="text-xs bg-card/50 rounded-lg px-2 py-1.5 border border-border/50">
                  T{z.season} · Zona {z.zone} · <span className="font-display">{TEAMS_BY_ID[z.teamId]?.short}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <Link to="/equipos/$id" params={{ id: teamId }}
          className="inline-block text-sm text-celeste underline">Ver ficha, plantel y estadio →</Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-card/50 border border-border/60 p-3">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="font-display text-2xl">{value}</div>
    </div>
  );
}

/* ============================ OFICINA ============================ */

function OficinaTab({ state, budget, onActivate, onAbandon }: {
  state: CareerState; budget: number;
  onActivate: (k: typeof CORRUPTION_CATALOG[number]["kind"]) => void;
  onAbandon: () => void;
}) {
  const active = state.activeCorruption && state.activeCorruption.matchesLeft > 0 ? state.activeCorruption : null;
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-3">
      <div className="hud-panel p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="font-display text-lg tracking-wide">💼 Coimas & arreglos</div>
          {active ? (
            <div className="text-xs text-accent">
              Activo: {CORRUPTION_CATALOG.find(o => o.kind === active.kind)?.name} · {active.matchesLeft} fechas
            </div>
          ) : <div className="text-xs text-muted-foreground">Ninguno activo</div>}
        </div>
        <div className="space-y-2">
          {CORRUPTION_CATALOG.map(opt => (
            <div key={opt.kind} className="flex items-center gap-2 border border-border/60 rounded-xl p-2.5 bg-card/40">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-display">
                  {opt.name} <span className="text-xs text-muted-foreground">· {opt.matches} fechas · -{opt.penaltyPct}% ingresos</span>
                </div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </div>
              <button onClick={() => onActivate(opt.kind)}
                disabled={budget < opt.cost || !!active}
                className="text-xs px-3 py-1.5 rounded bg-accent text-accent-foreground font-display disabled:opacity-40 shrink-0">
                {opt.cost > 0 ? `$${opt.cost}` : "GRATIS"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="hud-panel p-4 space-y-3">
        <div className="font-display text-lg tracking-wide">💰 Finanzas</div>
        <div className="text-sm">Caja: <span className="font-display text-celeste text-xl">${budget}</span></div>
        <div className="text-xs text-muted-foreground">Multiplicador de ingresos: ×{incomeMultiplier(state).toFixed(2)}</div>
        {state.incomePenalty && (
          <div className="text-xs text-destructive">Penalidad -{state.incomePenalty.pct}% por {state.incomePenalty.matchesLeft} fechas.</div>
        )}
        <button onClick={onAbandon}
          className="w-full mt-2 text-xs text-destructive border border-destructive/50 rounded-lg py-2 hover:bg-destructive/10 transition">
          Abandonar carrera
        </button>
      </div>
    </div>
  );
}

/* ============================ SHELL ============================ */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col hud-shell">
      <Nav />
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 py-5">{children}</main>
    </div>
  );
}
