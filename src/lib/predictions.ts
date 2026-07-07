import { TEAMS_BY_ID, teamRating } from "@/data/teams";
import type { Match, StandingRow } from "@/lib/tournament";

export type Prediction = { home: number; draw: number; away: number };

export function predictMatch(homeId: string, awayId: string, standings: StandingRow[], recent: Match[] = []): Prediction {
  const h = TEAMS_BY_ID[homeId], a = TEAMS_BY_ID[awayId];
  if (!h || !a) return { home: 33, draw: 34, away: 33 };
  const hRow = standings.find(r => r.teamId === homeId);
  const aRow = standings.find(r => r.teamId === awayId);
  const hRating = teamRating(h) + 4; // localía
  const aRating = teamRating(a);
  const hPts = hRow?.pts ?? 0;
  const aPts = aRow?.pts ?? 0;
  const hForm = form(homeId, recent);
  const aForm = form(awayId, recent);
  const hScore = hRating + hPts * 0.5 + hForm * 3;
  const aScore = aRating + aPts * 0.5 + aForm * 3;
  const diff = hScore - aScore;
  // sigmoide simple
  const sig = 1 / (1 + Math.exp(-diff / 8));
  const drawBase = 24;
  const home = Math.round((1 - drawBase / 100) * sig * 100);
  const away = Math.round((1 - drawBase / 100) * (1 - sig) * 100);
  const draw = 100 - home - away;
  return { home, draw, away };
}

function form(teamId: string, matches: Match[]): number {
  const last5 = matches.filter(m => m.played && (m.home === teamId || m.away === teamId)).slice(-5);
  let score = 0;
  for (const m of last5) {
    const isH = m.home === teamId;
    const my = isH ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
    const opp = isH ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
    if (my > opp) score += 3; else if (my === opp) score += 1;
  }
  return score;
}

export function isImportantMatch(homeId: string, awayId: string, standings: StandingRow[]): boolean {
  const h = TEAMS_BY_ID[homeId];
  if (h?.rivals?.includes(awayId)) return true;
  const sorted = [...standings].sort((a, b) => b.pts - a.pts);
  const top4 = new Set(sorted.slice(0, 4).map(r => r.teamId));
  const bot4 = new Set(sorted.slice(-4).map(r => r.teamId));
  if (top4.has(homeId) && top4.has(awayId)) return true;
  if (bot4.has(homeId) && bot4.has(awayId)) return true;
  return false;
}
