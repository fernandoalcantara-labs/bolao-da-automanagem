# Roteiro de Teste — Fix Mata-Mata (R32 Annex C)

Branch: `fix/mata-mata-r32` · PR #5 · 6 arquivos modificados.

## ANTES DE COMEÇAR

**SQL** (rodar antes de testar — limpa palpites_mata do bracket antigo):

```sql
-- [Q34] Limpa palpites do mata-mata antigo
DELETE FROM palpites_mata;
```

✅ Já rodado por você (sem erros).

---

## 🔴 CT-MM-1 — R32 sem placeholders

**O bug original**: usuários com 72 palpites de grupos viam slots com `3º (E/H/I/J/K)` no R32 (vaga sem time alocado).

**Teste**:
1. Logar como user com **72 palpites de grupos completos** (ex: Vitor Baracho, Fernando Alcantara Rocha, Rodrigo Carvalho)
2. Abrir `/palpites/mata-mata`
3. Conferir **as 16 caixas do R32**

**Esperado**:
- ✅ Todas as 16 caixas com **nome de time real** (com bandeira)
- ❌ NÃO deve aparecer texto tipo `3º (E/H/I/J/K)` ou `3º (...)` em nenhum slot
- ✅ Times do tipo "3º" mostram o nome real (ex: "Equador", "Espanha")

---

## 🟠 CT-MM-2 — Labels de origem nos slots

Cada slot do R32 tem um label pequeno abaixo do nome do time mostrando de onde ele veio:

**Teste** — abrir o R32 e olhar os 16 cards:

| Tipo de slot | Label esperado |
|--------------|---------------|
| 1º colocado de grupo | `1º A`, `1º B`, ... `1º L` |
| 2º colocado de grupo | `2º A`, `2º B`, ... `2º L` |
| 3º melhor terceiro | `1º melhor 3º`, `2º melhor 3º`, ... `8º melhor 3º` |

**Esperado**:
- ✅ Cada slot do R32 tem o label de origem com fonte pequena/cinza abaixo do nome do time
- ❌ Slots de tipo 3 NÃO mostram mais `3º (C/E/F/H/I)` quando palpites completos — só "Nº melhor 3º"
- ✅ Se palpites de grupos incompletos, slots de 3º caem no label antigo `3º (C/E/F/H/I)` como fallback

---

## 🟡 CT-MM-3 — Badge "Jogo NN" em todos os cards

**Teste** — olhar o topo de cada card do bracket (R32, R16, QF, SF, Final):

| Fase | Badge esperado |
|------|---------------|
| R32 | `Jogo 73` a `Jogo 88` |
| Oitavas | `Jogo 89` a `Jogo 96` |
| Quartas | `Jogo 97`, `Jogo 99` (esquerdo) · `Jogo 98`, `Jogo 100` (direito) |
| Semi | `Jogo 101` (esquerdo) · `Jogo 102` (direito) |
| Final | **"Final"** (sem número!) |

**Esperado**:
- ✅ Badge pequeno em cima de cada card (fonte 9px, cinza, uppercase)
- ✅ Final exibe só "Final" — sem `Jogo 104`

---

## 🔵 CT-MM-4 — Pareamento R16 → Final correto

**O bug original**: pareamento usava "pares adjacentes no array" → cruzava caminhos errados.

**Teste**:
1. No bracket, escolha o vencedor do **Jogo 73** (clique no time desejado nas oitavas → ele fica verde com check ✓)
2. Veja se ele aparece no **Jogo 89** (primeiro card das oitavas, lado esquerdo)
3. Escolha o vencedor do **Jogo 74** → aparece no **Jogo 89** também (como o adversário)
4. Repete pra outros:
   - Vencedor 75 + 76 → Jogo 90
   - Vencedor 77 + 78 → Jogo 91 (lado direito)
   - Vencedor 81 + 82 → Jogo 93 (lado direito)
   - Vencedor 85 + 86 → Jogo 95
   - Vencedor 87 + 88 → Jogo 96
5. Avança pras quartas:
   - Vencedor 89 + 90 → Jogo 97
   - Vencedor 91 + 92 → Jogo 99
   - Vencedor 93 + 94 → Jogo 98
   - Vencedor 95 + 96 → Jogo 100
6. Semis: 97+99 → 101 (esq) · 98+100 → 102 (dir)
7. Final: 101 + 102 → Final

