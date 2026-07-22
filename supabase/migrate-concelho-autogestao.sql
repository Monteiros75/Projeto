-- =========================================================================
-- Concelho Fiscal: autogestao de atribuicoes (associar/desassociar nucleos).
-- Correr no SQL Editor do Supabase apos migrate-concelho-fiscal.sql.
-- Este bloco esta tambem replicado no fim do schema.sql para instalacoes de raiz.
-- =========================================================================

-- Cada nucleo so pode ter um membro do concelho fiscal responsavel de cada vez.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'concelho_atribuicoes_nucleo_id_key'
  ) then
    alter table public.concelho_atribuicoes
      add constraint concelho_atribuicoes_nucleo_id_key unique (nucleo_id);
  end if;
end $$;

-- Um membro pode associar-se (a um nucleo ainda sem ninguem) e desassociar-se
-- livremente das suas proprias atribuicoes. O unique acima impede "roubar" um
-- nucleo ja atribuido a outro membro (a insercao falha).
drop policy if exists "Concelho atribuicoes: insert proprio" on public.concelho_atribuicoes;
create policy "Concelho atribuicoes: insert proprio"
  on public.concelho_atribuicoes for insert
  with check (membro_id = auth.uid());

drop policy if exists "Concelho atribuicoes: delete proprio" on public.concelho_atribuicoes;
create policy "Concelho atribuicoes: delete proprio"
  on public.concelho_atribuicoes for delete
  using (membro_id = auth.uid());

-- Lista de nucleos ainda sem membro do concelho fiscal atribuido, para um
-- membro poder escolher a quem se associar. So devolve linhas quando o
-- chamador e um membro do concelho fiscal (sem isso, devolve vazio) e expoe
-- apenas as colunas necessarias para a escolha (nao o resto do perfil do nucleo).
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
