/**
 * Cliente para football-data.org (FIFA World Cup, competição "WC").
 * Free tier: 10 req/min. Use somente no servidor.
 */

const BASE = "https://api.football-data.org/v4";

type FdMatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED"
  | "AWARDED";

export type FdMatch = {
  id: number;
  utcDate: string;
  status: FdMatchStatus;
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: { id: number; name: string; tla: string | null };
  awayTeam: { id: number; name: string; tla: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  };
};

export type FdScorer = {
  player: { id: number; name: string };
  team: { id: number; name: string; tla: string | null };
  goals: number;
};

async function fetchFd<T>(path: string): Promise<T> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_API_KEY não configurada");

  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": key },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`football-data.org ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function buscarPartidasWC(): Promise<FdMatch[]> {
  const data = await fetchFd<{ matches: FdMatch[] }>("/competitions/WC/matches");
  return data.matches;
}

export async function buscarArtilheirosWC(limit = 20): Promise<FdScorer[]> {
  const data = await fetchFd<{ scorers: FdScorer[] }>(`/competitions/WC/scorers?limit=${limit}`);
  return data.scorers;
}

/**
 * Mapeia status football-data → status interno.
 */
export function mapearStatus(s: FdMatchStatus): "agendado" | "andamento" | "finalizado" {
  if (s === "FINISHED" || s === "AWARDED") return "finalizado";
  if (s === "IN_PLAY" || s === "PAUSED") return "andamento";
  return "agendado";
}

/**
 * Mapeia stage da API para a nossa fase interna.
 */
export function mapearFase(stage: string): "grupos" | "16avos" | "8avos" | "quartas" | "semi" | "3lugar" | "final" | null {
  switch (stage) {
    case "GROUP_STAGE": return "grupos";
    case "LAST_16":
    case "ROUND_OF_16":
      return "8avos"; // Atenção: na Copa 2026, "Round of 16" = oitavas (nossa "8avos")
    case "ROUND_OF_32":
    case "LAST_32":
      return "16avos";
    case "QUARTER_FINALS": return "quartas";
    case "SEMI_FINALS": return "semi";
    case "THIRD_PLACE": return "3lugar";
    case "FINAL": return "final";
    default:
      return null;
  }
}
