"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isCategoryId, resolveCategory } from "@/lib/categories";
import { parseAmount } from "@/lib/money";
import {
  createTransaction,
  deleteTransaction,
  parsePaidAt,
  setTransactionCategory,
  updateTransaction,
} from "@/lib/transactions";

export type ActionResult = { ok: true } | { ok: false, error: string };

const validId = (id: unknown): id is string => typeof id === "string" && /^\d{1,18}$/.test(id);

function refresh() {
  revalidatePath("/", "layout");
}

export async function changeCategoryAction(id: string, category: string): Promise<ActionResult> {
  await requireUser();
  if (!validId(id) || !isCategoryId(category)) return { ok: false, error: "Datos no válidos" };
  const done = await setTransactionCategory(id, category);
  refresh();
  return done ? { ok: true } : { ok: false, error: "Ese movimiento ya no existe" };
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  await requireUser();
  if (!validId(id)) return { ok: false, error: "Datos no válidos" };
  await deleteTransaction(id);
  refresh();
  return { ok: true };
}

function readForm(form: FormData) {
  const amount = parseAmount(String(form.get("amount") ?? ""));
  const merchant = String(form.get("merchant") ?? "").trim();
  const when = String(form.get("paid_at") ?? "").trim();
  if (amount === null || amount === 0) return { error: "Escribe un importe válido, por ejemplo 12,50" } as const;
  if (Math.abs(amount) > 1_000_000) return { error: "Importe demasiado grande" } as const;
  if (!merchant) return { error: "Escribe el comercio" } as const;
  return { amount, merchant, paidAt: parsePaidAt(when) } as const;
}

export async function addTransactionAction(form: FormData): Promise<ActionResult> {
  await requireUser();
  const data = readForm(form);
  if ("error" in data) return { ok: false, error: data.error! };
  try {
    await createTransaction({
      ...data,
      card: String(form.get("card") ?? "").trim() || null,
      category: resolveCategory(String(form.get("category") ?? "")),
      source: "manual",
    });
  } catch (e) {
    console.error("[web] error añadiendo gasto:", e);
    return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." };
  }
  refresh();
  return { ok: true };
}

export async function editTransactionAction(id: string, form: FormData): Promise<ActionResult> {
  await requireUser();
  if (!validId(id)) return { ok: false, error: "Datos no válidos" };
  const data = readForm(form);
  if ("error" in data) return { ok: false, error: data.error! };
  await updateTransaction(id, data);
  refresh();
  return { ok: true };
}
