import { useEffect, useRef, useState } from "react";
import { Shield } from "@/components/Shield";
import { Team } from "@/data/teams";

// ===== Penales — mini-juego interactivo (potencia + apunte) =====
// Reemplaza al grid de botones original: ahora el arco, el arquero y el
// pateador se dibujan en canvas (mismo lenguaje visual que el motor
// principal), con 6 zonas de apunte, barra de potencia cargable, y un
// arquero que "adivina" el lado según la stat de defensa del equipo rival.

type Zone = 1 | 2 | 3 | 4 | 5 | 6;
const ZONES: Zone[] = [1, 2, 3, 4, 5, 6];
const zoneCol = (z: Zone): "L" | "C" | "R" => (z === 1 || z === 4 ? "L" : z === 3 || z === 6 ? "R" : "C");
const zoneRow = (z: Zone): "T" | "B" => (z <= 3 ? "T" : "B");

type Shot = { team: "H" | "A"; zone: Zone; keeperZone: Zone | null; goal: boolean; missedTarget: boolean };

type Phase = "aim" | "charging" | "flying" | "result";

function resolveShot(zone: Zone, power: number, keeperDefense: number) {
  const overpowered = power > 92;
  const weak = power < 35;
  const missChance = overpowered ? 0.16 : weak ? 0.05 : 0.06;
  if (Math.random() < missChance) return { goal: false, keeperZone: null as Zone | null, missedTarget: true };

  const guessChance = 0.30 + keeperDefense / 250; // ~0.3 a ~0.7
  const guessedRight = Math.random() < guessChance;
  const otherZones = ZONES.filter(z => z !== zone);
  const keeperZone = guessedRight ? zone : otherZones[Math.floor(Math.random() * otherZones.length)];

  if (guessedRight) {
    const cornerBonus = zoneRow(zone) === "T" ? 0.15 : 0;
    let saveChance = 0.55 - cornerBonus + (weak ? 0.15 : 0) - (overpowered ? 0.1 : 0) + keeperDefense / 500;
    saveChance = Math.max(0.15, Math.min(0.85, saveChance));
    const saved = Math.random() < saveChance;
    return { goal: !saved, keeperZone, missedTarget: false };
  }
  const recoverChance = weak ? 0.12 : 0.03;
  const saved = Math.random() < recoverChance;
  return { goal: !saved, keeperZone, missedTarget: false };
}

const CW = 900, CH = 460;
const GOAL_X = 170, GOAL_Y = 70, GOAL_W = 560, GOAL_H = 250;
const zonePos = (z: Zone) => {
  const col = zoneCol(z), row = zoneRow(z);
  const cx = GOAL_X + (col === "L" ? GOAL_W * 0.17 : col === "C" ? GOAL_W * 0.5 : GOAL_W * 0.83);
  const cy = GOAL_Y + (row === "T" ? GOAL_H * 0.32 : GOAL_H * 0.78);
  return { x: cx, y: cy };
};

