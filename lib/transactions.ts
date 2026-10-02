import { db } from "./db";
import { getCategory, resolveCategory, type CategoryId } from "./categories";
import { classifyByKeyword, normalizeMerchant } from "./merchant";
import { classifyWithGemini } from "./gemini";

export type TxSource = "applepay" | "manual";
export type CategorySource = "explicit" | "rule" | "keyword" | "ai" | "fallback" | "user";

/** Movimiento listo para pintar. `local` es la fecha/hora en Europe/Madrid: "2026-10-03 14:05". */
export type Tx = {
  id: string;
  amount: number;
  merchant: string;
  card: string | null;
  category: CategoryId;
  source: TxSource;
  local: string;
};

/** Fecha opcional: ISO con zona (se respeta) o fecha "local" de Madrid. */
export type PaidAt = { iso?: string; local?: string };

const DUPLICATE_WINDOW_SECONDS = 120;

const TX_COLUMNS = `
  id::text as id, amount::float8 as amount, merchant, card, category, source,
  to_char(paid_at at time zone 'Europe/Madrid', 'YYYY-MM-DD HH24:MI') as local`;

type Row = Record<string, unknown>;
const toTx = (r: Row): Tx => ({
  id: String(r.id),
  amount: Number(r.amount),
  merchant: String(r.merchant),
  card: (r.card as string | null) ?? null,
  category: getCategory(String(r.category)).id,
  source: r.source === "manual" ? "manual" : "applepay",
  local: String(r.local),
});

/**
 * Interpreta la fecha que manda el atajo o la web. Acepta:
 *  - ISO 8601 con zona: 2026-10-03T14:05:00+02:00 / ...Z
 *  - Fecha local sin zona: 2026-10-03T14:05 o 2026-10-03 14:05
 *  - Formato español: 03/10/2026 14:05 o 3/10/26, 14:05
 * Si no se entiende, devuelve null y se usa la hora actual.
 */
export function parsePaidAt(input: unknown): PaidAt | null {
  if (typeof input !== "string" || !input.trim()) return null;
  const s = input.trim();

  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : { iso: d.toISOString() };
  }
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (m) return { local: `${m[1]}-${m[2]}-${m[3]} ${m[4] ?? "12"}:${m[5] ?? "00"}` };

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?:,?\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    const pad = (x: string) => x.padStart(2, "0");
    return { local: `${year}-${pad(m[2])}-${pad(m[1])} ${pad(m[4] ?? "12")}:${m[5] ?? "00"}` };
  }
  return null;
}

/** Guarda (o actualiza) la regla de un comercio. Las reglas puestas por ti no las pisa la IA. */
async function saveRule(merchantKey: string, merchant: string, category: CategoryId, source: "user" | "explicit" | "keyword" | "ai") {
  await db()`
    insert into merchant_rules (merchant_key, merchant, category, source)
    values (${merchantKey}, ${merchant}, ${category}, ${source})
    on conflict (merchant_key) do update
      set category = excluded.category, source = excluded.source,
          merchant = excluded.merchant, updated_at = now()
      where merchant_rules.source not in ('user', 'explicit')
         or excluded.source in ('user', 'explicit')`;
}

/**
 * Decide la categoría en este orden:
 * 1) la que venga explícita, 2) regla guardada, 3) palabras clave, 4) Gemini, 5) "otros".
 * Guarda el resultado como regla para que la IA solo actúe con comercios nuevos.
 * Si guardar la regla falla, no pasa nada: el pago se guarda igual.
 */
export async function classify(merchant: string, merchantKey: string, card: string | null, explicit: unknown) {
  const safeSaveRule = (cat: CategoryId, src: "explicit" | "keyword" | "ai") =>
    saveRule(merchantKey, merchant, cat, src).catch((e) => console.error("[rules] no se pudo guardar:", e));

  const explicitCat = resolveCategory(explicit);
  if (explicitCat) {
    await safeSaveRule(explicitCat, "explicit");
    return { category: explicitCat, source: "explicit" as CategorySource };
  }

  try {
    const rows = await db()`select category from merchant_rules where merchant_key = ${merchantKey}`;
    const ruleCat = rows[0] && resolveCategory(rows[0].category);
    if (ruleCat) return { category: ruleCat, source: "rule" as CategorySource };
  } catch (e) {
    console.error("[rules] no se pudo leer:", e);
  }

  const kwCat = classifyByKeyword(merchantKey);
  if (kwCat) {
    await safeSaveRule(kwCat, "keyword");
    return { category: kwCat, source: "keyword" as CategorySource };
  }

  const aiCat = await classifyWithGemini(merchant, card);
  if (aiCat) {
    await safeSaveRule(aiCat, "ai");
    return { category: aiCat, source: "ai" as CategorySource };
  }

  // Sin regla: la próxima vez que pagues aquí se volverá a intentar con la IA.
  return { category: "otros" as CategoryId, source: "fallback" as CategorySource };
}

