import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield } from "@/components/Shield";
import { Nav } from "@/components/Nav";
import { ZONE_A, ZONE_B } from "@/data/teams";
import { hydrateTeamsFromDbRows, useTeamsSync, type DbTeam } from "@/lib/teams-sync";
import { getTeamsForBoot } from "@/lib/teams.functions";

export const Route = createFileRoute("/")({
  loader: async () => {
    const teams = await getTeamsForBoot();
    hydrateTeamsFromDbRows(teams as DbTeam[]);
    return { teams };
  },
  head: () => ({
    meta: [
      { title: "Primera Heads — Fútbol arcade de la Primera Nacional Argentina" },
      { name: "description", content: "Juego arcade 1v1 inspirado en Football Heads con todos los equipos reales de la Primera Nacional. Torneo, reducido y modo amistoso." },
      { property: "og:title", content: "Primera Heads — Arcade de la Primera Nacional" },
      { property: "og:description", content: "Cabezones, gambetas y ascensos. Torneo completo de la Primera Nacional Argentina." },
    ],
  }),
  component: Home,
});

function Home() {
  const { teams } = Route.useLoaderData();
  hydrateTeamsFromDbRows(teams as DbTeam[]);
  useTeamsSync();
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 pt-12 pb-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-celeste font-display tracking-[0.3em] text-sm">FÚTBOL ARCADE · ARGENTINA</p>
            <h1 className="font-display text-6xl md:text-7xl leading-[0.95] mt-3">
              PRIMERA<br/><span className="text-celeste">HEADS</span><br/>
              <span className="text-accent text-4xl md:text-5xl">El ascenso es nuestro</span>
            </h1>
            <p className="mt-5 text-muted-foreground max-w-md">
              Cabezones gigantes, rebotes locos y bombos en la tribuna.
              Disputá la Primera Nacional con sus 36 equipos reales,
              ganá tu zona y subí a Primera.
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Link to="/torneo" className="px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display text-lg tracking-wider glow-celeste hover:scale-105 transition">
                JUGAR TORNEO
              </Link>
              <Link to="/amistoso" className="px-6 py-3 rounded-xl bg-secondary border border-border font-display text-lg tracking-wider hover:bg-card transition">
                AMISTOSO 1v1
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-celeste/20 blur-3xl rounded-full" />
            <div className="relative grid grid-cols-6 gap-2 p-4 rounded-2xl bg-card/60 border border-border">
              {[...ZONE_A.slice(0, 9), ...ZONE_B.slice(0, 9)].map(t => (
                <div key={t.id} className="aspect-square grid place-items-center hover:scale-110 transition">
                  <Shield team={t} size={56} eager />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-card/40 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-6">
            {[
              { t: "TORNEO COMPLETO", d: "Zona A y Zona B con 18 equipos cada una. Tabla independiente, 3-1-0, fecha de clásicos incluida." },
              { t: "ASCENSOS REALES", d: "Final directa entre los 1° por el primer ascenso. El perdedor entra al reducido por el segundo." },
              { t: "REDUCIDO", d: "Octavos, cuartos, semis y final con cruces mezclados entre Zona A y Zona B. Eliminación directa." },
            ].map(c => (
              <div key={c.t} className="p-6 rounded-2xl bg-background border border-border">
                <div className="font-display text-2xl text-celeste">{c.t}</div>
                <p className="text-muted-foreground text-sm mt-2">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-muted-foreground">
          Proyecto fan no oficial · Escudos estilizados con los colores reales de cada club.
        </footer>
      </main>
    </div>
  );
}
