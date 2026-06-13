import { useEffect, useMemo, useRef, useState } from "react";
import { Shield } from "@/components/Shield";
import { Team, type Narrator } from "@/data/teams";

export type Weather = "clear" | "rain" | "wind" | "thunder";
export type Difficulty = "easy" | "normal" | "hard";
export type Mode = "1v1" | "1vAI";

type Props = {
  home: Team;
  away: Team;
  duration?: number;
  weather?: Weather;
  aiDifficulty?: Difficulty;
  mode?: Mode;
  onEnd: (hg: number, ag: number, stats: MatchStats) => void;
};

export type MatchStats = {
  possessionH: number; // 0..100
  shotsH: number; shotsA: number;
  onTargetH: number; onTargetA: number;
  savesH: number; savesA: number;
};

const ScoreColorBars = ({ team, reverse = false }: { team: Team; reverse?: boolean }) => (
  <div className="score-color-bars" aria-hidden="true">
    <span style={{ backgroundColor: reverse ? team.secondary : team.primary }} />
    <span style={{ backgroundColor: reverse ? team.primary : team.secondary }} />
  </div>
);

// Football Heads style arcade — sin poderes, físicas con postes y travesaño.
export function Game({ home, away, duration = 90, weather = "clear", aiDifficulty = "normal", mode = "1vAI", onEnd }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ h: 0, a: 0 });
  const [time, setTime] = useState(duration);
  const [stats, setStats] = useState<MatchStats>({ possessionH: 50, shotsH: 0, shotsA: 0, onTargetH: 0, onTargetA: 0, savesH: 0, savesA: 0 });
  const stateRef = useRef({ h: 0, a: 0, posH: 0, posA: 0, shotsH: 0, shotsA: 0, otH: 0, otA: 0, savH: 0, savA: 0 });
  const overRef = useRef(false);

  // Audio: relato + hinchada (volumen ajustable en vivo, refs evitan stale closures)
  const [narratorVol, setNarratorVol] = useState(0.9);
  const [crowdVol, setCrowdVol] = useState(0.35);
  const narratorVolRef = useRef(narratorVol);
  const crowdVolRef = useRef(crowdVol);
  const narratorRef = useRef<HTMLAudioElement | null>(null);
  const crowdRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { narratorVolRef.current = narratorVol; if (narratorRef.current) narratorRef.current.volume = narratorVol; }, [narratorVol]);
  useEffect(() => { crowdVolRef.current = crowdVol; if (crowdRef.current) crowdRef.current.volume = crowdVol; }, [crowdVol]);

  // Relator seleccionado por equipo (id del narrador). null = elegir al azar de todos.
  const homeNarrators = useMemo<Narrator[]>(() => {
    const list = home.narrators ?? [];
    if (list.length > 0) return list;
    if ((home.goalAudios ?? []).length > 0) return [{ id: "__legacy", name: "Default", urls: home.goalAudios! }];
    return [];
  }, [home]);
  const awayNarrators = useMemo<Narrator[]>(() => {
    const list = away.narrators ?? [];
    if (list.length > 0) return list;
    if ((away.goalAudios ?? []).length > 0) return [{ id: "__legacy", name: "Default", urls: away.goalAudios! }];
    return [];
  }, [away]);
  const [homeNarratorId, setHomeNarratorId] = useState<string>(() => homeNarrators[0]?.id ?? "");
  const [awayNarratorId, setAwayNarratorId] = useState<string>(() => awayNarrators[0]?.id ?? "");
  useEffect(() => { setHomeNarratorId(homeNarrators[0]?.id ?? ""); }, [homeNarrators]);
  useEffect(() => { setAwayNarratorId(awayNarrators[0]?.id ?? ""); }, [awayNarrators]);
  const homeNarratorRef = useRef(homeNarratorId);
  const awayNarratorRef = useRef(awayNarratorId);
  useEffect(() => { homeNarratorRef.current = homeNarratorId; }, [homeNarratorId]);
  useEffect(() => { awayNarratorRef.current = awayNarratorId; }, [awayNarratorId]);

  useEffect(() => {
    overRef.current = false;
    stateRef.current = { h: 0, a: 0, posH: 0, posA: 0, shotsH: 0, shotsA: 0, otH: 0, otA: 0, savH: 0, savA: 0 };
    setScore({ h: 0, a: 0 });
    setTime(duration);
    setStats({ possessionH: 50, shotsH: 0, shotsA: 0, onTargetH: 0, onTargetA: 0, savesH: 0, savesA: 0 });

    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const ground = H - 60;
    const goalW = 70, goalH = 150;
    const crossbarY = ground - goalH;

    type Player = {
      x: number; y: number; vx: number; vy: number; r: number;
      color: string; second: string; kick: number; facing: 1 | -1;
    };
    const mkP = (x: number, color: string, second: string, facing: 1 | -1): Player => ({
      x, y: ground, vx: 0, vy: 0, r: 34, color, second, kick: 0, facing,
    });
    // facing FIJO: P1 mira siempre a la derecha, P2 siempre a la izquierda
    const p1 = mkP(W * 0.28, home.primary, home.secondary, 1);
    const p2 = mkP(W * 0.72, away.primary, away.secondary, -1);
    const ball = { x: W / 2, y: H / 2 - 30, vx: 1.8, vy: -2.8, r: 13, spin: 0, squash: 0, lastTouch: 0 as 0 | 1 | 2 };


    const aiCfg = {
      easy:   { speed: 0.55, jumpProb: 0.35, kickProb: 0.18, react: 40, jumpCd: 90 },
      normal: { speed: 0.85, jumpProb: 0.60, kickProb: 0.45, react: 18, jumpCd: 55 },
      hard:   { speed: 1.05, jumpProb: 0.85, kickProb: 0.75, react: 8,  jumpCd: 35 },
    }[aiDifficulty];
    let frame = 0;
    let aiJumpCd = 0;

    // Relato: 1 cada 2 goles totales. Si llega otro, corta el anterior.
    let totalGoals = 0;
    const pickAudio = (urls?: string[]) => {
      if (!urls || urls.length === 0) return null;
      return urls[Math.floor(Math.random() * urls.length)];
    };
    const playGoalAudio = (team: Team, side: "home" | "away") => {
      totalGoals++;
      if (totalGoals % 2 !== 0) return; // solo cada 2 goles
      const list = (team.narrators && team.narrators.length > 0)
        ? team.narrators
        : ((team.goalAudios ?? []).length > 0 ? [{ id: "__legacy", name: "Default", urls: team.goalAudios! }] : []);
      const selId = side === "home" ? homeNarratorRef.current : awayNarratorRef.current;
      const chosen = list.find(n => n.id === selId) ?? list[0];
      const url = pickAudio(chosen?.urls);
      if (!url) return;
      try {
        if (narratorRef.current) { narratorRef.current.pause(); narratorRef.current.src = ""; }
        const a = new Audio(url);
        a.volume = narratorVolRef.current;
        narratorRef.current = a;
        a.play().catch(() => {});
      } catch {}
    };

    // Hinchada: 3 tramos de 30s (local, visitante, local), tema al azar de cada equipo.
    const segments: Array<{ team: Team; until: number }> = [
      { team: home, until: duration - 60 }, // primeros 30s
      { team: away, until: duration - 30 }, // siguientes 30s
      { team: home, until: 0 },             // últimos 30s
    ];
    let segIdx = -1;
    const advanceCrowdSegment = (remaining: number) => {
      const next = segments.findIndex(s => remaining > s.until);
      if (next === segIdx) return;
      segIdx = next;
      if (segIdx < 0) return;
      const team = segments[segIdx].team;
      const url = pickAudio(team.hinchadas);
      try {
        if (crowdRef.current) { crowdRef.current.pause(); crowdRef.current.src = ""; }
        if (!url) { crowdRef.current = null; return; }
        const a = new Audio(url);
        a.volume = crowdVolRef.current;
        a.loop = true;
        crowdRef.current = a;
        a.play().catch(() => {});
      } catch {}
    };

    // Partículas confeti
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

    // Clima (solo clear / rain / wind / thunder)
    const weatherP: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
    if (weather !== "clear") {
      const n = weather === "rain" ? 120 : 50;
      for (let i = 0; i < n; i++) {
        weatherP.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: weather === "wind" ? -3 - Math.random() * 2 : weather === "rain" ? -2 : (Math.random() - 0.5) * 1.5,
          vy: weather === "rain" ? 8 + Math.random() * 4 : -1 - Math.random(),
          size: 2 + Math.random() * 2,
        });
      }
    }

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
    const jumpScale = (s: number) => -7.5 - s / 22;

    const update = () => {
      frame++;

      // P1 controles: WASD+ESPACIO o ←/→ ↑ ENTER (en 1vAI ambos sirven)
      const sp1 = speedScale(home.stats.speed);
      const p1Left = keys["a"] || (mode === "1vAI" && keys["arrowleft"]);
      const p1Right = keys["d"] || (mode === "1vAI" && keys["arrowright"]);
      const p1Jump = keys["w"] || (mode === "1vAI" && keys["arrowup"]);
      const p1Kick = keys[" "] || (mode === "1vAI" && keys["enter"]);
      if (p1Left) p1.vx = -sp1;
      else if (p1Right) p1.vx = sp1;
      else p1.vx *= 0.78;
      if (p1Jump && p1.y >= ground) p1.vy = jumpScale(home.stats.jump);
      if (p1Kick) p1.kick = 10;

      // P2: en 1v1 humano con flechas; en 1vAI siempre IA
      if (mode === "1v1") {
        const sp2 = speedScale(away.stats.speed);
        if (keys["arrowleft"]) p2.vx = -sp2;
        else if (keys["arrowright"]) p2.vx = sp2;
        else p2.vx *= 0.78;
        if (keys["arrowup"] && p2.y >= ground) p2.vy = jumpScale(away.stats.jump);
        if (keys["enter"]) p2.kick = 10;
      } else {
        // IA: persigue la pelota libremente por toda la cancha (sin barrera invisible)
        if (aiJumpCd > 0) aiJumpCd--;
        const sp2 = speedScale(away.stats.speed) * aiCfg.speed;
        const predictedX = ball.x + ball.vx * aiCfg.react;
        const ballFar = Math.abs(ball.x - p2.x) > 220;
        // Offset para encarar la pelota hacia el arco rival (izquierda)
        const offset = ball.x < p2.x ? 18 : -18;
        const targetX = Math.max(p2.r, Math.min(W - p2.r, predictedX + offset));
        // Banda muerta para que no oscile encima de la pelota
        const dead = 14;
        if (Math.abs(p2.x - targetX) > dead) p2.vx = p2.x < targetX ? sp2 : -sp2;
        else p2.vx *= 0.7;

        // Salto: solo si la pelota está alta, cerca, descendiendo hacia el jugador, y con cooldown
        const ballHigh = ball.y < ground - 90;
        const ballNearX = Math.abs(ball.x - p2.x) < 70;
        const ballDescending = ball.vy > 0;
        if (
          aiJumpCd === 0 && p2.y >= ground && ballHigh && ballNearX && ballDescending &&
          Math.random() < aiCfg.jumpProb
        ) {
          p2.vy = jumpScale(away.stats.jump);
          aiJumpCd = aiCfg.jumpCd;
        }

        // Patear: solo si está realmente al alcance
        if (
          Math.abs(p2.x - ball.x) < 55 &&
          Math.abs(p2.y - ball.y) < 55 &&
          Math.random() < aiCfg.kickProb
        ) p2.kick = 10;

        // Pequeñas pausas naturales si está lejos
        if (ballFar && Math.random() < 0.02) p2.vx *= 0.4;
      }

      // Posesión: cuenta el último que tocó
      if (ball.lastTouch === 1) stateRef.current.posH++;
      else if (ball.lastTouch === 2) stateRef.current.posA++;

      [p1, p2].forEach(p => {
        p.x += p.vx;
        p.vy += 0.42;
        p.y += p.vy;
        if (p.y > ground) { p.y = ground; p.vy = 0; }
        p.x = Math.max(p.r, Math.min(W - p.r, p.x));
        if (p.kick > 0) p.kick--;
      });

      const wind = weather === "wind" ? -0.06 : 0;

      // Pelota — físicas tipo Football Heads (liviana, alegre)
      ball.vy += 0.22;
      ball.vx += wind;
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= 0.996;
      ball.spin += ball.vx * 0.05;
      ball.squash = 0;

      // Suelo (rebote vivo)
      if (ball.y > ground - ball.r) {
        ball.y = ground - ball.r;
        ball.vy = Math.abs(ball.vy) > 1.0 ? -Math.abs(ball.vy) * 0.72 : 0;
        ball.vx *= 0.98;
      }
      // Paredes
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.75; }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.75; }


      // ===== Travesaño (único elemento sólido del arco) =====
      // El balón puede entrar libremente al arco; solo rebota en la barra superior.
      const hitCrossbar = (xMin: number, xMax: number) => {
        if (ball.x + ball.r > xMin && ball.x - ball.r < xMax) {
          // desde arriba
          if (ball.y + ball.r > crossbarY && ball.y < crossbarY) {
            ball.y = crossbarY - ball.r;
            ball.vy = -Math.abs(ball.vy) * 0.4 - 0.1;
            ball.vx *= 0.95;
          }
          // desde abajo
          else if (ball.y - ball.r < crossbarY && ball.y > crossbarY && ball.vy < 0) {
            ball.y = crossbarY + ball.r;
            ball.vy = Math.abs(ball.vy) * 0.4;
          }
        }
      };
      hitCrossbar(0, goalW);
      hitCrossbar(W - goalW, W);

      const lpx = goalW;
      const rpx = W - goalW;

      [p1, p2].forEach((p, i) => {
        const rad = p.r;
        // Cabeza
        const dx = ball.x - p.x, dy = ball.y - (p.y - rad);
        const d = Math.hypot(dx, dy);
        const minD = rad + ball.r;
        if (d < minD) {
          const ang = Math.atan2(dy, dx);
          const power = (i === 0 ? home.stats.power : away.stats.power) / 18;
          const kickBoost = p.kick > 0 ? 4 + power : 1.2;
          ball.vx = Math.cos(ang) * (2.2 + kickBoost) + p.vx * 0.45;
          ball.vy = Math.sin(ang) * (2.2 + kickBoost) - 1.8;
          ball.x = p.x + Math.cos(ang) * minD;
          ball.y = (p.y - rad) + Math.sin(ang) * minD;
          ball.lastTouch = (i === 0 ? 1 : 2);
          // Cualquier toque hacia el arco rival cuenta como remate
          registerShot(i === 0 ? 1 : 2);
        }
        // Pie (siempre apuntando al arco rival)
        if (p.kick > 0) {
          const fx = p.x + p.facing * (rad + 12);
          const fy = p.y - 8;
          const fdx = ball.x - fx, fdy = ball.y - fy;
          const fd = Math.hypot(fdx, fdy);
          if (fd < ball.r + 14) {
            const ang = Math.atan2(fdy, fdx);
            const power = (i === 0 ? home.stats.power : away.stats.power) / 12;
            ball.vx = Math.cos(ang) * (6.5 + power) + p.facing * 3;
            ball.vy = Math.sin(ang) * (4 + power) - 3;
            ball.lastTouch = (i === 0 ? 1 : 2);
            registerShot(i === 0 ? 1 : 2);
          }
        }
      });

      // Goles: solo cuando la pelota cruza la línea claramente bajo el travesaño
      if (ball.x + ball.r < lpx && ball.y > crossbarY + 2) {
        stateRef.current.a++;
        stateRef.current.otA++;
        setScore({ h: stateRef.current.h, a: stateRef.current.a });
        spawnGoal(ball.x, ball.y, away.primary);
        playGoalAudio(away, "away");
        resetBall(1);
      } else if (ball.x - ball.r > rpx && ball.y > crossbarY + 2) {
        stateRef.current.h++;
        stateRef.current.otH++;
        setScore({ h: stateRef.current.h, a: stateRef.current.a });
        spawnGoal(ball.x, ball.y, home.primary);
        playGoalAudio(home, "home");
        resetBall(-1);
      }

      // Particulas
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.vy += 0.2; pt.x += pt.vx; pt.y += pt.vy; pt.life--;
        if (pt.life <= 0) particles.splice(i, 1);
      }

      weatherP.forEach(w => {
        w.x += w.vx; w.y += w.vy;
        if (w.y > H) { w.y = -10; w.x = Math.random() * W; }
        if (w.y < -20) { w.y = H + 10; w.x = Math.random() * W; }
        if (w.x < -10) w.x = W + 10;
        if (w.x > W + 10) w.x = -10;
      });

      crowd.forEach(c => c.bob += 0.05);

      // Refresca stats UI cada ~30 frames
      if (frame % 30 === 0) {
        const total = stateRef.current.posH + stateRef.current.posA;
        setStats({
          possessionH: total > 0 ? Math.round((stateRef.current.posH / total) * 100) : 50,
          shotsH: stateRef.current.shotsH,
          shotsA: stateRef.current.shotsA,
          onTargetH: stateRef.current.otH,
          onTargetA: stateRef.current.otA,
          savesH: stateRef.current.savH,
          savesA: stateRef.current.savA,
        });
      }
    };

    const registerShot = (who: 1 | 2) => {
      // Evita contar varias veces el mismo contacto
      if (frame - lastShotFrame[who] < 20) return;
      lastShotFrame[who] = frame;
      if (who === 1) {
        if (ball.vx > 4) stateRef.current.shotsH++;
      } else {
        if (ball.vx < -4) stateRef.current.shotsA++;
      }
    };
    const lastShotFrame = { 1: -999, 2: -999 } as Record<1 | 2, number>;

    const resetBall = (dir: number) => {
      ball.x = W / 2; ball.y = H / 2 - 50; ball.vx = dir * 2.1; ball.vy = -4.2; ball.squash = 0;
      ball.lastTouch = 0;
      p1.x = W * 0.28; p1.y = ground; p1.vx = 0; p1.vy = 0;
      p2.x = W * 0.72; p2.y = ground; p2.vx = 0; p2.vy = 0;
    };

    const drawHead = (p: Player) => {
      const rad = p.r;
      const run = Math.min(1, Math.abs(p.vx) / 6);
      const hop = Math.sin(frame * 0.28) * 3 * run;
      const lean = Math.max(-0.18, Math.min(0.18, p.vx * 0.035));
      const shadowScale = Math.max(0.4, 1 - (ground - p.y) / 300);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(p.x, ground + 6, rad * 0.9 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(p.x, p.y + hop);
      ctx.rotate(lean);

      // Pie SIEMPRE en el lado del arco rival (p.facing fijo)
      const kickPhase = p.kick > 0 ? p.kick / 10 : 0;
      const stride = Math.sin(frame * 0.45) * 7 * run;
      const footX = p.facing * (kickPhase > 0 ? 18 + kickPhase * 16 : 7 + Math.abs(stride));
      const footY = kickPhase > 0 ? -8 - kickPhase * 7 : Math.abs(stride) * 0.25;
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath(); ctx.ellipse(footX, footY, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.ellipse(footX - p.facing * 4, footY + 2, 5, 4, 0, 0, Math.PI * 2); ctx.fill();





      // Cabeza
      ctx.beginPath();
      ctx.ellipse(0, -rad, rad * (1 + run * 0.025), rad * (1 - run * 0.02), 0, 0, Math.PI * 2);
      ctx.fillStyle = "#f4c89a"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#1a1a1a"; ctx.stroke();

      // Gorra
      ctx.beginPath();
      ctx.arc(0, -rad - 2, rad - 1, Math.PI + 0.3, -0.3);
      ctx.fillStyle = p.color; ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.second;
      ctx.fillRect(-rad + 3, -rad - 6, (rad * 2) - 6, 5);

      // Ojos hacia la pelota
      const look = ball.x > p.x ? 1 : -1;
      const eyeX = look === 1 ? 8 : -8;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(eyeX, -rad + 2, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath(); ctx.arc(eyeX + look * 2, -rad + 3, 3.5, 0, Math.PI * 2); ctx.fill();

      // Boca
      ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(look * 4, -rad + 14, p.kick > 0 ? 7 : 5, 0.1, Math.PI - 0.1);
      ctx.stroke();

      ctx.restore();
    };

    const draw = () => {
      const sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, "#0b1d3d");
      sky.addColorStop(0.5, "#1d4f9a");
      sky.addColorStop(1, "#3a8fd8");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, ground);

      ctx.fillStyle = "#0d1424";
      ctx.fillRect(0, 0, W, 130);
      crowd.forEach(c => {
        const y = c.y + Math.sin(c.bob) * 1.5;
        ctx.fillStyle = c.c;
        ctx.beginPath(); ctx.arc(c.x, y, 5, 0, Math.PI * 2); ctx.fill();
      });
      for (let i = 0; i < 8; i++) {
        const fx = (i * W / 8) + (Date.now() / 200 % 20);
        const fy = 100 + Math.sin(Date.now() / 400 + i) * 4;
        ctx.fillStyle = i % 2 ? "#7ec8ff" : "#ffffff";
        ctx.fillRect(fx, fy, 18, 12);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(fx - 1, fy, 2, 26);
      }

      ctx.fillStyle = "#e63946";
      ctx.fillRect(0, ground - 18, W, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px system-ui";
      for (let i = 0; i < W; i += 140) ctx.fillText("PRIMERA NACIONAL", i + 10, ground - 5);

      for (let i = 0; i < W; i += 50) {
        ctx.fillStyle = (i / 50) % 2 === 0 ? "#3a9d4d" : "#2f8341";
        ctx.fillRect(i, ground, 50, H - ground);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W / 2, ground); ctx.lineTo(W / 2, H); ctx.stroke();

      const drawGoal = (x: number) => {
        // Red
        ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
        for (let y = ground - goalH; y < ground; y += 8) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + goalW, y); ctx.stroke();
        }
        for (let xx = x; xx < x + goalW; xx += 8) {
          ctx.beginPath(); ctx.moveTo(xx, ground - goalH); ctx.lineTo(xx, ground); ctx.stroke();
        }
        // Marco grueso (postes y travesaño)
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, ground); ctx.lineTo(x, ground - goalH);
        ctx.lineTo(x + goalW, ground - goalH); ctx.lineTo(x + goalW, ground);
        ctx.stroke();
      };
      drawGoal(0);
      drawGoal(W - goalW);

      drawHead(p1);
      drawHead(p2);

      const sScale = Math.max(0.3, 1 - (ground - ball.y) / 350);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(ball.x, ground + 4, ball.r * sScale, 4 * sScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.spin);
      ctx.scale(1 + ball.squash, 1 - ball.squash * 0.65);
      ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "#1a1a1a"; ctx.stroke();
      ctx.fillStyle = "#1a1a1a";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 6, Math.sin(a) * 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      particles.forEach(pt => {
        ctx.globalAlpha = Math.max(0, pt.life / 90);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        ctx.globalAlpha = 1;
      });

      ctx.save();
      weatherP.forEach(w => {
        if (weather === "rain") {
          ctx.strokeStyle = "rgba(180,210,255,0.7)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x - 2, w.y + 8); ctx.stroke();
        } else if (weather === "wind") {
          ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + 18, w.y); ctx.stroke();
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
    let last = performance.now();
    let acc = 0;
    const stepMs = 1000 / 60;
    const loop = (now = performance.now()) => {
      if (overRef.current) return;
      acc += Math.min(50, now - last);
      last = now;
      while (acc >= stepMs) { update(); acc -= stepMs; }
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop();

    advanceCrowdSegment(duration);
    const tick = setInterval(() => {
      setTime(t => {
        const next = t - 1;
        advanceCrowdSegment(next);
        if (t <= 1) {
          overRef.current = true;
          clearInterval(tick);
          cancelAnimationFrame(raf);
          if (crowdRef.current) { crowdRef.current.pause(); crowdRef.current.src = ""; crowdRef.current = null; }
          if (narratorRef.current) { narratorRef.current.pause(); narratorRef.current.src = ""; narratorRef.current = null; }
          const total = stateRef.current.posH + stateRef.current.posA;
          const finalStats: MatchStats = {
            possessionH: total > 0 ? Math.round((stateRef.current.posH / total) * 100) : 50,
            shotsH: stateRef.current.shotsH, shotsA: stateRef.current.shotsA,
            onTargetH: stateRef.current.otH, onTargetA: stateRef.current.otA,
            savesH: stateRef.current.savH, savesA: stateRef.current.savA,
          };
          onEnd(stateRef.current.h, stateRef.current.a, finalStats);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      overRef.current = true;
      cancelAnimationFrame(raf);
      clearInterval(tick);
      if (crowdRef.current) { crowdRef.current.pause(); crowdRef.current.src = ""; crowdRef.current = null; }
      if (narratorRef.current) { narratorRef.current.pause(); narratorRef.current.src = ""; narratorRef.current = null; }
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [home, away, onEnd, weather, aiDifficulty, mode, duration]);

  const press = (k: string, down: boolean) => {
    const ev = new KeyboardEvent(down ? "keydown" : "keyup", { key: k });
    window.dispatchEvent(ev);
  };

  const possA = 100 - stats.possessionH;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="scorebug" role="status" aria-label={`${home.short} ${score.h}, ${away.short} ${score.a}, ${time} segundos`}>
        <div className="scorebug-brand">N</div>
        <div className="scorebug-team scorebug-home">
          <span className="scorebug-code">{home.short}</span>
        </div>
        <div className="scorebug-shield scorebug-shield-home">
          <Shield team={home} size={42} eager />
        </div>
        <ScoreColorBars team={home} />
        <div className="scorebug-score">{score.h}</div>
        <div className="scorebug-score">{score.a}</div>
        <ScoreColorBars team={away} reverse />
        <div className="scorebug-shield scorebug-shield-away">
          <Shield team={away} size={42} eager />
        </div>
        <div className="scorebug-team scorebug-away">
          <span className="scorebug-code">{away.short}</span>
        </div>
        <div className="scorebug-clock">{String(Math.floor(time / 60)).padStart(2, "0")}:{String(time % 60).padStart(2, "0")}</div>
        <div className="scorebug-half">1T</div>
      </div>

      <canvas ref={ref} width={960} height={480} className="w-full max-w-3xl rounded-2xl border-2 border-border bg-black" />

      {/* Estadísticas en vivo */}
      <div className="w-full max-w-3xl rounded-2xl bg-card border border-border p-3 text-sm">
        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="text-right font-display">{home.short}</div>
          <div className="text-center text-xs text-muted-foreground uppercase tracking-wider">Estadísticas</div>
          <div className="text-left font-display">{away.short}</div>

          <StatRow label="Posesión" h={`${stats.possessionH}%`} a={`${possA}%`} barH={stats.possessionH} barA={possA} />
          <StatRow label="Remates" h={stats.shotsH} a={stats.shotsA} />
          <StatRow label="Al arco" h={stats.onTargetH} a={stats.onTargetA} />
        </div>
      </div>

      <div className="w-full max-w-3xl rounded-2xl bg-card border border-border p-3 text-xs grid sm:grid-cols-2 gap-3">
        <label className="flex items-center gap-2">
          <span className="w-20 uppercase tracking-wider text-muted-foreground">Relato</span>
          <input type="range" min={0} max={1} step={0.05} value={narratorVol}
            onChange={e => setNarratorVol(Number(e.target.value))} className="flex-1" />
          <span className="w-8 text-right tabular-nums">{Math.round(narratorVol * 100)}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="w-20 uppercase tracking-wider text-muted-foreground">Hinchada</span>
          <input type="range" min={0} max={1} step={0.05} value={crowdVol}
            onChange={e => setCrowdVol(Number(e.target.value))} className="flex-1" />
          <span className="w-8 text-right tabular-nums">{Math.round(crowdVol * 100)}</span>
        </label>
      </div>


      <div className="grid grid-cols-4 gap-2 w-full max-w-3xl md:hidden">
        {[["a","◀"],["d","▶"],["w","▲"],[" ","⚽"]].map(([k,l]) => (
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
        {mode === "1vAI"
          ? "Local: A/D o ←/→ mover · W/↑ saltar · ESPACIO/ENTER patear"
          : `Local: A/D mover · W saltar · ESPACIO patear  |  Visitante: ←/→ ↑ ENTER`}
      </p>
    </div>
  );
}

function StatRow({ label, h, a, barH, barA }: { label: string; h: number | string; a: number | string; barH?: number; barA?: number }) {
  return (
    <>
      <div className="text-right tabular-nums">{h}</div>
      <div className="text-center text-[11px] text-muted-foreground">
        {label}
        {barH !== undefined && barA !== undefined && (
          <div className="flex h-1.5 mt-1 rounded-full overflow-hidden bg-white/10">
            <div className="bg-celeste" style={{ width: `${barH}%` }} />
            <div className="bg-accent" style={{ width: `${barA}%` }} />
          </div>
        )}
      </div>
      <div className="text-left tabular-nums">{a}</div>
    </>
  );
}
