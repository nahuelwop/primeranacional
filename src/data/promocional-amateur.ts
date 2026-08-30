import type { Team } from "./teams";

export type PromocionalZone = "A" | "B";

type Seed = {
  id: string;
  name: string;
  short: string;
  zone: PromocionalZone;
  speed: number;
  jump: number;
  power: number;
  defense: number;
};

// La fuente proporcionada no asigna individualmente los 17 clubes a Zona A/B.
// Para que el torneo sea funcional desde el comienzo, se tomó el orden de la
// nómina: puestos 1-8 -> Zona A; puestos 9-17 -> Zona B. Es una asignación
// técnica provisional y queda concentrada en esta lista para poder cambiarla
// después sin tocar el motor del torneo.
const SEEDS: Seed[] = [
  ["deportivometalurgico", "Deportivo Metalúrgico", "MET", "A", 66,69,67,65],
  ["satmoreno", "SAT Moreno", "SAT", "A", 64,66,65,64],
  ["defensoresdeglew", "Defensores de Glew", "DG", "A", 68,70,67,67],
  ["nauticohacoaj", "Náutico Hacoaj", "HAC", "A", 65,68,65,66],
  ["estrelladeberisso", "Estrella de Berisso", "EDB", "A", 61,62,62,60],
  ["atleticopilar", "Atlético Pilar", "AP", "A", 59,60,60,58],
  ["provincialdelobos", "Provincial de Lobos", "PDL", "A", 56,56,58,55],
  ["juventuddebernal", "Juventud de Bernal", "JDB", "A", 55,55,57,54],
  ["barrancasumetfc", "Barrancas UMET FC", "BUF", "B", 63,65,64,62],
  ["buenosairescityfc", "Buenos Aires City FC", "BAC", "B", 62,64,62,61],
  ["uribelarrea", "Uribelarrea FC", "URI", "B", 61,64,61,62],
  ["fcezeiza", "Fútbol Club Ezeiza", "FCE", "B", 60,61,62,59],
  ["belgranodezarate", "Belgrano de Zárate", "BDZ", "B", 59,60,61,60],
  ["alumniloshornos", "Alumni Los Hornos", "ALH", "B", 60,61,60,58],
  ["controlorientado", "Control Orientado", "COR", "B", 58,60,60,57],
  ["lasmandarinas", "Las Mandarinas", "LMA", "B", 57,58,59,56],
  ["evertondelaplata", "Everton de La Plata", "EDL", "B", 58,59,58,57],
].map(([id,name,short,zone,speed,jump,power,defense]) => ({
  id: String(id), name: String(name), short: String(short), zone: zone as PromocionalZone,
  speed: Number(speed), jump: Number(jump), power: Number(power), defense: Number(defense),
}));

export const PROMOCIONAL_AMATEUR_TEAMS: Team[] = SEEDS.map(s => ({
  id: s.id,
  name: s.name,
  short: s.short,
  city: "Buenos Aires",
  zone: s.zone,
  division: "promocional_amateur",
  primary: "#6b7280",
  secondary: "#111827",
  stripe: "solid",
  stats: { speed: s.speed, jump: s.jump, power: s.power, defense: s.defense },
  rivals: [],
  logoUrl: null,
}));

export const PROMOCIONAL_ZONE_A = PROMOCIONAL_AMATEUR_TEAMS.filter(t => t.zone === "A");
export const PROMOCIONAL_ZONE_B = PROMOCIONAL_AMATEUR_TEAMS.filter(t => t.zone === "B");

export const PROMOCIONAL_TEAM_META = new Map(
  PROMOCIONAL_AMATEUR_TEAMS.map(t => [t.id, { zone: t.zone }]),
);
