# 🏆 Bolão da AutoManagem · Copa do Mundo FIFA 2026

Web app para um bolão entre amigos da **Copa do Mundo FIFA 2026** (EUA, Canadá e México · 11/06 a 19/07/2026).
Construído com **Next.js 14 + Supabase + Recharts + Tailwind/shadcn**.

> Powered by Claudio · O selo aparece no header de toda página, junto do ícone do Claude (Anthropic).

---

## ✨ Funcionalidades

- **Palpites de placar exato** para os 72 jogos da fase de grupos
- **Palpites de mata-mata** (16 avos → 8 avos → quartas → semi → final → campeão) com constraints automáticas entre etapas
- **Palpite de artilheiro** com busca por jogador/seleção
- **Painel público** (acessível mesmo sem login) com:
  - Ranking ao vivo
  - 6 KPIs (participantes pagos, total arrecadado, jogos disputados, líder, top da rodada, média)
  - **📈 Gráfico multi-linhas** mostrando a posição de cada participante ao longo das 8 rodadas (destaque)
  - 📊 Barras: pontos por participante na última rodada
  - 🔥 Heatmap (participantes × rodadas, cor por pontos)
  - 🥧 Pizzas: distribuição de palpites para campeão e artilheiro
  - Confrontos da rodada atual
- **Admin** completo:
  - CRUD de jogos com override manual contra a API
  - Toggle de pagamento por usuário (somente pagos aparecem no ranking público)
  - Edição de pontuação, rateio (60/20/10/10), PIX e valor da aposta
  - Botões "Sincronizar com football-data.org" e "Recalcular"
- **Sync automático** via cron Vercel a cada 10 min (consulta `football-data.org`)
- **RLS** ativo: usuários só veem palpites dos outros após o deadline da fase de grupos

---

## 🚀 Setup em 6 passos

### 1) Clone e instale

```bash
cd C:\projetos\BolaoCopa
npm install
```

### 2) Crie um projeto no Supabase

1. Vá em https://app.supabase.com → **New Project**
2. Escolha região São Paulo se possível (latência menor)
3. Anote a senha do banco
4. Em **Settings → API**, copie:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (segredo!)

### 3) Pegue uma chave gratuita da football-data.org

1. Acesse https://www.football-data.org/client/register
2. Confirme o email → você recebe a `API key`
3. Use como `FOOTBALL_DATA_API_KEY`

> Plano gratuito tem limite de 10 requisições/minuto — o sync já respeita.

### 4) Configure as variáveis de ambiente

