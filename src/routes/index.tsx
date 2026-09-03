import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Trophy, Swords, Layers, Users, BarChart3, Award, Star, Settings, LogOut } from "lucide-react";
import { Shield } from "@/components/Shield";
import { ZONE_A, ZONE_B, type Team } from "@/data/teams";
import { hydrateTeamsFromDbRows, useTeamsSync, type DbTeam } from "@/lib/teams-sync";
import { getTeamsForBoot } from "@/lib/teams.functions";
import { useAuth } from "@/lib/auth";
import stadiumHero from "@/assets/stadium-hero-night.jpg";

export const Route = createFileRoute("/")({
  loader: async () => {
    const bootTeams = await getTeamsForBoot();
    hydrateTeamsFromDbRows(bootTeams as unknown as DbTeam[]);
    return { teams: bootTeams };
  },
  head: () => ({
    meta: [
      { title: "Primera Heads · Fútbol Argentino" },
      { name: "description", content: "Primera Heads: fútbol argentino en formato arcade, con Modo Carrera, Copa Argentina y torneos." },
      { property: "og:title", content: "Primera Heads · Fútbol Argentino" },
      { property: "og:description", content: "El ascenso es nuestro." },
    ],
  }),
  component: Home,
});

function useAllTeams(): Team[] {
  const version = useTeamsSync();
  return useMemo(() => [...ZONE_A, ...ZONE_B], [version]);
}

function Home() {
  const { teams } = Route.useLoaderData();
  useState(() => hydrateTeamsFromDbRows(teams as unknown as DbTeam[]));
  useTeamsSync();
  const { user, username, isAdmin, signOut } = useAuth();
  const teams = useAllTeams();

  return <PesHub user={user} username={username} isAdmin={isAdmin} onSignOut={signOut} teams={teams} />;
}

