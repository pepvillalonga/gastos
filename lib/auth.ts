import "server-only";
import { auth } from "@clerk/nextjs/server";

/**
 * Para server actions: lanza un error si no hay sesión iniciada.
 * Cualquier usuario de tu app de Clerk puede entrar, así que el registro
 * público debe estar desactivado en Clerk (Sign-up mode → Restricted).
 */
export async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");
}
