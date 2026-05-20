# Roteiro de Teste — Fix desempate de grupos (h2h) + exclusividade quartas/semi

Branch: `fix/grupos-h2h-e-exclusividade-mata` · PR #6 · 7 arquivos · 60 testes Vitest passando.

## ANTES DE COMEÇAR

**Não há migração de banco.** A pontuação não muda (continua flat por fase). O R32 é resolvido em runtime a partir dos palpites de grupos, então basta recarregar `/palpites/mata-mata` após o deploy.

Recomendado: como admin, rodar **"🔄 Recalcular pontuações"** uma vez no `/admin` após o merge — só pra garantir que `ranking_snapshots` está coerente (a memória de cálculo lê dali).

---

## 🔴 PARTE 1 — Desempate da fase de grupos (h2h vs saldo geral)

### CT-G1 — Fernando: Grupo H — Cabo Verde em 2º (não Espanha)

**Cenário**: pelos palpites do Fernando no Grupo H, **Espanha** e **Cabo Verde** terminam com **4 pts cada**. Cabo Verde tem saldo geral **pior** (-7 vs +1) mas **venceu** Espanha no confronto direto (1×0).

1. Logar como `fernandoarocha@gmail.com`
2. Abrir `/palpites/mata-mata`
3. Olhar o R32: localizar onde Uruguai (1º H) e o 2º colocado do H aparecem

**Esperado**:
| Pos | ANTES (bug) | AGORA (correto FIFA) |
|-----|-------------|----------------------|
| 1º | Uruguai (5 pts) | Uruguai (5 pts) ✓ |
| 2º | Espanha | **Cabo Verde** ← venceu h2h |
| 3º | Cabo Verde | **Espanha** |
| 4º | Arábia Saudita | Arábia Saudita ✓ |

No bracket, o slot do "2º grupo H" deve mostrar **Cabo Verde** com bandeira. Espanha aparece nos cards do tipo "3º melhor" (se ela ficou entre os 8 melhores terceiros).

---

### CT-G2 — Motta: Grupo B — Suíça em 1º (não Canadá)

**Cenário**: Canadá e Suíça empatam em **6 pts**. Canadá tem saldo geral **melhor** (+2 vs +1) mas Suíça **venceu** Canadá no h2h (1×0).

1. Logar como `motta.penido@gmail.com`
2. Abrir `/palpites/mata-mata`

**Esperado**:
| Pos | ANTES | AGORA |
|-----|-------|-------|
| 1º | Canadá | **Suíça** ← venceu h2h |
| 2º | Suíça | **Canadá** |

---

### CT-G3 — Motta: Grupo G — Bélgica em 2º (não Egito)

**Cenário**: Egito e Bélgica empatam em **4 pts**. Egito tinha saldo geral 0 vs Bélgica -1, mas Bélgica venceu Egito (2×0).

1. Mesmo user `motta.penido@gmail.com`, mesmo bracket

**Esperado**:
| Pos | ANTES | AGORA |
|-----|-------|-------|
| 2º | Egito | **Bélgica** ← h2h |
| 3º | Bélgica | **Egito** |

---

### CT-G4 — Lucas: 3 grupos afetados (A, B, D)

Logar como `lucasloures@gmail.com`. Conferir:

**Grupo A**:
| Pos | ANTES | AGORA |
|-----|-------|-------|
| 2º | Coreia do Sul | **Tchéquia** ← venceu Coreia 1×0 |
| 3º | Tchéquia | **Coreia do Sul** |

**Grupo B**:
| Pos | ANTES | AGORA |
|-----|-------|-------|
| 2º | Catar | **Bósnia e Herzegovina** |
| 3º | Bósnia | **Catar** |

**Grupo D**:
| Pos | ANTES | AGORA |
|-----|-------|-------|
| 2º | Paraguai | **Turquia** |
| 3º | Turquia | **Paraguai** |

