// Sonido de navegación tipo "blip" sintetizado con Web Audio API — es el
// fallback de siempre, así nunca queda mudo si Admin no cargó audio propio.
// Si Admin sí cargó un sonido real (Ajustes → Sonidos de Equipos), se usa ese
// en su lugar — se cachea una sola vez por carga de página.
import { fetchGameSettings, type UiSfxKey } from "@/lib/game-settings";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

let sfxCache: Partial<Record<UiSfxKey, string | null>> | null = null;
let sfxLoading: Promise<void> | null = null;
const sfxAudioEls: Partial<Record<UiSfxKey, HTMLAudioElement>> = {};

function loadSfxOnce() {
  if (sfxCache || sfxLoading) return;
  sfxLoading = fetchGameSettings().then(s => {
    sfxCache = s.ui_sfx ?? {};
  }).catch(() => { sfxCache = {}; });
}
loadSfxOnce();

function playRealSfx(key: UiSfxKey): boolean {
  const url = sfxCache?.[key];
  if (!url) return false;
  try {
    let el = sfxAudioEls[key];
    if (!el) { el = new Audio(url); el.volume = 0.55; sfxAudioEls[key] = el; }
    el.currentTime = 0;
    void el.play().catch(() => {});
    return true;
  } catch { return false; }
}

export function playUiBlip(freq = 620) {
  if (playRealSfx("team_move")) return;
  const c = getCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(0.05, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.1);
  } catch { /* noop */ }
}

export function playUiConfirm() {
  if (playRealSfx("team_select")) return;
  const c = getCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(500, c.currentTime);
    osc.frequency.linearRampToValueAtTime(900, c.currentTime + 0.08);
    gain.gain.setValueAtTime(0.06, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.17);
  } catch { /* noop */ }
}

// Sonido al cambiar de liga/división (distinto del de pasar equipo/elegir equipo).
export function playLeagueChange() {
  if (playRealSfx("league_select")) return;
  const c = getCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(340, c.currentTime);
    osc.frequency.linearRampToValueAtTime(220, c.currentTime + 0.12);
    gain.gain.setValueAtTime(0.05, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.21);
  } catch { /* noop */ }
}
