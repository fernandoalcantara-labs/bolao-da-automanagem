# 🧪 Roteiro de Teste — Quick Wins 2.0

> **Branch:** `feat/quick-wins-2` · **Quem testa:** Fernando · **Quando:** após deploy aprovado

---

## Pré-requisitos

- [ ] Aplicar **migration** `supabase/migrations/20260520000004_nome_exibicao.sql` no SQL Editor do Supabase **antes** de subir o deploy
- [ ] Variáveis de ambiente configuradas (Supabase, football-data.org)
- [ ] Aplicação rodando (`npm run dev` local OU deploy Vercel)
- [ ] Conta admin: `usuario1@test.com` / `senha123`
- [ ] Conta usuário comum: `usuario2@test.com` / `senha123`
- [ ] DevTools aberto pra testar mobile (375px) e desktop (1280px)

### SQL pendente (cola no SQL Editor antes de tudo):

```sql
alter table public.users add column if not exists nome_exibicao text;
update public.users set nome_exibicao = trim(split_part(nome, ' ', 1))
  where nome_exibicao is null;
alter table public.users alter column nome_exibicao set not null;
create unique index if not exists users_nome_exibicao_lower_idx
  on public.users (lower(nome_exibicao));
```

---

## Casos de teste por sprint

### 🔴 SPRINT 1 — Bugs críticos

#### CT-01: Selecionar campeão no mata-mata (verificar contraste)
**Item:** 5 · **Pré-condição:** logado, todos os 72 palpites de grupos preenchidos
**Passos:**
1. Vai em `/palpites/mata-mata`
2. Modo "Bracket"
3. Marca picks até a Final (2 finalistas)
4. Clica num dos finalistas no card central pra escolher campeão

**Esperado:**
- ✅ Botão fica com gradient dourado
- ✅ Texto do país aparece **escuro e legível** sobre o fundo amarelo
- ✅ Ícone 👑 aparece à direita
- ✅ Pequeno scale-up visual (1.02)

**Obtido:** [ ] OK [ ] Falhou (descrever)

---

#### CT-02: Alterar seleção do campeão
**Item:** 5
**Passos:**
1. Com campeão já selecionado, clica no OUTRO finalista
2. Verifica que o destaque dourado migra
3. Texto do antigo campeão volta ao estilo normal

**Esperado:**
- ✅ Transição suave, sem flash preto
- ✅ Texto sempre legível em ambos os estados

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-03: "Falta o PIX" visível em desktop (1280px)
**Item:** 4 · **Pré-condição:** logado como user sem pagamento (`usuario2`)
**Passos:**
1. Redimensiona viewport pra 1280px
2. Vai em `/pagamento`

**Esperado:**
- ✅ Card laranja claro com border 2px laranja escuro
- ✅ Texto "⚠️ Falta o PIX! 💸 Acerta com o organizador" peso 800 cor escura
- ✅ Subtexto explicando ranking público
- ✅ Card claramente visível (não escondido)

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-04: "Falta o PIX" visível em mobile (375px)
**Item:** 4 · Mesmas pré-condições do CT-03 mas em 375px de viewport
**Esperado:** Card aparece com mesma especificação, sem overflow
**Obtido:** [ ] OK [ ] Falhou

---

### 🟠 SPRINT 2 — Backend/Admin

#### CT-05: Admin expande memória de cálculo
**Item:** 6 · **Pré-condição:** logado como admin
**Passos:**
1. Vai em `/admin/usuarios`
2. Clica "Ver memória" ao lado de `usuario1`

**Esperado:**
- ✅ Loading spinner aparece brevemente
- ✅ Accordion expande inline com 4 seções:
  - Resumo (grupos / mata / artilheiro / TOTAL)
  - Tabela fase de grupos com filtros
  - Tabela mata-mata
  - Card artilheiro

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-06: Filtros da memória de cálculo
**Item:** 6
**Passos:**
1. Com memória aberta, clica em "Acertos"
2. Depois "Erros", depois "Pendentes", depois "Todos"

**Esperado:**
- ✅ Tabela atualiza filtrando linhas
- ✅ Filtro ativo destacado visualmente

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-07: Copiar memória pro clipboard
**Item:** 6
**Passos:**
1. Clica em "📋 Copiar memória" no final do accordion
2. Cola em algum editor de texto

**Esperado:**
- ✅ Toast "Copiado! 🎉"
- ✅ Texto colado tem 4 seções legíveis (grupos, mata, artilheiro, total)

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-08: Usuário comum NÃO acessa memória de cálculo
**Item:** 6
**Passos:**
1. Loga como `usuario2`
2. Tenta acessar `/admin/usuarios` via URL direta

