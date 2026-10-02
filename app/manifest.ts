import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mis gastos",
    short_name: "Gastos",
    description: "Tus pagos con Apple Pay, ordenados solos.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "es",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
