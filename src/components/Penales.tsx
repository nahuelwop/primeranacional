import { useEffect, useRef, useState } from "react";
import { Shield } from "@/components/Shield";
import { Team } from "@/data/teams";
import { supabase } from "@/integrations/supabase/client";

// ===== Penales — mini-juego interactivo (potencia + apunte) =====
// El arco, el arquero y el pateador se dibujan en canvas (mismo lenguaje
// visual que el motor principal). 6 zonas de apunte, barra de potencia
// cargable, relatos según el momento, y — si el modo es 1 vs IA — cuando
// patea la IA el usuario pasa a controlar al arquero (elige el palo).

type Zone = 1 | 2 | 3 | 4 | 5 | 6;
const ZONES: Zone[] = [1, 2, 3, 4, 5, 6];
const zoneCol = (z: Zone): "L" | "C" | "R" => (z === 1 || z === 4 ? "L" : z === 3 || z === 6 ? "R" : "C");
const zoneRow = (z: Zone): "T" | "B" => (z <= 3 ? "T" : "B");
const otherZone = (z: Zone) => {
  const rest = ZONES.filter(x => x !== z);
  return rest[Math.floor(Math.random() * rest.length)];
};

type Shot = { team: "H" | "A"; zone: Zone; keeperZone: Zone | null; goal: boolean; missedTarget: boolean; decisive: boolean };
type Phase = "aim" | "charging" | "keeper" | "flying" | "result";
type Mode = "1v1" | "1vAI";

// ===== Resolución: transparente y basada en azar =====
// - Si el arquero se tira al mismo palo que el remate: 50/50 puro (mano a mano).
// - Si se tira al otro lado: normalmente gol, con una chance chica de que igual llegue.
// - Potencia mal calibrada (muy floja o al palo) puede irse afuera, sea cual sea el palo.
function resolveDuel(power: number, zonesMatch: boolean) {
  const overpowered = power > 92;
  const weak = power < 32;
  const missChance = overpowered ? 0.13 : weak ? 0.08 : 0.05;
  if (Math.random() < missChance) return { goal: false, missedTarget: true };

  if (zonesMatch) {
    const saved = Math.random() < 0.5; // al azar, mano a mano
    return { goal: !saved, missedTarget: false };
  }
  const recovers = Math.random() < 0.1; // reflejos, aunque haya adivinado mal
  return { goal: !recovers, missedTarget: false };
}

function guessKeeperZone(shooterZone: Zone, keeperDefense: number): Zone {
  const guessChance = 0.28 + keeperDefense / 260; // ~0.28 a ~0.66
  if (Math.random() < guessChance) return shooterZone;
  return otherZone(shooterZone);
}

function pickAiShotZone(attackPower: number): Zone {
  // Cuanto mejor el equipo, más probable que vaya a un palo difícil (esquinas)
  const corners: Zone[] = [1, 3, 4, 6];
  const goesCorner = Math.random() < 0.35 + attackPower / 400;
  const pool = goesCorner ? corners : ZONES;
  return pool[Math.floor(Math.random() * pool.length)];
}

const GOAL_COMMENTS = [
  "¡GOOOOL!", "¡LA CLAVÓ!", "¡INATAJABLE!", "¡ADENTRO, SIN DUDAS!", "¡GOL, GOL, GOL!",
];
const SAVE_COMMENTS = [
  "¡LA ATAJÓ EL ARQUERO!", "¡QUÉ TAPADÓN!", "¡SE LA SACÓ DE ADENTRO!", "¡ADIVINÓ EL PALO!",
];
const MISS_COMMENTS = ["¡SE FUE AFUERA!", "¡AL VIENTO!", "¡NO PUDO CON LOS NERVIOS!"];
const DECISIVE_PRE = [
  "SILENCIO EN LA CANCHA. ESTE PENAL LO DEFINE TODO.",
  "PENAL DECISIVO. NO HAY MAÑANA.",
  "SE JUEGA TODO EN ESTE TIRO.",
];

