import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente server-only com a service_role key.
 * NUNCA exporte para o navegador. Usado em rotas de API, server actions,
 * scripts de seed e jobs de sync.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida no ambiente.");
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
