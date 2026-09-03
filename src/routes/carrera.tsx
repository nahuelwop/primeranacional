import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS, TEAMS_BY_ID, type Team } from "@/data/teams";
import { getTeamsByDivision, getTeamById, getRegionalTeamMeta } from "@/data/teams-catalog";
import { COMPETITIONS, type DivisionId } from "@/data/competitions";
import { useTeamsSync } from "@/lib/teams-sync";
import { useAuth } from "@/lib/auth";
import { Game, type MatchStats } from "@/components/Game";
import {
  buildSeason, simulateRoundExceptUser, catchUpOtherMatches, recordUserMatch, nextPendingMatchForUser,
  isSeasonFinished, seasonChampion, budgetReward, type CareerState, resolveLeagueMovements, initialLeagueRosters,
  checkCareerAchievementKeys, evolveTeamRatings, initialTeamRatings, applyTeamRatingsTemporarily, CLUB_DEVELOPMENT_CATALOG, buyDevelopment, developmentIncomeBonus, type ClubDevelopment,
  STADIUM_UPGRADE_CATALOG, CORRUPTION_CATALOG,
  buyUpgrade, activateCorruption, tickCorruption, currentCorruptionEffects, incomeMultiplier,
  OBJETIVO_LABEL, type Objetivo, clubIndicators, currentRound, totalRounds,
  careerDivision, detectCareerDivision, normalizeLeagueRosters, isFirstDivision, recordSeasonSnapshot, firstDivisionRelegated, firstDivisionRelegationDetails,
  careerTeam,
  getCareerPlayoffNeed,
  divisionRelegationCandidates, divisionPromotionCandidates, buildAverageTable,
} from "@/lib/career";
import { sortStandings, simulateMatch, simulateRegionalTournament, emptyStandings, applyMatchToStandings, buildFederalZoneMap, type Match, type StandingRow } from "@/lib/tournament";
import stadiumBg from "@/assets/stadium-night.jpg";
import { ACHIEVEMENTS } from "@/lib/achievements";
import {
  fetchCareer, upsertCareer, deleteCareer,
  fetchAchievements, unlockAchievement, recordMatchHistory,
} from "@/lib/career-api";
import { SeasonIntro } from "@/components/SeasonIntro";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { DIFFICULTY_INFO, toGameAi } from "@/lib/difficulty";
import { AmbientStadium } from "@/components/career/AmbientStadium";
import { useUiSfx } from "@/lib/ui-sound";
import { CountUp } from "@/lib/use-count-up";
import { SponsorsPanel } from "@/components/career/SponsorsPanel";
import { buildCareerNews, nextRivals } from "@/lib/career-news";
import { useTournament } from "@/store/tournament";
import type { SponsorDeal } from "@/lib/sponsors";
import { useCareerMusic, CareerMusicContext, useCareerMusicContext } from "@/lib/career-music";
import { fetchGameSettings } from "@/lib/game-settings";
import { NowPlayingToast } from "@/components/career/NowPlayingToast";
import { CareerFeaturesPanel } from "@/components/career/CareerFeaturesPanel";
import { isCopaEligibleTeam } from "@/lib/copaArgentina";
import type { MarketPlayer } from "@/lib/career-features";

