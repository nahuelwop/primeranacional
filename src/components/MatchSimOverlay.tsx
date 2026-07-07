import { useEffect, useState } from "react";
import { TEAMS_BY_ID } from "@/data/teams";
import { Shield } from "@/components/Shield";

export function MatchSimOverlay({ homeId, awayId, hg, ag, onDone }: {
  homeId: string; awayId: string; hg: number; ag: number; onDone: () => void;
}) {
  const h = TEAMS_BY_ID[homeId], a = TEAMS_BY_ID[awayId];
  const [minute, setMinute] = useState(0);
  const [scoreH, setScoreH] = useState(0);
  const [scoreA, setScoreA] = useState(0);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const totalGoals = hg + ag;
    // Reparte goles en minutos aleatorios crecientes
    const goalMinutes: Array<{ minute: number; side: "h" | "a" }> = [];
    for (let i = 0; i < hg; i++) goalMinutes.push({ minute: Math.floor(Math.random() * 88) + 2, side: "h" });
    for (let i = 0; i < ag; i++) goalMinutes.push({ minute: Math.floor(Math.random() * 88) + 2, side: "a" });
    goalMinutes.sort((x, y) => x.minute - y.minute);

    const durationMs = 3000;
    const startTime = Date.now();
    let goalIdx = 0;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(1, elapsed / durationMs);
      const m = Math.floor(pct * 90);
      setMinute(m);
      while (goalIdx < goalMinutes.length && goalMinutes[goalIdx].minute <= m) {
        if (goalMinutes[goalIdx].side === "h") setScoreH(s => s + 1);
        else setScoreA(s => s + 1);
        goalIdx++;
      }
      if (pct >= 1) {
        clearInterval(interval);
        setScoreH(hg); setScoreA(ag); setMinute(90);
        setEnded(true);
        setTimeout(onDone, 1200);
      }
    }, 60);
    return () => clearInterval(interval);
  }, [homeId, awayId, hg, ag, onDone]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-lg bg-card rounded-2xl border border-border p-6 text-center">
        <div className="text-celeste text-xs font-display tracking-[0.3em] mb-4">
          {ended ? "FINAL" : `SIMULANDO... ${minute}'`}
        </div>
        <div className="flex items-center justify-around gap-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            {h && <Shield team={h} size={64} />}
            <div className="font-display text-sm truncate max-w-full">{h?.short}</div>
          </div>
          <div className="font-display text-5xl tabular-nums">
            {scoreH} <span className="text-muted-foreground">-</span> {scoreA}
          </div>
          <div className="flex flex-col items-center gap-2 flex-1">
            {a && <Shield team={a} size={64} />}
            <div className="font-display text-sm truncate max-w-full">{a?.short}</div>
          </div>
        </div>
        {!ended && (
          <div className="mt-6 h-1 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-celeste transition-all" style={{ width: `${(minute / 90) * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
