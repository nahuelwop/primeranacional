import type { CareerState } from "@/lib/career";
import { TEAMS_BY_ID, type Team } from "@/data/teams";
import { COMPETITIONS, type DivisionId } from "@/data/competitions";
import { fetchPlayers, type Player, type Position } from "@/lib/squads";
import { supabase } from "@/integrations/supabase/client";

export type MarketPlayer = Player & {
  rating: number;
  potential: number;
  value: number;
  wage: number;
};

export type CareerMoment = {
  emoji: string;
  title: string;
  text: string;
  round: number;
};

export type DailyChallenge = {
  id: string;
  date: string;
  title: string;
  description: string;
  rewardXp: number;
  kind: "win" | "upset" | "goals" | "clean_sheet" | "classic";
  target?: number;
};

const MARKET_KEY = "ph_market_players_v1";
const NAME_POOL = [
  "Lautaro Medina", "Thiago Sosa", "Bruno Benítez", "Tomás Roldán", "Mateo Gómez",
  "Nicolás Pereyra", "Franco Acuña", "Agustín Vera", "Lucas Ferreyra", "Facundo Duarte",
  "Ezequiel Molina", "Santino Arias", "Valentín Núñez", "Joaquín Correa", "Iván Salvatierra",
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function seeded(key: string, min: number, max: number): number {
  const n = hash(key) % 100000;
  return Math.round(min + (n / 99999) * (max - min));
}

export function careerXpForMatch(myGoals: number, oppGoals: number, isClassic: boolean): number {
  const base = myGoals > oppGoals ? 120 : myGoals === oppGoals ? 75 : 40;
  return base + myGoals * 8 + (oppGoals === 0 ? 25 : 0) + (isClassic && myGoals > oppGoals ? 80 : 0);
}

export function careerLevelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}

export function careerRankTitle(level: number): string {
  if (level >= 50) return "LEYENDA";
  if (level >= 35) return "ÍDOLO";
  if (level >= 25) return "DT DESTACADO";
  if (level >= 15) return "PROMESA";
  if (level >= 8) return "PROFESIONAL";
  return "NOVATO";
}

export function careerXpToNextLevel(xp: number): number {
  const level = careerLevelFromXp(xp);
  return level * level * 100;
}

export function extractMoments(state: CareerState, teamId: string): CareerMoment[] {
  const out: CareerMoment[] = [];
  const played = [...state.matches].filter(m => m.played && (m.home === teamId || m.away === teamId));
  for (const m of played) {
    const mine = m.home === teamId ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
    const opp = m.home === teamId ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
    const rival = TEAMS_BY_ID[m.home === teamId ? m.away : m.home]?.name ?? "el rival";
    const diff = mine - opp;
    if (mine >= 5) out.push({ emoji: "💥", title: "GOLEADA", text: `${mine}-${opp} ante ${rival}. Una paliza para el archivo.`, round: m.round });
    if (diff >= 3 && mine >= 3) out.push({ emoji: "🔥", title: "FESTIVAL", text: `Triunfo por ${diff} goles en la fecha ${m.round}.`, round: m.round });
    if (opp === 0 && mine > 0) out.push({ emoji: "🧤", title: "VALLA INVICTA", text: `${rival} no pudo marcar.`, round: m.round });
    if (mine > opp && (mine + opp >= 5)) out.push({ emoji: "🚨", title: "PARTIDO LOCO", text: `${mine}-${opp}: una fecha para guardar.`, round: m.round });
    if (mine === opp && mine >= 4) out.push({ emoji: "😱", title: "EMPATE DE LOCOS", text: `${mine}-${opp} en un partido completamente descontrolado.`, round: m.round });
    if (m.isClasico) out.push({ emoji: "🔥", title: "CLÁSICO", text: `${mine}-${opp} frente a ${rival}.`, round: m.round });
  }
  const sorted = [...out].sort((a, b) => b.round - a.round);
  return sorted.slice(0, 12);
}

export function buildDailyChallenge(date = new Date()): DailyChallenge {
  const iso = date.toISOString().slice(0, 10);
  const choices: DailyChallenge[] = [
    { id: `${iso}-win`, date: iso, title: "GANÁ Y SUMÁ", description: "Ganale a tu próximo rival.", rewardXp: 250, kind: "win" },
    { id: `${iso}-upset`, date: iso, title: "MATAGIGANTES", description: "Vencé a un rival con mejor valoración general.", rewardXp: 400, kind: "upset" },
    { id: `${iso}-goals`, date: iso, title: "FÚTBOL TOTAL", description: "Convertí 4 goles o más en un partido.", rewardXp: 300, kind: "goals", target: 4 },
    { id: `${iso}-clean`, date: iso, title: "ARCO EN CERO", description: "Ganale a un rival sin recibir goles.", rewardXp: 300, kind: "clean_sheet" },
    { id: `${iso}-classic`, date: iso, title: "DÍA DE CLÁSICO", description: "Ganá un clásico.", rewardXp: 450, kind: "classic" },
  ];
  return choices[hash(iso) % choices.length];
}

