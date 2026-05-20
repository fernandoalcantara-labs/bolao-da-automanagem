# Roteiro de Teste — Quick Wins 4.0

Branch: `feat/quick-wins-4` · 8 itens em 3 sprints.

**ANTES DE COMEÇAR**: aplicar a migration SQL no Supabase do projeto:

- `supabase/migrations/20260520000010_csv_backups.sql` — tabela `csv_backups` + RLS admin

Sem ela: o botão "Baixar e salvar backup" no /admin vai dar erro de tabela inexistente.

**Também**: garantir que a env `CRON_SECRET` está setada no Vercel (já deveria estar do cron do sync-matches). Sem ela, o cron `/api/cron/backup-deadline` retorna 401.

---

## 🔴 SPRINT 1 — Navegação e UI

### CT-18 — Artilheiro NÃO duplicado no mobile
1. Logar em mobile
2. Conferir **bottom nav**: deve ter exatamente 4 itens — **Painel · Grupos · Artilheiro · Mais**
3. Abrir drawer "Mais"
4. **Esperado**: NÃO aparece "Artilheiro" no drawer (só Mata-mata, Pagamento, Regras, Minha Exportação, Editar perfil, Admin se aplicável, Sair)

---

### CT-19 — Regras aparece no drawer mobile (logado)
1. Logar em mobile
2. Abrir drawer "Mais"
3. **Esperado**: vê "📜 Regras" entre os itens (junto com Pagamento, etc.)
4. Clica em Regras → vai pra `/regras` corretamente

**Deslogado**:
- Bottom: Painel | BORA | Mais
- Drawer "Mais": Regras, (Entrar)

---

### CT-20 — Título "FIFA World Cup 2026" sem sufixo
1. Vai em `/` (painel)
2. **Esperado**: badge verde no topo mostra **"🇧🇷 FIFA World Cup 2026"** — **sem** "· Artilheiro" ou "· Grupos R1"
3. Conferir em qualquer rodada/estado — sempre fixo

---

### CT-25 — Gráfico "Pontos na última rodada" removido
1. Vai em `/` (painel) logado, com pelo menos 1 jogo finalizado
2. **Esperado**: NÃO aparece mais o card "📊 Pontos na última rodada"
3. Heatmap ocupa a linha inteira agora (não dividia 50/50 com o bar chart antes)

---

## 🟠 SPRINT 2 — Backup CSV

### CT-21 — Admin exporta CSV completo
1. Como admin, vai em `/admin`
2. Rola até a seção **"Backup e Exportação"** (verde, no fim)
3. Clica em **"📥 Baixar e salvar backup"**
4. **Esperado**:
   - Toast verde "Backup gerado e salvo! 🎉"
   - Download imediato: `bolao-backup-manual-YYYY-MM-DD.csv`
   - Novo item aparece no topo da lista de "Backups salvos"
5. Abrir o CSV no Excel/Google Sheets → 4 seções (FASE DE GRUPOS, MATA-MATA, ARTILHEIRO, RESUMO)
6. Acentos: aparecer corretamente (BOM UTF-8 já incluso)

**Formato esperado da seção FASE DE GRUPOS**:
```
Rodada,Data (Brasília),Grupo,Time Casa,Time Fora,Placar Real,User1,User2,...
R1,11/06/2026 16:00,A,México,Cazaquistão,(pendente),"1x1","2x0",...
```

---

### CT-22 — Backup automático no deadline
**Difícil de testar manualmente** (deadline é 11/06/2026 16:00 BRT).

**Teste alternativo** (forçar o cron manualmente):
1. Pelo terminal/Postman, chamar:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://bolao-da-automanagem.vercel.app/api/cron/backup-deadline
   ```
2. **Esperado** (fora da janela de 15min do deadline): `{ok:true, skipped:"fora da janela do deadline"}`
3. Pra **simular** dentro da janela, mudar temporariamente `DEADLINE_FASE_GRUPOS` pra `new Date()` em `lib/utils.ts`, deployar, chamar o endpoint → deve criar 1 backup tipo `deadline_grupos`. Reverter depois.

**CT-22b — Re-baixar backup salvo**:
1. Em `/admin`, lista de backups salvos
2. Clica em "Baixar" em qualquer item
3. **Esperado**: download do mesmo arquivo via `Content-Disposition`

---

## 🟢 SPRINT 3 — Memória completa + exportação usuário

### CT-23 — Memória de cálculo mostra TODOS os 72 jogos
1. Como admin, vai em `/admin/usuarios`
2. Expande "Ver memória" de qualquer usuário
3. Aplica filtro "Todos"
4. **Esperado**: tabela mostra **72 linhas** (1 por jogo da fase de grupos), com:
   - ✅ Verde: placar exato (+5)
   - ⚠️ Amarelo: vencedor (+2)
   - ❌ Cinza: errou (0)
   - 🚫 Bege: jogo finalizado mas user não palpitou (0)
   - ⏳ Branco: jogo agendado (sem real ainda)
5. Filtro "Erros" agrupa errou + não palpitou
6. Filtro "Pendentes" mostra só agendados
7. Clica em "Copiar memória" → texto copiado inclui todos os 72 jogos (mesmo os sem palpite)

---

### CT-24 — Página `/minha-exportacao` do usuário
1. Como usuário comum (não admin), vai em `/minha-exportacao` (link no drawer mobile ou sidebar desktop)
2. **Esperado**:
   - Header "📥 Minha Exportação"
   - Card de Resumo com 4 stats (Pontos, Posição, Palpites grupos `N/72`, Mata+Art)
   - Card "Fase de grupos" com tabela igual à da memória do admin (mesmos filtros + ícones)
   - Card "Mata-mata" com lista de picks
   - Card "Artilheiro" com palpite
   - Card "Exportar" com 2 botões:
     - **📥 Exportar como CSV** → baixa `meus-palpites-{slug}-{data}.csv`
     - **📋 Copiar como texto** → vai pro clipboard formatado pra WhatsApp

**CT-24b — Segurança**:
1. Como user A, copia a URL `/minha-exportacao`
2. Tenta acessar como user B (em outra sessão/anônima)
3. **Esperado**: user B vê **a memória dele mesmo**, não a do user A (server-side fetch via `requireUser()`)
4. Deslogado: redireciona pra `/login`

---

## ✅ Checklist final pré-merge

- [ ] Migration `20260520000010_csv_backups.sql` aplicada no Supabase
- [ ] CT-18 ok (Artilheiro só no bottom)
- [ ] CT-19 ok (Regras no drawer logado)
- [ ] CT-20 ok (título fixo "FIFA World Cup 2026")
- [ ] CT-25 ok (sem gráfico de barras)
- [ ] CT-21 ok (admin baixa CSV manual + lista atualiza)
- [ ] CT-22 ok (cron responde 401 sem secret; "fora da janela" sem deadline)
- [ ] CT-22b ok (re-baixar backup salvo)
- [ ] CT-23 ok (72 linhas na memória + filtros)
- [ ] CT-24 ok (página /minha-exportacao funciona)
- [ ] CT-24b ok (cada user só vê a própria)
- [ ] `npm run build` passa
- [ ] PR aprovada e mergeada
