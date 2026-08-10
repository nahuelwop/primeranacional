import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

const items = [
  { to: "/", label: "Inicio" },
  { to: "/carrera", label: "Carrera" },
  { to: "/reducido", label: "Reducido" },
  { to: "/amistoso", label: "Amistoso" },
  { to: "/equipos", label: "Equipos" },
  { to: "/estadisticas", label: "Stats" },
  { to: "/logros", label: "Logros" },
] as const;

export function Nav() {
  const { user, username, isAdmin } = useAuth();
  return (
    <header className="sticky top-0 z-40 relative border-b border-white/10 bg-background/70 backdrop-blur-xl">
      {/* Línea inferior con degradé animado, en vez de un simple borde gris */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-70"
        style={{
          background: "linear-gradient(90deg, transparent, var(--celeste), var(--gold), var(--celeste), transparent)",
          backgroundSize: "200% 100%",
          animation: "border-gradient-move 8s ease infinite",
        }}
      />
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative w-9 h-9 shrink-0">
            <div className="absolute inset-0 rounded-lg bg-celeste blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-celeste via-celeste to-white grid place-items-center font-display text-primary-foreground shadow-lg">
              PN
            </div>
          </div>
          <div className="font-display text-xl tracking-wider">
            PRIMERA <span className="text-celeste text-glow-celeste">HEADS</span>
          </div>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm items-center">
          {items.map(i => (
            <Link key={i.to} to={i.to}
              className="relative px-3 py-1.5 rounded-md hover:bg-white/5 hover:text-celeste transition-all font-medium"
              activeProps={{
                className: "relative px-3 py-1.5 rounded-md bg-celeste text-primary-foreground font-semibold shadow-[0_0_18px_-2px_oklch(0.82_0.13_230_/_0.7)]",
              }}>
              {i.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin"
              className="px-3 py-1.5 rounded-md hover:bg-white/5 transition-all font-medium text-gold"
              activeProps={{ className: "px-3 py-1.5 rounded-md bg-gold text-primary-foreground font-semibold shadow-[0_0_18px_-2px_oklch(0.85_0.15_90_/_0.7)]" }}>
              ⭐ Admin
            </Link>
          )}
          <Link to="/auth"
            className="btn-glow px-3 py-1.5 rounded-md hover:bg-white/5 transition-all font-medium ml-2 border border-white/15"
            activeProps={{ className: "btn-glow px-3 py-1.5 rounded-md bg-celeste text-primary-foreground font-semibold ml-2" }}>
            {user ? `👤 ${username ?? "cuenta"}` : "Iniciar sesión"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
