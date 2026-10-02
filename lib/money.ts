/**
 * Convierte un importe que puede llegar como número o como texto con formato
 * español o inglés: "12,50 €", "1.234,56€", "€12.50", "1,234.56", "-5 €", "12.500".
 * Devuelve null si no se puede interpretar.
 */
export function parseAmount(input: unknown): number | null {
  if (typeof input === "number") {
    return Number.isFinite(input) ? round2(input) : null;
  }
  if (typeof input !== "string") return null;

  let s = input.trim().replace(/[−‒–—]/g, "-"); // signos menos raros
  const negative = /^-|-$|^\(.*\)$/.test(s.replace(/[^\d.,()\-]/g, ""));
  s = s.replace(/[^\d.,]/g, ""); // quita €, espacios, letras...
  if (!/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;

  if (lastComma !== -1 && lastDot !== -1) {
    // Hay los dos: el último que aparece es el separador decimal.
    const dec = lastComma > lastDot ? "," : ".";
    const thou = dec === "," ? "." : ",";
    normalized = s.split(thou).join("").replace(dec, ".");
  } else if (lastComma !== -1) {
    // Solo comas: en España la coma es decimal ("12,5"). Si hay varias, son miles.
    const parts = s.split(",");
    normalized = parts.length === 2 ? parts.join(".") : parts.join("");
  } else if (lastDot !== -1) {
    // Solo puntos: "1.234" o "12.500" son miles (formato español); "12.50" es decimal.
    normalized = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.split(".").join("") : s;
    if ((normalized.match(/\./g) ?? []).length > 1) return null;
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return round2(negative ? -n : n);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Formato es-ES con separador de miles siempre: 1.234,56 € */
export function formatParts(n: number) {
  const [i, d] = Math.abs(n).toFixed(2).split(".");
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return { sign: n < 0 ? "-" : "", int, dec: d };
}

export function formatEUR(n: number) {
  const { sign, int, dec } = formatParts(n);
  return `${sign}${int},${dec} €`;
}