Crie `.env.local` na raiz copiando de `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
FOOTBALL_DATA_API_KEY=sua_chave
CRON_SECRET=qualquer-string-aleatoria-segura
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5) Aplique as migrations no Supabase

**Opção A — Via SQL Editor (mais simples):**

1. No painel do Supabase, vá em **SQL Editor**
2. Cole o conteúdo de `supabase/migrations/20260515000001_initial_schema.sql` e execute
3. Cole o conteúdo de `supabase/migrations/20260515000002_rls_policies.sql` e execute

**Opção B — Via Supabase CLI:**

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

### 6) Rode o seed (popula o banco com 30 usuários fictícios + simulação completa)

```bash
npm run seed
```

Isso vai:
- Inserir 48 seleções nos 12 grupos
- Inserir 50 jogadores candidatos a artilheiro
- Criar os 72 jogos da fase de grupos
- Criar 30 usuários (`usuario1@test.com` … `usuario30@test.com`, **senha `senha123`**) com palpites completos
- Simular **todos** os resultados até a final
- Gerar as 8 ranking_snapshots (alimentam o gráfico multi-linhas)

**Login de admin pós-seed:** `usuario1@test.com` / `senha123`

### 7) Suba o servidor de dev

```bash
npm run dev
```

Abra http://localhost:3000.

---

## 🧪 Testes

A função de pontuação tem testes unitários (parte crítica). Para rodar:

```bash
npm test            # roda uma vez
npm run test:watch  # watch mode
```

---

## 🎨 Criar o primeiro admin (sem seed)

Caso prefira não usar o seed e usar dados reais:

1. Cadastre-se normalmente em `/cadastro`
2. No SQL Editor do Supabase, rode:

```sql
UPDATE public.users SET role = 'admin', pago = true WHERE email = 'seu@email.com';
```

3. Recarregue a página — você verá o link "Admin" no header.

---

## 🌐 Deploy na Vercel

1. Faça push do projeto pro GitHub
2. Em https://vercel.com/new, importe o repo
3. Adicione as **mesmas variáveis** do `.env.local` na seção Environment Variables
4. Deploy
5. O `vercel.json` já configura o cron de 10 em 10 minutos pra `/api/sync-matches`

> O cron passa um header `Authorization: Bearer <CRON_SECRET>`. Configure isso em **Settings → Cron Secrets** do projeto Vercel (ou simplesmente exporte como env var — o endpoint aceita ambos).

---

## 🗂️ Estrutura de pastas

```
BolaoCopa/
├── src/
│   ├── app/                          ← Rotas (App Router)
│   │   ├── page.tsx                  ← Painel público
│   │   ├── login/                    ← Login
│   │   ├── cadastro/                 ← Cadastro
│   │   ├── pagamento/                ← Tela PIX
│   │   ├── palpites/
│   │   │   ├── grupos/               ← Placares dos 72 jogos
│   │   │   ├── mata-mata/            ← Bracket pick por fase
│   │   │   └── artilheiro/           ← Escolha do goleador
│   │   ├── admin/                    ← Tudo do admin
│   │   ├── api/
│   │   │   ├── sync-matches/         ← Cron: puxa da football-data.org
│   │   │   └── recalcular/           ← Recálculo manual
│   │   └── layout.tsx                ← Header + Footer global
│   │
│   ├── components/
│   │   ├── layout/                   ← Header, Footer, "Powered by Claudio"
│   │   ├── dashboard/                ← Painel público (charts, KPIs)
│   │   ├── misc/                     ← Countdown
│   │   └── ui/                       ← shadcn/ui (button, card, input…)
│   │
│   ├── lib/
│   │   ├── supabase/                 ← Clients (browser, server, admin)
│   │   ├── scoring.ts                ← Engine de pontuação
│   │   ├── classification.ts         ← Cascata FIFA de desempate
│   │   ├── recalc.ts                 ← Recalcula tudo + snapshots
│   │   ├── football-data.ts          ← Cliente da API externa
│   │   ├── auth-helpers.ts           ← requireUser/requireAdmin
│   │   └── utils.ts                  ← cn(), formatadores
│   │
│   ├── data/
│   │   └── world-cup-2026.ts         ← Grupos, jogos, candidatos
│   └── types/
│       └── database.ts               ← Tipos dos Row/Insert/Update
│
├── supabase/migrations/              ← SQL (schema + RLS)
├── scripts/seed.ts                   ← Seed completo
├── tests/scoring.test.ts             ← Testes da pontuação
└── vercel.json                       ← Cron de sync
```

---

## 🎯 Sistema de pontuação (default, editável)

| Item | Pontos | Quantas vezes |
|---|---|---|
| Fase de grupos: placar exato | 5 | até 72 acertos |
| Fase de grupos: só vencedor/empate | 2 | até 72 acertos |
| Time chega às oitavas (passou do R32) | 8 | até 16 acertos |
| Time chega às quartas | 12 | até 8 |
| Time chega às semis | 16 | até 4 |
| Time chega à final | 20 | até 2 |
| Vice-campeão | 24 | 1 |
| Campeão | 40 | 1 |
| Artilheiro | 24 | 1 |

> A classificação das 32 seleções pro Round of 32 sai **automaticamente** dos resultados da fase de grupos (regulamento FIFA — pontos, saldo, gols pró, confronto direto; melhores 8 terceiros entre os 12 grupos). Por isso o usuário **não palpita** essa primeira fase do mata-mata: ele começa marcando quem vai chegar às oitavas.

**Rateio do prêmio:** 60% / 20% / 10% / 10% (artilheiro).

Tudo isso pode ser ajustado em `/admin/config` sem precisar de novo deploy.

---

## ⚠️ Pendências conhecidas

- **Times TBD nos grupos** — 5 vagas dependem dos playoffs Europeu e Intercontinental de março/2026. O seed marca essas seleções com `tbd: true` e o admin pode renomear depois em `/admin/jogos` (em uma futura iteração) ou via SQL.
- **Bandeiras de Inglaterra/Escócia** dependem do flagcdn suportar `gb-eng` e `gb-sct` — caso falhe, edite manualmente.
- **Privacy:** o RLS impede acesso a palpites alheios antes de 11/06/2026 20:00 EDT. Após isso, qualquer usuário autenticado pode ler todos os palpites.

---

## 📞 Contato

Powered by **Claudio** (Anthropic Claude). Issues e ideias: abra um issue no repositório.
