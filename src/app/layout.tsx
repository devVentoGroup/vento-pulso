import { Manrope } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { VentoShell } from "@/components/vento/standard/vento-shell";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata = {
  title: "Pulso",
  description: "Escáner de clientes y redenciones",
  icons: {
    icon: "/logos/pulso.svg",
    shortcut: "/logos/pulso.svg",
    apple: "/logos/pulso.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)] antialiased">
        <Script id="vento-number-wheel-guard" strategy="afterInteractive">
          {`(() => {
            if (window.__ventoNumberWheelGuard) return;
            window.__ventoNumberWheelGuard = true;
            document.addEventListener('wheel', (event) => {
              const target = event.target;
              if (!(target instanceof Element)) return;
              const input = target.closest('input[type="number"]');
              if (!input) return;
              if (document.activeElement === input) {
                input.blur();
                event.preventDefault();
              }
            }, { passive: false });
          })();`}
        </Script>
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