**Esperado**:
- ✅ Cada match recebe os 2 vencedores corretos das origens
- ❌ NÃO há "cruzamento" — vencedor do 73 não aparece no 90/91/etc

---

## 🟢 CT-MM-5 — Visão "Por fase" removida

**Teste**:
1. Em `/palpites/mata-mata`, procurar o toggle `Bracket / Por fase` no canto superior esquerdo
2. **Esperado**: o toggle **não existe mais** — só o bracket é renderizado

---

## 🟣 CT-MM-6 — Banner amarelo de empate entre 3ºs

**Pré-condição**: precisa de um user com palpites de grupos que gerem **empate total** (mesmos pontos, saldo, gols pró) entre 2+ terceiros na faixa que decide a 8ª vaga (posições 6-10 do ranking de 3ºs).

**Teste** (mais difícil de provocar — depende dos palpites):
1. Logar como user com palpites criados pra forçar empate
2. Abrir `/palpites/mata-mata`
3. **Esperado**: banner amarelo no topo do bracket com texto:
   > ⚠️ Pelos seus palpites, **{N}** seleções estão empatadas em pontos/saldo/gols pró na disputa pelos 8 melhores terceiros...

4. Pra confirmar que NÃO aparece banner quando não tem empate: logar como user "normal" sem empate forçado → banner ausente

---

## ⚙️ CT-MM-7 — Pontuação NÃO alterada

**Teste**:
1. Como admin em `/admin`, clica "🔄 Recalcular pontuações"
2. **Esperado**: o modal abre com o log de mudanças (não deve ter mudanças relacionadas a R16/QF/SF/etc — a pontuação continua flat por fase)
3. Como admin em `/admin/usuarios`, expandir memória de cálculo de qualquer user
4. **Esperado**: subtotal de mata-mata (`b.mata.subtotal`) continua igual ao que era antes (a regra de pontuação não mexeu)

**Por que isso é importante**: o fix só muda **visualmente** o bracket — a pontuação continua sendo `time palpitado chegou pelo menos à fase X = X pontos`, independente do caminho.

---

## 📱 CT-MM-8 — Mobile (~390px)

**Teste**:
1. Abrir DevTools (F12) → modo device toolbar → iPhone 12 Pro (390px)
2. Ir em `/palpites/mata-mata`
3. **Esperado**:
   - Scroll horizontal funciona (arrastar pra ver bracket completo)
   - Mensagem "👉 Arrasta horizontalmente..." aparece no topo
   - Labels de origem (`1º A`, `Nº melhor 3º`) continuam legíveis
   - Badge "Jogo NN" continua visível
   - Nenhum overflow vertical estranho

---

## ✅ Checklist final pré-merge

- [ ] Q34 (`DELETE FROM palpites_mata`) aplicado ✅ já feito
- [ ] CT-MM-1: R32 sem placeholder pra users com 72 palpites
- [ ] CT-MM-2: labels de origem aparecem (`1º A`, `2º B`, `Nº melhor 3º`)
- [ ] CT-MM-3: badges "Jogo NN" em todos os cards, "Final" sem número
- [ ] CT-MM-4: pareamento 73→89, 74→89, 75→90, 76→90, etc OK
- [ ] CT-MM-5: visão "Por fase" não existe mais
- [ ] CT-MM-6: banner empate (testa se aparece um user com empate, e some quando não tem)
- [ ] CT-MM-7: pontuação não mexeu (admin → recalcular → memória continua igual)
- [ ] CT-MM-8: mobile sem quebrar layout
- [ ] (Opcional) Screenshots antes/depois pra anexar no PR
- [ ] PR #5 mergeada

---

## 🧪 Validação técnica adicional (não precisa fazer manualmente)

Já cobertos por `tests/bracket-2026.test.ts` (42 testes Vitest passando):
- Matriz Annex C íntegra (495 entradas, todas as combinações cobertas)
- Slots permitidos por match respeitados
- Nenhum 3º contra 1º do próprio grupo
- Casos de regressão: Fernando, Lucas, Motta, Rodrigo, Vitor → alocação bate com FIFA
- Estrutura R16/QF/SF/Final com origemJogos corretos
- `detectarEmpateTerceiros` funciona

Pra rodar localmente:
```bash
npm run test
```
