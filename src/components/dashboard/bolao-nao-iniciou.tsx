import { Calendar, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Empty state mostrado no painel quando ainda não há jogos finalizados
 * com pontos atribuídos. Substitui KPIs do pódio, multi-line chart,
 * heatmap, ranking e bar-chart-rodada (que ficariam todos zerados e
 * confusos com "todos empatados em 1º com 0 pts").
 *
 * Mantemos visíveis: prêmio, palpites de campeão/artilheiro e próximos
 * confrontos — esses fazem sentido antes do bolão começar.
 */
export function BolaoNaoIniciouCard({
  participantes,
  proximoJogoData,
}: {
  participantes: number;
  proximoJogoData: string | null;
}) {
  return (
    <Card
      className="border-2 border-festive-gold/40 shadow-stack-gold"
      style={{ background: "linear-gradient(135deg, #FFF8E1 0%, #FFE69C 100%)" }}
    >
      <CardContent className="flex flex-col items-center gap-3 px-6 py-8 text-center sm:py-10">
        <span className="text-5xl sm:text-6xl">🏆</span>
        <h2 className="font-fredoka text-xl font-extrabold text-zinc-900 sm:text-2xl">
          Bolão ainda não começou!
        </h2>
        <p className="max-w-md text-sm font-medium text-zinc-900/75">
          <strong className="text-zinc-900">{participantes}</strong>{" "}
          {participantes === 1 ? "participante pago" : "participantes pagos"} já no jogo.{" "}
          O ranking, KPIs e gráficos aparecem aqui assim que os primeiros resultados forem
          finalizados. Enquanto isso, vai chutando os palpites! 🎯
        </p>
        {proximoJogoData && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-xs font-extrabold text-zinc-900">
            <Calendar className="h-3.5 w-3.5" />
            Primeiro jogo: {proximoJogoData}
          </div>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-zinc-900/60">
          <Trophy className="h-3.5 w-3.5" />
          Copa do Mundo FIFA 2026 · México 🇲🇽 / EUA 🇺🇸 / Canadá 🇨🇦
        </div>
      </CardContent>
    </Card>
  );
}
