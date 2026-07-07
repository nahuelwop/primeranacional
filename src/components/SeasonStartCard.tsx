import { useEffect } from "react";
import { TEAMS_BY_ID } from "@/data/teams";
import { Shield } from "@/components/Shield";

export function SeasonStartCard({ season, teamId, objetivo, onDone }: {
  season: number; teamId: string; objetivo: string; onDone: () => void;
}) {
  const team = TEAMS_BY_ID[teamId];
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed inset-0 z-[55] bg-black/95 grid place-items-center p-6 animate-fade-in">
      <div className="text-center max-w-xl">
        <div className="text-celeste text-xs font-display tracking-[0.4em] mb-3">━━━━━━━━━━━━━━━━━━</div>
        <div className="font-display text-6xl tracking-widest mb-6">TEMPORADA 2026</div>
        {team && (
          <div className="flex flex-col items-center gap-3 mb-6">
            <Shield team={team} size={100} />
            <div className="font-display text-3xl">{team.name}</div>
          </div>
        )}
        <div className="text-xs text-muted-foreground uppercase tracking-widest">Objetivo</div>
        <div className="font-display text-2xl text-celeste mt-1">{objetivo}</div>
        <div className="text-celeste text-xs font-display tracking-[0.4em] mt-6">━━━━━━━━━━━━━━━━━━</div>
        <button onClick={onDone} className="mt-6 px-6 py-2 rounded-lg bg-celeste text-primary-foreground font-display tracking-wider">COMENZAR</button>
      </div>
    </div>
  );
}
