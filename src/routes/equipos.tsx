import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Shield, Jersey } from "@/components/Shield";
import { TEAMS } from "@/data/teams";

export const Route = createFileRoute("/equipos")({
  head: () => ({
    meta: [
      { title: "Equipos · Primera Heads" },
      { name: "description", content: "Los 36 clubes de la Primera Nacional Argentina con escudo, camiseta y estadísticas." },
    ],
  }),
  component: EquiposPage,
});

function EquiposPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <h1 className="font-display text-5xl">EQUIPOS</h1>
        <p className="text-muted-foreground text-sm">Los 36 clubes oficiales · 18 por zona</p>

        {(["A","B"] as const).map(z => (
          <section key={z} className="mt-8">
            <h2 className="font-display text-3xl text-celeste">ZONA {z}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {TEAMS.filter(t => t.zone === z).map(t => (
                <div key={t.id} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
                  <Shield team={t} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.city}</div>
                    <div className="text-[10px] mt-1 grid grid-cols-4 gap-1 text-muted-foreground">
                      <span>VEL {t.stats.speed}</span><span>SAL {t.stats.jump}</span>
                      <span>POT {t.stats.power}</span><span>DEF {t.stats.defense}</span>
                    </div>
                  </div>
                  <Jersey team={t} size={42} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
