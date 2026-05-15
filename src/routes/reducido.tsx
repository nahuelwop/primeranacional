import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS_BY_ID } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { useTournament } from "@/store/tournament";
import { Pair } from "@/lib/tournament";

export const Route = createFileRoute("/reducido")({
  head: () => ({
    meta: [
      { title: "Fase Final · Primera Heads" },
      { name: "description", content: "Final directa por el primer ascenso y reducido por el segundo." },
    ],
  }),
  component: Reducido,
});

function Reducido() {
  const s = useTournament();
  const allPlayed = s.fixture.length > 0 && s.fixture.every(m => m.played);

  if (!allPlayed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 grid place-items-center px-4">
          <div className="text-center max-w-md">
            <h1 className="font-display text-4xl">Falta terminar la fase regular</h1>
            <p className="text-muted-foreground mt-2">Volvé al Torneo y simulá todas las fechas para habilitar la fase final.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <h1 className="font-display text-5xl">FASE FINAL</h1>
        <p className="text-muted-foreground text-sm mt-1">Primer ascenso por final directa · Segundo por reducido</p>

        {!s.finalDirecta ? (
          <button onClick={() => s.startPlayoffs()}
            className="mt-6 px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider glow-celeste">
            DISPUTAR FINAL DIRECTA
          </button>
        ) : (
          <div className="mt-6 grid lg:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-gradient-to-br from-celeste/20 to-accent/10 border border-celeste/40 p-5">
              <div className="font-display text-celeste text-xl">FINAL POR EL 1° ASCENSO</div>
              <PairView pair={s.finalDirecta} big />
              {s.champion && (
                <div className="mt-4 text-center">
                  <div className="text-xs text-muted-foreground">CAMPEÓN · 1° ASCENSO</div>
                  <div className="font-display text-2xl text-celeste">{TEAMS_BY_ID[s.champion]?.name}</div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-5">
              <div className="flex items-center justify-between">
                <div className="font-display text-xl">REDUCIDO · 2° ASCENSO</div>
                <button onClick={() => s.advanceBracket()}
                  disabled={!!s.reducidoChampion}
                  className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-display tracking-wider disabled:opacity-40">
                  AVANZAR LLAVE
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                <BracketCol title="Octavos" pairs={s.bracket?.octavos ?? []} />
                <BracketCol title="Cuartos" pairs={s.bracket?.cuartos ?? []} />
                <BracketCol title="Semis"   pairs={s.bracket?.semis ?? []} />
                <BracketCol title="Final"   pairs={s.bracket?.final ?? []} />
              </div>

              {s.reducidoChampion && (
                <div className="mt-6 text-center p-4 rounded-xl bg-accent/10 border border-accent/40">
                  <div className="text-xs text-muted-foreground">CAMPEÓN DEL REDUCIDO · 2° ASCENSO</div>
                  <div className="font-display text-3xl text-accent">{TEAMS_BY_ID[s.reducidoChampion]?.name}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function BracketCol({ title, pairs }: { title: string; pairs: Pair[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="space-y-2">
        {pairs.length === 0 && <div className="text-xs text-muted-foreground/60">—</div>}
        {pairs.map((p, i) => <PairView key={i} pair={p} />)}
      </div>
    </div>
  );
}

function PairView({ pair, big }: { pair: Pair; big?: boolean }) {
  const a = pair.a ? TEAMS_BY_ID[pair.a] : null;
  const b = pair.b ? TEAMS_BY_ID[pair.b] : null;
  const cls = big ? "text-base p-3" : "text-xs p-2";
  return (
    <div className={`rounded-lg bg-background border border-border ${cls}`}>
      <Row team={a} g={pair.ag} winner={pair.winner === pair.a} big={big} />
      <Row team={b} g={pair.bg} winner={pair.winner === pair.b} big={big} />
    </div>
  );
}

function Row({ team, g, winner, big }: { team: any; g?: number; winner?: boolean; big?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 ${winner ? "text-celeste font-bold" : ""}`}>
      <div className="flex items-center gap-2 min-w-0">
        {team ? <Shield team={team} size={big ? 28 : 18} /> : <div className="w-4 h-4 rounded bg-muted" />}
        <span className="truncate">{team?.name ?? "—"}</span>
      </div>
      <span className="font-display">{g ?? ""}</span>
    </div>
  );
}
