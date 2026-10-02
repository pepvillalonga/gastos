import type { CategoryId } from "./categories";

const PROCESSOR_PREFIXES = new Set(["sumup", "zettle", "izettle", "paypal", "sq", "stripe", "redsys"]);
const LEGAL_SUFFIXES = new Set(["sa", "sl", "slu", "sau", "sll", "scp", "cb", "inc", "ltd", "llc", "gmbh"]);

/**
 * Normaliza el nombre de un comercio para que "MERCADONA, S.A. 1234",
 * "Mercadona" y "mercadona" acaben siendo la misma clave: "mercadona".
 */
export function normalizeMerchant(name: string): string {
  const tokens = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`´]/g, "")
    .replace(/\bs\.\s?(a|l|l\.u|a\.u)\.?(?=\s|$)/g, " ") // S.A., S.L., S.L.U.
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  while (tokens.length > 1 && PROCESSOR_PREFIXES.has(tokens[0])) tokens.shift();
  const cleaned = tokens.filter((t, i) => !(i > 0 && (/^\d+$/.test(t) || LEGAL_SUFFIXES.has(t))));
  const key = cleaned.join(" ").trim();
  return key || name.trim().toLowerCase();
}

/**
 * Palabras clave de comercios habituales en España. Se busca por palabras
 * completas y gana la coincidencia más larga ("uber eats" gana a "uber").
 */
const KEYWORDS: Record<CategoryId, string[]> = {
  padel: ["playtomic", "padel", "matchi", "padel manager", "padelmanager", "club de padel"],
  supermercado: [
    "mercadona", "carrefour", "carrefour express", "carrefour market", "lidl", "aldi", "dia", "alcampo",
    "eroski", "consum", "hipercor", "ahorramas", "caprabo", "bonpreu", "bon preu", "condis", "simply",
    "bm supermercados", "gadis", "froiz", "masymas", "hiperdino", "spar", "coviran", "supercor",
    "supermercado", "hipermercado", "fruteria", "carniceria", "pescaderia", "mercado", "el jamon",
    "lupa", "family cash", "costco", "makro",
  ],
  restaurantes: [
    "glovo", "just eat", "uber eats", "deliveroo", "telepizza", "dominos", "dominos pizza", "burger king",
    "mcdonalds", "kfc", "foster s hollywood", "fosters hollywood", "vips", "100 montaditos", "la tagliatella",
    "starbucks", "rodilla", "five guys", "goiko", "taco bell", "popeyes", "tgb", "papa johns", "pans company",
    "bar", "cafe", "cafeteria", "restaurante", "taberna", "cerveceria", "pizzeria", "tasca", "meson",
    "brasa", "asador", "sushi", "kebab", "churreria", "heladeria", "panaderia", "pasteleria", "granja",
  ],
  gasolina: [
    "repsol", "cepsa", "moeve", "bp", "shell", "galp", "petronor", "ballenoil", "plenoil", "petroprix",
    "avia", "campsa", "esclatoil", "disa", "meroil", "gasolinera", "estacion de servicio",
  ],
  transporte: [
    "renfe", "cabify", "uber", "bolt", "freenow", "free now", "taxi", "metro", "metro de madrid", "emt",
    "tmb", "alsa", "avanza", "bicing", "bicimad", "blablacar", "ouigo", "iryo", "parking", "empark",
    "telpark", "saba", "peaje", "autopista", "via t", "lime", "cooltra", "acciona", "moovit", "fgc",
    "euskotren", "tram", "tranvia", "aparcamiento", "zity", "share now", "itv",
  ],
  deporte: [
    "decathlon", "basic fit", "basicfit", "altafit", "mcfit", "anytime fitness", "dreamfit", "go fit",
    "holmes place", "sports world", "gimnasio", "gym", "fitness", "sprinter", "forum sport", "strava",
    "crossfit", "piscina", "polideportivo", "vivagym", "synergym", "crunch", "o2 centro wellness",
  ],
  ocio: [
    "cine", "cines", "cinesa", "yelmo", "kinepolis", "ocine", "ticketmaster", "fever", "steam",
    "playstation store", "nintendo eshop", "teatro", "museo", "bolera", "concierto", "eventbrite",
    "atrapalo", "entradas", "discoteca", "parque de atracciones", "port aventura", "portaventura",
  ],
  compras: [
    "amazon", "amzn", "aliexpress", "temu", "el corte ingles", "mediamarkt", "media markt", "pccomponentes",
    "apple store", "ebay", "wallapop", "action", "tiger", "flying tiger", "fnac", "worten", "carrefour online",
    "miravia", "la casa del electrodomestico", "tienda", "bazar", "chino",
  ],
  ropa: [
    "zara", "bershka", "pull bear", "pull and bear", "stradivarius", "massimo dutti", "mango", "h m", "hm",
    "primark", "uniqlo", "lefties", "oysho", "springfield", "cortefiel", "shein", "kiabi", "nike", "adidas",
    "foot locker", "jd sports", "zalando", "vinted", "pepe jeans", "desigual", "levis", "calzedonia",
    "intimissimi", "tezenis", "womens secret", "zapateria",
  ],
  suscripciones: [
    "netflix", "spotify", "hbo", "hbo max", "disney", "disney plus", "prime video", "amazon prime",
    "apple com bill", "apple bill", "icloud", "youtube premium", "youtube", "dazn", "filmin", "chatgpt",
    "openai", "google one", "google storage", "audible", "xbox", "game pass", "playstation plus",
    "nintendo online", "adobe", "microsoft 365", "dropbox", "notion", "claude", "anthropic", "patreon",
    "twitch", "skyshowtime", "atresplayer", "movistar plus", "apple music", "apple tv", "tidal", "deezer",
  ],
  salud: [
    "farmacia", "parafarmacia", "clinica", "dentista", "dental", "hospital", "sanitas", "adeslas", "dkv",
    "asisa", "mapfre salud", "optica", "opticalia", "general optica", "multiopticas", "fisioterapia", "fisio",
    "quiron", "quironsalud", "vithas", "hm hospitales", "laboratorio", "psicologo", "podologo", "veterinario",
  ],
  hogar: [
    "ikea", "leroy merlin", "bricomart", "bauhaus", "brico depot", "aki", "conforama", "maisons du monde",
    "zara home", "h m home", "jysk", "iberdrola", "endesa", "naturgy", "holaluz", "repsol luz", "totalenergies",
    "aguas", "canal de isabel ii", "vodafone", "orange", "movistar", "digi", "masmovil", "yoigo", "pepephone",
    "lowi", "simyo", "jazztel", "ferreteria", "drogueria", "lavanderia", "tintoreria", "kave home", "el mueble",
  ],
  viajes: [
    "iberia", "iberia express", "vueling", "ryanair", "air europa", "easyjet", "volotea", "binter", "booking",
    "booking com", "airbnb", "expedia", "edreams", "hotel", "hoteles", "nh hotel", "melia", "trivago",
    "hostal", "parador", "paradores", "aena", "aeropuerto", "rentalcars", "europcar", "hertz", "avis",
    "sixt", "goldcar", "trainline", "balearia", "trasmediterranea",
  ],
  belleza: [
    "peluqueria", "barberia", "barber", "primor", "druni", "sephora", "douglas", "estetica", "manicura",
    "nails", "perfumeria", "rituals", "kiko", "kiko milano", "the body shop", "lush", "spa", "depilacion",
    "centro de belleza", "notino", "arenal",
  ],
  regalos: ["floristeria", "flores", "interflora", "regalo", "regalos", "hallmark", "juguetes", "toys r us", "imaginarium"],
  educacion: [
    "casa del libro", "libreria", "academia", "udemy", "coursera", "domestika", "duolingo", "escuela",
    "universidad", "colegio", "matricula", "papeleria", "abacus", "babbel", "platzi", "uned",
  ],
  otros: ["correos", "seur", "mrw", "estanco", "loterias", "lavado"],
};

const KEYWORD_INDEX: { kw: string; cat: CategoryId }[] = Object.entries(KEYWORDS)
  .flatMap(([cat, kws]) => kws.map((kw) => ({ kw, cat: cat as CategoryId })))
  .sort((a, b) => b.kw.length - a.kw.length);

/** Busca palabras clave en el nombre normalizado. Devuelve null si no hay coincidencia. */
export function classifyByKeyword(merchantKey: string): CategoryId | null {
  const haystack = ` ${merchantKey} `;
  return KEYWORD_INDEX.find(({ kw }) => haystack.includes(` ${kw} `))?.cat ?? null;
}