export const Route = createFileRoute("/carrera")({
  head: () => ({
    meta: [
      { title: "Modo Carrera · Primera Heads" },
      { name: "description", content: "Dirigí tu club en Primera División o Primera Nacional: temporadas, ascensos, descensos, tabla, economía y oficina del club." },
      { property: "og:title", content: "Modo Carrera · Primera Heads" },
      { property: "og:description", content: "Dirigí tu club en la Primera Nacional: temporadas, calendario, tabla, economía y oficina del club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CarreraPage,
});

type TopTab = "inicio" | "calendario" | "competicion" | "club" | "oficina" | "personalizar" | "universo";

const TOP_TABS: { k: TopTab; label: string }[] = [
  { k: "inicio", label: "Inicio" },
  { k: "calendario", label: "Calendario" },
  { k: "competicion", label: "Competición" },
  { k: "club", label: "Club" },
  { k: "oficina", label: "Oficina" },
  { k: "personalizar", label: "Personalizar" },
  { k: "universo", label: "Universo" },
];

function CarreraPage() {
  useTeamsSync();
  const [introVideos, setIntroVideos] = useState<Record<string, string | null>>({});
  const navigate = useNavigate();
  const seedReducidoFromCareer = useTournament(s => s.seedFromCareer);
  const { user, loading } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [season, setSeason] = useState(1);
  const [budget, setBudget] = useState(1000);
  const [state, setState] = useState<CareerState | null>(null);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recentAch, setRecentAch] = useState<string[]>([]);
  const [tab, setTab] = useState<TopTab>("inicio");
  useUiSfx();

  useEffect(() => {
    let active = true;
    fetchGameSettings().then(settings => {
      if (active) setIntroVideos(settings.intro_videos ?? {});
    }).catch(() => {});
    return () => { active = false; };
  }, []);

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
          const loadedState = save.state as CareerState;
          const storedDivision = loadedState.division ?? getTeamById(save.team_id)?.division ?? "primera_nacional";
          loadedState.leagueRosters = normalizeLeagueRosters(loadedState.leagueRosters, save.team_id, storedDivision);
          loadedState.division = detectCareerDivision(loadedState.leagueRosters, save.team_id, storedDivision);
          loadedState.userTeamId = save.team_id;
          setState(loadedState);
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

  async function startCareer(tid: string, division: DivisionId = getTeamById(tid)?.division ?? "primera_nacional") {
    if (!user) return;
    const rosters = initialLeagueRosters();
    const s = buildSeason(tid, division, rosters);
    s.userTeamId = tid;
    s.teamRatings = initialTeamRatings(Object.values(rosters).flatMap(ids => ids ?? []));
    setTeamId(tid); setSeason(1); setBudget(1000); setState(s);
    await upsertCareer({ user_id: user.id, team_id: tid, season: 1, budget: 1000, fixture_index: 0, state: s });
  }

  async function abandon() {
    if (!user) return;
    if (!confirm("¿Seguro que querés abandonar la carrera? Se pierde todo el progreso.")) return;
    await deleteCareer(user.id);
    setTeamId(null); setState(null); setSeason(1); setBudget(1000); setTab("inicio");
  }

  async function persist(next: CareerState, nextBudget = budget, nextSeason = season): Promise<boolean> {
    if (!user || !teamId) return false;
    try {
      await upsertCareer({ user_id: user.id, team_id: teamId, season: nextSeason, budget: nextBudget, fixture_index: 0, state: next });
      return true;
    } catch (error) {
      console.error("No se pudo guardar la carrera", error);
      return false;
    }
  }

  const nextMatch = useMemo(() => state && teamId ? nextPendingMatchForUser(state, teamId) : null, [state, teamId]);
  const team = teamId ? careerTeam(state, teamId) : undefined;

  async function onMatchEnd(lg: number, rg: number, _stats: MatchStats) {
    if (!state || !teamId || !user || !nextMatch) return;
    const userIsHome = nextMatch.home === teamId;
    const hg = userIsHome ? lg : rg;
    const ag = userIsHome ? rg : lg;
    await recordMatchHistory({ userId: user.id, home: nextMatch.home, away: nextMatch.away, hg, ag, mode: "carrera" }).catch(() => {});
    let next = recordUserMatch(state, nextMatch.id, hg, ag, teamId);
    next = simulateRoundExceptUser(next, nextMatch.round, teamId);
    // Algunas ligas tienen dos zonas; resolvemos los partidos de la otra zona
    // cuando corresponde para que no queden fechas pendientes invisibles.
    next = catchUpOtherMatches(next);
    const mg = userIsHome ? hg : ag;
    const og = userIsHome ? ag : hg;
    const reward = Math.round(budgetReward(mg, og) * incomeMultiplier(next) * developmentIncomeBonus(next));
    next = tickCorruption(next);
    const nextBudget = budget + reward;
    setBudget(nextBudget); setState(next);
    setPlaying(false);
    for (const key of checkCareerAchievementKeys(next, nextBudget)) await tryUnlock(key);
    if (isSeasonFinished(next)) {
      const champ = seasonChampion(next);
      if (champ === teamId) await tryUnlock(next.zone === "A" ? "campeon_zona_a" : "campeon_zona_b");
    }
    await persist(next, nextBudget, season);
  }

  async function onSimulateMatch() {
    if (!state || !teamId || !nextMatch) return;
    const { hg, ag } = applyTeamRatingsTemporarily(state.teamRatings, () => simulateMatch(nextMatch.home, nextMatch.away));
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

  async function onSignSponsor(deal: SponsorDeal) {
    if (!state) return;
    const next = { ...state, sponsor: deal };
    const nextBudget = budget + deal.initial;
    setState(next); setBudget(nextBudget);
    await persist(next, nextBudget, season);
  }

  async function onCancelSponsor() {
    if (!state) return;
    if (!confirm("¿Rescindir el contrato con el patrocinador actual?")) return;
    const next = { ...state, sponsor: null };
    setState(next);
    await persist(next, budget, season);
  }

  function seedRegionalPlayoffFromState(source: CareerState, userId: string) {
    const myMeta = getRegionalTeamMeta(userId);
    if (!myMeta) return false;
    const allRows = [...source.standings, ...(source.otherStandings ?? [])];
    const roster = source.leagueRosters?.regional_federal_amateur ?? getTeamsByDivision("regional_federal_amateur").map(t => t.id);
    const groups = new Map<string, StandingRow[]>();
    for (const id of roster) {
      const meta = getRegionalTeamMeta(id);
      if (!meta || meta.region !== myMeta.region) continue;
      const row = allRows.find(r => r.teamId === id);
      if (!row) continue;
      const key = `${meta.region}::${meta.group}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
    }
    const seeds: StandingRow[] = [];
    for (const rows of groups.values()) {
      const sorted = sortStandings(rows);
      if (sorted[0]) seeds.push(sorted[0]);
      if (sorted[1]) seeds.push(sorted[1]);
    }
    const unique = Array.from(new Map(seeds.map(r => [r.teamId, r])).values())
      .sort((a, b) => (b.pts / Math.max(1, b.pj)) - (a.pts / Math.max(1, a.pj)) || b.dg - a.dg || b.pts - a.pts);
    const opponentCandidates = (source.leagueRosters?.regional_federal_amateur ?? [])
      .map(id => getRegionalTeamMeta(id))
      .filter((m): m is NonNullable<typeof m> => !!m && m.region !== myMeta.region)
      .map(m => allRows.find(r => r.teamId === m.id))
      .filter(Boolean) as StandingRow[];
    let nationalOpponent = sortStandings(opponentCandidates)[0]?.teamId;
    // Elegimos como rival nacional un campeón de otra región cuando la
    // simulación puede resolverlo; si no, conservamos el mejor candidato disponible.
    try {
      const simulated = simulateRegionalTournament(roster);
      const otherChampions = simulated.regionalChampions.filter(id => {
        const meta = getRegionalTeamMeta(id);
        return !!meta && meta.region !== myMeta.region;
      });
      if (otherChampions.length) nationalOpponent = sortStandings(otherChampions.map(id => allRows.find(r => r.teamId === id)).filter(Boolean) as StandingRow[])[0]?.teamId ?? otherChampions[0];
    } catch { /* fallback arriba */ }
    seedReducidoFromCareer({
      standA: unique, standB: [], userTeamId: userId, season, difficulty: (source.difficulty ?? "normal") as any,
      division: "regional_federal_amateur", regionalNationalOpponent: nationalOpponent,
    });
    return true;
  }

  async function goToReducido() {
    if (!state || !teamId) return;
    const d = careerDivision(state, teamId);

    if (d === "regional_federal_amateur") {
      if (!seedRegionalPlayoffFromState(state, teamId)) return;
      navigate({ to: "/reducido" });
      return;
    }

    const standA = d === "primera_b" ? state.standings : (state.zone === "A" ? state.standings : (state.otherStandings ?? []));
    const standB = d === "primera_b" ? [] : (state.zone === "B" ? state.standings : (state.otherStandings ?? []));
    seedReducidoFromCareer({
      standA, standB, userTeamId: teamId, season, difficulty: (state.difficulty ?? "normal") as any,
      division: d === "primera_nacional" || d === "primera_b" || d === "primera_c" || d === "promocional_amateur" ? d : "primera_nacional",
    });
    navigate({ to: "/reducido" });
  }

  async function advanceSeason() {
    if (!state || !teamId || !user || !isSeasonFinished(state) || transitioning) return;
    setTransitioning(true);
    try {
      const currentDivision = careerDivision(state, teamId);
      const completed = recordSeasonSnapshot({ ...state, userTeamId: teamId }, season);
      const needPlayoff = getCareerPlayoffNeed(completed, teamId);
      const tournamentState = useTournament.getState();
      const tournamentMatches = tournamentState.division === currentDivision && tournamentState.season === season && tournamentState.userTeamId === teamId;

      // 1) Si hay una instancia de ascenso pendiente, jamás avanzamos de temporada
      // sin resolverla. El resultado del usuario es la autoridad final.
      if (needPlayoff) {
        let playoffReady = false;
        let promoted = false;

        if (tournamentMatches) {
          const final = tournamentState.finalDirecta;
          const userInFinal = !!final && (final.a === teamId || final.b === teamId);
          const finalWon = userInFinal && final?.winner === teamId;
          const finalLost = userInFinal && !!final?.winner && final.winner !== teamId;
          const reducedFinished = tournamentState.reducidoChampion !== undefined;

          if (currentDivision === "regional_federal_amateur") {
            const regionalChampion = tournamentState.regionalChampion;
            const nationalFinal = tournamentState.regionalNationalFinal;
            const regionalWon = regionalChampion === teamId;
            const nationalFinished = !!nationalFinal?.winner;
            if (!regionalWon) {
              // Si otro club ganó la etapa regional, la temporada ya puede cerrarse.
              playoffReady = !!regionalChampion;
              promoted = false;
            } else if (!nationalFinal) {
              playoffReady = false;
            } else if (nationalFinished) {
              playoffReady = true;
              promoted = nationalFinal?.winner === teamId;
            }
          } else if (currentDivision === "primera_b") {
            playoffReady = reducedFinished;
            promoted = tournamentState.reducidoChampion === teamId;
          } else if (userInFinal) {
            if (!final?.winner) playoffReady = false;
            else if (finalWon) { playoffReady = true; promoted = true; }
            else if (finalLost) { playoffReady = reducedFinished; promoted = tournamentState.reducidoChampion === teamId; }
          } else {
            playoffReady = reducedFinished;
            promoted = tournamentState.reducidoChampion === teamId;
          }
        }

        if (!playoffReady) {
          if (!tournamentMatches) {
            if (currentDivision === "regional_federal_amateur") {
              if (!seedRegionalPlayoffFromState(completed, teamId)) {
                throw new Error("No se pudo preparar el playoff del Regional Federal Amateur.");
              }
            } else {
              const standA = currentDivision === "primera_b" ? completed.standings : (completed.zone === "A" ? completed.standings : (completed.otherStandings ?? []));
              const standB = currentDivision === "primera_b" ? [] : (completed.zone === "B" ? completed.standings : (completed.otherStandings ?? []));
              seedReducidoFromCareer({
                standA, standB, userTeamId: teamId, season,
                difficulty: (completed.difficulty ?? "normal") as any,
                division: currentDivision as any,
              });
            }
          }
          const pending = { ...completed, pendingPlayoff: { division: currentDivision, season } };
          if (!(await persist(pending, budget, season))) return;
          setState(pending);
          navigate({ to: "/reducido" });
          return;
        }

        const completedWithPlayoff = { ...completed, pendingPlayoff: undefined };
        const movement = resolveLeagueMovements(completedWithPlayoff, season, { promoted });
        if (movement.ended) {
          const endedState: CareerState = { ...completedWithPlayoff, leagueRosters: movement.rosters, careerEnded: true, careerEndReason: movement.endReason, userTeamId: teamId };
          if (await persist(endedState, budget, season)) setState(endedState);
          return;
        }

        const nextDivision = movement.userNextDivision ?? currentDivision;
        const fresh = buildSeason(teamId, nextDivision, movement.rosters, completed.federalZoneMap);
        fresh.totalGoalsScored = completed.totalGoalsScored;
        fresh.bestUnbeaten = completed.bestUnbeaten;
        fresh.streakUnbeaten = 0;
        fresh.zoneChampions = [...completed.zoneChampions];
        fresh.seasonHistory = [...(completed.seasonHistory ?? [])];
        fresh.difficulty = completed.difficulty;
        fresh.objetivo = nextDivision === "primera_division" ? "salir_campeon" : "ascenso_directo";
        fresh.sponsor = completed.sponsor ?? null;
        fresh.stadiumUpgrades = completed.stadiumUpgrades;
        fresh.introVista = false;
        fresh.leagueRosters = movement.rosters;
        fresh.userTeamId = teamId;
        fresh.teamRatings = movement.teamRatings ?? evolveTeamRatings(completed);
        fresh.clubDevelopment = { ...(completed.clubDevelopment ?? {}) };
        fresh.totalMatchesPlayed = completed.totalMatchesPlayed ?? 0;
        fresh.totalWins = completed.totalWins ?? 0;
        fresh.totalDraws = completed.totalDraws ?? 0;
        fresh.totalLosses = completed.totalLosses ?? 0;
        fresh.careerTrophies = (completed.careerTrophies ?? 0) + (promoted ? 1 : 0);

        for (const key of checkCareerAchievementKeys(completed, budget)) await tryUnlock(key);
        if (promoted) {
          await tryUnlock("ascenso");
          if (nextDivision === "primera_division") await tryUnlock("ascenso_a_primera");
        }

        const nextSeason = season + 1;
        if (!(await persist(fresh, budget, nextSeason))) return;
        setSeason(nextSeason);
        setState(fresh);
        setTab("inicio");
        return;
      }

      // Temporada normal: resolver ascensos/descensos sin bloquear al usuario.
      const movement = resolveLeagueMovements(completed, season);
      if (movement.ended) {
        const endedState: CareerState = { ...completed, leagueRosters: movement.rosters, careerEnded: true, careerEndReason: movement.endReason, userTeamId: teamId };
        if (await persist(endedState, budget, season)) setState(endedState);
        return;
      }

      const nextDivision = movement.userNextDivision ?? currentDivision;
      const fresh = buildSeason(teamId, nextDivision, movement.rosters, completed.federalZoneMap);
      fresh.totalGoalsScored = completed.totalGoalsScored;
      fresh.bestUnbeaten = completed.bestUnbeaten;
      fresh.streakUnbeaten = 0;
      fresh.zoneChampions = [...completed.zoneChampions];
      fresh.seasonHistory = [...(completed.seasonHistory ?? [])];
      fresh.difficulty = completed.difficulty;
      fresh.objetivo = nextDivision === "primera_division" ? "salir_campeon" : "ascenso_directo";
      fresh.sponsor = completed.sponsor ?? null;
      fresh.stadiumUpgrades = completed.stadiumUpgrades;
      fresh.introVista = false;
      fresh.leagueRosters = movement.rosters;
      fresh.userTeamId = teamId;
      fresh.teamRatings = movement.teamRatings ?? evolveTeamRatings(completed);
      fresh.clubDevelopment = { ...(completed.clubDevelopment ?? {}) };
      fresh.totalMatchesPlayed = completed.totalMatchesPlayed ?? 0;
      fresh.totalWins = completed.totalWins ?? 0;
      fresh.totalDraws = completed.totalDraws ?? 0;
      fresh.totalLosses = completed.totalLosses ?? 0;
      fresh.careerTrophies = completed.careerTrophies ?? 0;
      if (movement.userNextDivision && movement.userNextDivision !== careerDivision(completed, teamId)) {
        fresh.careerTrophies = (completed.careerTrophies ?? 0) + 1;
        await tryUnlock("ascenso");
        if (movement.userNextDivision === "primera_division") await tryUnlock("ascenso_a_primera");
      }
      for (const key of checkCareerAchievementKeys(completed, budget)) await tryUnlock(key);

      const nextSeason = season + 1;
      if (!(await persist(fresh, budget, nextSeason))) return;
      setSeason(nextSeason);
      setState(fresh);
      setTab("inicio");
    } catch (error) {
      console.error("Error al cerrar la temporada", error);
      alert("No se pudo cerrar la temporada. Tu partida no fue reemplazada. Revisá la consola y volvé a intentarlo.");
    } finally {
      setTransitioning(false);
    }
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

  if (state?.careerEnded) {
    return (
      <Shell>
        <div className="max-w-xl mx-auto mt-16 hud-panel p-8 text-center">
          <div className="text-4xl mb-3">📉</div>
          <h1 className="font-display text-4xl text-destructive mb-3">CARRERA FINALIZADA</h1>
          <p className="text-muted-foreground">{state.careerEndReason ?? "La temporada terminó y tu club salió de las categorías jugables."}</p>
          <button onClick={abandon} className="mt-6 px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider">VOLVER A ELEGIR CLUB</button>
        </div>
      </Shell>
    );
  }

  if (state && teamId && !state.difficulty) {
    return (
      <Shell>
        <DifficultyPicker onPick={async (d) => {
          const next = { ...state, difficulty: d, objetivo: state.objetivo ?? (isFirstDivision(state, teamId) ? "salir_campeon" : "ascenso_directo") as Objetivo };
          setState(next);
          await persist(next);
        }} />
      </Shell>
    );
  }

  if (state && teamId && state.difficulty && !state.introVista) {
    return (
      <Shell musicActive={false}>
        <SeasonIntro season={season} teamId={teamId}
          division={careerDivision(state, teamId)}
          objetivo={OBJETIVO_LABEL[state.objetivo ?? (isFirstDivision(state, teamId) ? "salir_campeon" : "ascenso_directo")]}
          videoUrl={introVideos[careerDivision(state, teamId)] ?? null}
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
    const effectiveDivision = careerDivision(state, teamId);
    const leftBase = careerTeam(state, teamId);
    const rightBase = userIsHome ? careerTeam(state, nextMatch.away) : careerTeam(state, nextMatch.home);
    const leftTeam = leftBase ? { ...leftBase, division: effectiveDivision } : undefined;
    const rightTeam = rightBase ? { ...rightBase, division: effectiveDivision } : undefined;
    if (!leftTeam || !rightTeam) {
      return <Shell><div className="p-16 text-center text-destructive">No se pudo cargar uno de los equipos de esta división.</div></Shell>;
    }
    const fx = currentCorruptionEffects(state);
    return (
      <Shell musicActive={false}>
        <div className="text-center text-sm text-muted-foreground mb-2">
          Temporada {season} · Fecha {nextMatch.round} · {userIsHome ? "Local" : "Visitante"}
          {state.difficulty && <span className="ml-2 text-celeste">· {DIFFICULTY_INFO[state.difficulty].emoji} {DIFFICULTY_INFO[state.difficulty].label}</span>}
        </div>
        <Game home={leftTeam} away={rightTeam} duration={60} mode="1vAI" sharedNarrator
          aiDifficulty={toGameAi(state.difficulty ?? "normal")}
          crowdIntensity={(leftTeam?.rivals?.includes(rightTeam?.id ?? "") || rightTeam?.rivals?.includes(leftTeam?.id ?? "")) ? "clasico" : "normal"}
          startingScore={fx.startingScore}
          cancelOpponentGoals={fx.cancelOpponentGoals ?? 0}
          doubleGoalChance={fx.doubleGoalChance ?? 0}
          onEnd={onMatchEnd}
          onExit={() => setPlaying(false)} />
      </Shell>
    );
  }

  if (!state || !teamId) {
    const firstDivisionTeams = getTeamsByDivision("primera_division");
    return (
      <Shell>
        <div className="hud-panel p-6">
          <h1 className="font-display text-5xl">MODO CARRERA</h1>
          <p className="text-muted-foreground text-sm mt-1">Elegí una categoría y el club que vas a dirigir. Los ascensos, descensos y temporadas quedan guardados.</p>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-display text-2xl text-celeste">PRIMERA DIVISIÓN</div>
                <div className="text-xs text-muted-foreground">Carrera completa con tabla anual y promedios.</div>
              </div>
              <span className="text-xs text-muted-foreground">{firstDivisionTeams.length} clubes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {firstDivisionTeams.map(t => (
                <button key={t.id} onClick={() => startCareer(t.id, "primera_division")}
                  className="p-3 rounded-xl border border-border bg-card/60 hover:bg-secondary hover:scale-[1.03] transition text-left">
                  <Shield team={t} size={48} />
                  <div className="text-xs mt-2 font-display truncate">{t.short}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{t.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/60">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-display text-2xl">PRIMERA NACIONAL</div>
                <div className="text-xs text-muted-foreground">Modo carrera original por zonas.</div>
              </div>
              <span className="text-xs text-muted-foreground">{TEAMS.length} clubes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {TEAMS.map(t => (
                <button key={t.id} onClick={() => startCareer(t.id, "primera_nacional")}
                  className="p-3 rounded-xl border border-border bg-card/60 hover:bg-secondary hover:scale-[1.03] transition text-left">
                  <Shield team={t} size={48} />
                  <div className="text-xs mt-2 font-display truncate">{t.short}</div>
                  <div className="text-[10px] text-muted-foreground">Zona {t.zone}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/60">
            <div className="font-display text-2xl text-celeste mb-1">OTRAS CATEGORÍAS</div>
            <div className="text-xs text-muted-foreground mb-4">Empezá desde Primera B, Primera C, Federal A o Regional Federal Amateur.</div>
            <div className="space-y-6">
              {(["primera_b", "primera_c", "promocional_amateur", "federal_a", "regional_federal_amateur"] as DivisionId[]).map(d => {
                const teams = getTeamsByDivision(d);
                const rules = COMPETITIONS[d];
                return (
                  <div key={d}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-display text-xl">{rules.name}</div>
                        <div className="text-[10px] text-muted-foreground">{rules.hasZones ? `Zonas: ${rules.zones.join(" · ")}` : "Tabla general"}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">{teams.length} clubes</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {teams.map(t => (
                        <button key={t.id} onClick={() => startCareer(t.id, d)}
                          className="p-3 rounded-xl border border-border bg-card/60 hover:bg-secondary hover:scale-[1.03] transition text-left">
                          <Shield team={t} size={44} />
                          <div className="text-xs mt-2 font-display truncate">{t.short}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{t.city}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  const division = careerDivision(state, teamId);
  const first = division === "primera_division";
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
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card font-display text-sm">{first ? "1D" : division === "regional_federal_amateur" ? "RFA" : division === "promocional_amateur" ? "PA" : division === "federal_a" ? "FA" : "PN"}</span>
          <span className="hidden sm:block leading-none">
            <span className="block font-display text-sm tracking-widest">PRIMERA</span>
            <span className="block font-display text-sm tracking-widest text-muted-foreground">{COMPETITIONS[division].shortName.toUpperCase()}</span>
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
          <span className="grid h-8 w-8 place-items-center rounded-full border border-hud-green/60 text-hud-green font-display text-sm tabular-nums"><CountUp value={overall} /></span>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span className="hud-card px-3 py-1.5 flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">🗓️</span>
          <span className="font-display tracking-wide">TEMPORADA {season}</span>
        </span>
        <span className="hud-card px-3 py-1.5 flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">📅</span>
          <span className="font-display tracking-wide">FECHA {Math.min(round, rounds)}/{rounds}</span>
        </span>
        <span className="hud-card px-3 py-1.5 flex items-center gap-1.5 text-xs">
          <span className="text-hud-green">🏆</span>
          <span className="font-display tracking-wide">{myPos}° PUESTO</span>
        </span>
        <span className="hud-card px-3 py-1.5 flex items-center gap-1.5 text-xs">
          <span className="text-accent">💰</span>
          <span className="font-display tracking-wide tabular-nums">$<CountUp value={budget} /></span>
          <span className="text-muted-foreground hidden sm:inline">Presupuesto</span>
        </span>
        {indicators.find(i => i.key === "moral") && (() => {
          const m = indicators.find(i => i.key === "moral")!;
          const moodLabel = m.value >= 80 ? "MUY ALTA" : m.value >= 60 ? "ALTA" : m.value >= 40 ? "REGULAR" : m.value >= 20 ? "BAJA" : "MUY BAJA";
          const moodEmoji = m.value >= 60 ? "😄" : m.value >= 40 ? "🙂" : m.value >= 20 ? "😐" : "😟";
          const moodColor = m.value >= 60 ? "text-hud-green" : m.value >= 30 ? "text-accent" : "text-destructive";
          return (
            <span className="hud-card px-3 py-1.5 flex items-center gap-1.5 text-xs">
              <span className={moodColor}>{moodEmoji}</span>
              <span className="font-display tracking-wide">MORAL {moodLabel}</span>
            </span>
          );
        })()}
        <span className="hud-card px-3 py-1.5 flex items-center gap-1.5 text-xs text-hud-green">
          <span>🎯</span>
          <span className="font-display tracking-wide">{OBJETIVO_LABEL[state.objetivo ?? (first ? "salir_campeon" : "ascenso_directo")]}</span>
        </span>
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
            indicators={indicators} standings={standings} budget={budget} division={division}
            onPlay={() => setPlaying(true)} onSimulate={onSimulateMatch}
            onAdvance={advanceSeason} onGo={setTab} onGoReducido={goToReducido}
          />
        )}
        {tab === "calendario" && <CalendarioTab state={state} teamId={teamId} />}
        {tab === "competicion" && <CompeticionTab state={state} teamId={teamId} />}
        {tab === "club" && (
          <ClubTab state={state} teamId={teamId} budget={budget} unlocked={unlocked.size} onBuy={onBuyUpgrade} onDevelopment={async (k) => { const r = buyDevelopment(state, budget, k); if (!r.ok) { alert(r.error); return; } setState(r.state); setBudget(r.budget); await persist(r.state, r.budget, season); }} />
        )}
        {tab === "oficina" && (
          <OficinaTab state={state} budget={budget} season={season} onActivate={onActivateCorruption} onAbandon={abandon} onSignSponsor={onSignSponsor} onCancelSponsor={onCancelSponsor} />
        )}
        {tab === "personalizar" && <PersonalizarTab teamId={teamId} />}
        {tab === "universo" && <CareerFeaturesPanel state={state} teamId={teamId} season={season} budget={budget}
          onSpend={async (amount) => { if (budget < amount) return; setBudget(b => b - amount); }}
          onSignPlayer={async (player: MarketPlayer) => {
            if (budget < player.value) return;
            const next = { ...state, transferSignings: [...new Set([...(state.transferSignings ?? []), player.id])] };
            const nextBudget = budget - player.value;
            setState(next); setBudget(nextBudget); await persist(next, nextBudget, season);
            const xpState = { ...next, managerXp: (next.managerXp ?? 0) + 80 }; setState(xpState); await persist(xpState, nextBudget, season);
          }}
          onRewardXp={async (amount) => {
            const next = { ...state, managerXp: (state.managerXp ?? 0) + amount }; setState(next); await persist(next, budget, season);
          }}
          onClaimChallenge={async (id, amount) => {
            if ((state.claimedChallenges ?? []).includes(id)) return;
            const next = { ...state, managerXp: (state.managerXp ?? 0) + amount, claimedChallenges: [...(state.claimedChallenges ?? []), id] };
            setState(next); await persist(next, budget, season);
          }}
          onShare={async () => {
            const text = `PRIMERA HEADS · Temporada ${season}\n${team?.name ?? "Mi club"} · Nivel ${Math.floor(Math.sqrt(Math.max(0, (state.managerXp ?? 0)) / 100)) + 1}\n${state.totalWins ?? 0} victorias · ${state.totalGoalsScored} goles · ${state.careerTrophies ?? 0} trofeos\n¿Quién supera mi carrera?`;
            try { if (navigator.share) await navigator.share({ title: "Primera Heads", text }); else await navigator.clipboard.writeText(text); } catch {}
          }}
          onGoCopa={() => { if (isCopaEligibleTeam(teamId)) navigate({ to: "/copa-argentina", search: { teamId, season, difficulty: (state.difficulty ?? "normal") as any } }); }}
          copaAvailable={isCopaEligibleTeam(teamId)}
        />}
      </div>
    </Shell>
  );
}

/* ============================ INICIO ============================ */

function InicioTab({ state, teamId, season, nextMatch, indicators, standings, budget, division, onPlay, onSimulate, onAdvance, onGo, onGoReducido }: {
  state: CareerState; teamId: string; season: number; nextMatch: Match | null;
  indicators: ReturnType<typeof clubIndicators>; standings: StandingRow[]; budget: number; division: DivisionId;
  onPlay: () => void; onSimulate: () => void; onAdvance: () => void; onGo: (t: TopTab) => void; onGoReducido: () => void;
}) {
  const rival = nextMatch ? (nextMatch.home === teamId ? nextMatch.away : nextMatch.home) : null;
  const rivalTeam = rival ? careerTeam(state, rival) : undefined;
  const myTeam = careerTeam(state, teamId);
  const isHome = nextMatch ? nextMatch.home === teamId : true;
  const flags = [...(myTeam?.flagUrls ?? []), ...(rivalTeam?.flagUrls ?? [])];
  const flag = flags[0];
  const lastResults = state.matches
    .filter(m => m.played && (m.home === teamId || m.away === teamId))
    .slice(-5).reverse();
  const row = standings.find(r => r.teamId === teamId);
  const pos = standings.findIndex(r => r.teamId === teamId) + 1;
  const regionalQualified = division === "regional_federal_amateur"
    ? (() => {
        const meta = getRegionalTeamMeta(teamId);
        if (!meta) return false;
        const allRows = [...state.standings, ...(state.otherStandings ?? [])];
        const groupRows = allRows.filter(r => {
          const m = getRegionalTeamMeta(r.teamId);
          return !!m && m.region === meta.region && m.group === meta.group;
        });
        return sortStandings(groupRows).findIndex(r => r.teamId === teamId) <= 1;
      })()
    : false;
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
    { k: "universo" as TopTab, icon: "🌎", title: "Universo", sub: "Mercado, ranking y desafíos" },
  ];

  const objetivos = division === "primera_division" ? [
    { label: "Terminar entre los 10 primeros", done: pos > 0 && pos <= 10 },
    { label: "Ganar 8 partidos", done: state.matches.filter(m => m.played && ((m.home === teamId && (m.homeGoals ?? 0) > (m.awayGoals ?? 0)) || (m.away === teamId && (m.awayGoals ?? 0) > (m.homeGoals ?? 0)))).length >= 8 },
    { label: "Mantener la valla invicta en 6 partidos", done: state.matches.filter(m => m.played && ((m.home === teamId && m.awayGoals === 0) || (m.away === teamId && m.homeGoals === 0))).length >= 6 },
    { label: "Terminar entre los 4 primeros", done: pos > 0 && pos <= 4 },
  ] : [
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
        <div className="hud-in match-hero relative overflow-hidden rounded-[0.9rem] border border-border/50">
          <img src={stadiumBg} alt="Estadio de noche" width={1280} height={720}
            className="match-hero-photo absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/45 to-background/90" />
          <div className="match-hero-smoke" aria-hidden="true" />
          <div className="match-hero-light" aria-hidden="true" />
          <div className="match-hero-grass" aria-hidden="true" />
          <div className="relative p-5">
            {nextMatch ? (
              <>
                <div className="text-[11px] uppercase tracking-[0.2em] text-hud-green font-semibold">Próximo partido</div>
                <div className="text-center mt-3">
                  <div className="font-display text-3xl tracking-wide">FECHA {nextMatch.round}</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                    {COMPETITIONS[division].name}{state.zone ? ` · Zona ${state.zone}` : ""}
                    {nextMatch.isClasico && <span className="ml-2 text-accent">🔥 Clásico</span>}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <TeamBig team={careerTeam(state, nextMatch.home)} />
                  <div className="font-display text-4xl">VS</div>
                  <TeamBig team={careerTeam(state, nextMatch.away)} />
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
                {season >= 1 && isCopaEligibleTeam(teamId) && (
                  <a
                    href={`/copa-argentina?teamId=${teamId}&season=${season}&difficulty=${state.difficulty ?? "normal"}`}
                    className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 transition-colors font-display text-sm tracking-[0.15em] text-accent"
                  >
                    🏆 COPA ARGENTINA
                  </a>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <div className="text-[11px] uppercase tracking-widest text-hud-green">Temporada terminada</div>
                <div className="font-display text-3xl mt-2">
                  {division === "primera_division"
                    ? `Campeón: ${getTeamById(seasonChampion(state) ?? "")?.short ?? "—"}`
                    : `Campeón Zona ${state.zone}: ${getTeamById(seasonChampion(state) ?? "")?.short ?? "—"}`}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Terminaste {pos}° en la tabla.</div>
                {(() => {
                  const relegated = divisionRelegationCandidates(state);
                  const promoted = divisionPromotionCandidates(state);
                  const next = COMPETITIONS[division].promotion[0]?.to;
                  const down = COMPETITIONS[division].relegation[0]?.to;
                  if (relegated.includes(teamId)) {
                    return <div className="mt-2 font-display text-lg text-destructive">DESCENDÉS · {down ? COMPETITIONS[down].name.toUpperCase() : "DESCENSO"}</div>;
                  }
                  if (division === "regional_federal_amateur") {
                    if (regionalQualified) return <div className="mt-2 font-display text-lg text-hud-green">CLASIFICADO · ELIMINATORIAS REGIONALES</div>;
                  } else if (promoted.includes(teamId) && next) {
                    return <div className="mt-2 font-display text-lg text-hud-green">ASCENDÉS · {COMPETITIONS[next].name.toUpperCase()}</div>;
                  }
                  return null;
                })()}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  {((division === "primera_nacional" && pos <= 8) || (division === "primera_b" && pos >= 2 && pos <= 9) || (division === "primera_c" && pos <= 7) || (division === "promocional_amateur" && pos <= 4) || (division === "regional_federal_amateur" && regionalQualified)) && (
                    <button onClick={onGoReducido}
                      className="px-8 py-3 rounded-xl hud-btn-play font-display text-lg tracking-[0.2em]">
                      🏆 IR A FASE DE ASCENSO
                    </button>
                  )}
                  <button onClick={onAdvance} disabled={transitioning}
                    className="px-8 py-3 rounded-xl hud-btn-ghost font-display text-lg tracking-[0.2em] disabled:opacity-50 disabled:cursor-wait">
                    {transitioning ? "CERRANDO TEMPORADA…" : "NUEVA TEMPORADA"}
                  </button>
                </div>
                {((division === "primera_nacional" && pos <= 8) || (division === "primera_b" && pos >= 2 && pos <= 9) || (division === "primera_c" && pos <= 7) || (division === "promocional_amateur" && pos <= 4) || (division === "regional_federal_amateur" && regionalQualified)) && (
                  <div className="text-[11px] text-muted-foreground mt-3 max-w-xs mx-auto">
                    {division === "regional_federal_amateur" ? "Tu club clasificó a las eliminatorias regionales. Tenés que disputarlas antes de comenzar la nueva temporada." : "Tu club clasificó a una instancia de ascenso. Tenés que disputarla antes de comenzar la nueva temporada."}
                  </div>
                )}
                {division === "primera_division" && firstDivisionRelegated(state).includes(teamId) && (
                  <div className="text-[11px] text-destructive mt-3 max-w-sm mx-auto">
                    Tu club queda relegado a Primera Nacional para la próxima temporada. En esta división se combinan la tabla anual y los promedios.
                  </div>
                )}
                {division !== "primera_division" && divisionRelegationCandidates(state).includes(teamId) && (
                  <div className="text-[11px] text-destructive mt-3 max-w-sm mx-auto">
                    Tu club ocupa uno de los puestos de descenso definidos para {COMPETITIONS[division].name}.
                  </div>
                )}
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
                ? `${isHome ? myTeam?.name : rivalTeam.name} recibe a ${isHome ? rivalTeam.name : myTeam?.name}. Ambos buscan sumar de a tres y mejorar su posición en la ${division === "primera_division" ? "tabla anual" : "tabla de la zona"}.`
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
              <div key={pos} className="goal-pop font-display text-4xl leading-none tabular-nums">{pos || "—"}°</div>
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

        <div className="hud-card float-soft p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-hud-green font-semibold mb-1">Noticias</div>
          <div>
            {buildCareerNews(state, teamId, budget, season).map((n, i) => (
              <article key={n.id} className="news-item hud-in" style={{ animationDelay: `${i * 70}ms` }}>
                <span className="news-ico text-lg">{n.icon}</span>
                <div className="min-w-0">
                  <h4 className="font-display text-sm tracking-wide">{n.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-snug">{n.body}</p>
                  <span className="text-[10px] text-muted-foreground/70">{n.time}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="hud-card p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Próximos rivales</div>
          <div className="space-y-1.5">
            {nextRivals(state, teamId, 4).map(m => {
              const other = careerTeam(state, m.home === teamId ? m.away : m.home);
              return (
                <div key={m.id} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground tabular-nums w-10">F{m.round}</span>
                  <Shield team={other} size={18} />
                  <span className="truncate">{other?.short}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{m.home === teamId ? "Local" : "Visita"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Fila inferior */}
      <div className="order-4 lg:col-span-2 lg:col-start-2 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="hud-rise hud-card p-4">
          <div className="text-[11px] uppercase tracking-[0.15em] mb-3">Últimos resultados</div>
          {lastResults.length === 0 && <div className="text-xs text-muted-foreground">Sin partidos jugados aún.</div>}
          <div className="space-y-2">
            {lastResults.map((m, i) => {
              const mine = m.home === teamId ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
              const opp = m.home === teamId ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
              const r = mine > opp ? "V" : mine === opp ? "E" : "D";
              const other = careerTeam(state, m.home === teamId ? m.away : m.home);
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
            {objetivos.map((o, i) => (
              <div key={o.label} className="flex items-start gap-2">
                <span style={{ animationDelay: `${i * 90}ms` }}
                  className={`relative grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] ${
                    o.done ? "bg-hud-green text-background goal-pop goal-flash" : "border border-border"
                  }`}>{o.done ? "✓" : ""}</span>
                <span className={o.done ? "" : "text-muted-foreground"}>{o.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-rise hud-card p-4" style={{ animationDelay: "180ms" }}>
          <div className="text-[11px] uppercase tracking-[0.15em] mb-3">Estado del club</div>
          <div className="space-y-3">
            {estado.map((ind, i) => (
              <div key={ind.key} className="flex items-center gap-2">
                <span className="text-base shrink-0">{ind.icon}</span>
                <span className="text-xs flex-1 min-w-0 truncate">{ind.label}</span>
                <span className="stat-bar w-24 shrink-0">
                  <i style={{ transform: `scaleX(${Math.max(0.03, ind.value / 100)})`, animationDelay: `${i * 120}ms` }} />
                </span>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-3 tabular-nums">
            Presupuesto: $<CountUp value={budget} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamBig({ team }: { team?: Team }) {
  if (!team) return <div />;
  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      <span className="shield-lit"><Shield team={team} size={72} /></span>
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

  const nextRound = useMemo(() => {
    const found = byRound.find(([, ms]) => ms.some(m => !m.played));
    return found ? found[0] : null;
  }, [byRound]);

  return (
    <div className="hud-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Calendario · {COMPETITIONS[careerDivision(state, teamId)].name}{state.zone ? ` · Zona ${state.zone}` : ""}</div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-hud-green" />Ganado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/60" />Empate</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" />Perdido</span>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {byRound.map(([round, ms]) => {
          const isNext = round === nextRound;
          return (
            <div key={round} className={`rounded-xl border p-3 transition-colors ${
              isNext ? "border-celeste bg-celeste/[0.06] shadow-[0_0_18px_rgba(56,189,248,0.15)]" : "border-border/60 bg-card/40"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="font-display text-sm tracking-widest text-celeste">FECHA {round}</div>
                {isNext && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-celeste/20 border border-celeste/50 text-celeste font-display tracking-wide">PRÓXIMA</span>
                )}
              </div>
              <div className="space-y-1">
                {ms.map(m => {
                  const mine = m.home === teamId || m.away === teamId;
                  const home = careerTeam(state, m.home);
                  const away = careerTeam(state, m.away);
                  let resultColor = "";
                  if (mine && m.played) {
                    const myGoals = m.home === teamId ? m.homeGoals! : m.awayGoals!;
                    const rivalGoals = m.home === teamId ? m.awayGoals! : m.homeGoals!;
                    resultColor = myGoals > rivalGoals ? "border-l-hud-green" : myGoals < rivalGoals ? "border-l-destructive" : "border-l-muted-foreground";
                  }
                  return (
                    <div key={m.id} className={`flex items-center justify-between text-xs rounded-lg px-2 py-1.5 gap-2 ${
                      mine ? `bg-celeste/10 border border-celeste/30 border-l-[3px] ${resultColor || "border-l-celeste"}` : "hover:bg-white/[0.03]"
                    }`}>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Shield team={home} size={16} />
                        <span className="truncate">{home?.short}</span>
                        <span className="text-muted-foreground shrink-0">vs</span>
                        <span className="truncate">{away?.short}</span>
                        <Shield team={away} size={16} />
                      </div>
                      <span className={`font-display tabular-nums shrink-0 ${mine && m.played ? "text-sm" : ""}`}>
                        {m.played ? `${m.homeGoals}-${m.awayGoals}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ COMPETICIÓN ============================ */

function CompeticionTab({ state, teamId }: { state: CareerState; teamId: string }) {
  const division = careerDivision(state, teamId);
  const rules = COMPETITIONS[division];

  if (division === "primera_division") {
    const annual = sortStandings(state.standings);
    const averages = buildAverageTable(state, "primera_division");
    const history = [...(state.seasonHistory ?? [])]
      .filter(s => s.division === "primera_division")
      .sort((a, b) => b.season - a.season);
    const relegated = isSeasonFinished(state) ? firstDivisionRelegated(state) : [];
    const relegationDetails = isSeasonFinished(state) ? firstDivisionRelegationDetails(state) : [];
    return (
      <div className="space-y-3">
        <CompetitionMovementPanel division={division} state={state} teamId={teamId} />
        <TablaZona
          title={`Tabla anual · Temporada ${history.length ? Math.max(...history.map(h => h.season), 0) : seasonLabel(state)}`}
          rows={annual}
          highlight={teamId}
          matches={[...state.matches, ...(state.otherMatches ?? [])]}
          division={division}
          relegated={relegated}
        />
        <div className="grid lg:grid-cols-2 gap-3">
          <TablaPromedios rows={averages} highlight={teamId} />
          <div className="hud-panel overflow-hidden">
            <div className="px-4 py-2.5 font-display text-sm uppercase tracking-widest text-celeste border-b border-border">Descensos · Primera División</div>
            <div className="p-3 space-y-2">
              {relegationDetails.length === 0 ? (
                <div className="text-xs text-muted-foreground">Al finalizar la temporada descienden 2 equipos: último de la tabla anual y peor promedio.</div>
              ) : relegationDetails.map((r, i) => {
                const t = getTeamById(r.teamId);
                return <div key={r.teamId} className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs">
                  <span className="font-display text-destructive">{i + 1}</span>
                  <Shield team={t} size={22} />
                  <span className="font-semibold truncate">{t?.short ?? r.teamId}</span>
                  <span className="ml-auto text-destructive/80 text-right">{r.reason}</span>
                </div>;
              })}
            </div>
          </div>
          <div className="hud-panel overflow-hidden lg:col-span-2">
            <div className="px-4 py-2.5 font-display text-sm uppercase tracking-widest text-celeste border-b border-border">Historial de temporadas</div>
            <div className="p-3 space-y-2">
              {history.length === 0 ? <div className="text-xs text-muted-foreground">La tabla anual de la Temporada 1 quedará guardada al finalizar la temporada.</div> : history.map(h => {
                const sorted = sortStandings(h.standings);
                const me = sorted.findIndex(r => r.teamId === teamId) + 1;
                return <div key={`${h.division}-${h.season}`} className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 flex items-center justify-between text-xs">
                  <span className="font-display">Temporada {h.season}</span><span>{me ? `${me}° · ${sorted[me - 1]?.pts ?? 0} pts` : "Sin participación"}</span>
                </div>;
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Primera Nacional: SIEMPRE se muestran las dos zonas separadas.
  if (division === "primera_nacional") {
    const allMatches = [...state.matches, ...(state.otherMatches ?? [])];
    const zm = state.federalZoneMap ?? Object.fromEntries(getTeamsByDivision(division).map(t => [t.id, t.zone ?? "A"]));
    const zoneTables = new Map<string, StandingRow[]>();
    for (const z of ["A", "B"]) {
      const ids = Object.keys(zm).filter(id => zm[id] === z);
      let rows = emptyStandings(ids);
      for (const m of allMatches) if (ids.includes(m.home) && ids.includes(m.away) && m.played) rows = applyMatchToStandings(rows, m);
      // Los interzonales alimentan la tabla de ambos clubes.
      for (const m of allMatches) if (m.played && ids.includes(m.home) !== ids.includes(m.away)) rows = applyMatchToStandings(rows, m);
      zoneTables.set(z, sortStandings(rows));
    }
    // Si el mapa persistido no está disponible en saves antiguos, derivamos por las tablas existentes.
    if ((zoneTables.get("A")?.length ?? 0) === 0 || (zoneTables.get("B")?.length ?? 0) === 0) {
      zoneTables.set(state.zone || "A", sortStandings(state.standings));
      if (state.otherStandings) zoneTables.set(state.zone === "A" ? "B" : "A", sortStandings(state.otherStandings));
    }
    const zoneA = zoneTables.get("A") ?? [];
    const zoneB = zoneTables.get("B") ?? [];
    const labels = (z: string) => `${z === "A" ? "Zona A" : "Zona B"} · 1° = Final por 1er ascenso · 2°-8° = Reducido`;
    return (
      <div className="space-y-3">
        <CompetitionMovementPanel division={division} state={state} teamId={teamId} />
        <div className="grid lg:grid-cols-2 gap-3">
          <TablaZona title={labels("A")} rows={zoneA} highlight={teamId} matches={allMatches} division={division} statusMode="pn" />
          <TablaZona title={labels("B")} rows={zoneB} highlight={teamId} matches={allMatches} division={division} statusMode="pn" />
        </div>
        <div className="hud-panel p-4">
          <div className="font-display text-sm uppercase tracking-widest text-celeste mb-2">ASCENSO Y REDUCIDO · PRIMERA NACIONAL</div>
          <div className="grid md:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="rounded-lg border border-hud-green/20 bg-hud-green/5 p-3"><b className="text-hud-green">1° de Zona A + 1° de Zona B:</b> final a partido único en cancha neutral. El ganador asciende a Primera División.</div>
            <div className="rounded-lg border border-celeste/20 bg-celeste/5 p-3"><b className="text-celeste">2° al 8° de A + 2° al 8° de B:</b> 14 equipos. Se cruzan entre zonas; los 7 ganadores se unen al perdedor de la final para formar 8 equipos de cuartos. De ahí salen semis y final por el 2° ascenso.</div>
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">Todos los cruces del Reducido son a partido único. En empate, ventaja deportiva para el mejor ubicado.</div>
        </div>
      </div>
    );
  }

  // Promocional Amateur: dos zonas separadas (8 + 9), final por el primer ascenso
  // y Reducido para el segundo camino.
  if (division === "promocional_amateur") {
    const allMatches = [...state.matches, ...(state.otherMatches ?? [])];
    const zm = state.federalZoneMap ?? Object.fromEntries(getTeamsByDivision(division).map(t => [t.id, t.zone ?? "A"]));
    const tables = ["A", "B"].map(z => {
      const ids = Object.keys(zm).filter(id => zm[id] === z);
      let rows = emptyStandings(ids);
      for (const m of allMatches) {
        if (m.played && ids.includes(m.home) && ids.includes(m.away)) rows = applyMatchToStandings(rows, m);
      }
      return { z, rows: sortStandings(rows) };
    });
    return (
      <div className="space-y-3">
        <CompetitionMovementPanel division={division} state={state} teamId={teamId} />
        <div className="grid lg:grid-cols-2 gap-3">
          {tables.map(({ z, rows }) => (
            <TablaZona
              key={z}
              title={`Zona ${z} · ${z === "A" ? "8 equipos" : "9 equipos"} · 1° = final · 2°-4° = Reducido`}
              rows={rows}
              highlight={teamId}
              matches={allMatches}
              division={division}
              statusMode="promocional"
            />
          ))}
        </div>
        <div className="hud-panel p-4 text-xs text-muted-foreground">
          <div className="font-display text-sm uppercase tracking-widest text-celeste mb-2">PROMOCIONAL AMATEUR · ASCENSO</div>
          <div>1° Zona A vs 1° Zona B por el primer ascenso a Primera C. El perdedor entra directamente a semifinales del Reducido junto con los ganadores de 2°A vs 4°B, 2°B vs 4°A y 3°A vs 3°B. El ganador del Reducido obtiene el segundo camino de ascenso a Primera C.</div>
        </div>
      </div>
    );
  }

  // Regional Amateur: cada grupo va por separado. Nunca se mezclan todos los clubes en una sola tabla.
  if (division === "regional_federal_amateur") {
    const roster = state.leagueRosters?.regional_federal_amateur ?? getTeamsByDivision(division).map(t => t.id);
    const allMatches = [...state.matches, ...(state.otherMatches ?? [])];
    const groups = new Map<string, string[]>();
    for (const id of roster) {
      const meta = getRegionalTeamMeta(id);
      if (!meta) continue;
      const key = `${meta.region}::${meta.group}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(id);
    }
    const tables: Array<{ key: string; region: string; group: string; rows: StandingRow[] }> = [];
    for (const [key, ids] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true }))) {
      let rows = emptyStandings(ids);
      for (const m of allMatches) if (m.played && ids.includes(m.home) && ids.includes(m.away)) rows = applyMatchToStandings(rows, m);
      tables.push({ key, region: key.split("::")[0], group: key.split("::")[1], rows: sortStandings(rows) });
    }
    const byRegion = new Map<string, typeof tables>();
    for (const t of tables) (byRegion.get(t.region) ?? byRegion.set(t.region, []).get(t.region)!).push(t);
    return (
      <div className="space-y-4">
        <CompetitionMovementPanel division={division} state={state} teamId={teamId} />
        {[...byRegion.entries()].map(([region, regionTables]) => (
          <section key={region} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div><div className="font-display text-xl text-celeste">{region}</div><div className="text-[10px] text-muted-foreground uppercase tracking-widest">Primera ronda · grupos geográficos de 3/4 · ida y vuelta</div></div>
              <span className="text-[10px] text-muted-foreground">{regionTables.reduce((n, x) => n + x.rows.length, 0)} clubes</span>
            </div>
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {regionTables.map(t => (
                <TablaZona key={t.key} title={`Grupo ${t.group}`} rows={t.rows} highlight={teamId} matches={allMatches} division={division} statusMode="regional" />
              ))}
            </div>
          </section>
        ))}
        <div className="hud-panel p-4 text-xs text-muted-foreground">
          <div className="font-display text-sm uppercase tracking-widest text-celeste mb-2">FORMATO REGIONAL FEDERAL AMATEUR</div>
          <div>1ª ronda: grupos geográficos de 3/4, ida y vuelta. Después: eliminatorias regionales a doble partido hasta definir 8 campeones regionales. Los 8 campeones juegan 4 finales nacionales a partido único; los 4 ganadores ascienden al Federal A.</div>
        </div>
      </div>
    );
  }

  // Federal A: se muestran las cuatro zonas reales de la Fase 1, no una tabla nacional única.
  if (division === "federal_a") {
    const ids = state.leagueRosters?.federal_a ?? getTeamsByDivision(division).map(t => t.id);
    const zm = state.federalZoneMap ?? buildFederalZoneMap(ids);
    const allMatches = [...state.matches, ...(state.otherMatches ?? [])];
    const zones = ["A", "B", "C", "D"].map(z => {
      const zoneIds = ids.filter(id => zm[id] === z);
      let rows = emptyStandings(zoneIds);
      for (const m of allMatches) if (m.played && zoneIds.includes(m.home) && zoneIds.includes(m.away)) rows = applyMatchToStandings(rows, m);
      return { z, rows: sortStandings(rows), count: zoneIds.length };
    });
    return (
      <div className="space-y-3">
        <CompetitionMovementPanel division={division} state={state} teamId={teamId} />
        <div className="grid lg:grid-cols-2 gap-3">
          {zones.map(({ z, rows, count }) => <TablaZona key={z} title={`Fase 1 · Zona ${z} (${count} equipos)`} rows={rows} highlight={teamId} matches={allMatches} division={division} statusMode="fa_phase1" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="hud-panel p-4"><div className="font-display text-sm uppercase tracking-widest text-hud-green mb-2">ZONA CAMPEONATO · 18</div><p className="text-xs text-muted-foreground">Entran 5° de la zona de 10, 4° de cada zona de 9 y el mejor 5° restante. Se forman 2 zonas de 9 a una rueda. Los 4 mejores de cada una van a cuartos, luego semis y final a doble partido por el 1° ascenso.</p></div>
          <div className="hud-panel p-4"><div className="font-display text-sm uppercase tracking-widest text-celeste mb-2">FASE REVÁLIDA · 19</div><p className="text-xs text-muted-foreground">Los 19 restantes se dividen en grupos 9+10 a una rueda. Los 5 mejores de cada grupo pasan a eliminatorias por el 2° ascenso. Los 4 últimos de la Reválida descienden al Regional Amateur.</p></div>
        </div>
      </div>
    );
  }

  if (division === "primera_c") {
    const allMatches = [...state.matches, ...(state.otherMatches ?? [])];
    const zm = state.federalZoneMap ?? Object.fromEntries(getTeamsByDivision(division).map(t => [t.id, t.zone ?? "A"]));
    const tables = ["A", "B"].map(z => {
      const ids = Object.keys(zm).filter(id => zm[id] === z);
      let rows = emptyStandings(ids);
      for (const m of allMatches) if (m.played && (ids.includes(m.home) || ids.includes(m.away))) rows = applyMatchToStandings(rows, m);
      return { z, rows: sortStandings(rows) };
    });
    return (
      <div className="space-y-3">
        <CompetitionMovementPanel division={division} state={state} teamId={teamId} />
        <div className="grid lg:grid-cols-2 gap-3">
          {tables.map(({ z, rows }) => <TablaZona key={z} title={`Zona ${z} · 1° = Final · 2°-7° = Reducido`} rows={rows} highlight={teamId} matches={allMatches} division={division} statusMode="pc" />)}
        </div>
      </div>
    );
  }

  // Primera B: una sola tabla, 42 fechas.
  const allMatches = [...state.matches, ...(state.otherMatches ?? [])];
  return (
    <div className="space-y-3">
      <CompetitionMovementPanel division={division} state={state} teamId={teamId} />
      <TablaZona
        title={`Tabla general · ${rules.name} · 42 fechas`}
        rows={sortStandings(state.standings)}
        highlight={teamId}
        matches={allMatches}
        division={division}
        relegated={divisionRelegationCandidates(state)}
        statusMode="pb"
      />
    </div>
  );
}

function seasonLabel(state: CareerState): string {
  const finished = isSeasonFinished(state);
  return finished ? "finalizada" : "actual";
}

function CompetitionMovementPanel({ division, state, teamId }: { division: DivisionId; state: CareerState; teamId: string }) {
  const rules = COMPETITIONS[division];
  const rows = sortStandings(state.standings);
  const position = rows.findIndex(r => r.teamId === teamId) + 1;
  const relegated = divisionRelegationCandidates(state);
  const promoted = divisionPromotionCandidates(state);
  const relegationLabel = (() => {
    if (division === "primera_division") return "2 descensos: 1 por último de la tabla anual y 1 por peor promedio. Si coincide, la plaza anual pasa al 29°.";
    if (division === "primera_nacional") return "4 descensos: 2 clubes metropolitanos a Primera B y 2 clubes del interior a Federal A.";
    if (division === "primera_b") return "2 últimos de la tabla general descienden a Primera C.";
    if (division === "primera_c") return "1 descenso: último de la tabla general → Promocional Amateur.";
    if (division === "promocional_amateur") return "Sin descenso modelado; dos caminos de ascenso a Primera C.";
    if (division === "regional_federal_amateur") return "No hay descenso: última categoría jugable del circuito federal.";
    if (division === "federal_a") return "4 descensos: los últimos 4 de la Fase Reválida → Regional Federal Amateur.";
    if (rules.relegation.length === 0 || rules.relegation.every(r => r.slots === 0)) return "No hay descenso modelado en esta categoría.";
    return `Descenso: ${rules.relegation.reduce((sum, r) => sum + r.slots, 0)} puestos por tabla.`;
  })();
  const formatLabel = rules.formatLabel ?? (rules.hasZones ? `Zonas: ${rules.zones.join(" · ")}` : "Tabla general");
  const promotionLabel = rules.promotion.length === 0
    ? "No hay ascenso porque esta es la máxima categoría."
    : `${rules.promotion[0].directSlots} ascenso(s) directo(s)${rules.promotion[0].playoffSlots ? ` + ${rules.promotion[0].playoffSlots} por playoff/reducido` : ""} a ${COMPETITIONS[rules.promotion[0].to].name}.`;
  return (
    <div className="hud-panel p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="font-display text-lg tracking-wide">ASCENSOS Y DESCENSOS</div>
          <div className="text-[11px] text-muted-foreground">{rules.name} · puesto actual {position || "—"}°</div>
        </div>
        {state && isSeasonFinished(state) && (
          <span className={`text-[10px] uppercase tracking-widest font-display ${relegated.includes(teamId) ? "text-destructive" : promoted.includes(teamId) ? "text-hud-green" : "text-muted-foreground"}`}>
            {relegated.includes(teamId) ? "DESCENSO" : promoted.includes(teamId) ? "ASCENSO" : "MANTIENE"}
          </span>
        )}
      </div>
      <div className="rounded-lg border border-border/60 bg-card/30 p-3 mb-2">
        <div className="text-[10px] uppercase tracking-widest text-celeste mb-1">Formato</div>
        <div className="text-xs text-foreground/90">{formatLabel}</div>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        <div className="rounded-lg border border-hud-green/20 bg-hud-green/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-hud-green mb-1">Ascenso</div>
          <div className="text-xs text-foreground/90">{promotionLabel}</div>
        </div>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-destructive mb-1">Descenso</div>
          <div className="text-xs text-foreground/90">{relegationLabel}</div>
        </div>
      </div>
    </div>
  );
}

function TablaPromedios({ rows, highlight }: { rows: ReturnType<typeof buildAverageTable>; highlight?: string }) {
  return (
    <div className="hud-panel overflow-hidden">
      <div className="px-4 py-2.5 font-display text-sm uppercase tracking-widest text-celeste border-b border-border flex items-center justify-between">
        <span>Promedios · Primera División</span><span className="text-[9px] normal-case tracking-normal text-muted-foreground">PTS / PJ</span>
      </div>
      {rows.length === 0 && <div className="px-4 py-3 text-xs text-muted-foreground border-b border-border/60">El promedio se empieza a contar desde la primera temporada finalizada de tu carrera.</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] text-muted-foreground uppercase"><tr><th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Equipo</th><th className="px-2 py-2">Temp.</th><th className="px-2 py-2">PJ</th><th className="px-2 py-2">PTS</th><th className="px-2 py-2">Prom.</th></tr></thead>
          <tbody>{rows.map((r, i) => {
            const t = getTeamById(r.teamId);
            const mine = r.teamId === highlight;
            return <tr key={r.teamId} className={`border-t border-border/40 ${mine ? "bg-celeste/15" : i % 2 ? "bg-white/[0.02]" : ""}`}>
              <td className="px-3 py-1.5 tabular-nums">{i + 1}</td><td className="px-3 py-1.5"><div className="flex items-center gap-2"><Shield team={t} size={20} /><span className="truncate">{t?.short}</span></div></td>
              <td className="text-center">{r.seasons}</td><td className="text-center tabular-nums">{r.pj}</td><td className="text-center tabular-nums">{r.pts}</td><td className="text-center tabular-nums font-display text-celeste">{r.avgPtsPerMatch.toFixed(2)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

function recentForm(teamId: string, matches: Match[]): ("V" | "E" | "D")[] {
  return matches
    .filter(m => m.played && (m.home === teamId || m.away === teamId))
    .sort((a, b) => a.round - b.round)
    .slice(-5)
    .map(m => {
      const mine = m.home === teamId ? m.homeGoals! : m.awayGoals!;
      const rival = m.home === teamId ? m.awayGoals! : m.homeGoals!;
      return mine > rival ? "V" : mine < rival ? "D" : "E";
    });
}

function TablaZona({ title, rows, highlight, matches, division = "primera_nacional", relegated = [] as string[], statusMode = "generic" }: { key?: string; title: string; rows: StandingRow[]; highlight?: string; matches: Match[]; division?: DivisionId; relegated?: string[]; statusMode?: "generic" | "pn" | "pb" | "pc" | "regional" | "promocional" | "fa_phase1" }) {
  return (
    <div className="hud-panel overflow-hidden">
      <div className="px-4 py-2.5 font-display text-sm uppercase tracking-widest text-celeste border-b border-border flex items-center justify-between">
        <span>{title}</span>
        <div className="flex items-center gap-3 text-[9px] normal-case font-sans tracking-normal text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" />Campeón</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-celeste" />{division === "primera_division" ? "Zona de descenso" : "Clasificación"}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] text-muted-foreground uppercase">
            <tr>
              <th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Equipo</th>
              <th className="px-2 py-2">PJ</th><th className="px-2 py-2">PG</th><th className="px-2 py-2">PE</th>
              <th className="px-2 py-2">PP</th><th className="px-2 py-2">DG</th><th className="px-2 py-2">Pts</th>
              <th className="px-2 py-2 hidden sm:table-cell">Forma</th><th className="px-2 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const t = getTeamById(r.teamId);
              const mine = r.teamId === highlight;
              const pos = i + 1;
              const rules = COMPETITIONS[division];
              const isRelegated = relegated.includes(r.teamId);
              let status = "";
              let isChamp = false;
              let isPromoted = false;
              let inReducido = false;
              if (statusMode === "pn") {
                status = pos === 1 ? "FINAL ASC." : pos <= 8 ? "REDUCIDO" : "";
                isChamp = pos === 1;
                inReducido = pos >= 2 && pos <= 8;
              } else if (statusMode === "pb") {
                status = pos === 1 ? "ASC. DIRECTO" : pos >= 2 && pos <= 9 ? "REDUCIDO" : "";
                isChamp = pos === 1;
                isPromoted = pos === 1;
                inReducido = pos >= 2 && pos <= 9;
              } else if (statusMode === "pc") {
                status = pos === 1 ? "FINAL ASC." : pos >= 2 && pos <= 7 ? "REDUCIDO" : "";
                isChamp = pos === 1;
                inReducido = pos >= 2 && pos <= 7;
              } else if (statusMode === "promocional") {
                status = pos === 1 ? "FINAL ASC." : pos >= 2 && pos <= 4 ? "REDUCIDO" : "";
                isChamp = pos === 1;
                inReducido = pos >= 2 && pos <= 4;
              } else if (statusMode === "regional") {
                status = pos <= 2 ? "CLASIF." : "";
                isChamp = pos === 1;
                inReducido = pos <= 2;
              } else if (statusMode === "fa_phase1") {
                status = pos <= 4 ? "CAMPEONATO" : pos === 5 ? "REPECHAJE" : "REVÁLIDA";
                isPromoted = pos <= 4;
                inReducido = pos <= 5;
              } else {
                const directSlots = rules.promotion[0]?.directSlots ?? 0;
                const playoffSlots = rules.promotion[0]?.playoffSlots ?? 0;
                const playoffRange = directSlots + playoffSlots * 8;
                inReducido = division !== "primera_division" && playoffSlots > 0 && pos > directSlots && pos <= playoffRange;
                isPromoted = division !== "primera_division" && directSlots > 0 && pos <= directSlots;
                isChamp = pos === 1;
                status = isRelegated ? "DESC." : isChamp ? "CAMPEÓN" : isPromoted ? "ASC." : inReducido ? "PLAYOFF" : "";
              }
              const form = recentForm(r.teamId, matches);
              return (
                <tr key={r.teamId} className={`border-t border-border/40 transition-colors ${
                  mine ? "bg-celeste/15" : i % 2 === 1 ? "bg-white/[0.02]" : ""
                } ${isRelegated ? "border-l-[3px] border-l-destructive" : isChamp || isPromoted ? "border-l-[3px] border-l-accent" : inReducido ? "border-l-[3px] border-l-celeste/70" : "border-l-[3px] border-l-transparent"}`}
                >
                  <td className="px-3 py-1.5 tabular-nums">
                    <span className={isChamp ? "text-accent font-display" : "text-muted-foreground"}>{pos}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Shield team={t} size={mine ? 24 : 20} />
                      <span className={`truncate ${mine ? "font-display text-celeste" : ""}`}>{t?.short}</span>
                      {isChamp && <span className="text-accent text-xs">🏆</span>}
                    </div>
                  </td>
                  <td className="text-center tabular-nums">{r.pj}</td>
                  <td className="text-center tabular-nums">{r.pg}</td>
                  <td className="text-center tabular-nums">{r.pe}</td>
                  <td className="text-center tabular-nums">{r.pp}</td>
                  <td className={`text-center tabular-nums ${r.dg > 0 ? "text-hud-green" : r.dg < 0 ? "text-destructive" : ""}`}>{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
                  <td className="text-center tabular-nums font-display text-base">{r.pts}</td>
                  <td className="px-2 py-1.5 hidden sm:table-cell">
                    <div className="flex gap-0.5 justify-center">
                      {form.length === 0 && <span className="text-muted-foreground text-[10px]">—</span>}
                      {form.map((f, fi) => (
                        <span key={fi} className={`w-3.5 h-3.5 rounded-[3px] grid place-items-center text-[8px] font-bold ${
                          f === "V" ? "bg-hud-green/80 text-black" : f === "D" ? "bg-destructive/80 text-white" : "bg-muted-foreground/50 text-black"
                        }`}>{f}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center text-[10px] font-display">{isRelegated ? <span className="text-destructive">DESC.</span> : status ? <span className={isChamp || isPromoted ? "text-hud-green" : inReducido ? "text-celeste" : "text-muted-foreground"}>{status}</span> : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-[10px] text-muted-foreground border-t border-border/40">
        {division === "primera_division"
          ? "1° campeón · el descenso combina tabla anual y promedio"
          : division === "primera_nacional"
            ? "Ascenso: campeón de zona / Reducido · Descenso: según afiliación (metropolitano o federal)"
            : division === "primera_c"
              ? "Ascenso: final de zona + Reducido · último de la tabla general desciende al Promocional Amateur"
              : division === "federal_a"
                ? "Ascenso: Fase Campeonato / playoffs · 4 descensos al Regional Federal Amateur"
                : division === "primera_b"
                  ? "Ascenso: campeón + Reducido · 2 últimos descienden a Primera C"
                  : division === "regional_federal_amateur"
                    ? "4 ascensos al Federal A · 4 perdedores de la etapa final → Torneo Argentino del Interior"
                    : COMPETITIONS[division].relegation.every(r => r.slots === 0)
                      ? "Sin descenso modelado en esta categoría"
                      : `Ascenso directo: ${COMPETITIONS[division].promotion[0]?.directSlots ?? 0} · Descenso: ${COMPETITIONS[division].relegation.reduce((sum, r) => sum + r.slots, 0)} puestos`}
      </div>
    </div>
  );
}

/* ============================ CLUB ============================ */

function ClubTab({ state, teamId, budget, unlocked, onBuy, onDevelopment }: {
  state: CareerState; teamId: string; budget: number; unlocked: number;
  onBuy: (k: typeof STADIUM_UPGRADE_CATALOG[number]["key"]) => void;
  onDevelopment: (k: keyof ClubDevelopment) => void;
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
                  T{z.season} · Zona {z.zone} · <span className="font-display">{getTeamById(z.teamId)?.short}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <Link to="/equipos/$id" params={{ id: teamId }}
          className="inline-block text-sm text-celeste underline">Ver ficha, plantel y estadio →</Link>
      </div>
      <div className="hud-panel p-4 lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-display text-lg tracking-wide">📈 Rendimiento del plantel</div>
            <div className="text-xs text-muted-foreground">Las stats de simulación se renuevan al terminar cada temporada según el rendimiento del equipo.</div>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Solo simulación</span>
        </div>
        {(() => {
          const r = state.teamRatings?.[teamId] ?? getTeamById(teamId)?.stats;
          if (!r) return <div className="text-xs text-muted-foreground">Sin datos de rendimiento.</div>;
          return <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[['VEL', r.speed], ['SAL', r.jump], ['POT', r.power], ['DEF', r.defense]].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border/60 bg-card/40 p-3 text-center">
                <div className="text-[10px] text-muted-foreground tracking-widest">{label}</div>
                <div className="font-display text-2xl text-celeste">{value}</div>
              </div>
            ))}
          </div>;
        })()}
      </div>

      <div className="hud-panel p-4 lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-display text-lg tracking-wide">🧠 Desarrollo del club</div>
            <div className="text-xs text-muted-foreground">Invertí dinero para mejorar el crecimiento de stats y los ingresos entre temporadas.</div>
          </div>
          <div className="text-xs text-celeste font-display">Caja ${budget}</div>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {CLUB_DEVELOPMENT_CATALOG.map(opt => {
            const level = state.clubDevelopment?.[opt.key] ?? 0;
            const maxed = level >= opt.costs.length;
            const cost = opt.costs[level];
            return <div key={opt.key} className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-sm">{opt.name}</div>
                <div className="text-[10px] text-celeste">NIVEL {level}/{opt.costs.length}</div>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 min-h-[32px]">{opt.desc}</div>
              <div className="mt-2 flex gap-1">{opt.costs.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded ${i < level ? "bg-celeste" : "bg-white/10"}`} />)}</div>
              <button disabled={maxed || budget < cost} onClick={() => onDevelopment(opt.key)} className="w-full mt-3 py-2 rounded-lg bg-celeste text-primary-foreground font-display text-xs disabled:opacity-35">
                {maxed ? "MAX" : `INVERTIR $${cost}`}
              </button>
            </div>;
          })}
        </div>
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

function OficinaTab({ state, budget, season, onActivate, onAbandon, onSignSponsor, onCancelSponsor }: {
  state: CareerState; budget: number; season: number;
  onActivate: (k: typeof CORRUPTION_CATALOG[number]["kind"]) => void;
  onAbandon: () => void;
  onSignSponsor: (d: SponsorDeal) => void;
  onCancelSponsor: () => void;
}) {
  const active = state.activeCorruption && state.activeCorruption.matchesLeft > 0 ? state.activeCorruption : null;
  return (
    <div className="space-y-4">
    <SponsorsPanel budget={budget} season={season} deal={state.sponsor ?? null}
      onSign={onSignSponsor} onCancel={onCancelSponsor} />
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
    </div>
  );
}

/* ============================ SHELL ============================ */

function PersonalizarTab({ teamId }: { teamId: string }) {
  const t = getTeamById(teamId);
  const music = useCareerMusicContext();
  if (!t) return null;
  const kits = [
    { name: "Titular", primary: t.primary, secondary: t.secondary ?? "#111" },
    { name: "Alternativa", primary: t.secondary ?? "#111", secondary: t.primary },
  ];
  const toggleTrack = (id: string) => {
    if (!music) return;
    const disabled = music.prefs.disabled_track_ids.includes(id)
      ? music.prefs.disabled_track_ids.filter(x => x !== id)
      : [...music.prefs.disabled_track_ids, id];
    music.setPrefs({ ...music.prefs, disabled_track_ids: disabled });
  };
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

      {/* Música de fondo del Modo Carrera */}
      <div className="hud-rise hud-card p-5 sm:col-span-2 lg:col-span-3" style={{ animationDelay: "240ms" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">🎵 Música de fondo</div>
          {music && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <span>{music.prefs.music_enabled ? "Activada" : "Desactivada"}</span>
              <input type="checkbox" checked={music.prefs.music_enabled}
                onChange={e => music.setPrefs({ ...music.prefs, music_enabled: e.target.checked })} />
            </label>
          )}
        </div>
        {!music || music.tracks.length === 0 ? (
          <div className="text-xs text-muted-foreground">Todavía no hay canciones cargadas por el admin.</div>
        ) : (
          <div className={`grid sm:grid-cols-2 gap-2 ${!music.prefs.music_enabled ? "opacity-40 pointer-events-none" : ""}`}>
            {music.tracks.map(track => {
              const disabled = music.prefs.disabled_track_ids.includes(track.id);
              return (
                <label key={track.id} className="flex items-center gap-3 rounded-lg border border-border p-2 cursor-pointer hover:bg-secondary/40 transition">
                  {track.cover_url ? (
                    <img src={track.cover_url} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-secondary grid place-items-center shrink-0 text-sm">🎵</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{track.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
                  </div>
                  <input type="checkbox" checked={!disabled} onChange={() => toggleTrack(track.id)} />
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ SHELL ============================ */

function Shell({ children, hideNav, musicActive = true }: { children: React.ReactNode; hideNav?: boolean; musicActive?: boolean }) {
  // Música de fondo: solo suena en el menú de Carrera. Intro y partidos la pausan.
  const music = useCareerMusic(musicActive);
  return (
    <CareerMusicContext.Provider value={music}>
      <div className="relative min-h-screen flex flex-col hud-shell" data-sfx-root>
        <AmbientStadium />
        <div className="relative z-10 flex flex-1 flex-col">
          {!hideNav && <Nav />}
          <main className="flex-1 w-full max-w-[1400px] mx-auto px-3 sm:px-6 py-5 hud-boot">{children}</main>
        </div>
        <NowPlayingToast track={music.current} show={music.showToast} />
      </div>
    </CareerMusicContext.Provider>
  );
}
