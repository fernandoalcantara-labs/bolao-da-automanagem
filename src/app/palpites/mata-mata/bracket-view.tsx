"use client";

import * as React from "react";
import Image from "next/image";
import { Trophy, Minus, Plus, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FasePalpiteMata } from "@/types/database";
import type { ParR32Resolvido } from "@/lib/bracket-2026";
import { labelPosicao, ORIGEM_TERCEIRO_LABEL } from "@/lib/bracket-2026";
import {
  R32_ESQUERDO_ORDEM,
  R32_DIREITO_ORDEM,
  R16,
  QF,
  SF,
  FINAL,
  labelJogo,
  type NoMataMata,
} from "@/lib/mata-mata-estrutura";

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
  /** Item 46: pontos por pick, chaveado `${fase}:${time_id}` → label
   *  ("+8" / "0" / "⏳"). Vem do breakdown (mesma conta do admin). */
  pontosMata?: Record<string, string>;
};

/** Label de pontos pra um slot (item 46). null = sem info (mostra ✓). */
function labelPontos(
  pontosMata: Record<string, string> | undefined,
  fase: FasePalpiteMata,
  timeId: string | null | undefined,
): string | null {
  if (!pontosMata || !timeId) return null;
  return pontosMata[`${fase}:${timeId}`] ?? null;
}

/**
 * BracketView — chaveamento estilo Copa do Mundo (desktop ≥ lg).
 *
 * Layout: lado esquerdo (R32 → R16 → QF → SF) + centro (final + troféu +
 * campeão) + lado direito espelhado.
 *
 * O pareamento das fases superiores segue a estrutura oficial FIFA via
 * `origemJogos` em `mata-mata-estrutura.ts` (Jogo 89 = vencedor de 73 ×
 * vencedor de 74, etc) — NÃO mais "pares adjacentes no array".
 */
