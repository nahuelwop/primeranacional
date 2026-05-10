import { useEffect, useRef, useState } from "react";
import { Team } from "@/data/teams";

type Props = {
  home: Team;
  away: Team;
  duration?: number;
  weather?: "clear" | "rain" | "snow" | "wind" | "fire" | "thunder";
  onEnd: (hg: number, ag: number) => void;
};

type Power = "none" | "fire" | "ice" | "thunder" | "giant";

// Mini juego arcade estilo Football Heads (Dvadi):
// - Personajes con cabeza grande y un solo pie
// - Sombras simples, tribuna animada, clima, poderes
// - Física arcade exagerada, pelota liviana
// Controles P1: A/D mover · W saltar · ESPACIO patear · S poder
//          P2: ←/→ mover · ↑ saltar · ENTER patear · ↓ poder (o IA)
export function Game({ home, away, duration = 90, weather = "clear", onEnd }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ h: 0, a: 0 });
  const [time, setTime] = useState(duration);
  const [powerH, setPowerH] = useState(0);
  const [powerA, setPowerA] = useState(0);
  const stateRef = useRef({ h: 0, a: 0, ph: 0, pa: 0, fxH: 0 as number, fxA: 0 as number });
  const overRef = useRef(false);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const ground = H - 60;
    const goalW = 70, goalH = 150;

    type Player = {
      x: number; y: number; vx: number; vy: number; r: number;
      color: string; second: string; kick: number; facing: 1 | -1;
      power: Power; powerT: number; bigT: number;
    };
    const mkP = (x: number, color: string, second: string, facing: 1 | -1): Player => ({
      x, y: ground, vx: 0, vy: 0, r: 34, color, second, kick: 0, facing,
      power: "none", powerT: 0, bigT: 0,
    });
    const p1 = mkP(W * 0.28, home.primary, home.secondary, 1);
    const p2 = mkP(W * 0.72, away.primary, away.secondary, -1);
    const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 14, spin: 0, fire: 0, ice: 0 };

    // Confetti / partículas
    const particles: { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[] = [];
    const spawnGoal = (x: number, y: number, color: string) => {
      for (let i = 0; i < 40; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 8,
          vy: -Math.random() * 8 - 2,
          life: 60 + Math.random() * 30,
          color,
          size: 2 + Math.random() * 3,
        });
      }
    };

    // Clima
    const weatherP: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
    if (weather !== "clear") {
      const n = weather === "snow" ? 80 : weather === "rain" ? 120 : weather === "fire" ? 30 : 50;
      for (let i = 0; i < n; i++) {
        weatherP.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: weather === "wind" ? -3 - Math.random() * 2 : weather === "rain" ? -2 : (Math.random() - 0.5) * 1.5,
          vy: weather === "rain" ? 8 + Math.random() * 4 : weather === "snow" ? 1 + Math.random() * 1.5 : -1 - Math.random(),
          size: weather === "fire" ? 3 + Math.random() * 4 : 2 + Math.random() * 2,
        });
      }
    }

    // Tribuna (filas de cabezas)
    const crowd: { x: number; y: number; c: string; bob: number }[] = [];
    const palette = ["#7ec8ff", "#ffffff", "#ffe066", "#ff6b6b", "#9bd1ff", "#f0f0f0"];
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < W / 14; i++) {
        crowd.push({
          x: i * 14 + (row % 2) * 7,
          y: 30 + row * 18,
          c: palette[Math.floor(Math.random() * palette.length)],
          bob: Math.random() * Math.PI * 2,
        });
      }
    }

    const keys: Record<string, boolean> = {};
    const onKey = (e: KeyboardEvent, down: boolean) => {
      keys[e.key.toLowerCase()] = down;
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    const speedScale = (s: number) => 3 + s / 28;
    const jumpScale = (s: number) => -10 - s / 12;

    const triggerPower = (p: Player, isHome: boolean) => {
      const meter = isHome ? stateRef.current.ph : stateRef.current.pa;
      if (meter < 100) return;
      // Elegir poder según stats dominante (simple)
      const powers: Power[] = ["fire", "ice", "thunder", "giant"];
      const pick = powers[Math.floor(Math.random() * powers.length)];
      p.power = pick; p.powerT = 90;
      if (pick === "giant") p.bigT = 180;
      if (isHome) { stateRef.current.ph = 0; setPowerH(0); }
      else { stateRef.current.pa = 0; setPowerA(0); }
    };

    const update = () => {
      // P1
      const sp1 = speedScale(home.stats.speed);
      if (keys["a"]) { p1.vx = -sp1; p1.facing = -1; }
      else if (keys["d"]) { p1.vx = sp1; p1.facing = 1; }
      else p1.vx *= 0.78;
      if (keys["w"] && p1.y >= ground) p1.vy = jumpScale(home.stats.jump);
      if (keys[" "]) p1.kick = 10;
      if (keys["s"]) triggerPower(p1, true);

      // P2 - IA o teclado
      const useAI = !(keys["arrowleft"] || keys["arrowright"] || keys["arrowup"] || keys["enter"]);
      if (useAI) {
        const sp2 = speedScale(away.stats.speed) * 0.92;
        const targetX = ball.x + (ball.x < p2.x ? -20 : 20);
        if (Math.abs(p2.x - targetX) > 6) { p2.vx = p2.x < targetX ? sp2 : -sp2; p2.facing = p2.vx > 0 ? 1 : -1; }
        else p2.vx *= 0.78;
        if (ball.y < ground - 80 && Math.abs(ball.x - p2.x) < 100 && p2.y >= ground)
          p2.vy = jumpScale(away.stats.jump);
        if (Math.abs(p2.x - ball.x) < 60 && Math.abs(p2.y - ball.y) < 70) p2.kick = 10;
        if (Math.random() < 0.005) triggerPower(p2, false);
      } else {
        const sp2 = speedScale(away.stats.speed);
        if (keys["arrowleft"]) { p2.vx = -sp2; p2.facing = -1; }
        else if (keys["arrowright"]) { p2.vx = sp2; p2.facing = 1; }
        else p2.vx *= 0.78;
        if (keys["arrowup"] && p2.y >= ground) p2.vy = jumpScale(away.stats.jump);
        if (keys["enter"]) p2.kick = 10;
        if (keys["arrowdown"]) triggerPower(p2, false);
      }

      // Cargar medidor
      stateRef.current.ph = Math.min(100, stateRef.current.ph + 0.18);
      stateRef.current.pa = Math.min(100, stateRef.current.pa + 0.15);
      if (Math.floor(stateRef.current.ph) !== powerH) setPowerH(Math.floor(stateRef.current.ph));
      if (Math.floor(stateRef.current.pa) !== powerA) setPowerA(Math.floor(stateRef.current.pa));

      [p1, p2].forEach(p => {
        p.x += p.vx;
        p.vy += 0.55;
        p.y += p.vy;
        if (p.y > ground) { p.y = ground; p.vy = 0; }
        const rad = p.bigT > 0 ? p.r * 1.5 : p.r;
        p.x = Math.max(rad, Math.min(W - rad, p.x));
        if (p.kick > 0) p.kick--;
        if (p.powerT > 0) p.powerT--;
        if (p.bigT > 0) p.bigT--;
        if (p.powerT === 0) p.power = "none";
      });

      // Viento
      const wind = weather === "wind" ? -0.08 : 0;

      // Pelota
      ball.vy += 0.34;
      ball.vx += wind;
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= 0.995;
      ball.spin += ball.vx * 0.05;
      if (ball.fire > 0) ball.fire--;
      if (ball.ice > 0) { ball.ice--; ball.vx *= 0.94; ball.vy *= 0.94; }

      if (ball.y > ground - ball.r) {
        ball.y = ground - ball.r; ball.vy *= -0.78; ball.vx *= 0.95;
      }
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -0.85; }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -0.85; }

      // Colisiones jugador-pelota (con cabeza y pie)
      [p1, p2].forEach((p, i) => {
        const rad = p.bigT > 0 ? p.r * 1.5 : p.r;
        // Cabeza
        const dx = ball.x - p.x, dy = ball.y - (p.y - rad);
        const d = Math.hypot(dx, dy);
        const minD = rad + ball.r;
        if (d < minD) {
          const ang = Math.atan2(dy, dx);
          const power = (i === 0 ? home.stats.power : away.stats.power) / 10;
          const kickBoost = p.kick > 0 ? 9 + power : 2.5;
          const mult = p.power === "thunder" ? 1.8 : p.power === "fire" ? 1.4 : 1;
          ball.vx = (Math.cos(ang) * (4 + kickBoost) + p.vx * 0.6) * mult;
          ball.vy = (Math.sin(ang) * (4 + kickBoost) - 4) * mult;
          ball.x = p.x + Math.cos(ang) * minD;
          ball.y = (p.y - rad) + Math.sin(ang) * minD;
          if (p.power === "fire") ball.fire = 60;
          if (p.power === "ice") ball.ice = 60;
        }
        // Pie (cuando patea)
        if (p.kick > 0) {
          const fx = p.x + p.facing * (rad + 12);
          const fy = p.y - 8;
          const fdx = ball.x - fx, fdy = ball.y - fy;
          const fd = Math.hypot(fdx, fdy);
          if (fd < ball.r + 14) {
            const ang = Math.atan2(fdy, fdx);
            const power = (i === 0 ? home.stats.power : away.stats.power) / 8;
            const mult = p.power === "thunder" ? 2 : p.power === "fire" ? 1.5 : 1;
            ball.vx = (Math.cos(ang) * (10 + power) + p.facing * 4) * mult;
            ball.vy = (Math.sin(ang) * (8 + power) - 6) * mult;
            if (p.power === "fire") ball.fire = 60;
            if (p.power === "ice") ball.ice = 60;
          }
        }
      });

      // Goles
      if (ball.x < goalW + ball.r && ball.y > ground - goalH) {
        stateRef.current.a++; setScore({ ...stateRef.current });
        spawnGoal(ball.x, ball.y, away.primary);
        resetBall(1);
      } else if (ball.x > W - goalW - ball.r && ball.y > ground - goalH) {
        stateRef.current.h++; setScore({ ...stateRef.current });
        spawnGoal(ball.x, ball.y, home.primary);
        resetBall(-1);
      }

      // Particulas
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.vy += 0.2; pt.x += pt.vx; pt.y += pt.vy; pt.life--;
        if (pt.life <= 0) particles.splice(i, 1);
      }

      // Clima update
      weatherP.forEach(w => {
        w.x += w.vx; w.y += w.vy;
        if (w.y > H) { w.y = -10; w.x = Math.random() * W; }
        if (w.y < -20) { w.y = H + 10; w.x = Math.random() * W; }
        if (w.x < -10) w.x = W + 10;
        if (w.x > W + 10) w.x = -10;
      });

      // Crowd bob
      crowd.forEach(c => c.bob += 0.05);
    };

    const resetBall = (dir: number) => {
      ball.x = W / 2; ball.y = H / 2 - 50; ball.vx = dir * 1; ball.vy = -2;
      ball.fire = 0; ball.ice = 0;
      p1.x = W * 0.28; p1.y = ground; p1.vx = 0; p1.vy = 0;
      p2.x = W * 0.72; p2.y = ground; p2.vx = 0; p2.vy = 0;
    };

    const drawHead = (p: Player) => {
      const rad = p.bigT > 0 ? p.r * 1.5 : p.r;
      // Sombra
      const shadowScale = Math.max(0.4, 1 - (ground - p.y) / 300);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(p.x, ground + 6, rad * 0.9 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(p.x, p.y);

      // Aura del poder
      if (p.power !== "none") {
        const aura = p.power === "fire" ? "#ff6a2a" : p.power === "ice" ? "#7ed7ff" : p.power === "thunder" ? "#ffd84a" : "#a96bff";
        ctx.shadowColor = aura;
        ctx.shadowBlur = 22;
      }

      // Pie (un solo pie, animado al patear)
      const kickPhase = p.kick > 0 ? p.kick / 10 : 0;
      const footX = p.facing * (kickPhase > 0 ? 18 + kickPhase * 14 : 6);
      const footY = kickPhase > 0 ? -8 - kickPhase * 6 : 0;
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.ellipse(footX, footY, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // Talón blanco (botín)
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(footX - p.facing * 4, footY + 2, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cuello
      ctx.fillStyle = p.color;
      ctx.fillRect(-8, -rad + 4, 16, 14);

      // Cabeza (gigante)
      ctx.beginPath();
      ctx.arc(0, -rad, rad, 0, Math.PI * 2);
      ctx.fillStyle = "#f4c89a";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#1a1a1a";
      ctx.stroke();

      // Pelo / gorra con colores del equipo
      ctx.beginPath();
      ctx.arc(0, -rad - 2, rad - 1, Math.PI + 0.3, -0.3);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.stroke();
      // Banda del segundo color
      ctx.fillStyle = p.second;
      ctx.fillRect(-rad + 3, -rad - 6, (rad * 2) - 6, 5);

      ctx.shadowBlur = 0;

      // Ojos (mira a la pelota)
      const eyeX = p.facing === 1 ? 8 : -8;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(eyeX, -rad + 2, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath(); ctx.arc(eyeX + p.facing * 2, -rad + 3, 3.5, 0, Math.PI * 2); ctx.fill();

      // Boca
      ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.facing * 4, -rad + 14, 5, 0.1, Math.PI - 0.1);
      ctx.stroke();

      ctx.restore();
    };

    const draw = () => {
      // Cielo nocturno con halo
      const sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, "#0b1d3d");
      sky.addColorStop(0.5, "#1d4f9a");
      sky.addColorStop(1, "#3a8fd8");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, ground);

      // Tribuna oscura
      ctx.fillStyle = "#0d1424";
      ctx.fillRect(0, 0, W, 130);
      // Cabezas del público
      crowd.forEach(c => {
        const y = c.y + Math.sin(c.bob) * 1.5;
        ctx.fillStyle = c.c;
        ctx.beginPath(); ctx.arc(c.x, y, 5, 0, Math.PI * 2); ctx.fill();
      });
      // Banderas celestes y blancas
      for (let i = 0; i < 8; i++) {
        const fx = (i * W / 8) + (Date.now() / 200 % 20);
        const fy = 100 + Math.sin(Date.now() / 400 + i) * 4;
        ctx.fillStyle = i % 2 ? "#7ec8ff" : "#ffffff";
        ctx.fillRect(fx, fy, 18, 12);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(fx - 1, fy, 2, 26);
      }

      // Vallas publicitarias
      ctx.fillStyle = "#e63946";
      ctx.fillRect(0, ground - 18, W, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px system-ui";
      for (let i = 0; i < W; i += 140) {
        ctx.fillText("PRIMERA NACIONAL", i + 10, ground - 5);
      }

      // Césped a rayas
      for (let i = 0; i < W; i += 50) {
        ctx.fillStyle = (i / 50) % 2 === 0 ? "#3a9d4d" : "#2f8341";
        ctx.fillRect(i, ground, 50, H - ground);
      }
      // Línea media
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W / 2, ground); ctx.lineTo(W / 2, H); ctx.stroke();

      // Arcos con red
      const drawGoal = (x: number) => {
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
        ctx.strokeRect(x, ground - goalH, goalW, goalH);
        ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
        for (let y = ground - goalH; y < ground; y += 8) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + goalW, y); ctx.stroke();
        }
        for (let xx = x; xx < x + goalW; xx += 8) {
          ctx.beginPath(); ctx.moveTo(xx, ground - goalH); ctx.lineTo(xx, ground); ctx.stroke();
        }
      };
      drawGoal(0);
      drawGoal(W - goalW);

      // Personajes
      drawHead(p1);
      drawHead(p2);

      // Sombra pelota
      const sScale = Math.max(0.3, 1 - (ground - ball.y) / 350);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(ball.x, ground + 4, ball.r * sScale, 4 * sScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pelota
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.spin);
      if (ball.fire > 0) {
        ctx.shadowColor = "#ff6a2a"; ctx.shadowBlur = 24;
      } else if (ball.ice > 0) {
        ctx.shadowColor = "#7ed7ff"; ctx.shadowBlur = 18;
      }
      ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "#1a1a1a"; ctx.stroke();
      ctx.fillStyle = "#1a1a1a";
      // Pentagonos simples
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 6, Math.sin(a) * 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Particulas
      particles.forEach(pt => {
        ctx.globalAlpha = Math.max(0, pt.life / 90);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        ctx.globalAlpha = 1;
      });

      // Clima
      ctx.save();
      weatherP.forEach(w => {
        if (weather === "rain") {
          ctx.strokeStyle = "rgba(180,210,255,0.7)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x - 2, w.y + 8); ctx.stroke();
        } else if (weather === "snow") {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.beginPath(); ctx.arc(w.x, w.y, w.size, 0, Math.PI * 2); ctx.fill();
        } else if (weather === "wind") {
          ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + 18, w.y); ctx.stroke();
        } else if (weather === "fire") {
          ctx.fillStyle = `rgba(255,${100 + Math.random() * 80},20,0.7)`;
          ctx.beginPath(); ctx.arc(w.x, w.y, w.size, 0, Math.PI * 2); ctx.fill();
        } else if (weather === "thunder") {
          ctx.fillStyle = "rgba(255,255,200,0.4)";
          ctx.fillRect(w.x, 0, 1, w.y);
        }
      });
      if (weather === "thunder" && Math.random() < 0.005) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
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
  }, [home, away, onEnd, weather]);

  const press = (k: string, down: boolean) => {
    const ev = new KeyboardEvent(down ? "keydown" : "keyup", { key: k });
    window.dispatchEvent(ev);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Marcador estilo Football Heads */}
      <div className="flex items-center justify-between w-full max-w-3xl px-4 py-2 rounded-2xl bg-black/70 border-2 border-celeste shadow-[0_0_30px_rgba(126,200,255,0.4)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full" style={{ background: home.primary, borderColor: home.secondary, borderWidth: 3, borderStyle: "solid" }} />
          <div>
            <div className="font-display text-xl leading-none">{home.short}</div>
            <div className="h-1.5 w-24 mt-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gold transition-all" style={{ width: `${powerH}%` }} />
            </div>
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-4xl text-white leading-none">{score.h} <span className="text-celeste">·</span> {score.a}</div>
          <div className="font-display text-lg text-accent">{time}s</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-xl leading-none">{away.short}</div>
            <div className="h-1.5 w-24 mt-1 bg-white/20 rounded-full overflow-hidden ml-auto">
              <div className="h-full bg-gold transition-all" style={{ width: `${powerA}%` }} />
            </div>
          </div>
          <div className="w-10 h-10 rounded-full" style={{ background: away.primary, borderColor: away.secondary, borderWidth: 3, borderStyle: "solid" }} />
        </div>
      </div>

      <canvas ref={ref} width={960} height={480} className="w-full max-w-3xl rounded-2xl border-2 border-border bg-black" />

      <div className="grid grid-cols-5 gap-2 w-full max-w-3xl md:hidden">
        {[["a","◀"],["d","▶"],["w","▲"],[" ","⚽"],["s","⚡"]].map(([k,l]) => (
          <button key={k}
            onTouchStart={(e) => { e.preventDefault(); press(k, true); }}
            onTouchEnd={(e) => { e.preventDefault(); press(k, false); }}
            onMouseDown={() => press(k, true)} onMouseUp={() => press(k, false)}
            className="py-4 rounded-xl bg-celeste text-primary-foreground font-display text-2xl active:scale-95 select-none">
            {l}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        P1: A/D mover · W saltar · ESPACIO patear · S poder ⚡
        <br className="md:hidden" />
        <span className="hidden md:inline"> · </span>
        P2 (IA o ←/→ ↑ ENTER ↓)
      </p>
    </div>
  );
}
