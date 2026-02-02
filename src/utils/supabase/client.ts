import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
    throw new Error("Config Supabase: NEXT_PUBLIC_SUPABASE_URL no es valida.");
  }
  if (!supabaseAnonKey) {
    throw new Error("Config Supabase: NEXT_PUBLIC_SUPABASE_ANON_KEY no definida.");
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
