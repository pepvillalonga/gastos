"use client";

import { useState, useTransition } from "react";
import { addTransactionAction, editTransactionAction } from "@/app/actions";
import { CATEGORY_LIST } from "@/lib/categories";
import { nowInMadrid } from "@/lib/dates";
import type { TxView } from "@/lib/view";
import { Sheet } from "./Sheet";

type Props = ({ mode: "add" } | { mode: "edit"; tx: TxView }) & { onClose: () => void };

const field =
  "h-[46px] w-full rounded-xl border-0 bg-chip px-3.5 text-base text-text outline-none focus:ring-2 focus:ring-bar";

export function TxFormSheet(props: Props) {
  const editing = props.mode === "edit" ? props.tx : null;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [defaultWhen] = useState(() => {
    const n = nowInMadrid();
    return `${n.date}T${n.time}`;
  });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await (editing ? editTransactionAction(editing.id, data) : addTransactionAction(data)).catch(
        () => ({ ok: false as const, error: "Sin conexión" }),
      );
      if (res.ok) props.onClose();
      else setError(res.error);
    });
  };

  return (
    <Sheet onClose={props.onClose} label={editing ? "Editar gasto" : "Añadir gasto"}>
      <h2 className="mt-1 mb-6 text-[24px] font-semibold tracking-[-0.02em]">
        {editing ? "Editar gasto" : "Añadir gasto"}
      </h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Label text="Importe (€)">
          <input
            name="amount"
            required
            inputMode="decimal"
            autoComplete="off"
            placeholder="12,50"
            defaultValue={editing ? editing.amountText.replace(" €", "") : ""}
            autoFocus={!editing}
            className={`${field} tabular`}
          />
        </Label>
        <Label text="Comercio">
          <input
            name="merchant"
            required
            maxLength={200}
            autoComplete="off"
            placeholder="Frutería Paco"
            defaultValue={editing?.merchant ?? ""}
            className={field}
          />
        </Label>
        {!editing && (
          <>
            <Label text="Categoría">
              <select name="category" defaultValue="" className={field}>
                <option value="">Automática (según el comercio)</option>
                {CATEGORY_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </Label>
            <Label text="Forma de pago (opcional)">
              <input name="card" maxLength={100} placeholder="Efectivo" className={field} />
            </Label>
          </>
        )}
        <Label text="Fecha y hora">
          <input
            name="paid_at"
            type="datetime-local"
            required
            defaultValue={editing?.localInput ?? defaultWhen}
            className={field}
          />
        </Label>
        {editing && <p className="text-[12.5px] text-muted">La categoría se cambia desde el detalle del movimiento.</p>}
        {error && <p className="text-sm text-neg">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-2 h-[54px] w-full cursor-pointer rounded-[14px] bg-text text-base font-medium text-bg hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Guardando…" : editing ? "Guardar cambios" : "Añadir"}
        </button>
      </form>
    </Sheet>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] text-muted">{text}</span>
      {children}
    </label>
  );
}
