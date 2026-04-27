import { supabase } from "../../lib/supabase";
import type { DashboardResumo } from "../../types";

type OsByTecnicoRow = {
  tecnico_id: string;
};

type ProfileRow = {
  id: string;
  nome: string;
};

type NotaServicoRow = {
  id: string;
  numero?: number;
  created_at: string;
  total: number;
  forma_pagamento: string | null;
};

export async function getFaturamentoResumo() {
  const now = new Date();
  const inicioMesAtual = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const { data, error } = await supabase
    .from("notas_servico")
    .select("id,total,created_at")
    .gte("created_at", inicioMesAnterior)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{ id: string; total: number; created_at: string }>;
  const inicioMesAtualDate = new Date(inicioMesAtual);

  let mesAtual = 0;
  let mesAnterior = 0;
  let notasMesAtual = 0;

  for (const row of rows) {
    const total = Number(row.total) || 0;
    const createdAt = new Date(row.created_at);
    if (createdAt >= inicioMesAtualDate) {
      mesAtual += total;
      notasMesAtual += 1;
    } else {
      mesAnterior += total;
    }
  }

  const ticketMedio = notasMesAtual > 0 ? mesAtual / notasMesAtual : 0;
  const variacaoPercentual = mesAnterior > 0 ? ((mesAtual - mesAnterior) / mesAnterior) * 100 : (mesAtual > 0 ? 100 : 0);

  return {
    mesAtual: Number(mesAtual.toFixed(2)),
    mesAnterior: Number(mesAnterior.toFixed(2)),
    ticketMedio: Number(ticketMedio.toFixed(2)),
    notasMesAtual,
    variacaoPercentual: Number(variacaoPercentual.toFixed(2))
  };
}

