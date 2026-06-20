import { useState } from "react";
import { Shield } from "@/components/Shield";
import { Team } from "@/data/teams";

type Corner = "TL" | "TC" | "TR" | "BL" | "BC" | "BR";
const CORNERS: Corner[] = ["TL", "TC", "TR", "BL", "BC", "BR"];

type Shot = { team: "H" | "A"; corner: Corner; gk: Corner; goal: boolean };

export function Penales({ home, away, onEnd }: { home: Team; away: Team; onEnd: (winner: "H" | "A", h: number, a: number) => void }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [turn, setTurn] = useState<"H" | "A">("H");
  const [lastShot, setLastShot] = useState<Shot | null>(null);
  const [done, setDone] = useState(false);

  const hShots = shots.filter(s => s.team === "H");
  const aShots = shots.filter(s => s.team === "A");
  const hScore = hShots.filter(s => s.goal).length;
  const aScore = aShots.filter(s => s.goal).length;

  function kick(corner: Corner) {
    if (done) return;
    const gk = CORNERS[Math.floor(Math.random() * CORNERS.length)];
    // Si el arquero atinó la esquina, 75% atajada. Si no, 88% gol.
    const goal = gk === corner ? Math.random() > 0.75 : Math.random() < 0.88;
    const shot: Shot = { team: turn, corner, gk, goal };
    const next = [...shots, shot];
    setShots(next);
    setLastShot(shot);

    const nh = next.filter(s => s.team === "H");
    const na = next.filter(s => s.team === "A");
    const hs = nh.filter(s => s.goal).length;
    const as = na.filter(s => s.goal).length;

    // ¿Definido?
    // Primeros 5 cada uno: termina si la diferencia ya no se puede alcanzar.
    const round = Math.max(nh.length, na.length);
    const both = nh.length === na.length;
    let finished = false;
    if (round <= 5) {
      const hRemaining = 5 - nh.length;
      const aRemaining = 5 - na.length;
      if (both && Math.abs(hs - as) > hRemaining && Math.abs(hs - as) > aRemaining) finished = true;
      if (!both && Math.abs(hs - as) > Math.min(hRemaining, aRemaining)) finished = true;
      if (both && nh.length === 5 && hs !== as) finished = true;
    } else {
      // Muerte súbita: cada par de tiros decide.
      if (both && hs !== as) finished = true;
    }

    if (finished) {
      setDone(true);
      setTimeout(() => onEnd(hs > as ? "H" : "A", hs, as), 1200);
      return;
    }
    setTurn(turn === "H" ? "A" : "H");
  }

  const shooter = turn === "H" ? home : away;
  const keeper = turn === "H" ? away : home;

  return (
    <div className="rounded-2xl bg-card border border-border p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><Shield team={home} size={32} /><div className="font-display text-2xl tabular-nums">{hScore}</div></div>
        <div className="font-display text-sm text-muted-foreground">PENALES</div>
        <div className="flex items-center gap-2"><div className="font-display text-2xl tabular-nums">{aScore}</div><Shield team={away} size={32} /></div>
      </div>

      <div className="flex justify-center gap-1 mb-1">
        {Array.from({ length: Math.max(5, hShots.length) }).map((_, i) => (
          <div key={`h${i}`} className={`w-4 h-4 rounded-full border ${hShots[i] ? (hShots[i].goal ? "bg-celeste border-celeste" : "bg-destructive/70 border-destructive") : "border-border"}`} />
        ))}
      </div>
      <div className="flex justify-center gap-1 mb-3">
        {Array.from({ length: Math.max(5, aShots.length) }).map((_, i) => (
          <div key={`a${i}`} className={`w-4 h-4 rounded-full border ${aShots[i] ? (aShots[i].goal ? "bg-celeste border-celeste" : "bg-destructive/70 border-destructive") : "border-border"}`} />
        ))}
      </div>

      {!done && (
        <>
          <div className="text-center text-sm mb-2">
            Patea <span className="font-display text-base">{shooter.name}</span> · ataja <span className="text-muted-foreground">{keeper.short}</span>
          </div>
          <div className="mx-auto max-w-md aspect-[2/1] relative rounded-xl bg-emerald-900/30 border-2 border-white/60 p-2 grid grid-cols-3 grid-rows-2 gap-2">
            {CORNERS.map(c => {
              const isLast = lastShot?.corner === c;
              const isGk = lastShot?.gk === c;
              return (
                <button key={c} onClick={() => kick(c)}
                  className={`relative rounded-md border border-white/30 hover:bg-white/10 transition ${isLast ? (lastShot!.goal ? "bg-celeste/40" : "bg-destructive/40") : ""}`}>
                  {isGk && <span className="absolute inset-0 flex items-center justify-center text-2xl">🧤</span>}
                  {isLast && <span className="absolute inset-0 flex items-center justify-center text-2xl">{lastShot!.goal ? "⚽" : "✋"}</span>}
                </button>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground text-center mt-2">Elegí esquina haciendo click.</div>
        </>
      )}

      {done && (
        <div className="text-center font-display text-xl mt-2">
          Ganó por penales {hScore > aScore ? home.name : away.name}
        </div>
      )}
    </div>
  );
}
