-- Adiciona entrada manual de estoque via RPC

create or replace function public.registrar_entrada_manual(
  p_produto_id uuid,
  p_quantidade numeric,
  p_justificativa text
)
returns void
language plpgsql
security definer
as $$
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade deve ser maior que zero';
  end if;

  if p_justificativa is null or length(trim(p_justificativa)) = 0 then
    raise exception 'Justificativa obrigatoria';
  end if;

  update public.produtos
  set estoque_atual = estoque_atual + p_quantidade
  where id = p_produto_id;

  if not found then
    raise exception 'Produto nao encontrado';
  end if;

  insert into public.movimentacoes_estoque (produto_id, tipo, quantidade, justificativa)
  values (p_produto_id, 'entrada', p_quantidade, p_justificativa);
end;
$$;

grant execute on function public.registrar_entrada_manual(uuid, numeric, text) to authenticated;
