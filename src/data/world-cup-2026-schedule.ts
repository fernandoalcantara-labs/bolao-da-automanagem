/**
 * Calendário OFICIAL da fase de grupos da Copa do Mundo FIFA 2026.
 *
 * Dados factuais (confronto + data/hora + sede) baseados na tabela oficial.
 * Cada `kickoff` é o horário LOCAL da sede com o offset UTC embutido (ISO
 * 8601) — assim `new Date(kickoff)` resolve o instante UTC correto sem
 * ambiguidade de fuso. O banco grava `data_hora` em UTC; a exibição
 * converte pra America/Sao_Paulo via lib/datetime.ts.
 *
 * Offsets das sedes em junho/2026 (com horário de verão US/Canadá):
 *  - México (Cidade do México, Guadalajara, Monterrey): -06:00 (sem DST)
 *  - Leste US/Canadá (NY/NJ, Boston, Filadélfia, Atlanta, Miami, Toronto): -04:00
 *  - Central US (Dallas, Houston, Kansas City): -05:00
 *  - Pacífico US/Canadá (Los Angeles, Santa Clara, Seattle, Vancouver): -07:00
 *
 * IMPORTANTE: os nomes em `casa`/`fora` são EXATAMENTE os de `teams.nome`
 * no banco. O matching de aplicação é por grupo+rodada+PAR (não-ordenado),
 * então inversão casa/fora entre a tabela e o banco não quebra nada.
 */
import type { Grupo } from "@/types/database";

export type FixtureGrupo = {
  grupo: Grupo;
  rodada: 1 | 2 | 3;
  casa: string;
  fora: string;
  /** Horário local da sede com offset (ISO 8601). */
  kickoff: string;
};

