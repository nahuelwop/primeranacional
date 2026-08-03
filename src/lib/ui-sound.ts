import { useEffect } from "react";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Tone = { f: number; to?: number; dur: number; gain: number; type?: OscillatorType };

const SFX: Record<string, Tone[]> = {
  hover: [{ f: 880, dur: 0.06, gain: 0.014, type: "sine" }],
  click: [{ f: 420, to: 620, dur: 0.09, gain: 0.03, type: "triangle" }],
  accept: [{ f: 520, dur: 0.08, gain: 0.028, type: "sine" }, { f: 780, dur: 0.14, gain: 0.026, type: "sine" }],
  cancel: [{ f: 300, to: 180, dur: 0.14, gain: 0.026, type: "triangle" }],
  goal: [{ f: 660, dur: 0.09, gain: 0.03, type: "sine" }, { f: 880, dur: 0.1, gain: 0.03, type: "sine" }, { f: 1180, dur: 0.2, gain: 0.028, type: "sine" }],
  notify: [{ f: 980, dur: 0.07, gain: 0.02, type: "sine" }, { f: 1320, dur: 0.1, gain: 0.018, type: "sine" }],
};

export function playSfx(name: keyof typeof SFX) {
  const ac = getCtx();
  if (!ac) return;
  let t = ac.currentTime;
  for (const tone of SFX[name]) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.setValueAtTime(tone.f, t);
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, t + tone.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(tone.gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + tone.dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + tone.dur + 0.02);
    t += tone.dur * 0.7;
  }
}

/** Sonidos discretos de hover/click en cualquier botón o link dentro del contenedor. */
export function useUiSfx(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.querySelector("[data-sfx-root]") ?? document.body;
    let last = "";
    const over = (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest("button, a, [role='button']");
      if (!el || el.getAttribute("data-sfx") === "off") return;
      const id = el.textContent?.slice(0, 24) ?? "";
      if (id === last) return;
      last = id;
      playSfx("hover");
    };
    const out = () => { last = ""; };
    const click = (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest("button, a, [role='button']");
      if (!el || el.getAttribute("data-sfx") === "off") return;
      playSfx(el.getAttribute("data-sfx") === "accept" ? "accept" : "click");
    };
    root.addEventListener("pointerover", over);
    root.addEventListener("pointerout", out);
    root.addEventListener("click", click);
    return () => {
      root.removeEventListener("pointerover", over);
      root.removeEventListener("pointerout", out);
      root.removeEventListener("click", click);
    };
  }, [enabled]);
}
