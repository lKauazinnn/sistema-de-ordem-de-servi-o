import { supabase } from "../../lib/supabase";
import type { OrdemServico } from "../../types";
import type { OsInput } from "./schema";

type ImeiValidationResult = {
  valid: boolean;
  type: "imei" | "serial";
  normalized: string;
  message: string;
  autoFill?: {
    tipo_equipamento: string;
    marca: string;
    modelo: string;
    source: "historico" | "tac";
  };
};

const useServerOsApi = import.meta.env.VITE_USE_SERVER_OS_API === "true";

function mapOsError(error: { message: string; code?: string | null }) {
  if (error.code === "42501") {
    return `Permissao negada (RLS/GRANT). Rode a migration 20260414_fix_os_permissions.sql no Supabase e faca login novamente. Detalhe: ${error.message}`;
  }

  if (error.code === "23503") {
    return `Nao foi possivel excluir porque existem registros vinculados (FK). Detalhe: ${error.message}`;
  }

  return error.message;
}

function isValidImeiDigits(imei: string) {
  if (!/^\d{15}$/.test(imei)) return false;

  let sum = 0;
  for (let i = 0; i < imei.length; i += 1) {
    let digit = Number(imei[i]);
    if (Number.isNaN(digit)) return false;

    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
  }

  return sum % 10 === 0;
}

function validateSerialOrImeiLocally(value: string, tipoEquipamento?: string): ImeiValidationResult {
  const normalized = value.trim();
  const digits = normalized.replace(/\D/g, "");
  const isDigitsOnly = /^\d+$/.test(normalized);
  const isCelular = (tipoEquipamento ?? "").toLowerCase() === "celular";

  if (!normalized) {
    return {
      valid: false,
      type: "serial",
      normalized,
      message: "Informe o Serial/IMEI."
    };
  }

  if (isDigitsOnly && normalized.length === 15) {
    const valid = isValidImeiDigits(normalized);
    return {
      valid,
      type: "imei",
      normalized,
      message: valid ? "IMEI válido." : "IMEI inválido. Verifique os 15 dígitos informados."
    };
  }

  if (isCelular) {
    if (digits.length === 15 && isValidImeiDigits(digits)) {
      return {
        valid: true,
        type: "imei",
        normalized: digits,
        message: "IMEI válido."
      };
    }

    return {
      valid: false,
      type: "imei",
      normalized,
      message: "Para celular, informe um IMEI válido de 15 dígitos."
    };
  }

  return {
    valid: normalized.length >= 3,
    type: "serial",
    normalized,
    message: normalized.length >= 3
      ? "Serial válido."
      : "Serial deve ter pelo menos 3 caracteres."
  };
}

async function attachAutoFillFromSupabase(base: ImeiValidationResult, rawValue: string) {
  if (!base.valid) return base;

  const cols = "tipo_equipamento,marca,modelo,serial_imei,created_at";

  const { data: byNormalized } = await supabase
    .from("ordens_servico")
    .select(cols)
    .eq("serial_imei", base.normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byNormalized) {
    return {
      ...base,
      autoFill: {
        tipo_equipamento: byNormalized.tipo_equipamento,
        marca: byNormalized.marca,
        modelo: byNormalized.modelo,
        source: "historico"
      }
    };
  }

  const rawSanitized = rawValue.trim();
  if (rawSanitized && rawSanitized !== base.normalized) {
    const { data: byRaw } = await supabase
      .from("ordens_servico")
      .select(cols)
      .eq("serial_imei", rawSanitized)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byRaw) {
      return {
        ...base,
        autoFill: {
          tipo_equipamento: byRaw.tipo_equipamento,
          marca: byRaw.marca,
          modelo: byRaw.modelo,
          source: "historico"
        }
      };
    }
  }

  if (base.type === "imei") {
    const tac = base.normalized.slice(0, 8);
    if (tac.length === 8) {
      const { data: byTac } = await supabase
        .from("ordens_servico")
        .select(cols)
        .like("serial_imei", `${tac}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (byTac) {
        return {
          ...base,
          autoFill: {
            tipo_equipamento: byTac.tipo_equipamento,
            marca: byTac.marca,
            modelo: byTac.modelo,
            source: "tac"
          }
        };
      }
    }
  }

  return base;
}

export async function validateImeiSerial(input: { value: string; tipoEquipamento?: string }) {
  const localValidation = validateSerialOrImeiLocally(input.value, input.tipoEquipamento);
  if (!localValidation.valid) {
    return localValidation;
  }

  if (!useServerOsApi) {
    try {
      return await attachAutoFillFromSupabase(localValidation, input.value);
    } catch {
      return localValidation;
    }
  }

  try {
    const response = await fetch("/api/os/validate-imei", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        value: input.value,
        tipo_equipamento: input.tipoEquipamento
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      return await attachAutoFillFromSupabase(localValidation, input.value);
    }

    return payload as ImeiValidationResult;
  } catch {
    try {
      return await attachAutoFillFromSupabase(localValidation, input.value);
    } catch {
      return localValidation;
    }
  }
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
  try {
    const response = await fetch("/api/os/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Falha ao criar OS via API");
    }

    return payload as OrdemServico;
  } catch {
    const { data, error } = await supabase.from("ordens_servico").insert(input).select("*").single();

    if (error) {
      throw new Error(mapOsError(error));
    }

    return data as OrdemServico;
  }
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
