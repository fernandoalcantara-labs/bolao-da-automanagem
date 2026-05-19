-- =====================================================================
-- Item 10 — Nome de exibição (público) separado do nome completo (privado)
-- (sem unique constraint — nomes podem se repetir entre amigos)
-- =====================================================================

alter table public.users
  add column if not exists nome_exibicao text;

-- Preenche valor inicial pra usuários existentes (= primeiro nome)
update public.users
  set nome_exibicao = trim(split_part(nome, ' ', 1))
  where nome_exibicao is null;

-- Torna NOT NULL
alter table public.users
  alter column nome_exibicao set not null;

-- RLS: usuário pode atualizar o próprio (já permitido pela policy users_update_self)
