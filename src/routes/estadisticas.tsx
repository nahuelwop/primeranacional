import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS_BY_ID } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { useAuth } from "@/lib/auth";
import { fetchAllHistory, fetchCareer, type HistoryRow } from "@/lib/career-api";
import { nextPendingMatchForUser } from "@/lib/career";

export const Route = createFileRoute("/estadisticas")({
  head: () => ({ meta: [
    { title: "Estadísticas · Primera Heads" },
    { name: "description", content: "Rankings globales de goles a favor y en contra, basados en partidos jugados por todos los usuarios." },
  ] }),
  component: EstadisticasPage,
});

function EstadisticasPage() {
  useTeamsSync();
  const { user } = useAuth();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextOwn, setNextOwn] = useState<{ home: string; away: string } | null>(null);

  useEffect(() => {
    (async () => {
      try { setRows(await fetchAllHistory()); } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!user) { setNextOwn(null); return; }
    (async () => {
      const save = await fetchCareer(user.id).catch(() => null);
      if (!save) { setNextOwn(null); return; }
      const m = nextPendingMatchForUser(save.state, save.team_id);
      setNextOwn(m ? { home: m.home, away: m.away } : null);
    })();
  }, [user]);

  const { goalsFor, goalsAgainst, played, totalMatches, totalGoals, trend } = useMemo(() => {
    const goalsFor: Record<string, number> = {};
    const goalsAgainst: Record<string, number> = {};
    const played: Record<string, number> = {};
    let totalGoals = 0;
    // Tendencia: goles totales acumulados por bloques de partidos (del más viejo al más nuevo)
    const sorted = [...rows].sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());
    const bucketCount = 12;
    const bucketSize = Math.max(1, Math.ceil(sorted.length / bucketCount));
    const trend: number[] = [];
    for (let i = 0; i < sorted.length; i += bucketSize) {
      const slice = sorted.slice(i, i + bucketSize);
      trend.push(slice.reduce((s, r) => s + r.home_goals + r.away_goals, 0));
    }
    for (const r of rows) {
      goalsFor[r.home_team_id] = (goalsFor[r.home_team_id] ?? 0) + r.home_goals;
      goalsFor[r.away_team_id] = (goalsFor[r.away_team_id] ?? 0) + r.away_goals;
      goalsAgainst[r.home_team_id] = (goalsAgainst[r.home_team_id] ?? 0) + r.away_goals;
      goalsAgainst[r.away_team_id] = (goalsAgainst[r.away_team_id] ?? 0) + r.home_goals;
      played[r.home_team_id] = (played[r.home_team_id] ?? 0) + 1;
      played[r.away_team_id] = (played[r.away_team_id] ?? 0) + 1;
      totalGoals += r.home_goals + r.away_goals;
    }
    return { goalsFor, goalsAgainst, played, totalMatches: rows.length, totalGoals, trend };
  }, [rows]);

  const topScorers = Object.entries(goalsFor).sort((a, b) => b[1] - a[1]).slice(0, 10);
  // Menos goleados: ordena de menor a mayor, sólo entre equipos con partidos jugados de verdad
  const leastConceded = Object.entries(goalsAgainst)
    .filter(([id]) => (played[id] ?? 0) > 0)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-5xl flex items-center gap-3">
              ESTADÍSTICAS <span className="text-celeste text-3xl">📊</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Rankings globales basados en los partidos jugados por todos los usuarios.</p>
          </div>
          <div className="px-4 py-2 rounded-xl border border-border bg-card text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            📅 Histórico completo
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-10">Cargando…</div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              <StatCard icon="👥" label="Partidos jugados" value={totalMatches} trend={trend} />
              <StatCard icon="⚽" label="Goles totales" value={totalGoals} trend={trend} />
              <StatCard icon="📈" label="Promedio gol/partido" value={totalMatches ? (totalGoals / totalMatches).toFixed(2) : "0"} trend={trend} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Ranking title="🏆 Equipos con más goles" entries={topScorers} extraByTeam={played} suffix="" />
              <Ranking title="🧤 Equipos menos goleados" entries={leastConceded} extraByTeam={played} suffix="" />
            </div>

            {nextOwn && (
              <div className="rounded-2xl border border-celeste/30 bg-card/60 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-celeste">Tu próximo partido (Carrera)</div>
                    <div className="font-display text-lg">
                      {TEAMS_BY_ID[nextOwn.home]?.short ?? nextOwn.home} vs {TEAMS_BY_ID[nextOwn.away]?.short ?? nextOwn.away}
                    </div>
                  </div>
                </div>
                <Link to="/carrera" className="px-4 py-2 rounded-lg bg-celeste text-primary-foreground font-display text-sm tracking-wider">
                  VER PARTIDO ›
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <div className="h-8" />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const w = 90, h = 30;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-24 h-8 overflow-visible">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-celeste/70" />
    </svg>
  );
}

function StatCard({ icon, label, value, trend }: { icon: string; label: string; value: number | string; trend: number[] }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 flex items-center justify-between gap-3 hover:border-celeste/40 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-full bg-celeste/10 border border-celeste/30 grid place-items-center text-xl shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{label}</div>
          <div className="font-display text-3xl text-celeste leading-tight">{value}</div>
        </div>
      </div>
      <Sparkline data={trend} />
    </div>
  );
}

function Ranking({ title, entries, extraByTeam, suffix }: {
  title: string; entries: [string, number][]; extraByTeam: Record<string, number>; suffix: string;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <span className="font-display text-sm uppercase tracking-wide">{title}</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:flex gap-4">
          <span>Goles</span><span>PJ</span>
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground text-center">Sin datos todavía.</div>
      ) : (
        <ol className="divide-y divide-border">
          {entries.map(([id, val], i) => {
            const t = TEAMS_BY_ID[id];
            return (
              <li key={id} className="px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-white/[0.02] transition-colors">
                <span className="w-5 text-right tabular-nums text-muted-foreground">{i + 1}</span>
                {t && <Shield team={t} size={26} />}
                <span className="flex-1 truncate">{t?.name ?? id}</span>
                <span className="tabular-nums font-display text-celeste text-base w-10 text-right">{val}{suffix}</span>
                <span className="tabular-nums text-muted-foreground text-xs w-8 text-right">{extraByTeam[id] ?? 0}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
