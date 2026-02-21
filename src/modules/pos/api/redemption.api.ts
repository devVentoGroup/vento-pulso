"use server";

import { createClient } from "@/lib/supabase/server";

type LoyaltyRewardRef = {
  name?: string | null;
};

type RedemptionRow = {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  loyalty_rewards?: LoyaltyRewardRef | LoyaltyRewardRef[] | null;
};

export interface RedemptionValidationResult {
  success: boolean;
  redemption?: {
    id: string;
    user_id: string;
    reward_id: string;
    reward_name: string;
    points_spent: number;
    status: string;
    created_at: string;
  };
  error?: string;
}

export async function validateRedemption(
  qrCode: string
): Promise<RedemptionValidationResult> {
  try {
    const supabase = await createClient();
    const cleanQrCode = qrCode.trim();

    const { data: redemption, error: redemptionError } = await supabase
      .from("loyalty_redemptions")
      .select(
        `
        id,
        user_id,
        reward_id,
        points_spent,
        status,
        created_at,
        loyalty_rewards (
          name
        )
      `
      )
      .eq("qr_code", cleanQrCode)
      .single<RedemptionRow>();

    if (redemptionError || !redemption) {
      return {
        success: false,
        error: redemptionError?.message || "Código QR no encontrado",
      };
    }

    if (redemption.status !== "pending") {
      return {
        success: false,
        error:
          redemption.status === "validated"
            ? "Este código ya fue utilizado"
            : redemption.status === "cancelled"
              ? "Este código ha sido cancelado"
              : "Este código no está disponible",
      };
    }

    const rewardData = Array.isArray(redemption.loyalty_rewards)
      ? redemption.loyalty_rewards[0]
      : redemption.loyalty_rewards;

    return {
      success: true,
      redemption: {
        id: redemption.id,
        user_id: redemption.user_id,
        reward_id: redemption.reward_id,
        reward_name: rewardData?.name || "Producto",
        points_spent: redemption.points_spent,
        status: redemption.status,
        created_at: redemption.created_at,
      },
    };
  } catch (error) {
    console.error("Error validando redención:", error);
    return {
      success: false,
      error: "Error inesperado al validar el código",
    };
  }
}

export async function markRedemptionAsUsed(
  redemptionId: string,
  orderId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "No se pudo autenticar" };
    }

    const validatedAt = new Date().toISOString();

    const { data, error: updateError } = await supabase
      .from("loyalty_redemptions")
      .update({
        status: "validated",
        validated_at: validatedAt,
        order_id: orderId || null,
      })
      .eq("id", redemptionId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError) {
      return { success: false, error: updateError.message || "Error al procesar la redención" };
    }

    if (!data) {
      return {
        success: false,
        error: "Este código ya fue utilizado o no está disponible",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}
