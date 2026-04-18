-- Streaming (IPTV) + Contas a Pagar para acompanhamento no dashboard

create table if not exists public.streaming_assinaturas (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  servidor text not null,
  dispositivo text not null,
  aplicativo text not null,
  data_ativacao date not null,
  data_vencimento timestamptz not null,
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pago', 'pendente')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contas_pagar (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  fornecedor text,
  valor numeric(12,2) not null check (valor >= 0),
  data_vencimento timestamptz not null,
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pago', 'pendente')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.streaming_assinaturas enable row level security;
alter table public.contas_pagar enable row level security;

grant select, insert, update on public.streaming_assinaturas to authenticated;
grant select, insert, update on public.contas_pagar to authenticated;

drop trigger if exists trg_streaming_assinaturas_touch on public.streaming_assinaturas;
create trigger trg_streaming_assinaturas_touch
before update on public.streaming_assinaturas
for each row execute function public.touch_updated_at();

drop trigger if exists trg_contas_pagar_touch on public.contas_pagar;
create trigger trg_contas_pagar_touch
before update on public.contas_pagar
for each row execute function public.touch_updated_at();

drop policy if exists "streaming_read_team" on public.streaming_assinaturas;
create policy "streaming_read_team"
on public.streaming_assinaturas
for select
to authenticated
using (public.current_user_role() in ('admin', 'gerente', 'atendente', 'tecnico'));

drop policy if exists "streaming_write_team" on public.streaming_assinaturas;
create policy "streaming_write_team"
on public.streaming_assinaturas
for all
to authenticated
using (public.current_user_role() in ('admin', 'gerente', 'atendente'))
with check (public.current_user_role() in ('admin', 'gerente', 'atendente'));

drop policy if exists "contas_pagar_read_team" on public.contas_pagar;
create policy "contas_pagar_read_team"
on public.contas_pagar
for select
to authenticated
using (public.current_user_role() in ('admin', 'gerente', 'atendente', 'tecnico'));

drop policy if exists "contas_pagar_write_team" on public.contas_pagar;
create policy "contas_pagar_write_team"
on public.contas_pagar
for all
to authenticated
using (public.current_user_role() in ('admin', 'gerente', 'atendente'))
with check (public.current_user_role() in ('admin', 'gerente', 'atendente'));
