import { TEAMS_BY_ID } from "@/data/teams";
import { sortStandings, type Match, type StandingRow } from "@/lib/tournament";

export type NewsItem = { icon: string; text: string };

export function generateRoundNews(params: {
  round: number;
  standingsBefore: StandingRow[];
  standingsAfter: StandingRow[];
  matches: Match[]; // partidos jugados esa fecha
  allPlayed: Match[]; // todo el histórico jugado
}): NewsItem[] {
  const { standingsBefore, standingsAfter, matches, allPlayed } = params;
  const news: NewsItem[] = [];
  const sortedAfter = sortStandings(standingsAfter);
  const sortedBefore = sortStandings(standingsBefore);

  // Líder
  const leader = sortedAfter[0];
  if (leader) {
    const wasLeader = sortedBefore[0]?.teamId === leader.teamId;
    const name = TEAMS_BY_ID[leader.teamId]?.name ?? leader.teamId;
    news.push({
      icon: "👑",
      text: wasLeader ? `${name} continúa como líder con ${leader.pts} puntos.` : `${name} es el nuevo líder con ${leader.pts} puntos.`,
    });
  }

  // Entradas al reducido (posiciones 2-8)
  const beforeRed = new Set(sortedBefore.slice(1, 8).map(r => r.teamId));
  const afterRed = new Set(sortedAfter.slice(1, 8).map(r => r.teamId));
  for (const id of afterRed) {
    if (!beforeRed.has(id)) news.push({ icon: "⬆️", text: `${TEAMS_BY_ID[id]?.name} ingresó al Reducido.` });
  }
  for (const id of beforeRed) {
    if (!afterRed.has(id)) news.push({ icon: "⬇️", text: `${TEAMS_BY_ID[id]?.name} salió del Reducido.` });
  }

  // Goleada de la fecha
  let biggest: Match | null = null;
  for (const m of matches) {
    if (m.homeGoals == null || m.awayGoals == null) continue;
    const diff = Math.abs(m.homeGoals - m.awayGoals);
    if (!biggest || diff > Math.abs((biggest.homeGoals ?? 0) - (biggest.awayGoals ?? 0))) biggest = m;
  }
  if (biggest && Math.abs((biggest.homeGoals ?? 0) - (biggest.awayGoals ?? 0)) >= 3) {
    const h = TEAMS_BY_ID[biggest.home]?.name, a = TEAMS_BY_ID[biggest.away]?.name;
    news.push({ icon: "💥", text: `Goleada de la fecha: ${h} ${biggest.homeGoals} - ${biggest.awayGoals} ${a}.` });
  }

  // Clásicos jugados
  const clasicos = matches.filter(m => m.isClasico);
  for (const c of clasicos) {
    const h = TEAMS_BY_ID[c.home]?.name, a = TEAMS_BY_ID[c.away]?.name;
    news.push({ icon: "🔥", text: `Clásico: ${h} ${c.homeGoals ?? 0} - ${c.awayGoals ?? 0} ${a}.` });
  }

  // Rachas
  const streaks = calcStreaks(allPlayed);
  for (const [teamId, streak] of streaks) {
    if (streak >= 5) news.push({ icon: "🔥", text: `${TEAMS_BY_ID[teamId]?.name} lleva ${streak} partidos invicto.` });
  }

  return news.slice(0, 8);
}

function calcStreaks(played: Match[]): Array<[string, number]> {
  const byTeam = new Map<string, Match[]>();
  for (const m of played) {
    if (!m.played) continue;
    (byTeam.get(m.home) ?? byTeam.set(m.home, []).get(m.home)!).push(m);
    (byTeam.get(m.away) ?? byTeam.set(m.away, []).get(m.away)!).push(m);
  }
  const out: Array<[string, number]> = [];
  for (const [tid, list] of byTeam) {
    const ordered = [...list].sort((a, b) => a.round - b.round);
    let s = 0;
    for (let i = ordered.length - 1; i >= 0; i--) {
      const m = ordered[i];
      const isH = m.home === tid;
      const my = isH ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
      const opp = isH ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
      if (my >= opp) s++;
      else break;
    }
    out.push([tid, s]);
  }
  return out;
}
