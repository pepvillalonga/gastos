import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";

export const metadata = { title: "Entrar · Mis gastos" };

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect("/");

  return (
    <div className="flex h-dvh justify-center bg-surface">
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-12 bg-bg px-7 py-8">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line text-2xl font-semibold tracking-[-0.04em]">
            €
          </div>
          <h1 className="mt-3 mb-0 text-[34px] font-semibold tracking-[-0.03em]">Mis gastos</h1>
          <p className="m-0 text-[15px] text-muted">Tus pagos con Apple Pay, ordenados solos.</p>
        </div>
        <div className="flex w-full max-w-[320px] flex-col items-center gap-3.5">
          <SignInButton mode="modal" forceRedirectUrl="/">
            <button className="h-[54px] w-full cursor-pointer rounded-[14px] bg-text text-base font-medium text-bg hover:opacity-[0.88]">
              Entrar
            </button>
          </SignInButton>
          <span className="text-xs text-faint">Acceso privado</span>
        </div>
      </div>
    </div>
  );
}
