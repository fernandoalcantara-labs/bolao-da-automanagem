/**
 * Estrutura oficial do bracket da Copa do Mundo FIFA 2026.
 *
 * 16 pares do Round of 32 com posições abstratas:
 *  - 1X = primeiro colocado do grupo X
 *  - 2X = segundo colocado do grupo X
 *  - 3ABCDF = um dos 8 melhores terceiros, vindo de A/B/C/D ou F
 *
 * Fonte: FIFA Worldcup 2026 bracket structure (sorteio 05/dez/2025).
 *
 * Os pares estão ordenados pelo bracket: matches 1-8 (chave superior /
 * lado esquerdo do bracket visual) e 9-16 (chave inferior / lado direito).
 * R16 (oitavas) pareia: R32-1 vs R32-2 → R16-1, R32-3 vs R32-4 → R16-2,
 * etc. — formato bracket clássico.
 *
 * ⚠️  IMPORTANTE — Alocação dos 3os colocados:
 *
 * A FIFA NÃO usa um algoritmo dinâmico pra decidir em qual jogo cada
 * 3º colocado vai. Em vez disso, publica no Annex C do regulamento
 * uma matriz pré-computada das 495 combinações possíveis (C(12,8)).
 *
 * Cada uma das 495 entradas mapeia: "se os 8 melhores 3os vierem destes
 * grupos específicos, então a alocação dos 8 slots de 3os é esta".
 *
 * Este arquivo carrega essa matriz oficial via `FIFA_ANNEX_C` e usa
 * `lookupAnnexC()` pra resolver as alocações. A versão anterior usava
 * um algoritmo guloso ("primeiro 3º válido na ordem do bracket")
 * que produzia alocações DIFERENTES da FIFA em vários cenários,
 * inclusive deixando vagas sem time alocado em alguns casos
 * (bug do placeholder "3º (X/Y/Z)").
 */

import type { Grupo } from "@/types/database";
import { classificadosParaMataMata, type StatsTime, type JogoFinalizado } from "./classification";

export type SlotPosicao =
  | { tipo: "1"; grupo: Grupo }
  | { tipo: "2"; grupo: Grupo }
  | { tipo: "3"; grupos: Grupo[] }; // terceiro vindo de um dos N grupos

export type ParR32 = {
  ordem: number; // 1..16, posição no bracket
  matchNumber: number; // 73..88 (numeração oficial FIFA)
  ladoEsquerdo: boolean; // true se na metade esquerda do bracket
  casa: SlotPosicao;
  fora: SlotPosicao;
};

/**
 * 16 pares do R32 — ordenados pelo bracket visual (não pelo número FIFA).
 *
 * Coluna `matchNumber` é a numeração oficial FIFA (73-88), usada como
 * chave para a matriz Annex C.
 *
 * Os 8 slots de 3os colocados aparecem nos matches:
 *   74 (1E), 77 (1I), 79 (1A), 80 (1L),
 *   81 (1D), 82 (1G), 85 (1B), 87 (1K)
 *
 * Os 8 grupos válidos pra cada slot vêm direto da estrutura FIFA:
 *   match 74 (1E): 3 do grupo A/B/C/D/F
 *   match 77 (1I): 3 do grupo C/D/F/G/H
 *   match 79 (1A): 3 do grupo C/E/F/H/I
 *   match 80 (1L): 3 do grupo E/H/I/J/K
 *   match 81 (1D): 3 do grupo B/E/F/I/J
 *   match 82 (1G): 3 do grupo A/E/H/I/J
 *   match 85 (1B): 3 do grupo E/F/G/I/J
 *   match 87 (1K): 3 do grupo D/E/I/J/L
 */
export const R32_PARES: ParR32[] = [
  // ladoEsquerdo segue a estrutura oficial FIFA (corrigida 2026-05-20):
  // ESQUERDA: 73, 74, 75, 77, 81, 82, 83, 84
  // DIREITA:  76, 78, 79, 80, 85, 86, 87, 88
  { ordem: 1, matchNumber: 79, ladoEsquerdo: false, casa: { tipo: "1", grupo: "A" }, fora: { tipo: "3", grupos: ["C", "E", "F", "H", "I"] } },
  { ordem: 2, matchNumber: 76, ladoEsquerdo: false, casa: { tipo: "1", grupo: "C" }, fora: { tipo: "2", grupo: "F" } },
  { ordem: 3, matchNumber: 74, ladoEsquerdo: true,  casa: { tipo: "1", grupo: "E" }, fora: { tipo: "3", grupos: ["A", "B", "C", "D", "F"] } },
  { ordem: 4, matchNumber: 73, ladoEsquerdo: true,  casa: { tipo: "2", grupo: "A" }, fora: { tipo: "2", grupo: "B" } },
  { ordem: 5, matchNumber: 85, ladoEsquerdo: false, casa: { tipo: "1", grupo: "B" }, fora: { tipo: "3", grupos: ["E", "F", "G", "I", "J"] } },
  { ordem: 6, matchNumber: 75, ladoEsquerdo: true,  casa: { tipo: "1", grupo: "F" }, fora: { tipo: "2", grupo: "C" } },
  { ordem: 7, matchNumber: 81, ladoEsquerdo: true,  casa: { tipo: "1", grupo: "D" }, fora: { tipo: "3", grupos: ["B", "E", "F", "I", "J"] } },
  { ordem: 8, matchNumber: 88, ladoEsquerdo: false, casa: { tipo: "2", grupo: "D" }, fora: { tipo: "2", grupo: "G" } },
  { ordem: 9, matchNumber: 82, ladoEsquerdo: true,  casa: { tipo: "1", grupo: "G" }, fora: { tipo: "3", grupos: ["A", "E", "H", "I", "J"] } },
  { ordem: 10, matchNumber: 84, ladoEsquerdo: true,  casa: { tipo: "1", grupo: "H" }, fora: { tipo: "2", grupo: "J" } },
  { ordem: 11, matchNumber: 77, ladoEsquerdo: true,  casa: { tipo: "1", grupo: "I" }, fora: { tipo: "3", grupos: ["C", "D", "F", "G", "H"] } },
  { ordem: 12, matchNumber: 78, ladoEsquerdo: false, casa: { tipo: "2", grupo: "E" }, fora: { tipo: "2", grupo: "I" } },
  { ordem: 13, matchNumber: 86, ladoEsquerdo: false, casa: { tipo: "1", grupo: "J" }, fora: { tipo: "2", grupo: "H" } },
  { ordem: 14, matchNumber: 80, ladoEsquerdo: false, casa: { tipo: "1", grupo: "L" }, fora: { tipo: "3", grupos: ["E", "H", "I", "J", "K"] } },
  { ordem: 15, matchNumber: 87, ladoEsquerdo: false, casa: { tipo: "1", grupo: "K" }, fora: { tipo: "3", grupos: ["D", "E", "I", "J", "L"] } },
  { ordem: 16, matchNumber: 83, ladoEsquerdo: true,  casa: { tipo: "2", grupo: "K" }, fora: { tipo: "2", grupo: "L" } },
];

