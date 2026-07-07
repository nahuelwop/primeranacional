import { TEAMS_BY_ID } from "@/data/teams";
import { Shield } from "@/components/Shield";
import type { Prediction } from "@/lib/predictions";

export function MatchPrediction({ homeId, awayId, prediction }: {
  homeId: string; awayId: string; prediction: Prediction;
}) {
  const h = TEAMS_BY_ID[homeId], a = TEAMS_BY_ID[awayId];
  const fav = prediction.home > prediction.away
    ? { name: h?.short, pct: prediction.home, team: h }
    : prediction.away > prediction.home
      ? { name: a?.short, pct: prediction.away, team: a }
      : null;
  return (
    <div className="rounded-2xl bg-card border border-celeste/40 p-4">
      <div className="text-celeste font-display tracking-[0.3em] text-xs mb-2">⭐ PARTIDO DE LA FECHA</div>
      <div className="flex items-center justify-around gap-4 mb-4">
        <div className="flex flex-col items-center gap-2 flex-1">
          {h && <Shield team={h} size={48} />}
          <div className="font-display text-sm">{h?.short}</div>
        </div>
        <div className="font-display text-3xl text-muted-foreground">VS</div>
        <div className="flex flex-col items-center gap-2 flex-1">
          {a && <Shield team={a} size={48} />}
          <div className="font-display text-sm">{a?.short}</div>
        </div>
      </div>
      {fav && (
        <div className="text-center text-xs text-muted-foreground mb-2">
          Favorito: <span className="font-display text-celeste">{fav.name} ({fav.pct}%)</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 text-center">
        <PredBar label={h?.short ?? "Local"} pct={prediction.home} />
        <PredBar label="Empate" pct={prediction.draw} />
        <PredBar label={a?.short ?? "Visita"} pct={prediction.away} />
      </div>
    </div>
  );
}

function PredBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground truncate">{label}</div>
      <div className="font-display text-xl text-celeste">{pct}%</div>
      <div className="h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
        <div className="h-full bg-celeste" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
