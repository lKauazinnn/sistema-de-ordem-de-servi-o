alter table public.profiles
  add column if not exists assistencia_nome text,
  add column if not exists assistencia_cnpj text,
  add column if not exists assistencia_telefone text;