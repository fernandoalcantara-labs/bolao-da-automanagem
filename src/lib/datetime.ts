/**
 * Formatação de datas — sempre em horário de Brasília.
 *
 * Centraliza todas as formatações pra evitar drift entre telas. NUNCA
 * usar `new Date().toLocaleString()` direto — passa pelo helper aqui pra
 * garantir timezone consistente (futuro horário de verão, viagem do
 * admin, etc.).
 *
 * Regras:
 * - O banco grava `data_hora` em UTC (timestamptz no Postgres)
 * - Conversão pra Brasília acontece **só na renderização**
 * - Não adicionar "BRT" ou "horário de Brasília" nas strings — o user
 *   brasileiro já assume que é o local
 */

export const TIMEZONE_BR = "America/Sao_Paulo";
export const LOCALE_BR = "pt-BR";

type Formato = "completo" | "curto" | "apenas_hora" | "apenas_data" | "extenso";

const optionsByFormato: Record<Formato, Intl.DateTimeFormatOptions> = {
  // "11/06/2026, 17:00"
  completo: {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  // "11/06 17:00" — ideal pra cards pequenos
  curto: {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
  // "17:00"
  apenas_hora: {
    hour: "2-digit",
    minute: "2-digit",
  },
  // "11/06/2026"
  apenas_data: {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },
  // "11 de junho de 2026"
  extenso: {
    dateStyle: "long",
  } as Intl.DateTimeFormatOptions,
};

/**
 * Formata uma data/string ISO em horário de Brasília.
 * Usar pra exibir horário de jogo, deadline, etc.
 */
export function formatarDataJogo(
  isoOrDate: string | Date,
  formato: Formato = "completo",
): string {
  const data = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat(LOCALE_BR, {
    ...optionsByFormato[formato],
    timeZone: TIMEZONE_BR,
  }).format(data);
}

/** "segunda-feira", "terça-feira", etc. */
export function diaDaSemana(isoOrDate: string | Date): string {
  const data = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat(LOCALE_BR, {
    weekday: "long",
    timeZone: TIMEZONE_BR,
  }).format(data);
}

/** "Seg", "Ter", "Qua" — abreviado pra cards pequenos */
export function diaDaSemanaCurto(isoOrDate: string | Date): string {
  const data = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat(LOCALE_BR, {
    weekday: "short",
    timeZone: TIMEZONE_BR,
  }).format(data);
}

/**
 * Verifica se a data é hoje (em horário de Brasília).
 * Útil pra destacar jogos do dia.
 */
export function ehHoje(isoOrDate: string | Date): boolean {
  const data = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const hoje = new Date();
  return (
    formatarDataJogo(data, "apenas_data") === formatarDataJogo(hoje, "apenas_data")
  );
}

/**
 * Formato amigável: "Hoje 17:00", "Amanhã 14:30", "Sex 11/06 17:00"
 * para destacar jogos próximos no painel.
 */
export function formatarDataRelativa(isoOrDate: string | Date): string {
  const data = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const hojeStr = formatarDataJogo(hoje, "apenas_data");
  const amanhaStr = formatarDataJogo(amanha, "apenas_data");
  const dataStr = formatarDataJogo(data, "apenas_data");
  const hora = formatarDataJogo(data, "apenas_hora");

  if (dataStr === hojeStr) return `Hoje ${hora}`;
  if (dataStr === amanhaStr) return `Amanhã ${hora}`;
  return `${diaDaSemanaCurto(data).replace(".", "")} ${formatarDataJogo(data, "curto")}`;
}
