import { useEffect, useState } from "react";
import { Shield } from "@/components/Shield";
import { TEAMS_BY_ID } from "@/data/teams";
import type { CareerState } from "@/lib/career";
import { fetchMarketPlayers, getCareerRecords, extractMoments, buildDailyChallenge, isDailyChallengeComplete, careerLevelFromXp, careerRankTitle, careerXpToNextLevel, rivalStats, type MarketPlayer } from "@/lib/career-features";
import { fetchLeaderboard, upsertLeaderboard } from "@/lib/career-api";
import { useAuth } from "@/lib/auth";

export function CareerFeaturesPanel({ state, teamId, season, budget, onSpend, onRewardXp, onShare, onGoCopa }: {
  state: CareerState; teamId: string; season: number; budget: number;
  onSpend: (amount: number) => Promise<void>;
  onSignPlayer: (player: MarketPlayer) => Promise<void>;
  onRewardXp: (amount: number) => Promise<void>;
  onClaimChallenge: (id: string, amount: number) => Promise<void>;
  onShare: () => Promise<void>;
  onGoCopa: () => void;
  copaAvailable?: boolean;
}) {
  const { user, username } = useAuth();
  const [market, setMarket] = useState<MarketPlayer[]>([]);
  const [marketLoaded, setMarketLoaded] = useState(false);
  const [marketMsg, setMarketMsg] = useState("");
  const [ranking, setRanking] = useState<Array<{ username: string; score: number; level: number; team_id: string }>>([]);
  const [challenge, setChallenge] = useState<ReturnType<typeof buildDailyChallenge> | null>(null);
  useEffect(() => { setChallenge(buildDailyChallenge()); }, []);
  const complete = challenge ? isDailyChallengeComplete(challenge, state, teamId) : false;
  const records = getCareerRecords(state, teamId);
  const moments = extractMoments(state, teamId);
  const xp = state.managerXp ?? 0;
  const level = careerLevelFromXp(xp);
  const next = careerXpToNextLevel(xp);
  const prev = Math.max(0, (level - 1) * (level - 1) * 100);
  const pct = Math.min(100, Math.max(0, ((xp - prev) / Math.max(1, next - prev)) * 100));

  useEffect(() => {
    fetchMarketPlayers([teamId]).then(v => { setMarket(v); setMarketLoaded(true); }).catch(() => setMarketLoaded(true));
    fetchLeaderboard(10).then(setRanking).catch(() => {});
  }, [teamId]);

  useEffect(() => {
    if (!user) return;
    const score = Math.round(xp + records.trophies * 500 + records.wins * 20 + records.seasons * 100);
    upsertLeaderboard({ user_id: user.id, username: username ?? "Jugador", team_id: teamId, score, level }).catch(() => {});
  }, [user, username, teamId, xp, records.trophies, records.wins, records.seasons, level]);

  async function signPlayer(player: MarketPlayer) {
    if (budget < player.value) { setMarketMsg("No hay presupuesto suficiente para este fichaje."); return; }
    if ((state.transferSignings ?? []).includes(player.id)) { setMarketMsg("Ese jugador ya está incorporado."); return; }
    await onSignPlayer(player);
    setMarketMsg(`${player.name} es nuevo refuerzo de tu club. 💙`);
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-3">
        <section className="hud-panel p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="font-display text-xl tracking-wide">🎯 PROGRESIÓN DEL DT</div>
              <div className="text-xs text-muted-foreground">{careerRankTitle(level)} · Nivel {level}</div>
            </div>
            <div className="text-right font-display text-celeste">{xp.toLocaleString("es-AR")} XP</div>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-celeste rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>Rango actual</span><span>{Math.max(0, next - xp)} XP para nivel {level + 1}</span></div>
        </section>
        <section className="hud-panel p-4">
          <div className="font-display text-lg mb-2">📸 COMPARTIR</div>
          <p className="text-xs text-muted-foreground mb-3">Compartí tu carrera, récords y el último partidazo como contenido listo para redes.</p>
          <button onClick={onShare} className="w-full rounded-lg bg-celeste text-primary-foreground py-2.5 font-display text-sm">COMPARTIR CARRERA</button>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <section className="hud-panel p-4">
          <div className="flex items-center justify-between mb-3"><div><div className="font-display text-lg">🔥 DESAFÍO DEL DÍA</div><div className="text-xs text-muted-foreground">+{challenge?.rewardXp ?? 0} XP</div></div><span className={complete ? "text-hud-green font-display text-xs" : "text-accent font-display text-xs"}>{complete ? "COMPLETADO ✓" : "PENDIENTE"}</span></div>
          <div className="font-display text-2xl text-celeste">{challenge?.title ?? "Cargando desafío…"}</div>
          <div className="text-sm mt-1 text-muted-foreground">{challenge?.description ?? "Preparando el desafío diario."}</div>
          {complete && challenge && !(state.claimedChallenges ?? []).includes(challenge.id) && (
            <button onClick={() => onClaimChallenge(challenge.id, challenge.rewardXp)} className="mt-3 px-4 py-2 rounded-lg bg-hud-green text-black font-display text-xs">COBRAR RECOMPENSA</button>
          )}
        </section>
        <section className="hud-panel p-4">
          <div className="font-display text-lg mb-3">🏆 RÉCORDS DE TU CARRERA</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[["Partidos", records.matches],["Victorias", records.wins],["Goles", records.goals],["Mejor invicto", records.bestUnbeaten],["Trofeos", records.trophies],["Mayor victoria", `+${records.biggestWin}`],["Goles en partido", records.goalsInMatch],["Temporadas", records.seasons]].map(([k,v]) => <div key={String(k)} className="rounded-lg border border-border/60 bg-card/40 p-2.5"><div className="text-[10px] text-muted-foreground">{k}</div><div className="font-display text-xl">{v}</div></div>)}
          </div>
        </section>
      </div>

      <section className="hud-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div><div className="font-display text-lg">💼 MERCADO DE PASES</div><div className="text-xs text-muted-foreground">Refuerzos aleatorios del universo de clubes cargados.</div></div>
          {marketMsg && <div className="text-xs text-hud-green">{marketMsg}</div>}
        </div>
        {!marketLoaded ? <div className="text-sm text-muted-foreground">Buscando jugadores...</div> : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
            {market.slice(0, 12).map(p => {
              const source = TEAMS_BY_ID[p.team_id];
              const signed = (state.transferSignings ?? []).includes(p.id);
              return <div key={p.id} className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="flex items-center gap-2">{source ? <Shield team={source} size={36} /> : <div className="w-9 h-9 rounded-lg bg-white/5" />}<div className="min-w-0"><div className="font-display truncate">{p.name}</div><div className="text-[10px] text-muted-foreground">{p.position} · {source?.short ?? "Libre"}</div></div><div className="ml-auto font-display text-celeste">{p.rating}</div></div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>Potencial {p.potential}</span><span>Valor ${p.value}</span></div>
                <button disabled={signed || budget < p.value} onClick={() => signPlayer(p)} className="w-full mt-2 py-2 rounded-lg bg-celeste text-primary-foreground font-display text-xs disabled:opacity-35">{signed ? "FICHADO ✓" : `FICHAR · $${p.value}`}</button>
              </div>;
            })}
          </div>
        )}
      </section>

      <section className="hud-panel p-4">
        <div className="flex items-center justify-between mb-3"><div><div className="font-display text-lg">📰 NOTICIAS, EVENTOS Y MOMENTOS</div><div className="text-xs text-muted-foreground">La carrera ahora genera historias que podés compartir.</div></div><button onClick={onShare} className="text-xs text-celeste underline">Compartir momento</button></div>
        <div className="grid md:grid-cols-2 gap-2">
          {moments.length ? moments.map((m, i) => <div key={`${m.round}-${i}`} className="rounded-xl border border-border/60 bg-card/40 p-3"><div className="font-display">{m.emoji} {m.title}</div><div className="text-sm mt-1">{m.text}</div><div className="text-[10px] text-muted-foreground mt-1">Fecha {m.round}</div></div>) : <div className="text-sm text-muted-foreground">Todavía no hubo un momento histórico. Jugá y generá la primera noticia.</div>}
        </div>
      </section>

      <section className="hud-panel p-4">
        <div className="flex items-center justify-between mb-3"><div className="font-display text-lg">📜 HISTORIAL COMPLETO</div><span className="text-[10px] text-muted-foreground">{state.seasonHistory?.length ?? 0} temporadas guardadas</span></div>
        <div className="space-y-2">
          {[...(state.seasonHistory ?? [])].sort((a,b)=>b.season-a.season).slice(0, 12).map(h => {
            const rows = [...h.standings].sort((a,b)=>a.pos-b.pos);
            const me = rows.findIndex(r => r.teamId === teamId) + 1;
            return <div key={`${h.season}-${h.division}`} className="rounded-lg border border-border/50 px-3 py-2 flex flex-wrap items-center gap-2 text-xs"><span className="font-display">T{h.season}</span><span className="text-muted-foreground">{h.division}</span><span>{me ? `${me}° puesto` : "Sin puesto"}</span><span className="ml-auto">{rows[0] ? `Campeón: ${TEAMS_BY_ID[rows[0].teamId]?.short ?? "—"}` : "—"}</span></div>;
          })}
          {!state.seasonHistory?.length && <div className="text-sm text-muted-foreground">La primera temporada aparecerá acá cuando termine.</div>}
        </div>
      </section>

      <section className="hud-panel p-4">
        <div className="flex items-center justify-between mb-3"><div className="font-display text-lg">🌎 RANKING GLOBAL</div><div className="text-[10px] text-muted-foreground">Top 10 DTs</div></div>
        <div className="space-y-1.5">
          {ranking.map((r, i) => <div key={`${r.username}-${i}`} className={`rounded-lg px-3 py-2 flex items-center gap-3 text-xs ${r.team_id === teamId ? "bg-celeste/10 border border-celeste/30" : "bg-card/40 border border-border/40"}`}><span className="font-display w-6">#{i+1}</span><span className="font-semibold truncate flex-1">{r.username}</span><span>{TEAMS_BY_ID[r.team_id]?.short ?? r.team_id}</span><span className="font-display text-celeste">{r.score}</span></div>)}
          {!ranking.length && <div className="text-sm text-muted-foreground">El ranking se llena a medida que juegan los usuarios.</div>}
        </div>
      </section>

      <section className="hud-panel p-4">
        <div className="flex items-center justify-between mb-3"><div className="font-display text-lg">🔥 RIVALIDADES</div><span className="text-xs text-muted-foreground">Clásicos = XP extra</span></div>
        <div className="grid md:grid-cols-2 gap-2">
          {(TEAMS_BY_ID[teamId]?.rivals ?? []).slice(0, 6).map(rid => {
            const rival = TEAMS_BY_ID[rid]; const s = rivalStats(state, teamId, rid);
            return <div key={rid} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3">{rival ? <Shield team={rival} size={38}/> : <div className="w-[38px] h-[38px] rounded-lg bg-white/5" />}<div className="min-w-0 flex-1"><div className="font-display truncate">{rival?.name ?? rid}</div><div className="text-[10px] text-muted-foreground">PJ {s.played} · G {s.wins} · E {s.draws} · P {s.losses}</div></div><span className="text-accent">🔥</span></div>;
          })}
          {!(TEAMS_BY_ID[teamId]?.rivals ?? []).length && <div className="text-sm text-muted-foreground">Este club todavía no tiene rivalidades cargadas.</div>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{copaAvailable ? <button onClick={onGoCopa} className="px-4 py-2 rounded-lg bg-celeste text-primary-foreground font-display text-xs">🏆 IR A COPA ARGENTINA</button> : <span className="px-4 py-2 rounded-lg border border-border/60 text-xs text-muted-foreground">Copa Argentina: no participa esta categoría</span>}<span className="px-4 py-2 rounded-lg border border-border/60 text-xs text-muted-foreground">Temporada {season}</span></div>
      </section>
    </div>
  );
}
