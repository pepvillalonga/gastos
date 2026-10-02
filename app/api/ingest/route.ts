import { timingSafeEqual } from "node:crypto";
import { CATEGORY_LIST, getCategory } from "@/lib/categories";
import { formatEUR, parseAmount } from "@/lib/money";
import { createTransaction, parsePaidAt, type TxSource } from "@/lib/transactions";

export const dynamic = "force-dynamic";

function checkSecret(req: Request) {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const error = (status: number, message: string) =>
  Response.json({ ok: false, error: message, message }, { status });

/** Texto plano de un campo (acepta también números). */
function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

/** Lista de categorías para el «Elegir de la lista» del atajo manual. No es secreta. */
export function GET() {
  return Response.json(["Automática", ...CATEGORY_LIST.map((c) => c.name)]);
}

export async function POST(req: Request) {
  if (!checkSecret(req)) return error(401, "No autorizado");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== "object") throw new Error();
  } catch {
    return error(400, "El cuerpo debe ser JSON");
  }

  const amount = parseAmount(body.amount);
  if (amount === null || amount === 0) return error(400, `Importe no válido: ${JSON.stringify(body.amount ?? null)}`);
  if (Math.abs(amount) > 1_000_000) return error(400, "Importe demasiado grande");

  const merchant = text(body.merchant);
  if (!merchant) return error(400, "Falta el comercio (merchant)");

  const source: TxSource = text(body.source).toLowerCase() === "manual" ? "manual" : "applepay";

  try {
    const { tx, duplicate } = await createTransaction({
      amount,
      merchant,
      card: text(body.card) || null,
      category: text(body.category) || null,
      source,
      paidAt: parsePaidAt(text(body.paid_at)),
    });
    const cat = getCategory(tx.category);
    const message = duplicate
      ? `Ya estaba guardado: ${formatEUR(tx.amount)} en ${tx.merchant} → ${cat.name}`
      : `${formatEUR(tx.amount)} en ${tx.merchant} → ${cat.name}`;

    return Response.json(
      {
        ok: true,
        duplicate,
        category: cat.id,
        category_name: cat.name,
        message,
      },
      { status: duplicate ? 200 : 201 },
    );
  } catch (err) {
    console.error("[ingest] error guardando:", err);
    return error(500, "No se pudo guardar el gasto. Revisa los logs de Vercel.");
  }
}