// ────────────────────────────────────────────────────────────────────────
// FIFA Annex C — matriz oficial das 495 combinações
// ────────────────────────────────────────────────────────────────────────

/**
 * Ordem dos slots na matriz Annex C (cabeçalho da tabela FIFA):
 *   coluna 0 → match 79 (1A vs 3X)
 *   coluna 1 → match 85 (1B vs 3X)
 *   coluna 2 → match 81 (1D vs 3X)
 *   coluna 3 → match 74 (1E vs 3X)
 *   coluna 4 → match 82 (1G vs 3X)
 *   coluna 5 → match 77 (1I vs 3X)
 *   coluna 6 → match 87 (1K vs 3X)
 *   coluna 7 → match 80 (1L vs 3X)
 *
 * Cada coluna informa de qual grupo o 3º colocado vem (A-L).
 */
const ANNEX_C_MATCH_ORDER = [79, 85, 81, 74, 82, 77, 87, 80] as const;

/**
 * Matriz das 495 combinações.
 *
 * Encoding compacto: cada entrada é uma string de 16 caracteres:
 *   - 8 primeiros: os 8 grupos (A-L) dos terceiros classificados, em ORDEM ALFABÉTICA
 *   - 8 últimos: o grupo do 3º que vai em cada slot, na ordem ANNEX_C_MATCH_ORDER
 *
 * Exemplo: "ABCDEFGHHGBCAFDE"
 *   - terceiros classificados: A, B, C, D, E, F, G, H
 *   - match 79 recebe 3H; match 85 recebe 3G; match 81 recebe 3B;
 *     match 74 recebe 3C; match 82 recebe 3A; match 77 recebe 3F;
 *     match 87 recebe 3D; match 80 recebe 3E
 *
 * Esta é a transcrição literal da tabela publicada pela FIFA no Annex C
 * do regulamento da Copa 2026.
 */
