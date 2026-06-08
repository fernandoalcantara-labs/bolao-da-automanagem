"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { normalizarPontuacao } from "@/lib/scoring";
import type { PontuacaoConfig, RateioConfig } from "@/types/database";

type Conf = {
  pontuacao?: PontuacaoConfig;
  rateio?: RateioConfig;
  pix_chave?: string;
  pix_nome?: string;
  pix_sorriso_whatsapp?: string;
  valor_aposta?: number;
  nome_bolao?: string;
};

export function ConfigForm({ conf }: { conf: Conf }) {
  const [saving, setSaving] = React.useState(false);
  // Normaliza pro padrão pts_* (fase alcançada) ao carregar — converte
  // configs legadas (mata_*) por significado.
  const [pontos, setPontos] = React.useState<PontuacaoConfig>(
    normalizarPontuacao(conf.pontuacao),
  );
  const [rateio, setRateio] = React.useState<RateioConfig>(
    conf.rateio ?? { primeiro: 65, segundo: 20, terceiro: 10, lanterninha: 5, artilheiro: 0 },
  );
  const [pixChave, setPixChave] = React.useState(conf.pix_chave ?? "");
  const [pixNome, setPixNome] = React.useState(conf.pix_nome ?? "");
  const [pixSorrisoWA, setPixSorrisoWA] = React.useState(conf.pix_sorriso_whatsapp ?? "");
  const [valor, setValor] = React.useState(conf.valor_aposta ?? 50);
  const [nomeBolao, setNomeBolao] = React.useState(conf.nome_bolao ?? "Bolão da AutoManagem");

  async function salvar() {
    if (somaRateio !== 100) {
      toast({
        title: "Rateio inválido",
        description: `A soma dos percentuais deve ser 100% (atual: ${somaRateio}%).`,
        variant: "destructive",
      });
      return;
    }
    // Validação do WhatsApp (12-13 dígitos numéricos)
    if (pixSorrisoWA && !/^\d{12,13}$/.test(pixSorrisoWA)) {
      toast({
        title: "WhatsApp inválido",
        description: "Use só dígitos: DDI + DDD + número (12-13 chars). Ex: 5531987654321",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const rows = [
      { chave: "pontuacao", valor: pontos as any },
      { chave: "rateio", valor: rateio as any },
      { chave: "pix_chave", valor: pixChave as any },
      { chave: "pix_nome", valor: pixNome as any },
      { chave: "pix_sorriso_whatsapp", valor: pixSorrisoWA as any },
      { chave: "valor_aposta", valor: valor as any },
      { chave: "nome_bolao", valor: nomeBolao as any },
    ];
    for (const r of rows) {
      const { error } = await supabase.from("config").upsert(r as any, { onConflict: "chave" });
      if (error) {
        setSaving(false);
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return;
      }
    }
    setSaving(false);
    toast({ title: "Configurações salvas!", variant: "success" });
  }

  const somaRateio =
    rateio.primeiro + rateio.segundo + rateio.terceiro + rateio.lanterninha + rateio.artilheiro;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidade & PIX</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do bolão" value={nomeBolao} onChange={setNomeBolao} />
          <Field label="Valor da aposta (R$)" type="number" value={String(valor)} onChange={(v) => setValor(Number(v))} />
          <Field label="Chave PIX" value={pixChave} onChange={setPixChave} />
          <Field label="Nome do recebedor" value={pixNome} onChange={setPixNome} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>WhatsApp do organizador (Sorriso)</Label>
            <Input
              type="tel"
              value={pixSorrisoWA}
              onChange={(e) => setPixSorrisoWA(e.target.value)}
              placeholder="5531987654321"
            />
            <p className="text-[11px] text-muted-foreground">
              Formato internacional sem + ou espaços. Ex: 5531987654321 (DDI Brasil 55 + DDD + número).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pontuação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Placar exato" v={pontos.placar_exato} onChange={(n) => setPontos({ ...pontos, placar_exato: n })} />
          <NumberField label="Vencedor / empate" v={pontos.vencedor_ou_empate} onChange={(n) => setPontos({ ...pontos, vencedor_ou_empate: n })} />
          <NumberField label="Artilheiro" v={pontos.artilheiro} onChange={(n) => setPontos({ ...pontos, artilheiro: n })} />
          <NumberField label="16 Avos" v={pontos.pts_r32} onChange={(n) => setPontos({ ...pontos, pts_r32: n })} />
          <NumberField label="Oitavas" v={pontos.pts_oitavas} onChange={(n) => setPontos({ ...pontos, pts_oitavas: n })} />
          <NumberField label="Quartas" v={pontos.pts_quartas} onChange={(n) => setPontos({ ...pontos, pts_quartas: n })} />
          <NumberField label="Semi" v={pontos.pts_semi} onChange={(n) => setPontos({ ...pontos, pts_semi: n })} />
          <NumberField label="Final" v={pontos.pts_final} onChange={(n) => setPontos({ ...pontos, pts_final: n })} />
          <NumberField label="Vice" v={pontos.vice} onChange={(n) => setPontos({ ...pontos, vice: n })} />
          <NumberField label="Campeão" v={pontos.campeao} onChange={(n) => setPontos({ ...pontos, campeao: n })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rateio do prêmio (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-5">
            <NumberField label="🥇 1º lugar" v={rateio.primeiro} onChange={(n) => setRateio({ ...rateio, primeiro: n })} />
            <NumberField label="🥈 2º lugar" v={rateio.segundo} onChange={(n) => setRateio({ ...rateio, segundo: n })} />
            <NumberField label="🥉 3º lugar" v={rateio.terceiro} onChange={(n) => setRateio({ ...rateio, terceiro: n })} />
            <NumberField label="🐢 Lanterninha" v={rateio.lanterninha} onChange={(n) => setRateio({ ...rateio, lanterninha: n })} />
            <NumberField label="⚽ Artilheiro" v={rateio.artilheiro} onChange={(n) => setRateio({ ...rateio, artilheiro: n })} />
          </div>
          <p className={`mt-3 text-sm ${somaRateio === 100 ? "text-emerald-400" : "text-destructive"}`}>
            Soma: <strong>{somaRateio}%</strong>{" "}
            {somaRateio !== 100 && `(precisa ser 100%, falta ajustar ${100 - somaRateio}%)`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            💡 O lanterninha é quem tem MENOS pontos — empate divide igualmente. Acertar artilheiro
            soma 24 pts ao ranking; o % aqui é prêmio em dinheiro (deixe 0 se quiser só pontuação).
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={saving} size="lg">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumberField({ label, v, onChange }: { label: string; v: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" value={v} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
