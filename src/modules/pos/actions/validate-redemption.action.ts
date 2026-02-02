"use server";
import { validateRedemption, markRedemptionAsUsed } from "../api/redemption.api";
import type { RedemptionValidationResult } from "../api/redemption.api";
export interface ProcessRedemptionResult {
  success: boolean;
  redemption?: RedemptionValidationResult["redemption"];
  error?: string;
}
export async function processRedemptionAction(
  qrCode: string,
  orderId?: string
): Promise<ProcessRedemptionResult> {
  try {
    const validation = await validateRedemption(qrCode);
    if (!validation.success || !validation.redemption) {
      return {
        success: false,
        error: validation.error || "Codigo QR invalido",
      };
    }
    const markResult = await markRedemptionAsUsed(validation.redemption.id, orderId);
    if (!markResult.success) {
      return {
        success: false,
        error: markResult.error || "Error al procesar la redencion",
      };
    }
    return {
      success: true,
      redemption: validation.redemption,
    };
  } catch (error) {
    console.error("Error procesando redencion:", error);
    return {
      success: false,
      error: "Error inesperado al procesar la redencion",
    };
  }
}
