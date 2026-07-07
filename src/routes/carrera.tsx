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
  OBJETIVO_LABEL, type Objetivo,
} from "@/lib/career";
import { sortStandings } from "@/lib/tournament";
import { ACHIEVEMENTS } from "@/lib/achievements";
import {
  fetchCareer, upsertCareer, deleteCareer,
  fetchAchievements, unlockAchievement, recordMatchHistory,
} from "@/lib/career-api";
import { SeasonIntro } from "@/components/SeasonIntro";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { CoimasMenu } from "@/components/CoimasMenu";
import { useGameSettings } from "@/lib/game-settings";
import { DIFFICULTY_INFO, toGameAi } from "@/lib/difficulty";

export const Route = createFileRoute("/carrera")({
  head: () => ({ meta: [
    { title: "Modo Carrera · Primera Heads" },
    { name: "description", content: "Jugá temporadas, sumá presupuesto y desbloqueá logros." },
  ] }),
  component: CarreraPage,
});

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
  const [pickingDifficulty, setPickingDifficulty] = useState(false);
  const [pickingObjetivo, setPickingObjetivo] = useState<((o: Objetivo) => void) | null>(null);


  // Cargar partida del usuario.
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
    await deleteCareer(user.id);
    setTeamId(null); setState(null); setSeason(1); setBudget(1000);
  }

  async function persist(next: CareerState, nextBudget = budget, nextSeason = season) {
    if (!user || !teamId) return;
    await upsertCareer({ user_id: user.id, team_id: teamId, season: nextSeason, budget: nextBudget, fixture_index: 0, state: next });
  }

  const nextMatch = useMemo(() => state && teamId ? nextPendingMatchForUser(state, teamId) : null, [state, teamId]);
  const team = teamId ? TEAMS_BY_ID[teamId] : undefined;

  async function onMatchEnd(lg: number, rg: number, _stats: MatchStats) {
    if (!state || !teamId || !user || !nextMatch) return;
    // El usuario SIEMPRE controla el lado izquierdo (P1). Traducimos a home/away reales del fixture.
    const userIsHome = nextMatch.home === teamId;
    const hg = userIsHome ? lg : rg;
    const ag = userIsHome ? rg : lg;
    await recordMatchHistory({ userId: user.id, home: nextMatch.home, away: nextMatch.away, hg, ag, mode: "carrera" }).catch(() => {});
    let next = recordUserMatch(state, nextMatch.id, hg, ag, teamId);
    next = simulateRoundExceptUser(next, nextMatch.round, teamId);
    const mg = userIsHome ? hg : ag;
    const og = userIsHome ? ag : hg;
    const rawReward = budgetReward(mg, og);
    const mult = incomeMultiplier(next);
    const reward = Math.round(rawReward * mult);
    // descontamos partidos de corrupción activa
    next = tickCorruption(next);
    const nextBudget = budget + reward;
    setBudget(nextBudget); setState(next);
    setPlaying(false);
    if (next.totalGoalsScored >= 100) await tryUnlock("100_goles");
    if (next.bestUnbeaten >= 10) await tryUnlock("10_invicto");
    let nextSeason = season;
    if (isSeasonFinished(next)) {
      const champ = seasonChampion(next);
      if (champ === teamId) await tryUnlock(next.zone === "A" ? "campeon_zona_a" : "campeon_zona_b");
    }
    await persist(next, nextBudget, nextSeason);
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
    // mantenemos stats acumuladas
    fresh.totalGoalsScored = state.totalGoalsScored;
    fresh.bestUnbeaten = state.bestUnbeaten;
    fresh.streakUnbeaten = 0;
    fresh.zoneChampions = [...state.zoneChampions];
    const champ = seasonChampion(state);
    if (champ) fresh.zoneChampions.push({ season, zone: state.zone, teamId: champ });
    const nextSeason = season + 1;
    setSeason(nextSeason); setState(fresh);
    await persist(fresh, budget, nextSeason);
  }

  if (loading || busy) {
    return <Shell><div className="p-8 text-center text-muted-foreground">Cargando…</div></Shell>;
  }
  if (!user) {
    return (
      <Shell>
        <div className="p-8 text-center">
          <h1 className="font-display text-4xl mb-3">MODO CARRERA</h1>
          <p className="text-muted-foreground mb-4">Iniciá sesión para guardar tu progreso y desbloquear logros.</p>
          <Link to="/auth" className="inline-block px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display">Iniciar sesión</Link>
        </div>
      </Shell>
    );
  }

  if (playing && state && team && nextMatch && teamId) {
    const userIsHome = nextMatch.home === teamId;
    // El usuario SIEMPRE juega como P1 (izquierda), sin importar si es local o visitante en el fixture.
    const leftTeam = TEAMS_BY_ID[teamId];
    const rightTeam = userIsHome ? TEAMS_BY_ID[nextMatch.away] : TEAMS_BY_ID[nextMatch.home];
    const fx = currentCorruptionEffects(state);
    return (
      <Shell>
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground mb-2">
            Temporada {season} · Fecha {nextMatch.round} · {userIsHome ? "Local" : "Visitante"}
          </div>
          <Game home={leftTeam} away={rightTeam} duration={60} mode="1vAI" sharedNarrator
            startingScore={fx.startingScore}
            cancelOpponentGoals={fx.cancelOpponentGoals ?? 0}
            doubleGoalChance={fx.doubleGoalChance ?? 0}
            onEnd={onMatchEnd} />
        </main>
      </Shell>
    );
  }

  if (!state || !teamId) {
    return (
      <Shell>
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
          <h1 className="font-display text-5xl">MODO CARRERA</h1>
          <p className="text-muted-foreground text-sm mt-1">Elegí un equipo y disputá temporadas. Tu progreso queda guardado.</p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {TEAMS.map(t => (
              <button key={t.id} onClick={() => startCareer(t.id)}
                className="p-3 rounded-lg border border-border bg-card hover:bg-secondary text-left">
                <Shield team={t} size={48} />
                <div className="text-xs mt-2 font-display truncate">{t.short}</div>
                <div className="text-[10px] text-muted-foreground">Zona {t.zone}</div>
              </button>
            ))}
          </div>
        </main>
      </Shell>
    );
  }

  const standings = sortStandings(state.standings);
  const myRow = standings.findIndex(r => r.teamId === teamId);
  return (
    <Shell>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-card border border-border p-4 flex flex-wrap items-center gap-4">
          {team && <Shield team={team} size={64} />}
          <div className="flex-1 min-w-[200px]">
            <div className="font-display text-2xl">{team?.name}</div>
            <div className="text-xs text-muted-foreground">Zona {state.zone} · Temporada {season}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-muted-foreground">Presupuesto</div>
            <div className="font-display text-2xl text-celeste">${budget}</div>
          </div>
          <button onClick={abandon} className="text-xs text-destructive hover:underline">Abandonar carrera</button>
        </div>

        {recentAch.length > 0 && (
          <div className="rounded-xl bg-celeste/10 border border-celeste/40 p-3 animate-fade-in">
            {recentAch.map(k => {
              const a = ACHIEVEMENTS.find(x => x.key === k);
              return <div key={k} className="text-sm">🎉 ¡Logro desbloqueado! <strong>{a?.icon} {a?.name}</strong></div>;
            })}
          </div>
        )}

        {/* Próximo partido / Temporada terminada */}
        <div className="rounded-2xl bg-card border border-border p-4">
          {nextMatch ? (
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Próximo partido · Fecha {nextMatch.round}</div>
                <div className="font-display text-xl mt-1">
                  {TEAMS_BY_ID[nextMatch.home]?.short} <span className="text-muted-foreground">vs</span> {TEAMS_BY_ID[nextMatch.away]?.short}
                </div>
                <div className="text-xs text-muted-foreground">{nextMatch.home === teamId ? "Local" : "Visitante"}</div>
              </div>
              <button onClick={() => setPlaying(true)}
                className="px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider glow-celeste">
                JUGAR
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Temporada terminada</div>
                <div className="font-display text-xl mt-1">Campeón Zona {state.zone}: {TEAMS_BY_ID[seasonChampion(state) ?? ""]?.short ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Quedaste {myRow + 1}° en la tabla.</div>
              </div>
              <button onClick={advanceSeason}
                className="px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider">
                NUEVA TEMPORADA
              </button>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="px-4 py-2 font-display text-sm uppercase text-muted-foreground border-b border-border">Tabla Zona {state.zone}</div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase">
              <tr><th className="text-left px-3 py-2">Pos</th><th className="text-left px-3 py-2">Equipo</th>
                <th className="px-2 py-2">PJ</th><th className="px-2 py-2">PG</th><th className="px-2 py-2">PE</th><th className="px-2 py-2">PP</th>
                <th className="px-2 py-2">GF</th><th className="px-2 py-2">GC</th><th className="px-2 py-2">DG</th><th className="px-2 py-2">Pts</th></tr>
            </thead>
            <tbody>
              {standings.map((r, i) => {
                const t = TEAMS_BY_ID[r.teamId];
                const mine = r.teamId === teamId;
                return (
                  <tr key={r.teamId} className={`border-t border-border ${mine ? "bg-celeste/10" : ""}`}>
                    <td className="px-3 py-1.5 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-1.5 flex items-center gap-2"><Shield team={t} size={20} /> {t?.short}</td>
                    <td className="text-center tabular-nums">{r.pj}</td>
                    <td className="text-center tabular-nums">{r.pg}</td>
                    <td className="text-center tabular-nums">{r.pe}</td>
                    <td className="text-center tabular-nums">{r.pp}</td>
                    <td className="text-center tabular-nums">{r.gf}</td>
                    <td className="text-center tabular-nums">{r.gc}</td>
                    <td className="text-center tabular-nums">{r.dg}</td>
                    <td className="text-center tabular-nums font-display">{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tabla otra zona */}
        {state.otherStandings && state.otherStandings.length > 0 && (
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="px-4 py-2 font-display text-sm uppercase text-muted-foreground border-b border-border">
              Tabla Zona {state.zone === "A" ? "B" : "A"} (simulada)
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr><th className="text-left px-3 py-2">Pos</th><th className="text-left px-3 py-2">Equipo</th>
                  <th className="px-2 py-2">PJ</th><th className="px-2 py-2">PG</th><th className="px-2 py-2">PE</th><th className="px-2 py-2">PP</th>
                  <th className="px-2 py-2">DG</th><th className="px-2 py-2">Pts</th></tr>
              </thead>
              <tbody>
                {sortStandings(state.otherStandings).map((r, i) => {
                  const t = TEAMS_BY_ID[r.teamId];
                  return (
                    <tr key={r.teamId} className="border-t border-border">
                      <td className="px-3 py-1.5 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-1.5 flex items-center gap-2"><Shield team={t} size={20} /> {t?.short}</td>
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
        )}

        {/* Panel del Club: mejoras de estadio + corrupción */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-display text-lg">🏟️ Mejoras del estadio</div>
              <div className="text-xs text-muted-foreground">Ingresos ×{incomeMultiplier(state).toFixed(2)}</div>
            </div>
            <div className="space-y-2">
              {STADIUM_UPGRADE_CATALOG.map(opt => {
                const owned = state.stadiumUpgrades?.[opt.key];
                return (
                  <div key={opt.key} className="flex items-center gap-2 border border-border rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-display">{opt.name}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                    {owned ? (
                      <span className="text-xs px-2 py-1 rounded bg-celeste/20 text-celeste font-display">ACTIVA</span>
                    ) : (
                      <button onClick={() => onBuyUpgrade(opt.key)}
                        disabled={budget < opt.cost}
                        className="text-xs px-3 py-1.5 rounded bg-celeste text-primary-foreground font-display disabled:opacity-40">
                        ${opt.cost}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-display text-lg">💼 Coimas & arreglos</div>
              {state.activeCorruption && state.activeCorruption.matchesLeft > 0 ? (
                <div className="text-xs text-yellow-500">
                  Activo: {CORRUPTION_CATALOG.find(o => o.kind === state.activeCorruption!.kind)?.name} · {state.activeCorruption.matchesLeft} fechas
                </div>
              ) : <div className="text-xs text-muted-foreground">Ninguno activo</div>}
            </div>
            <div className="space-y-2">
              {CORRUPTION_CATALOG.map(opt => (
                <div key={opt.kind} className="flex items-center gap-2 border border-border rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-display">{opt.name} <span className="text-xs text-muted-foreground">· {opt.matches} fechas · -{opt.penaltyPct}% ingresos</span></div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                  <button onClick={() => onActivateCorruption(opt.kind)}
                    disabled={budget < opt.cost || !!(state.activeCorruption && state.activeCorruption.matchesLeft > 0)}
                    className="text-xs px-3 py-1.5 rounded bg-yellow-500 text-black font-display disabled:opacity-40">
                    {opt.cost > 0 ? `$${opt.cost}` : "GRATIS"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats acumuladas */}
        <div className="grid sm:grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="text-xs uppercase text-muted-foreground">Goles totales</div>
            <div className="font-display text-2xl">{state.totalGoalsScored}</div>
          </div>
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="text-xs uppercase text-muted-foreground">Mejor racha invicto</div>
            <div className="font-display text-2xl">{state.bestUnbeaten}</div>
          </div>
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="text-xs uppercase text-muted-foreground">Logros</div>
            <div className="font-display text-2xl">{unlocked.size}/{ACHIEVEMENTS.length}</div>
          </div>
        </div>
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      {children}
    </div>
  );
}
