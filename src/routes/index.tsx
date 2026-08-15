import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Shield } from "@/components/Shield";
import { ZONE_A, ZONE_B, type Team } from "@/data/teams";
import { hydrateTeamsFromDbRows, useTeamsSync, type DbTeam } from "@/lib/teams-sync";
import { getTeamsForBoot } from "@/lib/teams.functions";
import { useAuth } from "@/lib/auth";
import { Trophy, Swords, Layers, Users, BarChart3, Award, Star, Settings, Music, Volume2 } from "lucide-react";
import stadiumHero from "@/assets/stadium-hero-night.jpg";

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
  const { user, username, isAdmin } = useAuth();

  return <PesHub user={user} username={username} isAdmin={isAdmin} />;
}

// ===================== MENÚ PRINCIPAL ESTILO CONSOLA =====================

type HubItem = {
  id: string;
  label: string;
  desc: string;
  to: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const HUB_ITEMS: HubItem[] = [
  { id: "carrera", label: "CARRERA", desc: "Dirigí a tu club, temporada tras temporada, y llevalo a Primera.", to: "/carrera", icon: Trophy },
  { id: "amistoso", label: "AMISTOSO", desc: "Elegí dos equipos y jugá un 1 vs 1 ahora mismo.", to: "/amistoso", icon: Swords },
  { id: "reducido", label: "REDUCIDO", desc: "Eliminación directa por el segundo ascenso. Un partido puede cambiar todo.", to: "/reducido", icon: Layers },
  { id: "equipos", label: "EQUIPOS", desc: "Los 36 clubes reales de la Primera Nacional, con sus colores y escudos.", to: "/equipos", icon: Users },
  { id: "stats", label: "STATS", desc: "Números, rachas y rendimiento de cada club.", to: "/estadisticas", icon: BarChart3 },
  { id: "logros", label: "LOGROS", desc: "Desafíos y objetivos para desbloquear jugando.", to: "/logros", icon: Award },
];

function PesHub({ user, username, isAdmin }: { user: unknown; username: string | null; isAdmin: boolean }) {
  const navigate = useNavigate();
  const items: HubItem[] = isAdmin
    ? [...HUB_ITEMS, { id: "admin", label: "ADMIN", desc: "Panel de administración del juego.", to: "/admin", icon: Star }]
    : HUB_ITEMS;
  const [selected, setSelected] = useState(1); // arranca en "Amistoso"
  const current = items[Math.min(selected, items.length - 1)];

  const go = (item: HubItem) => navigate({ to: item.to });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setSelected(i => Math.min(items.length - 1, i + 1));
      if (e.key === "ArrowLeft") setSelected(i => Math.max(0, i - 1));
      if (e.key === "Enter") go(items[selected]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, items.length]);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* ===== Fondo: estadio a pantalla completa + patrón hexagonal + reflectores ambiente ===== */}
      <div className="absolute inset-0">
        <img src={stadiumHero} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black" />
        <div className="absolute inset-0 opacity-[0.10]" style={{
          backgroundImage:
            "linear-gradient(30deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(150deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(30deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(150deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8)",
          backgroundSize: "72px 126px",
          backgroundPosition: "0 0, 0 0, 36px 63px, 36px 63px",
        }} />
        {/* Reflectores + partículas de polvo, ya usados en el resto del juego */}
        <div className="ambient-beam ambient-beam-a opacity-60" />
        <div className="ambient-beam ambient-beam-b opacity-50" />
        <AmbientDust />
      </div>

      {/* ===== Header mínimo: sólo marca + sesión/admin (la navegación va en el hub de abajo) ===== */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-12 pt-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative w-9 h-9 shrink-0">
            <div className="absolute inset-0 rounded-lg bg-celeste blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-celeste via-celeste to-white grid place-items-center font-display text-primary-foreground shadow-lg">
              PN
            </div>
          </div>
          <div className="font-display text-xl md:text-2xl tracking-wide">
            PRIMERA <span className="text-celeste text-glow-celeste">HEADS</span>
          </div>
        </Link>
        <div className="flex items-center gap-2 text-xs md:text-sm">
          {isAdmin && (
            <Link to="/admin" className="px-3 py-1.5 rounded-md hover:bg-white/5 transition-all font-medium text-gold">
              ⭐ Admin
            </Link>
          )}
          <Link to="/auth"
            className="btn-glow px-4 py-1.5 rounded-md border border-white/15 hover:bg-white/5 transition-all font-medium">
            {user ? `👤 ${username ?? "cuenta"}` : "Iniciar sesión"}
          </Link>
        </div>
      </div>

      {/* ===== Centro: sección activa (crossfade fluido) + cinta de escudos ===== */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 px-6 py-8">
        <div key={current.id} className="hud-rise text-center max-w-2xl">
          <div className="flex items-center justify-center gap-3 mb-3">
            <current.icon size={34} className="text-celeste drop-shadow-[0_0_14px_rgba(56,189,248,0.7)]" />
          </div>
          <div className="font-display text-4xl md:text-6xl tracking-wide text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            {current.label}
          </div>
          <p className="mt-3 text-sm md:text-base text-white/70 max-w-lg mx-auto">{current.desc}</p>
        </div>

        {/* Chips rápidos, siempre visibles */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {["36 CLUBES", "3 MODOS DE JUEGO", "TEMPORADA 2026"].map(chip => (
            <span key={chip} className="hud-card px-3 py-1.5 rounded-full border border-white/15 bg-black/40 text-[10px] md:text-xs tracking-widest text-white/70">
              {chip}
            </span>
          ))}
        </div>

        {/* Cinta de escudos de los 36 clubes, deslizándose sin parar */}
        <TeamsMarquee />
      </div>

      {/* ===== Cinta hub inferior: navegación fluida entre secciones (grande, como la referencia) ===== */}
      <div className="relative z-10">
        <div className="border-t-2 border-celeste bg-gradient-to-r from-black via-[#050a14] to-black">
          <div className="flex items-stretch">
            {/* Panel grande a la izquierda: pelota con estela + nombre del modo activo */}
            <div
              className="relative shrink-0 w-[210px] md:w-[260px] flex flex-col items-center justify-center gap-3 py-8 overflow-hidden"
              style={{ clipPath: "polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%)" }}
            >
              <span className="absolute inset-0 bg-celeste/10" />
              <span className="absolute inset-0 border-2 border-r-0 border-celeste/70 shadow-[0_0_30px_-6px_rgba(56,189,248,0.7)]" />
              <div key={current.id} className="hud-rise relative flex flex-col items-center gap-2">
                <BallIcon size={56} />
                <span className="font-display text-lg md:text-xl tracking-wide text-celeste text-center px-2">{current.label}</span>
              </div>
            </div>

            {/* Título + fila de íconos con indicador deslizante */}
            <div className="flex-1 flex flex-col justify-center py-4 md:py-5 pl-6 md:pl-10 pr-4 border-l border-white/10">
              <div key={`${current.id}-title`} className="hud-rise">
                <div className="font-display text-2xl md:text-3xl tracking-wide">{current.label}</div>
                <div className="h-px w-24 bg-celeste/70 mt-1 mb-4" />
              </div>
              <div className="relative flex items-stretch">
                <div
                  className="absolute inset-y-1 rounded-lg bg-celeste/15 border border-celeste/50 shadow-[0_0_20px_-4px_rgba(56,189,248,0.55)] transition-all duration-300 ease-out"
                  style={{ left: `${(selected / items.length) * 100}%`, width: `${100 / items.length}%` }}
                />
                {items.map((item, i) => {
                  const active = i === selected;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => { setSelected(i); go(item); }}
                      className="relative z-10 flex-1 flex flex-col items-center justify-center gap-2 px-2 py-3 transition-all duration-300"
                    >
                      <item.icon
                        size={active ? 30 : 24}
                        className={`transition-all duration-300 ${active ? "text-celeste drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]" : "text-white/60"}`}
                      />
                      <span className={`text-[10px] md:text-xs tracking-wide whitespace-nowrap transition-colors duration-300 ${active ? "text-celeste" : "text-white/50"}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Descripción + config/sonido, en una franja propia más alta */}
          <div className="bg-black px-6 md:px-10 py-4 md:py-5 flex items-center justify-between gap-4 border-t border-white/10">
            <span key={`${current.id}-desc`} className="hud-rise text-sm md:text-base text-white/70">{current.desc}</span>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <button className="hud-card flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 hover:border-celeste/50 hover:bg-white/5 transition-colors text-left">
                <Settings size={18} className="text-celeste" />
                <span className="leading-tight">
                  <span className="block text-xs font-semibold">Configuración</span>
                  <span className="block text-[10px] text-white/50">Ajustes del juego</span>
                </span>
              </button>
              <button aria-label="Música" className="w-10 h-10 rounded-lg border border-white/15 hover:border-celeste/50 hover:bg-white/5 transition-colors grid place-items-center">
                <Music size={18} className="text-white/80" />
              </button>
              <button aria-label="Sonido" className="w-10 h-10 rounded-lg border border-white/15 hover:border-celeste/50 hover:bg-white/5 transition-colors grid place-items-center">
                <Volume2 size={18} className="text-white/80" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pelota con estela celeste, como el ícono grande del panel activo en la referencia.
function BallIcon({ size = 56 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 140" className="absolute -left-[70%] top-0 w-[170%] h-full opacity-80" style={{ filter: "blur(1px)" }}>
        <path d="M100 20 C 60 40, 40 60, 20 70 C 40 80, 60 100, 100 120" fill="none" stroke="url(#ballTrail)" strokeWidth="14" strokeLinecap="round" />
        <defs>
          <linearGradient id="ballTrail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 rounded-full bg-celeste/40 blur-xl" />
      <svg viewBox="0 0 100 100" className="relative w-full h-full drop-shadow-[0_0_16px_rgba(56,189,248,0.75)]">
        <circle cx="50" cy="50" r="46" fill="#f3f3f3" stroke="#141414" strokeWidth="3" />
        <circle cx="50" cy="50" r="14" fill="#141414" />
        {[0, 72, 144, 216, 288].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const cx = 50 + Math.cos(rad) * 27;
          const cy = 50 + Math.sin(rad) * 27;
          return <circle key={i} cx={cx} cy={cy} r="9" fill="#1a1a1a" />;
        })}
      </svg>
    </div>
  );
}

// Reflectores y polvo ambiente ya usados en el resto del juego (Modo Carrera),
// acá sin el fondo desenfocado propio: sólo el efecto, sobre nuestra foto nítida.
function AmbientDust() {
  const [dust, setDust] = useState<{ l: number; t: number; d: number; s: number; o: number }[]>([]);
  useEffect(() => {
    setDust(Array.from({ length: 18 }, () => ({
      l: Math.random() * 100,
      t: Math.random() * 100,
      d: 10 + Math.random() * 18,
      s: 1 + Math.random() * 2.2,
      o: 0.1 + Math.random() * 0.22,
    })));
  }, []);
  return (
    <div className="ambient-dust">
      {dust.map((p, i) => (
        <span key={i} style={{
          left: `${p.l}%`, top: `${p.t}%`,
          width: p.s, height: p.s, opacity: p.o,
          animationDuration: `${p.d}s`, animationDelay: `${-p.d * Math.random()}s`,
        }} />
      ))}
    </div>
  );
}

// Cinta de escudos de los 36 clubes desplazándose sin parar (loop sin cortes),
// para que el menú se sienta vivo aunque no se esté navegando.
function TeamsMarquee() {
  const teams = useAllTeams();
  if (teams.length === 0) return null;
  const loop = [...teams, ...teams]; // se duplica para que el scroll sea continuo
  return (
    <div className="w-full max-w-5xl overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="flex items-center gap-4 md:gap-6 w-max animate-[teamsMarquee_50s_linear_infinite]">
        {loop.map((t, i) => (
          <div key={`${t.id}-${i}`} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity" title={t.name}>
            <Shield team={t} size={34} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes teamsMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
