# Fix do Mata-Mata (R32) — Bolão da AutoManagem

## Contexto

O chaveamento do mata-mata (a partir do Round of 32, que chamamos de "16 avos") está com **dois bugs estruturais** que precisam ser corrigidos juntos:

1. **Alocação dos 8 melhores 3ºs colocados está errada.** O código atual (`src/lib/bracket-2026.ts`) usa um algoritmo guloso que percorre os pares e pega "o primeiro 3º válido". Isso diverge da FIFA, que publica uma **matriz pré-computada de 495 combinações** (Annex C do regulamento) determinando exatamente qual 3º vai em qual jogo. Em vários cenários o guloso aloca o 3º no jogo errado e, em alguns, deixa uma vaga sem time (placeholder "3º (X/Y/Z)").

2. **A árvore de avanço do bracket (R16 → quartas → semi → final) está pareada errada.** O `bracket-view.tsx` agrupa pares "adjacentes no array" em vez de seguir a estrutura oficial FIFA (Jogo 89 = vencedor 73 × vencedor 74, etc). Isso faz, por exemplo, "México × Equador" cair contra o vencedor do jogo errado nas oitavas.

Vamos corrigir os dois, ajustar a UI (remover a visão "Por fase", manter só o bracket), adicionar labels (origem dos times no R32 + código dos jogos), avisar quando houver empate total entre 3ºs, e limpar os palpites de mata-mata existentes (são todos de teste).

**IMPORTANTE — não alterar a lógica de pontuação.** A pontuação continua "flat": o usuário ganha pontos se palpitou que um time chega a uma fase e o time real chegou (pelo menos) àquela fase, independente do caminho/adversário. O schema de `palpites_mata` (`{user_id, time_id, fase}`) permanece igual. Só mexemos na montagem visual do bracket e na alocação dos 3ºs.

---

## Tarefa 1 — Substituir `src/lib/bracket-2026.ts`

Substituir **todo** o conteúdo do arquivo `src/lib/bracket-2026.ts` pelo conteúdo abaixo. Este arquivo:

- Mantém a API pública usada pelo resto do código: `R32_PARES`, `resolverBracketR32(jogos)`, `labelPosicao(slot)`, e os tipos `SlotPosicao`, `ParR32`, `ParR32Resolvido`.
- **Adiciona** o campo `matchNumber` (73-88) em cada par de `R32_PARES`.
- **Adiciona** a matriz oficial das 495 combinações (`FIFA_ANNEX_C`) e a função `lookupAnnexC(grupos)`.
- **Substitui** o algoritmo guloso pela consulta à matriz.
- **Adiciona** a função `detectarEmpateTerceiros(jogos)` (usada na Tarefa 4 para o aviso de empate).

> O conteúdo completo do arquivo está no anexo `bracket-2026.ts` que acompanha este prompt. Cole-o **inteiro** no lugar do arquivo atual. (Ele já foi validado: as 495 combinações cobrem todos os C(12,8), cada alocação respeita os 5 grupos permitidos por slot, e nenhum 3º cai contra o 1º do próprio grupo.)

Após colar, confirme que estes símbolos continuam exportados (outros arquivos importam): `R32_PARES`, `resolverBracketR32`, `labelPosicao`, `ParR32Resolvido`, `SlotPosicao`, `ParR32`. **Adicione** às exportações: `lookupAnnexC`, `detectarEmpateTerceiros`, `EmpateTerceiros`, `ORIGEM_TERCEIRO_LABEL` (todos definidos no anexo).

---

## Tarefa 2 — Criar `src/lib/mata-mata-estrutura.ts` (estrutura de avanço)

Criar um novo arquivo `src/lib/mata-mata-estrutura.ts` que define a árvore oficial de pareamento do mata-mata, do R32 até a final. Isso substitui a lógica de "agrupar pares adjacentes" do `bracket-view.tsx`.

