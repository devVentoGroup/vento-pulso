"use server";

import { requireAppAccess } from "@/lib/auth/guard";
import {
  attachSharedDeviceActionSignatureTarget,
  requireSharedDeviceActorSignature,
} from "@/lib/auth/shared-device-signature";
import { validateRedemption, markRedemptionAsUsed } from "../api/redemption.api";
import type { RedemptionValidationResult } from "../api/redemption.api";

const APP_ID = "pulso";
const POS_PERMISSION = "pos.main";

export interface ProcessRedemptionResult {
  success: boolean;
  redemption?: RedemptionValidationResult["redemption"];
  error?: string;
}

export async function processRedemptionAction(
  qrCode: string,
  orderId?: string,
  sharedActorPin?: string,
): Promise<ProcessRedemptionResult> {
  try {
    const validation = await validateRedemption(qrCode);
    if (!validation.success || !validation.redemption) {
      return {
        success: false,
        error: validation.error || "Código QR inválido",
      };
    }

    const { supabase, operationalSession } = await requireAppAccess({
      appId: APP_ID,
      returnTo: "/scanner",
      permissionCode: [POS_PERMISSION],
    });

    const signatureResult = await requireSharedDeviceActorSignature({
      supabase,
      session: operationalSession,
      actorPin: sharedActorPin,
      appId: APP_ID,
      actionCode: "pos.loyalty.validate_redemption",
      targetTable: "pass.loyalty_redemptions",
      targetId: validation.redemption.id,
      metadata: {
        redemption_id: validation.redemption.id,
        reward_id: validation.redemption.reward_id,
        customer_user_id: validation.redemption.user_id,
        points_spent: validation.redemption.points_spent,
        order_id: orderId ?? null,
      },
    });

    if (!signatureResult.ok) {
      return { success: false, error: signatureResult.message };
    }

    const markResult = await markRedemptionAsUsed(validation.redemption.id, orderId);
    if (!markResult.success) {
      return {
        success: false,
        error: markResult.error || "Error al procesar la redención",
      };
    }

    if (signatureResult.required) {
      const attachResult = await attachSharedDeviceActionSignatureTarget({
        supabase,
        signatureId: signatureResult.signatureId,
        targetTable: "pass.loyalty_redemptions",
        targetId: validation.redemption.id,
        metadata: { attached_after_validation: true },
      });

      if (!attachResult.ok) {
        console.error("shared device redemption signature target attach failed", {
          redemption_id: validation.redemption.id,
          signature_id: signatureResult.signatureId,
          message: attachResult.message,
        });
      }
    }

    return {
      success: true,
      redemption: validation.redemption,
    };
  } catch (error) {
    console.error("Error procesando redención:", error);
    return {
      success: false,
      error: "Error inesperado al procesar la redención",
    };
  }
}
