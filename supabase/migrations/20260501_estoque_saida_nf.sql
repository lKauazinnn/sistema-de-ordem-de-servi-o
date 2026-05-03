alter table public.movimentacoes_estoque
  add column if not exists numero_nf_saida text;

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

  insert into public.movimentacoes_estoque (produto_id, tipo, quantidade, justificativa, numero_nf_saida)
  values (p_produto_id, 'saida', p_quantidade, p_justificativa, trim(p_numero_nf_saida));
end;
$$;