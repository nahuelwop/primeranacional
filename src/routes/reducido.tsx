import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Shield } from "@/components/Shield";
import { TEAMS_BY_ID } from "@/data/teams";
import { useTeamsSync } from "@/lib/teams-sync";
import { useTournament, recordUserPlayoff } from "@/store/tournament";
import { Pair } from "@/lib/tournament";
import { Game } from "@/components/Game";

export const Route = createFileRoute("/reducido")({
  head: () => ({
    meta: [
      { title: "Fase Final · Primera Heads" },
      { name: "description", content: "Final directa por el primer ascenso y reducido por el segundo." },
    ],
  }),
  component: Reducido,
});

type PlayCtx = {
  kind: "final" | "octavos" | "cuartos" | "semis" | "final_reducido";
  idx: number;
  pair: Pair;
};

function Reducido() {
  useTeamsSync();
  const s = useTournament();
  const [play, setPlay] = useState<PlayCtx | null>(null);
  // El fixture se arma una sola vez; sin esto el estado quedaba vacío
  // y la fase final nunca se habilitaba.
  useEffect(() => { s.init(); }, []);
  const allPlayed = s.fixture.length > 0 && s.fixture.every(m => m.played);

  if (!allPlayed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 grid place-items-center px-4">
          <div className="text-center max-w-md">
            <h1 className="font-display text-4xl">Falta terminar la fase regular</h1>
            <p className="text-muted-foreground mt-2">Disputá todas las fechas de la temporada en Modo Carrera para habilitar la fase final.</p>
            <Link to="/carrera" className="mt-5 inline-block px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider">IR A MODO CARRERA</Link>
          </div>
        </main>
      </div>
    );
  }

  const isUserPair = (p?: Pair) => !!p && !!s.userTeamId && (p.a === s.userTeamId || p.b === s.userTeamId);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <h1 className="font-display text-5xl">FASE FINAL</h1>
        <p className="text-muted-foreground text-sm mt-1">Primer ascenso por final directa · Segundo por reducido</p>

        {!s.finalDirecta ? (
          <button onClick={() => s.startPlayoffs()}
            className="mt-6 px-6 py-3 rounded-xl bg-celeste text-primary-foreground font-display tracking-wider glow-celeste">
            DISPUTAR FINAL DIRECTA
          </button>
        ) : (
          <div className="mt-6 grid lg:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-gradient-to-br from-celeste/20 to-accent/10 border border-celeste/40 p-5">
              <div className="font-display text-celeste text-xl">FINAL POR EL 1° ASCENSO</div>
              <PairView pair={s.finalDirecta} big />
              {!s.finalDirecta.winner && isUserPair(s.finalDirecta) && (
                <button onClick={() => setPlay({ kind: "final", idx: 0, pair: s.finalDirecta! })}
                  className="mt-3 w-full px-4 py-3 rounded-lg bg-celeste text-primary-foreground font-display tracking-wider glow-celeste">
                  JUGAR LA FINAL
                </button>
              )}
              {s.champion && (
                <div className="mt-4 text-center">
                  <div className="text-xs text-muted-foreground">CAMPEÓN · 1° ASCENSO</div>
                  <div className="font-display text-2xl text-celeste">{TEAMS_BY_ID[s.champion]?.name}</div>
                </div>
Listo
