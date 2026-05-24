# 🧪 QA Runbook — Bolão da AutoManagem (ADAPTADO · só trilhas seguras)

> Versão adaptada do runbook multiagente do amigo do Fernando.
> **Mudança central:** este projeto **NÃO tem staging**. Existe **um único
> banco Supabase, que é produção** (`NEXT_PUBLIC_SUPABASE_URL` no `.env.local`
> aponta pra ele). Por isso, este documento contém **APENAS trilhas que não
> tocam dados reais** (função pura ou read-only/local). Tudo que escreve no
> banco / muda config de admin / faz carga / ataca o domínio foi
> **deliberadamente removido** (ver seção "Fora de escopo") pra não correr
> risco de ser executado contra produção.

---

## 0. REALIDADE DO AMBIENTE (leia antes de tudo)

| Item | Runbook original assumia | Realidade deste projeto |
|---|---|---|
| Ambiente | staging separado | **só produção** (1 Supabase) |
| Banco/ORM | Prisma + `DATABASE_URL` + psql | **Supabase** (supabase-js) + migrations SQL |
| Package manager | pnpm | **npm** |
| Auth | NextAuth | **Supabase Auth** |
| Testes | criar do zero | **já existe Vitest (65 testes)** |
| Dados | descartáveis | **reais**: ~30+ users, 2741 palpites, bolão valendo dinheiro |
| Deadline | — | **11/06/2026** (janela de apostas ABERTA agora) |

---

## 1. GUARD RAILS (INVIOLÁVEIS)

1. **Nenhuma trilha deste documento escreve no banco, muda config de admin, faz carga ou ataca o domínio.** Só leitura e função pura.
2. **Proibido rodar `scripts/seed*.ts` contra produção** (faz `DELETE FROM matches` e recriaria tudo, quebrando os 2741 palpites reais).
3. **Read-only contra produção** é tolerável só pra inspeção pontual (ex: 1 `GET` de headers, leitura de RLS via SQL). E2E/a11y rodam contra o **dev local** (`npm run dev`).
4. **Sem credenciais reais no repo.**
5. Qualquer dúvida sobre destino → **PARAR e perguntar.**

> Antes de qualquer script que use a service key, confirmar que não vai escrever:
> trilhas A só fazem `SELECT`. Se algum dia precisar de escrita, é sinal de que
> saiu do escopo deste documento.

---

## 2. TRILHA A — SEGURO RODAR AGORA

### A1. Unit + property-based (Vitest — já temos)
Expandir a suíte atual cobrindo as libs puras (sem rede/DB):
- `src/lib/scoring.ts` — pontos de grupo e mata-mata
- `src/lib/classification.ts` — desempate FIFA Art. 19 (h2h) + 8 melhores 3ºs
- `src/lib/bracket-2026.ts` — Annex C, resolverBracketR32, detectarEmpateTerceiros
- `src/lib/prizes.ts` — rateio + empates
- `src/lib/mata-mata-picks.ts` — aplicarPick, filtrarPicksPorR32

Property-based (`fast-check`) p/ invariantes:
- pontuação de grupo sempre ∈ [0, placar_exato]
- rateio soma 100% do arrecadado (tolerância de centavo)
- ordem dos palpites não muda o total
- rateio monotônico (mais pontos ⇒ prêmio ≥)

```bash
npm i -D fast-check
npm test
```
> Cobertura alvo nas libs de domínio: ≥ 90%. Não usar os thresholds globais do runbook original (quebrariam o CI atual).

### A2. Revisão estática de segurança (read-only)
- **RLS Supabase** (leitura): conferir políticas de `palpites_grupos`, `palpites_mata`, `palpites_artilheiro`, `users`, `config` — user só lê/escreve o próprio palpite; `config`/resultados admin-only.
  ```sql
  select schemaname, tablename, policyname, cmd, roles, qual, with_check
  from pg_policies order by tablename, policyname;
  ```
