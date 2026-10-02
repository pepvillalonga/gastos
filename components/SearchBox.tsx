"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Buscador: actualiza ?q= en la URL (con una pequeña espera mientras escribes). */
export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex h-[46px] max-w-[560px] items-center gap-2.5 rounded-xl bg-chip px-3.5">
      <svg width="17" height="17" viewBox="0 0 18 18" className="flex-none text-faint" aria-hidden>
        <circle cx="8" cy="8" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <line x1="12.3" y1="12.3" x2="16" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar comercio o categoría"
        aria-label="Buscar comercio o categoría"
        className="h-full min-w-0 flex-1 border-0 bg-transparent text-base text-text outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {q && (
        <button onClick={() => setQ("")} className="cursor-pointer py-1.5 pl-1.5 text-[13px] text-muted">
          Borrar
        </button>
      )}
    </div>
  );
}