```ts
/**
 * Estrutura oficial de avanço do mata-mata da Copa 2026.
 *
 * Cada partida do mata-mata (jogos 73 a 104) tem um número FIFA fixo e,
 * a partir das oitavas, é definida pelos VENCEDORES de dois jogos anteriores.
 *
 * Fonte: tabela oficial FIFA (Sky Sports / MLSSoccer / NBC Sports, mai/2026).
 *
 * Pareamento (confirmado):
 *   R32 (73-88): definidos por posição de grupo (ver R32_PARES em bracket-2026.ts)
 *   R16 (89-96): 89=W73×W74  90=W75×W76  91=W77×W78  92=W79×W80
 *                93=W81×W82  94=W83×W84  95=W85×W86  96=W87×W88
 *   QF (97-100): 97=W89×W90  98=W93×W94  99=W91×W92  100=W95×W96
 *   SF (101-102): 101=W97×W98  102=W99×W100
 *   Final (104): W101×W102   (Jogo 103 = 3º lugar, NÃO usado no bolão)
 *
 * O lado ESQUERDO do bracket (estilo Copa, final ao centro) contém os
 * jogos cujo caminho leva à semfinal 101; o lado DIREITO leva à 102.
 *
 *   Lado esquerdo (R32):  73, 74, 75, 76, 77, 78, 79, 80
 *     → R16:  89 (73×74), 90 (75×76), 91 (77×78), 92 (79×80)
 *     → QF:   97 (89×90), 99 (91×92)
 *     → SF:   101 (97×99)
 *
 *   Lado direito (R32):   81, 82, 83, 84, 85, 86, 87, 88
 *     → R16:  93 (81×82), 94 (83×84), 95 (85×86), 96 (87×88)
 *     → QF:   98 (93×94), 100 (95×96)
 *     → SF:   102 (98×100)
 *
 * ATENÇÃO: o lado esquerdo emparelha QF como 97=89×90 e 99=91×92, e a SF
 * esquerda é 101=97×99. O lado direito: 98=93×94, 100=95×96, SF 102=98×100.
 */

export type FaseMata = "r32" | "r16" | "qf" | "sf" | "final";

export type NoMataMata = {
  jogo: number;            // número FIFA do jogo (73..104)
  fase: FaseMata;
  ladoEsquerdo: boolean;   // true = metade esquerda do bracket
  // Para r16/qf/sf/final: números dos jogos cujos vencedores se enfrentam.
  // Para r32: undefined (vem de R32_PARES).
  origemJogos?: [number, number];
};

/** Ordem de exibição vertical de cada lado (cima → baixo). */
export const R32_ESQUERDO_ORDEM = [73, 74, 75, 76, 77, 78, 79, 80] as const;
export const R32_DIREITO_ORDEM = [81, 82, 83, 84, 85, 86, 87, 88] as const;

export const R16: NoMataMata[] = [
  { jogo: 89, fase: "r16", ladoEsquerdo: true,  origemJogos: [73, 74] },
  { jogo: 90, fase: "r16", ladoEsquerdo: true,  origemJogos: [75, 76] },
  { jogo: 91, fase: "r16", ladoEsquerdo: true,  origemJogos: [77, 78] },
  { jogo: 92, fase: "r16", ladoEsquerdo: true,  origemJogos: [79, 80] },
  { jogo: 93, fase: "r16", ladoEsquerdo: false, origemJogos: [81, 82] },
  { jogo: 94, fase: "r16", ladoEsquerdo: false, origemJogos: [83, 84] },
  { jogo: 95, fase: "r16", ladoEsquerdo: false, origemJogos: [85, 86] },
  { jogo: 96, fase: "r16", ladoEsquerdo: false, origemJogos: [87, 88] },
];

export const QF: NoMataMata[] = [
  { jogo: 97,  fase: "qf", ladoEsquerdo: true,  origemJogos: [89, 90] },
  { jogo: 99,  fase: "qf", ladoEsquerdo: true,  origemJogos: [91, 92] },
  { jogo: 98,  fase: "qf", ladoEsquerdo: false, origemJogos: [93, 94] },
  { jogo: 100, fase: "qf", ladoEsquerdo: false, origemJogos: [95, 96] },
];

export const SF: NoMataMata[] = [
  { jogo: 101, fase: "sf", ladoEsquerdo: true,  origemJogos: [97, 99] },
  { jogo: 102, fase: "sf", ladoEsquerdo: false, origemJogos: [98, 100] },
];

export const FINAL: NoMataMata = { jogo: 104, fase: "final", ladoEsquerdo: true, origemJogos: [101, 102] };

/** Mapa jogo → label de fase legível (para o badge "Jogo NN"). */
export function labelJogo(jogo: number): string {
  if (jogo === 104) return "Final"; // a final NÃO mostra número
  return `Jogo ${jogo}`;
}
```

