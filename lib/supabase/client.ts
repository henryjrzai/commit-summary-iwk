import { createBrowserClient } from "@supabase/ssr";

import { requireEnv } from "@/lib/env";

export function createClient() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
