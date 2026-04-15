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
