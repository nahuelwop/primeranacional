import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Shield } from "@/components/Shield";
import { Nav } from "@/components/Nav";
import { ZONE_A, ZONE_B, type Team } from "@/data/teams";
import { hydrateTeamsFromDbRows, useTeamsSync, type DbTeam } from "@/lib/teams-sync";
import { getTeamsForBoot } from "@/lib/teams.functions";
import { useAuth } from "@/lib/auth";
import { PlayCircle, Handshake, Trophy } from "lucide-react";
import stadiumHero from "@/assets/stadium-hero.png";

export const Route = createFileRoute("/")({
  loader: async () => {
    const teams = await getTeamsForBoot();
    hydrateTeamsFromDbRows(teams as unknown as DbTeam[]);
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

// Los equipos se leen siempre desde ZONE_A/ZONE_B, que teams-sync reemplaza
// con los datos de Supabase (o mantiene locales si la base está vacía).
function useAllTeams(): Team[] {
  const version = useTeamsSync();
  return useMemo(() => [...ZONE_A, ...ZONE_B], [version]);
}

function Home() {
  const { teams } = Route.useLoaderData();
  useState(() => hydrateTeamsFromDbRows(teams as unknown as DbTeam[]));
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
      {/* Fondo de estadio nocturno: foto real */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${stadiumHero})` }}
        />
        {/* Overlay degradado: oscurece lo suficiente para que el texto sea legible
            sin tapar el estadio — público y luces siguen visibles. Más marcado a la
            izquierda (donde va el título) y hacia abajo (para fundir con el resto de
            la página); más liviano a la derecha, donde va el collage de escudos. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#03060d]/90 via-[#050a16]/70 to-[#050a16]/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#03060d]/60 via-transparent to-[#050810]/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.16),transparent_60%)]" />

        {/* Partículas flotantes (ya existentes, sutiles) */}
        <FloatingParticles />

        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />
        {/* Viñeta para dar profundidad */}
        <div className="absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(0,0,0,0.5)]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-20 grid lg:grid-cols-[1fr_1fr] gap-8 items-center">
        <div>
          {/* Panel de sesión */}
          <div className="flex flex-wrap items-center gap-3 mb-6 hud-rise">
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

          <p className="text-celeste font-display tracking-[0.4em] text-sm mb-3 hud-rise">FÚTBOL ARCADE · ARGENTINA</p>
          <h1 className="font-display leading-[0.88] hud-rise" style={{ animationDelay: "0.05s", fontSize: "clamp(3.5rem, 7vw, 6.5rem)" }}>
            PRIMERA<br />
            <span className="text-celeste drop-shadow-[0_0_28px_rgba(56,189,248,0.5)]">HEADS</span>
          </h1>
          <p className="mt-4 font-display tracking-wide text-accent drop-shadow-[0_0_20px_rgba(250,204,21,0.4)] hud-rise" style={{ animationDelay: "0.1s", fontSize: "clamp(1.5rem, 2.6vw, 2.25rem)" }}>
            EL ASCENSO ES NUESTRO
          </p>
          <p className="mt-5 text-muted-foreground max-w-lg leading-relaxed hud-rise" style={{ animationDelay: "0.15s" }}>
            Cabezones gigantes, rebotes locos y partidos llenos de acción.
            Disputá la Primera Nacional con sus 36 equipos reales, ganá tu zona y subí a Primera.
          </p>

          {/* Botones principales */}
          <div className="flex flex-wrap gap-4 mt-9 hud-rise" style={{ animationDelay: "0.2s" }}>
            <Link to="/amistoso"
              className="btn-glow group relative px-9 py-5 rounded-2xl bg-gradient-to-b from-green-400 to-green-600 text-black font-display text-xl tracking-wider overflow-hidden hover:scale-[1.04] active:scale-[0.98] transition-transform shadow-[0_10px_35px_-8px_rgba(34,197,94,0.55)] flex items-center gap-3">
              <PlayCircle className="w-8 h-8 shrink-0" strokeWidth={2.3} />
              <span className="relative z-10 text-left">
                <span className="block">JUGAR</span>
                <span className="block text-xs font-sans font-normal tracking-normal opacity-80">Partido rápido</span>
              </span>
            </Link>
            <Link to="/amistoso"
              className="btn-glow px-8 py-5 rounded-2xl bg-card/70 border border-celeste/40 font-display text-xl tracking-wider hover:bg-celeste/10 hover:border-celeste transition-all flex items-center gap-3">
              <Handshake className="w-6 h-6 text-celeste shrink-0" strokeWidth={2.2} />
              <span className="text-left">
                <span className="block">AMISTOSO</span>
                <span className="block text-xs font-sans font-normal tracking-normal text-muted-foreground">1 vs 1</span>
              </span>
            </Link>
            <Link to="/carrera"
              className="btn-glow px-8 py-5 rounded-2xl bg-card/70 border border-border font-display text-xl tracking-wider hover:bg-card transition-all flex items-center gap-3">
              <Trophy className="w-6 h-6 text-accent shrink-0" strokeWidth={2.2} />
              <span className="text-left">
                <span className="block">MODO CARRERA</span>
                <span className="block text-xs font-sans font-normal tracking-normal text-muted-foreground">Tu club, tu historia</span>
              </span>
            </Link>
          </div>
        </div>

        {/* Gráfico decorativo: colage de escudos superpuestos, para no dejar el lado derecho vacío */}
        <div className="relative hidden lg:flex items-center justify-center h-full">
          <div className="scale-[0.72] xl:scale-[0.94] origin-center transition-transform">
            <ShieldCollage />
          </div>
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

function ShieldCollage() {
  const ALL_TEAMS = useAllTeams();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const N = ALL_TEAMS.length;
  const container = 520; // px, cuadrado
  const center = container / 2;
  const minRadius = 55; // evita que los primeros queden todos amontonados justo en el centro
  const maxRadius = center - 10;
  const goldenAngle = 137.508 * (Math.PI / 180);

  const layout = ALL_TEAMS.map((t, i) => {
    const angle = i * goldenAngle;
    const t01 = i / (N - 1);
    const radius = minRadius + (maxRadius - minRadius) * Math.sqrt(t01);
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    // Más grandes cerca del centro (foco de póster), más chicos hacia afuera
    const size = 58 - t01 * 26 + (i % 3) * 3;
    const rot = ((i * 53) % 40) - 20;
    const glow = i % 2 === 0 ? "rgba(56,189,248,0.4)" : "rgba(250,204,21,0.3)";
    const z = Math.round(40 - t01 * 30);
    const delay = (i % 9) * 0.35;
    return { t, x, y, size, rot, glow, z, delay };
  });

  return (
    <div className="relative" style={{ width: container, height: container }}>
      <div className="absolute inset-0 bg-celeste/10 blur-[100px] rounded-full" />
      {layout.map(({ t, x, y, size, rot, glow, z, delay }) => {
        const isHovered = hoveredId === t.id;
        return (
          <div
            key={t.id}
            onMouseEnter={() => setHoveredId(t.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`absolute rounded-xl bg-card/70 border grid place-items-center backdrop-blur-sm cursor-pointer transition-[transform,box-shadow,border-color] duration-200 ${
              isHovered ? "border-celeste" : "border-white/10 animate-[collageFloat_7s_ease-in-out_infinite]"
            }`}
            style={{
              width: size, height: size,
              left: x - size / 2, top: y - size / 2,
              zIndex: isHovered ? 99 : z,
              padding: Math.max(3, size * 0.14),
              transform: isHovered ? `rotate(0deg) scale(1.65)` : `rotate(${rot}deg)`,
              boxShadow: isHovered
                ? `0 0 32px rgba(56,189,248,0.75), 0 10px 24px rgba(0,0,0,0.6)`
                : `0 0 ${size * 0.4}px ${glow}, 0 6px 14px rgba(0,0,0,0.5)`,
              animationDelay: `${delay}s`,
            }}
          >
            <Shield team={t} size={size * 0.68} eager={size > 45} />
            {isHovered && (
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold bg-background/95 border border-celeste/40 text-celeste px-2 py-0.5 rounded-md shadow-lg">
                {t.name}
              </span>
            )}
          </div>
        );
      })}
      <style>{`
        @keyframes collageFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

// ===================== CARRUSEL DE EQUIPOS =====================

function TeamCarousel() {
  const ALL_TEAMS = useAllTeams();
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
    <section className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
        <div>
          <h2 className="font-display text-2xl tracking-widest text-celeste text-glow-celeste">36 EQUIPOS REALES</h2>
          <p className="text-xs text-muted-foreground mt-1">Todos los clubes de la Primera Nacional, con sus colores oficiales.</p>
        </div>
        <Link to="/equipos" className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-celeste transition-colors shrink-0">
          Ver todos
          <span className="transition-transform group-hover:translate-x-1">→</span>
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
              className={`group relative shrink-0 snap-start w-20 h-24 rounded-xl border grid place-items-center gap-1 transition-all duration-200
                ${selected === t.id
                  ? "border-celeste bg-celeste/10 shadow-[0_0_18px_rgba(56,189,248,0.4)] scale-105 -translate-y-1"
                  : "border-border bg-card/50 hover:border-celeste/60 hover:scale-110 hover:-translate-y-1 hover:shadow-[0_10px_24px_-8px_rgba(56,189,248,0.35)]"}`}
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
          <div key={c.t} className="card-glow p-5 rounded-2xl bg-background border border-border transition-all">
            <div className={`font-display text-lg tracking-wide ${c.color}`}>{c.t}</div>
            <p className="text-muted-foreground text-sm mt-2">{c.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