**Esperado:**
- ✅ Redireciona pra `/` (não tem permissão)

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-09: Admin edita jogo e depois reverte
**Item:** 9 · **Pré-condição:** logado como admin
**Passos:**
1. Vai em `/admin/jogos`
2. Edita o placar de algum jogo de grupos (ex: 3x1) e salva
3. Aparece badge "✏️ Manual" + botão "↺ Auto"
4. Clica "↺ Auto"
5. Painel de confirmação aparece inline com resultado atual
6. Clica "Confirmar reversão"

**Esperado:**
- ✅ Toast "Jogo voltou pro automático ✓"
- ✅ Badge "Manual" some
- ✅ Botão "↺ Auto" some

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-10: Toggle "Só editados manualmente"
**Item:** 9
**Passos:**
1. Em `/admin/jogos`, ativa o toggle "Só editados manualmente"

**Esperado:**
- ✅ Lista filtra pra mostrar só jogos com badge "Manual"
- ✅ Se nenhum, mostra mensagem amigável

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-11: Usuário edita nome de exibição
**Item:** 10 · **Pré-condição:** logado como `usuario2`, migration aplicada
**Passos:**
1. Clica no nome/avatar no rodapé do sidebar (ou avatar no drawer mobile)
2. Vai pra `/perfil`
3. Muda "Nome de exibição" pra "Fernandinho2026"
4. Salva

**Esperado:**
- ✅ Toast "Perfil atualizado! 🎉"
- ✅ Após reload, sidebar mostra "Fernandinho2026"
- ✅ Painel público mostra "Fernandinho2026" no ranking
- ✅ Admin em `/admin/usuarios` continua vendo o nome completo

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-12: Nome de exibição duplicado
**Item:** 10
**Passos:**
1. Tenta usar nome de exibição que já existe (ex: "Fernandinho2026" de outro user)

**Esperado:**
- ✅ Erro "Esse nome já tá sendo usado por outro craque 😅 Tenta variar."
- ✅ Form não salva

**Obtido:** [ ] OK [ ] Falhou

---

### 🟡 SPRINT 3 — Visualização

#### CT-13: Gráfico mostra apenas top 15 (user logado no top)
**Item:** 7 · **Pré-condição:** ranking simulado, logar como user que está no top 15
**Passos:**
1. Vai em `/` (painel)
2. Observa o gráfico "Posições ao longo das rodadas"

