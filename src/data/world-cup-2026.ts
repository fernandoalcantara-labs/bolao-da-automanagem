/**
 * Dados estáticos da Copa do Mundo FIFA 2026 — fallback usado pelo seed
 * quando a API football-data.org não está disponível.
 *
 * FONTE: Sorteio realizado em 05/12/2025 (Kennedy Center, Washington DC).
 * Slots "TBD" representam vencedores dos playoffs europeus e intercontinentais
 * de março/2026 — devem ser atualizados pelo admin assim que confirmados.
 *
 * Formato da Copa 2026 (NOVO):
 *  - 48 seleções, 12 grupos de 4 (A–L)
 *  - 72 jogos na fase de grupos
 *  - Passam: 2 primeiros de cada grupo (24) + 8 melhores 3ºs = 32
 *  - Mata-mata: 16 avos → oitavas → quartas → semi → final
 */

export type Grupo =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export type Selecao = {
  nome: string;
  codigo: string; // ISO 3166-1 alpha-2 lowercase para flagcdn (br, ar, fr…) ou "tbd"
  grupo: Grupo;
  tbd?: boolean;
};

export const SELECOES: Selecao[] = [
  // Grupo A
  { nome: "México", codigo: "mx", grupo: "A" },
  { nome: "África do Sul", codigo: "za", grupo: "A" },
  { nome: "Coreia do Sul", codigo: "kr", grupo: "A" },
  { nome: "Tchéquia", codigo: "cz", grupo: "A" }, // Path D — venceu Dinamarca nos pênaltis

  // Grupo B
  { nome: "Canadá", codigo: "ca", grupo: "B" },
  { nome: "Bósnia e Herzegovina", codigo: "ba", grupo: "B" }, // Path A — venceu Itália nos pênaltis
  { nome: "Catar", codigo: "qa", grupo: "B" },
  { nome: "Suíça", codigo: "ch", grupo: "B" },

  // Grupo C
  { nome: "Brasil", codigo: "br", grupo: "C" },
  { nome: "Marrocos", codigo: "ma", grupo: "C" },
  { nome: "Haiti", codigo: "ht", grupo: "C" },
  { nome: "Escócia", codigo: "gb-sct", grupo: "C" },

  // Grupo D
  { nome: "Estados Unidos", codigo: "us", grupo: "D" },
  { nome: "Paraguai", codigo: "py", grupo: "D" },
  { nome: "Austrália", codigo: "au", grupo: "D" },
  { nome: "Turquia", codigo: "tr", grupo: "D" }, // Path C

  // Grupo E
  { nome: "Alemanha", codigo: "de", grupo: "E" },
  { nome: "Curaçao", codigo: "cw", grupo: "E" },
  { nome: "Costa do Marfim", codigo: "ci", grupo: "E" },
  { nome: "Equador", codigo: "ec", grupo: "E" },

  // Grupo F
  { nome: "Holanda", codigo: "nl", grupo: "F" },
  { nome: "Japão", codigo: "jp", grupo: "F" },
  { nome: "Suécia", codigo: "se", grupo: "F" }, // Path B
  { nome: "Tunísia", codigo: "tn", grupo: "F" },

  // Grupo G
  { nome: "Bélgica", codigo: "be", grupo: "G" },
  { nome: "Egito", codigo: "eg", grupo: "G" },
  { nome: "Irã", codigo: "ir", grupo: "G" },
  { nome: "Nova Zelândia", codigo: "nz", grupo: "G" },

  // Grupo H
  { nome: "Espanha", codigo: "es", grupo: "H" },
  { nome: "Cabo Verde", codigo: "cv", grupo: "H" },
  { nome: "Arábia Saudita", codigo: "sa", grupo: "H" },
  { nome: "Uruguai", codigo: "uy", grupo: "H" },

  // Grupo I
  { nome: "França", codigo: "fr", grupo: "I" },
  { nome: "Senegal", codigo: "sn", grupo: "I" },
  { nome: "Iraque", codigo: "iq", grupo: "I" }, // Intercontinental 2 — venceu Bolívia 2-1
  { nome: "Noruega", codigo: "no", grupo: "I" },

  // Grupo J
  { nome: "Argentina", codigo: "ar", grupo: "J" },
  { nome: "Argélia", codigo: "dz", grupo: "J" },
  { nome: "Áustria", codigo: "at", grupo: "J" },
  { nome: "Jordânia", codigo: "jo", grupo: "J" },

  // Grupo K
  { nome: "Portugal", codigo: "pt", grupo: "K" },
  { nome: "República Democrática do Congo", codigo: "cd", grupo: "K" }, // Intercontinental 1
  { nome: "Uzbequistão", codigo: "uz", grupo: "K" },
  { nome: "Colômbia", codigo: "co", grupo: "K" },

  // Grupo L
  { nome: "Inglaterra", codigo: "gb-eng", grupo: "L" },
  { nome: "Croácia", codigo: "hr", grupo: "L" },
  { nome: "Gana", codigo: "gh", grupo: "L" },
  { nome: "Panamá", codigo: "pa", grupo: "L" },
];

