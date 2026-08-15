import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { Nav } from "@/components/Nav";
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

function Home() {
  const { teams } = Route.useLoaderData();
  useState(() => hydrateTeamsFromDbRows(teams as unknown as DbTeam[]));
  useTeamsSync();
  const { isAdmin } = useAuth();

  return <PesHub isAdmin={isAdmin} />;
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

function PesHub({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const items: HubItem[] = isAdmin
    ? [...HUB_ITEMS, { id: "admin", label: "ADMIN", desc: "Panel de administración del juego.", to: "/admin", icon: Star }]
    : HUB_ITEMS;
  const [selected, setSelected] = useState(1); // arranca en "Amistoso"
  const current = items[Math.min(selected, items.length - 1)];
  // La fila de íconos chicos muestra todo MENOS el ítem que está en el panel grande.
  const rowItems = items.filter((_, i) => i !== selected);

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
      {/* ===== Fondo: estadio a pantalla completa + patrón hexagonal ===== */}
      <div className="absolute inset-0">
        <img src={stadiumHero} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black" />
        <div className="absolute inset-0 opacity-[0.10]" style={{
          backgroundImage:
            "linear-gradient(30deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(150deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(30deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(150deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8)",
          backgroundSize: "72px 126px",
          backgroundPosition: "0 0, 0 0, 36px 63px, 36px 63px",
        }} />
      </div>

      {/* ===== Header: barra real de navegación, con "Amistoso" resaltado según selección ===== */}
      <div className="relative z-10">
        <Nav />
      </div>

      {/* Espaciador flexible: deja ver la foto del estadio arriba, como la referencia */}
      <div className="relative z-10 flex-1" />

      {/* ===== Cinta hub inferior, estilo consola ===== */}
      <div className="relative z-10">
        <div className="border-t-2 border-celeste bg-gradient-to-r from-black via-[#050a14] to-black">
          <div className="flex items-stretch flex-wrap md:flex-nowrap">
            {/* Panel grande: sección activa, con clip hexagonal y borde luminoso */}
            <button
              onClick={() => go(current)}
              className="group relative flex items-center gap-3 md:gap-4 pl-6 pr-8 md:pl-10 md:pr-12 py-5 md:py-6 min-w-[220px] md:min-w-[280px] text-left overflow-hidden"
              style={{ clipPath: "polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%)" }}
            >
              <span className="absolute inset-0 bg-celeste/15 group-hover:bg-celeste/25 transition-colors" />
              <span className="absolute inset-0 border-2 border-celeste/70 shadow-[0_0_28px_-4px_rgba(56,189,248,0.7)]" style={{ clipPath: "polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%)" }} />
              <current.icon size={30} className="relative text-celeste shrink-0 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
              <span className="relative font-display text-xl md:text-2xl tracking-wide truncate">{current.label}</span>
            </button>

            {/* Íconos navegables (todo el resto de las secciones) */}
            <div className="flex-1 flex items-center gap-1 overflow-x-auto px-2 py-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-white/15">
              {rowItems.map(item => {
                const realIndex = items.indexOf(item);
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setSelected(realIndex)}
                    onClick={() => setSelected(realIndex)}
                    className="shrink-0 flex flex-col items-center gap-1.5 px-4 md:px-5 py-3 opacity-55 hover:opacity-100 transition-all duration-150"
                  >
                    <item.icon size={20} className="text-white" />
                    <span className="text-[10px] tracking-wide whitespace-nowrap text-white/70">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Config + sonido, como el pie de pantalla de consola */}
            <div className="hidden md:flex items-center gap-2 pr-6">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 hover:border-celeste/50 hover:bg-white/5 transition-colors text-left">
                <Settings size={16} className="text-celeste" />
                <span className="leading-tight">
                  <span className="block text-xs font-semibold">Configuración</span>
                  <span className="block text-[10px] text-white/50">Ajustes del juego</span>
                </span>
              </button>
              <button aria-label="Música" className="w-9 h-9 rounded-lg border border-white/15 hover:border-celeste/50 hover:bg-white/5 transition-colors grid place-items-center">
                <Music size={16} className="text-white/80" />
              </button>
              <button aria-label="Sonido" className="w-9 h-9 rounded-lg border border-white/15 hover:border-celeste/50 hover:bg-white/5 transition-colors grid place-items-center">
                <Volume2 size={16} className="text-white/80" />
              </button>
            </div>
          </div>
        </div>

        {/* Descripción + controles tipo gamepad, como el pie de pantalla de consola */}
        <div className="bg-black px-6 py-3 flex items-center justify-between text-xs md:text-sm gap-4">
          <span className="text-white/70 truncate">{current.desc}</span>
          <span className="hidden sm:flex items-center gap-4 shrink-0 text-white/60">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-green-500/90 text-black text-[11px] font-bold grid place-items-center">A</span>
              Seleccionar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-red-500/90 text-black text-[11px] font-bold grid place-items-center">B</span>
              Volver
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
