// Logros desbloqueables del Modo Carrera.
export type AchievementDef = {
  key: string;
  name: string;
  description: string;
  icon: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "debut_carrera", name: "Primer paso", description: "Disputar tu primer partido en Modo Carrera.", icon: "👟" },
  { key: "primera_victoria", name: "Primera victoria", description: "Ganar tu primer partido.", icon: "✅" },
  { key: "10_victorias", name: "Diez triunfos", description: "Conseguir 10 victorias en tu carrera.", icon: "🔟" },
  { key: "25_victorias", name: "Racha ganadora", description: "Conseguir 25 victorias en tu carrera.", icon: "🔥" },
  { key: "50_victorias", name: "Ganador serial", description: "Conseguir 50 victorias en tu carrera.", icon: "👑" },
  { key: "100_goles", name: "100 goles", description: "Convertir 100 goles acumulados en Modo Carrera.", icon: "⚽" },
  { key: "250_goles", name: "250 goles", description: "Convertir 250 goles acumulados.", icon: "🥅" },
  { key: "500_goles", name: "500 goles", description: "Convertir 500 goles acumulados.", icon: "🚀" },
  { key: "10_invicto", name: "10 invicto", description: "Encadenar 10 partidos sin perder.", icon: "🛡️" },
  { key: "20_invicto", name: "Muralla", description: "Encadenar 20 partidos sin perder.", icon: "🧱" },
  { key: "10_vallas_invictas", name: "Arco en cero", description: "Mantener la valla invicta en 10 partidos.", icon: "🥷" },
  { key: "primer_titulo", name: "A las vitrinas", description: "Conseguir tu primer título de carrera.", icon: "🏆" },
  { key: "tres_titulos", name: "Coleccionista", description: "Conseguir 3 títulos.", icon: "🏅" },
  { key: "5_trofeos", name: "Pentacampeón", description: "Lograr 5 trofeos o ascensos importantes.", icon: "🏆" },
  { key: "ascenso", name: "Ascenso", description: "Ascender de categoría por primera vez.", icon: "⬆️" },
  { key: "ascenso_a_primera", name: "Llegar a Primera", description: "Ascender hasta la Primera División.", icon: "🌟" },
  { key: "campeon_zona_a", name: "Campeón Zona A", description: "Salir 1° en una Zona A durante una temporada.", icon: "🏆" },
  { key: "campeon_zona_b", name: "Campeón Zona B", description: "Salir 1° en una Zona B durante una temporada.", icon: "🏆" },
  { key: "campeon_primera", name: "Campeón de Primera", description: "Ser campeón de Primera División.", icon: "🥇" },
  { key: "permanencia", name: "Objetivo cumplido", description: "Mantener la categoría tras una temporada completa.", icon: "🟢" },
  { key: "caja_5000", name: "Caja fuerte", description: "Acumular $5.000 de presupuesto.", icon: "💰" },
  { key: "caja_15000", name: "Club solvente", description: "Acumular $15.000 de presupuesto.", icon: "💵" },
  { key: "caja_30000", name: "Potencia económica", description: "Acumular $30.000 de presupuesto.", icon: "💎" },
  { key: "proyecto_club", name: "Construyendo", description: "Comprar 3 niveles de desarrollo para el club.", icon: "🏗️" },
  { key: "club_de_primera", name: "Proyecto gigante", description: "Comprar 8 niveles de desarrollo.", icon: "🏟️" },
  { key: "seca_nuca", name: "¿VAR? ¿Qué VAR?", description: "Activar la opción Seca Nuca.", icon: "😈" },
];

export const ACH_BY_KEY: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map(a => [a.key, a]));
