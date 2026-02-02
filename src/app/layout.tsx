import { Manrope } from "next/font/google";
import "./globals.css";
import { VentoShell } from "@/components/vento/standard/vento-shell";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata = {
  title: "Pulso",
  description: "Scanner de clientes y redenciones",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)] antialiased">
        <VentoShell>{children}</VentoShell>
      </body>
    </html>
  );
}
