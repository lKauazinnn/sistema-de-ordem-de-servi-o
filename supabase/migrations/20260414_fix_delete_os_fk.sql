-- Corrige FKs para permitir exclusao de OS sem quebrar integridade

-- Notas devem ser removidas junto com a OS
alter table public.notas_servico
  drop constraint if exists notas_servico_os_id_fkey;

alter table public.notas_servico
  add constraint notas_servico_os_id_fkey
  foreign key (os_id)
  references public.ordens_servico(id)
  on delete cascade;

-- Historico NF-e tambem deve sair junto com a OS
alter table public.nfe_historico
  drop constraint if exists nfe_historico_os_id_fkey;

alter table public.nfe_historico
  add constraint nfe_historico_os_id_fkey
  foreign key (os_id)
  references public.ordens_servico(id)
  on delete cascade;

-- Movimentacao pode continuar existindo sem apontar para OS removida
alter table public.movimentacoes_estoque
  drop constraint if exists movimentacoes_estoque_os_id_fkey;

alter table public.movimentacoes_estoque
  add constraint movimentacoes_estoque_os_id_fkey
  foreign key (os_id)
  references public.ordens_servico(id)
  on delete set null;
