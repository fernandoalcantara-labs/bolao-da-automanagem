# Roteiro de Teste — Quick Wins 3.0

Branch: `feat/quick-wins-3` · 8 itens (10-17) em 3 sprints.

**ANTES DE COMEÇAR**: aplicar as 3 migrations SQL no Supabase do projeto, na ordem:

1. `supabase/migrations/20260520000005_handle_new_user_nome_exibicao.sql`
2. `supabase/migrations/20260520000006_limpar_duplicatas_players.sql`
3. `supabase/migrations/20260520000007_teams_nome_curto.sql`

Sem elas: signup quebra (NOT NULL em `nome_exibicao`), duplicatas continuam, abreviações de seleção não existem.

---

## 🔴 SPRINT 1 — Bugs críticos

### CT-11 — Login automático após cadastro
1. Em uma janela anônima, ir em `/cadastro`
2. Preencher com um email novo
3. Submeter
4. **Esperado**:
   - Toast verde "Bora pro Bolão! 🎉 Cadastro feito"
   - Confete grande
   - Cai em `/` (painel) **já logado**
   - Sidebar (desktop) ou bottom-nav (mobile) mostra menu **completo** (sem CTA "Bora pro Bolão")
   - **Banners de pendência** aparecem (palpites pendentes + pagamento pendente)
   - Avatar com inicial do nome no canto

❌ **Antes**: caia em `/pagamento` com sidebar deslogado e precisava fazer login manual.

---

### CT-14 — Recálculo zera pontos após reverter/limpar jogo
**Cenário A — reverter manual**:
1. Como admin, em `/admin/jogos`, editar manualmente um jogo (ex: Brasil 3x0)
2. Salvar — toast "Jogo atualizado · Recalculando pontuações…"
3. Esperar ~3s (debounce do recalc-trigger) e abrir o `/admin` → "Recalcular pontuações" pra confirmar
4. Abrir `/admin/usuarios` → memória de cálculo de algum user que palpitou aquele jogo → ver os pontos
5. Voltar em `/admin/jogos`, clicar "Auto" → confirmar
6. Esperar ~3s
7. **Esperado**: pontos foram recalculados com o placar da API (não mais o 3x0 manual)

**Cenário B — limpar placar (status agendado)**:
1. Como admin, editar um jogo finalizado: mudar status pra "agendado" + limpar placares
2. Salvar
3. Esperar ~3s
4. **Esperado**: pontos dos usuários que tinham acertado o jogo **zeraram** para esse match

❌ **Antes**: pontos ficavam congelados até o próximo sync do cron.

---

### CT-15 — Duplicatas de jogadores removidas
1. Aplicar a migration `20260520000006`
2. No Supabase Studio, rodar:
   ```sql
   select lower(unaccent(trim(nome))) as norm, time_id, count(*) c
   from players group by norm, time_id having count(*) > 1;
   ```
3. **Esperado**: 0 rows (nenhum grupo com >1 entrada)
4. Tentar inserir uma duplicata manual (ex: "Vinicius Junior" se já existir "Vinícius Júnior"):
   ```sql
   insert into players (nome, time_id) values ('Vinicius Junior', '<time_id>');
   ```
5. **Esperado**: erro 23505 (unique violation) — constraint funcional impede

---

## 🟠 SPRINT 2 — Bugs visuais e dados

### CT-10 — Horário de Brasília
1. Conferir hora exibida pra estreia da Copa (11/06/2026, México vs Cazaquistão no Estádio Azteca):
   - Site oficial FIFA: `20:00 BRT` (kickoff em horário de Brasília)
2. Telas a verificar:
   - `/` (dashboard, "Próxima rodada")
   - `/palpites/grupos` em ambos os modos (Por Grupo / Por Rodada)
   - `/admin/jogos`
3. **Esperado**: todas mostram `11/06 20:00` (formato curto) ou `11/06/2026, 20:00` (formato completo)

**Bonus**: Em DevTools, mudar timezone do browser pra `America/Mexico_City`. Recarregar. Telas devem **continuar mostrando horário de Brasília** (não converter pro fuso do browser).

---

### CT-12 — Quebra de linha em nomes longos
1. Telas a verificar (procurar Costa do Marfim, Coreia do Sul, África do Sul, Países Baixos):
   - `/palpites/grupos` modo Por Grupo (cards de jogo dentro do card de grupo)
   - `/palpites/grupos` modo Por Rodada
   - `/palpites/mata-mata` modo Bracket
   - `/palpites/mata-mata` modo Por Fase
   - `/admin/jogos`