export function BracketView({ r32, teams, picks, onPick, fechado, pontosMata }: BracketProps) {
  // Indexa R32 por matchNumber pra resolver vencedores recursivamente
  const r32PorJogo = React.useMemo(() => {
    const m = new Map<number, ParR32Resolvido>();
    for (const par of r32) m.set(par.matchNumber, par);
    return m;
  }, [r32]);

  /**
   * Resolve os time_ids dos vencedores escolhidos pelo user num jogo
   * de qualquer fase. Recursivo:
   *  - R32 (73-88): retorna casa e fora se foram escolhidos em "8avos"
   *  - R16/QF/SF/Final: resolve recursivamente os candidatos dos
   *    `origemJogos` e filtra por quem o user escolheu na fase atual
   */
  function vencedoresDoJogo(jogo: number, fasePicks: FasePalpiteMata): string[] {
    // R32?
    const par = r32PorJogo.get(jogo);
    if (par) {
      const ids: string[] = [];
      if (par.casaTime?.time_id && picks["8avos"].has(par.casaTime.time_id)) ids.push(par.casaTime.time_id);
      if (par.foraTime?.time_id && picks["8avos"].has(par.foraTime.time_id)) ids.push(par.foraTime.time_id);
      return ids;
    }
    // Fase superior: pega os 2 jogos de origem
    const no = encontrarNo(jogo);
    if (!no || !no.origemJogos) return [];
    const [a, b] = no.origemJogos;
    const candidatos: string[] = [];
    // Recursão pra cada jogo de origem — pega ambos times do match anterior
    candidatos.push(...timesDoJogo(a));
    candidatos.push(...timesDoJogo(b));
    // Filtra só os que o user escolheu pra ESTA fase
    return candidatos.filter((tid) => picks[fasePicks].has(tid));
  }

  /** Os 2 times que disputaram um jogo (independente de pick). */
  function timesDoJogo(jogo: number): string[] {
    const par = r32PorJogo.get(jogo);
    if (par) {
      const ids: string[] = [];
      if (par.casaTime?.time_id) ids.push(par.casaTime.time_id);
      if (par.foraTime?.time_id) ids.push(par.foraTime.time_id);
      return ids;
    }
    // Fase superior: 2 times = vencedores dos 2 origemJogos
    const no = encontrarNo(jogo);
    if (!no || !no.origemJogos) return [];
    const [a, b] = no.origemJogos;
    const fase = faseDoNo(no);
    const vencedoresA = timesDoJogo(a).filter((tid) => picks[fase].has(tid));
    const vencedoresB = timesDoJogo(b).filter((tid) => picks[fase].has(tid));
    // Pega 1 vencedor de cada lado (se houver)
    return [...vencedoresA.slice(0, 1), ...vencedoresB.slice(0, 1)];
  }

  // ─── Zoom (Tarefa 2 QW5) ───
  // Estado de zoom: 1.0 = tamanho normal, < 1 encolhe pra caber no mobile.
  // Limites 0.35–1.0 (passo 0.05). "Ajustar à tela" calcula com base na
  // largura visível do container externo.
  const [zoom, setZoom] = React.useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [naturalHeight, setNaturalHeight] = React.useState(0);

  // Mede altura natural do conteúdo (sem zoom) — transform: scale() não
  // afeta o scrollHeight, então o valor medido é sempre o tamanho 1:1.
  React.useEffect(() => {
    if (!contentRef.current) return;
    const update = () => {
      if (contentRef.current) setNaturalHeight(contentRef.current.scrollHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, []);

  function zoomIn() {
    setZoom((z) => Math.min(1, +(z + 0.05).toFixed(2)));
  }
  function zoomOut() {
    setZoom((z) => Math.max(0.35, +(z - 0.05).toFixed(2)));
  }
  function ajustarATela() {
    if (!containerRef.current) return;
    // -32 pra descontar padding interno (p-3 sm:p-4) + sombra da borda
    const w = containerRef.current.clientWidth - 32;
    const target = w / 1100;
    setZoom(Math.max(0.35, Math.min(1, +target.toFixed(2))));
  }

  // ─── Pinch-to-zoom (Tarefa 2 QW6) ───
  // Pinça nativa com 2 dedos no mobile. O container usa
  // touch-action: pan-x pan-y → scroll de 1 dedo funciona normal e o
  // gesto de 2 dedos NÃO dispara o zoom da página (cai nos handlers
  // abaixo). Rastreamos os 2 ponteiros e ajustamos o `zoom` pela razão
  // entre a distância atual e a inicial.
  const ponteiros = React.useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchInicio = React.useRef<{ dist: number; zoom: number } | null>(null);

  function distanciaPonteiros() {
    const pts = [...ponteiros.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "touch") return;
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.current.size === 2) {
      pinchInicio.current = { dist: distanciaPonteiros(), zoom };
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!ponteiros.current.has(e.pointerId)) return;
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.current.size === 2 && pinchInicio.current) {
      const dist = distanciaPonteiros();
      if (pinchInicio.current.dist > 0) {
        const ratio = dist / pinchInicio.current.dist;
        const next = Math.max(0.35, Math.min(1, +(pinchInicio.current.zoom * ratio).toFixed(2)));
        setZoom(next);
      }
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    ponteiros.current.delete(e.pointerId);
    if (ponteiros.current.size < 2) pinchInicio.current = null;
  }

  // Altura do wrapper externo = altura natural × zoom (encolhe junto)
  const alturaContainer = naturalHeight > 0 ? naturalHeight * zoom + 24 : undefined;

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative snap-x snap-proximity overflow-x-auto overscroll-x-contain rounded-2xl bg-gradient-to-br from-festive-page to-white p-3 shadow-stack scrollbar-thin sm:p-4"
      // touch-action pan-x pan-y: scroll de 1 dedo OK; pinça de 2 dedos
      // não vira zoom de página → cai nos handlers de pinch acima.
      style={{ WebkitOverflowScrolling: "touch", height: alturaContainer, touchAction: "pan-x pan-y" }}
    >
      {/* Controles flutuantes de zoom (não escalam — ficam fixos no canto). */}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full border border-border bg-white/95 p-1 shadow-stack backdrop-blur">
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Diminuir zoom"
          className="rounded-full p-1.5 transition-colors hover:bg-festive-page disabled:opacity-40 active:scale-95"
          disabled={zoom <= 0.35}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={ajustarATela}
          aria-label="Ajustar à tela"
          className="rounded-full p-1.5 transition-colors hover:bg-festive-page active:scale-95"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Aumentar zoom"
          className="rounded-full p-1.5 transition-colors hover:bg-festive-page disabled:opacity-40 active:scale-95"
          disabled={zoom >= 1}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="px-1.5 text-[10px] font-bold tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Wrapper de layout: reserva no DOM o tamanho VISUAL (1100×zoom)
          pra evitar scrollbar fantasma quando zoom < 1. O transform de
          dentro encolhe o conteúdo real. */}
      <div style={{ width: 1100 * zoom }}>
        {/* Wrapper escalado: contém TUDO que precisa encolher junto
            (faixa de títulos + bracket). transform-origin top-left
            pra o encolhimento sair do canto esquerdo. */}
        <div
          ref={contentRef}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: 1100,
          }}
        >
        {/* Faixa de títulos das fases (Tarefa 5 QW5)
            Cada TituloCol usa as MESMAS larguras das colunas abaixo
            (minWidth: 180 nas ColunaRound + 196px no Centro com px-2).
            Resultado: títulos alinhados verticalmente sobre as colunas. */}
        <div className="mb-2 flex min-w-[1100px] items-end gap-3">
          <TituloCol titulo="16 avos" />
          <TituloCol titulo="Oitavas" />
          <TituloCol titulo="Quartas" />
          <TituloCol titulo="Semi" />
          <TituloCol titulo="Final" alinhamento="center" largura={180} />
          <TituloCol titulo="Semi" alinhamento="right" />
          <TituloCol titulo="Quartas" alinhamento="right" />
          <TituloCol titulo="Oitavas" alinhamento="right" />
          <TituloCol titulo="16 avos" alinhamento="right" />
        </div>

        <div className="flex min-w-[1100px] items-stretch gap-3">
          {/* Lado esquerdo */}
          <ColunaRound
            altura={8}
            matches={R32_ESQUERDO_ORDEM.map((j) => renderCardR32(r32PorJogo.get(j), teams, picks, onPick, fechado, pontosMata))}
          />
          <ColunaRound
            altura={4}
            matches={R16.filter((n) => n.ladoEsquerdo).map((n) =>
              renderCardFaseSuperior(n, "8avos", "quartas", vencedoresDoJogo, teams, picks, onPick, fechado, pontosMata),
            )}
          />
          <ColunaRound
            altura={2}
            matches={QF.filter((n) => n.ladoEsquerdo).map((n) =>
              renderCardFaseSuperior(n, "quartas", "semi", vencedoresDoJogo, teams, picks, onPick, fechado, pontosMata),
            )}
          />
          <ColunaRound
            altura={1}
            matches={SF.filter((n) => n.ladoEsquerdo).map((n) =>
              renderCardFaseSuperior(n, "semi", "final", vencedoresDoJogo, teams, picks, onPick, fechado, pontosMata),
            )}
          />

          {/* Centro */}
          <CentroBracket teams={teams} picks={picks} onPick={onPick} fechado={fechado} pontosMata={pontosMata} />

          {/* Lado direito (espelhado) */}
          <ColunaRound
            altura={1}
            matches={SF.filter((n) => !n.ladoEsquerdo).map((n) =>
              renderCardFaseSuperior(n, "semi", "final", vencedoresDoJogo, teams, picks, onPick, fechado, pontosMata),
            )}
          />
          <ColunaRound
            altura={2}
            matches={QF.filter((n) => !n.ladoEsquerdo).map((n) =>
              renderCardFaseSuperior(n, "quartas", "semi", vencedoresDoJogo, teams, picks, onPick, fechado, pontosMata),
            )}
          />
          <ColunaRound
            altura={4}
            matches={R16.filter((n) => !n.ladoEsquerdo).map((n) =>
              renderCardFaseSuperior(n, "8avos", "quartas", vencedoresDoJogo, teams, picks, onPick, fechado, pontosMata),
            )}
          />
          <ColunaRound
            altura={8}
            matches={R32_DIREITO_ORDEM.map((j) => renderCardR32(r32PorJogo.get(j), teams, picks, onPick, fechado, pontosMata))}
          />
        </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────── Helpers da estrutura ────────────────────────────

