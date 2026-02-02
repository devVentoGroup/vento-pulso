"use server";
import { createClient } from "@/lib/supabase/server";
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
      .single();
    if (redemptionError || !redemption) {
      return {
        success: false,
        error: redemptionError?.message || "Codigo QR no encontrado",
      };
    }
    if (redemption.status !== "pending") {
      return {
        success: false,
        error:
          redemption.status === "validated"
            ? "Este codigo ya fue utilizado"
            : redemption.status === "cancelled"
              ? "Este codigo ha sido cancelado"
              : "Este codigo no esta disponible",
      };
    }
    return {
      success: true,
      redemption: {
        id: redemption.id,
        user_id: redemption.user_id,
        reward_id: redemption.reward_id,
        reward_name: (redemption.loyalty_rewards as any)?.name || "Producto",
        points_spent: redemption.points_spent,
        status: redemption.status,
        created_at: redemption.created_at,
      },
    };
  } catch (error) {
    console.error("Error validando redencion:", error);
    return {
      success: false,
      error: "Error inesperado al validar el codigo",
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
    const { error: updateError } = await supabase
      .from("loyalty_redemptions")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        order_id: orderId || null,
      })
      .eq("id", redemptionId);
    if (updateError) {
      return { success: false, error: "Error al procesar la redencion" };
    }
    return { success: true };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

