-- =========================================================================
-- Esquema Supabase para a tesouraria-app
-- Correr no SQL Editor do Supabase apos criar o projeto e o bucket "nucleos".
-- =========================================================================

-- -------------------------------------------------------------------------
-- Tabela: nucleos (perfil do nucleo, 1:1 com auth.users)
-- -------------------------------------------------------------------------
create table if not exists public.nucleos (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_nucleo text not null,
  associacao_academica text,
  nome_tesoureiro text,
  nome_presidente text,
  email text,
  email_contacto text,
  role text not null default 'nucleo_admin',
  tem_conta_bancaria boolean not null default false,
  iban text,
  saldo_atual_caixa numeric(12, 2) not null default 0,
  saldo_atual_banco numeric(12, 2) not null default 0,
  data_referencia_saldos date,
  observacoes text,
  logo_path text,
  onboarding_completo boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Tabela: movimentos
-- -------------------------------------------------------------------------
create table if not exists public.movimentos (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  tipo_conta text not null check (tipo_conta in ('caixa', 'banco')),
  natureza text not null check (natureza in ('recebimento', 'pagamento')),
  data date not null,
  numero_documento text,
  descricao text,
  valor numeric(12, 2) not null check (valor >= 0),
  month_ref text not null,
  fatura_ou_oficio_path text,
  comprovativo_banco_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists movimentos_nucleo_month_data_idx
  on public.movimentos (nucleo_id, month_ref, data);

-- -------------------------------------------------------------------------
-- Tabela: fechos_mensais (1 linha por nucleo + mes)
-- -------------------------------------------------------------------------
create table if not exists public.fechos_mensais (
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  month_ref text not null,
  saldo_anterior_caixa numeric(12, 2) not null default 0,
  saldo_anterior_banco numeric(12, 2) not null default 0,
  extrato_path text,
  itens_impressos jsonb not null default '{}'::jsonb,
  fechado_em timestamptz,
  lembrete_fecho_enviado_em timestamptz,
  updated_at timestamptz not null default now(),
  primary key (nucleo_id, month_ref)
);

-- -------------------------------------------------------------------------
-- Trigger generico para manter updated_at
-- -------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_nucleos_updated_at on public.nucleos;
create trigger trg_nucleos_updated_at
  before update on public.nucleos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_movimentos_updated_at on public.movimentos;
create trigger trg_movimentos_updated_at
  before update on public.movimentos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_fechos_mensais_updated_at on public.fechos_mensais;
create trigger trg_fechos_mensais_updated_at
  before update on public.fechos_mensais
  for each row execute function public.set_updated_at();

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.nucleos enable row level security;
alter table public.movimentos enable row level security;
alter table public.fechos_mensais enable row level security;

-- ---- nucleos: cada utilizador so pode aceder ao seu proprio perfil
drop policy if exists "Nucleos: select proprio" on public.nucleos;
create policy "Nucleos: select proprio"
  on public.nucleos for select
  using (id = auth.uid());

drop policy if exists "Nucleos: insert proprio" on public.nucleos;
create policy "Nucleos: insert proprio"
  on public.nucleos for insert
  with check (id = auth.uid());

drop policy if exists "Nucleos: update proprio" on public.nucleos;
create policy "Nucleos: update proprio"
  on public.nucleos for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Nucleos: delete proprio" on public.nucleos;
create policy "Nucleos: delete proprio"
  on public.nucleos for delete
  using (id = auth.uid());

-- ---- movimentos: so do proprio nucleo
drop policy if exists "Movimentos: select proprio" on public.movimentos;
create policy "Movimentos: select proprio"
  on public.movimentos for select
  using (nucleo_id = auth.uid());

drop policy if exists "Movimentos: insert proprio" on public.movimentos;
create policy "Movimentos: insert proprio"
  on public.movimentos for insert
  with check (nucleo_id = auth.uid());

drop policy if exists "Movimentos: update proprio" on public.movimentos;
create policy "Movimentos: update proprio"
  on public.movimentos for update
  using (nucleo_id = auth.uid())
  with check (nucleo_id = auth.uid());

drop policy if exists "Movimentos: delete proprio" on public.movimentos;
create policy "Movimentos: delete proprio"
  on public.movimentos for delete
  using (nucleo_id = auth.uid());

-- ---- fechos_mensais: so do proprio nucleo
drop policy if exists "Fechos: select proprio" on public.fechos_mensais;
create policy "Fechos: select proprio"
  on public.fechos_mensais for select
  using (nucleo_id = auth.uid());

drop policy if exists "Fechos: insert proprio" on public.fechos_mensais;
create policy "Fechos: insert proprio"
  on public.fechos_mensais for insert
  with check (nucleo_id = auth.uid());

drop policy if exists "Fechos: update proprio" on public.fechos_mensais;
create policy "Fechos: update proprio"
  on public.fechos_mensais for update
  using (nucleo_id = auth.uid())
  with check (nucleo_id = auth.uid());

drop policy if exists "Fechos: delete proprio" on public.fechos_mensais;
create policy "Fechos: delete proprio"
  on public.fechos_mensais for delete
  using (nucleo_id = auth.uid());

-- =========================================================================
-- Storage: bucket "nucleos" (criar manualmente em Storage > New bucket, privado)
-- Cada utilizador so pode operar sobre objetos cujo path comece pelo seu uid.
-- =========================================================================
drop policy if exists "Nucleos storage: select proprio" on storage.objects;
create policy "Nucleos storage: select proprio"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'nucleos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Nucleos storage: insert proprio" on storage.objects;
create policy "Nucleos storage: insert proprio"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'nucleos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Nucleos storage: update proprio" on storage.objects;
create policy "Nucleos storage: update proprio"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'nucleos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'nucleos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Nucleos storage: delete proprio" on storage.objects;
create policy "Nucleos storage: delete proprio"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'nucleos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -------------------------------------------------------------------------
-- Documentos: uploads manuais (area Documentos) e modelos oficio/errata
-- -------------------------------------------------------------------------
create table if not exists public.documentos_extras (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  month_ref text not null,
  tipo_conta text not null check (tipo_conta in ('caixa', 'banco')),
  tipo_documento text not null check (tipo_documento in (
    'fatura', 'oficio', 'extrato_bancario', 'errata', 'comprovativo_pagamento'
  )),
  storage_path text not null,
  titulo text,
  movimento_id uuid references public.movimentos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documentos_extras_nucleo_month_idx
  on public.documentos_extras (nucleo_id, month_ref);

create table if not exists public.documentos_modelos (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  month_ref text not null,
  tipo_conta text not null default 'caixa' check (tipo_conta in ('caixa', 'banco')),
  modelo text not null check (modelo in ('oficio', 'errata')),
  titulo text,
  corpo text not null default '',
  outros_nucleos text,
  data_documento date not null default (CURRENT_DATE),
  movimento_id uuid references public.movimentos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documentos_modelos_nucleo_month_idx
  on public.documentos_modelos (nucleo_id, month_ref);

drop trigger if exists trg_documentos_extras_updated_at on public.documentos_extras;
create trigger trg_documentos_extras_updated_at
  before update on public.documentos_extras
  for each row execute function public.set_updated_at();

drop trigger if exists trg_documentos_modelos_updated_at on public.documentos_modelos;
create trigger trg_documentos_modelos_updated_at
  before update on public.documentos_modelos
  for each row execute function public.set_updated_at();

alter table public.documentos_extras enable row level security;
alter table public.documentos_modelos enable row level security;

drop policy if exists "Documentos extras: select proprio" on public.documentos_extras;
create policy "Documentos extras: select proprio"
  on public.documentos_extras for select
  using (nucleo_id = auth.uid());

drop policy if exists "Documentos extras: insert proprio" on public.documentos_extras;
create policy "Documentos extras: insert proprio"
  on public.documentos_extras for insert
  with check (nucleo_id = auth.uid());

drop policy if exists "Documentos extras: update proprio" on public.documentos_extras;
create policy "Documentos extras: update proprio"
  on public.documentos_extras for update
  using (nucleo_id = auth.uid())
  with check (nucleo_id = auth.uid());

drop policy if exists "Documentos extras: delete proprio" on public.documentos_extras;
create policy "Documentos extras: delete proprio"
  on public.documentos_extras for delete
  using (nucleo_id = auth.uid());

drop policy if exists "Documentos modelos: select proprio" on public.documentos_modelos;
create policy "Documentos modelos: select proprio"
  on public.documentos_modelos for select
  using (nucleo_id = auth.uid());

drop policy if exists "Documentos modelos: insert proprio" on public.documentos_modelos;
create policy "Documentos modelos: insert proprio"
  on public.documentos_modelos for insert
  with check (nucleo_id = auth.uid());

drop policy if exists "Documentos modelos: update proprio" on public.documentos_modelos;
create policy "Documentos modelos: update proprio"
  on public.documentos_modelos for update
  using (nucleo_id = auth.uid())
  with check (nucleo_id = auth.uid());

drop policy if exists "Documentos modelos: delete proprio" on public.documentos_modelos;
create policy "Documentos modelos: delete proprio"
  on public.documentos_modelos for delete
  using (nucleo_id = auth.uid());

-- IBAN do nucleo (se a BD ja existia sem esta coluna)
alter table public.nucleos
  add column if not exists iban text;

-- Ligacao documento <-> movimento (se a BD ja existia sem estas colunas)
alter table public.documentos_extras
  add column if not exists movimento_id uuid references public.movimentos(id) on delete set null;

alter table public.documentos_modelos
  add column if not exists movimento_id uuid references public.movimentos(id) on delete set null;

-- Checklist de impressao para entrega em papel (fecho mensal)
alter table public.fechos_mensais
  add column if not exists itens_impressos jsonb not null default '{}'::jsonb;

alter table public.fechos_mensais
  add column if not exists fechado_em timestamptz;

alter table public.fechos_mensais
  add column if not exists lembrete_fecho_enviado_em timestamptz;

-- =========================================================================
-- Planos de Atividades e Orcamento (PAO) e Relatorio Anual de Contas
-- Ambos partilham a mesma estrutura: cabecalho (plano) + linhas por seccao.
--   tipo = 'pao'       -> valores previstos (inicio do mandato)
--   tipo = 'relatorio' -> valores reais (fim do mandato)
-- =========================================================================
create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  tipo text not null check (tipo in ('pao', 'relatorio')),
  titulo text not null,
  ano integer,
  mandato_inicio date,
  mandato_fim date,
  seccoes jsonb not null default '["Direção", "Secção Pedagógica", "Secção de Imagem", "Secção Recreativa e Cultural"]'::jsonb,
  introducao text,
  nota_final text,
  previsao_seccoes jsonb not null default '{}'::jsonb,
  pao_referencia_id uuid references public.planos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planos_nucleo_tipo_idx
  on public.planos (nucleo_id, tipo);

create table if not exists public.plano_linhas (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references public.planos(id) on delete cascade,
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  seccao text not null,
  designacao text not null default '',
  data_realizacao text,
  despesa_designacao text,
  despesa_valor numeric(12, 2) not null default 0,
  receita_designacao text,
  receita_valor numeric(12, 2) not null default 0,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plano_linhas_plano_idx
  on public.plano_linhas (plano_id, seccao, ordem);

drop trigger if exists trg_planos_updated_at on public.planos;
create trigger trg_planos_updated_at
  before update on public.planos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_plano_linhas_updated_at on public.plano_linhas;
create trigger trg_plano_linhas_updated_at
  before update on public.plano_linhas
  for each row execute function public.set_updated_at();

alter table public.planos enable row level security;
alter table public.plano_linhas enable row level security;

drop policy if exists "Planos: select proprio" on public.planos;
create policy "Planos: select proprio"
  on public.planos for select
  using (nucleo_id = auth.uid());

drop policy if exists "Planos: insert proprio" on public.planos;
create policy "Planos: insert proprio"
  on public.planos for insert
  with check (nucleo_id = auth.uid());

drop policy if exists "Planos: update proprio" on public.planos;
create policy "Planos: update proprio"
  on public.planos for update
  using (nucleo_id = auth.uid())
  with check (nucleo_id = auth.uid());

drop policy if exists "Planos: delete proprio" on public.planos;
create policy "Planos: delete proprio"
  on public.planos for delete
  using (nucleo_id = auth.uid());

drop policy if exists "Plano linhas: select proprio" on public.plano_linhas;
create policy "Plano linhas: select proprio"
  on public.plano_linhas for select
  using (nucleo_id = auth.uid());

drop policy if exists "Plano linhas: insert proprio" on public.plano_linhas;
create policy "Plano linhas: insert proprio"
  on public.plano_linhas for insert
  with check (nucleo_id = auth.uid());

drop policy if exists "Plano linhas: update proprio" on public.plano_linhas;
create policy "Plano linhas: update proprio"
  on public.plano_linhas for update
  using (nucleo_id = auth.uid())
  with check (nucleo_id = auth.uid());

drop policy if exists "Plano linhas: delete proprio" on public.plano_linhas;
create policy "Plano linhas: delete proprio"
  on public.plano_linhas for delete
  using (nucleo_id = auth.uid());

-- =========================================================================
-- Eventos: orcamento previsto por atividade (operacional, complementar ao PAO)
-- =========================================================================
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  nome text not null,
  data date,
  status text not null default 'planeado' check (status in ('planeado', 'realizado', 'cancelado')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists eventos_nucleo_data_idx
  on public.eventos (nucleo_id, data desc nulls last);

create table if not exists public.evento_linhas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  tipo text not null check (tipo in ('despesa', 'receita')),
  ordem integer not null default 0,
  nome text,
  valor_estimado numeric(12, 2) not null default 0,
  valor_real numeric(12, 2) not null default 0,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evento_linhas_evento_idx
  on public.evento_linhas (evento_id, tipo, ordem);

drop trigger if exists trg_eventos_updated_at on public.eventos;
create trigger trg_eventos_updated_at
  before update on public.eventos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_evento_linhas_updated_at on public.evento_linhas;
create trigger trg_evento_linhas_updated_at
  before update on public.evento_linhas
  for each row execute function public.set_updated_at();

alter table public.eventos enable row level security;
alter table public.evento_linhas enable row level security;

drop policy if exists "Eventos: select proprio" on public.eventos;
create policy "Eventos: select proprio"
  on public.eventos for select
  using (nucleo_id = auth.uid());

drop policy if exists "Eventos: insert proprio" on public.eventos;
create policy "Eventos: insert proprio"
  on public.eventos for insert
  with check (nucleo_id = auth.uid());

drop policy if exists "Eventos: update proprio" on public.eventos;
create policy "Eventos: update proprio"
  on public.eventos for update
  using (nucleo_id = auth.uid())
  with check (nucleo_id = auth.uid());

drop policy if exists "Eventos: delete proprio" on public.eventos;
create policy "Eventos: delete proprio"
  on public.eventos for delete
  using (nucleo_id = auth.uid());

drop policy if exists "Evento linhas: select proprio" on public.evento_linhas;
create policy "Evento linhas: select proprio"
  on public.evento_linhas for select
  using (nucleo_id = auth.uid());

drop policy if exists "Evento linhas: insert proprio" on public.evento_linhas;
create policy "Evento linhas: insert proprio"
  on public.evento_linhas for insert
  with check (nucleo_id = auth.uid());

drop policy if exists "Evento linhas: update proprio" on public.evento_linhas;
create policy "Evento linhas: update proprio"
  on public.evento_linhas for update
  using (nucleo_id = auth.uid())
  with check (nucleo_id = auth.uid());

drop policy if exists "Evento linhas: delete proprio" on public.evento_linhas;
create policy "Evento linhas: delete proprio"
  on public.evento_linhas for delete
  using (nucleo_id = auth.uid());

-- =========================================================================
-- Concelho Fiscal: submissao e revisao online do fecho mensal.
-- (replicado de supabase/migrate-concelho-fiscal.sql — manter os dois em sincronia)
-- =========================================================================
create table if not exists public.concelho_membros (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_concelho_membros_updated_at on public.concelho_membros;
create trigger trg_concelho_membros_updated_at
  before update on public.concelho_membros
  for each row execute function public.set_updated_at();

create table if not exists public.concelho_atribuicoes (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.concelho_membros(id) on delete cascade,
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (membro_id, nucleo_id)
);

alter table public.concelho_membros enable row level security;
alter table public.concelho_atribuicoes enable row level security;

drop policy if exists "Concelho membros: select proprio" on public.concelho_membros;
create policy "Concelho membros: select proprio"
  on public.concelho_membros for select
  using (id = auth.uid());

drop policy if exists "Concelho atribuicoes: select proprio" on public.concelho_atribuicoes;
create policy "Concelho atribuicoes: select proprio"
  on public.concelho_atribuicoes for select
  using (membro_id = auth.uid());

drop policy if exists "Nucleos: select concelho atribuido" on public.nucleos;
create policy "Nucleos: select concelho atribuido"
  on public.nucleos for select
  using (exists (
    select 1 from public.concelho_atribuicoes ca
    where ca.nucleo_id = nucleos.id and ca.membro_id = auth.uid()
  ));

drop policy if exists "Movimentos: select concelho atribuido" on public.movimentos;
create policy "Movimentos: select concelho atribuido"
  on public.movimentos for select
  using (exists (
    select 1 from public.concelho_atribuicoes ca
    where ca.nucleo_id = movimentos.nucleo_id and ca.membro_id = auth.uid()
  ));

drop policy if exists "Fechos: select concelho atribuido" on public.fechos_mensais;
create policy "Fechos: select concelho atribuido"
  on public.fechos_mensais for select
  using (exists (
    select 1 from public.concelho_atribuicoes ca
    where ca.nucleo_id = fechos_mensais.nucleo_id and ca.membro_id = auth.uid()
  ));

drop policy if exists "Documentos extras: select concelho atribuido" on public.documentos_extras;
create policy "Documentos extras: select concelho atribuido"
  on public.documentos_extras for select
  using (exists (
    select 1 from public.concelho_atribuicoes ca
    where ca.nucleo_id = documentos_extras.nucleo_id and ca.membro_id = auth.uid()
  ));

drop policy if exists "Documentos modelos: select concelho atribuido" on public.documentos_modelos;
create policy "Documentos modelos: select concelho atribuido"
  on public.documentos_modelos for select
  using (exists (
    select 1 from public.concelho_atribuicoes ca
    where ca.nucleo_id = documentos_modelos.nucleo_id and ca.membro_id = auth.uid()
  ));

drop policy if exists "Nucleos storage: select concelho atribuido" on storage.objects;
create policy "Nucleos storage: select concelho atribuido"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'nucleos'
    and exists (
      select 1 from public.concelho_atribuicoes ca
      where ca.membro_id = auth.uid()
        and ca.nucleo_id::text = (storage.foldername(name))[1]
    )
  );

alter table public.fechos_mensais
  add column if not exists estado_validacao text not null default 'rascunho';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fechos_mensais_estado_validacao_check'
  ) then
    alter table public.fechos_mensais
      add constraint fechos_mensais_estado_validacao_check
      check (estado_validacao in ('rascunho', 'submetido', 'aprovado', 'reprovado'));
  end if;
end $$;

alter table public.fechos_mensais
  add column if not exists submetido_em timestamptz;

alter table public.fechos_mensais
  add column if not exists revisto_por uuid references public.concelho_membros(id);

alter table public.fechos_mensais
  add column if not exists revisto_em timestamptz;

alter table public.fechos_mensais
  add column if not exists comentario_revisao text;

create or replace function public.concelho_rever_fecho(
  p_nucleo_id uuid,
  p_month_ref text,
  p_estado text,
  p_comentario text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_estado not in ('aprovado', 'reprovado') then
    raise exception 'estado invalido: %', p_estado;
  end if;

  if not exists (
    select 1 from concelho_atribuicoes
    where membro_id = auth.uid() and nucleo_id = p_nucleo_id
  ) then
    raise exception 'sem permissao para rever este nucleo';
  end if;

  update fechos_mensais
  set estado_validacao = p_estado,
      revisto_por = auth.uid(),
      revisto_em = now(),
      comentario_revisao = p_comentario,
      fechado_em = case when p_estado = 'reprovado' then null else fechado_em end
  where nucleo_id = p_nucleo_id
    and month_ref = p_month_ref
    and estado_validacao = 'submetido';

  if not found then
    raise exception 'fecho nao esta submetido para revisao';
  end if;
end;
$$;

revoke all on function public.concelho_rever_fecho(uuid, text, text, text) from public;
grant execute on function public.concelho_rever_fecho(uuid, text, text, text) to authenticated;

-- =========================================================================
-- Concelho Fiscal: autogestao de atribuicoes (associar/desassociar nucleos).
-- (replicado de supabase/migrate-concelho-autogestao.sql — manter os dois em sincronia)
-- =========================================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'concelho_atribuicoes_nucleo_id_key'
  ) then
    alter table public.concelho_atribuicoes
      add constraint concelho_atribuicoes_nucleo_id_key unique (nucleo_id);
  end if;
end $$;

drop policy if exists "Concelho atribuicoes: insert proprio" on public.concelho_atribuicoes;
create policy "Concelho atribuicoes: insert proprio"
  on public.concelho_atribuicoes for insert
  with check (membro_id = auth.uid());

drop policy if exists "Concelho atribuicoes: delete proprio" on public.concelho_atribuicoes;
create policy "Concelho atribuicoes: delete proprio"
  on public.concelho_atribuicoes for delete
  using (membro_id = auth.uid());

create or replace function public.concelho_listar_nucleos_disponiveis()
returns table (id uuid, nome_nucleo text, nome_tesoureiro text)
language sql
security definer
set search_path = public
as $$
  select n.id, n.nome_nucleo, n.nome_tesoureiro
  from public.nucleos n
  where exists (select 1 from public.concelho_membros where id = auth.uid())
    and not exists (
      select 1 from public.concelho_atribuicoes ca where ca.nucleo_id = n.id
    )
  order by n.nome_nucleo;
$$;

revoke all on function public.concelho_listar_nucleos_disponiveis() from public;
grant execute on function public.concelho_listar_nucleos_disponiveis() to authenticated;
