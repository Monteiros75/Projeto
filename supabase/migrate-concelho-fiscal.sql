-- =========================================================================
-- Concelho Fiscal: submissao e revisao online do fecho mensal.
-- Correr no SQL Editor do Supabase apos o schema.sql base.
-- Este bloco esta tambem replicado no fim do schema.sql para instalacoes de raiz.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Tabela: concelho_membros (perfil dos membros do concelho fiscal, 1:1 com auth.users)
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- Tabela: concelho_atribuicoes (nucleos atribuidos a cada membro no mandato atual)
-- -------------------------------------------------------------------------
create table if not exists public.concelho_atribuicoes (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.concelho_membros(id) on delete cascade,
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (membro_id, nucleo_id)
);

alter table public.concelho_membros enable row level security;
alter table public.concelho_atribuicoes enable row level security;

-- Leitura apenas do proprio perfil / das proprias atribuicoes.
-- Sem policy de insert/update/delete para "authenticated": contas e atribuicoes
-- sao geridas via SQL editor com o role de owner, que ignora RLS.
drop policy if exists "Concelho membros: select proprio" on public.concelho_membros;
create policy "Concelho membros: select proprio"
  on public.concelho_membros for select
  using (id = auth.uid());

drop policy if exists "Concelho atribuicoes: select proprio" on public.concelho_atribuicoes;
create policy "Concelho atribuicoes: select proprio"
  on public.concelho_atribuicoes for select
  using (membro_id = auth.uid());

-- =========================================================================
-- Politicas de leitura cross-nucleo: um membro do concelho fiscal pode ver
-- (SELECT) os dados dos nucleos que lhe estao atribuidos. Estas politicas
-- somam-se as politicas "select proprio" ja existentes, nao as substituem.
-- =========================================================================
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

-- -------------------------------------------------------------------------
-- Storage: bucket "nucleos" — leitura cross-nucleo para membros do concelho
-- atribuidos. Caminhos sao sempre "<nucleo_id>/...", ver politicas base no schema.sql.
-- -------------------------------------------------------------------------
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

-- =========================================================================
-- fechos_mensais: estado do processo de submissao/revisao online.
-- =========================================================================
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

-- =========================================================================
-- Funcao RPC: unico caminho para um membro do concelho aprovar/reprovar um
-- fecho. Evita ter de restringir colunas via RLS de UPDATE (tesoureiro e
-- concelho autenticam como o mesmo role Postgres "authenticated").
-- =========================================================================
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
-- Provisionamento (exemplo — correr manualmente apos criar cada conta em
-- Authentication > Add user no dashboard do Supabase, substituindo os valores):
--
-- insert into public.concelho_membros (id, nome, email) values
--   ('00000000-0000-0000-0000-000000000000', 'Nome do Membro', 'membro@example.com');
--
-- insert into public.concelho_atribuicoes (membro_id, nucleo_id)
-- select '00000000-0000-0000-0000-000000000000', id
-- from public.nucleos
-- where nome_nucleo in ('Núcleo A', 'Núcleo B');
--
-- Fim de mandato / reatribuicao: apagar as linhas de concelho_atribuicoes
-- relevantes (sem necessidade de historico).
-- =========================================================================
