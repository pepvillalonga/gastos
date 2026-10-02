import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { getAccess } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const access = await getAccess();
  if (access.status === "anon") redirect("/sign-in");

  if (access.status === "forbidden") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-7 text-center">
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em]">Sin acceso</h1>
        <p className="m-0 max-w-[320px] text-[15px] leading-normal text-muted">
          La cuenta {access.email ? <strong className="text-text">{access.email}</strong> : "actual"} no está autorizada
          para ver estos gastos.
        </p>
        <SignOutButton redirectUrl="/sign-in">
          <button className="mt-2 h-11 cursor-pointer rounded-xl border border-line px-[18px] text-[15px] hover:bg-chip">
            Salir y usar otra cuenta
          </button>
        </SignOutButton>
      </div>
    );
  }

  return <Shell>{children}</Shell>;
}