const FIFA_ANNEX_C: readonly string[] = [
  /* 001 */ "EFGHIJKLEJIFHGLK",
  /* 002 */ "DFGHIJKLHGIDJFLK",
  /* 003 */ "DEGHIJKLEJIDHGLK",
  /* 004 */ "DEFHIJKLEJIDHFLK",
  /* 005 */ "DEFGIJKLEGIDJFLK",
  /* 006 */ "DEFGHJKLEGJDHFLK",
  /* 007 */ "DEFGHIKLEGIDHFLK",
  /* 008 */ "DEFGHIJLEGJDHFLI",
  /* 009 */ "DEFGHIJKEGJDHFIK",
  /* 010 */ "CFGHIJKLHGICJFLK",
  /* 011 */ "CEGHIJKLEJICHGLK",
  /* 012 */ "CEFHIJKLEJICHFLK",
  /* 013 */ "CEFGIJKLEGICJFLK",
  /* 014 */ "CEFGHJKLEGJCHFLK",
  /* 015 */ "CEFGHIKLEGICHFLK",
  /* 016 */ "CEFGHIJLEGJCHFLI",
  /* 017 */ "CEFGHIJKEGJCHFIK",
  /* 018 */ "CDGHIJKLHGICJDLK",
  /* 019 */ "CDFHIJKLCJIDHFLK",
  /* 020 */ "CDFGIJKLCGIDJFLK",
  /* 021 */ "CDFGHJKLCGJDHFLK",
  /* 022 */ "CDFGHIKLCGIDHFLK",
  /* 023 */ "CDFGHIJLCGJDHFLI",
  /* 024 */ "CDFGHIJKCGJDHFIK",
  /* 025 */ "CDEHIJKLEJICHDLK",
  /* 026 */ "CDEGIJKLEGICJDLK",
  /* 027 */ "CDEGHJKLEGJCHDLK",
  /* 028 */ "CDEGHIKLEGICHDLK",
  /* 029 */ "CDEGHIJLEGJCHDLI",
  /* 030 */ "CDEGHIJKEGJCHDIK",
  /* 031 */ "CDEFIJKLCJEDIFLK",
  /* 032 */ "CDEFHJKLCJEDHFLK",
  /* 033 */ "CDEFHIKLCEIDHFLK",
  /* 034 */ "CDEFHIJLCJEDHFLI",
  /* 035 */ "CDEFHIJKCJEDHFIK",
  /* 036 */ "CDEFGJKLCGEDJFLK",
  /* 037 */ "CDEFGIKLCGEDIFLK",
  /* 038 */ "CDEFGIJLCGEDJFLI",
  /* 039 */ "CDEFGIJKCGEDJFIK",
  /* 040 */ "CDEFGHKLCGEDHFLK",
  /* 041 */ "CDEFGHJLCGJDHFLE",
  /* 042 */ "CDEFGHJKCGJDHFEK",
  /* 043 */ "CDEFGHILCGEDHFLI",
  /* 044 */ "CDEFGHIKCGEDHFIK",
  /* 045 */ "CDEFGHIJCGJDHFEI",
  /* 046 */ "BFGHIJKLHJBFIGLK",
  /* 047 */ "BEGHIJKLEJIBHGLK",
  /* 048 */ "BEFHIJKLEJBFIHLK",
  /* 049 */ "BEFGIJKLEJBFIGLK",
  /* 050 */ "BEFGHJKLEJBFHGLK",
  /* 051 */ "BEFGHIKLEGBFIHLK",
  /* 052 */ "BEFGHIJLEJBFHGLI",
  /* 053 */ "BEFGHIJKEJBFHGIK",
  /* 054 */ "BDGHIJKLHJBDIGLK",
  /* 055 */ "BDFHIJKLHJBDIFLK",
  /* 056 */ "BDFGIJKLIGBDJFLK",
  /* 057 */ "BDFGHJKLHGBDJFLK",
  /* 058 */ "BDFGHIKLHGBDIFLK",
  /* 059 */ "BDFGHIJLHGBDJFLI",
  /* 060 */ "BDFGHIJKHGBDJFIK",
  /* 061 */ "BDEHIJKLEJBDIHLK",
  /* 062 */ "BDEGIJKLEJBDIGLK",
  /* 063 */ "BDEGHJKLEJBDHGLK",
  /* 064 */ "BDEGHIKLEGBDIHLK",
  /* 065 */ "BDEGHIJLEJBDHGLI",
  /* 066 */ "BDEGHIJKEJBDHGIK",
  /* 067 */ "BDEFIJKLEJBDIFLK",
  /* 068 */ "BDEFHJKLEJBDHFLK",
  /* 069 */ "BDEFHIKLEIBDHFLK",
  /* 070 */ "BDEFHIJLEJBDHFLI",
  /* 071 */ "BDEFHIJKEJBDHFIK",
  /* 072 */ "BDEFGJKLEGBDJFLK",
  /* 073 */ "BDEFGIKLEGBDIFLK",
  /* 074 */ "BDEFGIJLEGBDJFLI",
  /* 075 */ "BDEFGIJKEGBDJFIK",
  /* 076 */ "BDEFGHKLEGBDHFLK",
  /* 077 */ "BDEFGHJLHGBDJFLE",
  /* 078 */ "BDEFGHJKHGBDJFEK",
  /* 079 */ "BDEFGHILEGBDHFLI",
  /* 080 */ "BDEFGHIKEGBDHFIK",
  /* 081 */ "BDEFGHIJHGBDJFEI",
  /* 082 */ "BCGHIJKLHJBCIGLK",
  /* 083 */ "BCFHIJKLHJBCIFLK",
  /* 084 */ "BCFGIJKLIGBCJFLK",
  /* 085 */ "BCFGHJKLHGBCJFLK",
  /* 086 */ "BCFGHIKLHGBCIFLK",
  /* 087 */ "BCFGHIJLHGBCJFLI",
  /* 088 */ "BCFGHIJKHGBCJFIK",
  /* 089 */ "BCEHIJKLEJBCIHLK",
  /* 090 */ "BCEGIJKLEJBCIGLK",
  /* 091 */ "BCEGHJKLEJBCHGLK",
  /* 092 */ "BCEGHIKLEGBCIHLK",
  /* 093 */ "BCEGHIJLEJBCHGLI",
  /* 094 */ "BCEGHIJKEJBCHGIK",
  /* 095 */ "BCEFIJKLEJBCIFLK",
  /* 096 */ "BCEFHJKLEJBCHFLK",
  /* 097 */ "BCEFHIKLEIBCHFLK",
  /* 098 */ "BCEFHIJLEJBCHFLI",
  /* 099 */ "BCEFHIJKEJBCHFIK",
  /* 100 */ "BCEFGJKLEGBCJFLK",
  /* 101 */ "BCEFGIKLEGBCIFLK",
  /* 102 */ "BCEFGIJLEGBCJFLI",
  /* 103 */ "BCEFGIJKEGBCJFIK",
  /* 104 */ "BCEFGHKLEGBCHFLK",
  /* 105 */ "BCEFGHJLHGBCJFLE",
  /* 106 */ "BCEFGHJKHGBCJFEK",
  /* 107 */ "BCEFGHILEGBCHFLI",
  /* 108 */ "BCEFGHIKEGBCHFIK",
  /* 109 */ "BCEFGHIJHGBCJFEI",
  /* 110 */ "BCDHIJKLHJBCIDLK",
  /* 111 */ "BCDGIJKLIGBCJDLK",
  /* 112 */ "BCDGHJKLHGBCJDLK",
  /* 113 */ "BCDGHIKLHGBCIDLK",
  /* 114 */ "BCDGHIJLHGBCJDLI",
  /* 115 */ "BCDGHIJKHGBCJDIK",
  /* 116 */ "BCDFIJKLCJBDIFLK",
  /* 117 */ "BCDFHJKLCJBDHFLK",
  /* 118 */ "BCDFHIKLCIBDHFLK",
  /* 119 */ "BCDFHIJLCJBDHFLI",
  /* 120 */ "BCDFHIJKCJBDHFIK",
  /* 121 */ "BCDFGJKLCGBDJFLK",
  /* 122 */ "BCDFGIKLCGBDIFLK",
  /* 123 */ "BCDFGIJLCGBDJFLI",
  /* 124 */ "BCDFGIJKCGBDJFIK",
  /* 125 */ "BCDFGHKLCGBDHFLK",
  /* 126 */ "BCDFGHJLCGBDHFLJ",
  /* 127 */ "BCDFGHJKHGBCJFDK",
  /* 128 */ "BCDFGHILCGBDHFLI",
  /* 129 */ "BCDFGHIKCGBDHFIK",
  /* 130 */ "BCDFGHIJHGBCJFDI",
  /* 131 */ "BCDEIJKLEJBCIDLK",
  /* 132 */ "BCDEHJKLEJBCHDLK",
  /* 133 */ "BCDEHIKLEIBCHDLK",
  /* 134 */ "BCDEHIJLEJBCHDLI",
  /* 135 */ "BCDEHIJKEJBCHDIK",
  /* 136 */ "BCDEGJKLEGBCJDLK",
  /* 137 */ "BCDEGIKLEGBCIDLK",
  /* 138 */ "BCDEGIJLEGBCJDLI",
  /* 139 */ "BCDEGIJKEGBCJDIK",
  /* 140 */ "BCDEGHKLEGBCHDLK",
  /* 141 */ "BCDEGHJLHGBCJDLE",
  /* 142 */ "BCDEGHJKHGBCJDEK",
  /* 143 */ "BCDEGHILEGBCHDLI",
  /* 144 */ "BCDEGHIKEGBCHDIK",
  /* 145 */ "BCDEGHIJHGBCJDEI",
  /* 146 */ "BCDEFJKLCJBDEFLK",
  /* 147 */ "BCDEFIKLCEBDIFLK",
  /* 148 */ "BCDEFIJLCJBDEFLI",
  /* 149 */ "BCDEFIJKCJBDEFIK",
  /* 150 */ "BCDEFHKLCEBDHFLK",
  /* 151 */ "BCDEFHJLCJBDHFLE",
  /* 152 */ "BCDEFHJKCJBDHFEK",
  /* 153 */ "BCDEFHILCEBDHFLI",
  /* 154 */ "BCDEFHIKCEBDHFIK",
  /* 155 */ "BCDEFHIJCJBDHFEI",
  /* 156 */ "BCDEFGKLCGBDEFLK",
  /* 157 */ "BCDEFGJLCGBDJFLE",
  /* 158 */ "BCDEFGJKCGBDJFEK",
  /* 159 */ "BCDEFGILCGBDEFLI",
  /* 160 */ "BCDEFGIKCGBDEFIK",
  /* 161 */ "BCDEFGIJCGBDJFEI",
  /* 162 */ "BCDEFGHLCGBDHFLE",
  /* 163 */ "BCDEFGHKCGBDHFEK",
  /* 164 */ "BCDEFGHJHGBCJFDE",
  /* 165 */ "BCDEFGHICGBDHFEI",
  /* 166 */ "AFGHIJKLHJIFAGLK",
  /* 167 */ "AEGHIJKLEJIAHGLK",
  /* 168 */ "AEFHIJKLEJIFAHLK",
  /* 169 */ "AEFGIJKLEJIFAGLK",
  /* 170 */ "AEFGHJKLEGJFAHLK",
  /* 171 */ "AEFGHIKLEGIFAHLK",
  /* 172 */ "AEFGHIJLEGJFAHLI",
  /* 173 */ "AEFGHIJKEGJFAHIK",
  /* 174 */ "ADGHIJKLHJIDAGLK",
  /* 175 */ "ADFHIJKLHJIDAFLK",
  /* 176 */ "ADFGIJKLIGJDAFLK",
  /* 177 */ "ADFGHJKLHGJDAFLK",
  /* 178 */ "ADFGHIKLHGIDAFLK",
  /* 179 */ "ADFGHIJLHGJDAFLI",
  /* 180 */ "ADFGHIJKHGJDAFIK",
  /* 181 */ "ADEHIJKLEJIDAHLK",
  /* 182 */ "ADEGIJKLEJIDAGLK",
  /* 183 */ "ADEGHJKLEGJDAHLK",
  /* 184 */ "ADEGHIKLEGIDAHLK",
  /* 185 */ "ADEGHIJLEGJDAHLI",
  /* 186 */ "ADEGHIJKEGJDAHIK",
  /* 187 */ "ADEFIJKLEJIDAFLK",
  /* 188 */ "ADEFHJKLHJEDAFLK",
  /* 189 */ "ADEFHIKLHEIDAFLK",
  /* 190 */ "ADEFHIJLHJEDAFLI",
  /* 191 */ "ADEFHIJKHJEDAFIK",
  /* 192 */ "ADEFGJKLEGJDAFLK",
  /* 193 */ "ADEFGIKLEGIDAFLK",
  /* 194 */ "ADEFGIJLEGJDAFLI",
  /* 195 */ "ADEFGIJKEGJDAFIK",
  /* 196 */ "ADEFGHKLHGEDAFLK",
  /* 197 */ "ADEFGHJLHGJDAFLE",
  /* 198 */ "ADEFGHJKHGJDAFEK",
  /* 199 */ "ADEFGHILHGEDAFLI",
  /* 200 */ "ADEFGHIKHGEDAFIK",
  /* 201 */ "ADEFGHIJHGJDAFEI",
  /* 202 */ "ACGHIJKLHJICAGLK",
  /* 203 */ "ACFHIJKLHJICAFLK",
  /* 204 */ "ACFGIJKLIGJCAFLK",
  /* 205 */ "ACFGHJKLHGJCAFLK",
  /* 206 */ "ACFGHIKLHGICAFLK",
  /* 207 */ "ACFGHIJLHGJCAFLI",
  /* 208 */ "ACFGHIJKHGJCAFIK",
  /* 209 */ "ACEHIJKLEJICAHLK",
  /* 210 */ "ACEGIJKLEJICAGLK",
  /* 211 */ "ACEGHJKLEGJCAHLK",
  /* 212 */ "ACEGHIKLEGICAHLK",
  /* 213 */ "ACEGHIJLEGJCAHLI",
  /* 214 */ "ACEGHIJKEGJCAHIK",
  /* 215 */ "ACEFIJKLEJICAFLK",
  /* 216 */ "ACEFHJKLHJECAFLK",
  /* 217 */ "ACEFHIKLHEICAFLK",
  /* 218 */ "ACEFHIJLHJECAFLI",
  /* 219 */ "ACEFHIJKHJECAFIK",
  /* 220 */ "ACEFGJKLEGJCAFLK",
  /* 221 */ "ACEFGIKLEGICAFLK",
  /* 222 */ "ACEFGIJLEGJCAFLI",
  /* 223 */ "ACEFGIJKEGJCAFIK",
  /* 224 */ "ACEFGHKLHGECAFLK",
  /* 225 */ "ACEFGHJLHGJCAFLE",
  /* 226 */ "ACEFGHJKHGJCAFEK",
  /* 227 */ "ACEFGHILHGECAFLI",
  /* 228 */ "ACEFGHIKHGECAFIK",
  /* 229 */ "ACEFGHIJHGJCAFEI",
  /* 230 */ "ACDHIJKLHJICADLK",
  /* 231 */ "ACDGIJKLIGJCADLK",
  /* 232 */ "ACDGHJKLHGJCADLK",
  /* 233 */ "ACDGHIKLHGICADLK",
  /* 234 */ "ACDGHIJLHGJCADLI",
  /* 235 */ "ACDGHIJKHGJCADIK",
  /* 236 */ "ACDFIJKLCJIDAFLK",
  /* 237 */ "ACDFHJKLHJFCADLK",
  /* 238 */ "ACDFHIKLHFICADLK",
  /* 239 */ "ACDFHIJLHJFCADLI",
  /* 240 */ "ACDFHIJKHJFCADIK",
  /* 241 */ "ACDFGJKLCGJDAFLK",
  /* 242 */ "ACDFGIKLCGIDAFLK",
  /* 243 */ "ACDFGIJLCGJDAFLI",
  /* 244 */ "ACDFGIJKCGJDAFIK",
  /* 245 */ "ACDFGHKLHGFCADLK",
  /* 246 */ "ACDFGHJLCGJDAFLH",
  /* 247 */ "ACDFGHJKHGJCAFDK",
  /* 248 */ "ACDFGHILHGFCADLI",
  /* 249 */ "ACDFGHIKHGFCADIK",
  /* 250 */ "ACDFGHIJHGJCAFDI",
  /* 251 */ "ACDEIJKLEJICADLK",
  /* 252 */ "ACDEHJKLHJECADLK",
  /* 253 */ "ACDEHIKLHEICADLK",
  /* 254 */ "ACDEHIJLHJECADLI",
  /* 255 */ "ACDEHIJKHJECADIK",
  /* 256 */ "ACDEGJKLEGJCADLK",
  /* 257 */ "ACDEGIKLEGICADLK",
  /* 258 */ "ACDEGIJLEGJCADLI",
  /* 259 */ "ACDEGIJKEGJCADIK",
  /* 260 */ "ACDEGHKLHGECADLK",
  /* 261 */ "ACDEGHJLHGJCADLE",
  /* 262 */ "ACDEGHJKHGJCADEK",
  /* 263 */ "ACDEGHILHGECADLI",
  /* 264 */ "ACDEGHIKHGECADIK",
  /* 265 */ "ACDEGHIJHGJCADEI",
  /* 266 */ "ACDEFJKLCJEDAFLK",
  /* 267 */ "ACDEFIKLCEIDAFLK",
  /* 268 */ "ACDEFIJLCJEDAFLI",
  /* 269 */ "ACDEFIJKCJEDAFIK",
  /* 270 */ "ACDEFHKLHEFCADLK",
  /* 271 */ "ACDEFHJLHJFCADLE",
  /* 272 */ "ACDEFHJKHJECAFDK",
  /* 273 */ "ACDEFHILHEFCADLI",
  /* 274 */ "ACDEFHIKHEFCADIK",
  /* 275 */ "ACDEFHIJHJECAFDI",
  /* 276 */ "ACDEFGKLCGEDAFLK",
  /* 277 */ "ACDEFGJLCGJDAFLE",
  /* 278 */ "ACDEFGJKCGJDAFEK",
  /* 279 */ "ACDEFGILCGEDAFLI",
  /* 280 */ "ACDEFGIKCGEDAFIK",
  /* 281 */ "ACDEFGIJCGJDAFEI",
  /* 282 */ "ACDEFGHLHGFCADLE",
  /* 283 */ "ACDEFGHKHGECAFDK",
  /* 284 */ "ACDEFGHJHGJCAFDE",
  /* 285 */ "ACDEFGHIHGECAFDI",
  /* 286 */ "ABGHIJKLHJBAIGLK",
  /* 287 */ "ABFHIJKLHJBAIFLK",
  /* 288 */ "ABFGIJKLIJBFAGLK",
  /* 289 */ "ABFGHJKLHJBFAGLK",
  /* 290 */ "ABFGHIKLHGBAIFLK",
  /* 291 */ "ABFGHIJLHJBFAGLI",
  /* 292 */ "ABFGHIJKHJBFAGIK",
  /* 293 */ "ABEHIJKLEJBAIHLK",
  /* 294 */ "ABEGIJKLEJBAIGLK",
  /* 295 */ "ABEGHJKLEJBAHGLK",
  /* 296 */ "ABEGHIKLEGBAIHLK",
  /* 297 */ "ABEGHIJLEJBAHGLI",
  /* 298 */ "ABEGHIJKEJBAHGIK",
  /* 299 */ "ABEFIJKLEJBAIFLK",
  /* 300 */ "ABEFHJKLEJBFAHLK",
  /* 301 */ "ABEFHIKLEIBFAHLK",
  /* 302 */ "ABEFHIJLEJBFAHLI",
  /* 303 */ "ABEFHIJKEJBFAHIK",
  /* 304 */ "ABEFGJKLEJBFAGLK",
  /* 305 */ "ABEFGIKLEGBAIFLK",
  /* 306 */ "ABEFGIJLEJBFAGLI",
  /* 307 */ "ABEFGIJKEJBFAGIK",
  /* 308 */ "ABEFGHKLEGBFAHLK",
  /* 309 */ "ABEFGHJLHJBFAGLE",
  /* 310 */ "ABEFGHJKHJBFAGEK",
  /* 311 */ "ABEFGHILEGBFAHLI",
  /* 312 */ "ABEFGHIKEGBFAHIK",
  /* 313 */ "ABEFGHIJHJBFAGEI",
  /* 314 */ "ABDHIJKLIJBDAHLK",
  /* 315 */ "ABDGIJKLIJBDAGLK",
  /* 316 */ "ABDGHJKLHJBDAGLK",
  /* 317 */ "ABDGHIKLIGBDAHLK",
  /* 318 */ "ABDGHIJLHJBDAGLI",
  /* 319 */ "ABDGHIJKHJBDAGIK",
  /* 320 */ "ABDFIJKLIJBDAFLK",
  /* 321 */ "ABDFHJKLHJBDAFLK",
  /* 322 */ "ABDFHIKLHIBDAFLK",
  /* 323 */ "ABDFHIJLHJBDAFLI",
  /* 324 */ "ABDFHIJKHJBDAFIK",
  /* 325 */ "ABDFGJKLFJBDAGLK",
  /* 326 */ "ABDFGIKLIGBDAFLK",
  /* 327 */ "ABDFGIJLFJBDAGLI",
  /* 328 */ "ABDFGIJKFJBDAGIK",
  /* 329 */ "ABDFGHKLHGBDAFLK",
  /* 330 */ "ABDFGHJLHGBDAFLJ",
  /* 331 */ "ABDFGHJKHGBDAFJK",
  /* 332 */ "ABDFGHILHGBDAFLI",
  /* 333 */ "ABDFGHIKHGBDAFIK",
  /* 334 */ "ABDFGHIJHGBDAFIJ",
  /* 335 */ "ABDEIJKLEJBAIDLK",
  /* 336 */ "ABDEHJKLEJBDAHLK",
  /* 337 */ "ABDEHIKLEIBDAHLK",
  /* 338 */ "ABDEHIJLEJBDAHLI",
  /* 339 */ "ABDEHIJKEJBDAHIK",
  /* 340 */ "ABDEGJKLEJBDAGLK",
  /* 341 */ "ABDEGIKLEGBAIDLK",
  /* 342 */ "ABDEGIJLEJBDAGLI",
  /* 343 */ "ABDEGIJKEJBDAGIK",
  /* 344 */ "ABDEGHKLEGBDAHLK",
  /* 345 */ "ABDEGHJLHJBDAGLE",
  /* 346 */ "ABDEGHJKHJBDAGEK",
  /* 347 */ "ABDEGHILEGBDAHLI",
  /* 348 */ "ABDEGHIKEGBDAHIK",
  /* 349 */ "ABDEGHIJHJBDAGEI",
  /* 350 */ "ABDEFJKLEJBDAFLK",
  /* 351 */ "ABDEFIKLEIBDAFLK",
  /* 352 */ "ABDEFIJLEJBDAFLI",
  /* 353 */ "ABDEFIJKEJBDAFIK",
  /* 354 */ "ABDEFHKLHEBDAFLK",
  /* 355 */ "ABDEFHJLHJBDAFLE",
  /* 356 */ "ABDEFHJKHJBDAFEK",
  /* 357 */ "ABDEFHILHEBDAFLI",
  /* 358 */ "ABDEFHIKHEBDAFIK",
  /* 359 */ "ABDEFHIJHJBDAFEI",
  /* 360 */ "ABDEFGKLEGBDAFLK",
  /* 361 */ "ABDEFGJLEGBDAFLJ",
  /* 362 */ "ABDEFGJKEGBDAFJK",
  /* 363 */ "ABDEFGILEGBDAFLI",
  /* 364 */ "ABDEFGIKEGBDAFIK",
  /* 365 */ "ABDEFGIJEGBDAFIJ",
  /* 366 */ "ABDEFGHLHGBDAFLE",
  /* 367 */ "ABDEFGHKHGBDAFEK",
  /* 368 */ "ABDEFGHJHGBDAFEJ",
  /* 369 */ "ABDEFGHIHGBDAFEI",
  /* 370 */ "ABCHIJKLIJBCAHLK",
  /* 371 */ "ABCGIJKLIJBCAGLK",
  /* 372 */ "ABCGHJKLHJBCAGLK",
  /* 373 */ "ABCGHIKLIGBCAHLK",
  /* 374 */ "ABCGHIJLHJBCAGLI",
  /* 375 */ "ABCGHIJKHJBCAGIK",
  /* 376 */ "ABCFIJKLIJBCAFLK",
  /* 377 */ "ABCFHJKLHJBCAFLK",
  /* 378 */ "ABCFHIKLHIBCAFLK",
  /* 379 */ "ABCFHIJLHJBCAFLI",
  /* 380 */ "ABCFHIJKHJBCAFIK",
  /* 381 */ "ABCFGJKLCJBFAGLK",
  /* 382 */ "ABCFGIKLIGBCAFLK",
  /* 383 */ "ABCFGIJLCJBFAGLI",
  /* 384 */ "ABCFGIJKCJBFAGIK",
  /* 385 */ "ABCFGHKLHGBCAFLK",
  /* 386 */ "ABCFGHJLHGBCAFLJ",
  /* 387 */ "ABCFGHJKHGBCAFJK",
  /* 388 */ "ABCFGHILHGBCAFLI",
  /* 389 */ "ABCFGHIKHGBCAFIK",
  /* 390 */ "ABCFGHIJHGBCAFIJ",
  /* 391 */ "ABCEIJKLEJBAICLK",
  /* 392 */ "ABCEHJKLEJBCAHLK",
  /* 393 */ "ABCEHIKLEIBCAHLK",
  /* 394 */ "ABCEHIJLEJBCAHLI",
  /* 395 */ "ABCEHIJKEJBCAHIK",
  /* 396 */ "ABCEGJKLEJBCAGLK",
  /* 397 */ "ABCEGIKLEGBAICLK",
  /* 398 */ "ABCEGIJLEJBCAGLI",
  /* 399 */ "ABCEGIJKEJBCAGIK",
  /* 400 */ "ABCEGHKLEGBCAHLK",
  /* 401 */ "ABCEGHJLHJBCAGLE",
  /* 402 */ "ABCEGHJKHJBCAGEK",
  /* 403 */ "ABCEGHILEGBCAHLI",
  /* 404 */ "ABCEGHIKEGBCAHIK",
  /* 405 */ "ABCEGHIJHJBCAGEI",
  /* 406 */ "ABCEFJKLEJBCAFLK",
  /* 407 */ "ABCEFIKLEIBCAFLK",
  /* 408 */ "ABCEFIJLEJBCAFLI",
  /* 409 */ "ABCEFIJKEJBCAFIK",
  /* 410 */ "ABCEFHKLHEBCAFLK",
  /* 411 */ "ABCEFHJLHJBCAFLE",
  /* 412 */ "ABCEFHJKHJBCAFEK",
  /* 413 */ "ABCEFHILHEBCAFLI",
  /* 414 */ "ABCEFHIKHEBCAFIK",
  /* 415 */ "ABCEFHIJHJBCAFEI",
  /* 416 */ "ABCEFGKLEGBCAFLK",
  /* 417 */ "ABCEFGJLEGBCAFLJ",
  /* 418 */ "ABCEFGJKEGBCAFJK",
  /* 419 */ "ABCEFGILEGBCAFLI",
  /* 420 */ "ABCEFGIKEGBCAFIK",
  /* 421 */ "ABCEFGIJEGBCAFIJ",
  /* 422 */ "ABCEFGHLHGBCAFLE",
  /* 423 */ "ABCEFGHKHGBCAFEK",
  /* 424 */ "ABCEFGHJHGBCAFEJ",
  /* 425 */ "ABCEFGHIHGBCAFEI",
  /* 426 */ "ABCDIJKLIJBCADLK",
  /* 427 */ "ABCDHJKLHJBCADLK",
  /* 428 */ "ABCDHIKLHIBCADLK",
  /* 429 */ "ABCDHIJLHJBCADLI",
  /* 430 */ "ABCDHIJKHJBCADIK",
  /* 431 */ "ABCDGJKLCJBDAGLK",
  /* 432 */ "ABCDGIKLIGBCADLK",
  /* 433 */ "ABCDGIJLCJBDAGLI",
  /* 434 */ "ABCDGIJKCJBDAGIK",
  /* 435 */ "ABCDGHKLHGBCADLK",
  /* 436 */ "ABCDGHJLHGBCADLJ",
  /* 437 */ "ABCDGHJKHGBCADJK",
  /* 438 */ "ABCDGHILHGBCADLI",
  /* 439 */ "ABCDGHIKHGBCADIK",
  /* 440 */ "ABCDGHIJHGBCADIJ",
  /* 441 */ "ABCDFJKLCJBDAFLK",
  /* 442 */ "ABCDFIKLCIBDAFLK",
  /* 443 */ "ABCDFIJLCJBDAFLI",
  /* 444 */ "ABCDFIJKCJBDAFIK",
  /* 445 */ "ABCDFHKLHFBCADLK",
  /* 446 */ "ABCDFHJLCJBDAFLH",
  /* 447 */ "ABCDFHJKHJBCAFDK",
  /* 448 */ "ABCDFHILHFBCADLI",
  /* 449 */ "ABCDFHIKHFBCADIK",
  /* 450 */ "ABCDFHIJHJBCAFDI",
  /* 451 */ "ABCDFGKLCGBDAFLK",
  /* 452 */ "ABCDFGJLCGBDAFLJ",
  /* 453 */ "ABCDFGJKCGBDAFJK",
  /* 454 */ "ABCDFGILCGBDAFLI",
  /* 455 */ "ABCDFGIKCGBDAFIK",
  /* 456 */ "ABCDFGIJCGBDAFIJ",
  /* 457 */ "ABCDFGHLCGBDAFLH",
  /* 458 */ "ABCDFGHKHGBCAFDK",
  /* 459 */ "ABCDFGHJHGBCAFDJ",
  /* 460 */ "ABCDFGHIHGBCAFDI",
  /* 461 */ "ABCDEJKLEJBCADLK",
  /* 462 */ "ABCDEIKLEIBCADLK",
  /* 463 */ "ABCDEIJLEJBCADLI",
  /* 464 */ "ABCDEIJKEJBCADIK",
  /* 465 */ "ABCDEHKLHEBCADLK",
  /* 466 */ "ABCDEHJLHJBCADLE",
  /* 467 */ "ABCDEHJKHJBCADEK",
  /* 468 */ "ABCDEHILHEBCADLI",
  /* 469 */ "ABCDEHIKHEBCADIK",
  /* 470 */ "ABCDEHIJHJBCADEI",
  /* 471 */ "ABCDEGKLEGBCADLK",
  /* 472 */ "ABCDEGJLEGBCADLJ",
  /* 473 */ "ABCDEGJKEGBCADJK",
  /* 474 */ "ABCDEGILEGBCADLI",
  /* 475 */ "ABCDEGIKEGBCADIK",
  /* 476 */ "ABCDEGIJEGBCADIJ",
  /* 477 */ "ABCDEGHLHGBCADLE",
  /* 478 */ "ABCDEGHKHGBCADEK",
  /* 479 */ "ABCDEGHJHGBCADEJ",
  /* 480 */ "ABCDEGHIHGBCADEI",
  /* 481 */ "ABCDEFKLCEBDAFLK",
  /* 482 */ "ABCDEFJLCJBDAFLE",
  /* 483 */ "ABCDEFJKCJBDAFEK",
  /* 484 */ "ABCDEFILCEBDAFLI",
  /* 485 */ "ABCDEFIKCEBDAFIK",
  /* 486 */ "ABCDEFIJCJBDAFEI",
  /* 487 */ "ABCDEFHLHFBCADLE",
  /* 488 */ "ABCDEFHKHEBCAFDK",
  /* 489 */ "ABCDEFHJHJBCAFDE",
  /* 490 */ "ABCDEFHIHEBCAFDI",
  /* 491 */ "ABCDEFGLCGBDAFLE",
  /* 492 */ "ABCDEFGKCGBDAFEK",
  /* 493 */ "ABCDEFGJCGBDAFEJ",
  /* 494 */ "ABCDEFGICGBDAFEI",
  /* 495 */ "ABCDEFGHHGBCAFDE",
];

