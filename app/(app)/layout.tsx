import { Shell } from "@/components/Shell";

// El acceso lo controla proxy.ts: sin sesión, redirige a /sign-in.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <Shell>{children}</Shell>;
}
