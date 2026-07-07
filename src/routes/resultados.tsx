import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS_BY_ID } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { useTournament } from "@/store/tournament";

export const Route = createFileRoute("/resultados")({
  head: () => ({ meta: [
    { title: "Centro de Resultados · Primera Heads" },
    { name: "description", content: "Todos los resultados de la Primera Nacional 2026 por fecha." },
  ] }),
  component: ResultadosPage,
});

function ResultadosPage() {
  useTeamsSync();
  const s = useTournament();
  useEffect(() => { s.init(); }, []);
  const totalRounds = Math.max(0, ...s.fixture.map(m => m.round));
  const [round, setRound] = useState<number>(Math.max(1, Math.min(s.currentRound, totalRounds || 1)));

  const matches = s.fixture.filter(m => m.round === round);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <p className="text-celeste font-display tracking-[0.3em] text-xs">PRIMERA NACIONAL</p>
        <h1 className="font-display text-5xl mb-4">CENTRO DE RESULTADOS</h1>

        <div className="flex flex-wrap gap-2 items-center mb-6">
          <button onClick={() => setRound(r => Math.max(1, r - 1))} className="px-3 py-1.5 rounded-lg bg-secondary font-display text-sm">◀</button>
          <div className="font-display text-2xl px-4">FECHA {round}<span className="text-sm text-muted-foreground">/{totalRounds}</span></div>
          <button onClick={() => setRound(r => Math.min(totalRounds, r + 1))} className="px-3 py-1.5 rounded-lg bg-secondary font-display text-sm">▶</button>
          <div className="flex-1" />
          <Link to="/torneo" className="px-4 py-2 rounded-lg bg-celeste text-primary-foreground font-display text-sm tracking-wider">TABLA</Link>
          <Link to="/torneo" className="px-4 py-2 rounded-lg bg-secondary border border-border font-display text-sm">PRÓXIMA FECHA</Link>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {matches.map(m => {
            const h = TEAMS_BY_ID[m.home], a = TEAMS_BY_ID[m.away];
            return (
              <div key={m.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                m.isClasico ? "border-accent/60 bg-accent/5" : "border-border bg-card"
              }`}>
                <div className="flex items-center gap-2 flex-1 justify-end text-right min-w-0">
                  <span className="text-sm truncate">{h?.short}</span>
                  {h && <Shield team={h} size={28} />}
                </div>
                <div className="font-display text-xl w-20 text-center tabular-nums">
                  {m.played ? `${m.homeGoals} - ${m.awayGoals}` : "vs"}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {a && <Shield team={a} size={28} />}
                  <span className="text-sm truncate">{a?.short}</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
