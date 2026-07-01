-- Previsao de atividades por seccao + ligacao RAC -> PAO
alter table public.planos
  add column if not exists previsao_seccoes jsonb not null default '{}'::jsonb;

alter table public.planos
  add column if not exists pao_referencia_id uuid references public.planos(id) on delete set null;