2. **Esperado**:
   - Nomes longos quebram em 2 linhas (ex: "Costa do" / "Marfim")
   - Nenhum nome aparece com `…` ellipsis truncado
   - Layout não estoura horizontalmente

---

### CT-16 — Nome + sobrenome no ranking
1. Em `/` (dashboard), conferir KPIs:
   - Líder, 2º, 3º, Lanterninha → nome completo curto (≤20 chars) OU "Primeiro Último"
2. Tabela de ranking → mesma regra
3. Tooltip do gráfico multi-linhas (hover) → mesma regra
4. Banner "Você está em Xº" (quando user fora do top 15) → mesma regra
5. Heatmap (eixo Y) → **só primeiro nome** (intencional, espaço escasso)
6. Bar chart "Pontos na rodada" → **só primeiro nome**

Casos de borda pra testar:
- "Fernando" → "Fernando"
- "Carla Souza" → "Carla Souza" (cabe nos 20 chars)
- "Fernando Aparecido da Silva" → "Fernando Silva"

---

## 🟢 SPRINT 3 — Features

### CT-13 — Autosave de palpites
**Cenário A — F5 sem salvar (recover)**:
1. Em `/palpites/grupos`, preencher placares em 5 jogos
2. Aguardar 2 segundos (debounce 800ms + render do badge "Salvo ✓")
3. **F5** (recarregar)
4. **Esperado**: os 5 palpites continuam preenchidos

**Cenário B — trocar de visão**:
1. Preencher 3 jogos no modo "Por Rodada"
2. Trocar pro modo "Por Grupo"
3. **Esperado**: os 3 palpites aparecem preenchidos lá também

**Cenário C — badge visual**:
1. Preencher 1 placar → badge mostra "Salvando…" (amarelo, ícone girando)
2. Após ~800ms → "Salvo ✓" (verde) por 2.5s → "Tudo salvo" (cinza)

**Cenário D — offline**:
1. DevTools → Network → Offline
2. Preencher um palpite
3. **Esperado**: badge "Sem conexão — salvo local" (vermelho)
4. DevTools → Network → Online
5. **Esperado**: badge muda pra "Salvando…" → "Salvo ✓"

**Cenário E — outras telas**:
1. Repetir Cenário A nas telas `/palpites/mata-mata` e `/palpites/artilheiro`

**Cenário F — logout limpa cache**:
1. Logar como user A, preencher 1 palpite
2. Logout
3. Logar como user B
4. Abrir `/palpites/grupos`
5. **Esperado**: palpites do user A **não vazaram** pro user B

---

### CT-17 — Log detalhado do recálculo
1. Como admin, ir em `/admin`
2. Clicar "🔄 Recalcular pontuações"
3. **Esperado**: abre modal **"Recálculo de pontuações"** com:
   - Loading spinner durante o processo
   - Quando termina: card verde "Recálculo concluído em X.Xs"
   - Lista resumo: jogos finalizados, usuários alterados, palpites recalculados
   - Tabela "Usuários com pontuação alterada" ordenada por |Δ| desc:
     - Nome (Primeiro Último)
     - Pontos antes
     - Pontos agora
     - Delta com seta verde ↑ ou vermelha ↓
4. Se nenhum usuário mudou: mensagem "Nenhuma pontuação mudou — recálculo apenas confirmou o estado atual"
5. Clicar X pra fechar modal

**Cenário com mudança real**:
1. Editar manualmente um jogo (que tenha palpites) → modal mostra os usuários afetados após o auto-recalc

---

## ✅ Checklist final pré-merge

- [ ] 3 migrations SQL aplicadas no Supabase
- [ ] CT-11 ok
- [ ] CT-14 (cenários A e B) ok
- [ ] CT-15 ok (sem duplicatas + constraint funciona)
- [ ] CT-10 ok (Brasília em todas as telas)
- [ ] CT-12 ok (nomes longos sem truncamento)
- [ ] CT-16 ok (nome + sobrenome)
- [ ] CT-13 (cenários A-F) ok
- [ ] CT-17 ok (modal com tabela)
- [ ] `npm run build` passa
- [ ] PR aprovada e mergeada
