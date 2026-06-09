/**
 * Detecta o erro levantado pelo trigger `bloquear_palpite_se_encerrado`
 * (migration 20260525000016). Os forms usam isto pra travar a UI sem reload
 * e sem precisar de uma query extra de status. (Opção 2 / item 50)
 *
 * As mensagens vêm do `raise exception` do trigger:
 *   - "Apostas encerradas pelo admin."   (override manual)
 *   - "Prazo de palpites encerrado."     (automático, após o DEADLINE)
 */
export function ehErroApostasEncerradas(
  error: { message?: string } | null | undefined,
): boolean {
  const m = error?.message ?? "";
  return m.includes("Apostas encerradas") || m.includes("Prazo de palpites encerrado");
}
