import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Rutas que no necesitan sesión: la pantalla de login y el icono/manifest para
// "Añadir a pantalla de inicio". El endpoint /api/ingest ni siquiera pasa por aquí
// (ver `matcher`): usa su propia clave y así un fallo de Clerk nunca impide guardar un pago.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/apple-icon(.*)",
  "/manifest.webmanifest",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  const { userId } = await auth();
  if (!userId) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
});

export const config = {
  matcher: [
    // Todo menos archivos estáticos, internos de Next.js y /api/ingest
    "/((?!_next|api/ingest|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api/((?!ingest).*)",
  ],
};
