import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS_BY_ID, ZONE_A, ZONE_B } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { sortStandings, StandingRow } from "@/lib/tournament";
import { useTournament } from "@/store/tournament";
import { Game } from "@/components/Game";

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
  const s = useTournament();
  useEffect(() => { s.init(); }, []);
  const totalRounds = useMemo(() => Math.max(0, ...s.fixture.map(m => m.round)), [s.fixture]);
  const [zone, setZone] = useState<"A" | "B">("A");
  const [round, setRound] = useState(1);
  const [playId, setPlayId] = useState<string | null>(null);

  useEffect(() => { setRound(Math.min(s.currentRound, totalRounds || 1)); }, [s.currentRound, totalRounds]);

  // === Selector de equipo (campaña) ===
  if (!s.userTeamId) return <TeamPicker onPick={(id) => {
    s.setUserTeam(id);
    const z = TEAMS_BY_ID[id]?.zone;
    if (z === "A" || z === "B") setZone(z);
  }} />;

  const userTeam = TEAMS_BY_ID[s.userTeamId];
  const playMatch = s.fixture.find(m => m.id === playId) ?? null;
  const nextUserMatch = s.fixture.find(m =>
    !m.played && (m.home === s.userTeamId || m.away === s.userTeamId)
  );

  const fixtureRound = s.fixture.filter(m => {
    if (m.round !== round) return false;
    const hz = TEAMS_BY_ID[m.home]?.zone, az = TEAMS_BY_ID[m.away]?.zone;
    return hz === zone || az === zone;
  });

  const standings = zone === "A" ? s.standA : s.standB;
  const sorted = sortStandings(standings);
  const allPlayed = totalRounds > 0 && s.fixture.every(m => m.played);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-celeste font-display tracking-[0.3em] text-xs">CAMPAÑA</p>
            <h1 className="font-display text-5xl">PRIMERA NACIONAL</h1>
            <div className="flex items-center gap-2 mt-2">
              <Shield team={userTeam} size={28} />
              <span className="font-display text-lg">{userTeam.name}</span>
              <span className="text-xs text-muted-foreground">· Fecha {Math.min(s.currentRound, totalRounds)}/{totalRounds}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextUserMatch && (
              <button onClick={() => setPlayId(nextUserMatch.id)}
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-display tracking-wider">
                JUGAR PRÓXIMO
              </button>
            )}
            <button onClick={() => s.playRound(s.currentRound)}
              disabled={s.currentRound > totalRounds}
              className="px-4 py-2 rounded-lg bg-celeste text-primary-foreground font-display tracking-wider disabled:opacity-40">
              SIMULAR RIVALES
            </button>
            <button onClick={() => s.playAll()}
              disabled={s.currentRound > totalRounds}
              className="px-4 py-2 rounded-lg bg-secondary border border-border font-display tracking-wider disabled:opacity-40">
              SIMULAR HASTA MI PARTIDO
            </button>
            <button onClick={() => { if (confirm("¿Reiniciar campaña?")) s.reset(); }}
              className="px-4 py-2 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive font-display tracking-wider">
              REINICIAR
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(["A", "B"] as const).map(z => (
            <button key={z} onClick={() => setZone(z)}
              className={`px-5 py-2 rounded-lg font-display tracking-wider ${zone===z ? "bg-celeste text-primary-foreground" : "bg-secondary"}`}>
              ZONA {z}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <StandingsTable rows={sorted} userTeamId={s.userTeamId} />

          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-2xl">FECHA {round}</h2>
              <div className="flex gap-1">
                <button disabled={round<=1} onClick={() => setRound(r => r - 1)}
                  className="px-3 py-1 rounded bg-secondary disabled:opacity-30">‹</button>
                <button disabled={round>=totalRounds} onClick={() => setRound(r => r + 1)}
                  className="px-3 py-1 rounded bg-secondary disabled:opacity-30">›</button>
              </div>
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
                    <div className="flex items-center gap-2 flex-1 justify-end text-right">
                      <span className="text-sm truncate">{h.name}</span>
                      <Shield team={h} size={28} />
                    </div>
                    <div className="font-display text-xl w-20 text-center">
                      {m.played ? `${m.homeGoals} - ${m.awayGoals}` : "vs"}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <Shield team={a} size={28} />
                      <span className="text-sm truncate">{a.name}</span>
                    </div>
                    {!m.played && isUser && (
                      <button onClick={() => setPlayId(m.id)}
                        className="px-3 py-1 rounded-lg bg-celeste text-primary-foreground font-display text-xs tracking-wider">
                        JUGAR
                      </button>
                    )}
                  </div>
                );
              })}
              {fixtureRound.some(m => m.isClasico) && (
                <p className="text-xs text-accent">★ Fecha de Clásicos: rivales históricos en juego</p>
              )}
            </div>
          </div>
        </div>

        {playMatch && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-4 flex items-start justify-center">
            <div className="w-full max-w-4xl bg-card rounded-2xl border border-border p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-display text-2xl text-celeste">JUGÁ TU PARTIDO</h2>
                <button onClick={() => setPlayId(null)}
                  className="px-3 py-1 rounded-lg bg-secondary border border-border text-sm">CERRAR</button>
              </div>
              <Game
                home={TEAMS_BY_ID[playMatch.home]}
                away={TEAMS_BY_ID[playMatch.away]}
                duration={90}
                aiDifficulty="normal"
                mode="1vAI"
                onEnd={(hg, ag) => {
                  s.recordUserMatch(playMatch.id, hg, ag);
                  setPlayId(null);
                }}
              />
            </div>
          </div>
        )}

        {allPlayed && (
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-celeste/20 to-accent/20 border border-celeste/40 text-center">
            <p className="font-display text-xl text-celeste">FASE FINAL DISPONIBLE</p>
            <p className="text-sm text-muted-foreground mt-1">Definí el primer y segundo ascenso.</p>
            <a href="/reducido" className="inline-block mt-4 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-display tracking-wider">IR A LA FASE FINAL</a>
          </div>
        )}
      </main>
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

function StandingsTable({ rows, userTeamId }: { rows: StandingRow[]; userTeamId?: string }) {
  const total = rows.length;
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border font-display text-2xl">TABLA</div>
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
