"use client";

import { useMemo, useState } from "react";
import { QrCode, User } from "lucide-react";

import { QRScanner } from "@/modules/pos/components/qr-scanner";
import type { QRScanResult } from "@/modules/pos/types";

type ScannerPageProps = {
  siteId: string;
};

export function ScannerPage({ siteId }: ScannerPageProps) {
  const [selectedClient, setSelectedClient] = useState<QRScanResult | null>(null);

  const statusText = useMemo(() => {
    if (!selectedClient) {
      return "Esperando codigo. Pega el QR o usa un lector USB.";
    }
    return `Cliente listo para operacion: ${selectedClient.full_name || "Sin nombre"}`;
  }, [selectedClient]);

  return (
    <div className="w-full space-y-6">
      <div className="ui-panel ui-panel--halo">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="ui-h1">Pulso</h1>
            <p className="mt-2 ui-body-muted">
              Identifica clientes y valida redenciones de Vento Pass desde caja.
            </p>
          </div>
          <div className="ui-chip ui-chip--brand">
            <QrCode className="h-4 w-4" />
            Lector USB
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <QRScanner
          selectedClient={selectedClient}
          onScan={(result) => setSelectedClient(result)}
          onClear={() => setSelectedClient(null)}
          siteId={siteId}
        />

        <div className="ui-panel">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[var(--ui-brand)]" />
            <div className="ui-h3">Estado</div>
          </div>

          {selectedClient ? (
            <div className="mt-4 space-y-2">
              <div className="text-lg font-semibold text-[var(--ui-text)]">
                {selectedClient.full_name || "Sin nombre"}
              </div>
              <div className="ui-body-muted">{selectedClient.email ?? "Sin email"}</div>
              <div className="ui-chip ui-chip--brand">
                Puntos: {selectedClient.loyalty_points ?? 0}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-4 py-3 ui-body-muted">
              {statusText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
