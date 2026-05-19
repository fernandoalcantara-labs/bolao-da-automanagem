-- =====================================================================
-- Item 10 — Nome de exibição (público) separado do nome completo (privado)
-- =====================================================================

alter table public.users
  add column if not exists nome_exibicao text;

-- Preenche valor inicial pra usuários existentes (= primeiro nome ou nome inteiro)
update public.users
  set nome_exibicao = trim(split_part(nome, ' ', 1))
  where nome_exibicao is null;

-- Em seguida, torna NOT NULL
alter table public.users
  alter column nome_exibicao set not null;

-- Unicidade case-insensitive
create unique index if not exists users_nome_exibicao_lower_idx
  on public.users (lower(nome_exibicao));

-- RLS: usuário pode atualizar o próprio (já permitido pela policy users_update_self)