/**
 * Mapeia um conjunto de 8 grupos (de A-L, escolhendo 8) para a entrada
 * correspondente do Annex C. Retorna a alocação: Map de matchNumber → grupo do 3º.
 *
 * Lança erro se o conjunto não tem exatamente 8 grupos ou se a combinação
 * não for encontrada (não deveria acontecer; C(12,8) = 495 cobre todas).
 */
export function lookupAnnexC(gruposDeTerceiros: Grupo[]): Map<number, Grupo> {
  if (gruposDeTerceiros.length !== 8) {
    throw new Error(`Annex C espera 8 grupos, recebeu ${gruposDeTerceiros.length}`);
  }
  const chave = [...gruposDeTerceiros].sort().join("");
  // Busca linear nas 495 entradas (rápido o bastante: ~thousand ns na pior hipótese)
  for (const linha of FIFA_ANNEX_C) {
    if (linha.startsWith(chave)) {
      const alocacao = linha.slice(8); // 8 caracteres restantes
      const resultado = new Map<number, Grupo>();
      for (let i = 0; i < 8; i++) {
        resultado.set(ANNEX_C_MATCH_ORDER[i], alocacao[i] as Grupo);
      }
      return resultado;
    }
  }
  throw new Error(`Combinação não encontrada no Annex C: ${chave}`);
}