---

## Tarefa 3 — Reescrever `src/app/palpites/mata-mata/bracket-view.tsx`

O componente `BracketView` deve continuar com o **layout espelhado estilo Copa** (lado esquerdo → centro com a final → lado direito espelhado), mas com **três correções**:

### 3.1 — Pareamento correto via `mata-mata-estrutura.ts`

A montagem das fases seguintes NÃO pode mais usar `agruparEmPares`/`agruparPares` sobre os arrays. Em vez disso:

- Construa um índice `Map<number, ParR32Resolvido>` a partir de `r32`, usando `par.matchNumber` como chave. Assim você acessa cada jogo do R32 pelo número FIFA.
- Para renderizar o R32 do lado esquerdo, percorra `R32_ESQUERDO_ORDEM` (`[73,74,75,76,77,78,79,80]`) e busque cada par pelo `matchNumber`. Lado direito: `R32_DIREITO_ORDEM` (`[81..88]`).
- Para o R16, percorra `R16` (do novo arquivo) filtrando por `ladoEsquerdo`. Cada nó tem `origemJogos: [a, b]`. Os candidatos do confronto são os **vencedores** que o usuário escolheu (picks da fase "8avos") entre os times dos jogos `a` e `b`.
- Para QF, percorra `QF` filtrando por lado; candidatos = vencedores escolhidos na fase "quartas" entre os jogos de origem. Idem SF (`SF`, fase "semi") e Final (`FINAL`, fase "final").

Para resolver "quais times vêm do jogo X", crie uma função auxiliar que, dado o número de um jogo de qualquer fase, retorna os `time_id`s **dos vencedores escolhidos pelo usuário** naquele jogo. Recursão simples:

- Se o jogo é do R32 (73-88): retorne os `time_id`s de `casaTime`/`foraTime` desse par que estão nos picks de "8avos".
- Se o jogo é de fase superior: pegue `origemJogos`, resolva recursivamente os vencedores de cada jogo de origem, junte os candidatos, e filtre pelos picks da fase correspondente.

> Mantenha o comportamento atual de "mostra placeholder — quando o usuário ainda não escolheu vencedores suficientes". Hoje o slot vazio aparece com label "—"; manter assim.

### 3.2 — Labels (conforme combinado)

**No R32 (jogos 73-88):** cada slot mostra, além do nome do time, a **origem**:
- 1º colocado: `1º A`, `1º C`, etc. (já existe via `labelPosicao` para tipo "1"/"2")
- 2º colocado: `2º B`, etc.
- 3º colocado: em vez de `3º (C/E/F/H/I)`, mostrar **a posição do 3º no ranking dos 8 melhores** — `1º melhor 3º`, `2º melhor 3º`, … `8º melhor 3º`.

Para isso, o `resolverBracketR32` já ordena os 8 terceiros. Exponha essa ordem para a view: em cada `ParR32Resolvido` cujo slot seja do tipo "3", inclua qual a posição (1-8) do terceiro alocado. **Isso já está implementado no anexo `bracket-2026.ts`** — cada par resolvido com 3º traz `casaOrigemTerceiro` / `foraOrigemTerceiro` (número de 1 a 8) quando aplicável. Use `ORIGEM_TERCEIRO_LABEL(n)` (também no anexo) que retorna a string `"{n}º melhor 3º"`.

