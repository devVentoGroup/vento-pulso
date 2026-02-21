"use server";

import { createClient } from "@/lib/supabase/server";
import type { AwardPointsInput, AwardPointsResult } from "../types";

export async function awardExternalLoyaltyPoints(
  input: AwardPointsInput
): Promise<AwardPointsResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("award_loyalty_points_external", {
      p_user_id: input.userId,
      p_site_id: input.siteId,
      p_amount_cop: input.amountCop,
      p_external_ref: input.externalRef,
      p_description: input.description ?? null,
      p_metadata: input.metadata ?? {},
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data || typeof data !== "object") {
      return {
        success: false,
        error: "Respuesta inválida del servidor",
      };
    }

    return data as AwardPointsResult;
  } catch (error) {
    console.error("Error otorgando puntos externos:", error);
    return {
      success: false,
      error: "Error inesperado al otorgar puntos",
    };
  }
}
