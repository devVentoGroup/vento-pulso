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
export async function decodeQRCode(qrData: string): Promise<QRDecodeResult | null> {
  try {
    if (qrData.startsWith("VENTO-")) {
      const validation = await validateRedemption(qrData);
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
    }
    let userId: string;
    try {
      const parsed = JSON.parse(qrData);
      userId = parsed.user_id || parsed.id || qrData;
    } catch {
      userId = qrData;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(userId)) {
      const client = await getClientById(userId);
      if (client) {
        return {
          type: "client",
          client: {
            user_id: client.id,
            full_name: client.full_name ?? "",
            email: client.email,
            loyalty_points: client.loyalty_points || 0,
          },
        };
      }
    }
    return { type: "unknown" };
  } catch (error) {
    console.error("Error al decodificar QR:", error);
    return { type: "unknown" };
  }
}