Regra de exibição do label de origem no R32:
- Slot tipo "1" → `labelPosicao` (ex.: `1º A`)
- Slot tipo "2" → `labelPosicao` (ex.: `2º B`)
- Slot tipo "3" → `ORIGEM_TERCEIRO_LABEL(par.casaOrigemTerceiro)` (ex.: `2º melhor 3º`). Se o terceiro ainda não foi resolvido (fase de grupos incompleta), caia no label antigo `labelPosicao` (`3º (C/E/F/H/I)`).

**Em todas as fases do mata-mata, mostrar o código do jogo** (badge pequeno no topo do card), usando `labelJogo(jogo)`:
- R32: `Jogo 73` … `Jogo 88`
- R16: `Jogo 89` … `Jogo 96`
- Quartas: `Jogo 97` … `Jogo 100`
- Semi: `Jogo 101`, `Jogo 102`
- **Final: somente "Final"**, sem número (a função `labelJogo(104)` já devolve `"Final"`).

Estética do badge: pequeno, discreto, em cima do card (ex.: `text-[10px] font-bold uppercase tracking-wider text-muted-foreground`), acima dos dois slots. No R32 esse badge conviverá com os labels de origem dos slots — manter visualmente limpo (badge no topo do card; origem como texto pequeno à direita do nome de cada time, como já é hoje).

### 3.3 — Manter o resto

- Centro do bracket (`CentroBracket`) com troféu + Final + campeão continua igual, mas o card da Final ganha o título "Final" (sem número) — já é o caso.
- Scroll horizontal, cores, confete, etc., tudo mantido.

---

## Tarefa 4 — Aviso de empate total entre 3ºs (no `page.tsx` + `mata-mata-form.tsx`)

Quando, pelos palpites de grupos do usuário, houver **empate total** (mesmos pontos, saldo de gols e gols pró) entre seleções na disputa pelas 8 vagas de 3º — de forma que o tiebreaker alfabético (atual) decida quem entra ou em que ordem —, mostrar um **banner amarelo** acima do bracket.

- A função `detectarEmpateTerceiros(jogos)` (no anexo `bracket-2026.ts`) retorna `null` quando não há empate relevante, ou um objeto `EmpateTerceiros { quantidade: number; nomesGrupos: string[] }` quando há. Ela considera empate relevante quando 2+ terceiros têm o **mesmo (pontos, saldo, gols pró)** e estão na faixa que afeta o corte/ordem dos 8 (ou seja, empatados entre si dentro das posições 6ª–10ª do ranking de 3ºs, que é onde a 8ª vaga é decidida).
- Em `src/app/palpites/mata-mata/page.tsx`, calcule o empate a partir de `jogosPalpitados` e passe para o form (`empateTerceiros`).
- Em `mata-mata-form.tsx`, se `empateTerceiros` não for nulo, renderizar o banner acima do bracket, com o texto **dinâmico**:

> ⚠️ Pelos seus palpites, **{quantidade}** seleções estão empatadas em pontos/saldo/gols pró na disputa pelos 8 melhores terceiros. Nessa situação, a FIFA usa o ranking pré-Copa. No nosso bolão, estamos usando ordem alfabética para desempatar — isso pode mudar as equipes classificadas em terceiro.

Estilo do banner: igual ao banner de pendência já existente (borda âmbar/laranja, ícone `AlertTriangle`, fundo suave). Reaproveite o padrão visual de `Card` com `border-festive-orange/40 bg-festive-orange/5` que já é usado na página.

---

## Tarefa 5 — Remover a visão "Por fase" no `mata-mata-form.tsx`

- Remover o toggle "Bracket / Por fase" (os dois botões `LayoutGrid` / `List`).
- Remover o componente `ListaPorFase` e toda a lógica do estado `modo` / `changeModo` / `localStorage` `"mata-mata-modo"` / `aba` / `setAba`.
- O form passa a renderizar **somente** o `BracketView`.
- **Não** remover `ProgressoFases` nem o botão Salvar nem o autosave — só a visão por fase.
- Imports não usados (ex.: `List`, `LayoutGrid`, `Tabs*`, `Badge` se ficar órfão) devem ser limpos para não quebrar o lint.