function encontrarNo(jogo: number): NoMataMata | undefined {
  if (jogo === FINAL.jogo) return FINAL;
  return [...R16, ...QF, ...SF].find((n) => n.jogo === jogo);
}

function faseDoNo(no: NoMataMata): FasePalpiteMata {
  // Mapeia fase do nó pra fase de pick que decide quem AVANÇA dele
  switch (no.fase) {
    case "r16":
      return "8avos"; // picks de 8avos definem quem ganha o R32; mas pra "avançar do R16" usamos "quartas"
    case "qf":
      return "quartas";
    case "sf":
      return "semi";
    case "final":
      return "final";
    default:
      return "8avos";
  }
}

// ──────────────────────────── Coluna por round ────────────────────────────
// QW5 T5: o título saiu daqui pra uma faixa única no topo do bracket.
// ColunaRound agora renderiza só os cards centralizados verticalmente.

function ColunaRound({
  matches,
  altura,
}: {
  matches: React.ReactNode[];
  altura: number;
}) {
  // Espaçamento entre matches cresce conforme avança nas fases:
  // 8 matches → gap-2, 4 → gap-[3.5rem], 2 → gap-[10rem], 1 → centro
  const spacing =
    altura === 8 ? "gap-2" :
    altura === 4 ? "gap-[3.5rem]" :
    altura === 2 ? "gap-[10rem]" :
    "";
  return (
    // QW6 T2: snap-start faz o scroll horizontal "parar" alinhado em cada
    // coluna (combina com snap-proximity no container).
    <div className="flex snap-start flex-col" style={{ minWidth: 180 }}>
      <div className={cn("flex flex-1 flex-col justify-center", spacing)}>{matches}</div>
    </div>
  );
}

