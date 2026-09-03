import { useEffect, useState } from "react";
import type { Team } from "@/data/teams";
import { Shield } from "@/components/Shield";

export function CopaArgentinaIntro({
  team,
  season,
  mode,
  videoUrl,
  onDone,
}: {
  team: Team;
  season: number;
  mode: "standalone" | "career";
  videoUrl?: string | null;
  onDone: () => void;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (videoUrl && !videoFailed) return;
    const timings = [1800, 2200, 2600, 2200];
    const timer = setTimeout(() => {
      if (step >= timings.length - 1) onDone();
      else setStep(value => value + 1);
    }, timings[step]);
    return () => clearTimeout(timer);
  }, [step, videoUrl, videoFailed, onDone]);

  if (videoUrl && !videoFailed) {
    return (
      <div className="fixed inset-0 z-[120] bg-black flex items-center justify-center">
        <video
          src={videoUrl}
          autoPlay
          playsInline
          onEnded={onDone}
          onError={() => setVideoFailed(true)}
          className="w-full h-full object-contain"
        />
        <button
          onClick={onDone}
          className="absolute bottom-7 px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-widest shadow-[0_0_24px_rgba(56,189,248,.35)]"
        >
          SALTAR INTRO
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-[radial-gradient(circle_at_50%_25%,rgba(56,189,248,.18),transparent_38%),linear-gradient(145deg,#02050a,#07121e_55%,#02050a)] text-white">
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(30deg,#38bdf8_12%,transparent_12.5%,transparent_87%,#38bdf8_87.5%,#38bdf8),linear-gradient(150deg,#38bdf8_12%,transparent_12.5%,transparent_87%,#38bdf8_87.5%,#38bdf8)] bg-[length:70px_122px]" />
      <button onClick={onDone} className="absolute top-5 right-5 z-10 px-4 py-2 rounded-lg border border-white/20 bg-black/40 text-xs font-display tracking-widest hover:border-celeste/60">
        OMITIR ▶
      </button>
      <div className="relative z-10 h-full flex items-center justify-center px-5 py-10 text-center">
        {step === 0 && (
          <div className="animate-fade-in">
            <div className="text-[11px] uppercase tracking-[0.5em] text-celeste">PRIMERA HEADS PRESENTA</div>
            <div className="font-display text-6xl md:text-8xl tracking-widest mt-3">COPA<br /><span className="text-celeste">ARGENTINA</span></div>
            <div className="mt-5 text-accent font-display tracking-[0.35em]">TEMPORADA {2025 + season}</div>
          </div>
        )}
        {step === 1 && (
          <div className="max-w-3xl animate-fade-in">
            <div className="text-[11px] uppercase tracking-[0.45em] text-celeste">FORMATO</div>
            <div className="font-display text-4xl md:text-6xl tracking-widest mt-3">UN SOLO PARTIDO</div>
            <p className="mt-4 text-white/60 text-sm md:text-base">64 clubes. Cancha neutral. Empate, penales. Solo un equipo levanta la Copa.</p>
          </div>
        )}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="text-[11px] uppercase tracking-[0.45em] text-celeste">TU CAMINO</div>
            <div className="mt-5"><Shield team={team} size={150} /></div>
            <div className="font-display text-4xl md:text-6xl tracking-widest mt-5">{team.name}</div>
            <div className="text-white/50 mt-2">{mode === "career" ? "COPA DE TU MODO CARRERA" : "TORNEO INDEPENDIENTE"}</div>
          </div>
        )}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="text-7xl mb-4">🏆</div>
            <div className="font-display text-5xl md:text-7xl tracking-widest text-celeste">A JUGAR</div>
            <div className="mt-4 text-white/55 uppercase tracking-[0.25em] text-sm">EL CAMINO AL TÍTULO COMIENZA AHORA</div>
          </div>
        )}
      </div>
    </div>
  );
}