---

### CT-G5 — Vitor: 2 grupos afetados (A, F)

Logar como `vitorbaracho@gmail.com`.

**Grupo A**:
| Pos | ANTES | AGORA |
|-----|-------|-------|
| 3º | Coreia do Sul | **África do Sul** ← venceu Coreia 1×0 |
| 4º | África do Sul | **Coreia do Sul** |

**Grupo F**:
| Pos | ANTES | AGORA |
|-----|-------|-------|
| 2º | Suécia | **Japão** |
| 3º | Japão | **Suécia** |

---

### CT-G6 — Rodrigo (controle): nada deve mudar

Logar como `rodrigoluismoreira@gmail.com`. Conferir que **todos os grupos** seguem como antes (palpites dele não tinham empates resolvidos por h2h, então nada muda).

---

### CT-G7 — Comparação com simulador externo (Globo)

Pra **qualquer um** dos users acima, pegar os palpites e validar no simulador da Globo (manualmente):

1. Anotar 1º/2º/3º/4º de cada grupo
2. Comparar com o que aparece no nosso `/palpites/mata-mata`
3. **Esperado**: bate 100% (antes divergia nos casos de empate com h2h)

Esse é o teste de aceitação final — se passar, o regulamento FIFA está aplicado corretamente.

---

## 🟠 PARTE 2 — Exclusividade nas quartas e semifinal

### CT-EX1 — Quartas: marcar 2º time do mesmo confronto desmarca o 1º

1. Logar como qualquer user com palpites completos (ex: Fernando)
2. Abrir `/palpites/mata-mata`
3. **Configurar estado**: clicar nos vencedores das oitavas (ex: vencedor do Jogo 89 = `T_A` e vencedor do Jogo 90 = `T_B`). Eles ficam verdes ✓.
4. Avançar pra quartas: marcar `T_A` como vencedor do confronto **97 (89×90)** — fica verde
5. **Tentar marcar `T_B`** (adversário no mesmo confronto 97) também como vencedor das quartas

**Esperado**:
- ✅ `T_B` fica marcado em verde
- ✅ `T_A` é **desmarcado automaticamente** (ANTES: ficavam os 2 verdes)
- ✅ Quartas tem só 1 vencedor desse confronto (não 2)

❌ Comportamento antigo (bug): os 2 ficavam verdes simultaneamente no mesmo confronto.

---

### CT-EX2 — Semi: mesma exclusividade

1. Continuar do estado anterior (já tem picks até quartas)
2. Avançar pra semi: marcar `T_C` (vencedor de uma quarta)
3. Marcar `T_D` (adversário do mesmo confronto SF)

**Esperado**: igual ao CT-EX1 — só um time fica marcado em semi por confronto.

---

### CT-EX3 — Confrontos DIFERENTES coexistem

1. Em quartas, marcar `T_A` (vencedor do confronto 97) e `T_C` (vencedor do confronto **99**, que é diferente)
2. **Esperado**: ambos ficam verdes ✓ — pode ter até 4 vencedores em quartas (um por confronto), só não pode 2 do mesmo

---

### CT-EX4 — Campeão substitui (sempre 1 só)

1. Estado: já tem 2 finalistas (`F1` e `F2` marcados em "final")
2. Clicar em `F1` na seção "Final" do centro do bracket → fica campeão (gradient dourado + 👑)
3. Clicar em `F2` na seção "Final"
4. **Esperado**: `F1` perde o status de campeão, `F2` vira o campeão (substituição automática). Nunca os 2 simultâneos.

---

## ⚙️ PARTE 3 — Não-regressão

### CT-PT1 — Pontuação NÃO alterada

Esta correção mexe **só na ordenação visual** dos grupos. A pontuação do mata-mata é flat (depende só de o time real ter chegado a uma fase, não do caminho/adversário).

