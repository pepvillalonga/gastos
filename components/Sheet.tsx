"use client";

import { useEffect } from "react";

/** Hoja inferior en el móvil y ventana centrada en escritorio, como en el diseño. */
export function Sheet({ onClose, label, children }: { onClose: () => void; label: string; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-scrim desk:items-center desk:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="anim-sheet max-h-[90%] w-full overflow-y-auto overscroll-contain rounded-t-[20px] border border-line bg-bg px-[22px] pt-2.5 pb-[calc(28px+env(safe-area-inset-bottom))] desk:max-w-[480px] desk:rounded-[20px] desk:pb-7"
      >
        <div className="flex justify-center pb-1 desk:opacity-0">
          <div className="h-1 w-9 rounded-sm bg-line" />
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="cursor-pointer py-2 pl-3 text-[15px] text-muted hover:text-text"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
