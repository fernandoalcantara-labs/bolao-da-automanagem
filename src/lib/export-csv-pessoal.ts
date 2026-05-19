/**
 * CSV pessoal do usuário — versão simplificada do export-csv.ts,
 * filtrada pra um único user. Usado em /minha-exportacao.
 *
 * Diferença pro CSV completo do admin:
 *  - Uma seção por categoria (Grupos | Mata | Artilheiro)
 *  - Colunas: Rodada/Fase, Jogo/Time, Meu palpite, Real, Pontos
 *  - Mais legível pra leitura individual
 */

import type { Breakdown } from "./scoring-breakdown";

const BOM = "﻿";

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '""';
  return `"${String(v).replace(/"/g, '""')}"`;
}

export function gerarCsvPessoal(b: Breakdown): string {
  const linhas: string[] = [];

  linhas.push(`[MEUS PALPITES — ${b.nome}]`);
  linhas.push(`Total: ${b.total} pts · Posição atual: ${b.posicao_atual ?? "—"}º`);
  linhas.push("");

  // Fase de grupos
  linhas.push("[FASE DE GRUPOS]");
  linhas.push(
    [
      csvEscape("Rodada"),
      csvEscape("Jogo"),
      csvEscape("Meu Palpite"),
      csvEscape("Placar Real"),
      csvEscape("Pontos"),
      csvEscape("Resultado"),
    ].join(","),
  );
  for (const it of b.grupos.items) {
    const palpite =
      it.palpite_casa === null && it.palpite_fora === null
        ? "—"
        : `${it.palpite_casa ?? "-"}x${it.palpite_fora ?? "-"}`;
    const real =
      it.status === "finalizado"
        ? `${it.real_casa ?? "-"}x${it.real_fora ?? "-"}`
        : "(pendente)";
    const resultado =
      it.tipo === "exato"
        ? "Placar exato"
        : it.tipo === "vencedor"
          ? "Vencedor/empate"
          : it.tipo === "erro"
            ? "Errou"
            : it.tipo === "nao_palpitou"
              ? "Não palpitou"
              : "Aguardando";
    linhas.push(
      [
        csvEscape(`R${it.rodada}`),
        csvEscape(`${it.casa_nome} x ${it.fora_nome}`),
        csvEscape(palpite),
        csvEscape(real),
        csvEscape(it.pontos),
        csvEscape(resultado),
      ].join(","),
    );
  }
  linhas.push("");
  linhas.push(csvEscape("Subtotal fase de grupos:") + "," + csvEscape(b.grupos.subtotal));
  linhas.push("");

  // Mata-mata
  linhas.push("[MATA-MATA]");
  linhas.push(
    [csvEscape("Fase"), csvEscape("Time Palpitado"), csvEscape("Acertou?"), csvEscape("Pontos")].join(","),
  );
  for (const it of b.mata.items) {
    linhas.push(
      [
        csvEscape(it.fase),
        csvEscape(it.time_nome),
        csvEscape(it.acertou ? "Sim" : "Não"),
        csvEscape(it.pontos),
      ].join(","),
    );
  }
  linhas.push("");
  linhas.push(csvEscape("Subtotal mata-mata:") + "," + csvEscape(b.mata.subtotal));
  linhas.push("");

  // Artilheiro
  linhas.push("[ARTILHEIRO]");
  linhas.push([csvEscape("Palpite"), csvEscape("Tipo"), csvEscape("Status"), csvEscape("Pontos")].join(","));
  if (b.artilheiro) {
    const status = !b.artilheiro.ja_definido
      ? "Aguardando fim da Copa"
      : b.artilheiro.acertou
        ? "Acertou"
        : "Errou";
    linhas.push(
      [
        csvEscape(b.artilheiro.nome_jogador),
        csvEscape(b.artilheiro.manual ? "Texto livre" : "Da lista"),
        csvEscape(status),
        csvEscape(b.artilheiro.pontos),
      ].join(","),
    );
  } else {
    linhas.push(
      [csvEscape("(sem palpite)"), csvEscape("—"), csvEscape("—"), csvEscape(0)].join(","),
    );
  }

  return BOM + linhas.join("\n") + "\n";
}

export function gerarTextoPessoal(b: Breakdown): string {
  const linhas: string[] = [];
  linhas.push(`⚽ Meus Palpites - Bolão da AutoManagem`);
  linhas.push(`${b.nome} · ${b.total} pts · ${b.posicao_atual ?? "—"}º lugar`);
  linhas.push("━".repeat(40));
  linhas.push("");
  linhas.push("FASE DE GRUPOS");
  for (const it of b.grupos.items) {
    const palpite =
      it.palpite_casa === null && it.palpite_fora === null
        ? "—"
        : `${it.palpite_casa}×${it.palpite_fora}`;
    const real =
      it.status === "finalizado"
        ? `${it.real_casa}×${it.real_fora}`
        : "(pendente)";
    const icon =
      it.tipo === "exato"
        ? "✅"
        : it.tipo === "vencedor"
          ? "⚠️"
          : it.tipo === "erro"
            ? "❌"
            : it.tipo === "nao_palpitou"
              ? "🚫"
              : "⏳";
    linhas.push(
      `R${it.rodada} ${it.casa_nome} ${real} ${it.fora_nome}: palpitei ${palpite} ${icon} ${
        it.pontos > 0 ? `+${it.pontos}pts` : it.tipo === "pendente" ? "" : "0pts"
      }`.trim(),
    );
  }
  linhas.push("");
  linhas.push(`Subtotal grupos: ${b.grupos.subtotal} pts`);
  linhas.push("");

  linhas.push("MATA-MATA");
  for (const it of b.mata.items) {
    linhas.push(`${it.fase}: ${it.time_nome} ${it.acertou ? "✅" : "❌"} ${it.pontos > 0 ? `+${it.pontos}pts` : ""}`);
  }
  linhas.push(`Subtotal mata-mata: ${b.mata.subtotal} pts`);
  linhas.push("");

  if (b.artilheiro) {
    linhas.push("ARTILHEIRO");
    linhas.push(`Palpitei: ${b.artilheiro.nome_jogador}${b.artilheiro.manual ? " (texto livre)" : ""}`);
  }
  linhas.push("");
  linhas.push("━".repeat(40));
  linhas.push(`Total: ${b.total} pts | Posição: ${b.posicao_atual ?? "—"}º`);
  return linhas.join("\n");
}