export function isDailyChallengeComplete(challenge: DailyChallenge, state: CareerState, teamId: string): boolean {
  const played = state.matches.filter(m => m.played && (m.home === teamId || m.away === teamId));
  for (const m of played) {
    const mine = m.home === teamId ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
    const opp = m.home === teamId ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
    if (challenge.kind === "win" && mine > opp) return true;
    if (challenge.kind === "goals" && mine >= (challenge.target ?? 4)) return true;
    if (challenge.kind === "clean_sheet" && mine > opp && opp === 0) return true;
    if (challenge.kind === "classic" && m.isClasico && mine > opp) return true;
    if (challenge.kind === "upset" && mine > opp) {
      const a = TEAMS_BY_ID[m.home]?.stats;
      const b = TEAMS_BY_ID[m.away]?.stats;
      const meRating = (m.home === teamId ? a : b) ? ((m.home === teamId ? a : b)!.speed + (m.home === teamId ? a : b)!.jump + (m.home === teamId ? a : b)!.power + (m.home === teamId ? a : b)!.defense) : 0;
      const oppRating = (m.home === teamId ? b : a) ? ((m.home === teamId ? b : a)!.speed + (m.home === teamId ? b : a)!.jump + (m.home === teamId ? b : a)!.power + (m.home === teamId ? b : a)!.defense) : 0;
      if (meRating < oppRating) return true;
    }
  }
  return false;
}

export function getCareerRecords(state: CareerState, teamId: string) {
  const played = state.matches.filter(m => m.played && (m.home === teamId || m.away === teamId));
  const maxGoals = played.reduce((best, m) => Math.max(best, m.home === teamId ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0)), 0);
  const maxDiff = played.reduce((best, m) => {
    const mine = m.home === teamId ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
    const opp = m.home === teamId ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
    return Math.max(best, mine - opp);
  }, 0);
  return {
    matches: state.totalMatchesPlayed ?? played.length,
    wins: state.totalWins ?? 0,
    goals: state.totalGoalsScored,
    bestUnbeaten: state.bestUnbeaten,
    trophies: state.careerTrophies ?? 0,
    biggestWin: maxDiff,
    goalsInMatch: maxGoals,
    seasons: state.seasonHistory?.length ?? 0,
  };
}

export function marketPlayersFromRows(rows: Player[], clubIds: string[]): MarketPlayer[] {
  const clubs = new Set(clubIds);
  const selected = rows.filter(p => !clubs.has(p.team_id)).slice(0, 80);
  const source = selected.length ? selected : rows.slice(0, 80);
  return source.map((p, i) => {
    const key = `${p.id}-${p.name}-${i}`;
    const rating = seeded(key + "r", 58, 79);
    const potential = Math.max(rating, seeded(key + "p", rating, Math.min(92, rating + 12)));
    const value = seeded(key + "v", 350, 2400);
    return { ...p, rating, potential, value, wage: Math.round(value / 50) };
  });
}

export async function fetchMarketPlayers(clubIds: string[]): Promise<MarketPlayer[]> {
  const { data, error } = await supabase
    .from("team_players")
    .select("id,team_id,name,position,shirt_number,birth_date,height_cm,sort_order")
    .order("sort_order", { ascending: true })
    .limit(180);
  if (!error && data?.length) return marketPlayersFromRows(data as Player[], clubIds);

  return NAME_POOL.map((name, i) => {
    const positions: Position[] = ["arquero", "defensa", "medio", "delantero"];
    const rating = seeded(name, 60, 77);
    return {
      id: `market-${i}`, team_id: clubIds[i % Math.max(1, clubIds.length)] ?? "market",
      name, position: positions[i % 4], shirt_number: null, birth_date: null, height_cm: null, sort_order: i,
      rating, potential: Math.min(90, rating + seeded(name + "pot", 0, 12)), value: seeded(name + "val", 300, 1700), wage: seeded(name + "w", 10, 80),
    };
  });
}

export function rivalStats(state: CareerState, teamId: string, rivalId: string) {
  const all = [...state.matches, ...(state.otherMatches ?? [])].filter(m => m.played && ((m.home === teamId && m.away === rivalId) || (m.away === teamId && m.home === rivalId)));
  let w = 0, d = 0, l = 0;
  for (const m of all) {
    const mine = m.home === teamId ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
    const opp = m.home === teamId ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
    if (mine > opp) w++; else if (mine === opp) d++; else l++;
  }
  return { played: all.length, wins: w, draws: d, losses: l };
}

export function competitionLabel(division: DivisionId, round = 0): string {
  const comp = COMPETITIONS[division];
  return round > 0 ? `${comp.shortName} · Fecha ${round}` : comp.name;
}
