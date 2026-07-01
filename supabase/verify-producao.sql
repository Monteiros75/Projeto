-- Verificacao rapida antes de publicar (correr no SQL Editor do Supabase)
-- Se alguma linha devolver "FALTA", corrige antes de abrir o site ao publico.

-- 1) Tabelas essenciais
select
  t.tabela,
  case when c.relname is not null then 'OK' else 'FALTA' end as estado
from (
  values
    ('nucleos'),
    ('movimentos'),
    ('fechos_mensais'),
    ('documentos_extras'),
    ('documentos_modelos'),
    ('planos'),
    ('plano_linhas'),
    ('eventos'),
    ('evento_linhas')
) as t(tabela)
left join pg_class c on c.relname = t.tabela and c.relnamespace = 'public'::regnamespace
order by t.tabela;

-- 2) Colunas recentes (planos + fecho)
select
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'planos' and column_name = 'mandato_inicio'
  ) then 'OK planos.mandato_inicio' else 'FALTA planos.mandato_inicio' end as planos_mandato_inicio,
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'planos' and column_name = 'seccoes'
  ) then 'OK planos.seccoes' else 'FALTA planos.seccoes' end as planos_seccoes,
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'evento_linhas' and column_name = 'tipo'
  ) then 'OK evento_linhas.tipo' else 'FALTA evento_linhas.tipo — corre migrate-evento-linhas-tipo.sql' end as evento_linhas_tipo,
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fechos_mensais' and column_name = 'fechado_em'
  ) then 'OK fechos_mensais.fechado_em' else 'FALTA fechos_mensais.fechado_em' end as fecho_fechado_em;

-- 3) RLS activo
select
  c.relname as tabela,
  c.relrowsecurity as rls_ativo
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'nucleos', 'movimentos', 'fechos_mensais', 'planos', 'plano_linhas', 'eventos', 'evento_linhas'
  )
order by c.relname;

-- 4) Bucket Storage (deve existir "nucleos", privado)
select id, name, public from storage.buckets where name = 'nucleos';

-- 5) Policies do bucket (esperado >= 4)
select count(*) as policies_storage_nucleos
from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'Nucleos storage:%';
