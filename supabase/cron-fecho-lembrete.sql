-- Agendar invocacao diaria da Edge Function fecho-lembrete (08:00 UTC).
-- A funcao so envia emails no dia 5; nos outros dias responde skipped.
-- Correr no SQL Editor do Supabase Dashboard (uma vez).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname = 'fecho-lembrete-diario';

select cron.schedule(
  'fecho-lembrete-diario',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://eubmkgmkxfxsfxeohylu.supabase.co/functions/v1/fecho-lembrete',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
