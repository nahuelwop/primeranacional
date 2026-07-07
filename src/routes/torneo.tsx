import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS_BY_ID, ZONE_A, ZONE_B } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { sortStandings, StandingRow } from "@/lib/tournament";
import { useTournament } from "@/store/tournament";
import { Game } from "@/components/Game";
import { SeasonIntro } from "@/components/SeasonIntro";
import { SeasonStartCard } from "@/components/SeasonStartCard";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { MatchSimOverlay } from "@/components/MatchSimOverlay";
import { RoundSummary } from "@/components/RoundSummary";
import { MatchPrediction } from "@/components/MatchPrediction";
import { CoimasMenu } from "@/components/CoimasMenu";
import { useGameSettings } from "@/lib/game-settings";
import { DIFFICULTY_INFO, toGameAi } from "@/lib/difficulty";
import { OBJETIVO_LABEL, type Objetivo } from "@/lib/career";
import { predictMatch, isImportantMatch } from "@/lib/predictions";
import { generateRoundNews, type NewsItem } from "@/lib/news-generator";

export const Route = createFileRoute("/torneo")({
  head: () => ({
    meta: [
      { title: "Torneo · Primera Heads" },
      { name: "description", content: "Campaña de la Primera Nacional Argentina en formato arcade." },
    ],
  }),
  component: TorneoPage,
});

