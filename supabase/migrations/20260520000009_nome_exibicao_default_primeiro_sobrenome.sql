-- =====================================================================
-- QW3 Item 16 — Default do nome_exibicao agora inclui primeiro sobrenome
--
-- Antes: handle_new_user setava nome_exibicao = primeiro nome (split_part)
-- Agora: nome_exibicao = primeiro nome + segunda palavra do nome completo
--
-- Exemplo: 'Fernando Aparecido da Silva'
--   - Antes:  nome_exibicao = 'Fernando'
--   - Agora:  nome_exibicao = 'Fernando Aparecido'
--
-- O usuario pode SEMPRE editar via /perfil pra 'Fernandinho', 'FS',
-- 'Fernando Silva' etc — esse e' apenas o valor inicial pra desambiguar
-- usuarios com mesmo primeiro nome.
--
-- Backfill: atualiza users existentes APENAS onde nome_exibicao ainda
-- esta com o primeiro nome simples (ou seja, nao foi personalizado).
-- =====================================================================

-- 1) Atualiza trigger pra novos signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_nome_trim text;
  v_primeira text;
  v_segunda text;
  v_exibicao text;
begin
  v_nome := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1));
  v_nome_trim := trim(v_nome);
  v_primeira := split_part(v_nome_trim, ' ', 1);
  v_segunda := split_part(v_nome_trim, ' ', 2);

  -- Se tiver segunda palavra (sobrenome), junta. Senao, usa so' a primeira.
  if v_segunda = '' then
    v_exibicao := case when v_primeira = '' then split_part(new.email, '@', 1) else v_primeira end;
  else
    v_exibicao := v_primeira || ' ' || v_segunda;
  end if;

  insert into public.users (id, nome, email, telefone, nome_exibicao)
  values (
    new.id,
    v_nome,
    new.email,
    new.raw_user_meta_data->>'telefone',
    v_exibicao
  );
  return new;
end;
$$;

-- 2) Backfill: users cujo nome_exibicao == primeira palavra do nome
--    (significa que foi setado pelo trigger antigo, nao personalizado).
--    Soh' atualiza se a nova regra produzir algo DIFERENTE.
update public.users u
set nome_exibicao = trim(split_part(u.nome, ' ', 1)) || ' ' || trim(split_part(u.nome, ' ', 2))
where trim(u.nome_exibicao) = trim(split_part(u.nome, ' ', 1))
  and split_part(trim(u.nome), ' ', 2) <> '';