export const CALENDARIO_GRUPOS_2026: FixtureGrupo[] = [
  // ───────────── Rodada 1 ─────────────
  { grupo: "A", rodada: 1, casa: "México", fora: "África do Sul", kickoff: "2026-06-11T13:00:00-06:00" },
  { grupo: "A", rodada: 1, casa: "Coreia do Sul", fora: "Tchéquia", kickoff: "2026-06-11T20:00:00-06:00" },
  { grupo: "B", rodada: 1, casa: "Canadá", fora: "Bósnia e Herzegovina", kickoff: "2026-06-12T15:00:00-04:00" },
  { grupo: "D", rodada: 1, casa: "Estados Unidos", fora: "Paraguai", kickoff: "2026-06-12T18:00:00-07:00" },
  { grupo: "B", rodada: 1, casa: "Catar", fora: "Suíça", kickoff: "2026-06-13T12:00:00-07:00" },
  { grupo: "C", rodada: 1, casa: "Brasil", fora: "Marrocos", kickoff: "2026-06-13T18:00:00-04:00" },
  { grupo: "C", rodada: 1, casa: "Haiti", fora: "Escócia", kickoff: "2026-06-13T21:00:00-04:00" },
  { grupo: "D", rodada: 1, casa: "Austrália", fora: "Turquia", kickoff: "2026-06-13T21:00:00-07:00" },
  { grupo: "E", rodada: 1, casa: "Alemanha", fora: "Curaçao", kickoff: "2026-06-14T12:00:00-05:00" },
  { grupo: "E", rodada: 1, casa: "Costa do Marfim", fora: "Equador", kickoff: "2026-06-14T19:00:00-04:00" },
  { grupo: "F", rodada: 1, casa: "Holanda", fora: "Japão", kickoff: "2026-06-14T15:00:00-05:00" },
  { grupo: "F", rodada: 1, casa: "Suécia", fora: "Tunísia", kickoff: "2026-06-14T20:00:00-06:00" },
  { grupo: "H", rodada: 1, casa: "Espanha", fora: "Cabo Verde", kickoff: "2026-06-15T12:00:00-04:00" },
  { grupo: "H", rodada: 1, casa: "Arábia Saudita", fora: "Uruguai", kickoff: "2026-06-15T18:00:00-04:00" },
  { grupo: "G", rodada: 1, casa: "Bélgica", fora: "Egito", kickoff: "2026-06-15T12:00:00-07:00" },
  { grupo: "G", rodada: 1, casa: "Irã", fora: "Nova Zelândia", kickoff: "2026-06-15T18:00:00-07:00" },
  { grupo: "J", rodada: 1, casa: "Áustria", fora: "Jordânia", kickoff: "2026-06-16T21:00:00-07:00" },
  { grupo: "I", rodada: 1, casa: "França", fora: "Senegal", kickoff: "2026-06-16T15:00:00-04:00" },
  { grupo: "I", rodada: 1, casa: "Iraque", fora: "Noruega", kickoff: "2026-06-16T18:00:00-04:00" },
  { grupo: "J", rodada: 1, casa: "Argentina", fora: "Argélia", kickoff: "2026-06-16T20:00:00-05:00" },
  { grupo: "K", rodada: 1, casa: "Portugal", fora: "RD do Congo", kickoff: "2026-06-17T12:00:00-05:00" },
  { grupo: "L", rodada: 1, casa: "Inglaterra", fora: "Croácia", kickoff: "2026-06-17T15:00:00-05:00" },
  { grupo: "L", rodada: 1, casa: "Gana", fora: "Panamá", kickoff: "2026-06-17T19:00:00-04:00" },
  { grupo: "K", rodada: 1, casa: "Uzbequistão", fora: "Colômbia", kickoff: "2026-06-17T20:00:00-06:00" },

  // ───────────── Rodada 2 ─────────────
  { grupo: "A", rodada: 2, casa: "Tchéquia", fora: "África do Sul", kickoff: "2026-06-18T12:00:00-04:00" },
  { grupo: "B", rodada: 2, casa: "Suíça", fora: "Bósnia e Herzegovina", kickoff: "2026-06-18T12:00:00-07:00" },
  { grupo: "B", rodada: 2, casa: "Canadá", fora: "Catar", kickoff: "2026-06-18T15:00:00-07:00" },
  { grupo: "A", rodada: 2, casa: "México", fora: "Coreia do Sul", kickoff: "2026-06-18T19:00:00-06:00" },
  { grupo: "D", rodada: 2, casa: "Turquia", fora: "Paraguai", kickoff: "2026-06-19T20:00:00-07:00" },
  { grupo: "D", rodada: 2, casa: "Estados Unidos", fora: "Austrália", kickoff: "2026-06-19T12:00:00-07:00" },
  { grupo: "C", rodada: 2, casa: "Escócia", fora: "Marrocos", kickoff: "2026-06-19T18:00:00-04:00" },
  { grupo: "C", rodada: 2, casa: "Brasil", fora: "Haiti", kickoff: "2026-06-19T20:30:00-04:00" },
  { grupo: "F", rodada: 2, casa: "Tunísia", fora: "Japão", kickoff: "2026-06-20T20:00:00-06:00" },
  { grupo: "F", rodada: 2, casa: "Holanda", fora: "Suécia", kickoff: "2026-06-20T12:00:00-05:00" },
  { grupo: "E", rodada: 2, casa: "Alemanha", fora: "Costa do Marfim", kickoff: "2026-06-20T16:00:00-04:00" },
  { grupo: "E", rodada: 2, casa: "Equador", fora: "Curaçao", kickoff: "2026-06-20T19:00:00-05:00" },
  { grupo: "H", rodada: 2, casa: "Espanha", fora: "Arábia Saudita", kickoff: "2026-06-21T12:00:00-04:00" },
  { grupo: "G", rodada: 2, casa: "Bélgica", fora: "Irã", kickoff: "2026-06-21T12:00:00-07:00" },
  { grupo: "H", rodada: 2, casa: "Uruguai", fora: "Cabo Verde", kickoff: "2026-06-21T18:00:00-04:00" },
  { grupo: "G", rodada: 2, casa: "Nova Zelândia", fora: "Egito", kickoff: "2026-06-21T18:00:00-07:00" },
  { grupo: "J", rodada: 2, casa: "Argentina", fora: "Áustria", kickoff: "2026-06-22T12:00:00-05:00" },
  { grupo: "I", rodada: 2, casa: "França", fora: "Iraque", kickoff: "2026-06-22T17:00:00-04:00" },
  { grupo: "I", rodada: 2, casa: "Noruega", fora: "Senegal", kickoff: "2026-06-22T20:00:00-04:00" },
  { grupo: "J", rodada: 2, casa: "Jordânia", fora: "Argélia", kickoff: "2026-06-22T20:00:00-07:00" },
  { grupo: "K", rodada: 2, casa: "Portugal", fora: "Uzbequistão", kickoff: "2026-06-23T12:00:00-05:00" },
  { grupo: "L", rodada: 2, casa: "Inglaterra", fora: "Gana", kickoff: "2026-06-23T16:00:00-04:00" },
  { grupo: "L", rodada: 2, casa: "Panamá", fora: "Croácia", kickoff: "2026-06-23T19:00:00-04:00" },
  { grupo: "K", rodada: 2, casa: "Colômbia", fora: "RD do Congo", kickoff: "2026-06-23T20:00:00-06:00" },

  // ───────────── Rodada 3 ─────────────
  { grupo: "B", rodada: 3, casa: "Suíça", fora: "Canadá", kickoff: "2026-06-24T12:00:00-07:00" },
  { grupo: "B", rodada: 3, casa: "Bósnia e Herzegovina", fora: "Catar", kickoff: "2026-06-24T12:00:00-07:00" },
  { grupo: "C", rodada: 3, casa: "Escócia", fora: "Brasil", kickoff: "2026-06-24T18:00:00-04:00" },
  { grupo: "C", rodada: 3, casa: "Marrocos", fora: "Haiti", kickoff: "2026-06-24T18:00:00-04:00" },
  { grupo: "A", rodada: 3, casa: "Tchéquia", fora: "México", kickoff: "2026-06-24T19:00:00-06:00" },
  { grupo: "A", rodada: 3, casa: "África do Sul", fora: "Coreia do Sul", kickoff: "2026-06-24T19:00:00-06:00" },
  { grupo: "E", rodada: 3, casa: "Equador", fora: "Alemanha", kickoff: "2026-06-25T16:00:00-04:00" },
  { grupo: "E", rodada: 3, casa: "Curaçao", fora: "Costa do Marfim", kickoff: "2026-06-25T16:00:00-04:00" },
  { grupo: "F", rodada: 3, casa: "Japão", fora: "Suécia", kickoff: "2026-06-25T18:00:00-05:00" },
  { grupo: "F", rodada: 3, casa: "Tunísia", fora: "Holanda", kickoff: "2026-06-25T18:00:00-05:00" },
  { grupo: "D", rodada: 3, casa: "Turquia", fora: "Estados Unidos", kickoff: "2026-06-25T19:00:00-07:00" },
  { grupo: "D", rodada: 3, casa: "Paraguai", fora: "Austrália", kickoff: "2026-06-25T19:00:00-07:00" },
  { grupo: "I", rodada: 3, casa: "Noruega", fora: "França", kickoff: "2026-06-26T15:00:00-04:00" },
  { grupo: "I", rodada: 3, casa: "Senegal", fora: "Iraque", kickoff: "2026-06-26T15:00:00-04:00" },
  { grupo: "H", rodada: 3, casa: "Cabo Verde", fora: "Arábia Saudita", kickoff: "2026-06-26T19:00:00-05:00" },
  { grupo: "H", rodada: 3, casa: "Uruguai", fora: "Espanha", kickoff: "2026-06-26T18:00:00-06:00" },
  { grupo: "G", rodada: 3, casa: "Egito", fora: "Irã", kickoff: "2026-06-26T20:00:00-07:00" },
  { grupo: "G", rodada: 3, casa: "Nova Zelândia", fora: "Bélgica", kickoff: "2026-06-26T20:00:00-07:00" },
  { grupo: "L", rodada: 3, casa: "Panamá", fora: "Inglaterra", kickoff: "2026-06-27T17:00:00-04:00" },
  { grupo: "L", rodada: 3, casa: "Croácia", fora: "Gana", kickoff: "2026-06-27T17:00:00-04:00" },
  { grupo: "K", rodada: 3, casa: "Colômbia", fora: "Portugal", kickoff: "2026-06-27T19:30:00-04:00" },
  { grupo: "K", rodada: 3, casa: "RD do Congo", fora: "Uzbequistão", kickoff: "2026-06-27T19:30:00-04:00" },
  { grupo: "J", rodada: 3, casa: "Argélia", fora: "Áustria", kickoff: "2026-06-27T21:00:00-05:00" },
  { grupo: "J", rodada: 3, casa: "Jordânia", fora: "Argentina", kickoff: "2026-06-27T21:00:00-05:00" },
];

/** Chave normalizada grupo+rodada+par (não-ordenado) → kickoff ISO local. */
export function chaveFixture(grupo: string, rodada: number, t1: string, t2: string): string {
  const par = [t1, t2].sort((a, b) => a.localeCompare(b)).join("|");
  return `${grupo}|${rodada}|${par}`;
}

/** Mapa pronto pra lookup: chave → kickoff (ISO local com offset). */
export const MAPA_KICKOFF_GRUPOS: Record<string, string> = Object.fromEntries(
  CALENDARIO_GRUPOS_2026.map((f) => [chaveFixture(f.grupo, f.rodada, f.casa, f.fora), f.kickoff]),
);
