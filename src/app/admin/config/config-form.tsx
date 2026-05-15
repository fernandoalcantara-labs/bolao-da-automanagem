"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import type { PontuacaoConfig, RateioConfig } from "@/types/database";

type Conf = {
  pontuacao?: PontuacaoConfig;
  rateio?: RateioConfig;
  pix_chave?: string;
  pix_nome?: string;
  valor_aposta?: number;
  nome_bolao?: string;
};

export function ConfigForm({ conf }: { conf: Conf }) {
  const [saving, setSaving] = React.useState(false);
  const [pontos, setPontos] = React.useState<PontuacaoConfig>(
    conf.pontuacao ?? {
      placar_exato: 5, vencedor_ou_empate: 2, mata_16avos: 8, mata_8avos: 12,
      mata_quartas: 16, mata_semi: 20, vice: 24, campeao: 40, artilheiro: 24,
    },
  );
  const [rateio, setRateio] = React.useState<RateioConfig>(
    conf.rateio ?? { primeiro: 60, segundo: 20, terceiro: 10, artilheiro: 10 },
  );
  const [pixChave, setPixChave] = React.useState(conf.pix_chave ?? "");
  const [pixNome, setPixNome] = React.useState(conf.pix_nome ?? "");
  const [valor, setValor] = React.useState(conf.valor_aposta ?? 50);
  const [nomeBolao, setNomeBolao] = React.useState(conf.nome_bolao ?? "Bolão da AutoManagem");

  async function salvar() {
    setSaving(true);
    const supabase = createClient();
    const rows = [
      { chave: "pontuacao", valor: pontos as any },
      { chave: "rateio", valor: rateio as any },
      { chave: "pix_chave", valor: pixChave as any },
      { chave: "pix_nome", valor: pixNome as any },
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

  const somaRateio = rateio.primeiro + rateio.segundo + rateio.terceiro + rateio.artilheiro;

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
          <NumberField label="16 avos" v={pontos.mata_16avos} onChange={(n) => setPontos({ ...pontos, mata_16avos: n })} />
          <NumberField label="Oitavas" v={pontos.mata_8avos} onChange={(n) => setPontos({ ...pontos, mata_8avos: n })} />
          <NumberField label="Quartas" v={pontos.mata_quartas} onChange={(n) => setPontos({ ...pontos, mata_quartas: n })} />
          <NumberField label="Semi" v={pontos.mata_semi} onChange={(n) => setPontos({ ...pontos, mata_semi: n })} />
          <NumberField label="Vice" v={pontos.vice} onChange={(n) => setPontos({ ...pontos, vice: n })} />
          <NumberField label="Campeão" v={pontos.campeao} onChange={(n) => setPontos({ ...pontos, campeao: n })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rateio do prêmio (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <NumberField label="1º lugar" v={rateio.primeiro} onChange={(n) => setRateio({ ...rateio, primeiro: n })} />
            <NumberField label="2º lugar" v={rateio.segundo} onChange={(n) => setRateio({ ...rateio, segundo: n })} />
            <NumberField label="3º lugar" v={rateio.terceiro} onChange={(n) => setRateio({ ...rateio, terceiro: n })} />
            <NumberField label="Artilheiro" v={rateio.artilheiro} onChange={(n) => setRateio({ ...rateio, artilheiro: n })} />
          </div>
          <p className={`mt-3 text-sm ${somaRateio === 100 ? "text-emerald-400" : "text-destructive"}`}>
            Soma: {somaRateio}% {somaRateio !== 100 && "(deve totalizar 100%)"}
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
