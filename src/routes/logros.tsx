import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/lib/auth";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { fetchAchievements } from "@/lib/career-api";

export const Route = createFileRoute("/logros")({
  head: () => ({ meta: [
    { title: "Logros · Primera Heads" },
    { name: "description", content: "Tus logros desbloqueados en modo carrera." },
  ] }),
  component: LogrosPage,
});

type Tier = "bronze" | "silver" | "gold";

// Nivel de dificultad derivado del propio key del logro (no toca lib/achievements.ts).
// Los hitos más exigentes (grandes cifras, títulos múltiples, llegar a Primera) son oro;
// los intermedios plata; el resto bronce.
const GOLD_KEYS = new Set([
  "50_victorias", "500_goles", "5_trofeos", "campeon_primera", "ascenso_a_primera", "caja_30000", "club_de_primera",
]);
const SILVER_KEYS = new Set([
  "25_victorias", "250_goles", "20_invicto", "tres_titulos", "campeon_zona_a", "campeon_zona_b", "caja_15000", "proyecto_club",
]);
function tierOf(key: string): Tier {
  if (GOLD_KEYS.has(key)) return "gold";
  if (SILVER_KEYS.has(key)) return "silver";
  return "bronze";
}

const TIER_STYLE: Record<Tier, { ring: string; glow: string; badge: string; label: string }> = {
  bronze: { ring: "border-amber-700/50", glow: "shadow-[0_0_20px_-6px_rgba(180,120,60,0.6)]", badge: "bg-amber-800/30 text-amber-400 border-amber-700/50", label: "Bronce" },
  silver: { ring: "border-slate-300/50", glow: "shadow-[0_0_20px_-6px_rgba(200,210,220,0.6)]", badge: "bg-slate-400/20 text-slate-200 border-slate-300/40", label: "Plata" },
  gold:   { ring: "border-accent/60", glow: "shadow-[0_0_24px_-4px_rgba(250,204,21,0.7)]", badge: "bg-accent/20 text-accent border-accent/50", label: "Oro" },
};

function LogrosPage() {
  const { user, loading } = useAuth();
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { setBusy(false); return; }
    (async () => {
      try {
        const rows = await fetchAchievements(user.id);
        setUnlocked(Object.fromEntries(rows.map(r => [r.key, r.unlocked_at])));
      } finally { setBusy(false); }
    })();
  }, [user, loading]);

  const total = ACHIEVEMENTS.length;
  const got = Object.keys(unlocked).length;
  const pct = total ? Math.round((got / total) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
          <div>
            <h1 className="font-display text-5xl flex items-center gap-3">
              LOGROS <span className="text-accent text-3xl">🏆</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Desbloqueá medallas jugando el modo carrera.</p>
          </div>
          {user && !busy && (
            <div className="text-right">
              <div className="font-display text-2xl text-celeste">{got}<span className="text-muted-foreground text-base">/{total}</span></div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Desbloqueados</div>
            </div>
          )}
        </div>

        {user && !busy && (
          <div className="h-2.5 rounded-full bg-white/5 border border-border overflow-hidden mb-8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-celeste to-accent transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {loading || busy ? (
          <div className="mt-8 text-center text-muted-foreground">Cargando…</div>
        ) : !user ? (
          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">Iniciá sesión para ver tus logros.</p>
            <Link to="/auth" className="inline-block px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display">Iniciar sesión</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map(a => {
              const when = unlocked[a.key];
              const isGot = !!when;
              const tier = tierOf(a.key);
              const style = TIER_STYLE[tier];
              return (
                <div
                  key={a.key}
                  className={`relative rounded-xl border p-4 flex items-start gap-3.5 overflow-hidden transition-all duration-200 ${
                    isGot ? `bg-card ${style.ring} ${style.glow} hover:-translate-y-0.5` : "bg-card/40 border-border/60 opacity-55"
                  }`}
                >
                  <div className={`relative shrink-0 w-12 h-12 rounded-full grid place-items-center text-2xl border ${
                    isGot ? `${style.badge}` : "bg-white/5 border-border text-muted-foreground"
                  }`}>
                    {isGot ? a.icon : "🔒"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display text-lg leading-tight">{a.name}</div>
                      {isGot && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border uppercase tracking-widest ${style.badge}`}>
                          {style.label}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                    {isGot && (
                      <div className="text-[10px] text-celeste mt-1.5 font-medium">
                        ✓ Desbloqueado · {new Date(when).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {isGot && (
                    <div className="absolute -right-6 -top-6 w-16 h-16 rounded-full opacity-20 blur-2xl"
                      style={{ background: tier === "gold" ? "#facc15" : tier === "silver" ? "#cbd5e1" : "#b45309" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
