import type { Team } from "./teams";

export type RegionalRegion =
  | "Norte" | "Litoral Norte" | "Litoral Sur" | "Centro"
  | "Cuyo" | "Pampeana Norte" | "Pampeana Sur" | "Patagonia";

export type RegionalClubSeed = {
  id: string;
  name: string;
  city: string;
  province: string;
  region: RegionalRegion;
  group: string;
  short: string;
};

const R = (id: string, name: string, city: string, province: string, region: RegionalRegion, group: string): RegionalClubSeed => ({
  id, name, city, province, region, group, short: shortCode(name),
});

function shortCode(name: string): string {
  const clean = name
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(Atl\.?|Club|Deportivo|Sportivo|C\.A\.I)\b/gi, "")
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join("").slice(0, 3).toUpperCase();
}

export const REGIONAL_CLUBS: RegionalClubSeed[] = [
  // NORTE
  R("centralnorte-tucuman-r1", "Central Norte", "San Miguel de Tucumán", "Tucumán", "Norte", "1"),
  R("concepcionfc-r1", "Concepción F.C.", "Concepción", "Tucumán", "Norte", "1"),
  R("atleticotrancas-r1", "Atlético Trancas", "Trancas", "Tucumán", "Norte", "1"),
  R("sanantonio-r1", "San Antonio", "Ranchillos", "Tucumán", "Norte", "2"),
  R("ateneoparroquial-r2", "Ateneo Parroquial", "Alderetes", "Tucumán", "Norte", "2"),
  R("estacionexperimental-r2", "Estación Experimental", "Las Talitas", "Tucumán", "Norte", "2"),
  R("sanpablo-r2", "San Pablo", "San Pablo", "Tucumán", "Norte", "3"),
  R("villasanantonio-salta-r3", "Villa San Antonio", "Salta", "Salta", "Norte", "3"),
  R("libertad-camposanto-r3", "Libertad", "Campo Santo", "Salta", "Norte", "3"),
  R("generalpizarro-r3", "General Pizarro", "Orán", "Salta", "Norte", "3"),
  R("sportivopocitos-r3", "Sportivo Pocitos", "Salvador Mazza", "Salta", "Norte", "4"),
  R("cachorros-salta-r4", "Cachorros de Salta", "Salta", "Salta", "Norte", "4"),
  R("libertad-metan-r4", "Libertad", "San José de Metán", "Salta", "Norte", "4"),
  R("elgalpon-r4", "El Galpón", "El Galpón", "Salta", "Norte", "4"),
  R("vialidad-salta-r4", "Vialidad", "Rosario de la Frontera", "Salta", "Norte", "5"),
  R("mitre-salta-r5", "Mitre", "Salta", "Salta", "Norte", "5"),
  R("ceferino-r5", "Ceferino", "Cafayate", "Salta", "Norte", "5"),
  R("laflorida-r5", "La Florida", "Cafayate", "Salta", "Norte", "5"),
  R("redesdelapatria-r5", "Redes de la Patria", "El Bordo", "Salta", "Norte", "6"),
  R("gimnasiatiro-yavi-r6", "Gimnasia y Tiro", "La Quiaca", "Jujuy", "Norte", "6"),
  R("losperales-r6", "Los Perales", "San Salvador de Jujuy", "Jujuy", "Norte", "6"),
  R("deportivolujan-jujuy-r6", "Deportivo Luján", "Tilcara", "Jujuy", "Norte", "6"),
  R("lamona44-r7", "La Mona 44", "Perico", "Jujuy", "Norte", "7"),
  R("talleresperico-r7", "Talleres", "Perico", "Jujuy", "Norte", "7"),
  R("altoshornoszapla-r7", "Altos Hornos Zapla", "San Salvador de Jujuy", "Jujuy", "Norte", "7"),
  R("defensoresfrailepintado-r7", "Defensores de Fraile Pintado", "Fraile Pintado", "Jujuy", "Norte", "7"),
  R("sportivoalberdi-r8", "Sportivo Alberdi", "Libertador Gral. San Martín", "Jujuy", "Norte", "8"),
  R("centralnorte-libertador-r8", "Central Norte", "Libertador Gral. San Martín", "Jujuy", "Norte", "8"),
  R("tiroygimnasia-salta-r8", "Tiro y Gimnasia", "San Pedro de Jujuy", "Jujuy", "Norte", "8"),
  R("atleticosanpedro-r8", "Atlético San Pedro", "San Pedro de Jujuy", "Jujuy", "Norte", "8"),

  // LITORAL NORTE
  R("libertad-clorinda-r1", "Libertad", "Clorinda", "Formosa", "Litoral Norte", "1"),
  R("8dediciembre-r1", "8 de Diciembre", "Formosa", "Formosa", "Litoral Norte", "1"),
  R("estrellaslaishi-r2", "Estrellas de Laishí", "San Francisco de Laishí", "Formosa", "Litoral Norte", "1"),
  R("estudiantes-pirane-r2", "Estudiantes", "Pirané", "Formosa", "Litoral Norte", "2"),
  R("municipal-laleonesa-r2", "Municipal", "San Francisco de Laishí", "Formosa", "Litoral Norte", "2"),
  R("resistenciacentral-r3", "Resistencia Central", "Resistencia", "Chaco", "Litoral Norte", "2"),
  R("centralnorteargentino-r3", "Central Norte Argentino", "Resistencia", "Chaco", "Litoral Norte", "2"),
  R("deportivolujan-resistencia-r3", "Deportivo Luján", "Resistencia", "Chaco", "Litoral Norte", "3"),
  R("avenidafc-r4", "Avenida Fútbol Club", "Villa Ángela", "Chaco", "Litoral Norte", "3"),
  R("deportivocomercio-r4", "Deportivo Comercio", "Santa Sylvina", "Chaco", "Litoral Norte", "3"),
  R("sportivocultural-r4", "Sportivo Cultural", "Juan José Castelli", "Chaco", "Litoral Norte", "3"),
  R("unionyfuerza-r4", "Unión y Fuerza", "Corzuela", "Chaco", "Litoral Norte", "4"),
  R("mandiyu-r5", "Mandiyú", "Corrientes", "Corrientes", "Litoral Norte", "4"),
  R("huracancorrientes-r5", "Huracán Corrientes", "Corrientes", "Corrientes", "Litoral Norte", "4"),
  R("union-bellavista-r5", "Unión", "Bella Vista", "Corrientes", "Litoral Norte", "4"),
  R("huracan-goya-r5", "Huracán", "Goya", "Corrientes", "Litoral Norte", "5"),
  R("surubi-r6", "Surubí", "Goya", "Corrientes", "Litoral Norte", "5"),
  R("santalucia-r6", "Santa Lucía", "Santa Lucía", "Corrientes", "Litoral Norte", "5"),
  R("lipton-r6", "Lipton", "Corrientes", "Corrientes", "Litoral Norte", "5"),
  R("sanlorenzo-montecaseros-r6", "San Lorenzo", "Monte Caseros", "Corrientes", "Litoral Norte", "6"),
  R("guaraniantoniofranco-r8", "Guaraní Antonio Franco", "Posadas", "Misiones", "Litoral Norte", "6"),
  R("crucerodelnorte-r8", "Crucero del Norte", "Garupá", "Misiones", "Litoral Norte", "6"),
  R("barrioobrero-misiones-r8", "Barrio Obrero", "Puerto Esperanza", "Misiones", "Litoral Norte", "6"),
  R("lacantera-misiones-r8", "La Cantera", "Puerto Esperanza", "Misiones", "Litoral Norte", "7"),
  R("lapicada-misiones-r8", "La Picada", "Posadas", "Misiones", "Litoral Norte", "7"),
  R("jorgegibsonbrown-misiones-r8", "Jorge Gibson Brown", "Posadas", "Misiones", "Litoral Norte", "7"),
  R("nacional-piray-r8", "Nacional (Piray)", "Puerto Piray", "Misiones", "Litoral Norte", "7"),

  // LITORAL SUR
  R("losandes-alcorta-r1", "Los Andes", "Alcorta", "Santa Fe", "Litoral Sur", "1"),
  R("juventudunida-esperanza-r1", "Juventud Unida", "Esperanza", "Santa Fe", "Litoral Sur", "1"),
  R("sanlorenzofbc-r1", "San Lorenzo FBC", "Esperanza", "Santa Fe", "Litoral Sur", "1"),
  R("benhur-rafaela-r2", "Ben Hur", "Rafaela", "Santa Fe", "Litoral Sur", "2"),
  R("atleticosanjorge-r2", "Atlético San Jorge", "San Jorge", "Santa Fe", "Litoral Sur", "2"),
  R("psmfutbol-r3", "PSM Fútbol", "San Lorenzo", "Santa Fe", "Litoral Sur", "2"),
  R("colon-sanjus-r3", "Colón", "San Justo", "Santa Fe", "Litoral Sur", "3"),
  R("sanjustino-r3", "Sanjustino", "San Justo", "Santa Fe", "Litoral Sur", "3"),
  R("cosmos-r3", "Cosmos F.C.", "Santa Fe", "Santa Fe", "Litoral Sur", "3"),
  R("ciclonracing-r4", "Ciclón Racing", "Santa Fe", "Santa Fe", "Litoral Sur", "3"),
  R("studebaker-r4", "Studebaker", "Villa Cañás", "Santa Fe", "Litoral Sur", "4"),
  R("sportivorivadavia-r4", "Sportivo Rivadavia", "Venado Tuerto", "Santa Fe", "Litoral Sur", "4"),
  R("recreativosanjorge-r5", "Recreativo San Jorge", "Villa Elisa", "Entre Ríos", "Litoral Sur", "4"),
  R("atleticosauce-r5", "Atlético Sauce", "Colón", "Entre Ríos", "Litoral Sur", "4"),
  R("defensoresparana-r6", "Defensores", "Paraná", "Entre Ríos", "Litoral Sur", "5"),
  R("donbosco-parana-r6", "Don Bosco", "Paraná", "Entre Ríos", "Litoral Sur", "5"),
  R("atleticoparana-r6", "Atlético Paraná", "Paraná", "Entre Ríos", "Litoral Sur", "5"),
  R("libertad-parana-r6", "Libertad", "Paraná", "Entre Ríos", "Litoral Sur", "5"),

  // CENTRO
  R("villanueva-montequemado-r1", "Villa Nueva", "Monte Quemado", "Santiago del Estero", "Centro", "1"),
  R("juventudunida-triangulo-r1", "Juventud Unida Triángulo", "Monte Quemado", "Santiago del Estero", "Centro", "1"),
  R("campogallo-r1", "Atlético Campo Gallo", "Campo Gallo", "Santiago del Estero", "Centro", "1"),
  R("laensenada-r2", "La Ensenada", "Quimilí", "Santiago del Estero", "Centro", "1"),
  R("socialpinto-r2", "Social Pinto", "Pinto", "Santiago del Estero", "Centro", "2"),
  R("unionlugones-r2", "Unión Lugones", "Lugones", "Santiago del Estero", "Centro", "2"),
  R("25demayo-termas-r3", "Atlético 25 de Mayo", "Termas Río Hondo", "Santiago del Estero", "Centro", "2"),
  R("centralargentino-labanda-r3", "Central Argentino", "La Banda", "Santiago del Estero", "Centro", "2"),
  R("sanjorge-elarenal-r3", "San Jorge", "El Arenal", "Santiago del Estero", "Centro", "3"),
  R("talleres-nuevaesperanza-r3", "Talleres F.C.", "Nueva Esperanza", "Santiago del Estero", "Centro", "3"),
  R("losverdes-elmojon-r4", "Deportivo Los Verdes", "El Mojón", "Santiago del Estero", "Centro", "3"),
  R("sanmartin-elojito-r4", "Atlético San Martín", "El Ojito", "Santiago del Estero", "Centro", "3"),
  R("fida-elarenal-r4", "FIDA", "El Arenal", "Santiago del Estero", "Centro", "4"),
  R("atletico-frias-r5", "Atl. Frías", "Frías", "Santiago del Estero", "Centro", "4"),
  R("sportivoloreto-r5", "Sportivo Loreto", "Loreto", "Santiago del Estero", "Centro", "4"),
  R("unionsantiago-r5", "Unión Santiago", "Santiago del Estero", "Santiago del Estero", "Centro", "4"),

  // CUYO
  R("sportclubquiroga-r1", "Sport Club Quiroga", "San Rafael", "Mendoza", "Cuyo", "1"),
  R("huracan-sanrafael-r1", "Huracán", "San Rafael", "Mendoza", "Cuyo", "1"),
  R("goudge-r1", "Goudge", "San Rafael", "Mendoza", "Cuyo", "1"),
  R("pacifico-alvear-r1", "Pacífico", "Gral. Alvear", "Mendoza", "Cuyo", "2"),
  R("laconsulta-r2", "La Consulta", "La Consulta", "Mendoza", "Cuyo", "2"),
  R("sancarlos-mendoza-r2", "San Carlos", "Villa San Carlos", "Mendoza", "Cuyo", "2"),
  R("vialidadnacional-r2", "Vialidad Nacional", "Malargüe", "Mendoza", "Cuyo", "3"),
  R("deportivomalargue-r2", "Deportivo Malargüe", "Malargüe", "Mendoza", "Cuyo", "3"),
  R("argentino-mendocino-r3", "Argentino", "San José", "Mendoza", "Cuyo", "3"),
  R("atleticopalmira-r3", "Atl. Palmira", "Palmira", "Mendoza", "Cuyo", "3"),
  R("montecaseros-r3", "Montecaseros", "Montecaseros", "Mendoza", "Cuyo", "4"),
  R("lalibertad-r3", "La Libertad", "Rivadavia", "Mendoza", "Cuyo", "4"),
  R("gralsanmartin-merlo-r4", "Gral. San Martín", "Villa de Merlo", "San Luis", "Cuyo", "4"),
  R("naschelunidos-r4", "Naschel Unidos", "Naschel", "San Luis", "Cuyo", "4"),
  R("defensoresbelgrano-daract-r4", "Defensores de Belgrano", "Justo Daract", "San Luis", "Cuyo", "5"),
  R("alianzafutbolistica-r4", "Alianza Futbolística", "Villa Mercedes", "San Luis", "Cuyo", "5"),
  R("estrellaroja-r5", "Estrella Roja", "Candelaria", "San Luis", "Cuyo", "5"),
  R("latotora-r5", "La Totora", "Candelaria", "San Luis", "Cuyo", "5"),
  R("colocasi-r5", "Colocasi", "San Francisco de Monte de Oro", "San Luis", "Cuyo", "6"),
  R("atleticounion-krause-r6", "Atlético Unión", "Villa Krause", "San Juan", "Cuyo", "6"),
  R("sportivodesamparados-r6", "Sportivo Desamparados", "San Juan", "San Juan", "Cuyo", "6"),
  R("gralbelgrano-mediasagua-r6", "Gral. Belgrano", "Media Agua", "San Juan", "Cuyo", "6"),

  // PAMPEANA NORTE
  R("fomentoloshornos-r1", "Fomento Los Hornos", "Los Hornos", "Buenos Aires", "Pampeana Norte", "1"),
  R("polideportivogonnet-r1", "Polideportivo Gonnet", "Gonnet", "Buenos Aires", "Pampeana Norte", "1"),
  R("napoliargentino-r1", "Nápoli Argentino", "Chascomús", "Buenos Aires", "Pampeana Norte", "1"),
  R("atleticochascomus-r1", "Atl. Chascomús", "Chascomús", "Buenos Aires", "Pampeana Norte", "1"),
  R("sanlorenzo-villacastells-r2", "San Lorenzo", "Gonnet", "Buenos Aires", "Pampeana Norte", "2"),
  R("setia-r2", "SETIA", "Ezeiza", "Buenos Aires", "Pampeana Norte", "2"),
  R("estrelladelsur-r2", "Estrella del Sur", "San Vicente", "Buenos Aires", "Pampeana Norte", "2"),
  R("unionyfuerza-magdalena-r2", "Unión y Fuerza", "Magdalena", "Buenos Aires", "Pampeana Norte", "2"),
  R("11defebrero-r3", "11 de Febrero", "Zárate", "Buenos Aires", "Pampeana Norte", "3"),
  R("atleticomontegrande-r3", "Atlético Monte Grande", "Monte Grande", "Buenos Aires", "Pampeana Norte", "3"),
  R("martinezmoreno-r3", "Martínez Moreno", "El Jagüel", "Buenos Aires", "Pampeana Norte", "3"),
  R("sportivobaradero-r4", "Sportivo Baradero", "Baradero", "Buenos Aires", "Pampeana Norte", "3"),
  R("atleticobaradero-r4", "Atlético Baradero", "Baradero", "Buenos Aires", "Pampeana Norte", "4"),
  R("carmenareco-r5", "Recreativo Carmen de Areco", "Carmen de Areco", "Buenos Aires", "Pampeana Norte", "4"),
  R("sportsman-carmen-r5", "Sportsman", "Carmen de Areco", "Buenos Aires", "Pampeana Norte", "4"),
  R("elfronton-r5", "El Frontón", "San Andrés de Giles", "Buenos Aires", "Pampeana Norte", "4"),
  R("asociacioncristiana-r5", "Asociación Cristiana", "José Ingenieros", "Buenos Aires", "Pampeana Norte", "5"),
  R("companiageneral-r6", "Compañía General", "Salto", "Buenos Aires", "Pampeana Norte", "5"),
  R("defensoresdesalto-r6", "Defensores de Salto", "Salto", "Buenos Aires", "Pampeana Norte", "5"),
  R("atletico9dejulio-r6", "Atlético 9 de Julio", "Chacabuco", "Buenos Aires", "Pampeana Norte", "5"),
  R("sanmartin-chacabuco-r6", "San Martín", "Chacabuco", "Buenos Aires", "Pampeana Norte", "6"),
  R("somisa-r7", "Somisa", "San Nicolás de los Arroyos", "Buenos Aires", "Pampeana Norte", "6"),
  R("atleticoparana-san-nicolas-r7", "Atlético Paraná", "San Nicolás", "Buenos Aires", "Pampeana Norte", "6"),
  R("juventud-pergamino-r7", "Juventud", "Pergamino", "Buenos Aires", "Pampeana Norte", "6"),

  // PAMPEANA SUR
  R("huracaningenierowhite-r1", "Huracán", "Ingeniero White", "Buenos Aires", "Pampeana Sur", "1"),
  R("balonpie-r1", "Balonpié", "Bolívar", "Buenos Aires", "Pampeana Sur", "1"),
  R("sarmiento-pigue-r1", "Sarmiento", "Pigüé", "Buenos Aires", "Pampeana Sur", "1"),
  R("defensores-valeriadelmar-r2", "Defensores", "Valeria del Mar", "Buenos Aires", "Pampeana Sur", "2"),
  R("atleticovillegas-r2", "Atl. Villegas", "Gral. Villegas", "Buenos Aires", "Pampeana Sur", "2"),
  R("santarita-villegas-r2", "Santa Rita", "General Villegas", "Buenos Aires", "Pampeana Sur", "2"),
  R("deportivonorte-mdq-r3", "Deportivo Norte", "Mar del Plata", "Buenos Aires", "Pampeana Sur", "2"),
  R("quilmes-mdq-r3", "Quilmes", "Mar del Plata", "Buenos Aires", "Pampeana Sur", "3"),
  R("ministerio-necochea-r3", "Ministerio", "Necochea", "Buenos Aires", "Pampeana Sur", "3"),
  R("villadiazvelez-r3", "Villa Díaz Vélez", "Necochea", "Buenos Aires", "Pampeana Sur", "3"),
  R("independiente-sancayetano-r3", "Independiente", "San Cayetano", "Buenos Aires", "Pampeana Sur", "3"),
  R("ferrocarrilsud-olavarria-r4", "Ferro Carril Sud", "Olavarría", "Buenos Aires", "Pampeana Sur", "4"),
  R("estudiantes-olavarria-r4", "Estudiantes", "Olavarría", "Buenos Aires", "Pampeana Sur", "4"),
  R("racing-olavarria-r4", "Racing", "Olavarría", "Buenos Aires", "Pampeana Sur", "4"),
  R("elfortin-olavarria-r5", "El Fortín", "Olavarría", "Buenos Aires", "Pampeana Sur", "4"),
  R("lomanegra-r5", "Loma Negra", "Olavarría", "Buenos Aires", "Pampeana Sur", "5"),
  R("embajadores-olavarria-r5", "Embajadores", "Olavarría", "Buenos Aires", "Pampeana Sur", "5"),
  R("futbolclub-trenquelauquen-r6", "Futbol Club", "Trenque Lauquen", "Buenos Aires", "Pampeana Sur", "5"),
  R("argentino-25demayo-r6", "Argentino", "25 de Mayo", "Buenos Aires", "Pampeana Sur", "5"),
  R("allboyssantarosa-r7", "All Boys", "Santa Rosa", "La Pampa", "Pampeana Sur", "6"),
  R("atleticosantarosa-r7", "Atl. Santa Rosa", "Santa Rosa", "La Pampa", "Pampeana Sur", "6"),
  R("ferropico-r7", "Ferro Carril Oeste", "General Pico", "La Pampa", "Pampeana Sur", "6"),
  R("allboystrenel-r7", "All Boys", "Trenel", "La Pampa", "Pampeana Sur", "6"),

  // PATAGONIA
  R("cruzdelsur-bariloche-r1", "Cruz del Sur", "San Carlos de Bariloche", "Río Negro", "Patagonia", "1"),
  R("estudiantesunidos-bariloche-r1", "Estudiantes Unidos", "San Carlos de Bariloche", "Río Negro", "Patagonia", "1"),
  R("puertomoreno-r1", "Puerto Moreno", "Bariloche", "Río Negro", "Patagonia", "1"),
  R("laamistad-cipolletti-r2", "La Amistad", "Cipolletti", "Río Negro", "Patagonia", "2"),
  R("atlregina-r2", "Atl. Regina", "Villa Regina", "Río Negro", "Patagonia", "2"),
  R("deportivoroca-r2", "Dep. Roca", "Gral. Roca", "Río Negro", "Patagonia", "2"),
  R("unionalem-r2", "Unión Alem Progresista", "Allen", "Río Negro", "Patagonia", "2"),
  R("atlchimpay-r2", "Atl. Chimpay", "Choele Choel", "Río Negro", "Patagonia", "3"),
  R("deportivodarwin-r2", "Deportivo Darwin", "Lamarque", "Río Negro", "Patagonia", "3"),
  R("deportivobeltran-r2", "Deportivo Beltrán", "Luis Beltrán", "Río Negro", "Patagonia", "3"),
  R("sportsman-choele-r2", "Sportsman Club", "Choele Choel", "Río Negro", "Patagonia", "3"),
  R("radatilly-r3", "Atl. Rada Tilly", "Rada Tilly", "Chubut", "Patagonia", "4"),
  R("huracan-comodoro-r3", "Huracán", "Comodoro Rivadavia", "Chubut", "Patagonia", "4"),
  R("cai-comodoro-r3", "C.A.I", "Comodoro Rivadavia", "Chubut", "Patagonia", "4"),
  R("empleadoscomercio-trelew-r4", "Empleados de Comercio", "Trelew", "Chubut", "Patagonia", "4"),
  R("jjmoreno-r4", "Atlético J.J. Moreno", "Puerto Madryn", "Chubut", "Patagonia", "5"),
  R("deportivoroca-rawson-r4", "Dep. Roca", "Rawson", "Chubut", "Patagonia", "5"),
  R("deportivofontana-r4", "Deportivo Fontana", "Trevelin", "Chubut", "Patagonia", "5"),
  R("deportivescorpion-r5", "Dep. Escorpión F.C.", "Río Gallegos", "Santa Cruz", "Patagonia", "5"),
  R("deportivoesperanza-r5", "Dep. Esperanza", "El Calafate", "Santa Cruz", "Patagonia", "6"),
  R("boxingclub-r5", "Boxing Club", "Río Gallegos", "Santa Cruz", "Patagonia", "6"),
  R("bancruz-r5", "Bancruz", "Río Gallegos", "Santa Cruz", "Patagonia", "6"),
  R("santacruzfc-r5", "Santa Cruz F.C.", "Río Turbio", "Santa Cruz", "Patagonia", "6"),
  R("atleticosanjulian-r5", "Atl. San Julián", "Puerto San Julián", "Santa Cruz", "Patagonia", "7"),
  R("riomayo-r5", "Deportivo Río Mayo", "Río Mayo", "Santa Cruz", "Patagonia", "7"),
  R("camioneros-riogrande-r6", "Camioneros", "Río Grande", "Tierra del Fuego", "Patagonia", "7"),
  R("estrella-austral-r6", "Estrella Austral", "Río Grande", "Tierra del Fuego", "Patagonia", "7"),
  R("sanmartin-tdf-r6", "San Martín", "Río Grande", "Tierra del Fuego", "Patagonia", "8"),
  R("camioneros-ushuaia-r6", "Camioneros", "Ushuaia", "Tierra del Fuego", "Patagonia", "8"),
  R("aatedyc-r6", "AATEDYC", "Ushuaia", "Tierra del Fuego", "Patagonia", "8"),
  R("lasserre-r6", "Lasserre", "Ushuaia", "Tierra del Fuego", "Patagonia", "8"),
];

