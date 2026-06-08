-- =====================================================================
-- PARTE 4B — Chave de atualização automática (freio do cron)
-- =====================================================================
-- Quando false, o /api/sync-matches chamado VIA CRON retorna cedo sem
-- escrever. A sync MANUAL do admin continua funcionando. Default true.
-- Idempotente (não sobrescreve se a chave já existir).

insert into public.config (chave, valor) values ('sync_automatico', 'true'::jsonb)
on conflict (chave) do nothing;
