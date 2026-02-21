"use client";

import { useMemo, useState } from "react";

import { QRScanner } from "@/modules/pos/components/qr-scanner";
import type { QRScanResult } from "@/modules/pos/types";

type ScannerPageProps = {
  siteId: string;
};

export function ScannerPage({ siteId }: ScannerPageProps) {
  const [selectedClient, setSelectedClient] = useState<QRScanResult | null>(null);

  const statusText = useMemo(() => {
    if (!selectedClient) return "Esperando escaneo. Pega el QR o usa la cámara.";
    return `Cliente listo para operación: ${selectedClient.full_name || "Sin nombre"}`;
  }, [selectedClient]);

  return (
    <div className="w-full">
      <div className="ui-panel">
        <h1 className="ui-h1">Pulso</h1>
        <p className="mt-2 ui-body-muted">
          Escanea identificación y redenciones alineado con Vento Pass.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <QRScanner
          selectedClient={selectedClient}
          onScan={(result) => setSelectedClient(result)}
          onClear={() => setSelectedClient(null)}
          siteId={siteId}
        />

        <div className="ui-panel">
          <div className="ui-h3">Estado</div>
          {selectedClient ? (
            <div className="mt-3 space-y-2">
              <div className="text-lg font-semibold">{selectedClient.full_name}</div>
              <div className="ui-body-muted">{selectedClient.email ?? "Sin email"}</div>
              <div className="text-sm text-[var(--ui-brand)]">
                Puntos: {selectedClient.loyalty_points ?? 0}
              </div>
            </div>
          ) : (
            <div className="mt-3 ui-body-muted">{statusText}</div>
          )}
        </div>
      </div>
    </div>
  );
}
