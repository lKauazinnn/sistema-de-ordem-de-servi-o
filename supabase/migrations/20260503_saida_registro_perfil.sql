-- 1. Numero sequencial de saida de estoque
create sequence if not exists public.saida_numero_seq start 1;

alter table public.movimentacoes_estoque
  add column if not exists numero_saida bigint;

do $$
declare
  r record;
  n bigint := 1;
begin
  for r in (select id from public.movimentacoes_estoque where tipo = 'saida' order by created_at)
  loop
    update public.movimentacoes_estoque set numero_saida = n where id = r.id;
    n := n + 1;
  end loop;
  if n > 1 then
    perform setval('public.saida_numero_seq', n - 1);
  end if;
end;
$$;

create or replace function public.registrar_saida_manual(
  p_produto_id uuid,
  p_quantidade numeric,
  p_justificativa text,
  p_numero_nf_saida text default null
)
returns void
language plpgsql
security definer
as $$
begin
  if p_justificativa is null or length(trim(p_justificativa)) = 0 then
    raise exception 'Justificativa obrigatoria';
  end if;

  if p_numero_nf_saida is null or length(trim(p_numero_nf_saida)) = 0 then
    raise exception 'Numero da nota fiscal de saida obrigatorio';
  end if;

  update public.produtos
  set estoque_atual = estoque_atual - p_quantidade
  where id = p_produto_id;

  insert into public.movimentacoes_estoque (produto_id, tipo, quantidade, justificativa, numero_nf_saida, numero_saida)
  values (p_produto_id, 'saida', p_quantidade, p_justificativa, trim(p_numero_nf_saida), nextval('public.saida_numero_seq'));
end;
$$;

grant execute on function public.registrar_saida_manual(uuid, numeric, text, text) to authenticated;

-- 2. Funcao para usuario atualizar propria assistencia tecnica
create or replace function public.update_own_assistencia(
  p_nome text default null,
  p_cnpj text default null,
  p_telefone text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set
    assistencia_nome    = nullif(trim(coalesce(p_nome, '')), ''),
    assistencia_cnpj    = nullif(trim(coalesce(p_cnpj, '')), ''),
    assistencia_telefone = nullif(trim(coalesce(p_telefone, '')), '')
  where id = auth.uid();
end;
$$;

grant execute on function public.update_own_assistencia(text, text, text) to authenticated;
