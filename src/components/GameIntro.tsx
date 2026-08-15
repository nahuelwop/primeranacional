import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "primeraheads_intro_seen";

// Pantalla de arranque tipo videojuego de consola (PS3/360, estilo 2010-2013):
// "PRIMERA HEADS" + "TOCÁ LA PANTALLA PARA COMENZAR", con estadio nocturno de
// fondo armado en CSS (sin depender de ninguna imagen externa), paneles
// geométricos, textura hexagonal y glow celeste. Se muestra una vez por
// sesión de navegador — no vuelve a aparecer al navegar entre rutas internas,
// solo en una visita/recarga nueva.
export function GameIntro() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return sessionStorage.getItem(SEEN_KEY) !== "1"; } catch { return true; }
  });
  const [leaving, setLeaving] = useState(false);
  const startedRef = useRef(false);

  const startGame = () => {
    if (startedRef.current) return; // evita disparar la transición más de una vez
    startedRef.current = true;
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* noop */ }
    setLeaving(true);
    setTimeout(() => setVisible(false), 650);
  };

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.code === "Space") {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Tocá la pantalla para comenzar"
      onClick={startGame}
      onTouchStart={startGame}
      className={`fixed inset-0 z-[999] overflow-hidden bg-black select-none cursor-pointer transition-all duration-[650ms] ease-in-out ${
        leaving ? "opacity-0 scale-[1.06] brightness-50 pointer-events-none" : "opacity-100 scale-100 brightness-100"
      }`}
    >
      {/* Cielo + cancha nocturna, armado en degradados */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#02040a_0%,#050b18_38%,#081428_62%,#0a2a1d_100%)]" />

      {/* Reflectores: dos halos potentes arriba a los costados */}
      <div className="absolute -top-24 -left-24 w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(120,210,255,0.35)_0%,transparent_65%)] blur-2xl" />
      <div className="absolute -top-24 -right-24 w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(120,210,255,0.28)_0%,transparent_65%)] blur-2xl" />

      {/* Textura hexagonal muy sutil sobre todo el fondo */}
      <div
        className="absolute inset-0 opacity-[0.12] mix-blend-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(60deg, rgba(96,200,255,0.5) 0px, rgba(96,200,255,0.5) 1px, transparent 1px, transparent 26px)," +
            "repeating-linear-gradient(-60deg, rgba(96,200,255,0.5) 0px, rgba(96,200,255,0.5) 1px, transparent 1px, transparent 26px)," +
            "repeating-linear-gradient(0deg, rgba(96,200,255,0.35) 0px, rgba(96,200,255,0.35) 1px, transparent 1px, transparent 26px)",
        }}
      />

      {/* Paneles geométricos inclinados, en las esquinas, con borde luminoso */}
      <div className="absolute -left-16 top-0 h-[70%] w-[38%] -skew-x-12 border-r-2 border-celeste/40 bg-gradient-to-br from-celeste/10 to-transparent" />
      <div className="absolute -right-16 top-0 h-[55%] w-[32%] skew-x-12 border-l-2 border-celeste/30 bg-gradient-to-bl from-celeste/10 to-transparent" />
      <div className="absolute -left-10 bottom-0 h-[38%] w-[26%] skew-x-12 border-t-2 border-accent/30 bg-gradient-to-tr from-accent/10 to-transparent" />

      {/* Césped sugerido, franja inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-[26%] bg-[repeating-linear-gradient(90deg,#123321_0px,#123321_46px,#0e2a1b_46px,#0e2a1b_92px)] opacity-70" />
      <div className="absolute bottom-0 left-0 right-0 h-[26%] bg-gradient-to-t from-black/70 to-transparent" />

      {/* Niebla/humo muy leve cerca del piso */}
      <div className="absolute bottom-[10%] left-0 right-0 h-40 bg-[radial-gradient(ellipse_at_center,rgba(180,220,255,0.10),transparent_70%)] blur-xl" />

      {/* Partículas sutiles */}
      <IntroParticles />

      {/* Viñeta para foco central */}
      <div className="absolute inset-0 shadow-[inset_0_0_220px_90px_rgba(0,0,0,0.75)]" />

      {/* Pelota como elemento secundario, arriba a la derecha */}
      <div className="hidden sm:block absolute top-[12%] right-[8%] w-16 h-16 md:w-24 md:h-24 opacity-90 animate-[spin_18s_linear_infinite]">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_25px_rgba(120,210,255,0.5)]">
          <circle cx="50" cy="50" r="46" fill="#f3f3f3" stroke="#141414" strokeWidth="3" />
          {[0, 72, 144, 216, 288].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const cx = 50 + Math.cos(rad) * 22;
            const cy = 50 + Math.sin(rad) * 22;
            return <circle key={i} cx={cx} cy={cy} r="10" fill="#1a1a1a" />;
          })}
        </svg>
      </div>

      {/* Contenido central */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-4 text-center">
        <div className="flex items-center gap-2 mb-4 sm:mb-6 opacity-90">
          <span className="h-px w-8 sm:w-14 bg-gradient-to-r from-transparent to-celeste/70" />
          <span className="text-[10px] sm:text-xs tracking-[0.5em] text-celeste/90 font-medium">FÚTBOL ARCADE</span>
          <span className="h-px w-8 sm:w-14 bg-gradient-to-l from-transparent to-celeste/70" />
        </div>

        <h1 className="font-display leading-[0.85] tracking-wide" style={{ fontSize: "clamp(3rem, 12vw, 8.5rem)" }}>
          <span className="block text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.25)]">PRIMERA</span>
          <span className="block text-celeste drop-shadow-[0_0_38px_rgba(56,189,248,0.75)]">HEADS</span>
        </h1>

        <p className="font-display mt-3 sm:mt-5 tracking-[0.25em] text-accent drop-shadow-[0_0_16px_rgba(250,204,21,0.5)]"
          style={{ fontSize: "clamp(1rem, 3vw, 1.6rem)" }}>
          EL ASCENSO ES NUESTRO
        </p>

        <div className="mt-10 sm:mt-16 flex flex-col items-center gap-2">
          <span
            className="font-display tracking-[0.15em] text-white animate-pulse drop-shadow-[0_0_22px_rgba(120,210,255,0.9)]"
            style={{ fontSize: "clamp(1.3rem, 4.5vw, 2.4rem)" }}
          >
            TOCÁ LA PANTALLA
          </span>
          <span className="text-xs sm:text-sm tracking-[0.35em] text-white/60">PARA COMENZAR</span>
        </div>
      </div>
    </div>
  );
}

function IntroParticles() {
  const dots = Array.from({ length: 26 }, (_, i) => ({
    left: (i * 41) % 100,
    delay: (i % 9) * 0.7,
    dur: 7 + (i % 6),
    size: 1.5 + (i % 3) * 0.6,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-celeste/50"
          style={{
            left: `${d.left}%`,
            bottom: "-10px",
            width: d.size,
            height: d.size,
            animation: `introFloat ${d.dur}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes introFloat {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.4; }
          100% { transform: translateY(-100vh) translateX(14px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