> A lógica de pick/cascata (`pickInMatch`, `encontrarAdversario`) permanece — ela é usada pelo bracket também.

---

## Tarefa 6 — Limpar palpites de mata-mata (migração SQL)

Os palpites de mata-mata atuais foram feitos com o bracket antigo (errado) e/ou pela visão "Por fase". Como são **todos usuários de teste**, vamos zerá-los para evitar inconsistências.

Rodar no banco (Supabase do bolão):

```sql
-- Remove TODOS os palpites de mata-mata (16avos..campeão) de todos os usuários.
-- NÃO afeta palpites de grupos, artilheiro, usuários, config ou pontuação.
DELETE FROM palpites_mata;
```

- **Não** tocar em `palpites_grupos`, `palpites_artilheiro`, `users`, `config`, `csv_backups`, `matches`, `teams`, `players`.
- Após o DELETE, os usuários recomeçam o mata-mata do zero, já no bracket correto.
- Se houver cache local de mata-mata no navegador (`localStorage` chave `bolao:palpites:mata:{userId}`), ele será reconciliado/sobrescrito naturalmente no próximo save; não é necessário ação extra, mas se quiser ser explícito, pode limpar essa chave no carregamento do form uma única vez (opcional).

---

## Tarefa 7 — Testes (Vitest)

Criar/atualizar `tests/bracket-2026.test.ts` cobrindo:

1. **Matriz Annex C íntegra:**
   - `FIFA_ANNEX_C` tem 495 entradas.
   - Toda entrada tem 16 chars; os 8 primeiros são grupos A-L ordenados e únicos; os 8 últimos são permutação dos 8 primeiros.
   - Todas as C(12,8)=495 combinações estão cobertas (gere as combinações e verifique `lookupAnnexC` para cada uma sem lançar erro).
   - Para cada entrada, a alocação respeita os grupos permitidos por slot (matches 79/85/81/74/82/77/87/80) e nenhum 3º cai contra o 1º do próprio grupo.

2. **Casos reais (regressão dos 5 usuários de teste).** Para cada conjunto de palpites de grupos abaixo, `resolverBracketR32` deve produzir EXATAMENTE a alocação FIFA esperada (sem placeholder). Use os dados e expectativas do anexo `casos-regressao.json`:
   - Fernando: combinação de 3ºs `{A,E,G,H,I,J,K,L}` → matches 79=3E, 85=3J, 81=3I, 74=3A, 82=3H, 77=3G, 87=3L, 80=3K.
   - Lucas, Motta, Rodrigo, Vitor: idem (valores no anexo).
   - Em nenhum dos 5 deve sobrar slot de 3º sem time.

3. **Estrutura de avanço (`mata-mata-estrutura.ts`):**
   - R16 tem 8 jogos (89-96), QF 4 (97-100), SF 2 (101-102), Final 104.
   - `origemJogos` de cada nó bate com a tabela oficial (89=[73,74] … 102=[98,100], 104=[101,102]).
   - `labelJogo(104) === "Final"` e `labelJogo(73) === "Jogo 73"`.

4. **Detecção de empate:**
   - Um cenário sem empate → `detectarEmpateTerceiros` retorna `null`.
   - Um cenário com 3 terceiros de mesmos (pontos, saldo, gp) na faixa de corte → retorna `{ quantidade: 3, ... }`.

---

## Critérios de aceite

- [ ] `src/lib/bracket-2026.ts` substituído; `resolverBracketR32` usa Annex C; build/TS sem erros.
- [ ] `src/lib/mata-mata-estrutura.ts` criado.
- [ ] `bracket-view.tsx`: layout espelhado mantido; pareamento R16/QF/SF/Final via `origemJogos`; labels de origem no R32 (`Nº melhor 3º`) e código do jogo em todas as fases; Final sem número.
- [ ] Visão "Por fase" removida; só o bracket aparece; sem imports órfãos.
- [ ] Banner de empate dinâmico aparece quando aplicável.
- [ ] `DELETE FROM palpites_mata;` aplicado.
- [ ] Testes passando.
- [ ] Pontuação NÃO foi alterada (continua flat por fase).

