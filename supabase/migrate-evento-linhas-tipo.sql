-- Migracao: evento_linhas emparelhado -> linhas por tipo (despesa/receita)
-- Correr no SQL Editor se ja tinhas a versao antiga da tabela.
-- ATENCAO: se a tabela estiver vazia, podes fazer drop direto em vez disto.

create table if not exists public.evento_linhas_nova (
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

insert into public.evento_linhas_nova (
  evento_id, nucleo_id, tipo, ordem, nome, valor_estimado, valor_real, observacoes, created_at, updated_at
)
select
  evento_id,
  nucleo_id,
  'despesa',
  ordem * 2,
  despesa_nome,
  despesa_estimado,
  despesa_real,
  null,
  created_at,
  updated_at
from public.evento_linhas
where coalesce(trim(despesa_nome), '') <> ''
   or coalesce(despesa_estimado, 0) <> 0
   or coalesce(despesa_real, 0) <> 0;

insert into public.evento_linhas_nova (
  evento_id, nucleo_id, tipo, ordem, nome, valor_estimado, valor_real, observacoes, created_at, updated_at
)
select
  evento_id,
  nucleo_id,
  'receita',
  ordem * 2 + 1,
  receita_nome,
  receita_estimado,
  receita_real,
  null,
  created_at,
  updated_at
from public.evento_linhas
where coalesce(trim(receita_nome), '') <> ''
   or coalesce(receita_estimado, 0) <> 0
   or coalesce(receita_real, 0) <> 0;

drop table if exists public.evento_linhas;
alter table public.evento_linhas_nova rename to evento_linhas;

create index if not exists evento_linhas_evento_idx
  on public.evento_linhas (evento_id, tipo, ordem);

drop trigger if exists trg_evento_linhas_updated_at on public.evento_linhas;
create trigger trg_evento_linhas_updated_at
  before update on public.evento_linhas
  for each row execute function public.set_updated_at();

alter table public.evento_linhas enable row level security;

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
