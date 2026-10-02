export const CATEGORIES = [
  { id: "padel", name: "Pádel", emoji: "🎾", hue: 105 },
  { id: "supermercado", name: "Supermercado", emoji: "🛒", hue: 150 },
  { id: "restaurantes", name: "Restaurantes y bares", emoji: "🍽️", hue: 60 },
  { id: "gasolina", name: "Gasolina", emoji: "⛽", hue: 82 },
  { id: "transporte", name: "Transporte", emoji: "🚗", hue: 240 },
  { id: "deporte", name: "Deporte y gimnasio", emoji: "💪", hue: 172 },
  { id: "ocio", name: "Ocio", emoji: "🎉", hue: 330 },
  { id: "compras", name: "Compras", emoji: "🛍️", hue: 307 },
  { id: "ropa", name: "Ropa", emoji: "👕", hue: 285 },
  { id: "suscripciones", name: "Suscripciones", emoji: "🔁", hue: 195 },
  { id: "salud", name: "Salud y farmacia", emoji: "💊", hue: 15 },
  { id: "hogar", name: "Hogar", emoji: "🏠", hue: 127 },
  { id: "viajes", name: "Viajes", emoji: "✈️", hue: 217 },
  { id: "belleza", name: "Belleza y cuidado personal", emoji: "💈", hue: 352 },
  { id: "regalos", name: "Regalos", emoji: "🎁", hue: 37 },
  { id: "educacion", name: "Educación", emoji: "📚", hue: 262 },
  { id: "otros", name: "Otros", emoji: "📦", hue: null },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export type Category = {
  id: CategoryId;
  name: string;
  emoji: string;
  color: string;
  tint: string;
};

const withColors = (c: (typeof CATEGORIES)[number]): Category => ({
  id: c.id,
  name: c.name,
  emoji: c.emoji,
  color: c.hue == null ? "oklch(0.66 0 0)" : `oklch(0.72 0.12 ${c.hue})`,
  tint: c.hue == null ? "oklch(0.66 0 0 / 0.18)" : `oklch(0.72 0.12 ${c.hue} / 0.2)`,
});

export const CATEGORY_LIST: Category[] = CATEGORIES.map(withColors);

const BY_ID = new Map(CATEGORY_LIST.map((c) => [c.id as string, c]));

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && BY_ID.has(value);
}

export function getCategory(id: string): Category {
  return BY_ID.get(id) ?? BY_ID.get("otros")!;
}

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Acepta el id ("supermercado") o el nombre ("Supermercado", "salud y farmacia", "Padel"). */
export function resolveCategory(value: unknown): CategoryId | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const v = strip(value);
  for (const c of CATEGORY_LIST) {
    if (c.id === v || strip(c.name) === v) return c.id;
  }
  return null;
}
