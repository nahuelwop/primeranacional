// Definición de logros desbloqueables.
export type AchievementDef = {
  key: string;
  name: string;
  description: string;
  icon: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "campeon_zona_a", name: "Campeón Zona A", description: "Salir 1° en la Zona A en una temporada de carrera.", icon: "🏆" },
  { key: "campeon_zona_b", name: "Campeón Zona B", description: "Salir 1° en la Zona B en una temporada de carrera.", icon: "🏆" },
  { key: "ascenso_directo", name: "Ascenso directo", description: "Ganar la final directa entre los dos campeones de zona.", icon: "⬆️" },
  { key: "100_goles", name: "100 goles", description: "Convertir 100 goles acumulados en modo carrera.", icon: "⚽" },
  { key: "10_invicto", name: "10 invicto", description: "Encadenar 10 partidos sin perder en modo carrera.", icon: "🛡️" },
];

export const ACH_BY_KEY: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map(a => [a.key, a]));