// QW5 T5: faixa de títulos no topo do bracket. Cada coluna usa a MESMA
// largura mínima (180px) das ColunaRound, garantindo que o texto fique
// exatamente sobre a coluna correspondente abaixo.
function TituloCol({
  titulo,
  alinhamento = "left",
  largura = 180,
}: {
  titulo: string;
  alinhamento?: "left" | "center" | "right";
  largura?: number;
}) {
  return (
    <div
      style={{ minWidth: largura }}
      className={cn(
        "text-[10px] font-extrabold uppercase tracking-widest text-festive-green",
        alinhamento === "center" && "text-center",
        alinhamento === "right" && "text-right",
      )}
    >
      {titulo}
    </div>
  );
}

// ──────────────────────────── Cards de match ────────────────────────────

function labelOrigemSlot(
  par: ParR32Resolvido,
  lado: "casa" | "fora",
): string {
  const slot = lado === "casa" ? par.casa : par.fora;
  const origemTerceiro = lado === "casa" ? par.casaOrigemTerceiro : par.foraOrigemTerceiro;
  if (slot.tipo === "3" && origemTerceiro !== null) {
    return ORIGEM_TERCEIRO_LABEL(origemTerceiro);
  }
  return labelPosicao(slot);
}

function renderCardR32(
  par: ParR32Resolvido | undefined,
  teams: Record<string, Team>,
  picks: Record<FasePalpiteMata, Set<string>>,
  onPick: (fase: FasePalpiteMata, id: string) => void,
  fechado: boolean,
  pontosMata?: Record<string, string>,
): React.ReactNode {
  if (!par) return null;
  const casaId = par.casaTime?.time_id;
  const foraId = par.foraTime?.time_id;
  const casa = casaId ? teams[casaId] : null;
  const fora = foraId ? teams[foraId] : null;
  const palpiteCasa = casaId ? picks["8avos"].has(casaId) : false;
  const palpiteFora = foraId ? picks["8avos"].has(foraId) : false;
  return (
    <div key={par.matchNumber} className="rounded-xl border-2 border-border bg-white p-1.5 shadow-stack">
      <BadgeJogo jogo={par.matchNumber} />
      <MatchSlot
        label={labelOrigemSlot(par, "casa")}
        team={casa}
        escolhido={palpiteCasa}
        onClick={casaId && !fechado ? () => onPick("8avos", casaId) : undefined}
        pontosLabel={labelPontos(pontosMata, "8avos", casaId)}
      />
      <div className="my-1 h-px bg-border" />
      <MatchSlot
        label={labelOrigemSlot(par, "fora")}
        team={fora}
        escolhido={palpiteFora}
        onClick={foraId && !fechado ? () => onPick("8avos", foraId) : undefined}
        pontosLabel={labelPontos(pontosMata, "8avos", foraId)}
      />
    </div>
  );
}

