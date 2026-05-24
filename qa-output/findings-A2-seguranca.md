# 🔐 A2 — Revisão estática de segurança (read-only)

> Trilha A2 do `QA_RUNBOOK_ADAPTADO.md`. Tudo aqui foi feito **sem escrever
> nada** no banco: leitura de código + 1 sonda read-only com a anon key
> (`scripts/probe-rls.ts`) + `npm audit` + 1 `curl -I` de headers.
> Data: 2026-05-22.

## Resumo

| # | Achado | Severidade |
|---|---|---|
| F1 | Tabela `users` expõe **email / telefone / role** pra anônimo | **P1** |
| F2 | Faltam headers de segurança (X-Frame-Options/CSP, nosniff, Referrer/Permissions-Policy) | P2 |
| F3 | `npm audit`: Next 14.2.18 com advisories high/critical | P2 |
| F4 | `ranking_snapshots` legível por anônimo p/ todos (inclui não-pagos) | P3 |
| F5 | Header `X-Powered-By: Next.js` (info disclosure) | P3 |
| — | ⚠️ A confirmar: IDOR de usuário **logado** lendo palpite alheio (precisa de token) | a verificar |

Pontos **OK** (sem problema): palpites com RLS funcionando, rotas de API
admin-gated, sem `dangerouslySetInnerHTML`, action de perfil sem IDOR,
admin client só no servidor.

---

## ✅ O que está correto

- **RLS dos palpites funciona (anon):** `palpites_grupos`, `palpites_mata`,
  `palpites_artilheiro` retornaram **0 linhas** sem login. Bets protegidas do público. ✔
- **Rotas de API protegidas:** `recalcular` e `admin/backup-csv` exigem
  `role === "admin"` (403 senão); `sync-matches` aceita `Bearer CRON_SECRET`
  **ou** admin; `cron/backup-deadline` exige `Bearer CRON_SECRET`. ✔
- **Sem sink de XSS:** zero `dangerouslySetInnerHTML` em `src/`. ✔
- **Sem IDOR na action de perfil:** `atualizarPerfilAction` deriva o user de
  `auth.getUser()` e faz `.eq("id", authUser.id)` — nunca um id do input. ✔
- **Service role só no servidor:** `createAdminClient` aparece em API routes,
  Server Actions e Server Components (`dashboard-publico.tsx` **não** é
  `"use client"`). Nenhum vazamento da service key pro browser. ✔
- **HSTS presente:** `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. ✔

---

## 🔴 F1 (P1) — `users` expõe email/telefone/role pra anônimo

**Evidência (sonda anon, sem login):**
```
users: retornou 45 linha(s) sem login
  amostra: {"id":"...","nome":"Diego Pinto","email":"usuario21@test.com",
            "telefone":null,"pago":false,"role":"user"}
```
Qualquer pessoa com a **anon key** (que é pública — está no bundle JS de todo
visitante) consegue listar **e-mail de todos os participantes** (e `telefone`
se preenchido, e `role` — revela quem é admin).

- **Impacto:** coleta de e-mails/telefones de todos os apostadores
  (spam/phishing), exposição de quem é admin. Questão de privacidade (LGPD),
  já valendo em produção com gente real.
- **Por quê acontece:** a policy de SELECT em `users` permite ao papel
  anon/authenticated ler a tabela inteira (todas as colunas). RLS é
  row-level, não column-level — então "deixar ler" deixa ler tudo.

**Correção recomendada (precisa de migração + verificação, NÃO aplicada aqui):**
O dashboard público lê agregados via **service_role** (server, bypassa RLS),
então provavelmente o cliente não precisa ler `users` alheio direto. Opções:
1. **Restringir SELECT ao próprio usuário** (`auth.uid() = id`); o público
   (ranking/aggregates) continua vindo do server via service_role. Mais
   simples — **verificar antes** se algum componente client lê `users` de
   outros via anon (checar `header.tsx`, `usuarios-table.tsx`).
2. **VIEW pública** `public_users(id, nome, nome_exibicao, pago)` pro que é
   realmente público, e travar `users` ao dono.
3. **Column-level GRANT**: revogar SELECT de `email,telefone,role` pra
   anon/authenticated, manter nas colunas seguras.

> Recomendo (1) + checagem dos 2 componentes client. Como é mudança de
> policy em produção, fazer com cuidado e re-rodar `scripts/probe-rls.ts`
> pra confirmar que `users` passa a vir 0 (anon) e que o app não quebrou.

---

## 🟠 F2 (P2) — Headers de segurança ausentes

`curl -I` na produção só trouxe HSTS. Não vieram:
`X-Frame-Options`/`Content-Security-Policy frame-ancestors` (anti-clickjacking),
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.

**Correção:** adicionar `headers()` no `next.config.mjs` (ou middleware):
```js
async headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ],
  }];
}
```
(CSP completo dá mais trabalho por causa de inline/flagcdn; dá pra começar com `frame-ancestors 'self'`.)

---

## 🟠 F3 (P2) — Dependências (Next.js) com advisories

`npm audit`: **10 vulns (1 critical, 3 high, 6 moderate)**, concentradas no
`next@14.2.18` (e `postcss` transitivo): SSRF via WebSocket upgrade, cache
poisoning em RSC, bypass de middleware no Pages Router i18n, XSS no postcss.

- **Aplicabilidade aqui:** o app é App Router (não Pages Router i18n → esse
  não se aplica). Os de RSC/SSRF valem avaliar.
- **Correção:** `npm audit fix --force` quer `next@16` (breaking, arriscado a
  ~20 dias da Copa). **Melhor:** subir pro último **patch 14.2.x** (ex.:
  14.2.33+), que corrige a maioria sem quebrar. Testar build + smoke depois.

---

## 🟡 F4 (P3) — `ranking_snapshots` público p/ todos

Anon leu **405 linhas** de `ranking_snapshots` (todos os users × rodadas,
incluindo **não-pagos**). O ranking é público por design, mas o app só
mostra pagos; a tabela crua expõe pontos de quem não paga também. Baixo
impacto (é dado de jogo, não PII). Opcional: filtrar por `pago` ou expor via
view só dos pagos.

## 🟡 F5 (P3) — `X-Powered-By: Next.js`

Info disclosure menor. Corrigir com `poweredByHeader: false` no `next.config`.

---

## ⚠️ A confirmar (não dava pra testar sem token de usuário logado)

- **IDOR autenticado:** a sonda prova que **anon** não lê palpites. Falta
  confirmar que um usuário **logado** só lê os **próprios** palpites (e não os
  dos outros) — a policy do papel `authenticated` pode estar mais frouxa que a
  do `anon`. Verificar a policy de SELECT de `palpites_*` (deve ser
  `auth.uid() = user_id`). Teste empírico exige 2 contas logadas (fora do
  escopo read-only; faria parte da trilha que precisa de staging).

---

## Como reproduzir
```bash
npx tsx scripts/probe-rls.ts          # sonda RLS read-only (anon key)
npm audit --audit-level=high
curl -sI https://bolao-da-automanagem.vercel.app
```

## Prioridade sugerida
1. **F1** (email/telefone/role) — fechar antes de mais gente real preencher telefone.
2. Verificar o **IDOR autenticado** dos palpites.
3. F2 + F5 (headers) — rápido, no `next.config`.
4. F3 (bump Next 14.2.x) — testar com calma.
5. F4 — opcional.
