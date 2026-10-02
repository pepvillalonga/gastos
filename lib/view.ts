import { getCategory, type CategoryId } from "./categories";
import { dayLabel, longDate } from "./dates";
import { formatEUR } from "./money";
import type { Tx } from "./transactions";

/** Movimiento con los textos ya preparados para la interfaz. */
export type TxView = {
  id: string;
  merchant: string;
  amount: number;
  amountText: string;
  category: CategoryId;
  manual: boolean;
  card: string;
  /** "Ayer, 14:05" */
  metaDay: string;
  time: string;
  date: string;
  dateLong: string;
  /** Para el formulario de edición: "2026-10-03T14:05" */
  localInput: string;
};

export function toView(tx: Tx, today: string): TxView {
  const [date, time] = tx.local.split(" ");
  const card =
    tx.source === "manual" ? tx.card || "Añadido a mano" : tx.card ? `Apple Pay · ${tx.card}` : "Apple Pay";
  return {
    id: tx.id,
    merchant: tx.merchant,
    amount: tx.amount,
    amountText: formatEUR(tx.amount),
    category: getCategory(tx.category).id,
    manual: tx.source === "manual",
    card,
    metaDay: `${dayLabel(date, today)}, ${time}`,
    time,
    date,
    dateLong: longDate(date),
    localInput: `${date}T${time}`,
  };
}