## Validação manual sugerida (pós-deploy)

1. Logar com um usuário de teste que tenha todos os 72 palpites de grupos (ex.: Vitor, que tinha placeholder antes). Abrir `/palpites/mata-mata`.
2. Conferir que **não há** placeholder "3º (X/Y/Z)" em nenhuma vaga do R32 (todas as 16 caixas com times).
3. Conferir os labels: R32 mostra `1º A`, `2º B`, `5º melhor 3º`, etc., e cada card tem "Jogo NN".
4. Conferir o pareamento: o vencedor do Jogo 73 enfrenta o vencedor do Jogo 74 nas oitavas (Jogo 89), e assim por diante.
5. Conferir que a Final aparece como "Final" (sem número).
6. (Se algum usuário tiver empate total entre 3ºs) conferir o banner amarelo.

---

## Tarefa 8 — Screenshots antes/depois (obrigatório no PR)

Antes de abrir o PR, capturar evidência visual da correção. Rodar o app localmente (`npm run dev`) e logar com um usuário de teste que **já tinha o bug** (recomendado: Vitor — `vitorbaracho@gmail.com` — que tinha placeholder "3º (E/H/I/J/K)", ou Rodrigo). Abrir `/palpites/mata-mata`.

**Importante sobre o "antes":** depois que você aplicar o `DELETE FROM palpites_mata` e o código novo, não dá mais pra reproduzir o estado bugado facilmente. Então capture o "antes" **na branch atual (main), ANTES de começar** — ou use as imagens que já temos:
- Já existem prints do bug (Rodrigo/Vitor com placeholder) e do comportamento atual do Fernando. Se não tiver acesso a eles, gere o "antes" fazendo checkout da main, subindo o app, logando como Vitor e tirando o print do bracket com o placeholder visível.

Capturar e anexar ao PR (3 pares no mínimo):

| Cenário | Antes (main) | Depois (esta branch) |
|---|---|---|
| **Vitor — placeholder no R32** | Bracket com "3º (E/H/I/J/K)" numa vaga vazia | Mesma vaga preenchida com Equador (3E), sem placeholder |
| **Labels de origem no R32** | Slots mostrando `3º (C/E/F/H/I)` | Slots mostrando `2º melhor 3º`, `1º A`, etc. + badge "Jogo 79" |
| **Pareamento das oitavas** | Vencedor do Jogo 73 caindo no jogo errado | Vencedor do Jogo 73 × vencedor do Jogo 74 = Jogo 89 |

Se algum usuário tiver empate total entre 3ºs, capturar também um 4º print do **banner amarelo de empate**.

Diretrizes das capturas:
- Desktop (≥ lg) para mostrar o bracket espelhado completo; e 1 print mobile (~390px) pra confirmar que o scroll horizontal e os labels não quebraram.
- Marcar com seta/retângulo vermelho a região relevante (a vaga que tinha placeholder, o label novo, o badge do jogo).
- Nome dos arquivos: `antes-vitor-placeholder.png`, `depois-vitor-corrigido.png`, etc.

---

## Tarefa 9 — Descrição do PR (colar no corpo do Pull Request)

Usar este template no corpo do PR:

