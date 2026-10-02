export const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WD = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Fecha y hora actuales en Madrid: { date: "2026-10-03", time: "14:05" } */
export function nowInMadrid() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** "2026-10" ↔ índice de mes absoluto (año*12 + mes) para poder sumar/restar. */
export const monthIndex = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
export const monthFromIndex = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
export const isMonthKey = (m: unknown): m is string => typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
export const monthName = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1];
export const daysInMonth = (m: string) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();

/** Días entre dos fechas "YYYY-MM-DD". */
function diffDays(a: string, b: string) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5);
}

/** "Hoy", "Ayer" o "Lunes 5 oct" (añade el año si no es el actual). */
export function dayLabel(date: string, today: string) {
  const d = diffDays(today, date);
  if (d === 0) return "Hoy";
  if (d === 1) return "Ayer";
  const dt = new Date(`${date}T12:00:00Z`);
  const year = date.slice(0, 4) !== today.slice(0, 4) ? ` ${date.slice(0, 4)}` : "";
  return `${cap(WD[dt.getUTCDay()])} ${dt.getUTCDate()} ${MS[dt.getUTCMonth()]}${year}`;
}

/** "Sábado, 3 de octubre de 2026" */
export function longDate(date: string) {
  const dt = new Date(`${date}T12:00:00Z`);
  return `${cap(WD[dt.getUTCDay()])}, ${dt.getUTCDate()} de ${MONTHS[dt.getUTCMonth()]} de ${dt.getUTCFullYear()}`;
}
