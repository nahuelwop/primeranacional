import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS_BY_ID } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { fetchAllHistory, type HistoryRow } from "@/lib/career-api";

export const Route = createFileRoute("/estadisticas")({
  head: () => ({ meta: [
    { title: "Estadísticas · Primera Heads" },
    { name: "description", content: "Máximo goleador, equipo más ganador, récords e historial." },
  ] }),
  component: EstadisticasPage,
});

function EstadisticasPage() {
  useTeamsSync();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setRows(await fetchAllHistory()); } finally { setLoading(false); }
    })();
  }, []);

  const { goalsByTeam, winsByTeam, biggestMatch, totalMatches, totalGoals } = useMemo(() => {
    const goalsByTeam: Record<string, number> = {};
    const winsByTeam: Record<string, number> = {};
    let biggestMatch: HistoryRow | null = null;
    let totalGoals = 0;
    for (const r of rows) {
      goalsByTeam[r.home_team_id] = (goalsByTeam[r.home_team_id] ?? 0) + r.home_goals;
      goalsByTeam[r.away_team_id] = (goalsByTeam[r.away_team_id] ?? 0) + r.away_goals;
      if (r.home_goals > r.away_goals) winsByTeam[r.home_team_id] = (winsByTeam[r.home_team_id] ?? 0) + 1;
      else if (r.away_goals > r.home_goals) winsByTeam[r.away_team_id] = (winsByTeam[r.away_team_id] ?? 0) + 1;
      const sum = r.home_goals + r.away_goals;
      if (!biggestMatch || sum > (biggestMatch.home_goals + biggestMatch.away_goals)) biggestMatch = r;
      totalGoals += sum;
    }
    return { goalsByTeam, winsByTeam, biggestMatch, totalMatches: rows.length, totalGoals };
  }, [rows]);

  const topScorers = Object.entries(goalsByTeam).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topWinners = Object.entries(winsByTeam).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        <h1 className="font-display text-5xl">ESTADÍSTICAS</h1>
        <p className="text-muted-foreground text-sm">Rankings globales basados en los partidos jugados por todos los usuarios.</p>

        {loading ? <div className="text-center text-muted-foreground">Cargando…</div> : (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <Stat label="Partidos jugados" value={totalMatches} />
              <Stat label="Goles totales" value={totalGoals} />
              <Stat label="Promedio gol/partido" value={totalMatches ? (totalGoals / totalMatches).toFixed(2) : "0"} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Ranking title="🥇 Equipo con más goles" entries={topScorers} suffix="g" />
              <Ranking title="🏆 Equipo más ganador" entries={topWinners} suffix="v" />
            </div>

            {biggestMatch && (
              <div className="rounded-2xl bg-card border border-border p-4">
                <div className="text-xs uppercase text-muted-foreground">Récord de goles en un partido</div>
                <div className="font-display text-2xl mt-1">
                  {TEAMS_BY_ID[biggestMatch.home_team_id]?.short} {biggestMatch.home_goals} — {biggestMatch.away_goals} {TEAMS_BY_ID[biggestMatch.away_team_id]?.short}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(biggestMatch.played_at).toLocaleString()}</div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 text-center">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="font-display text-3xl text-celeste mt-1">{value}</div>
    </div>
  );
}

function Ranking({ title, entries, suffix }: { title: string; entries: [string, number][]; suffix: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="px-4 py-2 font-display text-sm uppercase text-muted-foreground border-b border-border">{title}</div>
      {entries.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground text-center">Sin datos todavía.</div>
      ) : (
        <ol className="divide-y divide-border">
          {entries.map(([id, val], i) => {
            const t = TEAMS_BY_ID[id];
            return (
              <li key={id} className="px-3 py-2 flex items-center gap-2 text-sm">
                <span className="w-6 text-right tabular-nums text-muted-foreground">{i + 1}</span>
                {t && <Shield team={t} size={24} />}
                <span className="flex-1 truncate">{t?.name ?? id}</span>
                <span className="tabular-nums font-display">{val}{suffix}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