```markdown
## 🎯 O que este PR faz

Corrige dois bugs estruturais no chaveamento do mata-mata (R32 em diante):

1. **Alocação dos 8 melhores 3ºs colocados** — substitui o algoritmo guloso
   pela matriz oficial FIFA das 495 combinações (Annex C). Antes, vários
   usuários viam vagas com placeholder "3º (X/Y/Z)" ou times alocados no
   jogo errado.
2. **Árvore de avanço do bracket** (R16 → quartas → semi → final) — agora
   segue a estrutura oficial FIFA (Jogo 89 = vencedor 73 × vencedor 74, etc).
   Antes, o pareamento usava pares adjacentes no array e cruzava os caminhos.

Também:
- Remove a visão "Por fase" (mantém só o bracket como interface de palpite).
- Adiciona labels: origem dos times no R32 (`1º A`, `2º melhor 3º`…) e código
  do jogo em todas as fases (`Jogo 73`…`Jogo 102`; a Final fica sem número).
- Adiciona banner de aviso quando há empate total entre 3ºs (tiebreaker
  alfabético pode mudar quem classifica).
- Zera `palpites_mata` (usuários de teste; evita estado inconsistente herdado
  do bracket antigo).

## ⚠️ Não altera a pontuação

A pontuação continua **flat por fase**: o usuário pontua se palpitou que um
time chega a uma fase e o time real chegou (pelo menos) àquela fase,
independente do caminho/adversário. O schema de `palpites_mata` não muda.

## 🗃️ Migração de banco

```sql
DELETE FROM palpites_mata;
```
Só remove palpites de mata-mata. NÃO toca em grupos, artilheiro, usuários,
config ou pontuação.

## 📸 Antes / Depois

(colar os screenshots da Tarefa 8 aqui)

## ✅ Checklist do PR

- [ ] `src/lib/bracket-2026.ts` substituído (matriz Annex C) — build/TS sem erros
- [ ] `src/lib/mata-mata-estrutura.ts` criado
- [ ] `bracket-view.tsx`: layout espelhado mantido + pareamento via `origemJogos`
- [ ] Labels de origem no R32 (`Nº melhor 3º`) + código do jogo em todas as fases
- [ ] Final exibida como "Final" (sem número)
- [ ] Visão "Por fase" removida; sem imports órfãos; `npm run lint` limpo
- [ ] Banner de empate dinâmico funciona (texto com `{quantidade}` correto)
- [ ] `DELETE FROM palpites_mata;` aplicado no ambiente de destino
- [ ] Testes Vitex passando (`npm run test`) — incl. matriz 495 + regressão dos 5 usuários
- [ ] Pontuação NÃO alterada (verificado: `scoring.ts`/`scoring-breakdown.ts`/`recalc.ts` intactos)
- [ ] Sanidade: nenhum usuário com os 72 palpites de grupos vê placeholder "3º (X/Y/Z)" no R32
- [ ] Testado em desktop (bracket espelhado completo) e mobile (~390px, scroll horizontal ok)
- [ ] Screenshots antes/depois anexados

## 🧪 Como testar localmente

1. `npm install && npm run dev`
2. Aplicar o `DELETE FROM palpites_mata;` no banco de dev
3. Logar como `vitorbaracho@gmail.com` (usuário com 72 palpites de grupos)
4. Abrir `/palpites/mata-mata` → conferir os 16 jogos do R32 sem placeholder
5. Clicar nos vencedores e conferir que avançam pro jogo correto (73→89, etc)
6. `npm run test` → suíte de bracket verde
```

---

## Resumo dos arquivos tocados (para orientar o reviewer)

| Arquivo | Ação |
|---|---|
| `src/lib/bracket-2026.ts` | Substituído (matriz Annex C + origem 3º + detecção empate) |
| `src/lib/mata-mata-estrutura.ts` | **Novo** (árvore de pareamento 73→104) |
| `src/app/palpites/mata-mata/bracket-view.tsx` | Reescrito (pareamento + labels) |
| `src/app/palpites/mata-mata/mata-mata-form.tsx` | Remove "Por fase" + banner empate |
| `src/app/palpites/mata-mata/page.tsx` | Passa `empateTerceiros` ao form |
| `tests/bracket-2026.test.ts` | Novo/atualizado (matriz + regressão + estrutura + empate) |
| Banco (migração) | `DELETE FROM palpites_mata;` |

Arquivos que **NÃO** devem ser tocados: `scoring.ts`, `scoring-breakdown.ts`, `recalc.ts`, `classification.ts` (a menos que `terceirosEliminados` não exista — nesse caso, só adicionar essa saída sem alterar a lógica de classificação), `world-cup-2026.ts`, schema de `palpites_mata`.
