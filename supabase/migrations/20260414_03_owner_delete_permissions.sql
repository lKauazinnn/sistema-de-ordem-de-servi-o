-- Permissoes de DELETE para owner/admin em OS e Notas de Servico

-- Grant DELETE explicito para o role autenticado (PostgREST precisa disso)
grant delete on public.ordens_servico to authenticated;
grant delete on public.notas_servico to authenticated;
grant delete on public.clientes to authenticated;
grant delete on public.produtos to authenticated;

-- Politica DELETE para ordens_servico — apenas admin/owner
drop policy if exists "os_delete_admin" on public.ordens_servico;
create policy "os_delete_admin"
on public.ordens_servico
for delete
to authenticated
using (
  public.current_user_role() = 'admin'
);

-- Habilitar RLS em notas_servico caso ainda nao esteja
alter table public.notas_servico enable row level security;

-- Politica SELECT em notas_servico para authenticated
drop policy if exists "notas_select_authenticated" on public.notas_servico;
create policy "notas_select_authenticated"
on public.notas_servico
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'gerente', 'atendente')
  or (public.current_user_role() = 'tecnico' and cliente_id in (
    select cliente_id from public.ordens_servico where tecnico_id = auth.uid()
  ))
);

-- Politica INSERT em notas_servico para authenticated
drop policy if exists "notas_insert_authenticated" on public.notas_servico;
create policy "notas_insert_authenticated"
on public.notas_servico
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'gerente', 'atendente', 'tecnico')
);

-- Politica DELETE para notas_servico — apenas admin/owner
drop policy if exists "notas_delete_admin" on public.notas_servico;
create policy "notas_delete_admin"
on public.notas_servico
for delete
to authenticated
using (
  public.current_user_role() = 'admin'
);

-- Politica DELETE para clientes — apenas admin
drop policy if exists "clientes_delete_admin" on public.clientes;
create policy "clientes_delete_admin"
on public.clientes
for delete
to authenticated
using (
  public.current_user_role() = 'admin'
);

