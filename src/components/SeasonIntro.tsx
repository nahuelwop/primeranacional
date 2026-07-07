import { useEffect, useState } from "react";
import { TEAMS, TEAMS_BY_ID } from "@/data/teams";
import { Shield } from "@/components/Shield";

type Props = {
  season: number;
  teamId: string;
  objetivo: string;
  videoUrl?: string | null;
  onDone: () => void;
};

export function SeasonIntro({ season, teamId, objetivo, videoUrl, onDone }: Props) {
  const team = TEAMS_BY_ID[teamId];
  const [step, setStep] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);

  // Secuencia por defecto: 6 pasos ~ 18-20s
  useEffect(() => {
    if (videoUrl && !videoFailed) return; // deja que el video maneje su tiempo
    const timings = [2200, 2200, 3000, 3500, 2500, 4000, 3000]; // ms por paso
    if (step >= timings.length) { onDone(); return; }
    const t = setTimeout(() => setStep(s => s + 1), timings[step]);
    return () => clearTimeout(t);
  }, [step, videoUrl, videoFailed, onDone]);

  if (videoUrl && !videoFailed) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
        <video src={videoUrl} autoPlay muted playsInline
          onEnded={onDone} onError={() => setVideoFailed(true)}
          className="w-full h-full object-cover" />
        <SkipButton onClick={onDone} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-br from-black via-slate-900 to-black overflow-hidden">
      <SkipButton onClick={onDone} />
      <div key={step} className="w-full h-full flex items-center justify-center p-6 animate-fade-in">
        {step === 0 && (
          <div className="text-center">
            <div className="w-32 h-32 mx-auto rounded-2xl bg-gradient-to-br from-celeste to-white grid place-items-center font-display text-6xl text-primary-foreground shadow-2xl">PH</div>
            <div className="font-display text-5xl tracking-widest mt-6">PRIMERA <span className="text-celeste">HEADS</span></div>
          </div>
        )}
        {step === 1 && (
          <div className="text-center">
            <div className="font-display text-2xl text-celeste tracking-[0.4em] mb-3">CAMPEONATO ARGENTINO</div>
            <div className="font-display text-6xl tracking-widest">PRIMERA NACIONAL</div>
            <div className="text-muted-foreground mt-4">{season === 1 ? "Temporada" : "Temporada"} 2026</div>
          </div>
        )}
        {step === 2 && (
          <div className="text-center">
            <div className="text-xs text-celeste tracking-[0.4em] font-display mb-6">ESTADIOS DEL PAÍS</div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 max-w-3xl">
              {TEAMS.slice(0, 15).map(t => (
                <div key={t.id} className="aspect-video rounded-lg border border-celeste/30 grid place-items-center"
                  style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary ?? "#111"})` }}>
                  <Shield team={t} size={32} />
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="text-center">
            <div className="text-xs text-celeste tracking-[0.4em] font-display mb-6">32 CLUBES · 1 SUEÑO</div>
            <div className="grid grid-cols-8 gap-3 max-w-4xl">
              {TEAMS.map((t, i) => (
                <div key={t.id} className="animate-scale-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <Shield team={t} size={44} />
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="text-center">
            <div className="text-7xl mb-4">🏆</div>
            <div className="font-display text-4xl tracking-widest text-celeste">EL TROFEO DE LA GLORIA</div>
            <div className="text-muted-foreground mt-2">Ascenso a Primera División</div>
          </div>
        )}
        {step === 5 && (
          <div className="text-center max-w-2xl">
            <div className="font-display text-6xl tracking-wider mb-4">PRIMERA NACIONAL 2026</div>
            <div className="text-2xl text-muted-foreground italic">Una nueva temporada comienza...</div>
          </div>
        )}
        {step === 6 && team && (
          <div className="text-center">
            <div className="text-xs text-celeste tracking-[0.4em] font-display mb-4">TU CLUB</div>
            <div className="flex flex-col items-center gap-4">
              <Shield team={team} size={140} />
              <div className="font-display text-5xl">{team.name}</div>
              <div className="mt-4 text-sm text-muted-foreground uppercase tracking-widest">Objetivo</div>
              <div className="font-display text-2xl text-celeste">{objetivo}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-black/60 border border-white/20 text-white font-display text-xs tracking-widest hover:bg-black/80 z-10">
      OMITIR ▶
    </button>
  );
}
