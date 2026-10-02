"use client";

import { useState } from "react";

export type DayBar = { day: number; amount: number; amountText: string; label: string; future: boolean };

/** Gráfica de barras de gasto por día. Toca una barra para ver el importe de ese día. */
export function DayChart({ days, initial }: { days: DayBar[]; initial: number }) {
  const [sel, setSel] = useState(initial);
  const max = Math.max(...days.map((d) => d.amount), 1);
  const current = days.find((d) => d.day === sel) ?? days[0];

  return (
    <section className="border-t border-line pt-6 pb-8">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-[15px] font-medium">Por día</h2>
        <div className="tabular text-sm text-muted" aria-live="polite">
          {current.label} · <span className="font-medium text-text">{current.amountText}</span>
        </div>
      </div>
      <div className="flex h-[132px] items-end gap-[3px]">
        {days.map((d) => {
          const h = d.future || d.amount <= 0 ? "2px" : `${Math.max((d.amount / max) * 100, 3)}%`;
          const bg = d.future ? "var(--chip)" : d.day === sel ? "var(--text)" : "var(--bar)";
          return (
            <button
              key={d.day}
              disabled={d.future}
              onClick={() => setSel(d.day)}
              aria-label={`${d.label}: ${d.amountText}`}
              className="flex h-full flex-1 cursor-pointer items-end disabled:cursor-default"
            >
              <div className="w-full rounded-[3px_3px_1px_1px]" style={{ height: h, minHeight: 2, background: bg }} />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[3px]" aria-hidden>
        {days.map((d) => (
          <div key={d.day} className="tabular flex-1 text-[11px] whitespace-nowrap text-faint">
            {d.day % 7 === 1 ? d.day : ""}
          </div>
        ))}
      </div>
    </section>
  );
}
