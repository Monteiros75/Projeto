-- Criar tabelas PAO + Relatorio (correr se der erro "relation planos does not exist")
-- Requer: tabela nucleos + funcao set_updated_at() ja existentes.

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
  to authenticated
  using (nucleo_id = auth.uid());

drop policy if exists "Planos: insert proprio" on public.planos;
create policy "Planos: insert proprio"
  on public.planos for insert
  to authenticated
  with check (nucleo_id = auth.uid());

drop policy if exists "Planos: update proprio" on public.planos;
create policy "Planos: update proprio"
  on public.planos for update
  to authenticated
  using (nucleo_id = auth.uid())
  with check (nucleo_id = auth.uid());

drop policy if exists "Planos: delete proprio" on public.planos;
create policy "Planos: delete proprio"
  on public.planos for delete
  to authenticated
  using (nucleo_id = auth.uid());

drop policy if exists "Plano linhas: select proprio" on public.plano_linhas;
create policy "Plano linhas: select proprio"
  on public.plano_linhas for select
  to authenticated
  using (nucleo_id = auth.uid());

drop policy if exists "Plano linhas: insert proprio" on public.plano_linhas;
create policy "Plano linhas: insert proprio"
  on public.plano_linhas for insert
  to authenticated
  with check (nucleo_id = auth.uid());

drop policy if exists "Plano linhas: update proprio" on public.plano_linhas;
create policy "Plano linhas: update proprio"
  on public.plano_linhas for update
  to authenticated
  using (nucleo_id = auth.uid())
  with check (nucleo_id = auth.uid());

drop policy if exists "Plano linhas: delete proprio" on public.plano_linhas;
create policy "Plano linhas: delete proprio"
  on public.plano_linhas for delete
  to authenticated
  using (nucleo_id = auth.uid());
