import { useEffect, useRef, useState } from "react";
import { Team } from "@/data/teams";

type Props = {
  home: Team;
  away: Team;
  duration?: number; // segundos
  onEnd: (hg: number, ag: number) => void;
};

// Mini juego arcade estilo Football Heads.
// Controles jugador 1 (home): A/D mover, W saltar, ESPACIO patear.
// Jugador 2 (away) controlado por IA simple.
export function Game({ home, away, duration = 60, onEnd }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ h: 0, a: 0 });
  const [time, setTime] = useState(duration);
  const stateRef = useRef({ h: 0, a: 0 });
  const overRef = useRef(false);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const ground = H - 40;
    const goalW = 70, goalH = 130;

    const player = (x: number, color: string, second: string) => ({
      x, y: ground, vx: 0, vy: 0, r: 28, color, second, kick: 0,
    });
    const p1 = player(W * 0.25, home.primary, home.secondary);
    const p2 = player(W * 0.75, away.primary, away.secondary);
    const ball = { x: W / 2, y: ground - 200, vx: 0, vy: 0, r: 12 };

    const keys: Record<string, boolean> = {};
    const onKey = (e: KeyboardEvent, down: boolean) => {
      keys[e.key.toLowerCase()] = down;
      if (e.key === " ") e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    const speedScale = (s: number) => 2.5 + s / 40;

    const update = () => {
      // P1 input
      const sp1 = speedScale(home.stats.speed);
      if (keys["a"]) p1.vx = -sp1;
      else if (keys["d"]) p1.vx = sp1;
      else p1.vx *= 0.8;
      if (keys["w"] && p1.y >= ground) p1.vy = -7 - home.stats.jump / 18;
      if (keys[" "]) p1.kick = 8;

      // IA P2
      const sp2 = speedScale(away.stats.speed) * 0.9;
      const targetX = ball.x + (ball.x < p2.x ? -10 : 10);
      if (Math.abs(p2.x - targetX) > 6) p2.vx = p2.x < targetX ? sp2 : -sp2;
      else p2.vx *= 0.8;
      if (ball.y < ground - 60 && Math.abs(ball.x - p2.x) < 80 && p2.y >= ground)
        p2.vy = -6 - away.stats.jump / 20;
      if (Math.abs(p2.x - ball.x) < 50 && Math.abs(p2.y - ball.y) < 60) p2.kick = 8;

      [p1, p2].forEach(p => {
        p.x += p.vx;
        p.vy += 0.45;
        p.y += p.vy;
        if (p.y > ground) { p.y = ground; p.vy = 0; }
        p.x = Math.max(p.r, Math.min(W - p.r, p.x));
        if (p.kick > 0) p.kick--;
      });

      // Ball physics
      ball.vy += 0.32;
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= 0.992;

      if (ball.y > ground - ball.r) {
        ball.y = ground - ball.r; ball.vy *= -0.65; ball.vx *= 0.92;
      }
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -0.8; }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -0.8; }

      // Colisiones jugador-pelota
      [p1, p2].forEach((p, i) => {
        const dx = ball.x - p.x, dy = ball.y - (p.y - p.r);
        const d = Math.hypot(dx, dy);
        const minD = p.r + ball.r;
        if (d < minD) {
          const ang = Math.atan2(dy, dx);
          const power = (i === 0 ? home.stats.power : away.stats.power) / 12;
          const kickBoost = p.kick > 0 ? 6 + power : 1.5;
          ball.vx = Math.cos(ang) * (3 + kickBoost) + p.vx * 0.5;
          ball.vy = Math.sin(ang) * (3 + kickBoost) - 3;
          ball.x = p.x + Math.cos(ang) * minD;
          ball.y = (p.y - p.r) + Math.sin(ang) * minD;
        }
      });

      // Goles
      if (ball.x < goalW && ball.y > ground - goalH) {
        stateRef.current.a++; setScore({ ...stateRef.current });
        resetBall(1);
      } else if (ball.x > W - goalW && ball.y > ground - goalH) {
        stateRef.current.h++; setScore({ ...stateRef.current });
        resetBall(-1);
      }
    };

    const resetBall = (dir: number) => {
      ball.x = W / 2; ball.y = H / 2; ball.vx = dir * 2; ball.vy = -2;
      p1.x = W * 0.25; p2.x = W * 0.75;
    };

    const drawHead = (p: typeof p1, mirror = false) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      // Pierna
      ctx.fillStyle = "#0a1424";
      ctx.fillRect(-6, -p.r, 12, 18);
      // Cabeza
      ctx.beginPath();
      ctx.arc(0, -p.r, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "#f1c27d";
      ctx.fill();
      ctx.strokeStyle = "#0a1424"; ctx.lineWidth = 2; ctx.stroke();
      // Gorro/banda con colores del equipo
      ctx.beginPath();
      ctx.arc(0, -p.r - 4, p.r - 2, Math.PI, 0);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.fillStyle = p.second;
      ctx.fillRect(-p.r + 2, -p.r - 6, (p.r * 2) - 4, 4);
      // Ojos
      ctx.fillStyle = "#0a1424";
      ctx.beginPath(); ctx.arc(mirror ? -8 : 8, -p.r, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    const draw = () => {
      // Fondo cancha
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1a3da6"); g.addColorStop(1, "#0d1b2a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // Tribuna
      ctx.fillStyle = "#0a1424";
      ctx.fillRect(0, ground - 220, W, 80);
      // Césped
      for (let i = 0; i < W; i += 60) {
        ctx.fillStyle = i % 120 === 0 ? "#3b8a4a" : "#2f7140";
        ctx.fillRect(i, ground, 60, 40);
      }
      // Arcos
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
      ctx.strokeRect(0, ground - goalH, goalW, goalH);
      ctx.strokeRect(W - goalW, ground - goalH, goalW, goalH);
      // Red
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      for (let y = ground - goalH; y < ground; y += 8) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(goalW, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W - goalW, y); ctx.lineTo(W, y); ctx.stroke();
      }
      drawHead(p1, false);
      drawHead(p2, true);
      // Pelota
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.strokeStyle = "#0a1424"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ball.x - 6, ball.y); ctx.lineTo(ball.x + 6, ball.y);
      ctx.moveTo(ball.x, ball.y - 6); ctx.lineTo(ball.x, ball.y + 6);
      ctx.stroke();
    };

    let raf = 0;
    const loop = () => {
      if (overRef.current) return;
      update(); draw();
      raf = requestAnimationFrame(loop);
    };
    loop();

    const tick = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          overRef.current = true;
          clearInterval(tick);
          cancelAnimationFrame(raf);
          onEnd(stateRef.current.h, stateRef.current.a);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      overRef.current = true;
      cancelAnimationFrame(raf);
      clearInterval(tick);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [home, away, onEnd]);

  // Controles táctiles
  const press = (k: string, down: boolean) => {
    const ev = new KeyboardEvent(down ? "keydown" : "keyup", { key: k });
    window.dispatchEvent(ev);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex items-center justify-between w-full max-w-3xl px-4 py-2 rounded-xl bg-card border border-border">
        <div className="font-display text-2xl">{home.short} <span className="text-celeste">{score.h}</span></div>
        <div className="font-display text-3xl text-accent">{time}s</div>
        <div className="font-display text-2xl"><span className="text-celeste">{score.a}</span> {away.short}</div>
      </div>
      <canvas ref={ref} width={900} height={420} className="w-full max-w-3xl rounded-xl border border-border bg-black" />
      <div className="grid grid-cols-4 gap-2 w-full max-w-3xl md:hidden">
        {[["a","◀"],["d","▶"],["w","▲"],[" ","⚽"]].map(([k,l]) => (
          <button key={k}
            onTouchStart={() => press(k, true)} onTouchEnd={() => press(k, false)}
            onMouseDown={() => press(k, true)} onMouseUp={() => press(k, false)}
            className="py-4 rounded-xl bg-primary text-primary-foreground font-display text-2xl active:scale-95">
            {l}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">PC: A/D mover · W saltar · ESPACIO patear</p>
    </div>
  );
}
