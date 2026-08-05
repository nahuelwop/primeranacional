import { TEAMS_BY_ID } from "@/data/teams";
import type { CareerState } from "@/lib/career";
import { sortStandings, type Match } from "@/lib/tournament";

export type CareerNews = {
  id: string;
  icon: string;
  title: string;
  body: string;
  time: string;
};

/**
 * Noticias dinámicas del club. Sin fotos ni rostros: solo estadios, tribunas,
 * hinchadas, clima, infraestructura, entrenamientos y prensa.
 */
export function buildCareerNews(state: CareerState, teamId: string, budget: number, season: number): CareerNews[] {
  const me = TEAMS_BY_ID[teamId];
  const table = sortStandings(state.standings);
  const pos = table.findIndex(r => r.teamId === teamId) + 1;
  const next = state.matches.find(m => !m.played && (m.home === teamId || m.away === teamId));
  const isHome = next ? next.home === teamId : true;
  const rival = next ? TEAMS_BY_ID[next.home === teamId ? next.away : next.home] : undefined;
  const played = state.matches.filter(m => m.played && (m.home === teamId || m.away === teamId));
  const last = played[played.length - 1];
  const upgrades = state.stadiumUpgrades ?? { capacity: false, pitch: false, vip: false, led: false };
  const upgradeCount = Object.values(upgrades).filter(Boolean).length;

  const out: CareerNews[] = [];
  const push = (icon: string, title: string, body: string, time: string) =>
    out.push({ id: `${out.length}-${title}`, icon, title, body, time });

  if (next) {
    push("🎟️",
      isHome ? `${(me?.short ?? "El estadio").toUpperCase()} AGOTÓ ENTRADAS` : "OPERATIVO DE VIAJE EN MARCHA",
      isHome
        ? `Gran expectativa para recibir a ${rival?.name ?? "el rival"} en la fecha ${next.round}.`
        : `El plantel viaja a ${rival?.city ?? "el interior"} para enfrentar a ${rival?.name ?? "el rival"}.`,
      "Hace 2 horas");
  }

  push("🚧", "ENTRENAMIENTO COMPLETADO",
    state.streakUnbeaten > 0
      ? `La semana de trabajo terminó sin novedades y con ${state.streakUnbeaten} fecha(s) de invicto.`
      : "La semana de trabajo terminó sin novedades en el predio.",
    "Hace 5 horas");

  if (upgradeCount > 0) {
    push("🏟️", "OBRAS EN LA SEDE",
      `Avanzan las mejoras en las instalaciones del club (${upgradeCount} obra(s) terminada(s)).`, "Ayer");
  } else {
    push("🏗️", "PROYECTO DE INFRAESTRUCTURA",
      "La dirigencia analiza nuevas obras para modernizar el estadio.", "Ayer");
  }

  if (last) {
    const mine = last.home === teamId ? (last.homeGoals ?? 0) : (last.awayGoals ?? 0);
    const opp = last.home === teamId ? (last.awayGoals ?? 0) : (last.homeGoals ?? 0);
    const other = TEAMS_BY_ID[last.home === teamId ? last.away : last.home];
    push(mine > opp ? "🎆" : mine === opp ? "📣" : "🌧️",
      mine > opp ? "FIESTA EN LAS TRIBUNAS" : mine === opp ? "REPARTO DE PUNTOS" : "AUTOCRÍTICA EN CONFERENCIA",
      `${mine}-${opp} ante ${other?.name ?? "el rival"} en la fecha ${last.round}. ${
        mine > opp ? "Bengalas y papelitos coparon la popular." : mine === opp ? "El punto deja sabor a poco en la platea." : "El cuerpo técnico pidió calma en la sala de prensa."
      }`,
      "Hace 2 días");
  }

  push("💲", "MOVIMIENTO ECONÓMICO",
    `La caja del club marca $${Math.round(budget).toLocaleString("es-AR")} tras el balance de la temporada ${season}.`,
    "Ayer");

  push("🌤️", "EL CLIMA PODRÍA INFLUIR",
    "Pronóstico inestable para la próxima fecha: el estado del campo será clave.", "Hoy");

  push("📣", "GRAN APOYO DE LA HINCHADA",
    pos > 0 && pos <= 8
      ? `Con el equipo ${pos}° en la zona, la hinchada prepara un recibimiento con humo y banderas.`
      : "Pese al momento, la hinchada organiza un banderazo de apoyo.",
    "Hoy");

  return out.slice(0, 6);
}

export function nextRivals(state: CareerState, teamId: string, n = 4): Match[] {
  return state.matches.filter(m => !m.played && (m.home === teamId || m.away === teamId)).slice(0, n);
}
