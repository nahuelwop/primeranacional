import { useEffect, useRef, useState } from "react";
import stadiumBg from "@/assets/stadium-night.jpg";

/**
 * Fondo cinemático del Modo Carrera:
 * estadio desenfocado con zoom lento + parallax, neblina, reflectores
 * en movimiento y partículas de polvo. Todo con transform/opacity.
 */
export function AmbientStadium() {
  const ref = useRef<HTMLDivElement>(null);
  const [dust, setDust] = useState<{ l: number; t: number; d: number; s: number; o: number }[]>([]);

  useEffect(() => {
    setDust(
      Array.from({ length: 26 }, () => ({
        l: Math.random() * 100,
        t: Math.random() * 100,
        d: 10 + Math.random() * 18,
        s: 1 + Math.random() * 2.4,
        o: 0.12 + Math.random() * 0.28,
      })),
    );
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 18;
      ty = (e.clientY / window.innerHeight - 0.5) * 12;
    };
    const loop = () => {
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      el.style.setProperty("--px", `${cx.toFixed(2)}px`);
      el.style.setProperty("--py", `${cy.toFixed(2)}px`);
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div ref={ref} className="ambient-stadium" aria-hidden="true">
      <div className="ambient-photo" style={{ backgroundImage: `url(${stadiumBg})` }} />
      <div className="ambient-fog ambient-fog-a" />
      <div className="ambient-fog ambient-fog-b" />
      <div className="ambient-beam ambient-beam-a" />
      <div className="ambient-beam ambient-beam-b" />
      <div className="ambient-dust">
        {dust.map((p, i) => (
          <span key={i} style={{
            left: `${p.l}%`, top: `${p.t}%`,
            width: p.s, height: p.s, opacity: p.o,
            animationDuration: `${p.d}s`, animationDelay: `${-p.d * Math.random()}s`,
          }} />
        ))}
      </div>
      <div className="ambient-vignette" />
    </div>
  );
}