export type NewTx = {
  amount: number;
  merchant: string;
  card?: string | null;
  category?: unknown;
  source: TxSource;
  paidAt?: PaidAt | null;
};

/** Clasifica y guarda un movimiento. Si es un duplicado reciente, devuelve el existente. */
export async function createTransaction(input: NewTx): Promise<{ tx: Tx; duplicate: boolean; categorySource: CategorySource }> {
  const merchant = input.merchant.trim().slice(0, 200);
  const merchantKey = normalizeMerchant(merchant);
  const card = input.card?.trim().slice(0, 100) || null;
  const iso = input.paidAt?.iso ?? null;
  const local = input.paidAt?.local ?? null;

  // ¿El atajo ha mandado el mismo pago dos veces? (mismo comercio e importe en menos de 2 minutos)
  const dup = await db()`
    select ${db().unsafe(TX_COLUMNS)} from transactions
    where merchant_key = ${merchantKey} and amount = ${input.amount} and source = ${input.source}
      and abs(extract(epoch from paid_at - coalesce(${iso}::timestamptz,
            (${local}::timestamp at time zone 'Europe/Madrid'), now()))) < ${DUPLICATE_WINDOW_SECONDS}
    order by paid_at desc limit 1`;
  if (dup[0]) return { tx: toTx(dup[0]), duplicate: true, categorySource: "rule" };

  const { category, source: categorySource } = await classify(merchant, merchantKey, card, input.category);

  const rows = await db()`
    insert into transactions (amount, merchant, merchant_key, card, category, category_source, source, paid_at)
    values (${input.amount}, ${merchant}, ${merchantKey}, ${card}, ${category}, ${categorySource}, ${input.source},
            coalesce(${iso}::timestamptz, (${local}::timestamp at time zone 'Europe/Madrid'), now()))
    returning ${db().unsafe(TX_COLUMNS)}`;
  return { tx: toTx(rows[0]), duplicate: false, categorySource };
}

/** Cambia la categoría de un movimiento y la guarda como regla del comercio (fuente "user"). */
export async function setTransactionCategory(id: string, category: CategoryId) {
  const rows = await db()`
    update transactions set category = ${category}, category_source = 'user'
    where id = ${id} returning merchant, merchant_key`;
  if (!rows[0]) return false;
  await saveRule(String(rows[0].merchant_key), String(rows[0].merchant), category, "user");
  return true;
}

export async function updateTransaction(id: string, data: { amount: number; merchant: string; paidAt: PaidAt | null }) {
  const merchant = data.merchant.trim().slice(0, 200);
  const iso = data.paidAt?.iso ?? null;
  const local = data.paidAt?.local ?? null;
  await db()`
    update transactions set
      amount = ${data.amount}, merchant = ${merchant}, merchant_key = ${normalizeMerchant(merchant)},
      paid_at = coalesce(${iso}::timestamptz, (${local}::timestamp at time zone 'Europe/Madrid'), paid_at)
    where id = ${id}`;
}

export async function deleteTransaction(id: string) {
  await db()`delete from transactions where id = ${id}`;
}

/** Movimientos de un mes (y del anterior, para comparar). `month` = "2026-10". */
export async function getMonthTransactions(month: string) {
  const start = `${month}-01`;
  const rows = await db()`
    select ${db().unsafe(TX_COLUMNS)} from transactions
    where paid_at >= ((${start}::date - interval '1 month')::timestamp at time zone 'Europe/Madrid')
      and paid_at <  ((${start}::date + interval '1 month')::timestamp at time zone 'Europe/Madrid')
    order by paid_at desc, id desc`;
  return rows.map(toTx);
}

/** Primer mes con datos (para no dejar navegar a meses vacíos sin fin). */
export async function getFirstMonth(): Promise<string | null> {
  const rows = await db()`
    select to_char(min(paid_at) at time zone 'Europe/Madrid', 'YYYY-MM') as m from transactions`;
  return (rows[0]?.m as string | null) ?? null;
}

/** Buscador de movimientos (todos los meses). */
export async function searchTransactions(opts: { q?: string; categories?: CategoryId[] | null; category?: CategoryId | null }) {
  const q = opts.q?.trim() ?? "";
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const nameMatches = opts.categories ?? [];
  const rows = await db()`
    select ${db().unsafe(TX_COLUMNS)} from transactions
    where (${opts.category ?? null}::text is null or category = ${opts.category ?? null})
      and (${q} = '' or merchant ilike ${pattern} or card ilike ${pattern} or category = any(${nameMatches}::text[]))
    order by paid_at desc, id desc
    limit 400`;
  return rows.map(toTx);
}
