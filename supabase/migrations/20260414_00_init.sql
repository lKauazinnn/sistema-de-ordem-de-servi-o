create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'gerente', 'atendente', 'tecnico');
create type public.os_status as enum (
  'aberta',
  'diagnostico',
  'aguardando_aprovacao',
  'aguardando_pecas',
  'execucao',
  'concluida',
  'entregue',
  'cancelada'
);

create sequence if not exists public.os_numero_seq start 1000;
create sequence if not exists public.nota_servico_numero_seq start 1;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role public.user_role not null default 'tecnico',
  created_at timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome_razao_social text not null,
  cpf_cnpj text not null unique,
  telefone text not null,
  email text,
  endereco text,
  cep text,
  recorrente boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sku text not null unique,
  categoria text not null,
  unidade_medida text not null,
  estoque_atual numeric(12,2) not null default 0,
  estoque_minimo numeric(12,2) not null default 0,
  preco_custo numeric(12,2) not null default 0,
  preco_venda numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.produto_fornecedores (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  nome_fornecedor text not null,
  contato text,
  ativo boolean not null default true
);

create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  numero_sequencial bigint not null unique default nextval('public.os_numero_seq'),
  cliente_id uuid not null references public.clientes(id),
  tecnico_id uuid not null references auth.users(id),
  tipo_equipamento text not null,
  marca text not null,
  modelo text not null,
  serial_imei text not null,
  acessorios_recebidos text,
  checklist_recebimento jsonb not null default '{}'::jsonb,
  problema_relatado text not null,
  prioridade text not null check (prioridade in ('baixa','media','alta','urgente')),
  prazo_estimado timestamptz not null,
  status public.os_status not null default 'aberta',
  aprovado_orcamento boolean not null default false,
  observacoes_internas text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.os_itens (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  produto_id uuid not null references public.produtos(id),
  quantidade numeric(12,2) not null check (quantidade > 0),
  valor_unitario numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id),
  os_id uuid references public.ordens_servico(id),
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade numeric(12,2) not null check (quantidade > 0),
  justificativa text,
  numero_nf_compra text,
  valor_unitario numeric(12,2),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.notas_servico (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null unique default nextval('public.nota_servico_numero_seq'),
  os_id uuid not null references public.ordens_servico(id),
  cliente_id uuid not null references public.clientes(id),
  subtotal numeric(12,2) not null,
  descontos numeric(12,2) not null default 0,
  impostos numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  forma_pagamento text,
  garantia text,
  prazo text,
  pdf_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.nfe_historico (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id),
  cliente_id uuid not null references public.clientes(id),
  status text not null default 'pendente',
  ambiente text not null check (ambiente in ('homologacao','producao')),
  valor_total numeric(12,2) not null,
  xml_path text,
  danfe_pdf_path text,
  protocolo text,
  mensagem_retorno text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  tabela text not null,
  operacao text not null,
  registro_id text,
  old_data jsonb,
  new_data jsonb,
  actor uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'role')::public.user_role, 'tecnico'::public.user_role);
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ordens_servico_touch on public.ordens_servico;
create trigger trg_ordens_servico_touch
before update on public.ordens_servico
for each row execute function public.touch_updated_at();

