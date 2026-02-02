"use client";

import { useState } from "react";
import { QrCode, X, User } from "lucide-react";

import { decodeQRCode, type QRDecodeResult } from "../api/qr-scanner.api";
import type { QRScanResult } from "../types";
import { processRedemptionAction } from "../actions/validate-redemption.action";

interface QRScannerProps {
  onScan: (result: QRScanResult) => void;
  selectedClient: QRScanResult | null;
  onClear: () => void;
}

export function QRScanner({ onScan, selectedClient, onClear }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleManualQR = async () => {
    setError(null);
    setMessage(null);

    if (!qrInput.trim()) {
      setError("Ingresa un codigo QR valido");
      return;
    }

    setIsScanning(true);
    try {
      const result: QRDecodeResult | null = await decodeQRCode(qrInput.trim());

      if (!result) {
        setError("No se pudo identificar el codigo QR");
        return;
      }

      if (result.type === "redemption") {
        const redemptionResult = await processRedemptionAction(qrInput.trim());
        if (redemptionResult.success) {
          setMessage(`Canje validado: ${redemptionResult.redemption?.reward_name}`);
          setQrInput("");
        } else {
          setError(redemptionResult.error || "Error al validar el canje");
        }
        return;
      }

      if (result.type === "client" && result.client) {
        onScan(result.client);
        setQrInput("");
        return;
      }

      setError("Codigo QR no reconocido");
    } catch (err) {
      console.error("Error al decodificar el QR:", err);
      setError("Error al decodificar el QR");
    } finally {
      setIsScanning(false);
    }
  };

  const handleCameraScan = () => {
    setMessage("Escaner de camara proximamente");
  };

  return (
    <div className="ui-panel">
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-[var(--ui-brand)]" />
        <h3 className="ui-h3">Cliente</h3>
      </div>

      {selectedClient ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-2">
            <User className="h-4 w-4 text-[var(--ui-brand)]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--ui-text)] truncate">
                {selectedClient.full_name}
              </p>
              {selectedClient.loyalty_points !== undefined && (
                <p className="text-xs text-[var(--ui-muted)]">
                  {selectedClient.loyalty_points} puntos
                </p>
              )}
            </div>
            <button
              type="button"
              className="ui-btn ui-btn--ghost"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              placeholder="Pegar codigo QR o UUID"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleManualQR();
              }}
              className="ui-input flex-1"
            />
            <button
              type="button"
              onClick={handleManualQR}
              disabled={isScanning}
              className="ui-btn ui-btn--brand"
            >
              {isScanning ? "Escaneando..." : "Buscar"}
            </button>
          </div>
          <button
            type="button"
            onClick={handleCameraScan}
            className="ui-btn ui-btn--ghost w-full"
          >
            <QrCode className="h-4 w-4" />
            Escanear con camara
          </button>
        </div>
      )}

      {message ? <div className="mt-3 ui-alert ui-alert--success">{message}</div> : null}
      {error ? <div className="mt-3 ui-alert ui-alert--error">{error}</div> : null}
    </div>
  );
}
