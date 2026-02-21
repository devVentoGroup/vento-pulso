import type { QRScanResult } from "../types";
import { getClientById } from "./pos.api";
import { validateRedemption } from "./redemption.api";

export type QRCodeType = "client" | "redemption" | "unknown";

export interface QRDecodeResult {
  type: QRCodeType;
  client?: QRScanResult;
  redemption?: {
    id: string;
    reward_name: string;
    points_spent: number;
    status: string;
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractUserId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("VENTO:")) {
    const value = trimmed.slice("VENTO:".length).trim();
    return UUID_REGEX.test(value) ? value : null;
  }

  if (UUID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed) as { user_id?: string; id?: string };
    const candidate = (parsed.user_id ?? parsed.id ?? "").trim();
    return UUID_REGEX.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export async function decodeQRCode(qrData: string): Promise<QRDecodeResult> {
  try {
    const clean = qrData.trim();

    if (clean.startsWith("VENTO-")) {
      const validation = await validateRedemption(clean);
      if (validation.success && validation.redemption) {
        return {
          type: "redemption",
          redemption: {
            id: validation.redemption.id,
            reward_name: validation.redemption.reward_name,
            points_spent: validation.redemption.points_spent,
            status: validation.redemption.status,
          },
        };
      }
      return { type: "unknown" };
    }

    const userId = extractUserId(clean);
    if (!userId) {
      return { type: "unknown" };
    }

    const client = await getClientById(userId);
    if (!client) {
      return { type: "unknown" };
    }

    return {
      type: "client",
      client: {
        user_id: client.id,
        full_name: client.full_name ?? "",
        email: client.email,
        loyalty_points: client.loyalty_points ?? 0,
      },
    };
  } catch (error) {
    console.error("Error al decodificar QR:", error);
    return { type: "unknown" };
  }
}
