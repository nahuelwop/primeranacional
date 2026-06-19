import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

const items = [
  { to: "/", label: "Inicio" },
  { to: "/torneo", label: "Torneo" },
  { to: "/reducido", label: "Reducido" },
  { to: "/amistoso", label: "Amistoso" },
  { to: "/carrera", label: "Carrera" },
  { to: "/equipos", label: "Equipos" },
  { to: "/estadisticas", label: "Stats" },
  { to: "/logros", label: "Logros" },
] as const;

export function Nav() {
  const { user, username, isAdmin } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-celeste to-white grid place-items-center font-display text-primary-foreground">PN</div>
          <div className="font-display text-xl tracking-wider">PRIMERA <span className="text-celeste">HEADS</span></div>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm items-center">
          {items.map(i => (
            <Link key={i.to} to={i.to}
              className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors font-medium"
              activeProps={{ className: "px-3 py-1.5 rounded-md bg-celeste text-primary-foreground font-semibold" }}>
              {i.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin"
              className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors font-medium text-celeste"
              activeProps={{ className: "px-3 py-1.5 rounded-md bg-celeste text-primary-foreground font-semibold" }}>
              ⭐ Admin
            </Link>
          )}
          <Link to="/auth"
            className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors font-medium ml-2 border border-border"
            activeProps={{ className: "px-3 py-1.5 rounded-md bg-celeste text-primary-foreground font-semibold ml-2" }}>
            {user ? `👤 ${username ?? "cuenta"}` : "Iniciar sesión"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