create or replace function public.log_audit()
returns trigger
language plpgsql
as $$
begin
  insert into public.audit_logs (tabela, operacao, registro_id, old_data, new_data)
  values (
    tg_table_name,
    tg_op,
    coalesce(new.id::text, old.id::text),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.apply_stock_saida_from_os_item()
returns trigger
language plpgsql
as $$
begin
  update public.produtos
    set estoque_atual = estoque_atual - new.quantidade
  where id = new.produto_id;

  insert into public.movimentacoes_estoque (produto_id, os_id, tipo, quantidade, justificativa)
  values (new.produto_id, new.os_id, 'saida', new.quantidade, 'Baixa automatica por OS');

  return new;
end;
$$;

drop trigger if exists trg_os_itens_stock on public.os_itens;
create trigger trg_os_itens_stock
after insert on public.os_itens
for each row execute function public.apply_stock_saida_from_os_item();

create or replace function public.update_os_status(p_os_id uuid, p_status public.os_status)
returns void
language plpgsql
security definer
as $$
begin
  update public.ordens_servico
  set status = p_status, updated_at = now()
  where id = p_os_id;
end;
$$;

create or replace function public.registrar_saida_manual(
  p_produto_id uuid,
  p_quantidade numeric,
  p_justificativa text
)
returns void
language plpgsql
security definer
as $$
begin
  if p_justificativa is null or length(trim(p_justificativa)) = 0 then
    raise exception 'Justificativa obrigatoria';
  end if;

  update public.produtos
  set estoque_atual = estoque_atual - p_quantidade
  where id = p_produto_id;

  insert into public.movimentacoes_estoque (produto_id, tipo, quantidade, justificativa)
  values (p_produto_id, 'saida', p_quantidade, p_justificativa);
end;
$$;

create or replace function public.dashboard_resumo(p_periodo_dias integer default 30)
returns table (
  abertas bigint,
  andamento bigint,
  concluidas bigint,
  canceladas bigint,
  aguardando_aprovacao bigint
)
language sql
stable
as $$
  select
    count(*) filter (where status = 'aberta') as abertas,
    count(*) filter (where status in ('diagnostico','aguardando_pecas','execucao')) as andamento,
    count(*) filter (where status = 'concluida') as concluidas,
    count(*) filter (where status = 'cancelada') as canceladas,
    count(*) filter (where status = 'aguardando_aprovacao') as aguardando_aprovacao
  from public.ordens_servico
  where created_at >= now() - make_interval(days => p_periodo_dias);
$$;

alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.produtos enable row level security;
alter table public.produto_fornecedores enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.os_itens enable row level security;
alter table public.movimentacoes_estoque enable row level security;
alter table public.notas_servico enable row level security;
alter table public.nfe_historico enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_self_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.current_user_role() = 'admin');

create policy "clientes_team_read"
on public.clientes
for select
using (public.current_user_role() in ('admin', 'gerente', 'atendente', 'tecnico'));

create policy "clientes_write_frontdesk"
on public.clientes
for all
using (public.current_user_role() in ('admin', 'gerente', 'atendente'))
with check (public.current_user_role() in ('admin', 'gerente', 'atendente'));

create policy "produtos_team_read"
on public.produtos
for select
using (public.current_user_role() in ('admin', 'gerente', 'atendente'));

create policy "produtos_manage"
on public.produtos
for all
using (public.current_user_role() in ('admin', 'gerente'))
with check (public.current_user_role() in ('admin', 'gerente'));

create policy "os_read_scope"
on public.ordens_servico
for select
using (
  public.current_user_role() in ('admin', 'gerente', 'atendente')
  or (public.current_user_role() = 'tecnico' and tecnico_id = auth.uid())
);

create policy "os_write_team"
on public.ordens_servico
for all
using (public.current_user_role() in ('admin', 'gerente', 'atendente', 'tecnico'))
with check (
  public.current_user_role() in ('admin', 'gerente', 'atendente')
  or (public.current_user_role() = 'tecnico' and tecnico_id = auth.uid())
);

create policy "os_itens_team"
on public.os_itens
for all
using (public.current_user_role() in ('admin', 'gerente', 'atendente', 'tecnico'))
with check (public.current_user_role() in ('admin', 'gerente', 'atendente', 'tecnico'));

create policy "movimentacoes_read"
on public.movimentacoes_estoque
for select
using (public.current_user_role() in ('admin', 'gerente', 'atendente'));

create policy "movimentacoes_write"
on public.movimentacoes_estoque
for insert
with check (public.current_user_role() in ('admin', 'gerente', 'atendente'));

create policy "notas_team"
on public.notas_servico
for all
using (public.current_user_role() in ('admin', 'gerente', 'atendente'))
with check (public.current_user_role() in ('admin', 'gerente', 'atendente'));

create policy "nfe_team"
on public.nfe_historico
for all
using (public.current_user_role() in ('admin', 'gerente'))
with check (public.current_user_role() in ('admin', 'gerente'));

create policy "audit_admin_only"
on public.audit_logs
for select
using (public.current_user_role() = 'admin');

drop trigger if exists trg_audit_clientes on public.clientes;
create trigger trg_audit_clientes after insert or update or delete on public.clientes
for each row execute function public.log_audit();

drop trigger if exists trg_audit_ordens_servico on public.ordens_servico;
create trigger trg_audit_ordens_servico after insert or update or delete on public.ordens_servico
for each row execute function public.log_audit();

drop trigger if exists trg_audit_produtos on public.produtos;
create trigger trg_audit_produtos after insert or update or delete on public.produtos
for each row execute function public.log_audit();
