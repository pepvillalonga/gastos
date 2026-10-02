"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-3 py-20 text-center">
      <h1 className="m-0 text-xl font-medium">Algo ha fallado</h1>
      <p className="m-0 max-w-[320px] text-[15px] leading-normal text-muted">
        No se han podido cargar los gastos. Si acabas de desplegar, revisa que DATABASE_URL esté bien configurada en
        Vercel y que hayas ejecutado db/schema.sql en Neon.
      </p>
      <button
        onClick={reset}
        className="mt-3 h-11 cursor-pointer rounded-xl border border-line px-[18px] text-[15px] hover:bg-chip"
      >
        Reintentar
      </button>
    </div>
  );
}
