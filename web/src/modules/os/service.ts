import { supabase } from "../../lib/supabase";
import type { OrdemServico } from "../../types";
import type { OsInput } from "./schema";

function mapOsError(error: { message: string; code?: string | null }) {
  if (error.code === "42501") {
    return `Permissao negada (RLS/GRANT). Rode a migration 20260414_fix_os_permissions.sql no Supabase e faca login novamente. Detalhe: ${error.message}`;
  }

  if (error.code === "23503") {
    return `Nao foi possivel excluir porque existem registros vinculados (FK). Detalhe: ${error.message}`;
  }

  return error.message;
}

export async function listOs(params: { page: number; pageSize: number; search: string }) {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from("ordens_servico")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.search) {
    query = query.or(`modelo.ilike.%${params.search}%,marca.ilike.%${params.search}%,serial_imei.ilike.%${params.search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(mapOsError(error));
  }

  return { data: (data ?? []) as OrdemServico[], count: count ?? 0 };
}

export async function createOs(input: OsInput) {
  const { data, error } = await supabase.from("ordens_servico").insert(input).select("*").single();

  if (error) {
    throw new Error(mapOsError(error));
  }

  return data as OrdemServico;
}

export async function updateOs(osId: string, input: Partial<OsInput>) {
  const { data, error } = await supabase
    .from("ordens_servico")
    .update(input)
    .eq("id", osId)
    .select("*")
    .single();

  if (error) {
    throw new Error(mapOsError(error));
  }

  return data as OrdemServico;
}

export async function updateStatus(osId: string, status: OrdemServico["status"]) {
  const { error } = await supabase.rpc("update_os_status", {
    p_os_id: osId,
    p_status: status
  });

  if (error) {
    throw new Error(mapOsError(error));
  }
}

export async function emitirNfe(input: {
  os_id: string;
  cliente_id: string;
  valor_total: number;
  ambiente: "homologacao" | "producao";
}) {
  const useServerNfe = import.meta.env.VITE_USE_SERVER_NFE === "true";

  if (useServerNfe) {
    const response = await fetch("/api/nfe/emit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Falha ao emitir NF-e via API");
    }

    return payload.nfe;
  }

  const { data, error } = await supabase
    .from("nfe_historico")
    .insert({
      os_id: input.os_id,
      cliente_id: input.cliente_id,
      status: "pendente",
      ambiente: input.ambiente,
      valor_total: input.valor_total
    })
    .select("id,status,ambiente,valor_total,created_at")
    .single();

  if (error) {
    throw new Error(mapOsError(error));
  }

  return data;
}

export async function deleteOs(osId: string) {
  const { error: notasError } = await supabase.from("notas_servico").delete().eq("os_id", osId);
  if (notasError) {
    throw new Error(mapOsError(notasError));
  }

  const { error: nfeError } = await supabase.from("nfe_historico").delete().eq("os_id", osId);
  if (nfeError) {
    throw new Error(mapOsError(nfeError));
  }

  const { error: movimentacoesError } = await supabase
    .from("movimentacoes_estoque")
    .update({ os_id: null })
    .eq("os_id", osId);
  if (movimentacoesError) {
    throw new Error(mapOsError(movimentacoesError));
  }

  const { error } = await supabase.from("ordens_servico").delete().eq("id", osId);
  if (error) {
    throw new Error(mapOsError(error));
  }
}

export async function deleteNota(notaId: string) {
  const { error } = await supabase.from("notas_servico").delete().eq("id", notaId);
  if (error) {
    throw new Error(mapOsError(error));
  }
}

export async function deleteUltimaNotaPorOs(osId: string) {
  const { data: nota, error: findError } = await supabase
    .from("notas_servico")
    .select("id")
    .eq("os_id", osId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw new Error(mapOsError(findError));
  }

  if (!nota?.id) {
    throw new Error("Nenhuma nota encontrada para esta OS.");
  }

  await deleteNota(nota.id);
}
export async function criarNotaServico(input: {
  os_id: string;
  cliente_id: string;
  subtotal: number;
  descontos?: number;
  impostos?: number;
  forma_pagamento?: string;
  garantia?: string;
  prazo?: string;
}) {
  const descontos = input.descontos ?? 0;
  const impostos = input.impostos ?? 0;
  const total = Number((input.subtotal - descontos + impostos).toFixed(2));

  const { data, error } = await supabase
    .from("notas_servico")
    .insert({
      os_id: input.os_id,
      cliente_id: input.cliente_id,
      subtotal: input.subtotal,
      descontos,
      impostos,
      total,
      forma_pagamento: input.forma_pagamento ?? "Nao informado",
      garantia: input.garantia ?? "90 dias",
      prazo: input.prazo ?? "Imediato"
    })
    .select("id,numero,total,created_at")
    .single();

  if (error) {
    throw new Error(mapOsError(error));
  }

  return data;
}
