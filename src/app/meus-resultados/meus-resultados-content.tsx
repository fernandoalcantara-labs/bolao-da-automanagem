"use client";

import * as React from "react";
import Image from "next/image";
import { Copy, Check, Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import type { Breakdown } from "@/lib/scoring-breakdown";
import { gerarCsvPessoal, gerarTextoPessoal } from "@/lib/export-csv-pessoal";

export function MeusResultadosContent({ breakdown }: { breakdown: Breakdown }) {
  const [filtro, setFiltro] = React.useState<"todos" | "acertos" | "erros" | "pendentes">("todos");
  const [copied, setCopied] = React.useState(false);

  function exportarCsv() {
    const csv = gerarCsvPessoal(breakdown);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug = (breakdown.nome ?? "user").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    link.download = `meus-palpites-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "CSV baixado! 📥", variant: "success" });
  }

  async function copiarTexto() {
    await navigator.clipboard.writeText(gerarTextoPessoal(breakdown));
    setCopied(true);
    toast({
      title: "Copiado! 📲",
      description: "Cola no WhatsApp ou onde quiser.",
      variant: "success",
    });
    setTimeout(() => setCopied(false), 2500);
  }

  const items = breakdown.grupos.items.filter((it) => {
    if (filtro === "todos") return true;
    if (filtro === "acertos") return it.tipo === "exato" || it.tipo === "vencedor";
    if (filtro === "erros") return it.tipo === "erro" || it.tipo === "nao_palpitou";
    if (filtro === "pendentes") return it.tipo === "pendente";
    return true;
  });

  return (
    <>
      {/* Botões de exportação — logo abaixo do Resumo (Fernando preferiu
          assim no CT-24 da QW4 pra ficar mais visível). */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📥 Exportar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportarCsv} variant="default">
              <FileDown className="mr-2 h-4 w-4" /> Exportar como CSV
            </Button>
            <Button onClick={copiarTexto} variant="outline">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar como texto"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            CSV abre direto no Excel/Google Sheets · Texto vai pro WhatsApp 📲
          </p>
        </CardContent>
      </Card>

      {/* Fase de grupos */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">⚽ Fase de grupos · {breakdown.grupos.subtotal} pts</CardTitle>
          <div className="inline-flex rounded-md bg-muted p-0.5 text-[10px] font-bold">
            {(["todos", "acertos", "erros", "pendentes"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={cn(
                  "rounded px-2 py-1 capitalize transition-colors",
                  filtro === f ? "bg-white shadow" : "text-muted-foreground",
                )}
              >
                {f === "todos" ? "Todos" : f === "acertos" ? "Acertos" : f === "erros" ? "Erros" : "Pendentes"}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border bg-white">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">R</th>
                  <th className="p-2 text-left">Jogo</th>
                  <th className="p-2 text-center">Palpite</th>
                  <th className="p-2 text-center">Real</th>
                  <th className="p-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.match_id}
                    className={cn(
                      "border-t border-border/40",
                      it.tipo === "exato" && "bg-festive-green/10",
                      it.tipo === "vencedor" && "bg-festive-gold/10",
                      it.tipo === "erro" && "bg-muted/40",
                      it.tipo === "nao_palpitou" && "bg-muted/20",
                      it.tipo === "pendente" && "bg-white",
                    )}
                  >
                    <td className="p-2 font-bold">R{it.rodada}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        {it.casa_bandeira && (
                          <Image src={it.casa_bandeira} alt={it.casa_nome} width={16} height={11} unoptimized className="rounded-sm" />
                        )}
                        <span className="team-name font-medium">{it.casa_nome}</span>
                        <span className="text-muted-foreground">×</span>
                        <span className="team-name font-medium">{it.fora_nome}</span>
                        {it.fora_bandeira && (
                          <Image src={it.fora_bandeira} alt={it.fora_nome} width={16} height={11} unoptimized className="rounded-sm" />
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center font-mono">
                      {it.tipo === "nao_palpitou" || (it.palpite_casa === null && it.palpite_fora === null)
                        ? <span className="text-muted-foreground">🚫 —</span>
                        : <>{it.palpite_casa ?? "-"}×{it.palpite_fora ?? "-"}</>
                      }
                    </td>
                    <td className="p-2 text-center font-mono">
                      {it.status === "finalizado"
                        ? `${it.real_casa ?? "-"}×${it.real_fora ?? "-"}`
                        : "—"}
                    </td>
                    <td className="p-2 text-right font-extrabold">
                      {it.tipo === "exato" ? (
                        <span className="text-festive-green">✅ +{it.pontos}</span>
                      ) : it.tipo === "vencedor" ? (
                        <span className="text-festive-gold-dark">⚠️ +{it.pontos}</span>
                      ) : it.tipo === "pendente" ? (
                        <span className="text-muted-foreground">⏳</span>
                      ) : it.tipo === "nao_palpitou" ? (
                        <span className="text-muted-foreground">🚫 0</span>
                      ) : (
                        <span className="text-muted-foreground">❌ 0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 16 avos (Round of 32) — derivado dos palpites de grupos */}
      {breakdown.r32.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              🎯 16 avos · {breakdown.r32.length} classificados
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Times que vão ao mata-mata segundo seus palpites de grupos (regras FIFA: 1º + 2º +
              melhores 3ºs).
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
              {breakdown.r32.map((t) => (
                <div
                  key={t.time_id}
                  className="flex items-center gap-1.5 rounded-md border border-border/40 bg-white p-1.5 text-xs"
                >
                  {t.time_bandeira && (
                    <Image
                      src={t.time_bandeira}
                      alt={t.time_nome}
                      width={16}
                      height={11}
                      unoptimized
                      className="rounded-sm"
                    />
                  )}
                  <span className="team-name flex-1 font-medium">{t.time_nome}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {t.posicao_grupo}·{t.grupo}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mata-mata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🏟️ Mata-mata · {breakdown.mata.subtotal} pts</CardTitle>
        </CardHeader>
        <CardContent>
          {breakdown.mata.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não palpitou no mata-mata.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-white">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Fase</th>
                    <th className="p-2 text-left">Time</th>
                    <th className="p-2 text-center">Acertou?</th>
                    <th className="p-2 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.mata.items.map((it, idx) => (
                    <tr key={`${it.fase}-${it.time_id}-${idx}`} className="border-t border-border/40">
                      <td className="p-2 font-bold capitalize">{it.fase}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          {it.time_bandeira && (
                            <Image src={it.time_bandeira} alt={it.time_nome} width={16} height={11} unoptimized className="rounded-sm" />
                          )}
                          <span className="team-name">{it.time_nome}</span>
                        </div>
                      </td>
                      <td className="p-2 text-center">{it.acertou ? "✅" : "❌"}</td>
                      <td className="p-2 text-right font-extrabold">
                        {it.pontos > 0 ? (
                          <span className="text-festive-green">+{it.pontos}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Artilheiro */}
      {breakdown.artilheiro && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">⚽ Artilheiro · {breakdown.artilheiro.pontos} pts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Seu palpite: <strong>{breakdown.artilheiro.nome_jogador}</strong>
              {breakdown.artilheiro.manual && (
                <span className="ml-2 text-xs text-muted-foreground">(texto livre)</span>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {!breakdown.artilheiro.ja_definido
                ? "⏳ Aguardando fim da Copa"
                : breakdown.artilheiro.acertou
                  ? "✅ Acertou!"
                  : "❌ Errou"}
            </p>
          </CardContent>
        </Card>
      )}

    </>
  );
}
