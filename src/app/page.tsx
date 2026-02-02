"use client";

import { useState } from "react";

import { QRScanner } from "@/modules/pos/components/qr-scanner";
import type { QRScanResult } from "@/modules/pos/types";

export default function PulsoScannerPage() {
  const [selectedClient, setSelectedClient] = useState<QRScanResult | null>(null);

  return (
    <div className="w-full">
      <div className="ui-panel">
        <h1 className="ui-h1">Pulso</h1>
        <p className="mt-2 ui-body-muted">
          Escanea clientes o canjes para puntos.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <QRScanner
          selectedClient={selectedClient}
          onScan={(result) => setSelectedClient(result)}
          onClear={() => setSelectedClient(null)}
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
            <div className="mt-3 ui-body-muted">
              Esperando escaneo. Pega el QR o usa la camara.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