// ────────────────────────────────────────────────────────────────────────
// Resolução do bracket (substitui o algoritmo guloso antigo)
// ────────────────────────────────────────────────────────────────────────

/**
 * Resolve uma posição abstrata (1A, 2C, 3ABCDF) em um time concreto,
 * dado os times classificados e o mapa de alocação dos 3os (Annex C).
 *
 * Retorna null se o time ainda não foi definido (group stage incompleto).
 */
function resolverSlot(
  slot: SlotPosicao,
  matchNumber: number,
  primeiros: Map<Grupo, StatsTime>,
  segundos: Map<Grupo, StatsTime>,
  terceirosPorGrupo: Map<Grupo, StatsTime>,
  alocacaoAnnexC: Map<number, Grupo> | null,
): StatsTime | null {
  if (slot.tipo === "1") return primeiros.get(slot.grupo) ?? null;
  if (slot.tipo === "2") return segundos.get(slot.grupo) ?? null;
  // tipo === "3": consulta a matriz FIFA pra saber qual grupo vai neste match
  if (!alocacaoAnnexC) return null;
  const grupoEscolhido = alocacaoAnnexC.get(matchNumber);
  if (!grupoEscolhido) return null;
  return terceirosPorGrupo.get(grupoEscolhido) ?? null;
}

