"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Desabilita o lock de Web Locks API que estava prendendo o signIn
        // mesmo após o HTTP retornar 200 (bug conhecido em v2.46+).
        // Sem isso, em abas com listeners ativos, signInWithPassword pode
        // travar indefinidamente até o lock liberar.
        // Trade-off: pequeno risco de race entre múltiplas abas (aceitável
        // pro caso de uso de bolão entre amigos).
        lock: async <R,>(_name: string, _timeout: number, fn: () => Promise<R>): Promise<R> => fn(),
      },
    },
  );
}
