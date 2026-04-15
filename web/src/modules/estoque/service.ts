import { supabase } from "../../lib/supabase";
import type { Produto } from "../../types";

type NovoProdutoInput = {
  nome: string;
  sku: string;
  categoria: string;
  unidade_medida: string;
  estoque_minimo: number;
  preco_custo: number;
  preco_venda: number;
};

export async function listProdutos() {
  const { data, error } = await supabase.from("produtos").select("*").order("nome");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Produto[];
}

export async function registrarSaidaManual(input: { produto_id: string; quantidade: number; justificativa: string }) {
  const { error } = await supabase.rpc("registrar_saida_manual", {
    p_produto_id: input.produto_id,
    p_quantidade: input.quantidade,
    p_justificativa: input.justificativa
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function registrarEntradaManual(input: { produto_id: string; quantidade: number; justificativa: string }) {
  const { error } = await supabase.rpc("registrar_entrada_manual", {
    p_produto_id: input.produto_id,
    p_quantidade: input.quantidade,
    p_justificativa: input.justificativa
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createProduto(input: NovoProdutoInput) {
  const { data, error } = await supabase
    .from("produtos")
    .insert({
      nome: input.nome,
      sku: input.sku,
      categoria: input.categoria,
      unidade_medida: input.unidade_medida,
      estoque_atual: 0,
      estoque_minimo: input.estoque_minimo,
      preco_custo: input.preco_custo,
      preco_venda: input.preco_venda
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Produto;
}

export async function updateProduto(produtoId: string, input: Partial<NovoProdutoInput>) {
  const { data, error } = await supabase
    .from("produtos")
    .update(input)
    .eq("id", produtoId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Produto;
}

export async function deleteProduto(produtoId: string) {
  const { error } = await supabase.from("produtos").delete().eq("id", produtoId);
  if (error) {
    throw new Error(error.message);
  }
}