export type ParR32Resolvido = ParR32 & {
  casaTime: StatsTime | null;
  foraTime: StatsTime | null;
  /**
   * Posição (1-8) do 3º colocado alocado ao slot CASA, no ranking dos 8
   * melhores 3os. Só preenchido quando o slot casa é do tipo "3" e o 3º
   * foi resolvido; caso contrário, null.
   */
  casaOrigemTerceiro: number | null;
  /** Idem para o slot FORA. */
  foraOrigemTerceiro: number | null;
};

/**
 * Resolve o bracket completo do R32 a partir dos resultados da fase de grupos.
 *
 * Algoritmo:
 *  1. Calcula classificação dos 12 grupos
 *  2. Pega os 8 melhores 3os
 *  3. Identifica de quais 8 grupos eles vêm
 *  4. Faz lookup no Annex C pra mapear cada match → grupo do 3º
 *  5. Resolve cada slot do bracket
 *
 * Se a fase de grupos ainda não está completa (algum 1º/2º/3º não
 * pode ser determinado), retorna alocações parciais (com `null` nos
 * slots não-resolvíveis).
 */
export function resolverBracketR32(
  jogos: JogoFinalizado[],
  rankingFifa?: Map<string, number>,
): ParR32Resolvido[] {
  const c = classificadosParaMataMata(jogos, rankingFifa);
  const primeiros = new Map(c.primeiros.map((t) => [t.grupo, t]));
  const segundos = new Map(c.segundos.map((t) => [t.grupo, t]));
  const terceirosPorGrupo = new Map(c.terceirosClassificados.map((t) => [t.grupo, t]));

  // Posição (1-8) de cada 3º classificado, por grupo, no ranking dos melhores 3os.
  // c.terceirosClassificados já vem ordenado (1º melhor → 8º melhor).
  const posicaoTerceiroPorGrupo = new Map<Grupo, number>();
  c.terceirosClassificados.forEach((t, i) => posicaoTerceiroPorGrupo.set(t.grupo, i + 1));

  // Só faz lookup se temos exatamente 8 terceiros classificados
  let alocacaoAnnexC: Map<number, Grupo> | null = null;
  if (c.terceirosClassificados.length === 8) {
    const grupos = c.terceirosClassificados.map((t) => t.grupo);
    try {
      alocacaoAnnexC = lookupAnnexC(grupos);
    } catch {
      alocacaoAnnexC = null; // fallback: deixa slots como null
    }
  }

  function origemTerceiro(slot: SlotPosicao, time: StatsTime | null): number | null {
    if (slot.tipo !== "3" || !time) return null;
    return posicaoTerceiroPorGrupo.get(time.grupo) ?? null;
  }

  const resultado: ParR32Resolvido[] = [];
  for (const par of R32_PARES) {
    const casaTime = resolverSlot(par.casa, par.matchNumber, primeiros, segundos, terceirosPorGrupo, alocacaoAnnexC);
    const foraTime = resolverSlot(par.fora, par.matchNumber, primeiros, segundos, terceirosPorGrupo, alocacaoAnnexC);
    resultado.push({
      ...par,
      casaTime,
      foraTime,
      casaOrigemTerceiro: origemTerceiro(par.casa, casaTime),
      foraOrigemTerceiro: origemTerceiro(par.fora, foraTime),
    });
  }
  return resultado;
}

