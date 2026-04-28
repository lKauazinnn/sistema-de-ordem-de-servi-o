alter table public.clientes
  add column if not exists ativo boolean;

update public.clientes
set ativo = true
where ativo is null;

alter table public.clientes
  alter column ativo set default true;

alter table public.clientes
  alter column ativo set not null;
