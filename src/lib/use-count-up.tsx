import { useEffect, useRef, useState } from "react";

/** Cuenta desde 0 hasta `value` con easing. Solo actualiza texto, no layout. */
export function useCountUp(value: number, duration = 900) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = value;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setN(a + (b - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return n;
}

export function CountUp({ value, format, duration }: { value: number; format?: (n: number) => string; duration?: number }) {
  const n = useCountUp(value, duration);
  return <>{format ? format(n) : Math.round(n).toLocaleString("es-AR")}</>;
}