/** Label legível pra uma posição abstrata (1A, 2C, 3ABCDF). */
export function labelPosicao(slot: SlotPosicao): string {
  if (slot.tipo === "1") return `1º ${slot.grupo}`;
  if (slot.tipo === "2") return `2º ${slot.grupo}`;
  return `3º (${slot.grupos.join("/")})`;
}

/**
 * Label de origem de um 3º colocado pela sua posição (1-8) no ranking
 * dos 8 melhores 3os. Ex.: ORIGEM_TERCEIRO_LABEL(5) === "5º melhor 3º".
 */
export function ORIGEM_TERCEIRO_LABEL(posicao: number): string {
  return `${posicao}º melhor 3º`;
}

// ────────────────────────────────────────────────────────────────────────
// Detecção de empate total entre 3os colocados
// ────────────────────────────────────────────────────────────────────────

export type EmpateTerceiros = {
  /** Quantas seleções estão empatadas em (pontos, saldo, gols pró). */
  quantidade: number;
  /** Grupos das seleções empatadas (ex.: ["C", "J", "L"]). */
  nomesGrupos: string[];
};

/**
 * Detecta empate "relevante" entre 3os colocados — quando 2+ seleções têm
 * exatamente os mesmos (pontos, saldo, gols pró) E esse empate cai na faixa
 * que decide a 8ª vaga (posições 6ª–10ª do ranking de 3os). Nesses casos o
 * tiebreaker alfabético (usado pelo bolão) pode mudar quem entra ou a ordem,
 * então mostramos um aviso ao usuário.
 *
 * Retorna null quando não há empate relevante.
 *
 * Observação: depende de `classificadosParaMataMata` retornar os 12 terceiros
 * (8 classificados + 4 eliminados) já ordenados pela mesma cascata. Caso a
 * função só exponha os 8 classificados + os eliminados separadamente, usamos
 * a concatenação [classificados, eliminados] preservando a ordem.
 */
