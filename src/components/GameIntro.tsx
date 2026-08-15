import { useEffect, useRef, useState } from "react";
import stadiumNight from "@/assets/stadium-hero-night.jpg";

const SEEN_KEY = "primeraheads_intro_seen";

// Pantalla de arranque tipo videojuego de consola (PS3/360, estilo 2010-2013):
// "PRIMERA HEADS" + "TOCÁ LA PANTALLA PARA COMENZAR", con estadio nocturno real
// de fondo, paneles geométricos, textura hexagonal, franja de estrellas y pelota
// con estela — calcado a la referencia. Se muestra una vez por sesión de
// navegador: no vuelve a aparecer al navegar entre rutas internas, solo en una
// visita/recarga nueva.
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
    setTimeout(() => setVisible(false), 700);
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
      className={`fixed inset-0 z-[999] overflow-hidden bg-black select-none cursor-pointer transition-all duration-700 ease-in-out ${
        leaving ? "opacity-0 scale-[1.07] brightness-[0.35] pointer-events-none" : "opacity-100 scale-100 brightness-100"
      }`}
    >
      {/* Foto real de estadio nocturno */}
      <img src={stadiumNight} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/90" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />

      {/* Textura hexagonal sutil sobre todo el fondo */}
      <div
        className="absolute inset-0 opacity-[0.14] mix-blend-screen"
        style={{
          backgroundImage:
            "linear-gradient(30deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(150deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(30deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8), linear-gradient(150deg,#38bdf8 12%,transparent 12.5%,transparent 87%,#38bdf8 87.5%,#38bdf8)",
          backgroundSize: "64px 112px",
          backgroundPosition: "0 0, 0 0, 32px 56px, 32px 56px",
        }}
      />

      {/* Paneles geométricos inclinados con borde luminoso, en las esquinas */}
      <div className="absolute -left-20 top-0 h-[75%] w-[42%] -skew-x-12 border-r-2 border-celeste/50 bg-gradient-to-br from-celeste/10 to-transparent shadow-[8px_0_40px_-10px_rgba(56,189,248,0.35)]" />
      <div className="absolute -right-20 top-0 h-[58%] w-[36%] skew-x-12 border-l-2 border-celeste/40 bg-gradient-to-bl from-celeste/10 to-transparent shadow-[-8px_0_40px_-10px_rgba(56,189,248,0.3)]" />
      <div className="absolute -left-12 bottom-0 h-[42%] w-[30%] skew-x-12 border-t-2 border-accent/40 bg-gradient-to-tr from-accent/10 to-transparent" />
      <div className="hidden sm:block absolute -right-14 bottom-0 h-[46%] w-[32%] -skew-x-12 border-t-2 border-celeste/40 bg-gradient-to-tl from-celeste/10 to-transparent" />

      {/* Niebla/humo muy leve cerca del piso */}
      <div className="absolute bottom-[8%] left-0 right-0 h-40 bg-[radial-gradient(ellipse_at_center,rgba(180,220,255,0.10),transparent_70%)] blur-xl" />

      {/* Partículas sutiles */}
      <IntroParticles />

      {/* Viñeta para foco central */}
      <div className="absolute inset-0 shadow-[inset_0_0_260px_100px_rgba(0,0,0,0.7)]" />

      {/* Badge de marca, arriba a la izquierda */}
      <div className="absolute top-5 left-5 sm:top-8 sm:left-10 z-10 flex items-center gap-2.5">
        <div className="relative w-9 h-9 sm:w-11 sm:h-11 shrink-0">
          <div className="absolute inset-0 rounded-full bg-celeste blur-md opacity-60" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-celeste via-celeste to-white grid place-items-center font-display text-primary-foreground text-xs sm:text-sm shadow-lg">
            PN
          </div>
        </div>
        <div className="leading-tight">
          <div className="font-display text-sm sm:text-base tracking-wide">
            PRIMERA <span className="text-celeste">HEADS</span>
          </div>
          <div className="text-[8px] sm:text-[10px] tracking-[0.25em] text-white/60">EL ASCENSO ES NUESTRO</div>
        </div>
      </div>

      {/* Pelota con estela, abajo a la derecha */}
      <div className="hidden sm:block absolute bottom-[14%] right-[6%] z-10">
        <div className="relative w-20 h-20 md:w-28 md:h-28">
          {/* Estela cyan detrás de la pelota */}
          <div className="absolute top-1/2 -translate-y-1/2 right-full w-40 md:w-56 h-6 md:h-8 bg-gradient-to-l from-celeste/70 via-celeste/25 to-transparent blur-[2px]" />
          <div className="absolute inset-0 rounded-full bg-celeste/40 blur-2xl" />
          <svg viewBox="0 0 100 100" className="relative w-full h-full drop-shadow-[0_0_30px_rgba(56,189,248,0.65)] animate-[spin_14s_linear_infinite]">
            <circle cx="50" cy="50" r="46" fill="#f3f3f3" stroke="#141414" strokeWidth="3" />
            <circle cx="50" cy="50" r="14" fill="#141414" />
            {[0, 72, 144, 216, 288].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const cx = 50 + Math.cos(rad) * 27;
              const cy = 50 + Math.sin(rad) * 27;
              return <circle key={i} cx={cx} cy={cy} r="9" fill="#1a1a1a" />;
            })}
          </svg>
        </div>
      </div>

      {/* Contenido central */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-4 text-center">
        {/* Franja de estrellas */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
          {[0, 1, 2, 3, 4].map(i => (
            <svg key={i} viewBox="0 0 24 24" className={`text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] ${i === 2 ? "w-6 h-6 sm:w-8 sm:h-8" : "w-4 h-4 sm:w-6 sm:h-6"}`} fill="currentColor">
              <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7L2 9.2l7.1-.6L12 2z" />
            </svg>
          ))}
        </div>

        <h1 className="font-display leading-[0.85] tracking-wide" style={{ fontSize: "clamp(3rem, 12vw, 8.5rem)" }}>
          <span className="block text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.3)]">PRIMERA</span>
          <span className="block text-celeste drop-shadow-[0_0_40px_rgba(56,189,248,0.8)]">HEADS</span>
        </h1>

        <p className="font-display mt-3 sm:mt-5 tracking-[0.25em] text-accent drop-shadow-[0_0_16px_rgba(250,204,21,0.5)]"
          style={{ fontSize: "clamp(1rem, 3vw, 1.6rem)" }}>
          EL ASCENSO ES NUESTRO
        </p>

        <div className="mt-10 sm:mt-16 flex flex-col items-center gap-2">
          <span
            className="font-display tracking-[0.15em] text-white animate-pulse drop-shadow-[0_0_24px_rgba(120,210,255,0.95)]"
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
