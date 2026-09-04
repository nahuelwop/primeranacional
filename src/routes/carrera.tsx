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

    try {
      const simulated = simulateRegionalTournament(roster);
      const otherChampions = simulated.regionalChampions.filter(id => {
        const meta = getRegionalTeamMeta(id);
        return !!meta && meta.region !== myMeta.region;
      });

      if (otherChampions.length) {
        nationalOpponent =
          sortStandings(
            otherChampions
              .map(id => allRows.find(r => r.teamId === id))
              .filter(Boolean) as StandingRow[]
          )[0]?.teamId ?? otherChampions[0];
      }
    } catch {}

    seedReducidoFromCareer({
      standA: unique,
      standB: [],
      userTeamId: userId,
      season,
      difficulty: (source.difficulty ?? "normal") as any,
      division: "regional_federal_amateur",
      regionalNationalOpponent: nationalOpponent,
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

    const standA =
      d === "primera_b"
        ? state.standings
        : (state.zone === "A" ? state.standings : (state.otherStandings ?? []));

    const standB =
      d === "primera_b"
        ? []
        : (state.zone === "B" ? state.standings : (state.otherStandings ?? []));

    seedReducidoFromCareer({
      standA,
      standB,
      userTeamId: teamId,
      season,
      difficulty: (state.difficulty ?? "normal") as any,
      division:
        d === "primera_nacional" ||
        d === "primera_b" ||
        d === "primera_c" ||
        d === "promocional_amateur"
          ? d
          : "primera_nacional",
    });

    navigate({ to: "/reducido" });
  }

  async function advanceSeason() {
    if (!state || !teamId || !user || !isSeasonFinished(state) || transitioning) return;

    setTransitioning(true);

    try {
      const currentDivision = careerDivision(state, teamId);
      const completed = recordSeasonSnapshot(
        { ...state, userTeamId: teamId },
        season
      );

      const needPlayoff = getCareerPlayoffNeed(completed, teamId);
      const tournamentState = useTournament.getState();
      const tournamentMatches =
        tournamentState.division === currentDivision &&
        tournamentState.season === season &&
        tournamentState.userTeamId === teamId;

      if (needPlayoff) {
        let playoffReady = false;
        let promoted = false;

        if (tournamentMatches) {
          const final = tournamentState.finalDirecta;
          const userInFinal =
            !!final &&
            (final.a === teamId || final.b === teamId);
          const finalWon =
            userInFinal && final?.winner === teamId;
          const finalLost =
            userInFinal &&
            !!final?.winner &&
            final.winner !== teamId;
          const reducedFinished =
            tournamentState.reducidoChampion !== undefined;

          if (currentDivision === "regional_federal_amateur") {
            const regionalChampion = tournamentState.regionalChampion;
            const nationalFinal = tournamentState.regionalNationalFinal;
            const regionalWon = regionalChampion === teamId;
            const nationalFinished = !!nationalFinal?.winner;

            if (!regionalWon) {
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
            promoted =
              tournamentState.reducidoChampion === teamId;
          } else if (userInFinal) {
            if (!final?.winner) {
              playoffReady = false;
            } else if (finalWon) {
              playoffReady = true;
              promoted = true;
            } else if (finalLost) {
              playoffReady = reducedFinished;
              promoted =
                tournamentState.reducidoChampion === teamId;
            }
          } else {
            playoffReady = reducedFinished;
            promoted =
              tournamentState.reducidoChampion === teamId;
          }
        }

        if (!playoffReady) {
          if (!tournamentMatches) {
            if (currentDivision === "regional_federal_amateur") {
              if (!seedRegionalPlayoffFromState(completed, teamId)) {
                throw new Error(
                  "No se pudo preparar el playoff del Regional Federal Amateur."
                );
              }
            } else {
              const standA =
                currentDivision === "primera_b"
                  ? completed.standings
                  : (completed.zone === "A"
                      ? completed.standings
                      : (completed.otherStandings ?? []));

              const standB =
                currentDivision === "primera_b"
                  ? []
                  : (completed.zone === "B"
                      ? completed.standings
                      : (completed.otherStandings ?? []));

              seedReducidoFromCareer({
                standA,
                standB,
                userTeamId: teamId,
                season,
                difficulty:
                  (completed.difficulty ?? "normal") as any,
                division: currentDivision as any,
              });
            }
          }

          const pending = {
            ...completed,
            pendingPlayoff: {
              division: currentDivision,
              season,
            },
          };

          if (!(await persist(pending, budget, season))) return;

          setState(pending);
          navigate({ to: "/reducido" });
          return;
        }

        const completedWithPlayoff = {
          ...completed,
          pendingPlayoff: undefined,
        };

        const movement = resolveLeagueMovements(
          completedWithPlayoff,
          season,
          { promoted }
        );

        if (movement.ended) {
          const endedState: CareerState = {
            ...completedWithPlayoff,
            leagueRosters: movement.rosters,
            careerEnded: true,
            careerEndReason: movement.endReason,
            userTeamId: teamId,
          };

          if (await persist(endedState, budget, season)) {
            setState(endedState);
          }

          return;
        }

        const nextDivision =
          movement.userNextDivision ?? currentDivision;

        const fresh = buildSeason(
          teamId,
          nextDivision,
          movement.rosters,
          completed.federalZoneMap
        );

        fresh.totalGoalsScored = completed.totalGoalsScored;
        fresh.bestUnbeaten = completed.bestUnbeaten;
        fresh.streakUnbeaten = 0;
        fresh.zoneChampions = [...completed.zoneChampions];
        fresh.seasonHistory = [...(completed.seasonHistory ?? [])];
        fresh.difficulty = completed.difficulty;
        fresh.objetivo =
          nextDivision === "primera_division"
            ? "salir_campeon"
            : "ascenso_directo";
        fresh.sponsor = completed.sponsor ?? null;
        fresh.stadiumUpgrades = completed.stadiumUpgrades;
        fresh.introVista = false;
        fresh.leagueRosters = movement.rosters;
        fresh.userTeamId = teamId;
        fresh.teamRatings =
          movement.teamRatings ??
          evolveTeamRatings(completed);
        fresh.clubDevelopment = {
          ...(completed.clubDevelopment ?? {}),
        };
        fresh.totalMatchesPlayed =
          completed.totalMatchesPlayed ?? 0;
        fresh.totalWins = completed.totalWins ?? 0;
        fresh.totalDraws = completed.totalDraws ?? 0;
        fresh.totalLosses = completed.totalLosses ?? 0;
        fresh.careerTrophies =
          (completed.careerTrophies ?? 0) +
          (promoted ? 1 : 0);

        for (const key of checkCareerAchievementKeys(
          completed,
          budget
        )) {
          await tryUnlock(key);
        }

        if (promoted) {
          await tryUnlock("ascenso");

          if (nextDivision === "primera_division") {
            await tryUnlock("ascenso_a_primera");
          }
        }

        const nextSeason = season + 1;

        if (!(await persist(fresh, budget, nextSeason))) return;

        setSeason(nextSeason);
        setState(fresh);
        setTab("inicio");

        return;
      }

      const movement = resolveLeagueMovements(
        completed,
        season
      );

      if (movement.ended) {
        const endedState: CareerState = {
          ...completed,
          leagueRosters: movement.rosters,
          careerEnded: true,
          careerEndReason: movement.endReason,
          userTeamId: teamId,
        };

        if (await persist(endedState, budget, season)) {
          setState(endedState);
        }

        return;
      }

      const nextDivision =
        movement.userNextDivision ?? currentDivision;

      const fresh = buildSeason(
        teamId,
        nextDivision,
        movement.rosters,
        completed.federalZoneMap
      );

      fresh.totalGoalsScored = completed.totalGoalsScored;
      fresh.bestUnbeaten = completed.bestUnbeaten;
      fresh.streakUnbeaten = 0;
      fresh.zoneChampions = [...completed.zoneChampions];
      fresh.seasonHistory = [...(completed.seasonHistory ?? [])];
      fresh.difficulty = completed.difficulty;
      fresh.objetivo =
        nextDivision === "primera_division"
          ? "salir_campeon"
          : "ascenso_directo";
      fresh.sponsor = completed.sponsor ?? null;
      fresh.stadiumUpgrades = completed.stadiumUpgrades;
      fresh.introVista = false;
      fresh.leagueRosters = movement.rosters;
      fresh.userTeamId = teamId;
      fresh.teamRatings =
        movement.teamRatings ??
        evolveTeamRatings(completed);
      fresh.clubDevelopment = {
        ...(completed.clubDevelopment ?? {}),
      };
      fresh.totalMatchesPlayed =
        completed.totalMatchesPlayed ?? 0;
      fresh.totalWins = completed.totalWins ?? 0;
      fresh.totalDraws = completed.totalDraws ?? 0;
      fresh.totalLosses = completed.totalLosses ?? 0;
      fresh.careerTrophies =
        completed.careerTrophies ?? 0;

      if (
        movement.userNextDivision &&
        movement.userNextDivision !==
          careerDivision(completed, teamId)
      ) {
        fresh.careerTrophies =
          (completed.careerTrophies ?? 0) + 1;

        await tryUnlock("ascenso");

        if (movement.userNextDivision === "primera_division") {
          await tryUnlock("ascenso_a_primera");
        }
      }

      for (const key of checkCareerAchievementKeys(
        completed,
        budget
      )) {
        await tryUnlock(key);
      }

      const nextSeason = season + 1;

      if (!(await persist(fresh, budget, nextSeason))) return;

      setSeason(nextSeason);
      setState(fresh);
      setTab("inicio");
    } catch (error) {
      console.error(
        "Error al cerrar la temporada",
        error
      );

      alert(
        "No se pudo cerrar la temporada. Tu partida no fue reemplazada. Revisá la consola y volvé a intentarlo."
      );
    } finally {
      setTransitioning(false);
    }
  }

  if (loading || busy) {
    return (
      <Shell>
        <div className="p-16 text-center text-muted-foreground font-display tracking-widest">
          CARGANDO…
        </div>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="max-w-md mx-auto mt-16 hud-panel p-8 text-center">
          <h1 className="font-display text-4xl mb-3">
            MODO CARRERA
          </h1>

          <p className="text-muted-foreground mb-5">
            Iniciá sesión para guardar tu progreso y
            desbloquear logros.
          </p>

          <Link
            to="/auth"
            className="inline-block px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider"
          >
            Iniciar sesión
          </Link>
        </div>
      </Shell>
    );
  }

  if (state?.careerEnded) {
    return (
      <Shell>
        <div className="max-w-xl mx-auto mt-16 hud-panel p-8 text-center">
          <div className="text-4xl mb-3">📉</div>

          <h1 className="font-display text-4xl text-destructive mb-3">
            CARRERA FINALIZADA
          </h1>

          <p className="text-muted-foreground">
            {state.careerEndReason ??
              "La temporada terminó y tu club salió de las categorías jugables."}
          </p>

          <button
            onClick={abandon}
            className="mt-6 px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider"
          >
            VOLVER A ELEGIR CLUB
          </button>
        </div>
      </Shell>
    );
  }

  if (state && teamId && !state.difficulty) {
    return (
      <Shell>
        <DifficultyPicker
          onPick={async (d) => {
            const next = {
              ...state,
              difficulty: d,
              objetivo:
                state.objetivo ??
                (isFirstDivision(state, teamId)
                  ? "salir_campeon"
                  : "ascenso_directo") as Objetivo,
            };

            setState(next);
            await persist(next);
          }}
        />
      </Shell>
    );
  }

  if (
    state &&
    teamId &&
    state.difficulty &&
    !state.introVista
  ) {
    return (
      <Shell musicActive={false}>
        <SeasonIntro
          season={season}
          teamId={teamId}
          division={careerDivision(state, teamId)}
          objetivo={
            OBJETIVO_LABEL[
              state.objetivo ??
                (isFirstDivision(state, teamId)
                  ? "salir_campeon"
                  : "ascenso_directo")
            ]
          }
          videoUrl={
            introVideos[careerDivision(state, teamId)] ??
            null
          }
          onDone={async () => {
            const next = {
              ...state,
              introVista: true,
            };

            setState(next);
            await persist(next);
          }}
        />
      </Shell>
    );
  }

  if (
    playing &&
    state &&
    team &&
    nextMatch &&
    teamId
  ) {
    const userIsHome = nextMatch.home === teamId;
    const effectiveDivision = careerDivision(
      state,
      teamId
    );
    const leftBase = careerTeam(state, teamId);
    const rightBase = userIsHome
      ? careerTeam(state, nextMatch.away)
      : careerTeam(state, nextMatch.home);

    const leftTeam = leftBase
      ? { ...leftBase, division: effectiveDivision }
      : undefined;

    const rightTeam = rightBase
      ? { ...rightBase, division: effectiveDivision }
      : undefined;

    if (!leftTeam || !rightTeam) {
      return (
        <Shell>
          <div className="p-16 text-center text-destructive">
            No se pudo cargar uno de los equipos de esta división.
          </div>
        </Shell>
      );
    }

    const fx = currentCorruptionEffects(state);

    return (
      <Shell musicActive={false}>
        <div className="text-center text-sm text-muted-foreground mb-2">
          Temporada {season} · Fecha {nextMatch.round} ·{" "}
          {userIsHome ? "Local" : "Visitante"}

          {state.difficulty && (
            <span className="ml-2 text-celeste">
              · {DIFFICULTY_INFO[state.difficulty].emoji}{" "}
              {DIFFICULTY_INFO[state.difficulty].label}
            </span>
          )}
        </div>

        <Game
          home={leftTeam}
          away={rightTeam}
          duration={60}
          mode="1vAI"
          sharedNarrator
          aiDifficulty={toGameAi(
            state.difficulty ?? "normal"
          )}
          crowdIntensity={
            leftTeam?.rivals?.includes(
              rightTeam?.id ?? ""
            ) ||
            rightTeam?.rivals?.includes(
              leftTeam?.id ?? ""
            )
              ? "clasico"
              : "normal"
          }
          startingScore={fx.startingScore}
          cancelOpponentGoals={fx.cancelOpponentGoals ?? 0}
          doubleGoalChance={fx.doubleGoalChance ?? 0}
          onEnd={onMatchEnd}
          onExit={() => setPlaying(false)}
        />
      </Shell>
    );
  }

  if (!state || !teamId) {
    const firstDivisionTeams =
      getTeamsByDivision("primera_division");

    return (
      <Shell>
        {/* resto del archivo igual que el tuyo */}
      </Shell>
    );
  }

  const division = careerDivision(state, teamId);
  const first = division === "primera_division";
  const standings = sortStandings(state.standings);
  const myPos =
    standings.findIndex(r => r.teamId === teamId) + 1;
  const indicators = clubIndicators(
    state,
    budget,
    teamId
  );
  const round = currentRound(state);
  const rounds = totalRounds(state);

  const overall = Math.round(
    indicators.reduce(
      (s, i) => s + i.value,
      0
    ) / Math.max(1, indicators.length)
  );

  return (
    <Shell hideNav>
      {/* ... */}

      <div key={tab} className="mt-3 hud-tab-enter">
        {tab === "inicio" && (
          <InicioTab
            state={state}
            teamId={teamId}
            season={season}
            nextMatch={nextMatch}
            indicators={indicators}
            standings={standings}
            budget={budget}
            division={division}

            /* CORRECCIÓN */
            transitioning={transitioning}

            onPlay={() => setPlaying(true)}
            onSimulate={onSimulateMatch}
            onAdvance={advanceSeason}
            onGo={setTab}
            onGoReducido={goToReducido}
          />
        )}

        {/* resto del contenido igual que el tuyo */}
      </div>
    </Shell>
  );
}

/* ============================ INICIO ============================ */

function InicioTab({
  state,
  teamId,
  season,
  nextMatch,
  indicators,
  standings,
  budget,
  division,

  /* CORRECCIÓN */
  transitioning,

  onPlay,
  onSimulate,
  onAdvance,
  onGo,
  onGoReducido,
}: {
  state: CareerState;
  teamId: string;
  season: number;
  nextMatch: Match | null;
  indicators: ReturnType<typeof clubIndicators>;
  standings: StandingRow[];
  budget: number;
  division: DivisionId;

  /* CORRECCIÓN */
  transitioning: boolean;

  onPlay: () => void;
  onSimulate: () => void;
  onAdvance: () => void;
  onGo: (t: TopTab) => void;
  onGoReducido: () => void;
}) {
  // El resto de InicioTab queda exactamente igual.
  // Ahora "transitioning" existe dentro del componente
  // y el botón de Nueva Temporada funciona correctamente.

  // ...
}
```
