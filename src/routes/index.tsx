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
        <div className="absolute inset-0 bg-gradient-to-b from-[#03060d] via-[#071324] to-[#050810]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.28),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_20%,rgba(250,204,21,0.10),transparent_45%)]" />

        {/* Siluetas de tribuna: filas de "cabezas" de público sugeridas con puntos */}
        <div className="absolute top-0 left-0 right-0 h-24 opacity-30" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1.5px, transparent 1.5px)",
          backgroundSize: "14px 14px",
          maskImage: "linear-gradient(to bottom, black, transparent)",
        }} />

        {/* Reflectores bien marcados, en forma de cono */}
        {[
          { x: 6, rot: 18 }, { x: 26, rot: 8 }, { x: 74, rot: -8 }, { x: 94, rot: -18 },
        ].map((s, i) => (
          <div key={i} className="absolute -top-10" style={{ left: `${s.x}%` }}>
            <div
              className="w-2 h-2 rounded-full bg-white shadow-[0_0_25px_10px_rgba(255,255,255,0.9)]"
            />
            <div
              className="w-56 h-[420px] opacity-25 blur-md"
              style={{
                background: "linear-gradient(180deg, #eafcff 0%, rgba(56,189,248,0) 75%)",
                transform: `translateX(-50%) rotate(${s.rot}deg)`,
                clipPath: "polygon(45% 0, 55% 0, 100% 100%, 0% 100%)",
              }}
            />
          </div>
        ))}

        {/* Partículas flotantes (humo/polvo del estadio) */}
        <FloatingParticles />

        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />
        {/* Viñeta para dar profundidad */}
        <div className="absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(0,0,0,0.55)]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-20 grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
        <div>
          {/* Panel de sesión */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
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

        {/* Gráfico decorativo: pelota gigante con glow, para no dejar el lado derecho vacío */}
        <div className="relative hidden lg:flex items-center justify-center h-full">
          <HeroBallGraphic />
        </div>
      </div>
    </section>
  );
}

function FloatingParticles() {
  const dots = Array.from({ length: 22 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: (i % 7) * 0.6,
    dur: 6 + (i % 5),
    size: 2 + (i % 3),
  }));
  return (
    <div className="absolute inset-0 overflow-hidden">
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-celeste/40 animate-[floatUp_8s_ease-in-out_infinite]"
          style={{
            left: `${d.left}%`,
            bottom: "-10px",
            width: d.size,
            height: d.size,
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.3; }
          100% { transform: translateY(-480px) translateX(20px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function HeroBallGraphic() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-celeste/25 blur-[80px] rounded-full scale-125" />
      <div className="absolute -inset-6 bg-accent/10 blur-[60px] rounded-full" />
      <svg width="280" height="280" viewBox="0 0 200 200" className="relative drop-shadow-[0_0_40px_rgba(56,189,248,0.4)] animate-[spin_18s_linear_infinite]">
        <defs>
          <radialGradient id="ballShade" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#9ca3af" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="92" fill="url(#ballShade)" stroke="#1f2937" strokeWidth="3" />
        {[0, 72, 144, 216, 288].map((a, i) => {
          const rad = (a * Math.PI) / 180;
          const cx = 100 + Math.cos(rad) * 48;
          const cy = 100 + Math.sin(rad) * 48;
          return <circle key={i} cx={cx} cy={cy} r="20" fill="#111827" />;
        })}
        <circle cx="100" cy="100" r="20" fill="#111827" />
      </svg>
      {/* Anillo orbitando, para que se sienta "juego arcade" */}
      <div className="absolute inset-0 -m-8 rounded-full border border-celeste/30 animate-[spin_26s_linear_infinite_reverse]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -m-8 w-[calc(100%+64px)] h-[calc(100%+64px)]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent shadow-[0_0_14px_4px_rgba(250,204,21,0.7)]" />
      </div>
    </div>
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
