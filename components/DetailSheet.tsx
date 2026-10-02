"use client";

import { useState, useTransition } from "react";
import { changeCategoryAction, deleteTransactionAction } from "@/app/actions";
import { CATEGORY_LIST, getCategory, type CategoryId } from "@/lib/categories";
import type { TxView } from "@/lib/view";
import { Sheet } from "./Sheet";

export function DetailSheet({ tx, onClose, onEdit }: { tx: TxView; onClose: () => void; onEdit: () => void }) {
  const [category, setCategory] = useState<CategoryId>(tx.category);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cat = getCategory(category);

  const pick = (id: CategoryId) => {
    if (id === category) return;
    const before = category;
    setCategory(id); // se ve al instante; si falla, se deshace
    setError(null);
    startTransition(async () => {
      const res = await changeCategoryAction(tx.id, id).catch(() => ({ ok: false as const, error: "Sin conexión" }));
      if (!res.ok) {
        setCategory(before);
        setError(res.error);
      }
    });
  };

  const del = () => {
    if (!confirmDel) return setConfirmDel(true);
    startTransition(async () => {
      const res = await deleteTransactionAction(tx.id).catch(() => ({ ok: false as const, error: "Sin conexión" }));
      if (res.ok) onClose();
      else setError(res.error);
    });
  };

  return (
    <Sheet onClose={onClose} label={`Movimiento en ${tx.merchant}`}>
      <div className="flex flex-col items-center gap-2 pt-1 pb-6 text-center">
        <div
          className="flex h-[52px] w-[52px] items-center justify-center rounded-[15px] text-[25px]"
          style={{ background: cat.tint }}
        >
          {cat.emoji}
        </div>
        <div className="tabular mt-2 text-[46px] leading-[1.1] font-medium tracking-[-0.04em]">{tx.amountText}</div>
        <div className="text-[17px] font-medium break-words">{tx.merchant}</div>
      </div>

      <div className="border-t border-line text-sm">
        <Row label="Fecha" value={tx.dateLong} />
        <Row label="Hora" value={tx.time} />
        <Row label="Tarjeta" value={tx.card} />
      </div>

      <h3 className="mt-[26px] mb-3 text-[15px] font-medium">Categoría</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(82px,1fr))] gap-2">
        {CATEGORY_LIST.map((c) => {
          const on = c.id === category;
          return (
            <button
              key={c.id}
              onClick={() => pick(c.id)}
              aria-pressed={on}
              className="flex min-h-[78px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl px-1 pt-2.5 pb-2"
              style={{
                border: `1.5px solid ${on ? c.color : "var(--line)"}`,
                background: on ? c.tint : "transparent",
              }}
            >
              <span className="text-[22px] leading-none">{c.emoji}</span>
              <span
                className="text-center text-[11.5px] leading-[1.2] text-balance"
                style={{ color: on ? "var(--text)" : "var(--muted)" }}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[12.5px] leading-[1.45] text-muted">
        Los próximos pagos en este comercio usarán esta categoría.
      </p>
      {error && <p className="mt-3 text-sm text-neg">{error}</p>}

      <div className="mt-7 flex justify-center gap-2">
        <button
          onClick={onEdit}
          disabled={pending}
          className="cursor-pointer rounded-[10px] px-4 py-2.5 text-[15px] text-muted hover:bg-chip disabled:opacity-50"
        >
          Editar
        </button>
        <button
          onClick={del}
          disabled={pending}
          className="cursor-pointer rounded-[10px] px-4 py-2.5 text-[15px] text-neg hover:bg-chip disabled:opacity-50"
        >
          {confirmDel ? "Toca otra vez para borrar" : "Borrar movimiento"}
        </button>
      </div>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-[13px]">
      <span className="text-muted">{label}</span>
      <span className="tabular text-right">{value}</span>
    </div>
  );
}
