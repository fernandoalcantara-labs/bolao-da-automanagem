"use client";

import * as React from "react";
import Image from "next/image";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FasePalpiteMata } from "@/types/database";
import type { ParR32Resolvido } from "@/lib/bracket-2026";
import { labelPosicao } from "@/lib/bracket-2026";

export type Team = {
  id: string;
  nome: string;
  codigo_fifa: string;
  bandeira_url: string;
  grupo: string;
};

export type BracketProps = {
  /** 16 pares do R32 (com times resolvidos ou null se grupo ainda não terminou). */
  r32: ParR32Resolvido[];
  /** Mapa id→team (pra renderizar flags). */
  teams: Record<string, Team>;
  /** Picks do usuário por fase (set de time_ids). */
  picks: Record<FasePalpiteMata, Set<string>>;
  /** Callback ao clicar pra escolher um vencedor numa partida. */
  onPick: (fase: FasePalpiteMata, timeId: string) => void;
  fechado: boolean;
};

/**
 * BracketView — chaveamento estilo Copa do Mundo (desktop ≥ lg).
 *
 * Layout: lado esquerdo (8 R32 → 4 R16 → 2 QF → 1 SF) + centro
 * (final + troféu + campeão + 3º lugar) + lado direito espelhado.
 */
export function BracketView({ r32, teams, picks, onPick, fechado }: BracketProps) {
  const esquerdo = r32.filter((p) => p.ladoEsquerdo);
  const direito = r32.filter((p) => !p.ladoEsquerdo);

  // R16 = pares de R32: (R32-1, R32-2), (R32-3, R32-4), etc.
  const r16Esquerdo = agruparEmPares(esquerdo);
  const r16Direito = agruparEmPares(direito);

  // QF = pares de R16
  const qfEsquerdo = agruparPares(r16Esquerdo);
  const qfDireito = agruparPares(r16Direito);

  // SF = pares de QF (1 SF de cada lado)
  const sfEsquerdo = qfEsquerdo; // já é 1 grupo de 2 QFs
  const sfDireito = qfDireito;

  return (
    <div
      className="overflow-x-auto overscroll-x-contain rounded-2xl bg-gradient-to-br from-festive-page to-white p-3 shadow-stack scrollbar-thin sm:p-4"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex min-w-[1100px] items-stretch gap-3">
        {/* Lado esquerdo */}
        <ColunaRound titulo="16 avos" matches={renderR32(esquerdo, teams, picks, onPick, fechado)} altura={8} />
        <ColunaRound titulo="Oitavas" matches={renderR16(r16Esquerdo, teams, picks, onPick, fechado)} altura={4} />
        <ColunaRound titulo="Quartas" matches={renderQF(qfEsquerdo, teams, picks, onPick, fechado)} altura={2} />
        <ColunaRound titulo="Semi" matches={renderSF(sfEsquerdo, teams, picks, onPick, fechado)} altura={1} />

        {/* Centro */}
        <CentroBracket teams={teams} picks={picks} onPick={onPick} fechado={fechado} />

        {/* Lado direito (espelhado) */}
        <ColunaRound titulo="Semi" matches={renderSF(sfDireito, teams, picks, onPick, fechado)} altura={1} alinhamento="right" />
        <ColunaRound titulo="Quartas" matches={renderQF(qfDireito, teams, picks, onPick, fechado)} altura={2} alinhamento="right" />
        <ColunaRound titulo="Oitavas" matches={renderR16(r16Direito, teams, picks, onPick, fechado)} altura={4} alinhamento="right" />
        <ColunaRound titulo="16 avos" matches={renderR32(direito, teams, picks, onPick, fechado)} altura={8} alinhamento="right" />
      </div>
    </div>
  );
}

// ──────────────────────────── Auxiliares de estrutura ────────────────────────────

function agruparEmPares<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push([arr[i], arr[i + 1]]);
  return out;
}

