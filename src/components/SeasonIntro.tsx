import { useEffect, useState } from "react";
import { getTeamsByDivision, getTeamById } from "@/data/teams-catalog";
import { normalizeDivisionId, type DivisionId } from "@/data/competitions";
import { Shield } from "@/components/Shield";

type Props = {
  season: number;
  teamId: string;
  objetivo: string;
  division?: DivisionId;
  videoUrl?: string | null;
  onDone: () => void;
};

export function SeasonIntro({ season, teamId, objetivo, division = "primera_nacional", videoUrl, onDone }: Props) {
  const safeDivision = normalizeDivisionId(division, getTeamById(teamId)?.division ?? "primera_nacional");
  const team = getTeamById(teamId);
  const seasonTeams = getTeamsByDivision(safeDivision);

  const intro = (() => {
    switch (safeDivision) {
      case "primera_division":
        return {
          title: "PRIMERA DIVISIÓN",
          subtitle: "LA MÁXIMA CATEGORÍA",
          descriptor: "30 CLUBES · TABLA ANUAL · PROMEDIOS",
          trophy: "EL TÍTULO MÁS DESEADO",
          trophySub: "La lucha por el campeonato y la permanencia.",
          final: "Una nueva temporada en la máxima categoría comienza...",
          card: "La tabla anual define al campeón. La permanencia también se pelea en los promedios.",
          accent: "#38bdf8",
        };
      case "primera_nacional":
        return {
          title: "PRIMERA NACIONAL",
          subtitle: "EL CAMINO AL ASCENSO",
          descriptor: "ZONA A · ZONA B · REDUCIDO",
          trophy: "UN ASCENSO EN JUEGO",
          trophySub: "Cada fecha te acerca — o te aleja — de Primera División.",
          final: "La temporada por el ascenso está a punto de comenzar...",
          card: "Dos zonas, posiciones de clasificación y el Reducido: cada punto cuenta.",
          accent: "#facc15",
        };
      case "primera_b":
        return {
          title: "PRIMERA B",
          subtitle: "LA LUCHA METROPOLITANA",
          descriptor: "CAMPEONATO · ASCENSO · PERMANENCIA",
          trophy: "EL SALTO A NACIONAL",
          trophySub: "Una temporada para dejar atrás la categoría.",
          final: "La pelea por el ascenso comienza ahora...",
          card: "Regularidad, presión y partidos clave: todo conduce al ascenso a Primera Nacional.",
          accent: "#4ade80",
        };
      case "primera_c":
        return {
          title: "PRIMERA C",
          subtitle: "EL SIGUIENTE ESCALÓN",
          descriptor: "CAMPEONATO · ASCENSO · HISTORIA",
          trophy: "RUMBO A PRIMERA B",
          trophySub: "Un nuevo desafío para tu club.",
          final: "La temporada de Primera C está por comenzar...",
          card: "El objetivo está claro: pelear arriba y acercarte un paso más al fútbol profesional.",
          accent: "#fb923c",
        };
      case "promocional_amateur":
        return {
          title: "TORNEO PROMOCIONAL AMATEUR",
          subtitle: "EL PRIMER GRAN SALTO",
          descriptor: "ZONA A · ZONA B · ASCENSO",
          trophy: "RUMBO A PRIMERA C",
          trophySub: "Una temporada para transformar la historia de tu club.",
          final: "El camino del Promocional Amateur comienza ahora...",
          card: "Dos zonas, partidos decisivos y una meta: subir un escalón en el fútbol argentino.",
          accent: "#d6a72d",
        };
      case "regional_federal_amateur":
        return {
          title: "TORNEO REGIONAL FEDERAL AMATEUR",
          subtitle: "EL CAMINO DESDE TU REGIÓN",
          descriptor: "8 REGIONES · GRUPOS · PLAYOFFS",
          trophy: "4 ASCENSOS AL FEDERAL A",
          trophySub: "Representá a tu región y avanzá ronda a ronda.",
          final: "El torneo regional está por comenzar...",
          card: "Zonas geográficas, eliminatorias y cuatro finales nacionales por el ascenso.",
          accent: "#a78bfa",
        };
      case "federal_a":
        return {
          title: "TORNEO FEDERAL A",
          subtitle: "TODO EL PAÍS EN JUEGO",
          descriptor: "ZONAS · VIAJES · ASCENSO NACIONAL",
          trophy: "EL CAMINO FEDERAL",
          trophySub: "Representá a tu región y buscá el ascenso.",
          final: "Una nueva campaña federal está por comenzar...",
          card: "Dos zonas, viajes largos y una meta: llegar a Primera Nacional.",
          accent: "#f472b6",
        };
    }
  })();

  const resolvedIntro = intro ?? {
    title: "PRIMERA NACIONAL",
    subtitle: "EL CAMINO AL ASCENSO",
    descriptor: "ZONA A · ZONA B · REDUCIDO",
    trophy: "UN ASCENSO EN JUEGO",
    trophySub: "Cada fecha te acerca — o te aleja — de Primera División.",
    final: "La temporada por el ascenso está a punto de comenzar...",
    card: "Cada punto cuenta.",
    accent: "#facc15",
  };
  const [step, setStep] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);

  // Las intros son específicas de cada división. Si existe un video global legado,
  // sólo se usa cuando se pidió explícitamente y no reemplaza el contenido textual.
  useEffect(() => {
    if (videoUrl && !videoFailed) return;
    const timings = [1800, 2200, 3000, 3300, 2400, 3000, 3000];
    if (step >= timings.length) { onDone(); return; }
    const t = setTimeout(() => setStep(s => s + 1), timings[step]);
    return () => clearTimeout(t);
  }, [step, videoUrl, videoFailed, onDone]);

  if (videoUrl && !videoFailed) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
        <video src={videoUrl} autoPlay playsInline onEnded={onDone} onError={() => setVideoFailed(true)} className="w-full h-full object-contain" />
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
            <div className="w-28 h-28 mx-auto rounded-2xl border border-white/20 bg-black/50 grid place-items-center font-display text-5xl text-white shadow-2xl">PH</div>
            <div className="font-display text-4xl sm:text-5xl tracking-widest mt-6">PRIMERA <span className="text-celeste">HEADS</span></div>
            <div className="text-xs text-muted-foreground uppercase tracking-[0.35em] mt-3">Modo Carrera</div>
          </div>
        )}
        {step === 1 && (
          <div className="text-center max-w-4xl">
            <div className="font-display text-xl sm:text-2xl tracking-[0.4em] mb-3" style={{ color: resolvedIntro.accent }}>{resolvedIntro.subtitle}</div>
            <div className="font-display text-5xl sm:text-7xl tracking-widest">{resolvedIntro.title}</div>
            <div className="text-muted-foreground mt-4">Temporada {2026 + season - 1}</div>
          </div>
        )}
        {step === 2 && (
          <div className="text-center max-w-4xl">
            <div className="text-xs tracking-[0.4em] font-display mb-3" style={{ color: resolvedIntro.accent }}>{resolvedIntro.descriptor}</div>
            <div className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6">{resolvedIntro.card}</div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {seasonTeams.slice(0, 15).map(t => (
                <div key={t.id} className="aspect-video rounded-lg border border-white/10 bg-white/[0.03] grid place-items-center" style={{ boxShadow: `inset 0 0 0 1px ${resolvedIntro.accent}22` }}>
                  <Shield team={t} size={34} />
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="text-center max-w-5xl">
            <div className="text-xs tracking-[0.4em] font-display mb-6" style={{ color: resolvedIntro.accent }}>{seasonTeams.length} CLUBES · 1 OBJETIVO</div>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3 max-w-5xl mx-auto">
              {seasonTeams.map((t, i) => (
                <div key={t.id} className="animate-scale-in" style={{ animationDelay: `${i * 30}ms` }}><Shield team={t} size={42} /></div>
              ))}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="text-center">
            <div className="text-7xl mb-4">🏆</div>
            <div className="font-display text-4xl sm:text-5xl tracking-widest" style={{ color: resolvedIntro.accent }}>{resolvedIntro.trophy}</div>
            <div className="text-muted-foreground mt-3 max-w-2xl mx-auto">{resolvedIntro.trophySub}</div>
          </div>
        )}
        {step === 5 && (
          <div className="text-center max-w-3xl">
            <div className="font-display text-5xl sm:text-6xl tracking-wider mb-4">{resolvedIntro.title} {2026 + season - 1}</div>
            <div className="text-2xl text-muted-foreground italic">{resolvedIntro.final}</div>
          </div>
        )}
        {step === 6 && team && (
          <div className="text-center">
            <div className="text-xs tracking-[0.4em] font-display mb-4" style={{ color: resolvedIntro.accent }}>TU CLUB</div>
            <div className="flex flex-col items-center gap-4">
              <Shield team={team} size={140} />
              <div className="font-display text-5xl">{team.name}</div>
              <div className="mt-4 text-sm text-muted-foreground uppercase tracking-widest">Objetivo</div>
              <div className="font-display text-2xl" style={{ color: resolvedIntro.accent }}>{objetivo}</div>
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
