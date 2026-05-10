import { Link } from "@tanstack/react-router";

const items = [
  { to: "/", label: "Inicio" },
  { to: "/torneo", label: "Torneo" },
  { to: "/reducido", label: "Reducido" },
  { to: "/amistoso", label: "Amistoso" },
  { to: "/equipos", label: "Equipos" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-celeste to-white grid place-items-center font-display text-primary-foreground">PN</div>
          <div className="font-display text-xl tracking-wider">PRIMERA <span className="text-celeste">HEADS</span></div>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {items.map(i => (
            <Link key={i.to} to={i.to}
              className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors font-medium"
              activeProps={{ className: "px-3 py-1.5 rounded-md bg-celeste text-primary-foreground font-semibold" }}>
              {i.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
