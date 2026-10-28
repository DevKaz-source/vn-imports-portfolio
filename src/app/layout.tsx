import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
const manrope = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../../node_modules/@fontsource/manrope/files/manrope-latin-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../../node_modules/@fontsource/manrope/files/manrope-latin-600-normal.woff2",
      weight: "600",
    },
    {
      path: "../../node_modules/@fontsource/manrope/files/manrope-latin-700-normal.woff2",
      weight: "700",
    },
  ],
  variable: "--font-manrope",
  display: "swap",
});
const barlow = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2",
      weight: "600",
    },
    {
      path: "../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2",
      weight: "700",
    },
  ],
  variable: "--font-barlow",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "VN Imports | Estilo sem fronteiras",
    template: "%s | VN Imports",
  },
  description:
    "Streetwear, essenciais e atitude. Encontre seu próximo fit na seleção VN.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${barlow.variable}`}>
      <body>{children}</body>
    </html>
  );
}