/**
 * Bandeira via flagcdn (suporta gb-eng e gb-sct via subdivisões).
 * Para "tbd" retorna um placeholder neutro.
 */
export function bandeiraUrl(codigo: string, size: 80 | 160 = 80): string {
  if (codigo === "tbd") {
    return `https://flagcdn.com/w${size}/un.png`;
  }
  return `https://flagcdn.com/w${size}/${codigo}.png`;
}

/**
 * Calendário da fase de grupos — 72 jogos.
 * Cada grupo joga 6 partidas (3 rodadas × 2 jogos).
 * Distribuímos em 12 dias (11/06 – 27/06) com 6 jogos por dia em média.
 *
 * Como os "tbd" ainda não têm nome, usamos índice dentro do grupo.
 */
export type JogoGrupos = {
  grupo: Grupo;
  rodada: 1 | 2 | 3;
  casaIdx: 0 | 1 | 2 | 3;
  foraIdx: 0 | 1 | 2 | 3;
  data: string; // ISO
};

// Padrão de confrontos dentro de um grupo de 4 (FIFA):
//   R1: 0 vs 1, 2 vs 3
//   R2: 0 vs 2, 3 vs 1
//   R3: 0 vs 3, 1 vs 2
const PADRAO_GRUPO: ReadonlyArray<{ rodada: 1 | 2 | 3; casa: 0 | 1 | 2 | 3; fora: 0 | 1 | 2 | 3 }> = [
  { rodada: 1, casa: 0, fora: 1 },
  { rodada: 1, casa: 2, fora: 3 },
  { rodada: 2, casa: 0, fora: 2 },
  { rodada: 2, casa: 3, fora: 1 },
  { rodada: 3, casa: 0, fora: 3 },
  { rodada: 3, casa: 1, fora: 2 },
];