const CW = 900, CH = 460;
const GOAL_X = 170, GOAL_Y = 70, GOAL_W = 560, GOAL_H = 250;
const zonePos = (z: Zone) => {
  const col = zoneCol(z), row = zoneRow(z);
  const cx = GOAL_X + (col === "L" ? GOAL_W * 0.17 : col === "C" ? GOAL_W * 0.5 : GOAL_W * 0.83);
  const cy = GOAL_Y + (row === "T" ? GOAL_H * 0.32 : GOAL_H * 0.78);
  return { x: cx, y: cy };
};

type PenalNarrator = {
  id: string; name: string; sort_order: number;
  penal_goal_urls?: string[]; penal_save_urls?: string[]; penal_decisive_urls?: string[];
};

export function Penales({ home, away, mode = "1v1", onEnd }: {
  home: Team; away: Team; mode?: Mode; onEnd: (winner: "H" | "A", h: number, a: number) => void;
}) {
  // Relatores globales (los mismos que administra el panel Admin): audios propios
  // para penal convertido, penal atajado y penal decisivo.
  const penalNarratorRef = useRef<PenalNarrator | null>(null);
  const penalAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    let alive = true;
    (supabase.from("global_narrators" as any) as any)
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }: { data: any }) => {
        if (!alive) return;
        const list = ((data ?? []) as PenalNarrator[]).filter(
          n => (n.penal_goal_urls?.length ?? 0) + (n.penal_save_urls?.length ?? 0) + (n.penal_decisive_urls?.length ?? 0) > 0,
        );
        if (list.length > 0) penalNarratorRef.current = list[Math.floor(Math.random() * list.length)];
      });
    return () => {
      alive = false;
      if (penalAudioRef.current) { penalAudioRef.current.pause(); penalAudioRef.current.src = ""; penalAudioRef.current = null; }
    };
  }, []);

  const playPenalAudio = (kind: "goal" | "save" | "decisive") => {
    const n = penalNarratorRef.current;
    if (!n) return;
    const pool = kind === "goal" ? n.penal_goal_urls
      : kind === "save" ? n.penal_save_urls
      : n.penal_decisive_urls;
    // Si no hay audio decisivo cargado, cae al de gol/atajada correspondiente.
    const urls = (pool && pool.length > 0) ? pool : null;
    if (!urls) return;
    const url = urls[Math.floor(Math.random() * urls.length)];
    try {
      if (penalAudioRef.current) { penalAudioRef.current.pause(); penalAudioRef.current.src = ""; }
      const a = new Audio(url);
      a.volume = 0.9;
      penalAudioRef.current = a;
      a.play().catch(() => {});
    } catch { /* autoplay bloqueado */ }
  };

  const [shots, setShots] = useState<Shot[]>([]);

  const [turn, setTurn] = useState<"H" | "A">("H");
  const [phase, setPhase] = useState<Phase>("aim");
  const [aimZone, setAimZone] = useState<Zone>(2);   // zona elegida por el usuario, sea para patear o para atajar
  const [aiShotZone, setAiShotZone] = useState<Zone>(2); // zona real del remate de la IA (oculta hasta el resultado)
  const [power, setPower] = useState(0);
  const [lastResult, setLastResult] = useState<Shot | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isDecisive, setIsDecisive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chargingRef = useRef(false);
  const powerRef = useRef(0);
  const phaseRef = useRef<Phase>("aim");
  const turnRef = useRef<"H" | "A">("H");
  const aimZoneRef = useRef<Zone>(2);
  const aiShotZoneRef = useRef<Zone>(2);
  const shotsRef = useRef<Shot[]>([]);
  const doneRef = useRef(false);
  const animRef = useRef<{ t: number; from: { x: number; y: number }; to: { x: number; y: number }; keeperTo: { x: number; y: number } } | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tribuna: se genera UNA sola vez (antes se recalculaba con Math.random() en
  // cada frame del canvas, lo que hacía titilar los colores del público sin
  // parar — parte de por qué se sentía "trabado").
  const crowdRef = useRef<{ x: number; y: number; color: string }[] | null>(null);
  if (!crowdRef.current) {
    const colors = ["#7ec8ff", "#ffffff", "#ffe066", home.primary, away.primary];
    const dots: { x: number; y: number; color: string }[] = [];
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < CW / 13; i++) {
        dots.push({ x: i * 13 + (row % 2) * 6, y: 14 + row * 11, color: colors[Math.floor(Math.random() * colors.length)] });
      }
    }
    crowdRef.current = dots;
  }

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { aimZoneRef.current = aimZone; }, [aimZone]);
  useEffect(() => { aiShotZoneRef.current = aiShotZone; }, [aiShotZone]);
  useEffect(() => { shotsRef.current = shots; }, [shots]);
  useEffect(() => { doneRef.current = done; }, [done]);

  const aiControlsShooter = mode === "1vAI" && turn === "A"; // la IA patea, el usuario ataja
  const shooter = turn === "H" ? home : away;
  const keeper = turn === "H" ? away : home;
  const hScore = shots.filter(s => s.team === "H" && s.goal).length;
  const aScore = shots.filter(s => s.team === "A" && s.goal).length;
  const hShots = shots.filter(s => s.team === "H");
  const aShots = shots.filter(s => s.team === "A");

  // Carga de potencia mientras se mantiene ESPACIO (o el toque en mobile).
  // Basada en tiempo real transcurrido (no en cantidad de frames): así la velocidad
  // de carga es siempre la misma aunque el navegador tenga algún frame lento,
  // que era lo que hacía sentir la barra "trabada".
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const FILL_RATE_PER_SEC = 145; // % por segundo mantenido
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); // clamp por si la pestaña estuvo en pausa
      last = now;
      if (chargingRef.current && !doneRef.current) {
        powerRef.current = Math.min(100, powerRef.current + FILL_RATE_PER_SEC * dt);
        setPower(powerRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Controles: un único listener estable (sin dependencias que lo re-registren a mitad
  // de una tecla presionada — eso era lo que hacía que la carga de potencia se sintiera rota).
  useEffect(() => {
    const moveZone = (z: Zone, dir: "left" | "right" | "up" | "down"): Zone => {
      const col = zoneCol(z), row = zoneRow(z);
      if (dir === "left") return (col === "C" ? (row === "T" ? 1 : 4) : col === "R" ? (row === "T" ? 2 : 5) : z) as Zone;
      if (dir === "right") return (col === "C" ? (row === "T" ? 3 : 6) : col === "L" ? (row === "T" ? 2 : 5) : z) as Zone;
      if (dir === "up") return (row === "B" ? ((z as number) - 3) as Zone : z);
      return (row === "T" ? ((z as number) + 3) as Zone : z);
    };

    const onDown = (e: KeyboardEvent) => {
      if (doneRef.current) return;
      const ph = phaseRef.current;
      if (ph !== "aim" && ph !== "charging" && ph !== "keeper") return;
      const k = e.key.toLowerCase();
      if (["1", "2", "3", "4", "5", "6"].includes(k)) { e.preventDefault(); setAimZone(Number(k) as Zone); }
      if (k === "arrowleft") { e.preventDefault(); setAimZone(z => moveZone(z, "left")); }
      if (k === "arrowright") { e.preventDefault(); setAimZone(z => moveZone(z, "right")); }
      if (k === "arrowup") { e.preventDefault(); setAimZone(z => moveZone(z, "up")); }
      if (k === "arrowdown") { e.preventDefault(); setAimZone(z => moveZone(z, "down")); }
      if (k === " ") {
        e.preventDefault();
        if (ph === "keeper") { confirmDive(); return; }
        if (!chargingRef.current) { chargingRef.current = true; setPhase("charging"); }
      }
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
  }, []);

  // Cuando le toca patear a la IA (modo 1vAI), el usuario pasa a ser arquero:
  // se sortea el remate de la IA (oculto), y se le da al usuario una ventana para elegir el palo.
  useEffect(() => {
    if (done) return;
    if (mode !== "1vAI" || turn !== "A" || phase !== "aim") return;
    const attackPower = away.stats.power ?? 70;
    const zone = pickAiShotZone(attackPower);
    setAiShotZone(zone);
    setAimZone(2);
    setPhase("keeper");
    aiTimerRef.current = setTimeout(() => confirmDive(), 2600); // si no elige, se define solo
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, phase, mode, done]);

  function confirmDive() {
    if (phaseRef.current !== "keeper" || doneRef.current) return;
    if (aiTimerRef.current) { clearTimeout(aiTimerRef.current); aiTimerRef.current = null; }
    resolveKick({
      team: "A",
      shooterZone: aiShotZoneRef.current,
      keeperZone: aimZoneRef.current,
      power: 55 + Math.random() * 35,
    });
  }

  function shoot() {
    const ph = phaseRef.current;
    if (ph === "result" || ph === "flying" || ph === "keeper" || doneRef.current) return;
    const team = turnRef.current;
    const keeperDefense = (team === "H" ? away.stats.defense : home.stats.defense) ?? 60;
    const shooterZone = aimZoneRef.current;
    const keeperZone = guessKeeperZone(shooterZone, keeperDefense);
    resolveKick({ team, shooterZone, keeperZone, power: powerRef.current });
  }

  function resolveKick(args: { team: "H" | "A"; shooterZone: Zone; keeperZone: Zone; power: number }) {
    const { team, shooterZone, keeperZone, power: shotPower } = args;
    const zonesMatch = shooterZone === keeperZone;
    const res = resolveDuel(shotPower, zonesMatch);
    const decisive = checkDecisive(shotsRef.current, team);
    const shot: Shot = { team, zone: shooterZone, keeperZone, goal: res.goal, missedTarget: res.missedTarget, decisive };

    const from = { x: CW / 2, y: CH - 70 };
    const to = res.missedTarget
      ? { x: zonePos(shooterZone).x + (Math.random() > 0.5 ? 90 : -90), y: zonePos(shooterZone).y - 60 }
      : zonePos(shooterZone);
    animRef.current = { t: 0, from, to, keeperTo: zonePos(keeperZone) };

    setIsDecisive(decisive);
    setPhase("flying");
    powerRef.current = 0; setPower(0);

    setTimeout(() => {
      const next = [...shotsRef.current, shot];
      setShots(next);
      setLastResult(shot);
      setComment(pickComment(shot));
      setPhase("result");
      // Audio del relator según lo que pasó realmente. El audio "decisivo" sólo
      // suena si este penal efectivamente definió al ganador de la tanda.
      const definedNow = decisive && computeFinished(next);
      playPenalAudio(definedNow ? "decisive" : shot.goal ? "goal" : "save");
      evaluateEnd(next);
    }, 620);

  }

  function pickComment(shot: Shot) {
    const pool = shot.missedTarget ? MISS_COMMENTS : shot.goal ? GOAL_COMMENTS : SAVE_COMMENTS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ¿Es decisivo? Simula el resultado hipotético (gol o no) del PRÓXIMO tiro de `team`
  // y ve si con cualquiera de los dos desenlaces ya se definiría el ganador.
  function checkDecisive(current: Shot[], team: "H" | "A"): boolean {
    const withGoal = computeFinished([...current, { team, zone: 2, keeperZone: null, goal: true, missedTarget: false, decisive: false }]);
    const withMiss = computeFinished([...current, { team, zone: 2, keeperZone: null, goal: false, missedTarget: false, decisive: false }]);
    return withGoal || withMiss;
  }

  function computeFinished(next: Shot[]): boolean {
    const nh = next.filter(s => s.team === "H");
    const na = next.filter(s => s.team === "A");
    const hs = nh.filter(s => s.goal).length;
    const as = na.filter(s => s.goal).length;
    const round = Math.max(nh.length, na.length);
    const both = nh.length === na.length;
    if (round <= 5) {
      const hRemaining = 5 - nh.length, aRemaining = 5 - na.length;
      if (both && Math.abs(hs - as) > hRemaining && Math.abs(hs - as) > aRemaining) return true;
      if (!both && Math.abs(hs - as) > Math.min(hRemaining, aRemaining)) return true;
      if (both && nh.length === 5 && hs !== as) return true;
      return false;
    }
    return both && hs !== as;
  }

  function evaluateEnd(next: Shot[]) {
    const nh = next.filter(s => s.team === "H");
    const na = next.filter(s => s.team === "A");
    const hs = nh.filter(s => s.goal).length;
    const as = na.filter(s => s.goal).length;
    const finished = computeFinished(next);

    if (finished) {
      setTimeout(() => {
        setDone(true);
        setTimeout(() => onEnd(hs > as ? "H" : "A", hs, as), 1400);
      }, 900);
    } else {
      const nextTurn = turnRef.current === "H" ? "A" : "H";
      setTimeout(() => {
        setTurn(nextTurn);
        setAimZone(2);
        setComment(null);
        setIsDecisive(false);
        setPhase("aim");
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
      sky.addColorStop(0, "#050a18"); sky.addColorStop(1, "#173463");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);

      // Reflectores con forma de cono (no solo un halo difuso)
      [{ x: CW * 0.08, rot: 14 }, { x: CW * 0.92, rot: -14 }].forEach(({ x: lx, rot }) => {
        ctx.save();
        ctx.translate(lx, -6);
        ctx.rotate((rot * Math.PI) / 180);
        const cone = ctx.createLinearGradient(0, 0, 0, 260);
        cone.addColorStop(0, "rgba(255,250,215,0.4)");
        cone.addColorStop(1, "rgba(255,250,215,0)");
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(95, 260); ctx.lineTo(-95, 260);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.beginPath(); ctx.arc(lx, -6, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#fffbe6"; ctx.shadowColor = "#fffbe6"; ctx.shadowBlur = 18; ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Tribuna (colores fijos, no titilan) + franja de publicidad
      crowdRef.current!.forEach(d => {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = d.color;
        ctx.beginPath(); ctx.arc(d.x, d.y, 3, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Pared de estadio: cierra el hueco entre la tribuna y la cancha (antes quedaba vacío)
      const wallTop = 78, wallBottom = CH - 92;
      const wallGrad = ctx.createLinearGradient(0, wallTop, 0, wallBottom);
      wallGrad.addColorStop(0, "#0a1428"); wallGrad.addColorStop(1, "#132a4d");
      ctx.fillStyle = wallGrad; ctx.fillRect(0, wallTop, CW, wallBottom - wallTop);
      ctx.fillStyle = "rgba(140,180,255,0.06)";
      for (let x = 8; x < CW; x += 40) ctx.fillRect(x, wallTop + 10, 24, wallBottom - wallTop - 20);

      // Valla publicitaria pegada a la cancha, con los colores de ambos equipos
      ctx.fillStyle = "#0d1f14"; ctx.fillRect(0, CH - 100, CW, 18);
      const stripe = 90;
      for (let x = -((Date.now() / 30) % (stripe * 2)); x < CW; x += stripe * 2) {
        ctx.fillStyle = home.primary; ctx.fillRect(x, CH - 100, stripe, 18);
        ctx.fillStyle = away.primary; ctx.fillRect(x + stripe, CH - 100, stripe, 18);
      }

      // Césped
      ctx.fillStyle = "#2f8c43"; ctx.fillRect(0, CH - 82, CW, 82);
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2;
      ctx.strokeRect(GOAL_X - 60, CH - 82, GOAL_W + 120, 52);
      // Arco: red + marco
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
      for (let y = GOAL_Y; y < GOAL_Y + GOAL_H; y += 10) { ctx.beginPath(); ctx.moveTo(GOAL_X, y); ctx.lineTo(GOAL_X + GOAL_W, y); ctx.stroke(); }
      for (let x = GOAL_X; x < GOAL_X + GOAL_W; x += 10) { ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_H); ctx.stroke(); }
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 6;
      ctx.strokeRect(GOAL_X, GOAL_Y, GOAL_W, GOAL_H);

      // Zonas: de apunte (pateando) o de salto (atajando)
      if (phase === "aim" || phase === "charging" || phase === "keeper") {
        ZONES.forEach(z => {
          const { x, y } = zonePos(z);
          const active = z === aimZone;
          ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2);
          const color = phase === "keeper" ? "56,189,248" : "56,189,248";
          ctx.fillStyle = active ? `rgba(${color},0.28)` : `rgba(${color},0.08)`;
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
      const keeperTargetZone = phase === "keeper" ? aimZone : undefined;
      const keeperRestPos = { x: CW / 2, y: GOAL_Y + GOAL_H * 0.72 };
      const keeperPos = phase === "flying" || phase === "result"
        ? lerpPos(keeperRestPos, animRef.current?.keeperTo ?? keeperRestPos, phase === "result" ? 1 : easeT(animRef.current?.t ?? 0))
        : phase === "keeper" && keeperTargetZone
        ? lerpPos(keeperRestPos, zonePos(keeperTargetZone), 0.35)
        : keeperRestPos;
      // En modo arquero, el que "ataja" ahora es el usuario controlando al equipo `keeper`
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

      // Viñeta: oscurece bordes para dar profundidad, igual que en el motor principal
      const vig = ctx.createRadialGradient(CW / 2, CH * 0.55, CH * 0.25, CW / 2, CH * 0.55, CW * 0.62);
      vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH);

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
          {isDecisive && (phase === "aim" || phase === "charging" || phase === "keeper") && (
            <div className="text-center mb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-destructive/20 border border-destructive/50 text-destructive font-display tracking-widest text-xs animate-pulse">
                {DECISIVE_PRE[Math.floor((shots.length) % DECISIVE_PRE.length)]}
              </span>
            </div>
          )}

          <div className="text-center text-sm mb-2">
            {phase === "keeper" ? (
              <>
                <span className="inline-block px-3 py-1 rounded-full bg-destructive/15 border border-destructive/40 text-destructive font-display tracking-wide text-xs mb-1">
                  ¡SOS EL ARQUERO!
                </span>
                <div>
                  Patea <span className="font-display text-base text-celeste">{away.name}</span> · elegí a qué palo tirarte
                </div>
              </>
            ) : (
              <>
                <span className="inline-block px-3 py-1 rounded-full bg-celeste/15 border border-celeste/40 text-celeste font-display tracking-wide text-xs mb-1">
                  PATEA AHORA · {turn === "H" ? "LOCAL" : "VISITANTE"}
                </span>
                <div>
                  Patea <span className="font-display text-base text-celeste">{shooter.name}</span> · ataja <span className="text-muted-foreground">{keeper.short}</span>
                </div>
              </>
            )}
          </div>

          <div className="mx-auto max-w-2xl rounded-xl overflow-hidden border-2 border-white/10 bg-black">
            <canvas ref={canvasRef} width={CW} height={CH} className="w-full h-auto block" />
          </div>

          {phase === "result" && lastResult && comment && (
            <div className={`text-center font-display mt-2 ${lastResult.decisive ? "text-3xl" : "text-xl"} ${lastResult.goal ? "text-celeste" : "text-destructive"}`}>
              {comment}
            </div>
          )}

          {(phase === "aim" || phase === "charging") && (
            <>
              <div className="mx-auto max-w-2xl mt-3">
                <div className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-1">Potencia del tiro</div>
                <div className="h-5 rounded-full bg-white/10 overflow-hidden border border-white/10">
                  <div
                    className="h-full transition-[width] duration-100 ease-linear"
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
                  onTouchStart={(e) => { e.preventDefault(); if (!chargingRef.current) { chargingRef.current = true; setPhase("charging"); } }}
                  onTouchEnd={(e) => { e.preventDefault(); if (chargingRef.current) { chargingRef.current = false; shoot(); } }}
                  className="px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider active:scale-95">
                  MANTENÉ PARA CARGAR
                </button>
              </div>
            </>
          )}

          {phase === "keeper" && (
            <>
              <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-muted-foreground">
                <span><kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border">1-6</kbd> o flechas: elegir palo</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border">ESPACIO</kbd>: tirarte</span>
              </div>
              <div className="flex justify-center gap-2 mt-3 sm:hidden">
                {ZONES.map(z => (
                  <button key={z} onClick={() => setAimZone(z)}
                    className={`w-9 h-9 rounded-full border text-sm font-display ${aimZone === z ? "bg-destructive/30 border-destructive text-destructive" : "border-border"}`}>
                    {z}
                  </button>
                ))}
              </div>
              <div className="flex justify-center mt-2 sm:hidden">
                <button onClick={confirmDive}
                  className="px-6 py-3 rounded-xl bg-destructive text-white font-display tracking-wider active:scale-95">
                  TIRARSE
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
