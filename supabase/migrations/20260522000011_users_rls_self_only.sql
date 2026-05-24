-- =====================================================================
-- FIX F1 (revisão de segurança A2) — fecha vazamento de PII na tabela users
-- =====================================================================
-- ANTES: a policy `users_select_public ... for select using (true)` deixava
-- QUALQUER um (anon/authenticated) ler a tabela users INTEIRA, incluindo
-- email, telefone e role de todos os participantes (a anon key é pública).
-- RLS é row-level, não column-level — então `using(true)` expôs tudo.
--
-- AGORA:
--   - usuário autenticado lê SOMENTE a própria linha (id = auth.uid())
--   - admin lê todos (policy users_admin_all já existente)
--   - service_role (admin client no servidor) continua lendo tudo (bypassa RLS)
--   - anon não lê nada de users
--
-- As leituras públicas agregadas que precisavam de outros usuários
-- (contagem de pagantes em layout/regras, nomes do ranking no
-- dashboard-publico) usam o admin client (service_role) no servidor — já
-- ajustadas no código junto deste fix.
--
-- Idempotente: pode rodar mais de uma vez.

-- remove a policy permissiva que vazava tudo
drop policy if exists users_select_public on public.users;

-- SELECT só da própria linha (admin coberto por users_admin_all)
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select using (id = auth.uid());

-- Sanity: as outras policies de users permanecem como estavam
--   users_update_self  (update da própria linha, sem trocar role)
--   users_insert_self  (insert da própria linha)
--   users_admin_all    (admin: acesso total — cobre SELECT de todos)