export function detectarEmpateTerceiros(
  jogos: JogoFinalizado[],
  rankingFifa?: Map<string, number>,
): EmpateTerceiros | null {
  const c = classificadosParaMataMata(jogos, rankingFifa);
  const todosTerceiros: StatsTime[] = [
    ...c.terceirosClassificados,
    ...c.terceirosEliminados,
  ];
  // Precisa ter os 12 terceiros pra avaliar o corte da 8ª vaga.
  if (todosTerceiros.length < 9) return null;

  // Agrupa por chave (pontos, saldo, gols pró).
  const chave = (t: StatsTime) => `${t.pontos}|${t.saldo}|${t.gols_pro}`;

  // Faixa que decide a 8ª vaga: posições 6ª a 10ª (índices 5..9).
  const faixaInicio = 5;
  const faixaFim = Math.min(9, todosTerceiros.length - 1);

  // Para cada grupo de empate que toque a faixa de corte, reporta.
  const gruposDeEmpate = new Map<string, StatsTime[]>();
  for (let i = 0; i < todosTerceiros.length; i++) {
    const k = chave(todosTerceiros[i]);
    const arr = gruposDeEmpate.get(k) ?? [];
    arr.push(todosTerceiros[i]);
    gruposDeEmpate.set(k, arr);
  }

  for (const [, grupo] of gruposDeEmpate) {
    if (grupo.length < 2) continue;
    // Esse grupo de empate toca a faixa de corte?
    const indices = grupo.map((t) => todosTerceiros.indexOf(t));
    const tocaCorte = indices.some((idx) => idx >= faixaInicio && idx <= faixaFim);
    if (tocaCorte) {
      return {
        quantidade: grupo.length,
        nomesGrupos: grupo.map((t) => t.grupo),
      };
    }
  }

  return null;
}
