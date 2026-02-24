"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

import type { QRScanResult } from "../types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

type IdentifyClientResult = {
  success: boolean;
  client?: QRScanResult;
  error?: string;
};

export async function identifyClientAction(
  rawCode: string,
  siteId: string
): Promise<IdentifyClientResult> {
  try {
    const userId = extractUserId(rawCode);
    if (!userId) {
      return {
        success: false,
        error: "Codigo invalido. Usa VENTO:<uuid> o UUID.",
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Sesion no valida. Inicia sesion nuevamente.",
      };
    }

    const { data: canScan, error: permissionError } = await supabase.rpc(
      "has_permission",
      {
        p_permission_code: "pulso.pos.main",
        p_site_id: siteId || null,
        p_area_id: null,
      }
    );

    if (permissionError || !canScan) {
      return {
        success: false,
        error: "No tienes permisos para usar el escaner en esta sede.",
      };
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    const queryClient =
      supabaseUrl && serviceRoleKey
        ? createAdminClient(supabaseUrl, serviceRoleKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          })
        : supabase;

    const { data: client, error: clientError } = await queryClient
      .from("users")
      .select("id,full_name,email,loyalty_points")
      .eq("id", userId)
      .maybeSingle();

    if (clientError) {
      console.error("Error buscando cliente para Pulso:", clientError);
      return {
        success: false,
        error: "No se pudo consultar la cuenta escaneada.",
      };
    }

    if (!client) {
      return {
        success: false,
        error: "No existe esa cuenta en Vento Pass.",
      };
    }

    return {
      success: true,
      client: {
        user_id: client.id,
        full_name: client.full_name ?? "",
        email: client.email ?? null,
        loyalty_points: client.loyalty_points ?? 0,
      },
    };
  } catch (error) {
    console.error("Error identificando cliente:", error);
    return {
      success: false,
      error: "Error inesperado al identificar el cliente.",
    };
  }
}
