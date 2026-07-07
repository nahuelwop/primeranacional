import { useState } from "react";
import type { GameSettings } from "@/lib/game-settings";
import { useTournament } from "@/store/tournament";
import { simulateMatch } from "@/lib/tournament";

type Mode = "torneo" | "carrera";

const LABELS: Record<string, { label: string; icon: string }> = {
  forzar_victoria:     { label: "Forzar victoria",       icon: "🏆" },
  forzar_empate:       { label: "Forzar empate",         icon: "🤝" },
  forzar_derrota:      { label: "Forzar derrota",        icon: "😬" },
  clasificar_reducido: { label: "Clasificar al Reducido", icon: "🎟️" },
  forzar_ascensos:     { label: "Forzar ascenso",        icon: "⬆️" },
  forzar_descensos:    { label: "Forzar descenso rival", icon: "⬇️" },
  anular_goles:        { label: "Anular goles rivales",  icon: "🚫" },
};

export function CoimasMenu({ mode, settings, onCoima }: {
  mode: Mode;
  settings: GameSettings;
  onCoima?: (kind: string) => void;
}) {
  const s = useTournament();
  const [log, setLog] = useState<string | null>(null);

  const enabled = Object.entries(settings.coimas_flags).filter(([, v]) => v).map(([k]) => k);
  if (enabled.length === 0) return (
    <div className="rounded-2xl bg-card border border-yellow-500/40 p-4">
      <div className="font-display text-lg text-yellow-500">💼 COIMAS & ARREGLOS</div>
      <p className="text-xs text-muted-foreground mt-1">El administrador aún no habilitó ninguna función.</p>
    </div>
  );

  function forceUserResult(kind: "victoria" | "empate" | "derrota") {
    if (mode !== "torneo" || !s.userTeamId) return;
    const nm = s.fixture.find(m => !m.played && (m.home === s.userTeamId || m.away === s.userTeamId));
    if (!nm) { setLog("No hay partido pendiente"); return; }
    const userIsHome = nm.home === s.userTeamId;
    let hg = 0, ag = 0;
    if (kind === "victoria") { hg = userIsHome ? 2 : 0; ag = userIsHome ? 0 : 2; }
    else if (kind === "empate") { hg = 1; ag = 1; }
    else { hg = userIsHome ? 0 : 2; ag = userIsHome ? 2 : 0; }
    s.recordUserMatch(nm.id, hg, ag);
    setLog(`Resultado arreglado: ${hg}-${ag}`);
  }

  return (
    <div className="rounded-2xl bg-card border border-yellow-500/40 p-4">
      <div className="flex items-center justify-between">
        <div className="font-display text-lg text-yellow-500">💼 COIMAS & ARREGLOS</div>
        {log && <div className="text-xs text-celeste">{log}</div>}
      </div>
      <p className="text-xs text-muted-foreground mb-3">Sólo las opciones habilitadas por el admin. Úsalas con cuidado.</p>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
        {enabled.map(k => {
          const meta = LABELS[k] ?? { label: k, icon: "•" };
          return (
            <button key={k} onClick={() => {
              if (k === "forzar_victoria") forceUserResult("victoria");
              else if (k === "forzar_empate") forceUserResult("empate");
              else if (k === "forzar_derrota") forceUserResult("derrota");
              else if (k === "anular_goles") setLog(`Los rivales tendrán 1 gol anulado cada ${settings.anular_goles_ratio}`);
              else setLog(`"${meta.label}" activada`);
              onCoima?.(k);
            }}
              className="text-left p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 transition">
              <div className="text-lg">{meta.icon}</div>
              <div className="font-display text-sm">{meta.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
