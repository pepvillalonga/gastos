"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { ThemeTextButton } from "./ThemeToggle";
import { TxProvider, useTx } from "./TxProvider";

const sideBtn = "h-10 cursor-pointer rounded-[10px] px-3 text-left text-sm text-muted hover:bg-chip";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <TxProvider>
      <div className="flex h-dvh justify-center bg-surface">
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-bg desk:flex-row">
          <Sidebar />
          <main id="main" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1040px] px-5 pt-2 pb-10 desk:px-12 desk:pt-9 desk:pb-[72px]">{children}</div>
          </main>
          <BottomNav />
        </div>
      </div>
    </TxProvider>
  );
}

function useSection() {
  const path = usePathname();
  return path.startsWith("/movimientos") ? "movs" : "panel";
}

function Sidebar() {
  const section = useSection();
  const { openAdd } = useTx();
  const nav = (on: boolean) =>
    `flex h-10 items-center rounded-[10px] px-3 text-[15px] no-underline ${on ? "bg-chip text-text" : "text-muted hover:text-text"}`;
  return (
    <aside className="hidden w-[232px] flex-none flex-col gap-7 border-r border-line px-4 py-7 desk:flex">
      <div className="px-3 text-lg font-semibold tracking-[-0.02em]">Mis gastos</div>
      <nav className="flex flex-col gap-0.5">
        <Link href="/" className={nav(section === "panel")}>
          Panel
        </Link>
        <Link href="/movimientos" className={nav(section === "movs")}>
          Movimientos
        </Link>
      </nav>
      <button
        onClick={openAdd}
        className="h-10 cursor-pointer rounded-[10px] border border-line px-3 text-left text-[15px] hover:bg-chip"
      >
        + Añadir gasto
      </button>
      <div className="mt-auto flex flex-col gap-0.5">
        <ThemeTextButton className={sideBtn} />
        <SignOutBtn className={sideBtn} />
      </div>
    </aside>
  );
}

function BottomNav() {
  const section = useSection();
  const tab = (on: boolean) =>
    `flex h-[58px] flex-col items-center justify-center gap-1 no-underline ${on ? "text-text" : "text-faint"}`;
  return (
    <nav className="grid flex-none grid-cols-2 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] desk:hidden">
      <Link href="/" className={tab(section === "panel")} aria-current={section === "panel" ? "page" : undefined}>
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          <rect x="3" y="11" width="3.5" height="8" rx="1" fill="currentColor" />
          <rect x="9.25" y="4" width="3.5" height="15" rx="1" fill="currentColor" />
          <rect x="15.5" y="8" width="3.5" height="11" rx="1" fill="currentColor" />
        </svg>
        <span className="text-[11px] font-medium">Panel</span>
      </Link>
      <Link href="/movimientos" className={tab(section === "movs")} aria-current={section === "movs" ? "page" : undefined}>
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          <rect x="3" y="5" width="16" height="2" rx="1" fill="currentColor" />
          <rect x="3" y="10" width="16" height="2" rx="1" fill="currentColor" />
          <rect x="3" y="15" width="11" height="2" rx="1" fill="currentColor" />
        </svg>
        <span className="text-[11px] font-medium">Movimientos</span>
      </Link>
    </nav>
  );
}

/** Botón "+" para añadir un gasto a mano. */
export function AddButton({ className, children }: { className: string; children: React.ReactNode }) {
  const { openAdd } = useTx();
  return (
    <button onClick={openAdd} className={className} aria-label="Añadir gasto">
      {children}
    </button>
  );
}

/** "Salir" para el móvil (en escritorio está en la barra lateral). */
export function MobileSignOut() {
  return (
    <div className="mt-10 flex justify-center desk:hidden">
      <SignOutBtn className="cursor-pointer rounded-[10px] px-4 py-2 text-sm text-faint hover:bg-chip" />
    </div>
  );
}

/**
 * Cierra la sesión y, cuando Clerk ha terminado, carga /sign-in con una navegación completa.
 * Así no se recarga el panel con la sesión a medio borrar (eso provocaba un error de Clerk).
 */
function SignOutBtn({ className }: { className: string }) {
  const { signOut } = useClerk();
  return (
    <button className={className} onClick={() => signOut().finally(() => window.location.assign("/sign-in"))}>
      Salir
    </button>
  );
}
