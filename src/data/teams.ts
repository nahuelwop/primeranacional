export type Stats = {
  speed: number;
  jump: number;
  power: number;
  defense: number;
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
  logoUrl?: string | null;
  goalAudios?: string[];
  hinchadas?: string[];
};

const t = (
  id: string, name: string, short: string, city: string, zone: "A" | "B",
  primary: string, secondary: string, stripe: Team["stripe"],
  s: Stats, rivals: string[] = [], logoUrl: string | null = null,
): Team => ({ id, name, short, city, zone, primary, secondary, stripe, stats: s, rivals, logoUrl });

// Datos iniciales / fallback. La fuente de verdad en runtime es la base de datos
// (ver `src/lib/teams-sync.ts`); los cambios del admin se aplican mutando estos
// objetos en su lugar para que todos los consumidores existentes sigan andando.
export const TEAMS: Team[] = [
  // ===== ZONA A =====
  t("allboys",        "All Boys",                "ALB", "Floresta",          "A", "#ffffff", "#1a1a1a", "horizontal", { speed: 72, jump: 71, power: 72, defense: 73 }, ["nuevachicago"], "https://upload.wikimedia.org/wikipedia/commons/7/7b/Escudo_del_Club_Atl%C3%A9tico_All_Boys.svg"),
  t("ferro",          "Ferro Carril Oeste",      "FCO", "Caballito",         "A", "#1aa64a", "#ffffff", "horizontal", { speed: 76, jump: 74, power: 77, defense: 79 }, ["atlanta"], "https://upload.wikimedia.org/wikipedia/commons/c/c6/Escudo_del_Club_Ferro_Carril_Oeste.svg"),
  t("depmadryn",      "Deportivo Madryn",        "DMA", "Puerto Madryn",     "A", "#1a55a6", "#f6c419", "horizontal", { speed: 77, jump: 75, power: 78, defense: 75 }, [], "https://upload.wikimedia.org/wikipedia/commons/5/50/Escudo_del_Club_Social_y_Deportivo_Madryn.svg"),
  t("chacoforever",   "Chaco For Ever",          "CFE", "Resistencia",       "A", "#1a1a1a", "#d61a1a", "vertical",   { speed: 72, jump: 71, power: 73, defense: 72 }, [], "https://upload.wikimedia.org/wikipedia/commons/1/1e/Chaco_For_Ever-ARG.png"),
  t("depmoron",       "Deportivo Morón",         "DMO", "Morón",             "A", "#9b1a1a", "#ffffff", "horizontal", { speed: 73, jump: 72, power: 74, defense: 74 }, [], "https://upload.wikimedia.org/wikipedia/commons/6/63/Moron_Escudo_Actual_2024.png"),
  t("estudiantesba",  "Estudiantes (BA)",        "ECA", "Caseros",           "A", "#d61a1a", "#ffffff", "horizontal", { speed: 72, jump: 71, power: 73, defense: 75 }, [], "https://upload.wikimedia.org/wikipedia/commons/e/e2/Escudo_del_Club_Atl%C3%A9tico_Estudiantes_de_Buenos_Aires.svg"),
  t("racingcba",      "Racing de Córdoba",       "RCC", "Nueva Italia",      "A", "#7ec8ff", "#ffffff", "horizontal", { speed: 75, jump: 73, power: 75, defense: 73 }, [], "https://upload.wikimedia.org/wikipedia/commons/f/fa/Escudo_del_Club_Racing_de_C%C3%B3rdoba.svg"),
  t("losandes",       "Los Andes",               "LAN", "Lomas de Zamora",   "A", "#9b1a1a", "#ffffff", "vertical",   { speed: 70, jump: 70, power: 71, defense: 71 }, ["temperley"], "https://upload.wikimedia.org/wikipedia/commons/2/20/Escudo_del_Club_Atl%C3%A9tico_Los_Andes.svg"),
  t("mitre",          "Mitre (SdE)",             "MIT", "Sgo. del Estero",   "A", "#1a55a6", "#ffffff", "horizontal", { speed: 71, jump: 71, power: 72, defense: 72 }, ["guemes"], "https://upload.wikimedia.org/wikipedia/commons/8/86/Escudo_del_Club_Atletico_Mitre.svg"),
  t("almirantebrown", "Almirante Brown",         "ABR", "Isidro Casanova",   "A", "#f6c419", "#1a1a1a", "vertical",   { speed: 71, jump: 71, power: 72, defense: 73 }, [], "https://upload.wikimedia.org/wikipedia/commons/f/f4/Escudo_del_Club_Almirante_Brown.svg"),
  t("ciudadbolivar",  "Ciudad de Bolívar",       "CBV", "Bolívar",           "A", "#ffffff", "#d61a1a", "vertical",   { speed: 67, jump: 67, power: 69, defense: 69 }),
  t("colon",          "Colón",                   "COL", "Santa Fe",          "A", "#d61a1a", "#1a1a1a", "vertical",   { speed: 81, jump: 77, power: 83, defense: 79 }, ["patronato"], "https://upload.wikimedia.org/wikipedia/commons/1/17/Escudo_del_Club_Atl%C3%A9tico_Col%C3%B3n.svg"),
  t("centralnorte",   "Central Norte",           "CNR", "Salta",             "A", "#d61a1a", "#1a1a1a", "vertical",   { speed: 72, jump: 72, power: 73, defense: 72 }, ["gimnasiatiro"], "https://upload.wikimedia.org/wikipedia/commons/4/45/Escudo_Central_Norte_Argentino.png"),
  t("godoycruz",      "Godoy Cruz",              "GDC", "Mendoza",           "A", "#1a3da6", "#ffffff", "horizontal", { speed: 84, jump: 79, power: 85, defense: 82 }, [], "https://upload.wikimedia.org/wikipedia/commons/8/84/Escudo_del_Club_Deportivo_Godoy_Cruz_Antonio_Tomba.svg"),
  t("santelmo",       "San Telmo",               "STL", "San Telmo",         "A", "#1a55a6", "#d61a1a", "horizontal", { speed: 71, jump: 70, power: 71, defense: 72 }, [], "https://upload.wikimedia.org/wikipedia/commons/3/3f/Club_Atl%C3%A9tico_San_Telmo_(logo).svg"),
  t("sanmiguel",      "San Miguel",              "SMG", "San Miguel",        "A", "#d61a1a", "#1aa64a", "vertical",   { speed: 73, jump: 72, power: 74, defense: 73 }, [], "https://upload.wikimedia.org/wikipedia/commons/c/ce/CLUB_ATLETICO_SAN_MIGUEL.png"),
  t("defbelgrano",    "Defensores de Belgrano",  "DEB", "Núñez",             "A", "#d61a1a", "#ffffff", "vertical",   { speed: 73, jump: 71, power: 73, defense: 76 }, [], "https://upload.wikimedia.org/wikipedia/commons/f/f2/Defensores_de_Belgrano_Logo.svg"),
  t("acassuso",       "Acassuso",                "ACA", "San Isidro",        "A", "#7a1aa6", "#ffffff", "horizontal", { speed: 68, jump: 68, power: 69, defense: 69 }),

  // ===== ZONA B =====
  t("nuevachicago",   "Nueva Chicago",           "NCH", "Mataderos",         "B", "#1aa64a", "#1a1a1a", "vertical",   { speed: 76, jump: 75, power: 79, defense: 74 }, ["allboys"], "https://upload.wikimedia.org/wikipedia/commons/c/cd/Escudo_del_Club_Atl%C3%A9tico_Nueva_Chicago.svg"),
  t("chacarita",      "Chacarita Juniors",       "CHA", "San Martín",        "B", "#d61a1a", "#1a1a1a", "vertical",   { speed: 79, jump: 76, power: 81, defense: 76 }, [], "https://upload.wikimedia.org/wikipedia/commons/a/a0/Escudo_del_Club_Atl%C3%A9tico_Chacarita_Juniors.svg"),
  t("atlanta",        "Atlanta",                 "ATL", "Villa Crespo",      "B", "#1a3da6", "#f6c419", "vertical",   { speed: 74, jump: 72, power: 73, defense: 72 }, ["ferro"], "https://upload.wikimedia.org/wikipedia/commons/8/87/Escudoatlanta.png"),
  t("sanmartint",     "San Martín (T)",          "SMT", "Tucumán",           "B", "#d61a1a", "#1a1a1a", "vertical",   { speed: 82, jump: 78, power: 84, defense: 80 }, [], "https://upload.wikimedia.org/wikipedia/commons/6/64/Escudo_del_Club_San_Martin_de_Tucum%C3%A9n.svg"),
  t("gimnasiajujuy",  "Gimnasia (J)",            "GYE", "San Salvador",      "B", "#ffffff", "#1a55a6", "vertical",   { speed: 74, jump: 73, power: 74, defense: 73 }, [], "https://upload.wikimedia.org/wikipedia/commons/7/7e/Escudo_de_Gimnasia_y_Esgrima_de_Jujuy.svg"),
  t("almagro",        "Almagro",                 "ALM", "José Ingenieros",   "B", "#1a3da6", "#d61a1a", "sash",       { speed: 70, jump: 70, power: 71, defense: 72 }, [], "https://upload.wikimedia.org/wikipedia/commons/5/50/Almagro_escudo2024.png"),
  t("sanmartinsj",    "San Martín (SJ)",         "SMS", "San Juan",          "B", "#1aa64a", "#1a1a1a", "vertical",   { speed: 77, jump: 75, power: 78, defense: 76 }, [], "https://upload.wikimedia.org/wikipedia/commons/b/bd/Escudo_de_San_Martin_de_San_Juan.svg"),
  t("temperley",      "Temperley",               "TEM", "Temperley",         "B", "#7ec8ff", "#ffffff", "horizontal", { speed: 72, jump: 72, power: 73, defense: 73 }, ["losandes"], "https://upload.wikimedia.org/wikipedia/commons/e/e9/Club-Atl%C3%A9tico-Temperley.png"),
  t("guemes",         "Güemes (SdE)",            "GUE", "Sgo. del Estero",   "B", "#1a1a1a", "#ffffff", "vertical",   { speed: 71, jump: 71, power: 72, defense: 71 }, ["mitre"]),
  t("tristanrey",     "Tristán Suárez",          "TSU", "Tristán Suárez",    "B", "#f6c419", "#1a3da6", "horizontal", { speed: 70, jump: 70, power: 70, defense: 71 }, [], "https://upload.wikimedia.org/wikipedia/commons/f/f8/Escudo_Final_TS_PNG.png"),
  t("agropecuario",   "Agropecuario",            "AGR", "Carlos Casares",    "B", "#1aa64a", "#ffffff", "horizontal", { speed: 72, jump: 71, power: 73, defense: 73 }, [], "https://upload.wikimedia.org/wikipedia/commons/d/de/Agropecuario_cc.png"),
  t("patronato",      "Patronato",               "PAT", "Paraná",            "B", "#9b1a1a", "#1a1a1a", "vertical",   { speed: 74, jump: 72, power: 74, defense: 76 }, ["colon"], "https://upload.wikimedia.org/wikipedia/commons/0/08/Escudo_Patronato.png"),
  t("gimnasiatiro",   "Gimnasia y Tiro",         "GYT", "Salta",             "B", "#d61a1a", "#1a55a6", "horizontal", { speed: 72, jump: 72, power: 72, defense: 73 }, ["centralnorte"], "https://upload.wikimedia.org/wikipedia/commons/4/44/Escudo_del_Club_Gimnasia_y_Tiro_de_Salta.svg"),
  t("depmaipu",       "Deportivo Maipú",         "DMP", "Mendoza",           "B", "#d61a1a", "#ffffff", "horizontal", { speed: 74, jump: 73, power: 74, defense: 73 }, [], "https://upload.wikimedia.org/wikipedia/commons/3/36/Escudo_del_Club_Deportivo_Maipu.svg"),
  t("quilmes",        "Quilmes",                 "QUI", "Quilmes",           "B", "#ffffff", "#7ec8ff", "horizontal", { speed: 79, jump: 76, power: 80, defense: 77 }),
  t("colegiales",     "Colegiales",              "CLG", "Munro",             "B", "#1a1a1a", "#d61a1a", "horizontal", { speed: 69, jump: 69, power: 69, defense: 70 }, [], "https://upload.wikimedia.org/wikipedia/commons/8/81/Logo_of_Club_Atl%C3%A9tico_Colegiales.svg"),
  t("rafaela",        "Atlético de Rafaela",     "ARF", "Rafaela",           "B", "#ffffff", "#7ec8ff", "horizontal", { speed: 74, jump: 73, power: 75, defense: 77 }, [], "https://upload.wikimedia.org/wikipedia/commons/4/4e/Logotipo_Oficial_y_Escudo_del_Club_Atl%C3%A9tico_de_Rafaela.svg"),
  t("midland",        "Midland",                 "MID", "Libertad",          "B", "#d61a1a", "#1a3da6", "vertical",   { speed: 67, jump: 67, power: 68, defense: 69 }, [], "https://upload.wikimedia.org/wikipedia/commons/d/de/Midland_escudo.png"),
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
