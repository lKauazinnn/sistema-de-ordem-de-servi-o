-- Padroniza regras de exclusao para evitar bloqueios de FK em entidades gerenciadas pela UI.

-- USER DELETE: manter historico de OS mesmo apos remover tecnico.
alter table public.ordens_servico
  alter column tecnico_id drop not null;

alter table public.ordens_servico
  drop constraint if exists ordens_servico_tecnico_id_fkey;

alter table public.ordens_servico
  add constraint ordens_servico_tecnico_id_fkey
  foreign key (tecnico_id)
  references auth.users(id)
  on delete set null;

-- PRODUCT DELETE: remover automaticamente registros filhos de estoque ligados ao produto.
alter table public.os_itens
  drop constraint if exists os_itens_produto_id_fkey;

alter table public.os_itens
  add constraint os_itens_produto_id_fkey
  foreign key (produto_id)
  references public.produtos(id)
  on delete cascade;

alter table public.movimentacoes_estoque
  drop constraint if exists movimentacoes_estoque_produto_id_fkey;

alter table public.movimentacoes_estoque
  add constraint movimentacoes_estoque_produto_id_fkey
  foreign key (produto_id)
  references public.produtos(id)
  on delete cascade;
