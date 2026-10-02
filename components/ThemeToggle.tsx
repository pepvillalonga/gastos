"use client";

import { useSyncExternalStore } from "react";

const EVENT = "tema-change";

function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    mq.removeEventListener("change", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function useTheme() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const toggle = () => {
    const next = !isDark();
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("tema", next ? "dark" : "light");
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return { dark, toggle };
}

/** Botón redondo del móvil (cabecera del panel). */
export function ThemeIconButton() {
  const { toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      className="flex h-11 w-11 cursor-pointer items-center justify-center text-muted"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" />
      </svg>
    </button>
  );
}

/** Botón de texto de la barra lateral (escritorio). */
export function ThemeTextButton({ className }: { className: string }) {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} className={className}>
      {dark ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
