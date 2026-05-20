"use client";

import * as React from "react";
import { Download, Loader2, FileDown, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";

export type BackupItem = {
  id: number;
  tipo: "manual_admin" | "deadline_grupos" | "fim_copa" | "outro";
  gerado_em: string;
  gerado_por: string | null;
  arquivo_nome: string;
  tamanho_bytes: number;
  total_usuarios: number | null;
  total_palpites: number | null;
  // Resolvido server-side: nome do admin que gerou (se manual)
  gerado_por_nome: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

const TIPO_LABELS: Record<BackupItem["tipo"], { label: string; cor: string }> = {
  manual_admin: { label: "Manual", cor: "text-festive-green" },
  deadline_grupos: { label: "Deadline da fase de grupos", cor: "text-festive-blue" },
  fim_copa: { label: "Fim da Copa", cor: "text-festive-gold-dark" },
  outro: { label: "Outro", cor: "text-muted-foreground" },
};

function dispararDownloadDeTexto(filename: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BackupCsvSection({ backupsIniciais }: { backupsIniciais: BackupItem[] }) {
  const [backups, setBackups] = React.useState<BackupItem[]>(backupsIniciais);
  const [loading, setLoading] = React.useState(false);
  const [downloadingId, setDownloadingId] = React.useState<number | null>(null);

  async function gerarESalvarBackup() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backup-csv", { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        toast({
          title: "Erro ao gerar backup",
          description: text,
          variant: "destructive",
        });
        return;
      }
      const j = await res.json();
      // Dispara download imediato
      dispararDownloadDeTexto(j.arquivo_nome, j.conteudo);
      toast({
        title: "Backup gerado e salvo! 🎉",
        description: "Arquivo baixado e disponível na lista abaixo.",
        variant: "success",
      });
      // Adiciona no topo da lista (otimista)
      setBackups((b) => [
        {
          id: j.id,
          tipo: "manual_admin",
          gerado_em: new Date().toISOString(),
          gerado_por: null,
          gerado_por_nome: "(você)",
          arquivo_nome: j.arquivo_nome,
          tamanho_bytes: j.stats.tamanho_bytes,
          total_usuarios: j.stats.total_usuarios,
          total_palpites: j.stats.total_palpites,
        },
        ...b,
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function rebaixar(b: BackupItem) {
    setDownloadingId(b.id);
    try {
      const res = await fetch(`/api/admin/backup-csv?id=${b.id}`);
      if (!res.ok) {
        toast({ title: "Erro ao baixar backup", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = b.arquivo_nome;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileDown className="h-4 w-4" /> Backup e Exportação
        </CardTitle>
        <CardDescription>
          Gera um CSV com todos os palpites (formato largo, estilo planilha). O arquivo baixa pro
          seu computador E fica salvo na lista abaixo pra consulta futura.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={gerarESalvarBackup} disabled={loading} variant="default">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Baixar e salvar backup
        </Button>

        {backups.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
            Nenhum backup salvo ainda. Clica em <strong>&quot;Baixar e salvar backup&quot;</strong> pra
            gerar o primeiro.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              📂 Backups salvos ({backups.length})
            </p>
            <div className="space-y-2">
              {backups.map((b) => {
                const tipoInfo = TIPO_LABELS[b.tipo];
                const automatico = b.tipo === "deadline_grupos" || b.tipo === "fim_copa";
                return (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-border bg-card p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-festive-page/60">
                      {automatico ? (
                        <Bot className="h-5 w-5 text-festive-blue" />
                      ) : (
                        <User className="h-5 w-5 text-festive-green" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold truncate">{b.arquivo_nome}</p>
                        <Badge variant="muted" className="text-[10px]">
                          <span className={tipoInfo.cor}>{tipoInfo.label}</span>
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatDataHora(b.gerado_em)}
                        {b.gerado_por_nome && ` · ${b.gerado_por_nome}`}
                        {" · "}
                        {b.total_usuarios ?? 0} usuários · {b.total_palpites ?? 0} palpites ·{" "}
                        {formatBytes(b.tamanho_bytes)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rebaixar(b)}
                      disabled={downloadingId === b.id}
                    >
                      {downloadingId === b.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="mr-1 h-3.5 w-3.5" />
                      )}
                      Baixar
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
