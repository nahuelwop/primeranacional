import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield, Jersey } from "@/components/Shield";
import { TEAMS, Team } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { Game, type Weather, type Difficulty, type Mode, type MatchStats } from "@/components/Game";

export const Route = createFileRoute("/amistoso")({
  head: () => ({
    meta: [
      { title: "Amistoso 1v1 · Primera Heads" },
      { name: "description", content: "Elegí dos equipos de la Primera Nacional y disputá un partido arcade." },
    ],
  }),
  component: AmistosoPage,
});

function AmistosoPage() {
  useTeamsSync();
  const [home, setHome] = useState<Team | null>(TEAMS[0]);
  const [away, setAway] = useState<Team | null>(TEAMS.find(t => t.id === "nuevachicago") ?? TEAMS[18]);
  const [playing, setPlaying] = useState(false);
  const [weather, setWeather] = useState<Weather>("clear");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [mode, setMode] = useState<Mode>("1vAI");
  const [result, setResult] = useState<{ h: number; a: number; stats: MatchStats } | null>(null);

  if (playing && home && away) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
          <Game home={home} away={away} duration={90} weather={weather} aiDifficulty={difficulty} mode={mode}
            onEnd={(h, a, stats) => { setResult({ h, a, stats }); setPlaying(false); }} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <h1 className="font-display text-5xl">AMISTOSO</h1>
        <p className="text-muted-foreground text-sm mt-1">Elegí los equipos y el modo. Partido de 90 segundos.</p>

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
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Selector label="LOCAL" value={home} onChange={setHome} />
          <Selector label="VISITANTE" value={away} onChange={setAway} />
        </div>

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
                  ["wind","💨 Viento"],["thunder","⚡ Tormenta"],
                ] as [Weather,string][]).map(([w,l]) => (
                  <button key={w} onClick={() => setWeather(w)}
                    className={`px-3 py-2 rounded-lg text-sm border transition ${weather===w ? "bg-celeste text-primary-foreground border-celeste" : "bg-background border-border hover:bg-secondary"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button disabled={!home || !away || home?.id === away?.id}
            onClick={() => { setResult(null); setPlaying(true); }}
            className="px-8 py-4 rounded-xl bg-celeste text-primary-foreground font-display text-2xl tracking-wider glow-celeste disabled:opacity-40">
            JUGAR PARTIDO
          </button>
        </div>
      </main>
    </div>
  );
}

function Selector({ label, value, onChange }: { label: string; value: Team | null; onChange: (t: Team) => void }) {
  const [zone, setZone] = useState<"A"|"B">(value?.zone ?? "A");
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-xl">{label}</div>
        <div className="flex gap-1">
          {(["A","B"] as const).map(z => (
            <button key={z} onClick={() => setZone(z)}
              className={`px-2 py-1 text-xs rounded ${zone===z ? "bg-celeste text-primary-foreground" : "bg-secondary"}`}>
              Zona {z}
            </button>
          ))}
        </div>
      </div>

      {value && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-background border border-border">
          <Shield team={value} size={48} />
          <div className="flex-1">
            <div className="font-display text-lg">{value.name}</div>
            <div className="text-xs text-muted-foreground">{value.city}</div>
            <div className="text-xs mt-1 grid grid-cols-4 gap-1">
              <span>VEL {value.stats.speed}</span><span>SAL {value.stats.jump}</span>
              <span>POT {value.stats.power}</span><span>DEF {value.stats.defense}</span>
            </div>
          </div>
          <Jersey team={value} size={48} />
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
        {TEAMS.filter(t => t.zone === zone).map(t => (
          <button key={t.id} onClick={() => onChange(t)}
            className={`p-2 rounded-lg border text-left transition ${value?.id===t.id ? "border-celeste bg-celeste/10" : "border-border bg-background hover:bg-secondary"}`}>
            <Shield team={t} size={36} />
            <div className="text-[10px] mt-1 truncate">{t.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