type RegionalRating = readonly [number, number, number, number];

// Ratings entregados por el usuario para la nómina depurada del Regional.
// Ordenados exactamente igual que REGIONAL_CLUBS; no se generan aleatoriamente.
const REGIONAL_RATINGS: RegionalRating[] = [
  // Norte (30)
  [66,62,68,65],[63,60,61,62],[60,65,63,64],[64,61,62,61],[62,63,60,61],[61,60,62,63],[63,64,61,65],[65,67,64,68],[67,66,65,64],[64,62,63,62],[66,65,64,66],[62,63,61,62],[63,64,62,63],[61,62,60,61],[64,63,65,64],[68,67,69,68],[59,58,60,58],[58,57,59,60],[63,62,61,62],[66,65,67,64],[62,63,61,62],[61,60,62,61],[62,61,63,62],[65,64,65,65],[66,67,68,67],[59,60,58,60],[61,62,61,63],[64,63,64,64],[60,61,60,62],[62,63,62,63],
  // Litoral Norte (27)
  [63,62,61,64],[65,64,66,65],[61,60,63,62],[60,59,61,60],[62,61,60,62],[65,66,64,65],[66,65,67,66],[64,63,64,65],[62,61,63,63],[61,60,62,61],[63,62,64,62],[64,63,63,62],[68,67,69,68],[66,65,64,65],[65,64,66,64],[63,62,61,62],[62,61,63,61],[61,60,62,60],[64,63,62,63],[63,62,63,62],[70,71,69,68],[71,70,72,69],[61,60,62,60],[60,59,61,60],[62,61,62,61],[60,59,61,60],[59,60,61,60],
  // Litoral Sur (18)
  [64,63,62,63],[63,62,64,62],[62,61,61,62],[65,66,64,65],[64,63,63,64],[63,62,64,63],[64,63,65,64],[63,62,63,62],[61,60,62,61],[66,64,65,66],[62,61,63,62],[63,62,64,63],[65,64,66,64],[64,63,65,63],[66,67,65,66],[64,63,64,63],[65,64,65,64],[63,62,64,63],
  // Centro (16)
  [61,60,62,60],[60,59,61,59],[62,61,60,61],[60,59,61,60],[61,60,62,60],[61,60,61,60],[62,63,61,62],[60,59,60,60],[61,60,62,61],[62,61,62,62],[61,60,61,60],[60,59,60,60],[61,60,61,61],[62,63,60,62],[63,62,61,62],[61,60,62,61],
  // Cuyo (22)
  [64,63,65,64],[63,62,64,63],[62,61,63,62],[65,64,66,65],[62,61,62,61],[63,62,63,62],[64,63,64,63],[63,62,63,62],[64,63,65,64],[65,64,65,65],[63,62,64,63],[62,61,62,62],[64,63,64,64],[63,62,63,63],[62,61,62,62],[61,60,62,60],[62,63,61,62],[61,60,61,61],[61,60,61,61],[64,63,65,64],[63,62,64,63],[62,61,62,62],
  // Pampeana Norte (24)
  [61,60,62,61],[60,59,61,60],[62,63,61,62],[61,60,62,61],[60,59,60,61],[63,62,64,63],[62,61,63,62],[61,60,62,60],[60,59,61,60],[62,63,62,62],[61,60,61,60],[63,64,63,64],[62,61,62,62],[61,60,62,60],[60,59,61,60],[62,61,63,62],[61,60,62,61],[62,61,63,62],[60,59,62,60],[62,61,63,62],[60,59,60,60],[61,60,62,61],[60,59,61,60],[62,61,62,62],
  // Pampeana Sur (23)
  [60,59,61,60],[61,60,62,61],[62,61,60,62],[59,58,60,59],[60,59,60,60],[59,58,59,59],[61,60,62,61],[62,61,61,62],[60,59,60,60],[61,60,62,61],[60,59,60,60],[62,61,63,62],[61,60,62,61],[61,60,61,61],[60,59,60,60],[59,58,60,59],[60,59,61,60],[62,61,62,62],[60,59,60,60],[61,60,62,61],[60,59,60,60],[59,58,59,59],[60,59,60,60],
  // Patagonia (31)
  [60,59,60,60],[59,58,60,59],[59,58,59,59],[62,61,63,62],[61,60,62,61],[63,62,64,63],[60,59,61,60],[60,59,60,60],[59,58,60,59],[60,59,61,60],[60,59,60,60],[62,61,63,62],[61,60,62,61],[62,61,62,62],[60,59,61,60],[61,60,62,61],[60,59,60,60],[59,58,59,59],[61,60,62,61],[60,59,61,60],[62,61,63,62],[61,60,62,61],[60,59,61,60],[60,59,61,60],[60,59,61,60],[59,58,60,59],[58,57,59,58],[63,62,63,63],[62,61,62,61],[61,60,62,60],[60,59,61,60],
];