function renderCardFaseSuperior(
  no: NoMataMata,
  fasePicksAnterior: FasePalpiteMata, // qual fase de picks decide quem CHEGOU neste jogo
  fasePicksDeste: FasePalpiteMata, // qual fase de picks decide quem AVANÇA deste jogo
  vencedoresDoJogo: (jogo: number, fase: FasePalpiteMata) => string[],
  teams: Record<string, Team>,
  picks: Record<FasePalpiteMata, Set<string>>,
  onPick: (fase: FasePalpiteMata, id: string) => void,
  fechado: boolean,
  pontosMata?: Record<string, string>,
): React.ReactNode {
  // Candidatos = vencedores dos 2 origemJogos (1 de cada)
  if (!no.origemJogos) return null;
  const [a, b] = no.origemJogos;
  const candidatosA = vencedoresDoJogo(a, fasePicksAnterior);
  const candidatosB = vencedoresDoJogo(b, fasePicksAnterior);
  const candidatos = [candidatosA[0] ?? null, candidatosB[0] ?? null];
  return (
    <div key={no.jogo} className="rounded-xl border-2 border-border bg-white p-1.5 shadow-stack">
      <BadgeJogo jogo={no.jogo} />
      {[0, 1].map((slot) => {
        const tid = candidatos[slot];
        const team = tid ? teams[tid] : null;
        const escolhido = tid ? picks[fasePicksDeste].has(tid) : false;
        return (
          <React.Fragment key={slot}>
            {slot === 1 && <div className="my-1 h-px bg-border" />}
            <MatchSlot
              label={team ? "" : "—"}
              team={team}
              escolhido={escolhido}
              onClick={tid && !fechado ? () => onPick(fasePicksDeste, tid) : undefined}
              pontosLabel={labelPontos(pontosMata, fasePicksDeste, tid)}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ──────────────────────────── Badge "Jogo NN" ────────────────────────────

function BadgeJogo({ jogo }: { jogo: number }) {
  return (
    <p className="mb-1 text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
      {labelJogo(jogo)}
    </p>
  );
}

// ──────────────────────────── Slot individual ────────────────────────────

function MatchSlot({
  label,
  team,
  escolhido,
  onClick,
  pontosLabel,
}: {
  label?: string;
  team: { nome: string; bandeira_url: string } | null;
  escolhido: boolean;
  onClick?: () => void;
  /** Item 46: pontos do pick (ex.: "+8", "0", "⏳"). Substitui o ✓. */
  pontosLabel?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className={cn(
        // QW6 T2: min-h-[44px] = alvo de toque confortável no mobile
        // (recomendação Apple/Google). Antes ~32px, fácil errar o clique.
        "flex min-h-[44px] w-full items-center gap-1.5 rounded-md px-2 py-2 text-left text-xs font-bold transition-all touch-manipulation",
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
      <span className="flex flex-1 flex-col leading-tight">
        <span className="team-name">{team?.nome ?? label ?? "—"}</span>
        {team && label && (
          <span className="text-[9px] font-medium opacity-70">{label}</span>
        )}
      </span>
      {escolhido && (
        <span className="shrink-0 text-[10px] font-extrabold text-white">
          {pontosLabel != null ? pontosLabel : "✓"}
        </span>
      )}
    </button>
  );
}

// ──────────────────────────── Centro do bracket ────────────────────────────

function CentroBracket({
  teams,
  picks,
  onPick,
  fechado,
  pontosMata,
}: {
  teams: Record<string, Team>;
  picks: Record<FasePalpiteMata, Set<string>>;
  onPick: (fase: FasePalpiteMata, id: string) => void;
  fechado: boolean;
  pontosMata?: Record<string, string>;
}) {
  // Os 2 finalistas vêm dos picks em "final" (= time chega à final).
  const finalistas = [...picks.final];
  const campeao = [...picks.campeao][0];

  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ minWidth: 180 }}>
      <Trophy className="h-12 w-12 text-festive-gold-dark drop-shadow-md" />
      <div className="w-full">
        <p className="mb-1 text-center text-[10px] font-extrabold uppercase tracking-widest text-festive-gold-dark">
          {labelJogo(FINAL.jogo)}
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
                    // QW6 T2: min-h-[44px] alvo de toque confortável (idem MatchSlot)
                    "flex min-h-[44px] w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left text-xs font-extrabold transition-all touch-manipulation",
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
                  <span className="team-name flex-1">
                    {team?.nome ?? "—"}
                  </span>
                  {/* Item 46 — caso da final: soma pts_final + (campeão|vice). */}
                  {tid && pontosMata?.[`centro:${tid}`] && (
                    <span className="shrink-0 text-[10px] font-extrabold">{pontosMata[`centro:${tid}`]}</span>
                  )}
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
