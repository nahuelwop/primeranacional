import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS, Team } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { Game, type Weather, type Difficulty, type Mode, type MatchStats } from "@/components/Game";
import { Penales } from "@/components/Penales";

export const Route = createFileRoute("/amistoso")({
  head: () => ({
    meta: [
      { title: "Amistoso 1v1 · Primera Heads" },
      { name: "description", content: "Elegí dos equipos de la Primera Nacional y disputá un partido arcade." },
    ],
  }),
  component: AmistosoPage,
});

type WeatherChoice = Weather | "random";
type Kit = "titular" | "alternativa";

function resolveWeather(w: WeatherChoice): Weather {
  if (w !== "random") return w;
  const opts: Weather[] = ["clear", "rain", "wind", "thunder", "fog"];
  return opts[Math.floor(Math.random() * opts.length)];
}

function applyKit(team: Team, kit: Kit): Team {
  if (kit === "titular") return team;
  return { ...team, primary: team.secondary, secondary: team.primary };
}

function AmistosoPage() {
  const teamsVersion = useTeamsSync();
  const [home, setHome] = useState<Team | null>(TEAMS[0]);
  const [away, setAway] = useState<Team | null>(TEAMS.find(t => t.id === "nuevachicago") ?? TEAMS[18]);
  const [homeKit, setHomeKit] = useState<Kit>("titular");
  const [awayKit, setAwayKit] = useState<Kit>("titular");
  const [playing, setPlaying] = useState(false);
  const [weather, setWeather] = useState<WeatherChoice>("clear");
  const [activeWeather, setActiveWeather] = useState<Weather>("clear");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [mode, setMode] = useState<Mode>("1vAI");
  const [result, setResult] = useState<{ h: number; a: number; stats: MatchStats } | null>(null);
  const [showPenales, setShowPenales] = useState(false);
  const [penalesResult, setPenalesResult] = useState<{ winner: "H" | "A"; h: number; a: number } | null>(null);

  // Cuando llegan los equipos de Supabase, TEAMS se reemplaza: refrescamos las
  // referencias seleccionadas por id para no quedarnos con datos viejos.
  useEffect(() => {
    setHome(h => (h ? TEAMS.find(t => t.id === h.id) ?? h : h));
    setAway(a => (a ? TEAMS.find(t => t.id === a.id) ?? a : a));
  }, [teamsVersion]);

  const homeKitted = useMemo(() => home ? applyKit(home, homeKit) : null, [home, homeKit]);
  const awayKitted = useMemo(() => away ? applyKit(away, awayKit) : null, [away, awayKit]);

  if (playing && homeKitted && awayKitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
          <Game home={homeKitted} away={awayKitted} duration={60} weather={activeWeather} aiDifficulty={difficulty} mode={mode} sharedNarrator
            crowdIntensity={(home?.rivals?.includes(away?.id ?? "") || away?.rivals?.includes(home?.id ?? "")) ? "clasico" : "normal"}
            onEnd={(h, a, stats) => { setResult({ h, a, stats }); setPlaying(false); setShowPenales(false); setPenalesResult(null); }}
            onExit={() => { setPlaying(false); setResult(null); setShowPenales(false); setPenalesResult(null); }} />

        </main>
      </div>
    );
  }



  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <h1 className="font-display text-5xl">AMISTOSO</h1>
        <p className="text-muted-foreground text-sm mt-1">Elegí los equipos y el modo. Partido de 60 segundos.</p>

        {result && (
          <div className="mt-4 p-4 rounded-xl bg-card border border-border">
            <div className="font-display text-2xl text-center">
              {home?.short} <span className="text-celeste">{result.h}</span> — <span className="text-celeste">{result.a}</span> {away?.short}
            </div>
            <div className="text-sm text-muted-foreground text-center mt-1">
              {result.h>result.a ? `Ganó ${home?.name}` : result.a>result.h ? `Ganó ${away?.name}` : "Empate"}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
              <div className="text-right tabular-nums">{result.stats.possessionH}%</div>
              <div className="text-center text-xs text-muted-foreground">Posesión</div>
              <div className="text-left tabular-nums">{100 - result.stats.possessionH}%</div>
              <div className="text-right tabular-nums">{result.stats.shotsH}</div>
              <div className="text-center text-xs text-muted-foreground">Remates</div>
              <div className="text-left tabular-nums">{result.stats.shotsA}</div>
              <div className="text-right tabular-nums">{result.stats.onTargetH}</div>
              <div className="text-center text-xs text-muted-foreground">Al arco</div>
              <div className="text-left tabular-nums">{result.stats.onTargetA}</div>
            </div>

            {result.h === result.a && home && away && !showPenales && !penalesResult && (
              <div className="mt-3 flex justify-center">
                <button onClick={() => setShowPenales(true)}
                  className="px-4 py-2 rounded-lg bg-celeste text-primary-foreground font-display tracking-wider">
                  DEFINIR POR PENALES
                </button>
              </div>
            )}

            {showPenales && homeKitted && awayKitted && !penalesResult && (
              <Penales home={homeKitted} away={awayKitted} mode={mode}
                onEnd={(winner, h, a) => setPenalesResult({ winner, h, a })} />
            )}

            {penalesResult && (
              <div className="mt-3 text-center font-display text-xl">
                Final por penales: {home?.short} {penalesResult.h} — {penalesResult.a} {away?.short}
              </div>
            )}
          </div>
        )}

        <PesTeamSelect
          home={home} away={away}
          onHome={setHome} onAway={setAway}
          homeKit={homeKit} awayKit={awayKit}
          onHomeKit={setHomeKit} onAwayKit={setAwayKit}
        />

        <div className="mt-6 rounded-2xl bg-card border border-border p-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <div className="font-display text-lg mb-2">MODO</div>
              <div className="flex rounded-xl border border-border bg-background p-1">
                {([["1vAI", "1 vs IA"], ["1v1", "1 vs 1"]] as [Mode, string][]).map(([m, l]) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition ${mode===m ? "bg-celeste text-primary-foreground" : "hover:bg-secondary"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {mode === "1vAI" && (
              <div>
                <div className="font-display text-lg mb-2">DIFICULTAD IA</div>
                <div className="flex rounded-xl border border-border bg-background p-1">
                  {([["easy", "Fácil"], ["normal", "Normal"], ["hard", "Difícil"]] as [Difficulty, string][]).map(([level, label]) => (
                    <button key={level} type="button" onClick={() => setDifficulty(level)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition ${difficulty===level ? "bg-celeste text-primary-foreground" : "hover:bg-secondary"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="font-display text-lg mb-2">CLIMA</div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["clear","☀️ Despejado"],["rain","🌧️ Lluvia"],
                  ["wind","💨 Viento"],["fog","🌫️ Niebla"],
                  ["thunder","⚡ Tormenta"],["random","🎲 Aleatorio"],
                ] as [WeatherChoice,string][]).map(([w,l]) => (
                  <button key={w} onClick={() => setWeather(w)}
                    className={`px-3 py-2 rounded-lg text-sm border transition ${weather===w ? "bg-celeste text-primary-foreground border-celeste" : "bg-background border-border hover:bg-secondary"}`}>
                    {l}
                  </button>
                ))}
              </div>
              {weather === "random" && activeWeather && (
                <div className="text-xs text-muted-foreground mt-2">Se sortea al iniciar el partido.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button disabled={!home || !away || home?.id === away?.id}
            onClick={() => { setResult(null); setActiveWeather(resolveWeather(weather)); setPlaying(true); }}
            className="px-8 py-4 rounded-xl bg-celeste text-primary-foreground font-display text-2xl tracking-wider glow-celeste disabled:opacity-40">
            JUGAR PARTIDO
          </button>
        </div>

      </main>
    </div>
  );
}

// ===== Selector estilo PES 2013: dos paneles (LOCAL / VISITANTE) + fila de escudos =====
type Side = "home" | "away";

function PesTeamSelect({
  home, away, onHome, onAway, homeKit, awayKit, onHomeKit, onAwayKit,
}: {
  home: Team | null; away: Team | null;
  onHome: (t: Team) => void; onAway: (t: Team) => void;
  homeKit: Kit; awayKit: Kit;
  onHomeKit: (k: Kit) => void; onAwayKit: (k: Kit) => void;
}) {
  const [focus, setFocus] = useState<Side>("home");
  const [zoneHome, setZoneHome] = useState<"A" | "B">(home?.zone ?? "A");
  const [zoneAway, setZoneAway] = useState<"A" | "B">(away?.zone ?? "A");
  const zone = focus === "home" ? zoneHome : zoneAway;
  const setZone = focus === "home" ? setZoneHome : setZoneAway;
  const selected = focus === "home" ? home : away;
  const setSelected = focus === "home" ? onHome : onAway;

  const list = useMemo(() => TEAMS.filter(t => t.zone === zone), [zone, TEAMS.length]);
  const idx = Math.max(0, list.findIndex(t => t.id === selected?.id));
  const stripRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const el = selected && itemRefs.current[selected.id];
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected?.id, zone]);

  // Navegación con teclado (A/D o flechas para moverse, Enter/Espacio para confirmar)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["a", "arrowleft", "d", "arrowright", "enter", " ", "backspace"].includes(k)) e.preventDefault();
      if (k === "a" || k === "arrowleft") {
        const next = list[Math.max(0, idx - 1)];
        if (next) setSelected(next);
      } else if (k === "d" || k === "arrowright") {
        const next = list[Math.min(list.length - 1, idx + 1)];
        if (next) setSelected(next);
      } else if (k === "enter" || k === " ") {
        setFocus(f => (f === "home" ? "away" : "home"));
      } else if (k === "backspace" && focus === "away") {
        setFocus("home");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, list, setSelected, focus]);

  return (
    <div className="mt-6 rounded-2xl border border-border overflow-hidden bg-[radial-gradient(ellipse_at_top,_#123058_0%,_#070b14_75%)]">
      <div className="grid md:grid-cols-2">
        <PesPanel side="home" label="LOCAL" team={home} kit={homeKit} onKit={onHomeKit}
          active={focus === "home"} onClick={() => setFocus("home")} align="left" />
        <PesPanel side="away" label="VISITANTE" team={away} kit={awayKit} onKit={onAwayKit}
          active={focus === "away"} onClick={() => setFocus("away")} align="right" />
      </div>

      {/* Fila horizontal de escudos del lado enfocado */}
      <div className="border-t border-white/10 bg-black/40 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">
            Eligiendo {focus === "home" ? "LOCAL" : "VISITANTE"}
          </div>
          <div className="flex gap-1">
            {(["A", "B"] as const).map(z => (
              <button key={z} onClick={() => setZone(z)}
                className={`px-2 py-1 text-[11px] rounded transition ${zone === z ? "bg-celeste text-primary-foreground" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
                Zona {z}
              </button>
            ))}
          </div>
        </div>
        <div ref={stripRef} className="flex items-end gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
          {list.map((t, i) => {
            const dist = Math.abs(i - idx);
            const scale = dist === 0 ? "scale-125 opacity-100" : dist === 1 ? "scale-100 opacity-80" : "scale-90 opacity-50";
            return (
              <button
                key={t.id}
                ref={el => { itemRefs.current[t.id] = el; }}
                onClick={() => setSelected(t)}
                title={t.name}
                className={`shrink-0 flex flex-col items-center gap-1 transition-transform duration-200 ease-out ${scale}`}
              >
                <div className={`rounded-full p-1 transition ${t.id === selected?.id ? "ring-2 ring-celeste bg-white/10" : ""}`}>
                  <Shield team={t} size={40} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmar / Atrás */}
      <div className="border-t border-white/10 bg-black/50 px-4 py-3 flex items-center justify-center gap-3">
        <button
          onClick={() => setFocus("home")}
          disabled={focus === "home"}
          className="px-5 py-2 rounded-lg text-sm font-display tracking-wider bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition">
          ATRÁS
        </button>
        <button
          onClick={() => setFocus(focus === "home" ? "away" : "home")}
          className="px-5 py-2 rounded-lg text-sm font-display tracking-wider bg-celeste text-primary-foreground hover:brightness-110 transition">
          {focus === "home" ? "CONFIRMAR LOCAL" : "CONFIRMAR VISITANTE"}
        </button>
      </div>
    </div>
  );
}

function PesPanel({ label, team, kit, onKit, active, onClick, align }: {
  side: Side; label: string; team: Team | null; kit: Kit; onKit: (k: Kit) => void;
  active: boolean; onClick: () => void; align: "left" | "right";
}) {
  const displayed = team ? applyKit(team, kit) : null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className={`text-left p-5 cursor-pointer transition-colors duration-200 ${align === "left" ? "md:border-r border-white/10" : ""} ${active ? "bg-white/[0.06]" : "bg-transparent hover:bg-white/[0.03]"}`}
    >
      <div className={`text-[11px] uppercase tracking-[0.3em] mb-3 ${active ? "text-celeste" : "text-white/40"}`}>{label}</div>
      {displayed ? (
        <div className={`flex items-center gap-4 ${align === "right" ? "md:flex-row-reverse md:text-right" : ""}`}>
          <div className="transition-transform duration-200 ease-out" style={{ transform: active ? "scale(1.08)" : "scale(1)" }}>
            <Shield team={displayed} size={72} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-2xl text-white truncate">{displayed.name}</div>
            <div className="text-xs text-white/50">{displayed.city}</div>
            <div className={`text-[11px] mt-2 grid grid-cols-4 gap-1 text-white/70 ${align === "right" ? "md:justify-items-end" : ""}`}>
              <span>VEL {displayed.stats.speed}</span><span>SAL {displayed.stats.jump}</span>
              <span>POT {displayed.stats.power}</span><span>DEF {displayed.stats.defense}</span>
            </div>
            <div className={`mt-2 flex rounded-lg border border-white/15 bg-black/30 p-0.5 max-w-[180px] ${align === "right" ? "md:ml-auto" : ""}`} onClick={e => e.stopPropagation()}>
              {(["titular", "alternativa"] as Kit[]).map(k => (
                <button key={k} onClick={() => onKit(k)}
                  className={`flex-1 px-2 py-1 rounded-md text-[11px] capitalize transition ${kit === k ? "bg-celeste text-primary-foreground" : "text-white/60 hover:bg-white/10"}`}>
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[72px] flex items-center text-white/30 text-sm">Elegí un equipo abajo</div>
      )}
    </div>
  );
}