const GRUPOS: Grupo[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

/**
 * Gera 72 jogos distribuídos entre 11/06/2026 e 27/06/2026 (17 dias).
 * Simplificação: rodada 1 = 11–16/06, rodada 2 = 17–22/06, rodada 3 = 23–27/06.
 */
export function gerarJogosFaseGrupos(): JogoGrupos[] {
  const jogos: JogoGrupos[] = [];
  const inicioR1 = new Date("2026-06-11T17:00:00-04:00");
  const inicioR2 = new Date("2026-06-17T13:00:00-04:00");
  const inicioR3 = new Date("2026-06-23T13:00:00-04:00");

  let countR1 = 0, countR2 = 0, countR3 = 0;

  for (const grupo of GRUPOS) {
    for (const slot of PADRAO_GRUPO) {
      const baseDate = slot.rodada === 1 ? inicioR1 : slot.rodada === 2 ? inicioR2 : inicioR3;
      const count = slot.rodada === 1 ? countR1++ : slot.rodada === 2 ? countR2++ : countR3++;
      // 4 jogos por dia, intervalos de 3h
      const dia = Math.floor(count / 4);
      const horaSlot = count % 4;
      const data = new Date(baseDate);
      data.setDate(data.getDate() + dia);
      data.setHours(data.getHours() + horaSlot * 3);
      jogos.push({
        grupo,
        rodada: slot.rodada,
        casaIdx: slot.casa,
        foraIdx: slot.fora,
        data: data.toISOString(),
      });
    }
  }
  return jogos;
}

/**
 * Lista de jogadores notáveis para o palpite de artilheiro.
 * (atualizado/expandido pelo admin; este é apenas o seed inicial)
 */
export const ARTILHEIROS_CANDIDATOS = [
  { nome: "Vinícius Júnior", selecao: "Brasil" },
  { nome: "Rodrygo", selecao: "Brasil" },
  { nome: "Raphinha", selecao: "Brasil" },
  { nome: "Endrick", selecao: "Brasil" },
  { nome: "Neymar", selecao: "Brasil" },
  { nome: "Kylian Mbappé", selecao: "França" },
  { nome: "Ousmane Dembélé", selecao: "França" },
  { nome: "Lionel Messi", selecao: "Argentina" },
  { nome: "Lautaro Martínez", selecao: "Argentina" },
  { nome: "Julián Álvarez", selecao: "Argentina" },
  { nome: "Erling Haaland", selecao: "Noruega" },
  { nome: "Harry Kane", selecao: "Inglaterra" },
  { nome: "Bukayo Saka", selecao: "Inglaterra" },
  { nome: "Jude Bellingham", selecao: "Inglaterra" },
  { nome: "Cristiano Ronaldo", selecao: "Portugal" },
  { nome: "Bruno Fernandes", selecao: "Portugal" },
  { nome: "Rafael Leão", selecao: "Portugal" },
  { nome: "Lamine Yamal", selecao: "Espanha" },
  { nome: "Álvaro Morata", selecao: "Espanha" },
  { nome: "Nico Williams", selecao: "Espanha" },
  { nome: "Florian Wirtz", selecao: "Alemanha" },
  { nome: "Jamal Musiala", selecao: "Alemanha" },
  { nome: "Kai Havertz", selecao: "Alemanha" },
  { nome: "Memphis Depay", selecao: "Holanda" },
  { nome: "Cody Gakpo", selecao: "Holanda" },
  { nome: "Romelu Lukaku", selecao: "Bélgica" },
  { nome: "Kevin De Bruyne", selecao: "Bélgica" },
  { nome: "Darwin Núñez", selecao: "Uruguai" },
  { nome: "Federico Valverde", selecao: "Uruguai" },
  { nome: "Luis Díaz", selecao: "Colômbia" },
  { nome: "James Rodríguez", selecao: "Colômbia" },
  { nome: "Christian Pulisic", selecao: "Estados Unidos" },
  { nome: "Folarin Balogun", selecao: "Estados Unidos" },
  { nome: "Hirving Lozano", selecao: "México" },
  { nome: "Santiago Giménez", selecao: "México" },
  { nome: "Alphonso Davies", selecao: "Canadá" },
  { nome: "Jonathan David", selecao: "Canadá" },
  { nome: "Sadio Mané", selecao: "Senegal" },
  { nome: "Mohammed Salah", selecao: "Egito" },
  { nome: "Achraf Hakimi", selecao: "Marrocos" },
  { nome: "Hakim Ziyech", selecao: "Marrocos" },
  { nome: "Takefusa Kubo", selecao: "Japão" },
  { nome: "Kaoru Mitoma", selecao: "Japão" },
  { nome: "Heung-min Son", selecao: "Coreia do Sul" },
  { nome: "Mehdi Taremi", selecao: "Irã" },
  { nome: "Hwang Hee-chan", selecao: "Coreia do Sul" },
  { nome: "Khvicha Kvaratskhelia", selecao: "Vencedor Playoff Europeu A" },
  { nome: "Marko Arnautović", selecao: "Áustria" },
  { nome: "Riyad Mahrez", selecao: "Argélia" },
  { nome: "Enner Valencia", selecao: "Equador" },
];

/**
 * Datas de referência das fases do mata-mata.
 */
export const FASES_MATA_MATA = [
  { fase: "16avos", label: "16 avos de final", inicio: "2026-06-28T13:00:00-04:00", quantidade: 16 },
  { fase: "8avos", label: "Oitavas de final", inicio: "2026-07-03T13:00:00-04:00", quantidade: 8 },
  { fase: "quartas", label: "Quartas de final", inicio: "2026-07-09T13:00:00-04:00", quantidade: 4 },
  { fase: "semi", label: "Semifinais", inicio: "2026-07-14T15:00:00-04:00", quantidade: 2 },
  { fase: "3lugar", label: "Disputa do 3º lugar", inicio: "2026-07-18T15:00:00-04:00", quantidade: 1 },
  { fase: "final", label: "Final", inicio: "2026-07-19T15:00:00-04:00", quantidade: 1 },
] as const;
