-- Personalizacao por usuario (features/modulos por perfil)

alter table public.profiles
  add column if not exists email text,
  add column if not exists user_features jsonb not null default '{}'::jsonb,
  add column if not exists streaming_url text;

-- Backfill do email para perfis existentes
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

create or replace function public.map_raw_role(raw_role text)
returns public.user_role
language sql
immutable
as $$
  select case
    when lower(coalesce(raw_role, '')) = 'admin' then 'admin'::public.user_role
    when lower(coalesce(raw_role, '')) = 'gerente' then 'gerente'::public.user_role
    when lower(coalesce(raw_role, '')) = 'atendente' then 'atendente'::public.user_role
    when lower(coalesce(raw_role, '')) = 'tecnico' then 'tecnico'::public.user_role
    else 'tecnico'::public.user_role
  end;
$$;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, role, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1), 'Usuario'),
    public.map_raw_role(new.raw_app_meta_data ->> 'role'),
    new.email
  )
  on conflict (id)
  do update set
    nome = excluded.nome,
    role = excluded.role,
    email = excluded.email;

  return new;
end;
$$;

-- Trigger apenas no INSERT para evitar loops durante refresh de sessão.
-- O update de profile é feito explicitamente pela API de gerenciamento de usuários.
drop trigger if exists trg_auth_user_sync_profile on auth.users;
create trigger trg_auth_user_sync_profile
after insert on auth.users
for each row execute function public.sync_profile_from_auth_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
-- SECURITY DEFINER evita recursão infinita:
-- sem isso, a função consultaria profiles → a policy RLS de profiles
-- chamaria current_user_role() novamente → loop infinito → login quebrado.
-- Com SECURITY DEFINER a função roda como owner (bypass RLS em profiles).
security definer
set search_path = public
as $$
  select case
    when lower(coalesce(auth.jwt() ->> 'email', '')) = 'lkaua.lopes01@gmail.com' then 'admin'::public.user_role
    when auth.uid() is not null and exists (select 1 from public.profiles p where p.id = auth.uid())
      then (select p.role from public.profiles p where p.id = auth.uid())
    when lower(coalesce(auth.jwt() ->> 'role', '')) in ('admin', 'gerente', 'atendente', 'tecnico')
      then (lower(auth.jwt() ->> 'role'))::public.user_role
    else 'tecnico'::public.user_role
  end;
$$;

grant select, update on public.profiles to authenticated;

drop policy if exists "profiles_self_or_admin" on public.profiles;
create policy "profiles_self_or_admin"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.current_user_role() = 'admin');

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.current_user_role() = 'admin')
with check (auth.uid() = id or public.current_user_role() = 'admin');
