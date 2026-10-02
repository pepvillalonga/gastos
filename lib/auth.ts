import "server-only";
import { currentUser } from "@clerk/nextjs/server";

export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Estado del usuario actual:
 *  - "anon": no ha iniciado sesión
 *  - "forbidden": ha iniciado sesión con un email que no está en ALLOWED_EMAILS
 *  - "ok": puede entrar
 * Solo cuentan los emails verificados. Si ALLOWED_EMAILS está vacía, no entra nadie.
 */
export async function getAccess() {
  const user = await currentUser();
  if (!user) return { status: "anon" as const, email: null };
  const allowed = allowedEmails();
  const emails = user.emailAddresses
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress.toLowerCase());
  const ok = emails.some((e) => allowed.includes(e));
  return {
    status: ok ? ("ok" as const) : ("forbidden" as const),
    email: user.primaryEmailAddress?.emailAddress ?? emails[0] ?? null,
  };
}

/** Para server actions: lanza un error si el usuario no está autorizado. */
export async function requireAllowed() {
  const access = await getAccess();
  if (access.status !== "ok") throw new Error("No autorizado");
}
