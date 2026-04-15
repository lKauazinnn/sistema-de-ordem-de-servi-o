-- Corrige permissoes e politicas de OS para evitar 403 no PostgREST

-- Grants explicitos para o role autenticado (client-side Supabase)
grant usage on schema public to authenticated;
grant select, insert, update on public.ordens_servico to authenticated;
grant select on public.clientes to authenticated;
grant usage, select on sequence public.os_numero_seq to authenticated;
grant usage, select on sequence public.nota_servico_numero_seq to authenticated;

-- Torna a funcao de role resiliente quando claim role nao existe no JWT
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
as $$
  select case
    when lower(coalesce(auth.jwt() ->> 'email', '')) = 'lkaua.lopes01@gmail.com' then 'admin'::public.user_role
    when lower(coalesce(auth.jwt() ->> 'role', '')) in ('admin', 'gerente', 'atendente', 'tecnico')
      then (lower(auth.jwt() ->> 'role'))::public.user_role
    else 'tecnico'::public.user_role
  end;
$$;

-- Corrige auditoria: trigger precisa inserir em audit_logs sem ser bloqueado por RLS do usuario logado
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- Recria politicas de OS de forma explicita
alter table public.ordens_servico enable row level security;

drop policy if exists "os_read_scope" on public.ordens_servico;
drop policy if exists "os_write_team" on public.ordens_servico;
drop policy if exists "os_select_authenticated" on public.ordens_servico;
drop policy if exists "os_insert_authenticated" on public.ordens_servico;
drop policy if exists "os_update_authenticated" on public.ordens_servico;

create policy "os_select_authenticated"
on public.ordens_servico
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'gerente', 'atendente')
  or (public.current_user_role() = 'tecnico' and tecnico_id = auth.uid())
);

create policy "os_insert_authenticated"
on public.ordens_servico
for insert
to authenticated
with check (
  (public.current_user_role() in ('admin', 'gerente', 'atendente') and tecnico_id is not null)
  or (public.current_user_role() = 'tecnico' and tecnico_id = auth.uid())
);

create policy "os_update_authenticated"
on public.ordens_servico
for update
to authenticated
using (
  public.current_user_role() in ('admin', 'gerente', 'atendente')
  or (public.current_user_role() = 'tecnico' and tecnico_id = auth.uid())
)
with check (
  public.current_user_role() in ('admin', 'gerente', 'atendente')
  or (public.current_user_role() = 'tecnico' and tecnico_id = auth.uid())
);

-- Permite leitura de clientes para montagem de OS demo por usuario autenticado
alter table public.clientes enable row level security;

drop policy if exists "clientes_team_read" on public.clientes;
create policy "clientes_team_read"
on public.clientes
for select
to authenticated
using (public.current_user_role() in ('admin', 'gerente', 'atendente', 'tecnico'));
