-- Mandato (mes/ano) + seccoes personalizaveis por documento
alter table public.planos
  add column if not exists mandato_inicio date;

alter table public.planos
  add column if not exists mandato_fim date;

alter table public.planos
  add column if not exists seccoes jsonb not null default '["Direção", "Secção Pedagógica", "Secção de Imagem", "Secção Recreativa e Cultural"]'::jsonb;

-- Preencher mandato a partir de ano antigo (se existir)
update public.planos
set
  mandato_inicio = coalesce(mandato_inicio, make_date(ano, 12, 1)),
  mandato_fim = coalesce(mandato_fim, make_date(ano + 1, 12, 1))
where ano is not null
  and (mandato_inicio is null or mandato_fim is null);