- **Auth nas rotas:** revisar `src/app/api/*` e Server Actions — toda mutação deriva o user de `auth.getUser()` (server), nunca de `userId` do body (anti-IDOR). Conferir `requireAdmin()` nas ações de admin.
- **Grep:** `dangerouslySetInnerHTML`, uso de `service_role`/`SUPABASE_SERVICE_ROLE_KEY` em client component, segredos `NEXT_PUBLIC_*` (só anon key pode ser pública).
- **Dependências:** `npm audit --audit-level=high`.
- **Headers (1 request read-only):** `curl -sI https://bolao-da-automanagem.vercel.app`.

### A3. Acessibilidade + UX no DEV LOCAL (opcional)
Contra `npm run dev`, logado num fake do seed, **sem salvar**: `@axe-core/playwright` nas 8 rotas, navegação por teclado, responsivo, touch targets ≥ 44px, Lighthouse.

### A4. E2E read-only (smoke) no DEV LOCAL (opcional)
Login com fake do seed e **só navegar/ler** as 8 telas (sem salvar palpite, sem criar conta, sem admin).

### A5. Edge cases PUROS (opcional)
Cenários de dados que são lógica pura (rateio com empates, overflow de pontuação, placar inválido, timezone em `lib/datetime`) viram testes Vitest. Cenários que mexem no estado do jogo (cancelamento, doping, W.O., prorrogação) viram **checklist manual** pro admin — não automação.

---

## 3. TRILHA C — REGRESSÃO (read-only)

- **BUG-001 (pontuação mata-mata ≠ /regras): JÁ CORRIGIDO** no QW6 (share + header leem a config: 8·16·20·24·30·50). Vira teste de não-regressão (unit sobre a config / comparação read-only).
- **BUG-002 ("MATA + ART. 31+1" deveria ser 32+1):** contagem de exibição em /meus-resultados — checar read-only.
- **BUG-003 (/pagamento trava ao clicar):** possível Web Locks/Web Share API (ver memória) — reproduzir no dev local.
- **BUG-004 (sidebar logada aparecendo deslogado):** verificar no dev local.
- **BUG-005 (texto ambíguo em /regras):** cosmético (P3).

---

## 4. ❌ FORA DE ESCOPO (removido de propósito — NUNCA contra produção)

Estas categorias do runbook original **foram retiradas** porque, sem staging,
só poderiam rodar contra a produção e **corromperiam dados reais ou
derrubariam/encareceriam o app** na janela de apostas. **Não recriar/automatizar
sem um ambiente isolado dedicado:**

- Integração que **escreve** (palpites/resultados/recálculo/ranking)
- E2E que **salva** (autosave, cadastro de conta)
- Segurança **ativa** (SQL/NoSQL injection, brute force, rate-limit, deadline bypass, IDOR com escrita)
- **Carga** (k6: smoke/stress/spike/endurance)
- **Admin flows** (lançar resultado, confirmar pagamento, alterar pontuação/rateio/deadline/valor)
- **Seed massivo** de usuários falsos

> Se um dia houver necessidade real disso, o pré-requisito é um **projeto
> Supabase separado (staging)** + deploy de preview próprio. Enquanto isso não
> existir, estas categorias permanecem fora de escopo.

---

## 5. STACK — COMANDOS REAIS DO PROJETO

```bash
npm test                 # vitest run (hoje 65 testes)
npm run build            # next build (NODE_OPTIONS de heap em máquina fraca)
npm run lint
npm i -D fast-check      # p/ A1
```
- Migrations: SQL (Supabase), não `prisma migrate`. Sem `pnpm`, sem `DATABASE_URL`/psql.

---

## 6. ORDEM E VEREDITO

1. **A1** (unit/property) — maior valor, risco zero; cobre o coração financeiro (pontos + rateio + desempate).
2. **A2** (revisão estática de segurança) — pega IDOR/RLS/headers sem tocar em nada.
3. A3/A4/A5 (a11y, E2E read-only, edge puros) — opcionais, quando der.
4. Trilha C — fechar não-regressão do que já corrigimos.

**Veredito:** rodar A1 + A2 agora (seguro). Todo o resto (escrita/carga/admin/ataque) está fora de escopo até existir um ambiente isolado.
