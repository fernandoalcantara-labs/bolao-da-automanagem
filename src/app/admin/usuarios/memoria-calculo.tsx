"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { getBreakdownAction } from "./actions";
import { breakdownParaTexto, type Breakdown } from "@/lib/scoring-breakdown";

type Filtro = "todos" | "acertos" | "erros" | "pendentes";

export function MemoriaCalculoToggle({ userId, nome }: { userId: string; nome: string }) {
  const [aberto, setAberto] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<Breakdown | null>(null);
  const [filtro, setFiltro] = React.useState<Filtro>("todos");
  const [copied, setCopied] = React.useState(false);

  async function toggleAberto() {
    if (aberto) {
      setAberto(false);
      return;
    }
    setAberto(true);
    if (data) return; // cache local
    setLoading(true);
    const res = await getBreakdownAction(userId);
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
      setAberto(false);
      return;
    }
    setData(res.data);
  }

  async function copiar() {
    if (!data) return;
    await navigator.clipboard.writeText(breakdownParaTexto(data));
    setCopied(true);
    toast({ title: "Copiado! 🎉", variant: "success" });
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
      <Button onClick={toggleAberto} size="sm" variant="outline">
        {aberto ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
        {aberto ? "Fechar" : "Ver memória"}
      </Button>
      {aberto && (
        <div className="col-span-full mt-3 rounded-xl border-2 border-festive-gold/30 bg-festive-page/30 p-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando memória de {nome}…
            </div>
          )}
          {data && !loading && (
            <div className="space-y-5">
              {/* Resumo */}
              <div className="grid gap-2 rounded-xl border-2 border-festive-green/40 bg-white p-4 sm:grid-cols-4">
                <ResumoLinha label="Fase de grupos" v={data.grupos.subtotal} />
                <ResumoLinha label="Mata-mata" v={data.mata.subtotal} />
                <ResumoLinha label="Artilheiro" v={data.artilheiro?.pontos ?? 0} />
                <ResumoLinha label="TOTAL" v={data.total} destaque />
              </div>

              {/* Fase de grupos */}
              <section className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-fredoka text-base font-extrabold">⚽ Fase de grupos</h3>
                  <div className="inline-flex rounded-md bg-muted p-0.5 text-[10px] font-bold">
                    {(["todos", "acertos", "erros", "pendentes"] as Filtro[]).map((f) => (
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
                </div>
                <div className="overflow-x-auto rounded-lg border border-border bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Rodada</th>
                        <th className="p-2 text-left">Jogo</th>
                        <th className="p-2 text-center">Palpite</th>
                        <th className="p-2 text-center">Real</th>
                        <th className="p-2 text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.grupos.items
                        .filter((it) => {
                          if (filtro === "todos") return true;
                          if (filtro === "acertos") return it.tipo === "exato" || it.tipo === "vencedor";
                          // "Erros" agrupa quem errou E quem nao palpitou (0 pts em ambos)
                          if (filtro === "erros") return it.tipo === "erro" || it.tipo === "nao_palpitou";
                          if (filtro === "pendentes") return it.tipo === "pendente";
                          return true;
                        })
                        .map((it) => (
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
                                <span className="font-medium">{it.casa_nome}</span>
                                <span className="text-muted-foreground">×</span>
                                <span className="font-medium">{it.fora_nome}</span>
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
                    <tfoot>
                      <tr className="bg-muted">
                        <td colSpan={4} className="p-2 text-right text-xs font-bold uppercase tracking-wide">
                          Subtotal grupos:
                        </td>
                        <td className="p-2 text-right text-sm font-extrabold text-festive-green">
                          {data.grupos.subtotal} pts
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              {/* 16 avos (Round of 32) — derivado dos palpites de grupos */}
              {data.r32.length > 0 && (
                <section className="space-y-2">
                  <h3 className="font-fredoka text-base font-extrabold">
                    🎯 16 avos · {data.r32.length} classificados
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Times que vão ao mata-mata segundo os palpites de grupos do usuário (regras
                    FIFA: 1º + 2º de cada grupo + 8 melhores 3ºs).
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                    {data.r32.map((t) => (
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
                </section>
              )}

              {/* Mata-mata */}
              <section className="space-y-2">
                <h3 className="font-fredoka text-base font-extrabold">🏆 Mata-mata</h3>
                <div className="overflow-x-auto rounded-lg border border-border bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Fase palpitada</th>
                        <th className="p-2 text-left">Seleção</th>
                        <th className="p-2 text-center">Avançou?</th>
                        <th className="p-2 text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.mata.items.map((it, idx) => (
                        <tr
                          key={`${it.time_id}-${it.fase}-${idx}`}
                          className={cn(
                            "border-t border-border/40",
                            it.acertou && "bg-festive-green/10",
                          )}
                        >
                          <td className="p-2 font-bold capitalize">{it.fase}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              {it.time_bandeira && (
                                <Image src={it.time_bandeira} alt={it.time_nome} width={18} height={13} unoptimized className="rounded-sm" />
                              )}
                              <span className="font-medium">{it.time_nome}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            {it.acertou ? (
                              <Badge variant="success">✅ Sim</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">❌ chegou até: {it.fase_real}</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-extrabold">
                            {it.pontos > 0 ? (
                              <span className="text-festive-green">+{it.pontos}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {data.mata.items.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-3 text-center text-muted-foreground">
                            Sem palpites de mata-mata.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted">
                        <td colSpan={3} className="p-2 text-right text-xs font-bold uppercase tracking-wide">
                          Subtotal mata-mata:
                        </td>
                        <td className="p-2 text-right text-sm font-extrabold text-festive-green">
                          {data.mata.subtotal} pts
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              {/* Artilheiro */}
              <section className="space-y-2">
                <h3 className="font-fredoka text-base font-extrabold">🎯 Artilheiro</h3>
                {data.artilheiro ? (
                  <div className="rounded-lg border border-border bg-white p-3 text-sm">
                    <p>
                      <span className="text-muted-foreground">Palpitou:</span>{" "}
                      <strong>{data.artilheiro.nome_jogador}</strong>{" "}
                      {data.artilheiro.manual && <Badge variant="warning">texto livre</Badge>}
                    </p>
                    <p className="mt-1">
                      <span className="text-muted-foreground">Status:</span>{" "}
                      {!data.artilheiro.ja_definido ? (
                        <span className="text-muted-foreground">⏳ Aguardando fim da Copa</span>
                      ) : data.artilheiro.acertou ? (
                        <Badge variant="success">✅ acertou · +{data.artilheiro.pontos} pts</Badge>
                      ) : (
                        <span className="text-muted-foreground">❌ Errou · 0 pts</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem palpite de artilheiro.</p>
                )}
              </section>

              <div className="flex justify-end">
                <Button onClick={copiar} size="sm" variant="outline">
                  {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "📋 Copiar memória"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ResumoLinha({ label, v, destaque }: { label: string; v: number; destaque?: boolean }) {
  return (
    <div className={cn(destaque && "border-l-2 border-festive-green pl-2")}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("font-fredoka text-lg font-extrabold", destaque && "text-festive-green text-2xl")}>
        {v} pts
      </p>
    </div>
  );
}