function TorneoPage() {
  useTeamsSync();
  const { settings } = useGameSettings();
  const s = useTournament();
  useEffect(() => { s.init(); }, []);
  const totalRounds = useMemo(() => Math.max(0, ...s.fixture.map(m => m.round)), [s.fixture]);
  const [tab, setTab] = useState<"A" | "B" | "ambas">("A");
  const [playId, setPlayId] = useState<string | null>(null);
  const [simId, setSimId] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<{ hg: number; ag: number } | null>(null);
  const [roundSummary, setRoundSummary] = useState<{ round: number; news: NewsItem[] } | null>(null);
  const [showObjetivoPicker, setShowObjetivoPicker] = useState(false);

  // El usuario NO puede saltar fechas.
  const round = Math.min(s.currentRound, totalRounds || 1);

  // Auto-sim rivales de la fecha actual (los del usuario los juega/simula él).
  useEffect(() => {
    if (s.userTeamId && s.currentRound <= totalRounds) s.playRound(s.currentRound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.currentRound, s.userTeamId, totalRounds]);

  // Detectar cambio de fecha → resumen
  useEffect(() => {
    if (!s.userTeamId) return;
    const completedRound = s.currentRound - 1;
    if (completedRound < 1) return;
    if (s.lastRoundSummarized >= completedRound) return;
    const roundMatches = s.fixture.filter(m => m.round === completedRound);
    if (!roundMatches.every(m => m.played)) return;
    const before: StandingRow[] = tab === "B" ? s.standB : s.standA;
    // Snapshot "antes" no lo tenemos exacto → reusamos actual como base (aprox suficiente para noticias)
    const news = generateRoundNews({
      round: completedRound,
      standingsBefore: before,
      standingsAfter: before,
      matches: roundMatches,
      allPlayed: s.fixture.filter(m => m.played),
    });
    setRoundSummary({ round: completedRound, news });
    s.setLastRoundSummarized(completedRound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.currentRound, s.userTeamId, s.fixture, s.lastRoundSummarized]);

  // === Selector de equipo (campaña) ===
  if (!s.userTeamId) return <TeamPicker onPick={(id) => {
    s.setUserTeam(id);
    const z = TEAMS_BY_ID[id]?.zone;
    if (z === "A" || z === "B") setTab(z);
    setShowObjetivoPicker(true);
  }} />;

  const userTeam = TEAMS_BY_ID[s.userTeamId];

  // Difficulty picker (una sola vez por temporada, antes de la intro)
  if (s.difficulty === undefined || (!s.introVista && !localStorage.getItem(`t-diff-picked-s${s.season}`))) {
    // Ya hay un default "normal"; sólo mostrar picker si aún no eligió esta temporada
  }
  // Determinar si mostramos picker
  const diffPickedKey = `t-diff-picked-s${s.season}`;
  const showDiffPicker = !localStorage.getItem(diffPickedKey);

  if (showObjetivoPicker) return (
    <ObjetivoPicker onPick={(o) => { s.setObjetivo(o); setShowObjetivoPicker(false); }} />
  );

  if (showDiffPicker) return (
    <DifficultyPicker onPick={(d) => {
      s.setDifficulty(d);
      localStorage.setItem(diffPickedKey, "1");
    }} />
  );

  if (!s.introVista) return (
    <SeasonIntro
      season={s.season}
      teamId={s.userTeamId}
      objetivo={OBJETIVO_LABEL[s.objetivo]}
      videoUrl={settings.intro_video_url}
      onDone={() => s.setIntroVista(true)}
    />
  );

  const playMatch = s.fixture.find(m => m.id === playId) ?? null;
  const simMatch = s.fixture.find(m => m.id === simId) ?? null;
  const nextUserMatch = s.fixture.find(m =>
    !m.played && (m.home === s.userTeamId || m.away === s.userTeamId)
  );

  const fixtureRound = s.fixture.filter(m => {
    if (m.round !== round) return false;
    if (tab === "ambas") return true;
    const hz = TEAMS_BY_ID[m.home]?.zone, az = TEAMS_BY_ID[m.away]?.zone;
    return hz === tab || az === tab;
  });

  // Predicción del partido destacado del usuario en la fecha
  let prediction: { m: typeof nextUserMatch; p: ReturnType<typeof predictMatch> } | null = null;
  if (nextUserMatch) {
    const zoneStand = TEAMS_BY_ID[s.userTeamId]?.zone === "A" ? s.standA : s.standB;
    if (isImportantMatch(nextUserMatch.home, nextUserMatch.away, zoneStand)) {
      prediction = { m: nextUserMatch, p: predictMatch(nextUserMatch.home, nextUserMatch.away, zoneStand, s.fixture.filter(x => x.played)) };
    }
  }

  const standingsA = sortStandings(s.standA);
  const standingsB = sortStandings(s.standB);
  const allPlayed = totalRounds > 0 && s.fixture.every(m => m.played);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-celeste font-display tracking-[0.3em] text-xs">CAMPAÑA · TEMPORADA {2025 + s.season}</p>
            <h1 className="font-display text-5xl">PRIMERA NACIONAL</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Shield team={userTeam} size={28} />
              <span className="font-display text-lg">{userTeam.name}</span>
              <span className="text-xs text-muted-foreground">· Fecha {round}/{totalRounds}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-secondary">{DIFFICULTY_INFO[s.difficulty].emoji} {DIFFICULTY_INFO[s.difficulty].label}</span>
              <span className="text-xs text-muted-foreground">Objetivo: {OBJETIVO_LABEL[s.objetivo]}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextUserMatch && (
              <>
                <button onClick={() => setPlayId(nextUserMatch.id)}
                  className="px-5 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider glow-celeste">
                  JUGAR (Fecha {nextUserMatch.round})
                </button>
                <button onClick={() => setSimId(nextUserMatch.id)}
                  className="px-4 py-3 rounded-xl bg-secondary border border-border font-display tracking-wider">
                  SIMULAR
                </button>
              </>
            )}
            <Link to="/resultados" className="px-4 py-3 rounded-xl bg-secondary border border-border font-display tracking-wider text-sm">
              CENTRO DE RESULTADOS
            </Link>
            <button onClick={() => {
              if (confirm("¿Reiniciar campaña? Se pierde todo el progreso.")) {
                s.reset();
                localStorage.removeItem(diffPickedKey);
              }
            }}
              className="px-4 py-2 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive font-display tracking-wider text-sm">
              REINICIAR
            </button>
          </div>
        </div>

        {prediction && (
          <div className="mb-6">
            <MatchPrediction homeId={prediction.m!.home} awayId={prediction.m!.away} prediction={prediction.p} />
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {(["A", "B", "ambas"] as const).map(z => (
            <button key={z} onClick={() => setTab(z)}
              className={`px-5 py-2 rounded-lg font-display tracking-wider ${tab===z ? "bg-celeste text-primary-foreground" : "bg-secondary"}`}>
              {z === "ambas" ? "AMBAS ZONAS" : `ZONA ${z}`}
            </button>
          ))}
        </div>

        {tab === "ambas" ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <StandingsTable rows={standingsA} userTeamId={s.userTeamId} title="ZONA A" />
            <StandingsTable rows={standingsB} userTeamId={s.userTeamId} title="ZONA B" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <StandingsTable rows={tab === "A" ? standingsA : standingsB} userTeamId={s.userTeamId} title={`ZONA ${tab}`} />

            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-2xl">FECHA {round}</h2>
                <span className="text-xs text-muted-foreground">Los rivales se simulan solos</span>
              </div>
              <div className="space-y-2">
                {fixtureRound.map(m => {
                  const h = TEAMS_BY_ID[m.home], a = TEAMS_BY_ID[m.away];
                  const isUser = m.home === s.userTeamId || m.away === s.userTeamId;
                  return (
                    <div key={m.id} className={`flex items-center justify-between gap-3 p-2 rounded-lg border ${
                      isUser ? "border-celeste/70 bg-celeste/10" :
                      m.isClasico ? "border-accent/60 bg-accent/5" : "border-border bg-background"
                    }`}>
                      <div className="flex items-center gap-2 flex-1 justify-end text-right min-w-0">
                        <span className="text-sm truncate">{h.short}</span>
                        <Shield team={h} size={24} />
                      </div>
                      <div className="font-display text-lg w-16 text-center tabular-nums">
                        {m.played ? `${m.homeGoals}-${m.awayGoals}` : "vs"}
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Shield team={a} size={24} />
                        <span className="text-sm truncate">{a.short}</span>
                      </div>
                      {!m.played && isUser && (
                        <div className="flex gap-1">
                          <button onClick={() => setPlayId(m.id)}
                            className="px-2 py-1 rounded bg-celeste text-primary-foreground font-display text-xs">JUGAR</button>
                          <button onClick={() => setSimId(m.id)}
                            className="px-2 py-1 rounded bg-secondary border border-border font-display text-xs">SIM</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Coimas & Arreglos (torneo) */}
        {settings.coimas_enabled && (
          <div className="mt-6">
            <CoimasMenu mode="torneo" settings={settings} />
          </div>
        )}

        {playMatch && (() => {
          const userIsAway = playMatch.away === s.userTeamId;
          const leftTeam = TEAMS_BY_ID[s.userTeamId!];
          const rightTeam = userIsAway ? TEAMS_BY_ID[playMatch.home] : TEAMS_BY_ID[playMatch.away];
          const crowdIntensity: "normal" | "clasico" | "ascenso" = playMatch.isClasico ? "clasico" : "normal";
          return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-4 flex items-start justify-center">
            <div className="w-full max-w-4xl bg-card rounded-2xl border border-border p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-display text-2xl text-celeste">JUGÁ TU PARTIDO</h2>
                <button onClick={() => setPlayId(null)}
                  className="px-3 py-1 rounded-lg bg-secondary border border-border text-sm">CERRAR</button>
              </div>
              <Game
                home={leftTeam}
                away={rightTeam}
                duration={60}
                aiDifficulty={toGameAi(s.difficulty)}
                mode="1vAI"
                crowdIntensity={crowdIntensity}
                matchLabel={playMatch.isClasico ? "CLÁSICO" : undefined}
                onEnd={(lg, rg) => {
                  const hg = userIsAway ? rg : lg;
                  const ag = userIsAway ? lg : rg;
                  s.recordUserMatch(playMatch.id, hg, ag);
                  setPlayId(null);
                }}
              />
            </div>
          </div>
          );
        })()}

        {simMatch && !simResult && (() => {
          const res = s.simulateUserMatch(simMatch.id);
          if (res) setSimResult(res);
          return null;
        })()}

        {simMatch && simResult && (
          <MatchSimOverlay
            homeId={simMatch.home} awayId={simMatch.away}
            hg={simResult.hg} ag={simResult.ag}
            onDone={() => { setSimId(null); setSimResult(null); }}
          />
        )}

        {roundSummary && (
          <RoundSummary round={roundSummary.round} news={roundSummary.news}
            onClose={() => setRoundSummary(null)} />
        )}

        {allPlayed && (
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-celeste/20 to-accent/20 border border-celeste/40 text-center">
            <p className="font-display text-xl text-celeste">FASE FINAL DISPONIBLE</p>
            <p className="text-sm text-muted-foreground mt-1">Definí el primer y segundo ascenso.</p>
            <div className="flex gap-2 justify-center mt-4 flex-wrap">
              <Link to="/reducido" className="px-6 py-3 rounded-xl bg-accent text-accent-foreground font-display tracking-wider">IR A LA FASE FINAL</Link>
              <button onClick={() => {
                s.newSeason();
                localStorage.removeItem(diffPickedKey);
                setShowObjetivoPicker(true);
              }} className="px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider">
                NUEVA TEMPORADA
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ObjetivoPicker({ onPick }: { onPick: (o: Objetivo) => void }) {
  const opts: Objetivo[] = ["ascenso_directo", "reducido", "mantener"];
  return (
    <div className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4">
      <div className="w-full max-w-2xl bg-card rounded-2xl border border-border p-6">
        <p className="text-celeste font-display tracking-[0.3em] text-xs">TU TEMPORADA</p>
        <h2 className="font-display text-4xl mb-4">OBJETIVO</h2>
        <div className="grid gap-3">
          {opts.map(o => (
            <button key={o} onClick={() => onPick(o)}
              className="text-left p-4 rounded-xl bg-background border border-border hover:border-celeste transition font-display text-xl">
              {OBJETIVO_LABEL[o]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamPicker({ onPick }: { onPick: (id: string) => void }) {
  const [zone, setZone] = useState<"A" | "B">("A");
  const teams = zone === "A" ? ZONE_A : ZONE_B;
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10">
        <p className="text-celeste font-display tracking-[0.3em] text-xs">CAMPAÑA</p>
        <h1 className="font-display text-5xl mb-2">ELEGÍ TU EQUIPO</h1>
        <p className="text-muted-foreground mb-6">Llevá a tu club por toda la temporada de la Primera Nacional 2026.</p>
        <div className="flex gap-2 mb-4">
          {(["A","B"] as const).map(z => (
            <button key={z} onClick={() => setZone(z)}
              className={`px-5 py-2 rounded-lg font-display tracking-wider ${zone===z ? "bg-celeste text-primary-foreground" : "bg-secondary"}`}>
              ZONA {z}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {teams.map(t => (
            <button key={t.id} onClick={() => onPick(t.id)}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-celeste hover:bg-celeste/5 transition text-left">
              <Shield team={t} size={36} />
              <div>
                <div className="font-display text-sm">{t.name}</div>
                <div className="text-[10px] text-muted-foreground">VEL {t.stats.speed} · POT {t.stats.power}</div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function StandingsTable({ rows, userTeamId, title }: { rows: StandingRow[]; userTeamId?: string; title?: string }) {
  const total = rows.length;
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border font-display text-2xl">{title ?? "TABLA"}</div>
      <table className="w-full text-sm">
        <thead className="text-muted-foreground text-xs">
          <tr className="text-left">
            <th className="px-3 py-2">#</th><th>Equipo</th>
            <th className="px-1">PJ</th><th className="px-1">PG</th>
            <th className="px-1">PE</th><th className="px-1">PP</th>
            <th className="px-1">DG</th><th className="px-2 text-right">PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const team = TEAMS_BY_ID[r.teamId];
            const isUser = r.teamId === userTeamId;
            const isDescenso = i >= total - 2;
            const rowClass =
              isUser ? "bg-celeste/15 ring-1 ring-celeste/40" :
              i === 0 ? "bg-celeste/10" :
              isDescenso ? "bg-destructive/15" :
              i < 8 ? "bg-accent/5" : "";
            return (
              <tr key={r.teamId} className={`border-t border-border ${rowClass}`}>
                <td className={`px-3 py-1.5 ${isDescenso ? "text-destructive font-bold" : "text-muted-foreground"}`}>{i+1}</td>
                <td className="flex items-center gap-2 py-1.5">
                  <Shield team={team} size={22} />
                  <span className="truncate">{team.name}</span>
                </td>
                <td className="px-1 text-center">{r.pj}</td>
                <td className="px-1 text-center">{r.pg}</td>
                <td className="px-1 text-center">{r.pe}</td>
                <td className="px-1 text-center">{r.pp}</td>
                <td className="px-1 text-center">{r.dg>0?`+${r.dg}`:r.dg}</td>
                <td className="px-2 py-1.5 text-right font-display text-celeste">{r.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border space-y-0.5">
        <div>▮ Final directa por 1er ascenso · ▮ Reducido (2°-8°)</div>
        <div className="text-destructive">▮ Zona de descenso (últimos 2)</div>
      </div>
    </div>
  );
}
