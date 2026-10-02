import { Suspense } from "react";
import Link from "next/link";
import { CATEGORY_LIST, isCategoryId } from "@/lib/categories";
import { dayLabel, nowInMadrid } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { searchTransactions } from "@/lib/transactions";
import { toView, type TxView } from "@/lib/view";
import { SearchBox } from "@/components/SearchBox";
import { AddButton } from "@/components/Shell";
import { TxRow } from "@/components/TxRow";

export const metadata = { title: "Movimientos · Mis gastos" };

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default async function MovimientosPage({ searchParams }: PageProps<"/movimientos">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const cat = isCategoryId(sp.cat) ? sp.cat : null;
  const today = nowInMadrid().date;

  // Si el texto coincide con el nombre de una categoría ("super", "gasol"...), también la buscamos.
  const byName = q ? CATEGORY_LIST.filter((c) => fold(c.name).includes(fold(q))).map((c) => c.id) : [];
  const txs = await searchTransactions({ q, category: cat, categories: byName });
  const rows = txs.map((t) => toView(t, today));

  const groups: { date: string; label: string; total: number; rows: TxView[] }[] = [];
  for (const r of rows) {
    let g = groups.at(-1);
    if (!g || g.date !== r.date) {
      g = { date: r.date, label: dayLabel(r.date, today), total: 0, rows: [] };
      groups.push(g);
    }
    g.total += r.amount;
    g.rows.push(r);
  }

  const listTotal = rows.reduce((a, r) => a + r.amount, 0);
  const chipHref = (id: string | null) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (id) p.set("cat", id);
    const s = p.toString();
    return s ? `/movimientos?${s}` : "/movimientos";
  };
  const chips = [{ id: null, label: "Todas" }, ...CATEGORY_LIST.map((c) => ({ id: c.id, label: `${c.emoji} ${c.name}` }))];

  return (
    <>
      <div className="mt-5 mb-[18px] flex items-center justify-between gap-3 desk:mt-0 desk:mb-6">
        <h1 className="m-0 text-[30px] font-semibold tracking-[-0.03em]">Movimientos</h1>
        <AddButton className="h-10 cursor-pointer rounded-xl border border-line px-3.5 text-sm hover:bg-chip">
          + Añadir
        </AddButton>
      </div>

      <Suspense>
        <SearchBox />
      </Suspense>

      <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 desk:mx-0 desk:flex-wrap desk:px-0">
        {chips.map((c) => {
          const on = cat === c.id;
          return (
            <Link
              key={c.id ?? "all"}
              href={chipHref(c.id)}
              scroll={false}
              replace
              className="flex h-9 flex-none items-center gap-1.5 rounded-[18px] border px-3.5 text-sm whitespace-nowrap no-underline"
              style={{
                borderColor: on ? "var(--text)" : "var(--line)",
                background: on ? "var(--text)" : "transparent",
                color: on ? "var(--bg)" : "var(--text)",
              }}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      {(cat || q) && rows.length > 0 && (
        <div className="mt-[18px] text-sm text-muted">
          {rows.length} {rows.length === 1 ? "movimiento" : "movimientos"} · {formatEUR(listTotal)}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.date} className="mt-3">
          <div className="sticky top-0 z-[1] flex items-baseline justify-between border-b border-line bg-bg pt-4 pb-1.5">
            <span className="text-sm font-medium">{g.label}</span>
            <span className="tabular text-[13px] text-faint">{formatEUR(g.total)}</span>
          </div>
          {g.rows.map((r) => (
            <TxRow key={r.id} tx={r} variant="list" />
          ))}
        </div>
      ))}

      {rows.length === 0 && (
        <div className="flex flex-col gap-1.5 px-3 py-16 text-center">
          <div className="text-[17px] font-medium">{cat || q ? "Sin resultados" : "Aún no hay movimientos"}</div>
          <div className="text-sm text-muted">
            {cat || q ? "Prueba con otro comercio o quita el filtro." : "Paga con Apple Pay o añade un gasto a mano."}
          </div>
        </div>
      )}
    </>
  );
}
