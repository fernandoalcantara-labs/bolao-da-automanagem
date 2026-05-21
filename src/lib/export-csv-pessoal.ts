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

  // Mata-mata — inclui 16 avos no topo (32 classificados derivados dos
  // palpites de grupos) seguido das fases palpitadas. 16 avos não pontua.
  linhas.push("[MATA-MATA]");
  linhas.push(
    [
      csvEscape("Fase"),
      csvEscape("Time Palpitado"),
      csvEscape("Origem"),
      csvEscape("Acertou?"),
      csvEscape("Pontos"),
    ].join(","),
  );
  for (const t of b.r32) {
    const origem =
      t.posicao_terceiro !== null
        ? `${t.posicao_terceiro}º melhor 3º (grupo ${t.grupo})`
        : `${t.posicao_grupo} grupo ${t.grupo}`;
    const acertouLabel = t.pendente ? "Pendente" : t.acertou ? "Sim" : "Não";
    linhas.push(
      [
        csvEscape("16 avos"),
        csvEscape(t.time_nome),
        csvEscape(origem),
        csvEscape(acertouLabel),
        csvEscape(0),
      ].join(","),
    );
  }
  for (const it of b.mata.items) {
    const acertouLabel = it.pendente ? "Pendente" : it.acertou ? "Sim" : "Não";
    linhas.push(
      [
        csvEscape(it.fase),
        csvEscape(it.time_nome),
        csvEscape(""),
        csvEscape(acertouLabel),
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

  // MATA-MATA com 16 avos integrado no topo (32 classificados pelos
  // palpites de grupos). 16 avos não pontua → 0 pts.
  linhas.push("MATA-MATA");
  if (b.r32.length > 0) {
    linhas.push(`16 avos — ${b.r32.length} classificados (pelos seus palpites de grupos)`);
    for (const t of b.r32) {
      const origem =
        t.posicao_terceiro !== null
          ? `${t.posicao_terceiro}º melhor 3º · ${t.grupo}`
          : `${t.posicao_grupo} ${t.grupo}`;
      const icon = t.pendente ? "⏳" : t.acertou ? "✅" : "❌";
      linhas.push(`- 16 avos: ${t.time_nome} (${origem}) ${icon}`);
    }
  }
  for (const it of b.mata.items) {
    const icon = it.pendente ? "⏳" : it.acertou ? "✅" : "❌";
    linhas.push(`${it.fase}: ${it.time_nome} ${icon} ${it.pontos > 0 ? `+${it.pontos}pts` : ""}`);
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
