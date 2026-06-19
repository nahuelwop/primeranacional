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

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <h1 className="font-display text-5xl">LOGROS</h1>
        <p className="text-muted-foreground text-sm mt-1">Desbloqueá medallas jugando el modo carrera.</p>

        {loading || busy ? (
          <div className="mt-8 text-center text-muted-foreground">Cargando…</div>
        ) : !user ? (
          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">Iniciá sesión para ver tus logros.</p>
            <Link to="/auth" className="inline-block px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display">Iniciar sesión</Link>
          </div>
        ) : (
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map(a => {
              const when = unlocked[a.key];
              const got = !!when;
              return (
                <div key={a.key} className={`rounded-xl border p-4 flex items-start gap-3 ${got ? "bg-celeste/10 border-celeste/40" : "bg-card border-border opacity-60"}`}>
                  <div className="text-3xl">{a.icon}</div>
                  <div className="flex-1">
                    <div className="font-display text-lg">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.description}</div>
                    {got && <div className="text-[10px] text-celeste mt-1">Desbloqueado · {new Date(when).toLocaleDateString()}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
