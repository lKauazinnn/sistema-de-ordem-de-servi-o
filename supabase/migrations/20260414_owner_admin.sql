-- Owner fixo do sistema
-- Garante que o e-mail definido tenha papel admin no app metadata e no profile.

do $$
declare
  v_owner_email text := 'lkaua.lopes01@gmail.com';
  v_owner_id uuid;
begin
  select id into v_owner_id from auth.users where email = v_owner_email limit 1;

  if v_owner_id is null then
    raise notice 'Usuario owner % ainda nao existe em auth.users', v_owner_email;
    return;
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
  where id = v_owner_id;

  insert into public.profiles (id, nome, role)
  values (v_owner_id, coalesce((select raw_user_meta_data ->> 'nome' from auth.users where id = v_owner_id), 'Owner'), 'admin')
  on conflict (id)
  do update set role = 'admin';
end $$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
as $$
  select case
    when lower(coalesce(auth.jwt() ->> 'email', '')) = 'lkaua.lopes01@gmail.com' then 'admin'::public.user_role
    else coalesce((auth.jwt() ->> 'role')::public.user_role, 'tecnico'::public.user_role)
  end;
$$;
