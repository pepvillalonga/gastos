"use client";

import { getCategory } from "@/lib/categories";
import type { TxView } from "@/lib/view";
import { useTx } from "./TxProvider";

/**
 * Fila de un movimiento. `variant="panel"` muestra "Ayer, 14:05";
 * `variant="list"` muestra un punto de color + "Categoría · 14:05".
 */
export function TxRow({ tx, variant }: { tx: TxView; variant: "panel" | "list" }) {
  const { openTx } = useTx();
  const c = getCategory(tx.category);
  return (
    <button
      onClick={() => openTx(tx)}
      className="flex w-full cursor-pointer items-center gap-3.5 border-b border-line py-3 text-left"
    >
      <div
        className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-[19px]"
        style={{ background: c.tint }}
      >
        {c.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{tx.merchant}</div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
          {variant === "list" && <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: c.color }} />}
          <span className="truncate">{variant === "list" ? `${c.name} · ${tx.time}` : tx.metaDay}</span>
          {tx.manual && (
            <span className="flex-none rounded-md border border-line px-1.5 text-[11px] leading-4 text-muted">Manual</span>
          )}
        </div>
      </div>
      <span className={`tabular text-[15px] font-medium whitespace-nowrap ${tx.amount < 0 ? "text-pos" : ""}`}>
        {tx.amountText}
      </span>
    </button>
  );
}
