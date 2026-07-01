-- Corrigir RLS em evento_linhas (403 / "violates row-level security policy")
-- Correr no SQL Editor do Supabase se os botoes Adicionar despesa/receita falharem.

alter table public.evento_linhas enable row level security;

drop policy if exists "Evento linhas: select proprio" on public.evento_linhas;
create policy "Evento linhas: select proprio"
  on public.evento_linhas for select
  to authenticated
  using (nucleo_id = auth.uid());

drop policy if exists "Evento linhas: insert proprio" on public.evento_linhas;
create policy "Evento linhas: insert proprio"
  on public.evento_linhas for insert
  to authenticated
  with check (nucleo_id = auth.uid());

drop policy if exists "Evento linhas: update proprio" on public.evento_linhas;
create policy "Evento linhas: update proprio"
  on public.evento_linhas for update
  to authenticated
  using (nucleo_id = auth.uid())
  with check (nucleo_id = auth.uid());

drop policy if exists "Evento linhas: delete proprio" on public.evento_linhas;
create policy "Evento linhas: delete proprio"
  on public.evento_linhas for delete
  to authenticated
  using (nucleo_id = auth.uid());
