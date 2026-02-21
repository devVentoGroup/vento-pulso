import { Manrope } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { VentoShell } from "@/components/vento/standard/vento-shell";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata = {
  title: "Pulso",
  description: "Escáner de clientes y redenciones",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)] antialiased">
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center text-[var(--ui-muted)]">
              Cargando...
            </div>
          }
        >
          <VentoShell>{children}</VentoShell>
        </Suspense>
      </body>
    </html>
  );
}