type HubItem = {
  id: string;
  label: string;
  desc: string;
  to?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const HUB_ITEMS: HubItem[] = [
  { id: "amistoso", label: "AMISTOSO", desc: "Elegí dos equipos y jugá un 1 vs 1 ahora mismo.", to: "/amistoso", icon: Swords },
  { id: "carrera", label: "CARRERA", desc: "Dirigí a tu club, temporada tras temporada, y llevalo a lo más alto.", to: "/carrera", icon: Trophy },
  { id: "copa-argentina", label: "COPA ARGENTINA", desc: "Elegí cualquier club y jugá el torneo sin necesidad de crear una cuenta.", to: "/copa-argentina", icon: Trophy },
  { id: "reducido", label: "TORNEOS", desc: "Competencias eliminatorias, ascensos y partidos donde no hay margen de error.", to: "/reducido", icon: Layers },
  { id: "equipos", label: "EDITAR / EQUIPOS", desc: "Consultá clubes, escudos, colores y toda la información disponible.", to: "/equipos", icon: Users },
  { id: "stats", label: "ESTADÍSTICAS", desc: "Números, rachas, posiciones y rendimiento de los clubes.", to: "/estadisticas", icon: BarChart3 },
  { id: "logros", label: "LOGROS", desc: "Desafíos y objetivos para desbloquear mientras jugás.", to: "/logros", icon: Award },
  { id: "opciones", label: "OPCIONES", desc: "Cuenta, sonidos y configuración del juego.", to: "/auth", icon: Settings },
];

function PesHub({
  user,
  username,
  isAdmin,
  onSignOut,
  teams,
}: {
  user: unknown;
  username: string | null;
  isAdmin: boolean;
  onSignOut: () => void;
  teams: Team[];
}) {
  const navigate = useNavigate();
  const items: HubItem[] = isAdmin
    ? [...HUB_ITEMS, { id: "admin", label: "ADMIN", desc: "Panel de administración del juego.", to: "/admin", icon: Star }]
    : HUB_ITEMS;
  const [selected, setSelected] = useState(0);
  const current = items[Math.min(selected, items.length - 1)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setSelected(i => Math.min(items.length - 1, i + 1));
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSelected(i => Math.max(0, i - 1));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        activate(items[Math.min(selected, items.length - 1)]);
      }
    };
    function activate(item: HubItem) {
      if (!item?.to) return;
      navigate({ to: item.to });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, items, selected]);

  const lastCareer = user ? (username ? `${username.toUpperCase()} · CARRERA` : "CARRERA ACTIVA") : "SIN CARRERA ACTIVA";

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white selection:bg-celeste/30">
      <div className="absolute inset-0">
        <img src={stadiumHero} alt="Estadio de fútbol de noche" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.94)_0%,rgba(0,0,0,.76)_28%,rgba(0,0,0,.18)_54%,rgba(0,0,0,.40)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.60)_0%,rgba(0,0,0,.12)_43%,rgba(0,0,0,.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_42%,rgba(56,189,248,.12),transparent_34%)]" />
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: "linear-gradient(30deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8),linear-gradient(150deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8)",
          backgroundSize: "72px 126px",
        }} />
      </div>

      <header className="relative z-20 flex items-center justify-between px-6 md:px-10 pt-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-celeste via-celeste to-white text-black shadow-[0_0_28px_rgba(56,189,248,.45)] font-display text-sm">
            PH
          </div>
          <div>
            <div className="font-display text-xl md:text-2xl tracking-wide">PRIMERA HEADS</div>
            <div className="text-[9px] tracking-[0.38em] text-white/55">EL ASCENSO ES NUESTRO</div>
          </div>
        </Link>
        <div className="flex items-center gap-3 text-xs md:text-sm">
          <div className="hidden md:flex items-center gap-2 text-white/60">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-white/20 text-base">{user ? "◉" : "○"}</span>
            <span>{user ? (username ?? "CUENTA") : "INVITADO"}</span>
          </div>
          {isAdmin && <Link to="/admin" className="text-gold hover:text-white transition-colors">ADMIN</Link>}
          {user ? (
            <button onClick={onSignOut} aria-label="Cerrar sesión" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 hover:border-celeste/50 hover:bg-white/5 transition-colors"><LogOut size={17} /></button>
          ) : (
            <Link to="/auth" aria-label="Iniciar sesión" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 hover:border-celeste/50 hover:bg-white/5 transition-colors">○</Link>
          )}
        </div>
      </header>

      <main className="relative z-10 min-h-[calc(100vh-80px)] grid lg:grid-cols-[500px_1fr]">
        <aside className="relative flex flex-col justify-center py-8">
          <div className="absolute left-0 top-8 bottom-8 w-[1px] bg-white/10" />
          <div className="absolute left-0 top-8 bottom-8 w-[54%] bg-black/25 backdrop-blur-[2px]" style={{ clipPath: "polygon(0 0,100% 0,82% 100%,0 100%)" }} />
          <nav className="relative z-10 pl-7 pr-12 max-w-[470px]">
            {items.map((item, index) => {
              const active = index === selected;
              const button = (
                <button
                  onMouseEnter={() => setSelected(index)}
                  onFocus={() => setSelected(index)}
                  onClick={() => item.to && navigate({ to: item.to })}
                  className={`w-full flex items-center gap-4 px-5 py-3 text-left border-b border-white/[0.035] transition-all duration-200 ${active ? "bg-celeste/85 text-white shadow-[0_0_30px_rgba(56,189,248,.18)]" : "text-white/70 hover:text-white hover:bg-white/[0.035]"}`}
                  style={{ clipPath: active ? "polygon(0 0,96% 0,100% 50%,96% 100%,0 100%)" : undefined }}
                >
                  <item.icon size={19} className={active ? "text-white" : "text-white/70"} />
                  <span className="font-display tracking-wide text-lg md:text-xl">{item.label}</span>
                </button>
              );
              return <div key={item.id}>{button}</div>;
            })}
          </nav>
        </aside>

        <section className="relative flex flex-col justify-center px-8 md:px-14 lg:px-12 xl:px-20 py-10">
          <div className="max-w-3xl lg:-mt-10">
            <div key={`${current.id}-stars`} className="flex items-center gap-2 mb-4 hud-rise">
              {[0, 1, 2, 3, 4].map(i => <span key={i} className={`text-2xl md:text-3xl ${i === 4 ? "text-celeste" : "text-white/90"}`}>★</span>)}
            </div>
            <div key={current.id} className="hud-rise">
              <h1 className="font-display leading-[0.82] tracking-[0.02em] text-[clamp(4.5rem,9vw,8.5rem)]">
                <span className="block text-white drop-shadow-[0_0_18px_rgba(255,255,255,.18)]">PRIMERA</span>
                <span className="block text-celeste drop-shadow-[0_0_40px_rgba(56,189,248,.55)]">HEADS</span>
              </h1>
              <p className="mt-5 font-display text-sm md:text-lg tracking-[0.38em] text-accent">EL ASCENSO ES NUESTRO</p>
              <div className="mt-7 max-w-xl text-white/65 text-sm md:text-base leading-relaxed">{current.desc}</div>
            </div>
          </div>

          <div className="mt-10 md:mt-14 max-w-5xl grid sm:grid-cols-3 gap-3">
            <Link to="/carrera" className="hud-card p-4 rounded-xl border border-white/10 bg-black/45 backdrop-blur-md hover:border-celeste/50 transition-colors">
              <div className="text-[10px] uppercase tracking-[0.25em] text-celeste mb-2">Última carrera</div>
              <div className="font-display text-xl tracking-wide">{lastCareer}</div>
              <div className="mt-1 text-[11px] text-white/40">Continuá tu progreso</div>
            </Link>
            <Link to="/copa-argentina" className="hud-card p-4 rounded-xl border border-white/10 bg-black/45 backdrop-blur-md hover:border-celeste/50 transition-colors">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-celeste mb-2"><span>Desafío</span><span>+600 XP</span></div>
              <div className="font-display text-xl tracking-wide">GANÁ 2 PARTIDOS</div>
              <div className="mt-1 text-[11px] text-white/40">Jugá con un club de Federal A</div>
            </Link>
            <div className="hud-card p-4 rounded-xl border border-white/10 bg-black/45 backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-[0.25em] text-celeste mb-2">Noticias</div>
              <div className="font-display text-xl tracking-wide">COPA ARGENTINA</div>
              <div className="mt-1 text-[11px] text-white/40">Elegí club y comenzá un torneo independiente.</div>
            </div>
          </div>
        </section>
      </main>

      <div className="relative z-20 px-6 md:px-10 pb-5">
        <div className="border-t border-white/10 pt-3 flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.25em] text-white/35">
          <span>{teams.length || 36} CLUBES DISPONIBLES</span>
          <span>ARROW KEYS · ENTER</span>
          <span>TEMPORADA 2026</span>
        </div>
      </div>
    </div>
  );
}
