import Link from "next/link";
import { getCategory } from "@/lib/categories";
import { daysInMonth, dayLabel, isMonthKey, monthFromIndex, monthIndex, monthName, nowInMadrid } from "@/lib/dates";
import { normalizeMerchant } from "@/lib/merchant";
import { formatEUR, formatParts } from "@/lib/money";
import { getFirstMonth, getMonthTransactions } from "@/lib/transactions";
import { toView } from "@/lib/view";
import { DayChart, type DayBar } from "@/components/DayChart";
import { AddButton, MobileSignOut } from "@/components/Shell";
import { ThemeIconButton } from "@/components/ThemeToggle";
import { TxRow } from "@/components/TxRow";

export default async function PanelPage({ searchParams }: PageProps<"/">) {
  const { mes } = await searchParams;
  const today = nowInMadrid().date;
  const curMonth = today.slice(0, 7);
  const month = isMonthKey(mes) && mes <= curMonth ? mes : curMonth;
  const isCur = month === curMonth;

  const [txs, first] = await Promise.all([getMonthTransactions(month), getFirstMonth()]);
  const minMonth = first && first < month ? first : month;
  const prevKey = monthFromIndex(monthIndex(month) - 1);
  const nextKey = monthFromIndex(monthIndex(month) + 1);
  const canPrev = month > minMonth;
  const canNext = month < curMonth;

  // Totales y comparación con el mes anterior (si es el mes en curso, hasta el mismo día).
  const todayDay = Number(today.slice(8, 10));
  const cutoff = isCur ? todayDay : 31;
  const mtx = txs.filter((t) => t.local.startsWith(month));
  const total = mtx.reduce((a, t) => a + t.amount, 0);
  const prevTotal = txs
    .filter((t) => t.local.startsWith(prevKey) && Number(t.local.slice(8, 10)) <= cutoff)
    .reduce((a, t) => a + t.amount, 0);
  const pct = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
  const tf = formatParts(total);

  // Gasto por día
  const dim = daysInMonth(month);
  const byDay = Array<number>(dim + 1).fill(0);
  for (const t of mtx) byDay[Number(t.local.slice(8, 10))] += t.amount;
  let lastWith = 1;
  for (let d = 1; d <= dim; d++) if (byDay[d] > 0) lastWith = d;
  const days: DayBar[] = Array.from({ length: dim }, (_, i) => {
    const d = i + 1;
    return {
      day: d,
      amount: byDay[d],
      amountText: formatEUR(byDay[d]),
      label: dayLabel(`${month}-${String(d).padStart(2, "0")}`, today),
      future: isCur && d > todayDay,
    };
  });

  // Por categoría
  const catAgg = new Map<string, number>();
  for (const t of mtx) catAgg.set(t.category, (catAgg.get(t.category) ?? 0) + t.amount);
  const cats = [...catAgg.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, amount]) => ({ ...getCategory(id), amount, share: total > 0 ? Math.max(0, (amount / total) * 100) : 0 }));

  // Comercios donde más gasto
  const merchAgg = new Map<string, { name: string; amount: number; n: number; category: string }>();
  for (const t of mtx) {
    const key = normalizeMerchant(t.merchant);
    const o = merchAgg.get(key) ?? { name: t.merchant, amount: 0, n: 0, category: t.category };
    o.amount += t.amount;
    o.n++;
    merchAgg.set(key, o);
  }
  const top = [...merchAgg.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const latest = mtx.slice(0, 5).map((t) => toView(t, today));

  return (
    <>
      <div className="grid grid-cols-[44px_1fr_44px] items-center">
        <AddButton className="flex h-11 w-11 cursor-pointer items-center justify-center text-2xl font-light text-muted desk:invisible">
          +
        </AddButton>
        <div className="flex items-center justify-center gap-1">
          <MonthLink href={canPrev ? `/?mes=${prevKey}` : null} label="Mes anterior">‹</MonthLink>
          <div className="min-w-[150px] text-center text-base font-medium">
            {monthName(month)} {month.slice(0, 4)}
          </div>
          <MonthLink href={canNext ? (nextKey === curMonth ? "/" : `/?mes=${nextKey}`) : null} label="Mes siguiente">›</MonthLink>
        </div>
        <div className="desk:invisible">
          <ThemeIconButton />
        </div>
      </div>

      <section className="flex flex-col items-center gap-3 pt-8 pb-10 text-center desk:pt-10 desk:pb-12">
        <div className="text-sm text-muted">Gastado en {monthName(month)}</div>
        <div
          className="tabular flex items-baseline font-medium tracking-[-0.045em]"
          style={{ color: total ? "var(--text)" : "var(--faint)" }}
        >
          <span className="text-[64px] leading-none desk:text-[84px]">
            {tf.sign}
            {tf.int}
          </span>
          <span className="text-[28px] leading-none text-muted desk:text-[36px]">,{tf.dec} €</span>
        </div>
        {total > 0 && prevTotal > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm">
            <span className="font-medium" style={{ color: pct <= 0 ? "var(--pos)" : "var(--neg)" }}>
              {pct <= 0 ? "↓" : "↑"} {Math.abs(pct)} % vs {monthName(prevKey)}
            </span>
            {isCur && <span className="text-faint">· a día {todayDay}</span>}
          </div>
        )}
      </section>

      {mtx.length === 0 ? (
        <section className="flex flex-col items-center gap-3 border-t border-line px-3 pt-14 pb-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-bar text-[22px] text-faint">
            0
          </div>
          <h2 className="mt-2 mb-0 text-xl font-medium tracking-[-0.01em]">Ningún gasto en {monthName(month)}</h2>
          <p className="m-0 max-w-[300px] text-[15px] leading-normal text-pretty text-muted">
            Cuando pagues con Apple Pay, tus gastos aparecerán aquí solos. Mientras tanto, disfruta de la calma.
          </p>
          {!isCur && (
            <Link
              href="/"
              className="mt-3 flex h-11 items-center rounded-xl border border-line px-[18px] text-[15px] text-text no-underline hover:bg-chip"
            >
              Ir a {monthName(curMonth)}
            </Link>
          )}
        </section>
      ) : (
        <>
          <DayChart key={month} days={days} initial={isCur ? todayDay : lastWith} />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-x-14">
            <section className="border-t border-line pt-6 pb-8">
              <h2 className="mt-0 mb-2 text-[15px] font-medium">Por categoría</h2>
              {cats.map((c) => (
                <Link
                  key={c.id}
                  href={`/movimientos?cat=${c.id}`}
                  className="flex items-center gap-3.5 py-3 text-text no-underline"
                >
                  <div
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-[19px]"
                    style={{ background: c.tint }}
                  >
                    {c.emoji}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-baseline gap-2.5">
                      <span className="min-w-0 flex-1 truncate text-[15px]">{c.name}</span>
                      <span className="tabular text-[13px] text-faint">{Math.round(c.share)} %</span>
                      <span className="tabular min-w-[76px] text-right text-[15px] font-medium">{formatEUR(c.amount)}</span>
                    </div>
                    <div className="h-[3px] overflow-hidden rounded-sm bg-chip">
                      <div className="h-full rounded-sm" style={{ width: `${c.share}%`, background: c.color }} />
                    </div>
                  </div>
                </Link>
              ))}
            </section>

            <div>
              <section className="border-t border-line pt-6 pb-8">
                <h2 className="mt-0 mb-2 text-[15px] font-medium">Dónde más gasto</h2>
                {top.map((m, i) => (
                  <div key={m.name + i} className="flex items-center gap-3.5 border-b border-line py-[11px]">
                    <span className="tabular w-[18px] text-[13px] text-faint">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px]">{m.name}</div>
                      <div className="mt-0.5 text-[13px] text-muted">
                        {getCategory(m.category).emoji} {m.n} {m.n === 1 ? "pago" : "pagos"}
                      </div>
                    </div>
                    <span className="tabular text-[15px] font-medium">{formatEUR(m.amount)}</span>
                  </div>
                ))}
              </section>

              <section className="border-t border-line pt-6 pb-8">
                <div className="mb-1 flex items-baseline justify-between">
                  <h2 className="m-0 text-[15px] font-medium">Últimos movimientos</h2>
                  <Link href="/movimientos" className="py-2 pl-3 text-sm text-muted no-underline hover:text-text">
                    Ver todos ›
                  </Link>
                </div>
                {latest.map((t) => (
                  <TxRow key={t.id} tx={t} variant="panel" />
                ))}
              </section>
            </div>
          </div>
        </>
      )}
      <MobileSignOut />
    </>
  );
}

function MonthLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  const cls = "flex h-11 w-11 items-center justify-center text-2xl no-underline";
  if (!href)
    return (
      <span className={cls} style={{ color: "var(--line)" }} aria-hidden>
        {children}
      </span>
    );
  return (
    <Link href={href} className={`${cls} text-text`} aria-label={label}>
      {children}
    </Link>
  );
}