**Esperado:**
- ✅ Máximo 15 linhas visíveis
- ✅ A linha do user logado tem cor laranja (#FF6B35) e width maior (3.5)
- ✅ A linha do 1º lugar é dourada (#FFD60A) e width 2.5

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-14: Gráfico mostra 16 linhas (user logado fora do top)
**Item:** 7 · **Pré-condição:** user logado fora do top 15
**Esperado:**
- ✅ 15 linhas do top + 1 linha laranja extra do user logado
- ✅ Banner laranja abaixo: "Mostrando top 15. Você está em Xº com Y pts. 💪 Bora subir!"

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-15: Visitante deslogado não vê banner do top 15
**Item:** 7
**Esperado:** banner abaixo do gráfico não aparece quando não tem user logado
**Obtido:** [ ] OK [ ] Falhou

---

#### CT-16: Coluna "Artilheiro" aparece vazia antes da validação
**Item:** 8 · **Pré-condição:** nenhum jogador com gols > 0
**Esperado:**
- ✅ Eixo X do gráfico tem 9 colunas, última "🏆 Artilheiro" em laranja
- ✅ Linha vertical pontilhada laranja separa Final e Artilheiro
- ✅ Todas as linhas mantêm posição em "Artilheiro" igual à "Final"

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-17: Heatmap mostra coluna Artilheiro destacada
**Item:** 8
**Esperado:**
- ✅ Heatmap tem coluna "🏆 Artilheiro" no final
- ✅ Border-left dourado separa do resto
- ✅ Tooltip no header explica os 24 pts

**Obtido:** [ ] OK [ ] Falhou

---

### 🟢 SPRINT 4 — Engajamento

#### CT-18: Visitante deslogado vê CTA dourado no sidebar (desktop)
**Item:** 1
**Passos:**
1. Abre `/` deslogado em desktop (≥1024px)

**Esperado:**
- ✅ Card dourado no topo do sidebar com 🎉, "Bora pro Bolão!", botão verde
- ✅ Click no botão vai pra `/login`

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-19: Visitante deslogado vê CTA no bottom nav (mobile)
**Item:** 1
**Passos:**
1. Abre `/` deslogado em mobile (375px)

**Esperado:**
- ✅ Bottom nav tem 4 itens: Painel, Regras, [CTA "BORA PRO BOLÃO!"], Mais
- ✅ CTA tem gradient dourado, translate-y -2 (destaque visual saindo do nav)

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-20: Após login, CTA "Bora pro Bolão" some
**Item:** 1
**Passos:** loga e verifica sidebar/bottom-nav
**Esperado:** CTA gone, layout normal de logado
**Obtido:** [ ] OK [ ] Falhou

---

#### CT-21: Botão Compartilhar abre modal
**Item:** 2
**Passos:** clica botão azul "Compartilhar" no sidebar (ou mobile header)
**Esperado:**
- ✅ Em mobile com Web Share API: dispara compartilhamento nativo
- ✅ Senão: abre modal centralizado com preview da mensagem
- ✅ 3 botões (WhatsApp verde, Copiar texto cinza, Copiar link azul)

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-22: WhatsApp no modal Compartilhar
**Item:** 2
**Passos:** clica botão WhatsApp do modal
**Esperado:** abre wa.me em nova aba com texto encoded (nome bolão + valor + URL)
**Obtido:** [ ] OK [ ] Falhou

---

#### CT-23: Copiar texto no modal
**Item:** 2
**Esperado:** clipboard recebe a mensagem completa, toast "Copiado! 🎉"
**Obtido:** [ ] OK [ ] Falhou

---

#### CT-24: Banner palpites pendentes no Painel
**Item:** 3 · **Pré-condição:** logado com palpites incompletos
**Passos:** vai em `/`
**Esperado:**
- ✅ Banner amarelo "Pendente: lançar palpites" com X/72 palpites
- ✅ Barra de progresso animada gradient laranja→dourado
- ✅ % de completude no canto direito
- ✅ Click navega pra `/palpites/grupos`

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-25: Banner pagamento pendente no Painel
**Item:** 3 · **Pré-condição:** logado, user.pago = false
**Esperado:** banner laranja com "💸 Pendente: pagar a aposta", click vai pra `/pagamento`
**Obtido:** [ ] OK [ ] Falhou

---

#### CT-26: Mesmos banners aparecem em `/pagamento`
**Item:** 3
**Esperado:** os 2 banners (se pendentes) também renderizam acima do conteúdo da tela de pagamento
**Obtido:** [ ] OK [ ] Falhou

---

#### CT-27: Banner verde "Tudo certo" quando tudo OK
**Item:** 3 · **Pré-condição:** pago + todos palpites preenchidos
**Esperado:**
- ✅ Banner verde discreto "✅ Tudo certo! Bora torcer 🇧🇷"
- ✅ X dispensa por hoje (localStorage)
- ✅ Após dispensar, não volta a aparecer no mesmo dia

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-28: Botão WhatsApp Sorriso na tela Pagamento
**Item:** 3 · **Pré-condição:** admin configurou pix_sorriso_whatsapp
**Passos:** logado, vai em `/pagamento`, clica "Avisar o Sorriso que paguei"
**Esperado:**
- ✅ Abre wa.me em nova aba com mensagem "Oi Sorriso, paguei R$ X do bolão - Fernando"
- ✅ Telefone vem da config

**Obtido:** [ ] OK [ ] Falhou

---

#### CT-29: Fallback do WhatsApp Sorriso quando não configurado
**Item:** 3 · **Pré-condição:** admin NÃO configurou WhatsApp
**Esperado:** aviso amarelo "O organizador ainda não cadastrou o WhatsApp. Avisa ele!"
**Obtido:** [ ] OK [ ] Falhou

---

#### CT-30: Admin configura WhatsApp do Sorriso
**Item:** 3 · **Pré-condição:** admin
**Passos:** em `/admin/config`, preenche campo "WhatsApp do organizador (Sorriso)" com "5531987654321" e salva
**Esperado:**
- ✅ Toast de sucesso
- ✅ Em `/pagamento`, botão verde aparece
- ✅ Validação rejeita formatos errados (com + ou espaços)

**Obtido:** [ ] OK [ ] Falhou

---

## Casos de regressão (não deve ter quebrado)

- [ ] CT-R1: Cadastro novo funciona
- [ ] CT-R2: Login email/senha funciona
- [ ] CT-R3: Palpites grupos salvam corretamente
- [ ] CT-R4: Palpites mata-mata salvam corretamente
- [ ] CT-R5: Ranking público mostra só pagos
- [ ] CT-R6: Sync com football-data.org funciona (testar /admin botão Sincronizar)
- [ ] CT-R7: Admin marca pagamento → user aparece no ranking
- [ ] CT-R8: "Powered by Claudio" em todas as páginas
- [ ] CT-R9: "Designed by Sorriso" canto superior direito

---

## Como reportar bugs

Marque cada caso como ✅ OK ou ❌ Falhou. Para falhas:
- Qual passo falhou
- O que aconteceu (vs o esperado)
- Print de tela se possível
- Navegador/dispositivo usado

Cola a lista de falhas e me envia que eu corrijo.