export function Penales({ home, away, onEnd }: { home: Team; away: Team; onEnd: (winner: "H" | "A", h: number, a: number) => void }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [turn, setTurn] = useState<"H" | "A">("H");
  const [phase, setPhase] = useState<Phase>("aim");
  const [aimZone, setAimZone] = useState<Zone>(2);
  const [power, setPower] = useState(0);
  const [lastResult, setLastResult] = useState<Shot | null>(null);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chargingRef = useRef(false);
  const powerRef = useRef(0);
  const animRef = useRef<{ t: number; from: { x: number; y: number }; to: { x: number; y: number }; keeperTo: { x: number; y: number } } | null>(null);

  const shooter = turn === "H" ? home : away;
  const keeper = turn === "H" ? away : home;
  const hScore = shots.filter(s => s.team === "H" && s.goal).length;
  const aScore = shots.filter(s => s.team === "A" && s.goal).length;
  const hShots = shots.filter(s => s.team === "H");
  const aShots = shots.filter(s => s.team === "A");

  // Carga de potencia mientras se mantiene ESPACIO
  useEffect(() => {
    if (done) return;
    let raf = 0;
    const tick = () => {
      if (chargingRef.current) {
        powerRef.current = Math.min(100, powerRef.current + 2.1);
        setPower(powerRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  useEffect(() => {
    if (done) return;
    const onDown = (e: KeyboardEvent) => {
      if (phase !== "aim" && phase !== "charging") return;
      const k = e.key.toLowerCase();
      if (["1", "2", "3", "4", "5", "6"].includes(k)) setAimZone(Number(k) as Zone);
      if (k === "arrowleft") setAimZone(z => (zoneCol(z) === "C" ? (zoneRow(z) === "T" ? 1 : 4) : zoneCol(z) === "R" ? (zoneRow(z) === "T" ? 2 : 5) : z) as Zone);
      if (k === "arrowright") setAimZone(z => (zoneCol(z) === "C" ? (zoneRow(z) === "T" ? 3 : 6) : zoneCol(z) === "L" ? (zoneRow(z) === "T" ? 2 : 5) : z) as Zone);
      if (k === "arrowup") setAimZone(z => (zoneRow(z) === "B" ? ((z as number) - 3) as Zone : z));
      if (k === "arrowdown") setAimZone(z => (zoneRow(z) === "T" ? ((z as number) + 3) as Zone : z));
      if (k === " ") { e.preventDefault(); chargingRef.current = true; setPhase("charging"); }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === " " && chargingRef.current) {
        e.preventDefault();
        chargingRef.current = false;
        shoot();
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, done]);

  function shoot() {
    if (phase === "result" || phase === "flying" || done) return;
    const finalPower = powerRef.current;
    const keeperDefense = (turn === "H" ? away.stats.defense : home.stats.defense) ?? 60;
    const res = resolveShot(aimZone, finalPower, keeperDefense);
    const shot: Shot = { team: turn, zone: aimZone, keeperZone: res.keeperZone, goal: res.goal, missedTarget: res.missedTarget };
    const from = { x: CW / 2, y: CH - 70 };
    const to = res.missedTarget
      ? { x: zonePos(aimZone).x + (Math.random() > 0.5 ? 90 : -90), y: zonePos(aimZone).y - 60 }
      : zonePos(aimZone);
    animRef.current = { t: 0, from, to, keeperTo: res.keeperZone ? zonePos(res.keeperZone) : zonePos(aimZone) };
    setPhase("flying");
    powerRef.current = 0; setPower(0);

    setTimeout(() => {
      const next = [...shots, shot];
      setShots(next);
      evaluateEnd(next);
      setLastResult(shot);
      setPhase("result");
    }, 620);
  }

  function evaluateEnd(next: Shot[]) {
    const nh = next.filter(s => s.team === "H");
    const na = next.filter(s => s.team === "A");
    const hs = nh.filter(s => s.goal).length;
    const as = na.filter(s => s.goal).length;
    const round = Math.max(nh.length, na.length);
    const both = nh.length === na.length;
    let finished = false;
    if (round <= 5) {
      const hRemaining = 5 - nh.length, aRemaining = 5 - na.length;
      if (both && Math.abs(hs - as) > hRemaining && Math.abs(hs - as) > aRemaining) finished = true;
      if (!both && Math.abs(hs - as) > Math.min(hRemaining, aRemaining)) finished = true;
      if (both && nh.length === 5 && hs !== as) finished = true;
    } else if (both && hs !== as) finished = true;

    if (finished) {
      setTimeout(() => {
        setDone(true);
        setTimeout(() => onEnd(hs > as ? "H" : "A", hs, as), 1400);
      }, 900);
    } else {
      setTimeout(() => {
        setTurn(t => (t === "H" ? "A" : "H"));
        setPhase("aim");
        setAimZone(2);
      }, 1300);
    }
  }

  // ===== Render canvas =====
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      ctx.clearRect(0, 0, CW, CH);
      // Cielo nocturno
      const sky = ctx.createLinearGradient(0, 0, 0, CH);
      sky.addColorStop(0, "#070d20"); sky.addColorStop(1, "#173463");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
      // Halos de luces
      [CW * 0.1, CW * 0.9].forEach(tx => {
        const g = ctx.createRadialGradient(tx, 10, 5, tx, 10, 220);
        g.addColorStop(0, "rgba(255,250,210,0.35)"); g.addColorStop(1, "rgba(255,250,210,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, 10, 220, 0, Math.PI * 2); ctx.fill();
      });
      // Tribuna simplificada (puntitos)
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < CW / 14; i++) {
          ctx.fillStyle = ["#7ec8ff", "#ffffff", "#ffe066", home.primary, away.primary][Math.floor(Math.random() * 5)];
          ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.arc(i * 14, 20 + row * 12, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // Césped
      ctx.fillStyle = "#2f8c43"; ctx.fillRect(0, CH - 90, CW, 90);
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2;
      ctx.strokeRect(GOAL_X - 60, CH - 90, GOAL_W + 120, 60);

      // Arco: red + marco
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
      for (let y = GOAL_Y; y < GOAL_Y + GOAL_H; y += 10) { ctx.beginPath(); ctx.moveTo(GOAL_X, y); ctx.lineTo(GOAL_X + GOAL_W, y); ctx.stroke(); }
      for (let x = GOAL_X; x < GOAL_X + GOAL_W; x += 10) { ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_H); ctx.stroke(); }
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 6;
      ctx.strokeRect(GOAL_X, GOAL_Y, GOAL_W, GOAL_H);

      // Zonas de apunte (solo durante aim/charging)
      if (phase === "aim" || phase === "charging") {
        ZONES.forEach(z => {
          const { x, y } = zonePos(z);
          const active = z === aimZone;
          ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2);
          ctx.fillStyle = active ? "rgba(56,189,248,0.28)" : "rgba(56,189,248,0.08)";
          ctx.fill();
          ctx.lineWidth = active ? 3 : 1.5;
          ctx.strokeStyle = active ? "#38bdf8" : "rgba(56,189,248,0.5)";
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 20px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(String(z), x, y + 7);
        });
        ctx.textAlign = "start";
      }

      // Arquero
      const keeperPos = phase === "flying" || phase === "result"
        ? lerpPos({ x: CW / 2, y: GOAL_Y + GOAL_H * 0.72 }, animRef.current?.keeperTo ?? { x: CW / 2, y: GOAL_Y + GOAL_H * 0.72 }, phase === "result" ? 1 : easeT(animRef.current?.t ?? 0))
        : { x: CW / 2, y: GOAL_Y + GOAL_H * 0.72 };
      drawHead(ctx, keeperPos.x, keeperPos.y, 32, keeper.primary, keeper.secondary, true);

      // Pateador (de espaldas, abajo)
      drawHead(ctx, CW / 2 - 110, CH - 96, 36, shooter.primary, shooter.secondary, false);

      // Pelota
      const ballPos = phase === "flying"
        ? lerpPos(animRef.current?.from ?? { x: CW / 2, y: CH - 70 }, animRef.current?.to ?? { x: CW / 2, y: CH - 70 }, easeT(animRef.current?.t ?? 0))
        : phase === "result" && lastResult && !lastResult.missedTarget && lastResult.goal
        ? zonePos(lastResult.zone)
        : phase === "result"
        ? (animRef.current?.to ?? { x: CW / 2, y: CH - 70 })
        : { x: CW / 2, y: CH - 70 };
      ctx.beginPath(); ctx.arc(ballPos.x, ballPos.y, 11, 0, Math.PI * 2);
      const bg = ctx.createRadialGradient(ballPos.x - 3, ballPos.y - 3, 1, ballPos.x, ballPos.y, 13);
      bg.addColorStop(0, "#fff"); bg.addColorStop(1, "#c9c9c9");
      ctx.fillStyle = bg; ctx.fill();
      ctx.lineWidth = 1.3; ctx.strokeStyle = "#2a2a2a"; ctx.stroke();

      if (animRef.current && phase === "flying") {
        animRef.current.t = Math.min(1, animRef.current.t + 0.045);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase, aimZone, keeper, shooter, lastResult]);

  return (
    <div className="rounded-2xl bg-card border border-border p-4 mt-4">
      {/* Scoreboard */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <Shield team={home} size={36} />
          <div>
            <div className="font-display text-sm truncate max-w-[120px]">{home.short}</div>
            <DotRow shots={hShots} />
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-3xl tabular-nums leading-none">{hScore} - {aScore}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Penales</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="font-display text-sm truncate max-w-[120px]">{away.short}</div>
            <DotRow shots={aShots} align="right" />
          </div>
          <Shield team={away} size={36} />
        </div>
      </div>

      {!done && (
        <>
          <div className="text-center text-sm mb-2">
            <span className="inline-block px-3 py-1 rounded-full bg-celeste/15 border border-celeste/40 text-celeste font-display tracking-wide text-xs mb-1">
              PATEA AHORA · {turn === "H" ? "LOCAL" : "VISITANTE"}
            </span>
            <div>
              Patea <span className="font-display text-base text-celeste">{shooter.name}</span> · ataja <span className="text-muted-foreground">{keeper.short}</span>
            </div>
          </div>

          <div className="mx-auto max-w-2xl rounded-xl overflow-hidden border-2 border-white/10 bg-black">
            <canvas ref={canvasRef} width={CW} height={CH} className="w-full h-auto block" />
          </div>

          {phase === "result" && lastResult && (
            <div className={`text-center font-display text-xl mt-2 ${lastResult.goal ? "text-celeste" : "text-destructive"}`}>
              {lastResult.missedTarget ? "¡SE FUE AFUERA!" : lastResult.goal ? "¡GOOOOL!" : "¡LA ATAJÓ EL ARQUERO!"}
            </div>
          )}

          {(phase === "aim" || phase === "charging") && (
            <>
              <div className="mx-auto max-w-2xl mt-3">
                <div className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-1">Potencia del tiro</div>
                <div className="h-5 rounded-full bg-white/10 overflow-hidden border border-white/10">
                  <div
                    className="h-full transition-[width] duration-75"
                    style={{
                      width: `${power}%`,
                      background: "linear-gradient(90deg, #22c55e, #eab308, #ef4444)",
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-muted-foreground">
                <span><kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border">1-6</kbd> o flechas: apuntar</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border">ESPACIO</kbd> mantener: cargar tiro</span>
                <span>Soltar: <span className="text-foreground">disparar</span></span>
              </div>
              <div className="flex justify-center gap-2 mt-3 sm:hidden">
                {ZONES.map(z => (
                  <button key={z} onClick={() => setAimZone(z)}
                    className={`w-9 h-9 rounded-full border text-sm font-display ${aimZone === z ? "bg-celeste/30 border-celeste text-celeste" : "border-border"}`}>
                    {z}
                  </button>
                ))}
              </div>
              <div className="flex justify-center mt-2 sm:hidden">
                <button
                  onTouchStart={(e) => { e.preventDefault(); chargingRef.current = true; setPhase("charging"); }}
                  onTouchEnd={(e) => { e.preventDefault(); if (chargingRef.current) { chargingRef.current = false; shoot(); } }}
                  className="px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider active:scale-95">
                  MANTENÉ PARA CARGAR
                </button>
              </div>
            </>
          )}
        </>
      )}

      {done && (
        <div className="text-center font-display text-xl mt-2">
          Ganó por penales {hScore > aScore ? home.name : away.name}
        </div>
      )}
    </div>
  );
}

function DotRow({ shots, align = "left" }: { shots: Shot[]; align?: "left" | "right" }) {
  return (
    <div className={`flex gap-1 mt-1 ${align === "right" ? "justify-end" : ""}`}>
      {Array.from({ length: Math.max(5, shots.length) }).map((_, i) => (
        <div key={i} className={`w-3 h-3 rounded-full border ${shots[i] ? (shots[i].goal ? "bg-celeste border-celeste" : "bg-destructive/70 border-destructive") : "border-border"}`} />
      ))}
    </div>
  );
}

function easeT(t: number) { return 1 - Math.pow(1 - t, 2); }
function lerpPos(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// Cabecita estilo "Football Heads", parada (no corriendo) — para el arquero y el pateador.
function drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, primary: string, secondary: string, arms: boolean) {
  ctx.save();
  ctx.translate(x, y);
  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(0, r * 0.75, r * 0.8, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  // cuerpo
  ctx.fillStyle = primary;
  ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.55, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  if (arms) {
    ctx.strokeStyle = primary; ctx.lineWidth = r * 0.28; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, r * 0.1); ctx.lineTo(-r * 0.95, -r * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, r * 0.1); ctx.lineTo(r * 0.95, -r * 0.15); ctx.stroke();
  }
  // cabeza
  ctx.beginPath(); ctx.arc(0, -r * 0.55, r, 0, Math.PI * 2);
  ctx.fillStyle = "#f4c89a"; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = "#1a1a1a"; ctx.stroke();
  // gorra/pelo
  ctx.beginPath(); ctx.arc(0, -r * 0.58, r - 1, Math.PI + 0.25, -0.25);
  ctx.fillStyle = secondary; ctx.fill(); ctx.stroke();
  // ojos
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.55, r * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.55, r * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath(); ctx.arc(-r * 0.24, -r * 0.53, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.53, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
