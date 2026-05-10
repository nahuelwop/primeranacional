export type Stats = {
  speed: number;   // velocidad
  jump: number;    // salto
  power: number;   // potencia
  defense: number; // defensa
};

export type Team = {
  id: string;
  name: string;
  short: string;
  city: string;
  zone: "A" | "B";
  primary: string;
  secondary: string;
  stripe?: "vertical" | "horizontal" | "sash" | "solid";
  stats: Stats;
  rivals?: string[];
};

const t = (
  id: string, name: string, short: string, city: string, zone: "A" | "B",
  primary: string, secondary: string, stripe: Team["stripe"],
  s: Stats, rivals: string[] = []
): Team => ({ id, name, short, city, zone, primary, secondary, stripe, stats: s, rivals });

// ===========================================================
// Roster oficial Primera Nacional (definido por el usuario)
// 18 equipos por zona · 36 en total.
// ===========================================================
export const TEAMS: Team[] = [
  // ===== ZONA A =====
  t("allboys",        "All Boys",                "ALB", "Floresta",          "A", "#ffffff", "#1a1a1a", "horizontal", { speed: 74, jump: 70, power: 72, defense: 72 }, ["nuevachicago"]),
  t("ferro",          "Ferro Carril Oeste",      "FCO", "Caballito",         "A", "#1aa64a", "#ffffff", "horizontal", { speed: 72, jump: 70, power: 72, defense: 76 }, ["atlanta"]),
  t("depmadryn",      "Deportivo Madryn",        "DMA", "Puerto Madryn",     "A", "#1a55a6", "#f6c419", "horizontal", { speed: 76, jump: 74, power: 76, defense: 74 }),
  t("chacoforever",   "Chaco For Ever",          "CFE", "Resistencia",       "A", "#1a1a1a", "#d61a1a", "vertical",   { speed: 72, jump: 72, power: 74, defense: 72 }),
  t("depmoron",       "Deportivo Morón",         "DMO", "Morón",             "A", "#9b1a1a", "#ffffff", "horizontal", { speed: 72, jump: 72, power: 74, defense: 72 }),
  t("estudiantesba",  "Estudiantes (BA)",        "ECA", "Caseros",           "A", "#d61a1a", "#ffffff", "horizontal", { speed: 70, jump: 70, power: 72, defense: 72 }),
  t("racingcba",      "Racing de Córdoba",       "RCC", "Nueva Italia",      "A", "#7ec8ff", "#ffffff", "horizontal", { speed: 74, jump: 72, power: 74, defense: 72 }),
  t("losandes",       "Los Andes",               "LAN", "Lomas de Zamora",   "A", "#9b1a1a", "#ffffff", "vertical",   { speed: 70, jump: 70, power: 72, defense: 72 }, ["temperley"]),
  t("mitre",          "Mitre (SdE)",             "MIT", "Sgo. del Estero",   "A", "#1a55a6", "#ffffff", "horizontal", { speed: 72, jump: 72, power: 72, defense: 72 }, ["guemes"]),
  t("almirantebrown", "Almirante Brown",         "ABR", "Isidro Casanova",   "A", "#f6c419", "#1a1a1a", "vertical",   { speed: 72, jump: 72, power: 72, defense: 72 }),
  t("ciudadbolivar",  "Ciudad de Bolívar",       "CBV", "Bolívar",           "A", "#ffffff", "#d61a1a", "vertical",   { speed: 68, jump: 68, power: 70, defense: 70 }),
  t("colon",          "Colón",                   "COL", "Santa Fe",          "A", "#d61a1a", "#1a1a1a", "vertical",   { speed: 78, jump: 74, power: 80, defense: 76 }, ["patronato"]),
  t("centralnorte",   "Central Norte",           "CNR", "Salta",             "A", "#d61a1a", "#1a1a1a", "vertical",   { speed: 72, jump: 72, power: 74, defense: 72 }, ["gimnasiatiro"]),
  t("godoycruz",      "Godoy Cruz",              "GDC", "Mendoza",           "A", "#1a3da6", "#ffffff", "horizontal", { speed: 80, jump: 76, power: 80, defense: 78 }),
  t("santelmo",       "San Telmo",               "STL", "San Telmo",         "A", "#1a55a6", "#d61a1a", "horizontal", { speed: 70, jump: 70, power: 70, defense: 72 }),
  t("sanmiguel",      "San Miguel",              "SMG", "San Miguel",        "A", "#d61a1a", "#1aa64a", "vertical",   { speed: 70, jump: 70, power: 70, defense: 70 }),
  t("defbelgrano",    "Defensores de Belgrano",  "DEB", "Núñez",             "A", "#d61a1a", "#ffffff", "vertical",   { speed: 72, jump: 70, power: 72, defense: 74 }),
  t("acassuso",       "Acassuso",                "ACA", "San Isidro",        "A", "#7a1aa6", "#ffffff", "horizontal", { speed: 70, jump: 70, power: 70, defense: 70 }),

  // ===== ZONA B =====
  t("nuevachicago",   "Nueva Chicago",           "NCH", "Mataderos",         "B", "#1aa64a", "#1a1a1a", "vertical",   { speed: 74, jump: 74, power: 78, defense: 72 }, ["allboys"]),
  t("chacarita",      "Chacarita Juniors",       "CHA", "San Martín",        "B", "#d61a1a", "#1a1a1a", "vertical",   { speed: 76, jump: 74, power: 78, defense: 74 }),
  t("atlanta",        "Atlanta",                 "ATL", "Villa Crespo",      "B", "#1a3da6", "#f6c419", "vertical",   { speed: 74, jump: 70, power: 72, defense: 70 }, ["ferro"]),
  t("sanmartint",     "San Martín (T)",          "SMT", "Tucumán",           "B", "#d61a1a", "#1a1a1a", "vertical",   { speed: 78, jump: 76, power: 80, defense: 76 }),
  t("gimnasiajujuy",  "Gimnasia (J)",            "GYE", "San Salvador",      "B", "#ffffff", "#1a55a6", "vertical",   { speed: 74, jump: 72, power: 74, defense: 72 }),
  t("almagro",        "Almagro",                 "ALM", "José Ingenieros",   "B", "#1a3da6", "#d61a1a", "sash",       { speed: 70, jump: 70, power: 70, defense: 72 }),
  t("sanmartinsj",    "San Martín (SJ)",         "SMS", "San Juan",          "B", "#1aa64a", "#1a1a1a", "vertical",   { speed: 74, jump: 74, power: 76, defense: 74 }),
  t("temperley",      "Temperley",               "TEM", "Temperley",         "B", "#7ec8ff", "#ffffff", "horizontal", { speed: 72, jump: 72, power: 72, defense: 72 }, ["losandes"]),
  t("guemes",         "Güemes (SdE)",            "GUE", "Sgo. del Estero",   "B", "#1a1a1a", "#ffffff", "vertical",   { speed: 72, jump: 72, power: 72, defense: 72 }, ["mitre"]),
  t("tristanrey",     "Tristán Suárez",          "TSU", "Tristán Suárez",    "B", "#f6c419", "#1a3da6", "horizontal", { speed: 70, jump: 70, power: 70, defense: 70 }),
  t("agropecuario",   "Agropecuario",            "AGR", "Carlos Casares",    "B", "#1aa64a", "#ffffff", "horizontal", { speed: 72, jump: 70, power: 72, defense: 72 }),
  t("patronato",      "Patronato",               "PAT", "Paraná",            "B", "#9b1a1a", "#1a1a1a", "vertical",   { speed: 72, jump: 70, power: 72, defense: 74 }, ["colon"]),
  t("gimnasiatiro",   "Gimnasia y Tiro",         "GYT", "Salta",             "B", "#d61a1a", "#1a55a6", "horizontal", { speed: 70, jump: 70, power: 70, defense: 72 }, ["centralnorte"]),
  t("depmaipu",       "Deportivo Maipú",         "DMP", "Mendoza",           "B", "#d61a1a", "#ffffff", "horizontal", { speed: 72, jump: 72, power: 72, defense: 72 }),
  t("quilmes",        "Quilmes",                 "QUI", "Quilmes",           "B", "#ffffff", "#7ec8ff", "horizontal", { speed: 76, jump: 74, power: 76, defense: 74 }),
  t("colegiales",     "Colegiales",              "CLG", "Munro",             "B", "#1a1a1a", "#d61a1a", "horizontal", { speed: 70, jump: 70, power: 70, defense: 70 }),
  t("rafaela",        "Atlético de Rafaela",     "ARF", "Rafaela",           "B", "#ffffff", "#7ec8ff", "horizontal", { speed: 72, jump: 72, power: 74, defense: 76 }),
  t("midland",        "Midland",                 "MID", "Libertad",          "B", "#d61a1a", "#1a3da6", "vertical",   { speed: 68, jump: 68, power: 70, defense: 70 }),
];

export const TEAMS_BY_ID: Record<string, Team> = Object.fromEntries(TEAMS.map(t => [t.id, t]));
export const ZONE_A = TEAMS.filter(t => t.zone === "A");
export const ZONE_B = TEAMS.filter(t => t.zone === "B");

// Clásicos interzonales declarados por el usuario.
export const CLASICOS_INTERZONALES: Array<[string, string]> = [
  ["allboys",     "nuevachicago"],
  ["ferro",       "atlanta"],
  ["losandes",    "temperley"],
  ["colon",       "patronato"],
  ["mitre",       "guemes"],
  ["centralnorte","gimnasiatiro"],
];

export function teamRating(t: Team) {
  const s = t.stats;
  return (s.speed + s.jump + s.power + s.defense) / 4;
}
