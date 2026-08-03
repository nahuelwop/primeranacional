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
import { sortStandings, simulateMatch, type Match, type StandingRow } from "@/lib/tournament";
import stadiumBg from "@/assets/stadium-night.jpg";
import { ACHIEVEMENTS } from "@/lib/achievements";
import {
  fetchCareer, upsertCareer, deleteCareer,
  fetchAchievements, unlockAchievement, recordMatchHistory,
} from "@/lib/career-api";
import { SeasonIntro } from "@/components/SeasonIntro";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { useGameSettings } from "@/lib/game-settings";
import { DIFFICULTY_INFO, toGameAi } from "@/lib/difficulty";
import { AmbientStadium } from "@/components/career/AmbientStadium";
import { useUiSfx } from "@/lib/ui-sound";
import { CountUp } from "@/lib/use-count-up";

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

type TopTab = "inicio" | "calendario" | "competicion" | "club" | "oficina" | "personalizar";

const TOP_TABS: { k: TopTab; label: string }[] = [
  { k: "inicio", label: "Inicio" },
  { k: "calendario", label: "Calendario" },
  { k: "competicion", label: "Competición" },
  { k: "club", label: "Club" },
  { k: "oficina", label: "Oficina" },
  { k: "personalizar", label: "Personalizar" },
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
  useUiSfx();

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

  async function onSimulateMatch() {
    if (!state || !teamId || !nextMatch) return;
    const { hg, ag } = simulateMatch(nextMatch.home, nextMatch.away);
    await onMatchEnd(nextMatch.home === teamId ? hg : ag, nextMatch.home === teamId ? ag : hg, {} as MatchStats);
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

  const overall = Math.round(indicators.reduce((s, i) => s + i.value, 0) / Math.max(1, indicators.length));

  return (
    <Shell hideNav>
      {/* Barra superior tipo consola */}
      <header className="hud-in grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-border/50 pb-0 mb-4">
        <Link to="/" className="flex items-center gap-2.5 pb-3 min-w-0">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card font-display text-sm">PN</span>
          <span className="hidden sm:block leading-none">
            <span className="block font-display text-sm tracking-widest">PRIMERA</span>
            <span className="block font-display text-sm tracking-widest text-muted-foreground">NACIONAL</span>
          </span>
        </Link>

        <nav className="flex items-center justify-center gap-5 sm:gap-8 overflow-x-auto">
          {TOP_TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} data-active={tab === t.k}
              className="hud-navlink whitespace-nowrap text-sm">
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 pb-3 shrink-0">
          <div className="text-right hidden sm:block leading-tight">
            <div className="font-display text-sm tracking-wide truncate max-w-[170px]">{team?.name?.toUpperCase()}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">DT · Modo Carrera</div>
          </div>
          {team && <Shield team={team} size={38} />}
          <span className="grid h-8 w-8 place-items-center rounded-full border border-hud-green/60 text-hud-green font-display text-sm">{overall}</span>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>Zona {state.zone}</span>
        <span>Temporada {season}</span>
        <span>Fecha {Math.min(round, rounds)}/{rounds}</span>
        <span>{myPos}° puesto</span>
        <span className="text-hud-green">Objetivo: {OBJETIVO_LABEL[state.objetivo ?? "ascenso_directo"]}</span>
      </div>

      {recentAch.length > 0 && (
        <div className="mt-3 rounded-xl bg-celeste/10 border border-celeste/40 p-3 animate-fade-in">
          {recentAch.map(k => {
            const a = ACHIEVEMENTS.find(x => x.key === k);
            return <div key={k} className="text-sm">🎉 ¡Logro desbloqueado! <strong>{a?.icon} {a?.name}</strong></div>;
          })}
        </div>
      )}

      <div key={tab} className="mt-3 hud-tab-enter">
        {tab === "inicio" && (
          <InicioTab
            state={state} teamId={teamId} season={season} nextMatch={nextMatch}
            indicators={indicators} standings={standings} budget={budget}
            onPlay={() => setPlaying(true)} onSimulate={onSimulateMatch}
            onAdvance={advanceSeason} onGo={setTab}
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
        {tab === "personalizar" && <PersonalizarTab teamId={teamId} />}
      </div>
    </Shell>
  );
}

/* ============================ INICIO ============================ */

function InicioTab({ state, teamId, season, nextMatch, indicators, standings, budget, onPlay, onSimulate, onAdvance, onGo }: {
  state: CareerState; teamId: string; season: number; nextMatch: Match | null;
  indicators: ReturnType<typeof clubIndicators>; standings: StandingRow[]; budget: number;
  onPlay: () => void; onSimulate: () => void; onAdvance: () => void; onGo: (t: TopTab) => void;
}) {
  const rival = nextMatch ? (nextMatch.home === teamId ? nextMatch.away : nextMatch.home) : null;
  const rivalTeam = rival ? TEAMS_BY_ID[rival] : undefined;
  const myTeam = TEAMS_BY_ID[teamId];
  const isHome = nextMatch ? nextMatch.home === teamId : true;
  const flags = [...(myTeam?.flagUrls ?? []), ...(rivalTeam?.flagUrls ?? [])];
  const flag = flags[0];
  const lastResults = state.matches
    .filter(m => m.played && (m.home === teamId || m.away === teamId))
    .slice(-5).reverse();
  const row = standings.find(r => r.teamId === teamId);
  const pos = standings.findIndex(r => r.teamId === teamId) + 1;
  const gf = row?.gf ?? 0, gc = row?.gc ?? 0;

  const form = lastResults.map(m => {
    const mine = m.home === teamId ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
    const opp = m.home === teamId ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
    return mine > opp ? "V" : mine === opp ? "E" : "D";
  });

  const side = [
    { k: "calendario" as TopTab, icon: "🗓️", title: "Revisar calendario", sub: "Próximos partidos y eventos" },
    { k: "competicion" as TopTab, icon: "📊", title: "Ver tabla", sub: "Posiciones y estadísticas" },
    { k: "competicion" as TopTab, icon: "🛡️", title: "Próximos rivales", sub: "Analizar próximos partidos" },
    { k: "club" as TopTab, icon: "👥", title: "Estado del club", sub: "Moral, economía y afición" },
    { k: "oficina" as TopTab, icon: "🚩", title: "Objetivos", sub: "Metas de la temporada" },
    { k: "calendario" as TopTab, icon: "📅", title: "Calendario completo", sub: "Ver todas las fechas" },
    { k: "personalizar" as TopTab, icon: "📄", title: "Informes", sub: "Noticias y análisis" },
  ];

  const objetivos = [
    { label: "Clasificar al Reducido", done: pos <= 8 },
    { label: "Ganar 6 partidos de local", done: state.matches.filter(m => m.played && m.home === teamId && (m.homeGoals ?? 0) > (m.awayGoals ?? 0)).length >= 6 },
    { label: "Mantener la valla invicta en 6 partidos", done: state.matches.filter(m => m.played && ((m.home === teamId && m.awayGoals === 0) || (m.away === teamId && m.homeGoals === 0))).length >= 6 },
    { label: "Terminar entre los 4 primeros", done: pos > 0 && pos <= 4 },
  ];

  const estado = indicators.filter(i => ["moral", "hinchada", "economia"].includes(i.key));

  return (
    <div className="grid lg:grid-cols-[250px_minmax(0,1fr)_340px] gap-3 items-start">
      {/* Menú lateral */}
      <aside className="space-y-2 order-2 lg:order-1 lg:row-span-2">
        {side.map((i, idx) => (
          <button key={i.title} onClick={() => onGo(i.k)}
            style={{ animationDelay: `${idx * 45}ms` }}
            className={`hud-rise w-full text-left px-4 py-3 flex items-center gap-3 hud-card ${idx === 0 ? "hud-card-active" : ""}`}>
            <span className="text-xl shrink-0">{i.icon}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold truncate">{i.title}</span>
              <span className="block text-[11px] text-muted-foreground truncate">{i.sub}</span>
            </span>
          </button>
        ))}
      </aside>

      {/* Panel central */}
      <section className="order-1 lg:order-2 space-y-3">
        <div className="hud-in relative overflow-hidden rounded-[0.9rem] border border-border/50">
          <img src={stadiumBg} alt="Estadio de noche" width={1280} height={720}
            className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/45 to-background/90" />
          <div className="relative p-5">
            {nextMatch ? (
              <>
                <div className="text-[11px] uppercase tracking-[0.2em] text-hud-green font-semibold">Próximo partido</div>
                <div className="text-center mt-3">
                  <div className="font-display text-3xl tracking-wide">FECHA {nextMatch.round}</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                    Primera Nacional · Zona {state.zone}
                    {nextMatch.isClasico && <span className="ml-2 text-accent">🔥 Clásico</span>}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <TeamBig team={TEAMS_BY_ID[nextMatch.home]} />
                  <div className="font-display text-4xl">VS</div>
                  <TeamBig team={TEAMS_BY_ID[nextMatch.away]} />
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-foreground/90">
                  <span>🗓️ Temporada {season}</span>
                  <span>🕖 19:00 hs</span>
                  <span className="truncate">🏟️ {(isHome ? myTeam : rivalTeam)?.city ?? "Estadio"}</span>
                </div>
                <div className="mt-1 text-right text-[11px] text-muted-foreground">
                  {isHome ? "🏠 LOCAL" : "✈️ VISITANTE"}
                </div>
                <div className="mt-4 grid sm:grid-cols-2 gap-3">
                  <button onClick={onPlay} data-sfx="accept"
                    className="py-4 rounded-xl hud-btn-play font-display text-lg tracking-[0.2em]">
                    ⚽ JUGAR PARTIDO
                  </button>
                  <button onClick={onSimulate}
                    className="py-4 rounded-xl hud-btn-ghost font-display text-lg tracking-[0.2em]">
                    SIMULAR
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="text-[11px] uppercase tracking-widest text-hud-green">Temporada terminada</div>
                <div className="font-display text-3xl mt-2">
                  Campeón Zona {state.zone}: {TEAMS_BY_ID[seasonChampion(state) ?? ""]?.short ?? "—"}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Terminaste {pos}° en la tabla.</div>
                <button onClick={onAdvance}
                  className="mt-5 px-8 py-3 rounded-xl hud-btn-green font-display text-lg tracking-[0.2em]">
                  NUEVA TEMPORADA
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* La previa */}
      <aside className="order-3 space-y-3">
        <div className="hud-in hud-card relative overflow-hidden p-4">
          {flag && (
            <img src={flag} alt="Bandera de la hinchada" loading="lazy"
              className="pointer-events-none absolute -right-6 top-0 h-full w-1/2 object-cover opacity-70 [mask-image:linear-gradient(to_left,black,transparent)]" />
          )}
          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">La previa</div>
            <div className="font-display text-3xl mt-1">FECHA {nextMatch?.round ?? "—"}</div>
            <p className="text-sm text-foreground/85 mt-3 leading-relaxed max-w-[19ch]">
              {rivalTeam
                ? `${isHome ? myTeam?.name : rivalTeam.name} recibe a ${isHome ? rivalTeam.name : myTeam?.name}. Ambos buscan sumar de a tres para meterse en la pelea por los puestos de Reducido.`
                : "Temporada finalizada. Preparate para el próximo desafío."}
            </p>
            <button onClick={() => onGo("competicion")}
              className="mt-4 flex items-center gap-2 text-xs text-foreground/80 hover:text-hud-green transition">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-secondary">📰</span>
              Ver informe completo <span className="ml-auto">›</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="hud-card p-4">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Posición en la tabla</div>
            <div className="flex items-end gap-2 mt-2">
              <div className="font-display text-4xl leading-none">{pos || "—"}°</div>
              <div className="text-[11px] text-muted-foreground pb-1">{row?.pts ?? 0} PTS · {row?.pj ?? 0} PJ</div>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">{pos <= 8 ? "Zona de Reducido" : "Fuera del Reducido"}</div>
          </div>
          <div className="hud-card p-4">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Racha</div>
            <div className="flex gap-1.5 mt-3">
              {form.length === 0 && <span className="text-[11px] text-muted-foreground">Sin partidos</span>}
              {form.map((f, i) => (
                <span key={i} style={{ animationDelay: `${i * 60}ms` }}
                  className={`hud-in grid h-6 w-6 place-items-center rounded-full text-[11px] font-display ${
                    f === "V" ? "bg-hud-green text-background" : f === "E" ? "bg-muted text-foreground" : "bg-destructive text-destructive-foreground"
                  }`}>{f}</span>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-3">Últimos 5 partidos</div>
          </div>
        </div>
      </aside>

      {/* Fila inferior */}
      <div className="order-4 lg:col-span-2 lg:col-start-2 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="hud-rise hud-card p-4">
          <div className="text-[11px] uppercase tracking-[0.15em] mb-3">Últimos resultados</div>
          {lastResults.length === 0 && <div className="text-xs text-muted-foreground">Sin partidos jugados aún.</div>}
          <div className="space-y-2">
            {lastResults.map(m => {
              const mine = m.home === teamId ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
              const opp = m.home === teamId ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
              const r = mine > opp ? "V" : mine === opp ? "E" : "D";
              const other = TEAMS_BY_ID[m.home === teamId ? m.away : m.home];
              return (
                <div key={m.id} style={{ animationDelay: `${i * 70}ms` }}
                  className="row-drop flex items-center gap-2 text-xs">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-display ${
                    r === "V" ? "bg-hud-green text-background" : r === "E" ? "bg-muted" : "bg-destructive text-destructive-foreground"
                  }`}>{r}</span>
                  <span className="font-display tabular-nums">{mine}-{opp}</span>
                  <Shield team={other} size={18} />
                  <span className="truncate text-muted-foreground">{other?.short}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hud-rise hud-card p-4" style={{ animationDelay: "60ms" }}>
          <div className="text-[11px] uppercase tracking-[0.15em] mb-3">Estadísticas del torneo</div>
          <dl className="text-xs space-y-1.5">
            {[
              ["Partidos jugados", row?.pj ?? 0], ["Ganados", row?.pg ?? 0], ["Empatados", row?.pe ?? 0],
              ["Perdidos", row?.pp ?? 0], ["Goles a favor", gf], ["Goles en contra", gc],
              ["Diferencia de gol", (gf - gc > 0 ? "+" : "") + (gf - gc)],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between border-b border-border/40 pb-1">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hud-rise hud-card p-4" style={{ animationDelay: "120ms" }}>
          <div className="text-[11px] uppercase tracking-[0.15em] mb-3">Objetivos</div>
          <div className="space-y-2.5 text-xs">
            {objetivos.map(o => (
              <div key={o.label} className="flex items-start gap-2">
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] ${
                  o.done ? "bg-hud-green text-background" : "border border-border"
                }`}>{o.done ? "✓" : ""}</span>
                <span className={o.done ? "" : "text-muted-foreground"}>{o.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-rise hud-card p-4" style={{ animationDelay: "180ms" }}>
          <div className="text-[11px] uppercase tracking-[0.15em] mb-3">Estado del club</div>
          <div className="space-y-3">
            {estado.map(ind => (
              <div key={ind.key} className="flex items-center gap-2">
                <span className="text-base shrink-0">{ind.icon}</span>
                <span className="text-xs flex-1 min-w-0 truncate">{ind.label}</span>
                <span className="flex gap-1 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ animationDelay: `${i * 70}ms` }}
                      className={`hud-bar-fill h-3 w-3 rounded-[3px] ${i < Math.round(ind.value / 20) ? "bg-hud-green" : "bg-secondary"}`} />
                  ))}
                </span>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-3">Presupuesto: ${budget}</div>
        </div>
      </div>
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

function PersonalizarTab({ teamId }: { teamId: string }) {
  const t = TEAMS_BY_ID[teamId];
  if (!t) return null;
  const kits = [
    { name: "Titular", primary: t.primary, secondary: t.secondary ?? "#111" },
    { name: "Alternativa", primary: t.secondary ?? "#111", secondary: t.primary },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {kits.map((k, i) => (
        <div key={k.name} className="hud-rise hud-card p-5 text-center" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Camiseta {k.name}</div>
          <div className="mx-auto h-28 w-24 rounded-lg border border-border"
            style={{ background: `linear-gradient(90deg, ${k.primary} 0 33%, ${k.secondary} 33% 66%, ${k.primary} 66% 100%)` }} />
          <div className="font-display text-lg mt-3">{t.short}</div>
        </div>
      ))}
      <div className="hud-rise hud-card p-5" style={{ animationDelay: "160ms" }}>
        <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Escudo</div>
        <div className="flex items-center gap-3"><Shield team={t} size={64} /><span className="font-display text-lg">{t.name}</span></div>
        <Link to="/equipos/$id" params={{ id: teamId }} className="mt-4 inline-block text-sm text-hud-green">Ver ficha del club →</Link>
      </div>
    </div>
  );
}

/* ============================ SHELL ============================ */

function Shell({ children, hideNav }: { children: React.ReactNode; hideNav?: boolean }) {
  return (
    <div className="relative min-h-screen flex flex-col hud-shell" data-sfx-root>
      <AmbientStadium />
      <div className="relative z-10 flex flex-1 flex-col">
        {!hideNav && <Nav />}
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-3 sm:px-6 py-5 hud-boot">{children}</main>
      </div>
    </div>
  );
}
