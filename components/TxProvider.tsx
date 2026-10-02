"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { TxView } from "@/lib/view";
import { DetailSheet } from "./DetailSheet";
import { TxFormSheet } from "./TxFormSheet";

type Ctx = {
  openTx: (tx: TxView) => void;
  openAdd: () => void;
};

const TxContext = createContext<Ctx | null>(null);

export function useTx() {
  const ctx = useContext(TxContext);
  if (!ctx) throw new Error("useTx debe usarse dentro de <TxProvider>");
  return ctx;
}

type FormState = { mode: "add" } | { mode: "edit"; tx: TxView } | null;

/** Guarda qué movimiento está abierto y pinta las hojas de detalle / formulario. */
export function TxProvider({ children }: { children: React.ReactNode }) {
  const [sel, setSel] = useState<TxView | null>(null);
  const [form, setForm] = useState<FormState>(null);

  const openAdd = () => setForm({ mode: "add" });
  const closeSel = useCallback(() => setSel(null), []);
  const closeForm = useCallback(() => setForm(null), []);

  return (
    <TxContext.Provider value={{ openTx: setSel, openAdd }}>
      {children}
      {sel && (
        <DetailSheet
          key={sel.id}
          tx={sel}
          onClose={closeSel}
          onEdit={() => {
            setForm({ mode: "edit", tx: sel });
            setSel(null);
          }}
        />
      )}
      {form && <TxFormSheet {...form} onClose={closeForm} />}
    </TxContext.Provider>
  );
}
