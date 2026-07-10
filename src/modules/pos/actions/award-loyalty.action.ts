"use server";

import { requireAppAccess } from "@/lib/auth/guard";
import {
  attachSharedDeviceActionSignatureTarget,
  requireSharedDeviceActorSignature,
} from "@/lib/auth/shared-device-signature";
import { awardExternalLoyaltyPoints } from "../api/loyalty-award.api";
import type { AwardPointsInput, AwardPointsResult } from "../types";

const APP_ID = "pulso";
const POS_PERMISSION = "pos.main";

function isUuid(value: string | null | undefined) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ""));
}

export async function awardLoyaltyPointsAction(
  input: AwardPointsInput
): Promise<AwardPointsResult> {
  const { supabase, operationalSession } = await requireAppAccess({
    appId: APP_ID,
    returnTo: "/scanner",
    siteId: input.siteId,
    permissionCode: [POS_PERMISSION],
  });

  const signatureResult = await requireSharedDeviceActorSignature({
    supabase,
    session: operationalSession,
    actorPin: input.sharedActorPin,
    appId: APP_ID,
    actionCode: "pos.loyalty.award_points",
    targetTable: "loyalty_transactions",
    metadata: {
      site_id: input.siteId,
      customer_user_id: input.userId,
      amount_cop: input.amountCop,
      external_ref: input.externalRef,
    },
  });

  if (!signatureResult.ok) {
    return { success: false, error: signatureResult.message };
  }

  const result = await awardExternalLoyaltyPoints({
    ...input,
    metadata: {
      ...(input.metadata ?? {}),
      shared_device_signature_id: signatureResult.required ? signatureResult.signatureId : null,
      actor_employee_id: signatureResult.required ? signatureResult.actorEmployeeId : null,
      actor_shift_id: signatureResult.required ? signatureResult.actorShiftId : null,
    },
  });

  if (signatureResult.required && result.success && isUuid(result.transaction_id)) {
    const attachResult = await attachSharedDeviceActionSignatureTarget({
      supabase,
      signatureId: signatureResult.signatureId,
      targetTable: "loyalty_transactions",
      targetId: String(result.transaction_id),
      metadata: { attached_after_insert: true },
    });

    if (!attachResult.ok) {
      console.error("shared device loyalty signature target attach failed", {
        transaction_id: result.transaction_id,
        signature_id: signatureResult.signatureId,
        message: attachResult.message,
      });
    }
  }

  return result;
}