function agruparPares<T>(arr: T[][]): T[][][] {
  const out: T[][][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push([arr[i], arr[i + 1]]);
  return out;
}

// ──────────────────────────── Coluna por round ────────────────────────────

function ColunaRound({
  titulo,
  matches,
  altura,
  alinhamento = "left",
}: {
  titulo: string;
  matches: React.ReactNode[];
  altura: number;
  alinhamento?: "left" | "right";
}) {
  // Espaçamento entre matches cresce conforme avança nas fases:
  // 8 matches → space-y-2, 4 → space-y-12, 2 → space-y-32, 1 → centro
  const spacing =
    altura === 8 ? "gap-2" :
    altura === 4 ? "gap-[3.5rem]" :
    altura === 2 ? "gap-[10rem]" :
    "";
  return (
    <div className="flex flex-col" style={{ minWidth: 170 }}>
      <p
        className={cn(
          "mb-2 text-[10px] font-extrabold uppercase tracking-widest text-festive-green",
          alinhamento === "right" && "text-right",
        )}
      >
        {titulo}
      </p>
      <div className={cn("flex flex-1 flex-col justify-center", spacing)}>{matches}</div>
    </div>
  );
}

// ──────────────────────────── Cards de match por round ────────────────────────────

function renderR32(
  pares: ParR32Resolvido[],
  teams: Record<string, Team>,
  picks: Record<FasePalpiteMata, Set<string>>,
  onPick: (fase: FasePalpiteMata, id: string) => void,
  fechado: boolean,
): React.ReactNode[] {
  return pares.map((par) => {
    const casaId = par.casaTime?.time_id;
    const foraId = par.foraTime?.time_id;
    const casa = casaId ? teams[casaId] : null;
    const fora = foraId ? teams[foraId] : null;
    const palpiteCasa = casaId ? picks["8avos"].has(casaId) : false;
    const palpiteFora = foraId ? picks["8avos"].has(foraId) : false;
    return (
      <div key={par.ordem} className="rounded-xl border-2 border-border bg-white p-1.5 shadow-stack">
        <MatchSlot
          label={labelPosicao(par.casa)}
          team={casa}
          escolhido={palpiteCasa}
          onClick={casaId && !fechado ? () => onPick("8avos", casaId) : undefined}
        />
        <div className="my-1 h-px bg-border" />
        <MatchSlot
          label={labelPosicao(par.fora)}
          team={fora}
          escolhido={palpiteFora}
          onClick={foraId && !fechado ? () => onPick("8avos", foraId) : undefined}
        />
      </div>
    );
  });
}

function renderR16(
  pares: ParR32Resolvido[][],
  teams: Record<string, Team>,
  picks: Record<FasePalpiteMata, Set<string>>,
  onPick: (fase: FasePalpiteMata, id: string) => void,
  fechado: boolean,
): React.ReactNode[] {
  return pares.map((par, i) => {
    // Os 2 vencedores que o usuário escolheu no R32 (em "8avos") são os
    // contendores deste R16. Se houver < 2 picks, mostra placeholder.
    const candidatos: string[] = par
      .flatMap((p) => [p.casaTime?.time_id, p.foraTime?.time_id])
      .filter((id): id is string => !!id && picks["8avos"].has(id));
    return renderProximoRound("quartas", candidatos, teams, picks, onPick, fechado, i);
  });
}

function renderQF(
  pares: ParR32Resolvido[][][],
  teams: Record<string, Team>,
  picks: Record<FasePalpiteMata, Set<string>>,
  onPick: (fase: FasePalpiteMata, id: string) => void,
  fechado: boolean,
): React.ReactNode[] {
  return pares.map((par, i) => {
    const candidatos: string[] = par
      .flat()
      .flatMap((p) => [p.casaTime?.time_id, p.foraTime?.time_id])
      .filter((id): id is string => !!id && picks["quartas"].has(id));
    return renderProximoRound("semi", candidatos, teams, picks, onPick, fechado, i);
  });
}

function renderSF(
  pares: ParR32Resolvido[][][],
  teams: Record<string, Team>,
  picks: Record<FasePalpiteMata, Set<string>>,
  onPick: (fase: FasePalpiteMata, id: string) => void,
  fechado: boolean,
): React.ReactNode[] {
  const candidatos: string[] = pares
    .flat(2)
    .flatMap((p) => [p.casaTime?.time_id, p.foraTime?.time_id])
    .filter((id): id is string => !!id && picks["semi"].has(id));
  return [renderProximoRound("final", candidatos, teams, picks, onPick, fechado, 0)];
}

function renderProximoRound(
  fase: FasePalpiteMata,
  candidatos: string[],
  teams: Record<string, Team>,
  picks: Record<FasePalpiteMata, Set<string>>,
  onPick: (fase: FasePalpiteMata, id: string) => void,
  fechado: boolean,
  key: number,
): React.ReactNode {
  return (
    <div key={key} className="rounded-xl border-2 border-border bg-white p-1.5 shadow-stack">
      {[0, 1].map((slot) => {
        const tid = candidatos[slot];
        const team = tid ? teams[tid] : null;
        const escolhido = tid ? picks[fase].has(tid) : false;
        return (
          <React.Fragment key={slot}>
            {slot === 1 && <div className="my-1 h-px bg-border" />}
            <MatchSlot
              label={team ? "" : "—"}
              team={team}
              escolhido={escolhido}
              onClick={tid && !fechado ? () => onPick(fase, tid) : undefined}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ──────────────────────────── Slot individual ────────────────────────────

function MatchSlot({
  label,
  team,
  escolhido,
  onClick,
}: {
  label?: string;
  team: { nome: string; bandeira_url: string } | null;
  escolhido: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-left text-xs font-bold transition-all touch-manipulation",
        // Escolhido (passa de fase): verde Brasil com texto branco
        escolhido && "bg-gradient-to-br from-festive-green to-festive-green-light text-white ring-1 ring-festive-green-deep",
        // Não escolhido + clicável: hover amarelo claro
        !escolhido && onClick && "text-zinc-900 hover:bg-festive-gold/15 active:scale-95 cursor-pointer",
        // Disabled/sem team
        !onClick && !escolhido && "text-muted-foreground cursor-default",
      )}
    >
      {team?.bandeira_url ? (
        <Image src={team.bandeira_url} alt={team.nome} width={20} height={14} unoptimized className="rounded-sm" />
      ) : (
        <span className="inline-block h-3.5 w-5 rounded-sm bg-muted" />
      )}
      <span className="line-clamp-1 flex-1">
        {team?.nome ?? label ?? "—"}
      </span>
      {escolhido && <span className="text-white">✓</span>}
    </button>
  );
}

// ──────────────────────────── Centro do bracket ────────────────────────────

function CentroBracket({
  teams,
  picks,
  onPick,
  fechado,
}: {
  teams: Record<string, Team>;
  picks: Record<FasePalpiteMata, Set<string>>;
  onPick: (fase: FasePalpiteMata, id: string) => void;
  fechado: boolean;
}) {
  // Os 2 finalistas vêm dos picks em "final" (= time chega à final).
  const finalistas = [...picks.final];
  const campeao = [...picks.campeao][0];

  return (
    <div className="flex min-w-[180px] flex-col items-center justify-center gap-3 px-2">
      <Trophy className="h-12 w-12 text-festive-gold-dark drop-shadow-md" />
      <div className="w-full">
        <p className="mb-1 text-center text-[10px] font-extrabold uppercase tracking-widest text-festive-gold-dark">
          Final
        </p>
        <div className="rounded-xl border-2 border-festive-gold-dark/50 bg-white p-1.5 shadow-stack-gold">
          {[0, 1].map((slot) => {
            const tid = finalistas[slot];
            const team = tid ? teams[tid] : null;
            const isCampeao = !!tid && campeao === tid;
            const podeClicar = !!tid && !fechado;
            return (
              <React.Fragment key={slot}>
                {slot === 1 && <div className="my-1 h-px bg-border" />}
                <button
                  type="button"
                  onClick={podeClicar ? () => onPick("campeao", tid) : undefined}
                  disabled={!podeClicar}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left text-xs font-extrabold transition-all touch-manipulation",
                    // Não escolhido (estado normal): fundo branco, texto escuro
                    !isCampeao && tid && "text-zinc-900 hover:bg-festive-gold/15",
                    // Escolhido como CAMPEÃO: gradient dourado, texto escuro forte (contraste alto)
                    isCampeao && "gradient-gold text-zinc-900 ring-2 ring-festive-gold-dark scale-[1.02]",
                    // Sem time ainda
                    !tid && "text-muted-foreground",
                    podeClicar && "cursor-pointer active:scale-95",
                  )}
                >
                  {team?.bandeira_url ? (
                    <Image src={team.bandeira_url} alt={team.nome} width={20} height={14} unoptimized className="rounded-sm" />
                  ) : (
                    <span className="inline-block h-3.5 w-5 rounded-sm bg-muted" />
                  )}
                  <span className="line-clamp-1 flex-1">
                    {team?.nome ?? "—"}
                  </span>
                  {isCampeao && <span className="text-base">👑</span>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div className="w-full">
        <p className="mb-1 text-center text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
          Campeão
        </p>
        <div className="rounded-xl border-2 border-festive-green/40 bg-festive-green/10 px-2 py-2 text-center text-xs font-extrabold">
          {campeao && teams[campeao]?.nome ? (
            <span className="font-fredoka text-sm text-festive-green">🏆 {teams[campeao].nome}</span>
          ) : (
            <span className="text-muted-foreground">Escolha 1 finalista</span>
          )}
        </div>
      </div>
    </div>
  );
}
