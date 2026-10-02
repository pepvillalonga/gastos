import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Icono para "Añadir a pantalla de inicio" en el iPhone. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f1f1f",
          color: "#fff",
          fontSize: 104,
          fontWeight: 600,
        }}
      >
        €
      </div>
    ),
    size,
  );
}