1. Como admin, ir em `/admin` → clicar "🔄 Recalcular pontuações"
2. Modal abre com diff de pontuação
3. **Esperado**: **nenhuma mudança de pontos** pra ninguém (delta = 0 pra todos os users)
4. Em `/admin/usuarios`, expandir memória de cálculo de qualquer user
5. **Esperado**: subtotal de mata-mata continua igual ao anterior ao fix

---

### CT-RG1 — Pareamento R16→Final continua correto (não regrediu)

Este PR não toca em `mata-mata-estrutura.ts` nem em `bracket-2026.ts` (matriz Annex C). Só pra garantir:

1. No bracket, conferir que o pareamento das oitavas segue o oficial:
   - 89 = vencedor(74) × vencedor(77)
   - 90 = vencedor(73) × vencedor(75)
   - 93 = vencedor(83) × vencedor(84)
   - 94 = vencedor(81) × vencedor(82)
   - 91 = vencedor(76) × vencedor(78)
   - 92 = vencedor(79) × vencedor(80)
   - 95 = vencedor(86) × vencedor(88)
   - 96 = vencedor(85) × vencedor(87)
2. SF: 101 = vencedor(97) × vencedor(98); 102 = vencedor(99) × vencedor(100)
3. Final: 104 = vencedor(101) × vencedor(102)

Já testado no PR anterior (fix-matamata) — só conferir que não regrediu.

---

## 📱 PARTE 4 — Mobile (~390px)

### CT-MOB1 — Bracket no mobile

1. DevTools (F12) → modo device toolbar → iPhone 12 Pro (390px)
2. Ir em `/palpites/mata-mata`
3. Verificar que:
   - Bracket continua acessível via scroll horizontal
   - Mudanças de classificação dos grupos refletem no R32 normal
   - Exclusividade funciona em touch (clicar no adversário desmarca o 1º)

---

## ✅ Checklist final pré-merge

- [ ] **CT-G1** Fernando-H: Cabo Verde em 2º
- [ ] **CT-G2** Motta-B: Suíça em 1º
- [ ] **CT-G3** Motta-G: Bélgica em 2º
- [ ] **CT-G4** Lucas: 3 grupos corrigidos (A, B, D)
- [ ] **CT-G5** Vitor: 2 grupos corrigidos (A, F)
- [ ] **CT-G6** Rodrigo: nenhuma mudança (controle)
- [ ] **CT-G7** Bracket bate com simulador externo (Globo)
- [ ] **CT-EX1** Quartas: exclusividade do confronto
- [ ] **CT-EX2** Semi: exclusividade do confronto
- [ ] **CT-EX3** Quartas: confrontos distintos coexistem
- [ ] **CT-EX4** Campeão substitui
- [ ] **CT-PT1** Pontuação não mexeu (recalcular → diff vazio)
- [ ] **CT-RG1** Pareamento R16→Final intacto
- [ ] **CT-MOB1** Mobile ok
- [ ] (Opcional) Screenshots antes/depois pra anexar no PR
- [ ] PR #6 mergeada

---

## 🧪 Validação técnica (já cobertos pelos testes Vitest — 60 verdes)

- `tests/classification.test.ts`:
  - 2 times empatados com h2h decidindo (saldo geral menor mas h2h positivo)
  - 3 times empatados — mini-tabela prevalece sobre saldo geral
  - 4 casos-chave da regressão dos users reais (Fernando-H, Motta-B, Lucas-A, Vitor-A)
- `tests/mata-mata-picks.test.ts`:
  - Exclusividade em 8avos
  - Exclusividade em quartas
  - Confrontos distintos coexistem
  - Cascata pra fases anteriores
  - Toggle off remove de posteriores
  - Campeão substitui
- `tests/bracket-2026.test.ts` (do PR anterior): 19 testes Annex C + estrutura
- `tests/scoring.test.ts`: título corrigido + 15 testes de scoring

Pra rodar:
```bash
npm run test
```
