import { createClient } from "@/lib/supabase/client";

export type ClientRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  loyalty_points: number | null;
};

export async function getClientById(clientId: string): Promise<ClientRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id,full_name,email,loyalty_points")
    .eq("id", clientId)
    .single();

  if (error) {
    console.error("Error obteniendo cliente:", error);
    return null;
  }

  return (data ?? null) as ClientRow | null;
}
