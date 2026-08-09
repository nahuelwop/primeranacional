import { useEffect, useMemo, useRef, useState } from "react";
import { Shield } from "@/components/Shield";
import { Team, type Narrator } from "@/data/teams";
import { supabase } from "@/integrations/supabase/client";

export type Weather = "clear" | "rain" | "wind" | "thunder" | "fog";
export type Difficulty = "easy" | "normal" | "hard" | "expert";
export type Mode = "1v1" | "1vAI";

type Props = {
  home: Team;
  away: Team;
  duration?: number;
  weather?: Weather;
  aiDifficulty?: Difficulty;
  mode?: Mode;
  sharedNarrator?: boolean;
  crowdIntensity?: "normal" | "clasico" | "ascenso";
  matchLabel?: string;
  startingScore?: { h: number; a: number };
  cancelOpponentGoals?: number;   // # de goles rivales a anular (Infinity = todos)
  doubleGoalChance?: number;      // 0..1 · probabilidad de que un gol propio cuente doble
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
export function Game({ home, away, duration = 60, weather = "clear", aiDifficulty = "normal", mode = "1vAI", sharedNarrator = false, crowdIntensity = "normal", matchLabel, startingScore, cancelOpponentGoals = 0, doubleGoalChance = 0, onEnd }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ h: startingScore?.h ?? 0, a: startingScore?.a ?? 0 });
  const [time, setTime] = useState(duration);
  const [stats, setStats] = useState<MatchStats>({ possessionH: 50, shotsH: 0, shotsA: 0, onTargetH: 0, onTargetA: 0, savesH: 0, savesA: 0 });
  const [replayActive, setReplayActive] = useState(false);
  const [varMsg, setVarMsg] = useState<string | null>(null);
  const stateRef = useRef({ h: startingScore?.h ?? 0, a: startingScore?.a ?? 0, posH: 0, posA: 0, shotsH: 0, shotsA: 0, otH: 0, otA: 0, savH: 0, savA: 0 });
  const overRef = useRef(false);
  const pauseClockRef = useRef(false);

  // Audio: relato + hinchada (volumen ajustable en vivo, refs evitan stale closures)
  const [narratorVol, setNarratorVol] = useState(0.9);
  const [crowdVol, setCrowdVol] = useState(0.35);
  const narratorVolRef = useRef(narratorVol);
  const crowdVolRef = useRef(crowdVol);
  const narratorRef = useRef<HTMLAudioElement | null>(null);
  const crowdRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { narratorVolRef.current = narratorVol; if (narratorRef.current) narratorRef.current.volume = narratorVol; }, [narratorVol]);
  useEffect(() => { crowdVolRef.current = crowdVol; if (crowdRef.current) crowdRef.current.volume = crowdVol; }, [crowdVol]);

  // Relatores globales (Admin → Relatores): se ofrecen en cualquier partido, sin depender del equipo.
  const [globalNarrators, setGlobalNarrators] = useState<Narrator[]>([]);
  useEffect(() => {
    let active = true;
    (supabase.from("global_narrators" as any) as any).select("*").order("sort_order", { ascending: true }).then(({ data }: { data: any }) => {
      if (active && data) setGlobalNarrators(data.map((n: any) => ({ id: n.id, name: n.name, urls: n.urls ?? [] })));
    });
    return () => { active = false; };
  }, []);

  // Relator seleccionado por equipo (id del narrador). null = elegir al azar de todos.
  const homeNarrators = useMemo<Narrator[]>(() => {
    const list = [...(home.narrators ?? []), ...globalNarrators];
    if (list.length > 0) return list;
    if ((home.goalAudios ?? []).length > 0) return [{ id: "__legacy", name: "Default", urls: home.goalAudios! }];
    return [];
  }, [home, globalNarrators]);
  const awayNarrators = useMemo<Narrator[]>(() => {
    const list = [...(away.narrators ?? []), ...globalNarrators];
    if (list.length > 0) return list;
    if ((away.goalAudios ?? []).length > 0) return [{ id: "__legacy", name: "Default", urls: away.goalAudios! }];
    return [];
  }, [away, globalNarrators]);
  const [homeNarratorId, setHomeNarratorId] = useState<string>(() => homeNarrators[0]?.id ?? "");
  const [awayNarratorId, setAwayNarratorId] = useState<string>(() => awayNarrators[0]?.id ?? "");
  useEffect(() => { setHomeNarratorId(homeNarrators[0]?.id ?? ""); }, [homeNarrators]);
  useEffect(() => { setAwayNarratorId(awayNarrators[0]?.id ?? ""); }, [awayNarrators]);
  const homeNarratorRef = useRef(homeNarratorId);
  const awayNarratorRef = useRef(awayNarratorId);
  useEffect(() => { homeNarratorRef.current = homeNarratorId; }, [homeNarratorId]);
  useEffect(() => { awayNarratorRef.current = awayNarratorId; }, [awayNarratorId]);
  const homeNarratorsRef = useRef<Narrator[]>(homeNarrators);
  const awayNarratorsRef = useRef<Narrator[]>(awayNarrators);
  useEffect(() => { homeNarratorsRef.current = homeNarrators; }, [homeNarrators]);
  useEffect(() => { awayNarratorsRef.current = awayNarrators; }, [awayNarrators]);

  // Relator compartido (amistoso 1v1): un solo relator narra ambos equipos.
  // Opciones = nombres únicos presentes en alguno de los dos equipos.
  const sharedOptions = useMemo<{ name: string }[]>(() => {
    if (!sharedNarrator) return [];
    const names = new Set<string>();
    [...homeNarrators, ...awayNarrators].forEach(n => names.add(n.name));
    return Array.from(names).map(name => ({ name }));
  }, [sharedNarrator, homeNarrators, awayNarrators]);
  const [sharedName, setSharedName] = useState<string>(() => sharedOptions[0]?.name ?? "");
  useEffect(() => { setSharedName(sharedOptions[0]?.name ?? ""); }, [sharedOptions]);
  const sharedNameRef = useRef(sharedName);
  useEffect(() => { sharedNameRef.current = sharedName; }, [sharedName]);

  useEffect(() => {
    overRef.current = false;
    const initH = startingScore?.h ?? 0;
    const initA = startingScore?.a ?? 0;
    stateRef.current = { h: initH, a: initA, posH: 0, posA: 0, shotsH: 0, shotsA: 0, otH: 0, otA: 0, savH: 0, savA: 0 };
    setScore({ h: initH, a: initA });
    setTime(duration);
    setStats({ possessionH: 50, shotsH: 0, shotsA: 0, onTargetH: 0, onTargetA: 0, savesH: 0, savesA: 0 });

    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    // Espacio lógico de juego (todas las coordenadas de física/dibujo siguen usando estos valores)
    const W = 1400, H = 520;
    // Renderizar en la resolución real de pantalla (evita el borroneo en pantallas HiDPI/Retina,
    // que pasaba porque el canvas se estiraba con CSS sin ajustar por devicePixelRatio)
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const displayW = rect.width || W;
    const displayH = rect.height || H;
    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale((displayW / W) * dpr, (displayH / H) * dpr);
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


    // Configuración por dificultad
    // jumpCd en frames (60fps): 48 = 0.8s, 72 = 1.2s
    const aiCfg = {
      easy:   { speed: 0.55, jumpProb: 0.35, kickProb: 0.20, react: 40, jumpCd: 90, smart: 0.35 },
      normal: { speed: 0.85, jumpProb: 0.55, kickProb: 0.50, react: 20, jumpCd: 66, smart: 0.60 },
      hard:   { speed: 1.00, jumpProb: 0.70, kickProb: 0.72, react: 10, jumpCd: 60, smart: 0.85 },
      expert: { speed: 1.12, jumpProb: 0.80, kickProb: 0.85, react: 6,  jumpCd: 54, smart: 1.00 },
    }[aiDifficulty] ?? { speed: 0.85, jumpProb: 0.55, kickProb: 0.50, react: 20, jumpCd: 66, smart: 0.6 };
    let frame = 0;
    let aiJumpCd = 0;
    let aiAirborne = false; // true entre despegue y aterrizaje
    let aiLastKickFrame = -999;
    let goalsCancelLeft = Number.isFinite(cancelOpponentGoals) ? Math.max(0, cancelOpponentGoals) : 999;

    // ===== Replay de gol: ring buffer de los últimos ~2.5s =====
    type Snap = { bx:number; by:number; bs:number; p1x:number; p1y:number; p1k:number; p1v:number; p2x:number; p2y:number; p2k:number; p2v:number };
    const history: Snap[] = [];
    const HISTORY_MAX = 150;
    let replay: { frames: Snap[]; idx: number; color: string; scorer: "home"|"away" } | null = null;
    let pendingResetDir = 0;
    // ===== Red que se agita al recibir un gol =====
    // side: qué arco tiembla · age: frames desde el impacto (crece en draw(), no en update(),
    // para que la animación siga aunque el replay esté congelando la física del resto de la escena)
    let netWave: { side: "L" | "R"; age: number; entryPos: number } | null = null;
    const NET_WAVE_FRAMES = 75; // ~1.25s @ 60fps

    // ===== Papelitos al inicio (primeros 3 segundos) =====
    const confetti: { x:number; y:number; vx:number; vy:number; w:number; h:number; color:string; rot:number; vr:number; sway:number }[] = [];
    const confettiColors = [home.primary, home.secondary, away.primary, away.secondary, "#ffffff", "#ffe066"];
    let confettiTimer = 180; // 3s @ 60fps

    // ===== Recibimiento de clásico: bengalas + humo + banner, con el partido pausado =====
    const isClasico = crowdIntensity === "clasico";
    let recibimientoTimer = isClasico ? 320 : 0; // ~5.3s @ 60fps, más largo para que entre el caos
    if (isClasico) pauseClockRef.current = true;
    type Smoke = { x: number; y: number; vy: number; r: number; color: string; alpha: number };
    const smoke: Smoke[] = [];
    type Spark = { x: number; y: number; vx: number; vy: number; color: string; life: number };
    const sparks: Spark[] = [];
    // Bengalas repartidas por TODA la tribuna, sostenidas por la gente (dentro del público)
    const flareSources = Array.from({ length: 10 }, (_, i) => ({
      x: (W / 11) * (i + 1),
      y: i % 2 === 0 ? 300 : 210,
      color: i % 3 === 0 ? "#ffffff" : (i % 2 === 0 ? home.primary : away.primary),
    }));
    const spawnSmoke = () => {
      flareSources.forEach(src => {
        for (let i = 0; i < 4; i++) {
          smoke.push({
            x: src.x + (Math.random() - 0.5) * 26,
            y: src.y - 4 + Math.random() * 10,
            vy: -0.7 - Math.random() * 0.7,
            r: 14 + Math.random() * 14,
            color: src.color,
            alpha: 0.5,
          });
        }
        // Chispas saliendo de cada bengala
        for (let i = 0; i < 3; i++) {
          sparks.push({
            x: src.x, y: src.y,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 2 - 1,
            color: src.color,
            life: 30 + Math.random() * 20,
          });
        }
      });
    };



    // Relato: en cada gol. Si llega otro, corta el anterior.
    const pickAudio = (urls?: string[]) => {
      if (!urls || urls.length === 0) return null;
      return urls[Math.floor(Math.random() * urls.length)];
    };
    const playGoalAudio = (team: Team, side: "home" | "away") => {
      const homeList = homeNarratorsRef.current;
      const awayList = awayNarratorsRef.current;
      let urls: string[] | undefined;
      if (sharedNarrator) {
        const name = sharedNameRef.current;
        urls = [...homeList, ...awayList].filter(n => n.name === name).flatMap(n => n.urls ?? []);
        if (urls.length === 0) urls = [...homeList, ...awayList].flatMap(n => n.urls ?? []);
      } else {
        const list = side === "home" ? homeList : awayList;
        const selId = side === "home" ? homeNarratorRef.current : awayNarratorRef.current;
        const chosen = list.find(n => n.id === selId && (n.urls ?? []).length > 0)
          ?? list.find(n => (n.urls ?? []).length > 0);
        urls = chosen?.urls ?? list.flatMap(n => n.urls ?? []);
      }
      const url = pickAudio(urls);
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
      { team: home, until: duration / 2 }, // primera mitad
      { team: away, until: 0 },             // segunda mitad
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
    const palette = ["#7ec8ff", "#ffffff", "#ffe066", "#ff6b6b", "#9bd1ff", "#f0f0f0", home.primary, away.primary];
    const rows = crowdIntensity === "ascenso" ? 6 : crowdIntensity === "clasico" ? 5 : 4;
    const spacing = crowdIntensity === "normal" ? 14 : 10;
    for (let row = 0; row < rows; row++) {
      for (let i = 0; i < W / spacing; i++) {
        crowd.push({
          x: i * spacing + (row % 2) * (spacing / 2),
          y: 30 + row * 15,
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

      // === Replay activo: reproducir snapshots, no avanzar físicas ===
      if (replay) {
        const snap = replay.frames[replay.idx];
        if (snap) {
          ball.x = snap.bx; ball.y = snap.by; ball.spin = snap.bs;
          p1.x = snap.p1x; p1.y = snap.p1y; p1.kick = snap.p1k; p1.vx = snap.p1v;
          p2.x = snap.p2x; p2.y = snap.p2y; p2.kick = snap.p2k; p2.vx = snap.p2v;
        }
        // Seguimos animando el festejo (partículas del gol) aunque la física esté
        // pausada; si no, quedaban congeladas como un bloque sólido pegado en el arco.
        for (let i = particles.length - 1; i >= 0; i--) {
          const pt = particles[i];
          pt.vy += 0.2; pt.x += pt.vx; pt.y += pt.vy; pt.life--;
          if (pt.life <= 0) particles.splice(i, 1);
        }
        replay.idx++;
        if (replay.idx >= replay.frames.length) {
          replay = null;
          pauseClockRef.current = false;
          setReplayActive(false);
          resetBall(pendingResetDir);
        }
        return;
      }

      // === Recibimiento de clásico: bengalas + humo, partido congelado ===
      let shakeX = 0, shakeY = 0;
      if (recibimientoTimer > 0) {
        recibimientoTimer--;
        if (recibimientoTimer % 7 === 0) spawnSmoke();
        for (let i = smoke.length - 1; i >= 0; i--) {
          const s = smoke[i];
          s.y += s.vy; s.r += 0.15; s.alpha -= 0.003;
          if (s.alpha <= 0) smoke.splice(i, 1);
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const sp = sparks[i];
          sp.vy += 0.05; sp.x += sp.vx; sp.y += sp.vy; sp.life--;
          if (sp.life <= 0) sparks.splice(i, 1);
        }
        // Temblor de cámara: fuerte al principio, se calma hacia el final
        const shakeIntensity = recibimientoTimer > 260 ? 5 : recibimientoTimer > 60 ? 2 : 0;
        shakeX = (Math.random() - 0.5) * shakeIntensity;
        shakeY = (Math.random() - 0.5) * shakeIntensity;
        if (recibimientoTimer === 0) {
          pauseClockRef.current = false;
        } else {
          ctx.save();
          ctx.translate(shakeX, shakeY);
          draw();
          ctx.restore();
          return; // no avanza física ni IA mientras dura el recibimiento
        }
      }

      // === Papelitos al inicio ===
      if (confettiTimer > 0) {
        confettiTimer--;
        for (let i = 0; i < 6; i++) {
          confetti.push({
            x: Math.random() * W,
            y: -10,
            vx: (Math.random() - 0.5) * 2,
            vy: 1 + Math.random() * 2,
            w: 4 + Math.random() * 4,
            h: 8 + Math.random() * 6,
            color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.2,
            sway: Math.random() * Math.PI * 2,
          });
        }
      }
      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.sway += 0.05;
        c.x += c.vx + Math.sin(c.sway) * 0.8;
        c.y += c.vy;
        c.rot += c.vr;
        if (c.y > H + 20) confetti.splice(i, 1);
      }


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
        // ============ IA reescrita (decisiones sobre acciones) ============
        if (aiJumpCd > 0) aiJumpCd--;
        // detectar aterrizaje: si vuelve al suelo, ya puede considerar saltar de nuevo
        if (aiAirborne && p2.y >= ground) aiAirborne = false;

        const sp2 = speedScale(away.stats.speed) * aiCfg.speed;
        // arco propio (derecha, W) vs arco rival (izquierda, 0)
        const ownGoalX = W - 10;
        const rivalGoalX = 10;
        // Predicción con react más baja => IA "ve" antes en Hard/Expert
        const predictedX = ball.x + ball.vx * aiCfg.react;
        const predictedY = ball.y + ball.vy * aiCfg.react;

        // Decidir modo: DEFENDER si la pelota va a mi arco; ATACAR si va al rival
        const ballGoingToOwnGoal = ball.vx > 0.5;
        const ballBehindMe = ball.x > p2.x + 30; // pelota entre yo y mi arco
        const mustDefend = ballGoingToOwnGoal || ballBehindMe;

        // Posición objetivo:
        // - Defender: pararse entre la pelota y el arco propio
        // - Atacar: acercarse a la pelota por detrás para pegarle hacia el arco rival
        let targetX: number;
        if (mustDefend) {
          const defendX = (predictedX + ownGoalX) / 2 - 20;
          targetX = defendX;
        } else {
          // ubicarse a la derecha de la pelota para empujarla hacia la izquierda
          const attackOffset = 22 + (1 - aiCfg.smart) * 15;
          targetX = predictedX + attackOffset;
        }
        targetX = Math.max(p2.r, Math.min(W - p2.r, targetX));

        // Movimiento con banda muerta para no oscilar
        const dead = 12;
        const dx = targetX - p2.x;
        if (Math.abs(dx) > dead) p2.vx = dx > 0 ? sp2 : -sp2;
        else p2.vx *= 0.7;

        // ===== Salto: sólo cuando es realmente útil =====
        // Reglas:
        //  1) Cooldown terminado (0.8s+ Hard, 0.9s Expert)
        //  2) IA en el piso Y no está "en el aire" desde el salto anterior
        //  3) Pelota alta, cercana, descendiendo y va a caer donde estoy
        const ballHigh = ball.y < ground - 110;
        const ballDescending = ball.vy > 0.3;
        const landingClose = Math.abs(predictedX - p2.x) < 55;
        const ballCloseX = Math.abs(ball.x - p2.x) < 65;
        const usefulHeader = mustDefend
          ? true                                   // defender de cabeza siempre útil
          : predictedY < ground - 60 && ballHigh;  // atacar sólo si aún estará arriba
        const wantsToJump =
          aiJumpCd === 0 && !aiAirborne && p2.y >= ground &&
          ballHigh && ballDescending && landingClose && ballCloseX && usefulHeader;
        if (wantsToJump && Math.random() < aiCfg.jumpProb) {
          p2.vy = jumpScale(away.stats.jump);
          aiJumpCd = aiCfg.jumpCd;
          aiAirborne = true;
        }

        // ===== Patear: al alcance y con dirección aprovechable =====
        const inKickRange = Math.abs(p2.x - ball.x) < 55 && Math.abs(p2.y - ball.y) < 55;
        // Sólo patear si puede darle hacia el arco rival (pelota a la izquierda del bicho o mismo x)
        const canDriveForward = ball.x <= p2.x + 10;
        const kickCd = frame - aiLastKickFrame > 8;
        if (inKickRange && kickCd && (canDriveForward || mustDefend) && Math.random() < aiCfg.kickProb) {
          p2.kick = 10;
          aiLastKickFrame = frame;
        }

        // Micro-pausas naturales sólo en Easy/Normal si está lejos
        if (aiCfg.smart < 0.8 && Math.abs(ball.x - p2.x) > 220 && Math.random() < 0.02) p2.vx *= 0.4;
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
      // Gravedad extra cuando está muy alta (por encima del travesaño): sin esto,
      // con la gravedad base la pelota tarda una eternidad en bajar de esa altura
      // y además rebota sobre el caño en vez de caer. Cuanto más alta, más tira.
      if (ball.y < crossbarY - 6) {
        const overshoot = Math.min(1, (crossbarY - 6 - ball.y) / 140);
        ball.vy += 0.30 * overshoot;
      }
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
          // desde arriba: rebote débil y con empuje lateral, para que la pelota
          // se corra del caño en vez de quedar picando en el mismo punto
          if (ball.y + ball.r > crossbarY && ball.y < crossbarY) {
            ball.y = crossbarY - ball.r;
            ball.vy = -Math.abs(ball.vy) * 0.25;
            ball.vx = ball.vx * 0.9 + (ball.vx >= 0 ? 0.6 : -0.6);
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
          // Antes un cabezazo "pasivo" (sin apretar patear) casi no impulsaba la
          // pelota (kickBoost fijo en 1.2) y se sentía al azar. Ahora tiene fuerza
          // decente siempre, y más si venís saltando/corriendo hacia la pelota.
          const jumping = p.vy < -1;
          const passiveBoost = 2.6 + power * 0.6 + (jumping ? 1.4 : 0) + Math.min(1.5, Math.abs(p.vx) * 0.3);
          const kickBoost = p.kick > 0 ? 4 + power : passiveBoost;
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
      const triggerReplay = (dir: number, color: string, scorer: "home"|"away") => {
        replay = { frames: history.slice(), idx: 0, color, scorer };
        pendingResetDir = dir;
        pauseClockRef.current = true;
        setReplayActive(true);
        netWave = { side: dir === 1 ? "R" : "L", age: 0, entryPos: ball.y };
      };
      if (ball.x + ball.r < lpx && ball.y > crossbarY + 2) {
        // Gol del rival (away) — puede anularse por corrupción
        if (goalsCancelLeft > 0) {
          goalsCancelLeft--;
          setVarMsg("GOL ANULADO POR EL VAR 🤨");
          setTimeout(() => setVarMsg(null), 1800);
          resetBall(1);
        } else {
          stateRef.current.a++;
          stateRef.current.otA++;
          setScore({ h: stateRef.current.h, a: stateRef.current.a });
          spawnGoal(ball.x, ball.y, away.primary);
          playGoalAudio(away, "away");
          triggerReplay(-1, away.primary, "away");
        }
      } else if (ball.x - ball.r > rpx && ball.y > crossbarY + 2) {
        // Gol propio (home) — puede contar doble
        const bonus = Math.random() < doubleGoalChance ? 2 : 1;
        stateRef.current.h += bonus;
        stateRef.current.otH++;
        setScore({ h: stateRef.current.h, a: stateRef.current.a });
        spawnGoal(ball.x, ball.y, home.primary);
        if (bonus === 2) { setVarMsg("¡GOL DOBLE! 🎩"); setTimeout(() => setVarMsg(null), 1800); }
        playGoalAudio(home, "home");
        triggerReplay(1, home.primary, "home");
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

      // Guardar snapshot al ring buffer
      history.push({
        bx: ball.x, by: ball.y, bs: ball.spin,
        p1x: p1.x, p1y: p1.y, p1k: p1.kick, p1v: p1.vx,
        p2x: p2.x, p2y: p2.y, p2k: p2.kick, p2v: p2.vx,
      });
      if (history.length > HISTORY_MAX) history.shift();

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
      // Cielo nocturno con halos de focos
      const sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, "#070d20");
      sky.addColorStop(0.5, "#163d7a");
      sky.addColorStop(1, "#2f7fc7");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, ground);

      // Halos de iluminación (4 torres)
      const towers = [W * 0.08, W * 0.32, W * 0.68, W * 0.92];
      towers.forEach(tx => {
        const grad = ctx.createRadialGradient(tx, 20, 5, tx, 20, 240);
        grad.addColorStop(0, "rgba(255,250,210,0.45)");
        grad.addColorStop(1, "rgba(255,250,210,0)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(tx, 20, 240, 0, Math.PI * 2); ctx.fill();
      });

      // Techo del estadio (silueta)
      ctx.fillStyle = "#06101f";
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 40);
      for (let x = W; x >= 0; x -= 60) {
        ctx.lineTo(x, 40 + Math.sin(x * 0.02) * 6);
      }
      ctx.lineTo(0, 40); ctx.closePath(); ctx.fill();

      // Tribunas: 2 niveles separados por una platea VIP
      // Nivel alto
      ctx.fillStyle = "#0b1730";
      ctx.fillRect(0, 40, W, 70);
      // Platea VIP (cabinas)
      ctx.fillStyle = "#1a253f";
      ctx.fillRect(0, 108, W, 14);
      for (let x = 0; x < W; x += 28) {
        ctx.fillStyle = "rgba(255,220,120,0.4)";
        ctx.fillRect(x + 4, 112, 18, 7);
      }
      // Nivel bajo
      ctx.fillStyle = "#0d1a36";
      ctx.fillRect(0, 122, W, 50);

      // Pared perimetral del estadio (cierra el hueco vacío entre la tribuna y la cancha)
      const wallTop = 172;
      const wallBottom = ground - 22; // termina justo donde arranca la valla LED
      const wallGrad = ctx.createLinearGradient(0, wallTop, 0, wallBottom);
      wallGrad.addColorStop(0, "#0a1428");
      wallGrad.addColorStop(1, "#152848");
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, wallTop, W, wallBottom - wallTop);

      // Franja de "vidrios"/palcos a media altura de la pared, para que no quede lisa
      ctx.fillStyle = "rgba(140,180,255,0.08)";
      for (let x = 10; x < W; x += 46) {
        ctx.fillRect(x, wallTop + 14, 28, wallBottom - wallTop - 28);
      }
      // Línea de sombra al ras del piso (contacto pared-cancha)
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, wallBottom - 10, W, 10);

      // Hinchada (puntitos por toda la tribuna)
      crowd.forEach(c => {
        const y = c.y + Math.sin(c.bob) * 1.5;
        ctx.fillStyle = c.c;
        ctx.beginPath(); ctx.arc(c.x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      });

      // Banderas de los hinchas (más cantidad y ondulación según intensidad)
      const flagCount = crowdIntensity === "ascenso" ? 26 : crowdIntensity === "clasico" ? 20 : 14;
      for (let i = 0; i < flagCount; i++) {
        const fx = (i * W / flagCount) + (Date.now() / 200 % 30);
        const sway = Math.sin(Date.now() / 350 + i * 0.7) * 6;
        const fy = 70 + (i % 3) * 8 + sway;
        const useHome = i % 2 === 0;
        ctx.fillStyle = useHome ? home.primary : away.primary;
        ctx.fillRect(fx, fy, 24, 15);
        ctx.fillStyle = useHome ? home.secondary : away.secondary;
        ctx.fillRect(fx, fy + 5, 24, 5);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(fx - 1, fy, 2, 34);
      }
      // Papelitos/humo en partidos calientes (clásicos y ascensos)
      if (crowdIntensity !== "normal") {
        const t = Date.now() / 1000;
        for (let i = 0; i < 40; i++) {
          const x = (i * 41 + (t * 20) % W) % W;
          const y = 40 + ((i * 13 + t * 30) % 130);
          const col = i % 3 === 0 ? home.primary : i % 3 === 1 ? away.primary : "#ffffff";
          ctx.fillStyle = col;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(x, y, 3, 6);
        }
        ctx.globalAlpha = 1;
      }

      // Torres de luz (mástiles)
      towers.forEach(tx => {
        ctx.fillStyle = "#1a1f2e";
        ctx.fillRect(tx - 3, 0, 6, 50);
        ctx.fillStyle = "#2a3146";
        ctx.fillRect(tx - 18, 0, 36, 14);
        // Bombillas
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = "#fff8c0";
          ctx.beginPath(); ctx.arc(tx - 14 + i * 6, 7, 2.2, 0, Math.PI * 2); ctx.fill();
        }
      });

      // Marcador LED gigante (centro arriba)
      ctx.fillStyle = "#000";
      ctx.fillRect(W / 2 - 70, 6, 140, 30);
      ctx.strokeStyle = "#2a3146"; ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - 70, 6, 140, 30);
      ctx.fillStyle = home.primary;
      ctx.fillRect(W / 2 - 66, 10, 6, 22);
      ctx.fillStyle = away.primary;
      ctx.fillRect(W / 2 + 60, 10, 6, 22);
      ctx.fillStyle = "#ff5630";
      ctx.font = "bold 18px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${stateRef.current.h} - ${stateRef.current.a}`, W / 2, 26);
      ctx.textAlign = "start";

      // Vallas publicitarias LED dinámicas
      const adColors = [home.primary, "#0d1424", away.primary, "#0d1424"];
      const adTexts = ["PRIMERA NACIONAL", home.short, "TNT SPORTS", away.short];
      const adIdx = Math.floor(Date.now() / 2000) % adColors.length;
      ctx.fillStyle = adColors[adIdx];
      ctx.fillRect(0, ground - 22, W, 22);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px system-ui";
      for (let i = 0; i < W; i += 160) ctx.fillText(adTexts[adIdx], i + 12, ground - 7);

      // Césped a rayas
      for (let i = 0; i < W; i += 50) {
        ctx.fillStyle = (i / 50) % 2 === 0 ? "#3aa550" : "#2f8c43";
        ctx.fillRect(i, ground, 50, H - ground);
      }

      // Reflector central sobre la cancha (le da protagonismo y contraste vs. el fondo oscuro)
      const spot = ctx.createRadialGradient(W / 2, ground - 40, 40, W / 2, ground - 40, W * 0.55);
      spot.addColorStop(0, "rgba(255,255,240,0.16)");
      spot.addColorStop(1, "rgba(255,255,240,0)");
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, ground);

      // Viñeta: oscurece un poco las esquinas para que el centro (donde se juega) resalte
      const vig = ctx.createRadialGradient(W / 2, ground * 0.7, H * 0.25, W / 2, ground * 0.7, W * 0.65);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.22)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // Sombra de contacto césped/pared para que no se vea "pegado" de golpe
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, ground, W, 6);
      // Líneas de cancha: mediocampo, círculo central, áreas
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W / 2, ground); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, ground + (H - ground) / 2, 38, 0, Math.PI * 2); ctx.stroke();
      // Áreas
      ctx.strokeRect(goalW, ground + 6, 90, H - ground - 12);
      ctx.strokeRect(W - goalW - 90, ground + 6, 90, H - ground - 12);

      // Desplazamiento de la red por el impacto del gol: ripple que decae con el tiempo
      // y se atenúa con la distancia al punto donde entró la pelota.
      const netDisplacement = (side: "L" | "R", pos: number) => {
        if (!netWave || netWave.side !== side) return 0;
        const t = netWave.age;
        const envelope = Math.max(0, 1 - t / NET_WAVE_FRAMES);
        if (envelope <= 0) return 0;
        const dist = Math.abs(pos - netWave.entryPos);
        const wave = Math.sin(t * 0.9 - dist * 0.06) * envelope * 11;
        return (side === "L" ? -1 : 1) * Math.max(0, wave);
      };
      const drawGoal = (x: number, side: "L" | "R") => {
        // Red (con ripple si acaba de entrar un gol por este arco)
        ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1;
        for (let y = ground - goalH; y < ground; y += 8) {
          const off = netDisplacement(side, y);
          ctx.beginPath(); ctx.moveTo(x + off, y); ctx.lineTo(x + goalW + off, y); ctx.stroke();
        }
        for (let xx = x; xx < x + goalW; xx += 8) {
          const off = netDisplacement(side, xx);
          ctx.beginPath(); ctx.moveTo(xx + off, ground - goalH); ctx.lineTo(xx + off, ground); ctx.stroke();
        }
        // Marco grueso (postes y travesaño) — fijo, no se deforma
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, ground); ctx.lineTo(x, ground - goalH);
        ctx.lineTo(x + goalW, ground - goalH); ctx.lineTo(x + goalW, ground);
        ctx.stroke();
      };
      drawGoal(0, "L");
      drawGoal(W - goalW, "R");
      // El ripple avanza acá (no en update()) para que la animación no se corte
      // durante el replay, que pausa el resto de la física.
      if (netWave) {
        netWave.age++;
        if (netWave.age > NET_WAVE_FRAMES) netWave = null;
      }


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
      const ballGrad = ctx.createRadialGradient(-ball.r * 0.35, -ball.r * 0.35, 1, 0, 0, ball.r * 1.3);
      ballGrad.addColorStop(0, "#ffffff");
      ballGrad.addColorStop(0.55, "#f2f2f2");
      ballGrad.addColorStop(1, "#c9c9c9");
      ctx.fillStyle = ballGrad; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = "#2a2a2a"; ctx.stroke();
      // Parches tipo pentágono en vez de puntos planos, dan sensación de pelota real
      ctx.fillStyle = "#222";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const px = Math.cos(a) * ball.r * 0.52;
        const py = Math.sin(a) * ball.r * 0.52;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        const pr = ball.r * 0.24;
        for (let k = 0; k < 5; k++) {
          const pa = (k / 5) * Math.PI * 2 - Math.PI / 2;
          const vx = Math.cos(pa) * pr, vy = Math.sin(pa) * pr;
          k === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // Brillo superior (da volumen esférico)
      ctx.beginPath();
      ctx.arc(-ball.r * 0.35, -ball.r * 0.4, ball.r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill();
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
      if (weather === "fog") {
        // Capas de niebla: gradiente blanco translúcido + bandas en movimiento
        const t = performance.now() * 0.00015;
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "rgba(220,225,235,0.55)");
        grad.addColorStop(0.5, "rgba(200,210,225,0.35)");
        grad.addColorStop(1, "rgba(180,195,215,0.55)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 3; i++) {
          const off = ((t * (i + 1) * 80) % (W + 200)) - 200;
          ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.04})`;
          ctx.beginPath();
          ctx.ellipse(off, H * 0.4 + i * 60, 320, 70, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Papelitos al inicio (sobre todo)
      confetti.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      });

      // Humo de bengalas (recibimiento de clásico)
      smoke.forEach(s => {
        ctx.globalAlpha = Math.max(0, s.alpha);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        g.addColorStop(0, s.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Chispas de las bengalas
      sparks.forEach(sp => {
        ctx.globalAlpha = Math.max(0, sp.life / 50);
        ctx.fillStyle = sp.color;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Banner "¡BIENVENIDOS AL CLÁSICO!" durante el recibimiento
      if (recibimientoTimer > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, 0, W, H);
        const bannerAlpha = recibimientoTimer > 40 ? 1 : recibimientoTimer / 40;
        ctx.globalAlpha = bannerAlpha;
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 42px system-ui";
        ctx.fillText("¡BIENVENIDOS AL CLÁSICO!", W / 2, H / 2 - 10);
        ctx.font = "bold 22px system-ui";
        ctx.fillStyle = home.primary;
        ctx.fillText(home.short, W / 2 - 90, H / 2 + 30);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("VS", W / 2, H / 2 + 30);
        ctx.fillStyle = away.primary;
        ctx.fillText(away.short, W / 2 + 90, H / 2 + 30);
        ctx.textAlign = "start";
        ctx.globalAlpha = 1;
      }

      // Overlay REPLAY
      if (replay) {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, W, H);
        // Banda diagonal roja
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(-0.08);
        ctx.fillStyle = "rgba(230,57,70,0.92)";
        ctx.fillRect(-W, -40, W * 2, 80);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 56px system-ui";
        ctx.textAlign = "center";
        const blink = Math.floor(Date.now() / 300) % 2 === 0;
        ctx.fillText(blink ? "● REPLAY DE GOL" : "REPLAY DE GOL", 0, 20);
        ctx.restore();
        ctx.textAlign = "start";
      }
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
        if (pauseClockRef.current) return t;
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
    <div className="flex flex-col items-center gap-3 w-full relative">
      {matchLabel && (
        <div className="w-full max-w-6xl px-4 py-1.5 rounded-lg bg-accent/20 border border-accent/40 text-center font-display tracking-[0.3em] text-accent text-sm animate-fade-in">
          ★ {matchLabel} ★
        </div>
      )}
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

      <div className="relative w-full max-w-6xl">
        <canvas ref={ref} width={1400} height={520} className="w-full rounded-2xl border-2 border-border bg-black" />
        {varMsg && (
          <div className="absolute inset-x-0 top-4 flex justify-center pointer-events-none animate-fade-in">
            <div className="px-5 py-2 rounded-xl bg-black/85 border-2 border-accent text-accent font-display text-xl tracking-wider">
              {varMsg}
            </div>
          </div>
        )}
      </div>


      {/* Estadísticas en vivo */}
      <div className="w-full max-w-6xl rounded-2xl bg-card border border-border p-3 text-sm">
        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="text-right font-display">{home.short}</div>
          <div className="text-center text-xs text-muted-foreground uppercase tracking-wider">Estadísticas</div>
          <div className="text-left font-display">{away.short}</div>

          <StatRow label="Posesión" h={`${stats.possessionH}%`} a={`${possA}%`} barH={stats.possessionH} barA={possA} />
          <StatRow label="Remates" h={stats.shotsH} a={stats.shotsA} />
          <StatRow label="Al arco" h={stats.onTargetH} a={stats.onTargetA} />
        </div>
      </div>

      <div className="w-full max-w-6xl rounded-2xl bg-card border border-border p-3 text-xs grid sm:grid-cols-2 gap-3">
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
        {sharedNarrator && sharedOptions.length > 0 && (
          <label className="flex items-center gap-2 sm:col-span-2">
            <span className="w-20 uppercase tracking-wider text-muted-foreground">Relator</span>
            <DarkSelect
              value={sharedName}
              onChange={setSharedName}
              options={sharedOptions.map(n => ({ value: n.name, label: n.name }))}
            />
          </label>
        )}
        {!sharedNarrator && homeNarrators.length > 0 && (
          <label className="flex items-center gap-2">
            <span className="w-20 uppercase tracking-wider text-muted-foreground">Relator {home.short}</span>
            <DarkSelect
              value={homeNarratorId}
              onChange={setHomeNarratorId}
              options={homeNarrators.map(n => ({ value: n.id, label: n.name }))}
            />
          </label>
        )}
        {!sharedNarrator && awayNarrators.length > 0 && (
          <label className="flex items-center gap-2">
            <span className="w-20 uppercase tracking-wider text-muted-foreground">Relator {away.short}</span>
            <DarkSelect
              value={awayNarratorId}
              onChange={setAwayNarratorId}
              options={awayNarrators.map(n => ({ value: n.id, label: n.name }))}
            />
          </label>
        )}
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

// Reemplaza al <select> nativo (que renderiza fondo blanco del sistema al desplegar,
// haciendo ilegibles los nombres de relatores): un botón + lista propia, siempre
// oscura y legible, con la opción actual bien resaltada.
function DarkSelect({ value, options, onChange, className = "" }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} className={`relative flex-1 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 rounded-md border border-border bg-[#12161f] text-foreground px-3 flex items-center justify-between text-sm hover:border-celeste/60 transition-colors"
      >
        <span className="truncate">{current?.label ?? "Elegir..."}</span>
        <span className={`ml-2 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 right-0 max-h-56 overflow-y-auto rounded-md border border-border bg-[#12161f] shadow-xl">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm truncate hover:bg-celeste/15 ${
                o.value === value ? "bg-celeste/20 text-celeste font-semibold" : "text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
