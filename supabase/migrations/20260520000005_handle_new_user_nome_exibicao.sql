-- =====================================================================
-- QW3 Item 11 — Atualiza trigger handle_new_user pra setar nome_exibicao
-- Sem isso, signUp dispara erro NOT NULL na coluna nome_exibicao
-- (adicionada em 20260520000004_nome_exibicao.sql)
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_primeiro_nome text;
begin
  v_nome := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1));
  v_primeiro_nome := trim(split_part(v_nome, ' ', 1));

  insert into public.users (id, nome, email, telefone, nome_exibicao)
  values (
    new.id,
    v_nome,
    new.email,
    new.raw_user_meta_data->>'telefone',
    case
      when v_primeiro_nome = '' then split_part(new.email, '@', 1)
      else v_primeiro_nome
    end
  );
  return new;
end;
$$;
