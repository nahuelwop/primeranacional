export type Stats = {
  speed: number;   // velocidad
  jump: number;    // salto
  power: number;   // potencia
  defense: number; // defensa
};

export type Team = {
  id: string;
  name: string;       // nombre oficial
  short: string;      // abreviatura para escudo
  city: string;
  zone: "A" | "B";
  primary: string;    // color principal (camiseta)
  secondary: string;  // color secundario / detalles
  stripe?: "vertical" | "horizontal" | "sash" | "solid"; // patrón camiseta
  stats: Stats;
  rivals?: string[];  // ids para fecha de clásicos
};

// Roster basado en la Primera Nacional Argentina 2024 (Zona A y Zona B).
// Stats balanceadas (50–90) para que el simulador y el 1v1 sean parejos.
const t = (
  id: string, name: string, short: string, city: string, zone: "A" | "B",
  primary: string, secondary: string, stripe: Team["stripe"],
  s: Stats, rivals: string[] = []
): Team => ({ id, name, short, city, zone, primary, secondary, stripe, stats: s, rivals });

export const TEAMS: Team[] = [
  // ===== ZONA A =====
  t("aldosivi",       "Aldosivi",                  "ALD", "Mar del Plata",  "A", "#f6c419", "#1a1a1a", "vertical",   { speed: 78, jump: 70, power: 76, defense: 74 }, ["alvarado"]),
  t("alvarado",       "Alvarado",                  "ALV", "Mar del Plata",  "A", "#d61a1a", "#ffffff", "horizontal", { speed: 70, jump: 68, power: 70, defense: 68 }, ["aldosivi"]),
  t("almagro",        "Almagro",                   "ALM", "José Ingenieros","A", "#1a3da6", "#d61a1a", "sash",       { speed: 70, jump: 70, power: 70, defense: 72 }),
  t("allboys",        "All Boys",                  "ALB", "Floresta",       "A", "#ffffff", "#1a1a1a", "horizontal", { speed: 72, jump: 70, power: 72, defense: 70 }, ["nuevachicago"]),
  t("nuevachicago",   "Nueva Chicago",             "NCH", "Mataderos",      "A", "#1a1a1a", "#1aa64a", "sash",       { speed: 72, jump: 74, power: 78, defense: 72 }, ["allboys"]),
  t("atlanta",        "Atlanta",                   "ATL", "Villa Crespo",   "A", "#1a3da6", "#f6c419", "vertical",   { speed: 74, jump: 70, power: 72, defense: 70 }, ["chacarita"]),
  t("chacarita",      "Chacarita Juniors",         "CHA", "San Martín",     "A", "#d61a1a", "#1a1a1a", "vertical",   { speed: 76, jump: 74, power: 78, defense: 74 }, ["atlanta"]),
  t("estudiantesba",  "Estudiantes (BA)",          "ECA", "Caseros",        "A", "#d61a1a", "#ffffff", "horizontal", { speed: 70, jump: 68, power: 72, defense: 72 }),
  t("estudiantesrc",  "Estudiantes (RC)",          "ERC", "Río Cuarto",     "A", "#ffffff", "#1a1a1a", "vertical",   { speed: 72, jump: 70, power: 72, defense: 70 }),
  t("ferro",          "Ferro Carril Oeste",        "FCO", "Caballito",      "A", "#1aa64a", "#ffffff", "horizontal", { speed: 70, jump: 70, power: 70, defense: 76 }),
  t("gimnasiajujuy",  "Gimnasia (J)",              "GYE", "San Salvador",   "A", "#ffffff", "#1a55a6", "vertical",   { speed: 74, jump: 72, power: 74, defense: 72 }),
  t("guemes",         "Güemes",                    "GUE", "Sgo. del Estero","A", "#1a1a1a", "#d61a1a", "vertical",   { speed: 72, jump: 72, power: 72, defense: 72 }, ["mitre"]),
  t("mitre",          "Mitre (SdE)",               "MIT", "Sgo. del Estero","A", "#1a55a6", "#ffffff", "horizontal", { speed: 70, jump: 70, power: 70, defense: 72 }, ["guemes"]),
  t("rafaela",        "Atlético de Rafaela",       "ARF", "Rafaela",        "A", "#9b1a1a", "#ffffff", "horizontal", { speed: 72, jump: 72, power: 74, defense: 76 }),
  t("brownadrogue",   "Brown (A)",                 "BRA", "Adrogué",        "A", "#7a1a1a", "#f6c419", "vertical",   { speed: 70, jump: 70, power: 72, defense: 72 }),
  t("defensoresunidos","Defensores Unidos",        "DUN", "Zárate",         "A", "#1aa64a", "#ffffff", "vertical",   { speed: 68, jump: 68, power: 70, defense: 72 }),
  t("sanmartint",     "San Martín (T)",            "SMT", "Tucumán",        "A", "#d61a1a", "#1a1a1a", "vertical",   { speed: 78, jump: 76, power: 80, defense: 76 }, ["sanmartinsj"]),
  t("arsenal",        "Arsenal",                   "ARS", "Sarandí",        "A", "#1aa6c4", "#d61a1a", "vertical",   { speed: 74, jump: 72, power: 74, defense: 74 }),

  // ===== ZONA B =====
  t("agropecuario",   "Agropecuario",              "AGR", "Carlos Casares", "B", "#1aa64a", "#ffffff", "horizontal", { speed: 72, jump: 70, power: 72, defense: 72 }),
  t("almirantebrown", "Almirante Brown",           "ABR", "Isidro Casanova","B", "#f6c419", "#1a1a1a", "vertical",   { speed: 72, jump: 72, power: 72, defense: 72 }),
  t("brownpm",        "Brown (PM)",                "BPM", "Puerto Madryn",  "B", "#1a3da6", "#ffffff", "vertical",   { speed: 72, jump: 70, power: 72, defense: 74 }),
  t("colon",          "Colón",                     "COL", "Santa Fe",       "B", "#d61a1a", "#1a1a1a", "vertical",   { speed: 76, jump: 74, power: 78, defense: 76 }, ["unionsf"]),
  t("unionsf",        "Unión",                     "UNI", "Santa Fe",       "B", "#d61a1a", "#ffffff", "horizontal", { speed: 76, jump: 74, power: 76, defense: 74 }, ["colon"]),
  t("chaco",          "Chaco For Ever",            "CFE", "Resistencia",    "B", "#1a1a1a", "#d61a1a", "vertical",   { speed: 70, jump: 70, power: 72, defense: 72 }),
  t("deflapampa",     "Defensores de Pronunciam.", "DPP", "Pronunciamiento","B", "#1aa64a", "#ffffff", "horizontal", { speed: 68, jump: 68, power: 70, defense: 70 }),
  t("deportivomadryn","Deportivo Madryn",          "DMA", "Puerto Madryn",  "B", "#1a55a6", "#f6c419", "horizontal", { speed: 74, jump: 72, power: 74, defense: 72 }),
  t("gimnasiamendoza","Gimnasia (M)",              "GMZ", "Mendoza",        "B", "#1a3da6", "#ffffff", "vertical",   { speed: 74, jump: 72, power: 74, defense: 74 }, ["independienter"]),
  t("independienter", "Independiente Rivadavia",   "INR", "Mendoza",        "B", "#1a55a6", "#d61a1a", "vertical",   { speed: 76, jump: 74, power: 78, defense: 74 }, ["gimnasiamendoza"]),
  t("patronato",      "Patronato",                 "PAT", "Paraná",         "B", "#9b1a1a", "#1a1a1a", "vertical",   { speed: 72, jump: 70, power: 72, defense: 74 }),
  t("quilmes",        "Quilmes",                   "QUI", "Quilmes",        "B", "#ffffff", "#1a55a6", "horizontal", { speed: 76, jump: 74, power: 76, defense: 74 }, ["temperley"]),
  t("temperley",      "Temperley",                 "TEM", "Temperley",      "B", "#1aa6c4", "#ffffff", "horizontal", { speed: 72, jump: 72, power: 72, defense: 72 }, ["quilmes"]),
  t("racingcba",      "Racing (C)",                "RCC", "Córdoba",        "B", "#1a55a6", "#ffffff", "horizontal", { speed: 70, jump: 70, power: 70, defense: 72 }),
  t("riestra",        "Deportivo Riestra",         "RIE", "Bajo Flores",    "B", "#ffffff", "#1a1a1a", "vertical",   { speed: 74, jump: 72, power: 74, defense: 74 }),
  t("sanmartinsj",    "San Martín (SJ)",           "SMS", "San Juan",       "B", "#1a3da6", "#ffffff", "vertical",   { speed: 74, jump: 74, power: 76, defense: 74 }, ["sanmartint"]),
  t("villadalmine",   "Villa Dálmine",             "VDA", "Campana",        "B", "#9b1a1a", "#1a1a1a", "vertical",   { speed: 68, jump: 68, power: 70, defense: 70 }),
  t("tristanrey",     "Tristán Suárez",            "TSU", "Tristán Suárez", "B", "#1aa64a", "#ffffff", "vertical",   { speed: 70, jump: 70, power: 70, defense: 70 }),
];

export const TEAMS_BY_ID: Record<string, Team> = Object.fromEntries(TEAMS.map(t => [t.id, t]));
export const ZONE_A = TEAMS.filter(t => t.zone === "A");
export const ZONE_B = TEAMS.filter(t => t.zone === "B");

export function teamRating(t: Team) {
  const s = t.stats;
  return (s.speed + s.jump + s.power + s.defense) / 4;
}
