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
        <Script id="vento-submit-guard" strategy="afterInteractive">
          {`(() => {
            if (window.__ventoSubmitGuard) return;
            window.__ventoSubmitGuard = true;

            const pendingTextByButton = new WeakMap();

            document.addEventListener('submit', (event) => {
              const form = event.target;
              if (!(form instanceof HTMLFormElement)) return;
              if (form.dataset.submitGuard === 'off') return;
              if (!form.checkValidity()) return;

              if (form.dataset.submitting === 'true') {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
              }

              form.dataset.submitting = 'true';
              const buttons = [
                ...form.querySelectorAll('button[type="submit"], button:not([type])'),
                ...(form.id ? document.querySelectorAll('button[form="' + CSS.escape(form.id) + '"]') : []),
              ];
              for (const button of buttons) {
                if (!(button instanceof HTMLButtonElement)) continue;
                pendingTextByButton.set(button, button.textContent || '');
                button.disabled = true;
                button.setAttribute('aria-disabled', 'true');
                const pendingLabel = button.dataset.pendingLabel || 'Guardando...';
                if (button.dataset.pendingLabel !== 'off') button.textContent = pendingLabel;
              }
            }, true);

            window.addEventListener('pageshow', () => {
              for (const form of document.querySelectorAll('form[data-submitting="true"]')) {
                form.dataset.submitting = 'false';
                const buttons = [
                  ...form.querySelectorAll('button[type="submit"], button:not([type])'),
                  ...(form.id ? document.querySelectorAll('button[form="' + CSS.escape(form.id) + '"]') : []),
                ];
                for (const button of buttons) {
                  if (!(button instanceof HTMLButtonElement)) continue;
                  button.disabled = false;
                  button.removeAttribute('aria-disabled');
                  const previousText = pendingTextByButton.get(button);
                  if (previousText) button.textContent = previousText;
                }
              }
            });
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