export async function getFaturamentoPorFormaPagamento(limit = 5) {
  const { data, error } = await supabase
    .from("notas_servico")
    .select("forma_pagamento,total")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{ forma_pagamento: string | null; total: number }>;
  const map = new Map<string, number>();

  for (const row of rows) {
    const key = (row.forma_pagamento ?? "Nao informado").trim() || "Nao informado";
    map.set(key, (map.get(key) ?? 0) + Number(row.total || 0));
  }

  return [...map.entries()]
    .map(([forma, total]) => ({ forma, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export async function getUltimasNotasServico(limit = 8) {
  const { data, error } = await supabase
    .from("notas_servico")
    .select("id,numero,total,forma_pagamento,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as NotaServicoRow[];
}

export async function getResumoDashboard(periodoDias = 30) {
  const { data, error } = await supabase.rpc("dashboard_resumo", {
    p_periodo_dias: periodoDias
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data?.[0] ?? {
    abertas: 0,
    andamento: 0,
    concluidas: 0,
    canceladas: 0,
    aguardando_aprovacao: 0
  }) as DashboardResumo;
}

export async function getOsPorTecnico(limit = 5) {
  const { data, error } = await supabase
    .from("ordens_servico")
    .select("tecnico_id")
    .not("tecnico_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as OsByTecnicoRow[];
  const countByTecnico = new Map<string, number>();

  for (const row of rows) {
    countByTecnico.set(row.tecnico_id, (countByTecnico.get(row.tecnico_id) ?? 0) + 1);
  }

  const ids = [...countByTecnico.keys()];
  let profileMap = new Map<string, string>();

  if (ids.length > 0) {
    const { data: profilesData } = await supabase.from("profiles").select("id,nome").in("id", ids);
    const profiles = (profilesData ?? []) as ProfileRow[];
    profileMap = new Map(profiles.map((profile) => [profile.id, profile.nome]));
  }

  return [...countByTecnico.entries()]
    .map(([tecnicoId, total]) => ({
      tecnico: profileMap.get(tecnicoId) ?? `Tecnico ${tecnicoId.slice(0, 6)}`,
      total
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export async function getReceitaMensal(meses = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (meses - 1), 1).toISOString();

  const { data, error } = await supabase
    .from("notas_servico")
    .select("created_at,total")
    .gte("created_at", start)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as NotaServicoRow[];
  const monthMap = new Map<string, { receita: number; notas: number }>();

  for (let i = meses - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, { receita: 0, notas: 0 });
  }

  for (const row of rows) {
    const date = new Date(row.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) {
      const current = monthMap.get(key);
      if (current) {
        current.receita += Number(row.total) || 0;
        current.notas += 1;
        monthMap.set(key, current);
      }
    }
  }

  return [...monthMap.entries()].map(([key, stats]) => {
    const [year, month] = key.split("-");
    const ticketMedio = stats.notas > 0 ? stats.receita / stats.notas : 0;
    return {
      mes: `${month}/${year.slice(2)}`,
      receita: Number(stats.receita.toFixed(2)),
      notas: stats.notas,
      ticket_medio: Number(ticketMedio.toFixed(2))
    };
  });
}

// ─── Estoque ──────────────────────────────────────────────────────────────────

type ProdutoRow = {
  id: string;
  nome: string;
  sku: string;
  categoria: string;
  estoque_atual: number;
  estoque_minimo: number;
  preco_custo: number;
  preco_venda: number;
};

export async function getEstoqueDashboard() {
  const { data, error } = await supabase
    .from("produtos")
    .select("estoque_atual,estoque_minimo,preco_custo,preco_venda");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Pick<ProdutoRow, "estoque_atual" | "estoque_minimo" | "preco_custo" | "preco_venda">[];

  let totalProdutos = rows.length;
  let abaixoMinimo = 0;
  let zerados = 0;
  let valorCusto = 0;
  let valorVenda = 0;

  for (const row of rows) {
    const atual = Number(row.estoque_atual) || 0;
    const minimo = Number(row.estoque_minimo) || 0;
    if (atual === 0) zerados += 1;
    else if (atual < minimo) abaixoMinimo += 1;
    valorCusto += atual * (Number(row.preco_custo) || 0);
    valorVenda += atual * (Number(row.preco_venda) || 0);
  }

  return {
    totalProdutos,
    abaixoMinimo,
    zerados,
    alertas: abaixoMinimo + zerados,
    valorCusto: Number(valorCusto.toFixed(2)),
    valorVenda: Number(valorVenda.toFixed(2))
  };
}

export async function getProdutosAbaixoMinimo(limit = 8) {
  const { data, error } = await supabase
    .from("produtos")
    .select("id,nome,sku,categoria,estoque_atual,estoque_minimo")
    .order("estoque_atual", { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Pick<ProdutoRow, "id" | "nome" | "sku" | "categoria" | "estoque_atual" | "estoque_minimo">[];

  return rows
    .filter((r) => Number(r.estoque_atual) < Number(r.estoque_minimo))
    .slice(0, limit);
}

export async function getEstoquePorCategoria() {
  const { data, error } = await supabase
    .from("produtos")
    .select("categoria,estoque_atual,estoque_minimo");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Pick<ProdutoRow, "categoria" | "estoque_atual" | "estoque_minimo">[];
  const map = new Map<string, { atual: number; minimo: number }>();

  for (const row of rows) {
    const key = (row.categoria ?? "Sem categoria").trim() || "Sem categoria";
    const entry = map.get(key) ?? { atual: 0, minimo: 0 };
    entry.atual += Number(row.estoque_atual) || 0;
    entry.minimo += Number(row.estoque_minimo) || 0;
    map.set(key, entry);
  }

  return [...map.entries()]
    .map(([categoria, v]) => ({ categoria, atual: v.atual, minimo: v.minimo }))
    .sort((a, b) => b.atual - a.atual);
}

type PaymentStatus = "pago" | "pendente";

type StreamingRow = {
  id: string;
  cliente_nome: string;
  servidor: string;
  dispositivo: string;
  aplicativo: string;
  data_ativacao: string;
  data_vencimento: string;
  status_pagamento: PaymentStatus;
  created_at: string;
};

type ContaPagarRow = {
  id: string;
  descricao: string;
  fornecedor: string | null;
  valor: number;
  data_vencimento: string;
  status_pagamento: PaymentStatus;
  created_at: string;
};

function hoursUntil(dateString: string) {
  const target = new Date(dateString).getTime();
  const now = Date.now();
  return (target - now) / (1000 * 60 * 60);
}

function dueAlert(status: PaymentStatus, dueDate: string) {
  if (status === "pago") {
    return { level: "ok", message: "Pago" as const };
  }

  const diffHours = hoursUntil(dueDate);
  if (diffHours < 0) {
    return { level: "vencido", message: "Vencido" as const };
  }

  if (diffHours <= 24) {
    return { level: "hoje", message: `Vence em ${Math.max(1, Math.floor(diffHours))}h` };
  }

  if (diffHours <= 48) {
    return { level: "um_dia", message: "Vence em 1 dia" as const };
  }

  return { level: "normal", message: "Em dia" as const };
}

export async function getStreamingResumo() {
  const { data, error } = await supabase
    .from("streaming_assinaturas")
    .select("id,data_vencimento,status_pagamento");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<Pick<StreamingRow, "id" | "data_vencimento" | "status_pagamento">>;
  let pendentes = 0;
  let vencendo24h = 0;
  let vencidos = 0;

  for (const row of rows) {
    const alert = dueAlert(row.status_pagamento, row.data_vencimento);
    if (row.status_pagamento === "pendente") pendentes += 1;
    if (alert.level === "hoje" || alert.level === "um_dia") vencendo24h += 1;
    if (alert.level === "vencido") vencidos += 1;
  }

  return {
    total: rows.length,
    pendentes,
    vencendo24h,
    vencidos
  };
}

export async function getStreamingVencimentos(limit = 10) {
  const { data, error } = await supabase
    .from("streaming_assinaturas")
    .select("id,cliente_nome,servidor,dispositivo,aplicativo,data_ativacao,data_vencimento,status_pagamento,created_at")
    .order("data_vencimento", { ascending: true })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as StreamingRow[];

  return rows
    .map((row) => ({
      ...row,
      alerta: dueAlert(row.status_pagamento, row.data_vencimento)
    }))
    .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
    .slice(0, limit);
}

export async function createStreamingRegistro(input: {
  cliente_nome: string;
  servidor: string;
  dispositivo: string;
  aplicativo: string;
  data_ativacao: string;
  data_vencimento: string;
}) {
  const { error } = await supabase.from("streaming_assinaturas").insert({
    ...input,
    status_pagamento: "pendente"
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateStreamingStatus(id: string, status: PaymentStatus) {
  const { error } = await supabase
    .from("streaming_assinaturas")
    .update({ status_pagamento: status })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getContasPagarResumo() {
  const { data, error } = await supabase
    .from("contas_pagar")
    .select("id,valor,data_vencimento,status_pagamento");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<Pick<ContaPagarRow, "id" | "valor" | "data_vencimento" | "status_pagamento">>;
  let pendentes = 0;
  let vencendo24h = 0;
  let vencidos = 0;
  let valorPendente = 0;

  for (const row of rows) {
    const alert = dueAlert(row.status_pagamento, row.data_vencimento);
    if (row.status_pagamento === "pendente") {
      pendentes += 1;
      valorPendente += Number(row.valor) || 0;
    }
    if (alert.level === "hoje" || alert.level === "um_dia") vencendo24h += 1;
    if (alert.level === "vencido") vencidos += 1;
  }

  return {
    total: rows.length,
    pendentes,
    vencendo24h,
    vencidos,
    valorPendente: Number(valorPendente.toFixed(2))
  };
}

export async function getContasPagarVencimentos(limit = 10) {
  const { data, error } = await supabase
    .from("contas_pagar")
    .select("id,descricao,fornecedor,valor,data_vencimento,status_pagamento,created_at")
    .order("data_vencimento", { ascending: true })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ContaPagarRow[];
  return rows
    .map((row) => ({
      ...row,
      alerta: dueAlert(row.status_pagamento, row.data_vencimento)
    }))
    .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
    .slice(0, limit);
}

export async function createContaPagar(input: {
  descricao: string;
  fornecedor: string | null;
  valor: number;
  data_vencimento: string;
}) {
  const { error } = await supabase.from("contas_pagar").insert({
    ...input,
    status_pagamento: "pendente"
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateContaPagarStatus(id: string, status: PaymentStatus) {
  const { error } = await supabase
    .from("contas_pagar")
    .update({ status_pagamento: status })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteContaPagar(id: string) {
  const { error } = await supabase.from("contas_pagar").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteStreamingRegistro(id: string) {
  const { error } = await supabase.from("streaming_assinaturas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