if (REGIONAL_RATINGS.length !== REGIONAL_CLUBS.length) {
  throw new Error(`Regional ratings mismatch: ${REGIONAL_RATINGS.length} ratings for ${REGIONAL_CLUBS.length} clubs`);
}

export const REGIONAL_FEDERAL_AMATEUR_TEAMS: Team[] = REGIONAL_CLUBS.map((c, index) => {
  const [speed, jump, power, defense] = REGIONAL_RATINGS[index];
  return {
    id: c.id, name: c.name, short: c.short, city: c.city, province: c.province,
    regionalRegion: c.region, regionalGroup: c.group, zone: c.group, division: "regional_federal_amateur",
    primary: "#6b7280", secondary: "#111827", stripe: "solid",
    stats: { speed, jump, power, defense }, rivals: [], logoUrl: null,
  };
});

export const REGIONAL_META = new Map(REGIONAL_CLUBS.map(c => [c.id, c]));

export const REGIONAL_REGIONS: RegionalRegion[] = [
  "Norte", "Litoral Norte", "Litoral Sur", "Centro", "Cuyo", "Pampeana Norte", "Pampeana Sur", "Patagonia",
];

export const REGIONAL_COUNTS = {
  listed: REGIONAL_FEDERAL_AMATEUR_TEAMS.length,
  expectedByUser: 247,
};
