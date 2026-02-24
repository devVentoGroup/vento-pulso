"use client";

import { useMemo, useState } from "react";
import { CreditCard, QrCode, User, X } from "lucide-react";

import type { QRScanResult, ScannerMode } from "../types";
import { processRedemptionAction } from "../actions/validate-redemption.action";
import { awardLoyaltyPointsAction } from "../actions/award-loyalty.action";
import { identifyClientAction } from "../actions/identify-client.action";

interface QRScannerProps {
  onScan: (result: QRScanResult) => void;
  selectedClient: QRScanResult | null;
  onClear: () => void;
  siteId: string;
}

export function QRScanner({ onScan, selectedClient, onClear, siteId }: QRScannerProps) {
  const [mode, setMode] = useState<ScannerMode>("identification");
  const [isScanning, setIsScanning] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [amountCop, setAmountCop] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estimatedPoints = useMemo(() => {
    const amount = Number(amountCop || 0);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.floor(amount / 1000);
  }, [amountCop]);

  const resetAlerts = () => {
    setMessage(null);
    setError(null);
  };

  const handleClearClient = () => {
    onClear();
    setAmountCop("");
    resetAlerts();
  };

  const buildAutoExternalRef = (userId: string) => {
    const sitePart = (siteId || "site").slice(0, 8);
    const userPart = userId.slice(0, 8);
    const stamp = Date.now().toString();
    const nonce = Math.random().toString(36).slice(2, 8);
    return `pulso-${sitePart}-${userPart}-${stamp}-${nonce}`;
  };

  const handleModeChange = (nextMode: ScannerMode) => {
    setMode(nextMode);
    setQrInput("");
    setAmountCop("");
    resetAlerts();

    if (nextMode !== "identification") {
      onClear();
    }
  };

  const processRawCode = async (rawCode: string) => {
    resetAlerts();

    if (!rawCode.trim()) {
      setError("Ingresa un codigo valido");
      return;
    }

    setIsScanning(true);
    try {
      if (mode === "redemption") {
        const redemptionResult = await processRedemptionAction(rawCode.trim());
        if (!redemptionResult.success) {
          setError(redemptionResult.error || "Error al validar la redencion");
          return;
        }

        setMessage(
          `Canje validado: ${redemptionResult.redemption?.reward_name || "Producto"}`
        );
        setQrInput("");
        return;
      }

      const identified = await identifyClientAction(rawCode.trim(), siteId);
      if (!identified.success || !identified.client) {
        setError(identified.error || "No se pudo identificar la cuenta");
        return;
      }

      onScan(identified.client);
      setMessage(`Cliente identificado: ${identified.client.full_name || "Sin nombre"}`);
      setQrInput("");
    } catch (err) {
      console.error("Error al procesar QR:", err);
      setError("Error al procesar el codigo");
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualQR = async () => {
    await processRawCode(qrInput);
  };

  const handleAwardPoints = async () => {
    resetAlerts();

    if (!selectedClient) {
      setError("Primero identifica un cliente");
      return;
    }

    const amount = Number(amountCop);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Ingresa un monto valido mayor a 0");
      return;
    }

    setIsScanning(true);
    try {
      const autoExternalRef = buildAutoExternalRef(selectedClient.user_id);

      const result = await awardLoyaltyPointsAction({
        userId: selectedClient.user_id,
        siteId,
        amountCop: amount,
        externalRef: autoExternalRef,
        description: `Compra registrada en Pulso (${autoExternalRef})`,
        metadata: {
          source: "pulso",
          flow: "external_pos",
          generated_external_ref: true,
        },
      });

      if (!result.success) {
        if (result.duplicate) {
          setError("Esta referencia ya fue registrada en la sede actual");
          return;
        }
        setError(result.error || "No se pudo otorgar puntos");
        return;
      }

      const nextBalance = result.new_balance ?? selectedClient.loyalty_points;
      onScan({
        ...selectedClient,
        loyalty_points: nextBalance,
      });

      setMessage(
        `Puntos otorgados: ${result.points_awarded ?? 0}. Nuevo saldo: ${result.new_balance ?? "-"}`
      );
      setAmountCop("");
    } catch (err) {
      console.error("Error otorgando puntos:", err);
      setError("Error inesperado al otorgar puntos");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="ui-panel">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-[var(--ui-brand)]" />
          <h3 className="ui-h3">Escaner</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`ui-btn h-10 px-3 text-sm ${
              mode === "identification" ? "ui-btn--brand" : "ui-btn--ghost"
            }`}
            onClick={() => handleModeChange("identification")}
          >
            Identificacion
          </button>
          <button
            type="button"
            className={`ui-btn h-10 px-3 text-sm ${
              mode === "redemption" ? "ui-btn--brand" : "ui-btn--ghost"
            }`}
            onClick={() => handleModeChange("redemption")}
          >
            Redencion
          </button>
        </div>
      </div>

      <p className="mt-2 ui-body-muted">
        {mode === "identification"
          ? "Usa lector USB o pega el codigo de Vento ID para identificar clientes y otorgar puntos."
          : "Pega el codigo de redencion para validar canjes pendientes."}
      </p>

      <div className="mt-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            placeholder={
              mode === "identification"
                ? "VENTO:<uuid> o UUID"
                : "VENTO-..."
            }
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleManualQR();
              }
            }}
            className="ui-input flex-1"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              void handleManualQR();
            }}
            disabled={isScanning}
            className="ui-btn ui-btn--brand"
          >
            {isScanning ? "Procesando..." : "Procesar"}
          </button>
        </div>
      </div>

      {mode === "identification" && selectedClient ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--ui-brand)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--ui-text)]">
                {selectedClient.full_name || "Sin nombre"}
              </p>
              <p className="truncate text-xs text-[var(--ui-muted)]">
                {selectedClient.email ?? "Sin email"}
              </p>
              <p className="text-xs text-[var(--ui-brand)]">
                Puntos actuales: {selectedClient.loyalty_points}
              </p>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn--ghost h-9 px-3"
              onClick={handleClearClient}
              aria-label="Quitar cliente"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-2">
            <input
              className="ui-input"
              inputMode="numeric"
              placeholder="Monto de compra (COP)"
              value={amountCop}
              onChange={(e) => setAmountCop(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>

          <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-xs text-[var(--ui-muted)]">
            La referencia externa se genera automaticamente al confirmar.
          </div>

          <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm">
            Puntos a otorgar: <span className="font-semibold text-[var(--ui-brand)]">{estimatedPoints}</span>
          </div>

          <button
            type="button"
            className="ui-btn ui-btn--brand w-full"
            disabled={isScanning || estimatedPoints <= 0}
            onClick={() => {
              void handleAwardPoints();
            }}
          >
            <CreditCard className="h-4 w-4" />
            Confirmar puntos
          </button>
        </div>
      ) : null}

      {message ? <div className="mt-3 ui-alert ui-alert--success">{message}</div> : null}
      {error ? <div className="mt-3 ui-alert ui-alert--error">{error}</div> : null}
    </div>
  );
}
