import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Shield } from "@/components/Shield";
import { Nav } from "@/components/Nav";
import { ZONE_A, ZONE_B, type Team } from "@/data/teams";
import { hydrateTeamsFromDbRows, useTeamsSync, type DbTeam } from "@/lib/teams-sync";
import { getTeamsForBoot } from "@/lib/teams.functions";
import { useAuth } from "@/lib/auth";
import { PlayCircle, Handshake, Trophy, Swords, Layers, Users, BarChart3, Award, House } from "lucide-react";
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

  return <PesHub user={user} username={username} />;
}

// ===================== MENÚ PRINCIPAL ESTILO PES =====================

type HubItem = {
  id: string;
  label: string;
  desc: string;
  to: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const HUB_ITEMS: HubItem[] = [
  { id: "inicio", label: "INICIO", desc: "El menú principal de Primera Heads.", to: "/", icon: HomeIcon },
  { id: "carrera", label: "MODO CARRERA", desc: "Dirigí a tu club, temporada tras temporada, y llevalo a Primera.", to: "/carrera", icon: Trophy },
  { id: "amistoso", label: "AMISTOSO", desc: "Elegí dos equipos y jugá un 1 vs 1 ahora mismo.", to: "/amistoso", icon: Swords },
  { id: "reducido", label: "REDUCIDO", desc: "Eliminación directa por el segundo ascenso. Un partido puede cambiar todo.", to: "/reducido", icon: Layers },
  { id: "equipos", label: "EQUIPOS", desc: "Los 36 clubes reales de la Primera Nacional, con sus colores y escudos.", to: "/equipos", icon: Users },
  { id: "stats", label: "STATS", desc: "Números, rachas y rendimiento de cada club.", to: "/estadisticas", icon: BarChart3 },
  { id: "logros", label: "LOGROS", desc: "Desafíos y objetivos para desbloquear jugando.", to: "/logros", icon: Award },
];

function HomeIcon({ size, className }: { size?: number; className?: string }) { return <House size={size} className={className} />; }

function PesHub({ user, username }: { user: unknown; username: string | null }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(1); // arranca en "Modo Carrera", como el MATCH de PES
  const current = HUB_ITEMS[selected];

  const go = (item: HubItem) => {
    if (item.to === "/") return; // ya estamos en Inicio
    navigate({ to: item.to });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setSelected(i => Math.min(HUB_ITEMS.length - 1, i + 1));
      if (e.key === "ArrowLeft") setSelected(i => Math.max(0, i - 1));
      if (e.key === "Enter") go(HUB_ITEMS[selected]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* ===== Fondo: estadio + patrón hexagonal + colage de escudos difuminado ===== */}
      <div className="absolute inset-0">
        <img src={stadiumHero} alt="" className="w-full h-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black" />
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage:
            "linear-gradient(30deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(150deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(30deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(150deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8)",
          backgroundSize: "80px 140px",
          backgroundPosition: "0 0, 0 0, 40px 70px, 40px 70px",
        }} />
        <div className="absolute -right-24 -top-24 opacity-[0.18] blur-[2px] pointer-events-none">
          <ShieldCollage />
        </div>
      </div>

      {/* ===== Header ===== */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-12 pt-6">
        <div className="font-display text-xl md:text-2xl tracking-wide">
          PRIMERA <span className="text-celeste">HEADS</span>
        </div>
        {user ? (
          <div className="text-xs md:text-sm text-white/70">
            Jugando como <span className="text-celeste font-semibold">{username ?? "vos"}</span>
          </div>
        ) : (
          <Link to="/auth" className="text-xs md:text-sm px-4 py-1.5 rounded border border-celeste/50 text-celeste hover:bg-celeste/10 transition-colors">
            INICIAR SESIÓN
          </Link>
        )}
      </div>

      {/* ===== Panel grande de "acción" (a futuro: reemplazable por arte/foto personalizada) ===== */}
      <div className="relative z-10 flex-1 flex items-end justify-center px-6">
        <div className="text-center pb-6 max-w-2xl">
          <div className="font-display text-4xl md:text-6xl tracking-wide text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            {current.id === "inicio" ? (
              <>EL ASCENSO <span className="text-celeste">ES NUESTRO</span></>
            ) : current.label}
          </div>
        </div>
      </div>

      {/* ===== Cinta de menú, estilo "MATCH" de PES ===== */}
      <div className="relative z-10">
        <div className="border-t-2 border-celeste bg-gradient-to-r from-black via-[#050a14] to-black">
          <div className="flex items-stretch">
            {/* Bloque de título de la sección activa */}
            <div className="hidden md:flex items-center gap-3 px-6 py-4 border-r border-white/10 min-w-[220px]">
              <current.icon size={30} className="text-celeste shrink-0" />
              <div className="font-display text-lg md:text-xl tracking-wide truncate">{current.label}</div>
            </div>

            {/* Íconos navegables */}
            <div className="flex-1 flex items-center gap-1 overflow-x-auto px-2 py-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-white/15">
              {HUB_ITEMS.map((item, i) => {
                const active = i === selected;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => { setSelected(i); go(item); }}
                    className={`shrink-0 flex flex-col items-center gap-1.5 px-4 md:px-5 py-3 transition-all duration-150 ${
                      active ? "opacity-100" : "opacity-45 hover:opacity-75"
                    }`}
                  >
                    <item.icon size={active ? 26 : 20} className={active ? "text-celeste" : "text-white"} />
                    <span className={`text-[10px] tracking-wide whitespace-nowrap ${active ? "text-celeste" : "text-white/70"}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Descripción + controles, como el pie de pantalla de PES */}
        <div className="bg-black px-6 py-3 flex items-center justify-between text-xs md:text-sm">
          <span className="text-white/70 truncate pr-4">{current.desc}</span>
          <span className="text-white/35 shrink-0 hidden sm:inline">← → elegir · Enter / click confirmar</span>
        </div>
      </div>
    </div>
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
