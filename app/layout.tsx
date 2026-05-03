import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pesca Ibérica · Para Manuel",
  description:
    "Un juego de pesca por los pantanos de España: Las Portiñas, El Rosarito y El Cíjara.",
};

export const viewport: Viewport = {
  themeColor: "#07182b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
