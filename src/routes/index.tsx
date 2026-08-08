import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Shield } from "@/components/Shield";
import { Nav } from "@/components/Nav";
import { ZONE_A, ZONE_B, type Team } from "@/data/teams";
import { hydrateTeamsFromDbRows, useTeamsSync, type DbTeam } from "@/lib/teams-sync";
import { getTeamsForBoot } from "@/lib/teams.functions";
import { useAuth } from "@/lib/auth";

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

const ALL_TEAMS: Team[] = [...ZONE_A, ...ZONE_B];

function Home() {
  const { teams } = Route.useLoaderData();
  useState(() => hydrateTeamsFromDbRows(teams as DbTeam[]));
  useTeamsSync();
  const { user, username } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Nav />
      <main className="flex-1">
        <StadiumHero user={user} username={username} />
        <TeamCarousel />
        <InfoCards />
        <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-muted-foreground">
          Proyecto fan no oficial · Escudos estilizados con los colores reales de cada club.
        </footer>
      </main>
    </div>
  );
}

// ===================== HERO DE ESTADIO =====================

function StadiumHero({ user, username }: { user: unknown; username: string | null }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Fondo de estadio nocturno */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(56,189,248,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050b16] via-[#071022] to-[#050810]" />
        {/* Reflectores */}
        {[10, 30, 70, 90].map((x, i) => (
          <div
            key={i}
            className="absolute top-0 w-40 h-96 opacity-[0.14] blur-2xl"
            style={{
              left: `${x}%`,
              background: "linear-gradient(180deg, #eafcff 0%, rgba(56,189,248,0) 80%)",
              transform: `translateX(-50%) rotate(${i % 2 === 0 ? 8 : -8}deg)`,
            }}
          />
        ))}
        {/* Humo/profundidad */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        {/* Panel de sesión */}
        <div className="flex flex-wrap items-center gap-3 mb-10">
          {user ? (
            <div className="px-4 py-2 rounded-xl bg-card/70 border border-border text-sm">
              Jugando como <span className="text-celeste font-semibold">{username ?? "vos"}</span>
            </div>
          ) : (
            <>
              <Link to="/auth"
                className="group px-4 py-2 rounded-xl border border-celeste/50 bg-celeste/10 hover:bg-celeste/20 hover:shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all text-sm">
                <span className="text-celeste font-display tracking-wide">INICIAR SESIÓN</span>
                <span className="block text-[11px] text-muted-foreground">Accedé a tu cuenta</span>
              </Link>
              <Link to="/auth"
                className="px-4 py-2 rounded-xl border border-border bg-card/60 hover:bg-card transition-all text-sm">
                <span className="font-display tracking-wide">REGISTRARSE</span>
                <span className="block text-[11px] text-muted-foreground">Creá tu cuenta gratis</span>
              </Link>
              <Link to="/amistoso"
                className="px-4 py-2 rounded-xl bg-transparent hover:bg-secondary/60 transition-all text-sm text-muted-foreground hover:text-foreground">
                <span className="font-display tracking-wide">JUGAR COMO INVITADO</span>
              </Link>
            </>
          )}
        </div>

        <p className="text-celeste font-display tracking-[0.35em] text-sm mb-2">FÚTBOL ARCADE · ARGENTINA</p>
        <h1 className="font-display text-7xl md:text-8xl leading-[0.9]">
          PRIMERA<br />
          <span className="text-celeste drop-shadow-[0_0_25px_rgba(56,189,248,0.45)]">HEADS</span>
        </h1>
        <p className="mt-3 font-display text-3xl md:text-4xl text-accent drop-shadow-[0_0_18px_rgba(250,204,21,0.35)]">
          EL ASCENSO ES NUESTRO
        </p>
        <p className="mt-5 text-muted-foreground max-w-lg">
          Cabezones gigantes, rebotes locos y partidos llenos de acción.
          Disputá la Primera Nacional con sus 36 equipos reales, ganá tu zona y subí a Primera.
        </p>

        {/* Botones principales */}
        <div className="flex flex-wrap gap-4 mt-8">
          <Link to="/amistoso"
            className="group relative px-8 py-5 rounded-2xl bg-green-500 text-black font-display text-xl tracking-wider overflow-hidden hover:scale-[1.03] transition-transform shadow-[0_0_30px_rgba(34,197,94,0.35)]">
            <span className="relative z-10">JUGAR</span>
            <span className="relative z-10 block text-xs font-sans font-normal tracking-normal opacity-80">Partido rápido</span>
          </Link>
          <Link to="/amistoso"
            className="px-8 py-5 rounded-2xl bg-card/70 border border-celeste/40 font-display text-xl tracking-wider hover:bg-celeste/10 hover:border-celeste transition-all">
            AMISTOSO
            <span className="block text-xs font-sans font-normal tracking-normal text-muted-foreground">1 vs 1</span>
          </Link>
          <Link to="/carrera"
            className="px-8 py-5 rounded-2xl bg-card/70 border border-border font-display text-xl tracking-wider hover:bg-card transition-all">
            MODO CARRERA
            <span className="block text-xs font-sans font-normal tracking-normal text-muted-foreground">Tu club, tu historia</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ===================== CARRUSEL DE EQUIPOS =====================

function TeamCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  const scrollByAmount = (dir: number) => {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const onPointerUp = () => { drag.current.active = false; };

  const onWheel = (e: React.WheelEvent) => {
    const el = trackRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl tracking-widest text-celeste">36 EQUIPOS REALES</h2>
        <Link to="/equipos" className="text-sm text-muted-foreground hover:text-celeste transition-colors underline underline-offset-4">
          Ver todos los equipos
        </Link>
      </div>

      <div className="relative">
        <button
          aria-label="Anterior"
          onClick={() => scrollByAmount(-1)}
          className="hidden md:grid place-items-center absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card border border-border hover:border-celeste hover:text-celeste transition-colors"
        >‹</button>

        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
          className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {ALL_TEAMS.map(t => (
            <button
              key={t.id}
              onClick={() => { if (!drag.current.moved) setSelected(t.id); }}
              className={`group relative shrink-0 snap-start w-20 h-24 rounded-xl border grid place-items-center gap-1 transition-all
                ${selected === t.id
                  ? "border-celeste bg-celeste/10 shadow-[0_0_18px_rgba(56,189,248,0.4)] scale-105"
                  : "border-border bg-card/50 hover:border-celeste/60 hover:scale-110 hover:shadow-[0_0_16px_rgba(56,189,248,0.25)]"}`}
            >
              <Shield team={t} size={40} />
              <span className="text-[10px] leading-tight text-center text-muted-foreground group-hover:text-foreground line-clamp-1 px-1">
                {t.short}
              </span>
            </button>
          ))}
        </div>

        <button
          aria-label="Siguiente"
          onClick={() => scrollByAmount(1)}
          className="hidden md:grid place-items-center absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card border border-border hover:border-celeste hover:text-celeste transition-colors"
        >›</button>
      </div>
    </section>
  );
}

// ===================== TARJETAS INFORMATIVAS =====================

function InfoCards() {
  const cards = [
    { t: "TORNEO COMPLETO", d: "Disputá la temporada completa de Primera Nacional.", color: "text-green-400" },
    { t: "REDUCIDO", d: "Eliminación directa. Un partido puede cambiar todo.", color: "text-accent" },
    { t: "AMISTOSO", d: "Elegí dos equipos y jugá inmediatamente.", color: "text-celeste" },
    { t: "FÚTBOL ARCADE", d: "Partidos rápidos, cabezazos gigantes y mucha acción.", color: "text-fuchsia-400" },
  ];
  return (
    <section className="bg-card/30 border-y border-border">
      <div className="max-w-6xl mx-auto px-4 py-12 grid sm:grid-cols-2 md:grid-cols-4 gap-5">
        {cards.map(c => (
          <div key={c.t} className="p-5 rounded-2xl bg-background border border-border hover:border-celeste/40 hover:-translate-y-1 transition-all">
            <div className={`font-display text-lg tracking-wide ${c.color}`}>{c.t}</div>
            <p className="text-muted-foreground text-sm mt-2">{c.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
