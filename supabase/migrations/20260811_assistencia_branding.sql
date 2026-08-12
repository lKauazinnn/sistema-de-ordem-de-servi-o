-- Campos adicionais de identidade visual da assistencia tecnica (por conta),
-- para uso no PDF de OS e demais documentos.
alter table public.profiles
  add column if not exists assistencia_endereco text,
  add column if not exists assistencia_instagram text,
  add column if not exists assistencia_logo_url text;

create or replace function public.update_own_assistencia(
  p_nome text default null,
  p_cnpj text default null,
  p_telefone text default null,
  p_endereco text default null,
  p_instagram text default null,
  p_logo_url text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set
    assistencia_nome      = nullif(trim(coalesce(p_nome, '')), ''),
    assistencia_cnpj      = nullif(trim(coalesce(p_cnpj, '')), ''),
    assistencia_telefone  = nullif(trim(coalesce(p_telefone, '')), ''),
    assistencia_endereco  = nullif(trim(coalesce(p_endereco, '')), ''),
    assistencia_instagram = nullif(trim(coalesce(p_instagram, '')), ''),
    assistencia_logo_url  = nullif(trim(coalesce(p_logo_url, '')), '')
  where id = auth.uid();
end;
$$;

grant execute on function public.update_own_assistencia(text, text, text, text, text, text) to authenticated;
