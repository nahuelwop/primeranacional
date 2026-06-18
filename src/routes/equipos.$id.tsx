import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield, Jersey } from "@/components/Shield";
import { TEAMS } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { fetchPlayers, fetchStadium, POSITION_LABEL, type Player, type Stadium, type Position } from "@/lib/squads";

export const Route = createFileRoute("/equipos/$id")({
  head: ({ params }) => {
    const t = TEAMS.find(x => x.id === params.id);
    return { meta: [{ title: t ? `${t.name} · Primera Heads` : "Equipo" }] };
  },
  component: TeamDetailPage,
  errorComponent: ({ error }) => <div className="p-10 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-10">Equipo no encontrado.</div>,
});

function TeamDetailPage() {
  const { id } = Route.useParams();
  useTeamsSync();
  const team = TEAMS.find(t => t.id === id);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stadium, setStadium] = useState<Stadium | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [ps, st] = await Promise.all([fetchPlayers(id), fetchStadium(id)]);
        if (!cancel) { setPlayers(ps); setStadium(st); }
      } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [id]);

  if (!team) throw notFound();

  const positions: Position[] = ["arquero", "defensa", "medio", "delantero"];

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Link to="/equipos" className="text-sm underline text-muted-foreground">← Equipos</Link>
        <header className="flex items-center gap-4 mt-4">
          <Shield team={team} size={88} />
          <div className="flex-1">
            <h1 className="font-display text-5xl">{team.name}</h1>
            <p className="text-sm text-muted-foreground">{team.city} · Zona {team.zone}</p>
          </div>
          <Jersey team={team} size={72} />
        </header>

        <section className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="md:col-span-1 rounded-xl bg-card border border-border p-4">
            <h2 className="font-display text-xl text-celeste">ESTADIO</h2>
            {loading ? <p className="text-xs text-muted-foreground">Cargando...</p>
              : stadium && stadium.name ? (
                <dl className="text-sm mt-2 space-y-1">
                  <div><dt className="text-xs text-muted-foreground uppercase">Nombre</dt><dd>{stadium.name}</dd></div>
                  {stadium.capacity != null && <div><dt className="text-xs text-muted-foreground uppercase">Capacidad</dt><dd>{stadium.capacity.toLocaleString()}</dd></div>}
                  {stadium.founded != null && <div><dt className="text-xs text-muted-foreground uppercase">Fundación</dt><dd>{stadium.founded}</dd></div>}
                  {stadium.city && <div><dt className="text-xs text-muted-foreground uppercase">Ciudad</dt><dd>{stadium.city}</dd></div>}
                  {stadium.address && <div><dt className="text-xs text-muted-foreground uppercase">Dirección</dt><dd>{stadium.address}</dd></div>}
                </dl>
              ) : <p className="text-xs text-muted-foreground">Sin datos del estadio cargados.</p>}
          </div>

          <div className="md:col-span-2 rounded-xl bg-card border border-border p-4">
            <h2 className="font-display text-xl text-celeste">PLANTEL</h2>
            {loading ? <p className="text-xs text-muted-foreground">Cargando...</p>
              : players.length === 0 ? <p className="text-xs text-muted-foreground">Plantel sin cargar.</p>
              : (
                <div className="grid sm:grid-cols-2 gap-4 mt-2">
                  {positions.map(pos => {
                    const group = players.filter(p => p.position === pos);
                    if (!group.length) return null;
                    return (
                      <div key={pos}>
                        <h3 className="text-xs uppercase text-muted-foreground">{POSITION_LABEL[pos]}</h3>
                        <ul className="mt-1 space-y-0.5 text-sm">
                          {group.map(p => (
                            <li key={p.id} className="flex gap-2">
                              {p.shirt_number != null && <span className="w-6 text-right text-muted-foreground">{p.shirt_number}</span>}
                              <span className="flex-1">{p.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </section>
      </main>
    </div>
  );
}
