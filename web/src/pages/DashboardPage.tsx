import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Activity, BarChart3, CheckCircle,
  ClipboardList, Clock, CreditCard, DollarSign, FileText, FolderOpen, Layers,
  Package, PackageX, Settings, TrendingUp, Warehouse, XCircle
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getContasPagarResumo,
  getEstoqueDashboard,
  getEstoquePorCategoria,
  getFaturamentoPorFormaPagamento,
  getFaturamentoResumo,
  getOsPorTecnico,
  getProdutosAbaixoMinimo,
  getReceitaMensal,
  getResumoDashboard,
  getStreamingResumo,
  getUltimasNotasServico
} from "../modules/dashboard/service";
import { useRealtimeChannel } from "../hooks/useRealtimeChannel";

const CHART_COLORS = ["#22d3ee", "#6366f1", "#34d399", "#f59e0b", "#f43f5e", "#a78bfa", "#fb923c"];

const tooltipStyle = {
  background: "rgba(2, 6, 23, 0.95)",
  border: "1px solid rgba(51, 65, 85, 0.6)",
  borderRadius: "12px",
  color: "#e2e8f0",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
} satisfies CSSProperties;

const STATUS_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  "Abertas": { icon: FolderOpen, color: "text-cyan-300" },
  "Em andamento": { icon: Settings, color: "text-blue-300" },
  "Concluídas": { icon: CheckCircle, color: "text-emerald-300" },
  "Canceladas": { icon: XCircle, color: "text-rose-300" },
  "Aguardando aprovação": { icon: Clock, color: "text-amber-300" }
};

export function DashboardPage() {
  const [periodoResumo, setPeriodoResumo] = useState<30 | 60 | 90>(30);
  const [mesesReceita, setMesesReceita] = useState<6 | 12>(6);
  const [legendOpacityKey, setLegendOpacityKey] = useState<string | null>(null);

  useRealtimeChannel(["dashboard-resumo"], "ordens_servico");
  useRealtimeChannel(["dashboard-tecnicos"], "ordens_servico");
  useRealtimeChannel(["dashboard-receita"], "notas_servico");
  useRealtimeChannel(["dashboard-faturamento-resumo"], "notas_servico");
  useRealtimeChannel(["dashboard-faturamento-forma"], "notas_servico");
  useRealtimeChannel(["dashboard-ultimas-notas"], "notas_servico");
  useRealtimeChannel(["dashboard-estoque-resumo", "dashboard-estoque-alertas", "dashboard-estoque-categoria"], "produtos");
  useRealtimeChannel(["dashboard-streaming-resumo"], "streaming_assinaturas");
  useRealtimeChannel(["dashboard-contas-resumo"], "contas_pagar");

  const { data: resumo, isLoading: loadingResumo, isError: erroResumo, error: resumoError } = useQuery({
    queryKey: ["dashboard-resumo", periodoResumo],
    queryFn: () => getResumoDashboard(periodoResumo)
  });

  const { data: osPorTecnico, isLoading: loadingTecnicos, isError: erroTecnicos, error: tecnicosError } = useQuery({
    queryKey: ["dashboard-tecnicos"],
    queryFn: () => getOsPorTecnico(6)
  });

  const { data: receitaMensal, isLoading: loadingReceita, isError: erroReceita, error: receitaError } = useQuery({
    queryKey: ["dashboard-receita", mesesReceita],
    queryFn: () => getReceitaMensal(mesesReceita)
  });

  const { data: faturamentoResumo, isLoading: loadingFaturamentoResumo, isError: erroFaturamentoResumo, error: faturamentoResumoError } = useQuery({
    queryKey: ["dashboard-faturamento-resumo"],
    queryFn: getFaturamentoResumo
  });

  const { data: faturamentoPorForma, isLoading: loadingFormaPagamento, isError: erroFormaPagamento, error: formaPagamentoError } = useQuery({
    queryKey: ["dashboard-faturamento-forma"],
    queryFn: () => getFaturamentoPorFormaPagamento(6)
  });

  const { data: ultimasNotas, isLoading: loadingUltimasNotas, isError: erroUltimasNotas, error: ultimasNotasError } = useQuery({
    queryKey: ["dashboard-ultimas-notas"],
    queryFn: () => getUltimasNotasServico(8)
  });

  const { data: estoqueResumo, isLoading: loadingEstoqueResumo, isError: erroEstoqueResumo, error: estoqueResumoError } = useQuery({
    queryKey: ["dashboard-estoque-resumo"],
    queryFn: getEstoqueDashboard
  });

  const { data: produtosAlerta, isLoading: loadingEstoqueAlertas, isError: erroEstoqueAlertas, error: estoqueAlertasError } = useQuery({
    queryKey: ["dashboard-estoque-alertas"],
    queryFn: () => getProdutosAbaixoMinimo(8)
  });

  const { data: estoquePorCategoria, isLoading: loadingEstoqueCategoria } = useQuery({
    queryKey: ["dashboard-estoque-categoria"],
    queryFn: getEstoquePorCategoria
  });

  const { data: streamingResumo, isLoading: loadingStreamingResumo, isError: erroStreamingResumo, error: streamingResumoError } = useQuery({
    queryKey: ["dashboard-streaming-resumo"],
    queryFn: getStreamingResumo
  });

  const { data: contasResumo, isLoading: loadingContasResumo, isError: erroContasResumo, error: contasResumoError } = useQuery({
    queryKey: ["dashboard-contas-resumo"],
    queryFn: getContasPagarResumo
  });

  const cards = [
    { label: "Abertas", value: resumo?.abertas ?? 0 },
    { label: "Em andamento", value: resumo?.andamento ?? 0 },
    { label: "Concluídas", value: resumo?.concluidas ?? 0 },
    { label: "Canceladas", value: resumo?.canceladas ?? 0 },
    { label: "Aguardando aprovação", value: resumo?.aguardando_aprovacao ?? 0 }
  ];

  const osStatusData = [
    { name: "Abertas", value: resumo?.abertas ?? 0 },
    { name: "Andamento", value: resumo?.andamento ?? 0 },
    { name: "Concluídas", value: resumo?.concluidas ?? 0 },
    { name: "Canceladas", value: resumo?.canceladas ?? 0 },
    { name: "Aguardando", value: resumo?.aguardando_aprovacao ?? 0 }
  ];

  const totalOs = cards.reduce((acc, c) => acc + c.value, 0);

  const hasAlgumErro = erroResumo || erroTecnicos || erroReceita || erroFaturamentoResumo || erroFormaPagamento || erroUltimasNotas || erroEstoqueResumo || erroEstoqueAlertas || erroStreamingResumo || erroContasResumo;

  const erroMsg = (resumoError as Error | undefined)?.message
    ?? (tecnicosError as Error | undefined)?.message
    ?? (receitaError as Error | undefined)?.message
    ?? (faturamentoResumoError as Error | undefined)?.message
    ?? (formaPagamentoError as Error | undefined)?.message
    ?? (ultimasNotasError as Error | undefined)?.message
    ?? (estoqueResumoError as Error | undefined)?.message
    ?? (estoqueAlertasError as Error | undefined)?.message
    ?? (streamingResumoError as Error | undefined)?.message
    ?? (contasResumoError as Error | undefined)?.message
    ?? "Verifique permissões RLS e conexão com o Supabase.";

  const faturamentoCards = [
    { label: "Faturamento atual", value: faturamentoResumo?.mesAtual ?? 0, icon: DollarSign, accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-300", ring: "ring-emerald-500/20" },
    { label: "Mês anterior", value: faturamentoResumo?.mesAnterior ?? 0, icon: TrendingUp, accent: "from-sky-500/20 to-sky-500/5 text-sky-300", ring: "ring-sky-500/20" },
    { label: "Ticket médio", value: faturamentoResumo?.ticketMedio ?? 0, icon: CreditCard, accent: "from-cyan-500/20 to-cyan-500/5 text-cyan-300", ring: "ring-cyan-500/20" },
    { label: "Notas no mês", value: faturamentoResumo?.notasMesAtual ?? 0, icon: FileText, accent: "from-indigo-500/20 to-indigo-500/5 text-indigo-300", ring: "ring-indigo-500/20", isMoney: false }
  ];

  const variacao = faturamentoResumo?.variacaoPercentual ?? 0;

  const moneyFormatter = useMemo(
    () => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
    []
  );

  const receitaComposta = useMemo(() => {
    let acumulado = 0;
    return (receitaMensal ?? []).map((item) => {
      acumulado += Number(item.receita ?? 0);
      return { ...item, receita_acumulada: Number(acumulado.toFixed(2)) };
    });
  }, [receitaMensal]);

  const getLegendOpacity = (key: string) => (legendOpacityKey && legendOpacityKey !== key ? 0.15 : 1);

  const echartsTheme = {
    textColor: "#cbd5e1",
    splitLine: "rgba(51,65,85,0.45)",
    axisLine: "rgba(100,116,139,0.55)",
    tooltipBg: "rgba(2,6,23,0.96)",
    tooltipBorder: "rgba(51,65,85,0.7)"
  };

  const statusDonutOption = useMemo(() => ({
    backgroundColor: "transparent",
    animationDuration: 650,
    animationEasing: "cubicOut",
    tooltip: {
      trigger: "item",
      backgroundColor: echartsTheme.tooltipBg,
      borderColor: echartsTheme.tooltipBorder,
      textStyle: { color: echartsTheme.textColor },
      formatter: "{b}: {c} ({d}%)"
    },
    legend: {
      bottom: 0,
      textStyle: { color: "#94a3b8", fontSize: 11 }
    },
    series: [
      {
        type: "pie",
        radius: ["46%", "72%"],
        center: ["50%", "42%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#0b1220",
          borderWidth: 2
        },
        label: { show: false },
        data: osStatusData.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] }
        }))
      }
    ]
  }), [osStatusData]);

  const osTecnicoOption = useMemo(() => ({
    backgroundColor: "transparent",
    animationDuration: 650,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: echartsTheme.tooltipBg,
      borderColor: echartsTheme.tooltipBorder,
      textStyle: { color: echartsTheme.textColor }
    },
    grid: { left: 8, right: 8, top: 8, bottom: 32, containLabel: true },
    xAxis: {
      type: "category",
      data: (osPorTecnico ?? []).map((item) => item.tecnico),
      axisLine: { lineStyle: { color: echartsTheme.axisLine } },
      axisLabel: { color: "#94a3b8", fontSize: 11 }
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: echartsTheme.splitLine, type: "dashed" } },
      axisLabel: { color: "#94a3b8", fontSize: 11 }
    },
    series: [
      {
        name: "OS",
        type: "bar",
        barWidth: "48%",
        data: (osPorTecnico ?? []).map((item) => item.total),
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: "#6366f1"
        }
      }
    ]
  }), [osPorTecnico]);

  const receitaMensalOption = useMemo(() => ({
    backgroundColor: "transparent",
    animationDuration: 700,
    tooltip: {
      trigger: "axis",
      backgroundColor: echartsTheme.tooltipBg,
      borderColor: echartsTheme.tooltipBorder,
      textStyle: { color: echartsTheme.textColor },
      formatter: (params: Array<{ axisValueLabel: string; value: number }>) => {
        const p = params?.[0];
        if (!p) return "";
        return `${p.axisValueLabel}<br/>Receita: ${moneyFormatter.format(Number(p.value ?? 0))}`;
      }
    },
    grid: { left: 8, right: 8, top: 8, bottom: 28, containLabel: true },
    xAxis: {
      type: "category",
      data: (receitaMensal ?? []).map((item) => item.mes),
      axisLine: { lineStyle: { color: echartsTheme.axisLine } },
      axisLabel: { color: "#94a3b8", fontSize: 11 }
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: echartsTheme.splitLine, type: "dashed" } },
      axisLabel: {
        color: "#94a3b8",
        formatter: (value: number) => moneyFormatter.format(Number(value ?? 0))
      }
    },
    series: [
      {
        name: "Receita",
        type: "line",
        smooth: true,
        showSymbol: true,
        symbolSize: 7,
        lineStyle: { width: 3, color: "#22d3ee" },
        itemStyle: { color: "#22d3ee" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(34,211,238,0.35)" },
              { offset: 1, color: "rgba(34,211,238,0.02)" }
            ]
          }
        },
        data: (receitaMensal ?? []).map((item) => Number(item.receita ?? 0))
      }
    ]
  }), [moneyFormatter, receitaMensal]);

  function LoadingBlock() {
    return <div className="flex h-full items-center justify-center"><div className="skeleton h-4 w-32" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rise-in flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Dashboard</h2>
          <p className="mt-0.5 text-sm text-slate-300">Visão geral da operação em tempo real</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-700/80 bg-slate-950/80 p-1">
            {[30, 60, 90].map((dias) => (
              <button
                key={dias}
                onClick={() => setPeriodoResumo(dias as 30 | 60 | 90)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${periodoResumo === dias ? "bg-cyan-500/20 text-cyan-100 shadow-sm" : "text-slate-300 hover:text-white"}`}
              >
                {dias}d
              </button>
            ))}
          </div>
          <div className="flex rounded-xl border border-slate-700/80 bg-slate-950/80 p-1">
            {[6, 12].map((meses) => (
              <button
                key={meses}
                onClick={() => setMesesReceita(meses as 6 | 12)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${mesesReceita === meses ? "bg-indigo-500/20 text-indigo-100 shadow-sm" : "text-slate-300 hover:text-white"}`}
              >
                {meses}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {hasAlgumErro && (
        <div className="rise-in rounded-xl border border-rose-500/20 bg-rose-950/20 px-4 py-3 text-sm">
          <p className="font-medium text-rose-200">Alguns dados não puderam ser carregados.</p>
          <p className="mt-0.5 text-rose-300/80">{erroMsg}</p>
        </div>
      )}

      <div className="flex flex-col gap-6">

      {/* ── Faturamento ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="rise-in flex flex-wrap items-center justify-between gap-3" style={{ animationDelay: "100ms" }}>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Faturamento</h3>
            <p className="text-xs text-slate-400">Visão financeira consolidada</p>
          </div>
          <div className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${variacao >= 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
            {variacao >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {variacao >= 0 ? "+" : ""}{variacao.toFixed(1)}% M/M
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {faturamentoCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card rise-in overflow-hidden p-4" style={{ animationDelay: `${140 + index * 40}ms` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-400">{card.label}</p>
                    <p className={`mt-1.5 text-xl font-bold tracking-tight ${card.accent.split(" ").pop()}`}>
                      {loadingFaturamentoResumo ? "..." : card.isMoney === false ? String(card.value) : moneyFormatter.format(card.value)}
                    </p>
                  </div>
                  <div className={`rounded-xl bg-gradient-to-br ${card.accent} p-2.5 ring-1 ${card.ring}`}>
                    <Icon size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "300ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Por Forma de Pagamento</h3>
            </div>
            <div className="h-64">
              {loadingFormaPagamento ? <LoadingBlock /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={faturamentoPorForma ?? []} layout="vertical" barCategoryGap="20%">
                    <defs>
                      <linearGradient id="bar-forma" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => moneyFormatter.format(Number(v))} />
                    <YAxis type="category" dataKey="forma" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => moneyFormatter.format(Number(value ?? 0))} labelStyle={{ color: "#94a3b8" }} />
                    <Bar dataKey="total" fill="url(#bar-forma)" radius={[0, 8, 8, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "360ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <FileText size={16} className="text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-200">Últimas Notas Emitidas</h3>
            </div>
            {loadingUltimasNotas ? <LoadingBlock /> : (
              <div className="overflow-auto">
                <table className="table-pro min-w-full">
                  <thead>
                    <tr>
                      <th>Nota</th>
                      <th>Data</th>
                      <th>Pagamento</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ultimasNotas ?? []).map((nota) => (
                      <tr key={nota.id}>
                        <td className="font-medium text-cyan-200">#{nota.numero ?? "-"}</td>
                        <td className="text-slate-300">{new Date(nota.created_at).toLocaleDateString("pt-BR")}</td>
                        <td><span className="badge bg-slate-800/60 text-slate-300">{nota.forma_pagamento ?? "N/I"}</span></td>
                        <td className="text-right font-medium text-slate-200">{moneyFormatter.format(Number(nota.total ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Status Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card, index) => {
          const meta = STATUS_ICONS[card.label] ?? { icon: ClipboardList, color: "text-slate-300" };
          const Icon = meta.icon;
          return (
            <div key={card.label} className="card rise-in flex items-center gap-4 p-4" style={{ animationDelay: `${50 + index * 40}ms` }}>
              <span className={`${meta.color}`}><Icon size={28} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-300">{card.label}</p>
                <p className={`text-2xl font-bold tracking-tight ${meta.color}`}>{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Donut */}
        <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "620ms" }}>
          <div className="mb-4 flex items-center gap-2">
            <Layers size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Distribuição por Status</h3>
            <span className="ml-auto rounded-lg bg-slate-800/80 px-2 py-0.5 text-xs text-slate-300">{totalOs} total</span>
          </div>
          <div className="h-64">
            {loadingResumo ? <LoadingBlock /> : <ReactECharts option={statusDonutOption} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />}
          </div>
        </div>

        {/* Bar: Técnicos */}
        <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "680ms" }}>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">OS por Técnico</h3>
          </div>
          <div className="h-64">
            {loadingTecnicos ? <LoadingBlock /> : <ReactECharts option={osTecnicoOption} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />}
          </div>
        </div>
      </div>

      {/* Receita mensal - Area chart */}
      <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "740ms" }}>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200">Receita Mensal</h3>
          <span className="ml-auto text-xs text-slate-300">Últimos {mesesReceita} meses</span>
        </div>
        <div className="h-72">
          {loadingReceita ? <LoadingBlock /> : <ReactECharts option={receitaMensalOption} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />}
        </div>
      </div>

      {/* Charts Row 2: Composed + Legend Opacity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "800ms" }}>
          <div className="mb-4 flex items-center gap-2">
            <Activity size={16} className="text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-200">Receita × Notas × Acumulado</h3>
          </div>
          <div className="h-72">
            {loadingReceita ? <LoadingBlock /> : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={receitaComposta}>
                  <defs>
                    <linearGradient id="area-acum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="bar-notas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.25} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="financeiro" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => moneyFormatter.format(Number(v))} />
                  <YAxis yAxisId="quantidade" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => name === "notas" ? [`${value} notas`, "Notas"] : [moneyFormatter.format(Number(value ?? 0)), name === "receita_acumulada" ? "Acumulado" : "Receita"]} labelStyle={{ color: "#94a3b8" }} />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                  <Area yAxisId="financeiro" type="monotone" dataKey="receita_acumulada" fill="url(#area-acum)" stroke="#38bdf8" strokeWidth={1.5} name="Acumulado" />
                  <Bar yAxisId="quantidade" dataKey="notas" fill="url(#bar-notas)" radius={[6, 6, 0, 0]} maxBarSize={28} name="Notas" />
                  <Line yAxisId="financeiro" type="monotone" dataKey="receita" stroke="#67e8f9" strokeWidth={2.5} dot={{ r: 3, fill: "#67e8f9" }} name="Receita" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "860ms" }}>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-slate-200">Receita × Ticket Médio</h3>
            <span className="ml-auto text-[10px] text-slate-500">Passe o mouse na legenda</span>
          </div>
          <div className="h-72">
            {loadingReceita ? <LoadingBlock /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={receitaComposta}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="receita" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => moneyFormatter.format(Number(v))} />
                  <YAxis yAxisId="ticket" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => moneyFormatter.format(Number(v))} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => moneyFormatter.format(Number(value ?? 0))} labelStyle={{ color: "#94a3b8" }} />
                  <Legend
                    wrapperStyle={{ color: "#94a3b8", fontSize: 12, cursor: "pointer" }}
                    onMouseEnter={(payload) => setLegendOpacityKey(payload?.dataKey ? String(payload.dataKey) : null)}
                    onMouseLeave={() => setLegendOpacityKey(null)}
                  />
                  <Line yAxisId="receita" type="monotone" dataKey="receita" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3 }} strokeOpacity={getLegendOpacity("receita")} name="Receita" />
                  <Line yAxisId="ticket" type="monotone" dataKey="ticket_medio" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3 }} strokeOpacity={getLegendOpacity("ticket_medio")} name="Ticket médio" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Painel Executivo: Streaming + Contas ─────────────────────────── */}
      <section className="card-static rise-in overflow-hidden border-cyan-500/20 bg-gradient-to-br from-[#041325] via-[#061a31] to-[#081426] p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_18px_45px_rgba(2,6,23,0.55)]" style={{ animationDelay: "920ms" }}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/70">Painel Executivo</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Streaming e Financeiro em Tempo Real</h3>
            <p className="text-xs text-slate-300/80">Tudo que exige ação imediata aparece aqui.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/streaming" className="btn-ghost !border-cyan-500/30 !text-cyan-200">Abrir Streaming</Link>
            <Link to="/contas-pagar" className="btn-ghost !border-indigo-500/30 !text-indigo-200">Abrir Contas</Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <p className="text-xs text-cyan-200/80">Streaming pendentes</p>
            <p className="mt-1 text-3xl font-bold text-cyan-200">{loadingStreamingResumo ? "..." : String(streamingResumo?.pendentes ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-xs text-rose-200/80">Streaming vencidos</p>
            <p className="mt-1 text-3xl font-bold text-rose-300">{loadingStreamingResumo ? "..." : String(streamingResumo?.vencidos ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="text-xs text-indigo-200/80">Contas pendentes</p>
            <p className="mt-1 text-3xl font-bold text-indigo-200">{loadingContasResumo ? "..." : String(contasResumo?.pendentes ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs text-amber-200/80">Valor pendente</p>
            <p className="mt-1 text-2xl font-bold text-amber-300">{loadingContasResumo ? "..." : moneyFormatter.format(contasResumo?.valorPendente ?? 0)}</p>
          </div>
        </div>
      </section>

      {/* ── Estoque ─────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        {/* Header da seção */}
        <div className="rise-in flex flex-wrap items-center justify-between gap-3" style={{ animationDelay: "820ms" }}>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Estoque</h3>
            <p className="text-xs text-slate-400">Posição atual do inventário</p>
          </div>
          {(estoqueResumo?.alertas ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-300 ring-1 ring-amber-500/20">
              <AlertTriangle size={14} />
              {estoqueResumo?.alertas} {estoqueResumo?.alertas === 1 ? "item" : "itens"} com alerta
            </div>
          )}
        </div>

        {/* KPI cards de estoque */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total de Produtos",
              value: loadingEstoqueResumo ? "..." : String(estoqueResumo?.totalProdutos ?? 0),
              icon: Package,
              accent: "from-cyan-500/20 to-cyan-500/5 text-cyan-300",
              ring: "ring-cyan-500/20"
            },
            {
              label: "Abaixo do Mínimo",
              value: loadingEstoqueResumo ? "..." : String(estoqueResumo?.abaixoMinimo ?? 0),
              icon: AlertTriangle,
              accent: (estoqueResumo?.abaixoMinimo ?? 0) > 0
                ? "from-amber-500/20 to-amber-500/5 text-amber-300"
                : "from-slate-500/20 to-slate-500/5 text-slate-300",
              ring: (estoqueResumo?.abaixoMinimo ?? 0) > 0 ? "ring-amber-500/20" : "ring-slate-600/20"
            },
            {
              label: "Itens Zerados",
              value: loadingEstoqueResumo ? "..." : String(estoqueResumo?.zerados ?? 0),
              icon: PackageX,
              accent: (estoqueResumo?.zerados ?? 0) > 0
                ? "from-rose-500/20 to-rose-500/5 text-rose-300"
                : "from-slate-500/20 to-slate-500/5 text-slate-300",
              ring: (estoqueResumo?.zerados ?? 0) > 0 ? "ring-rose-500/20" : "ring-slate-600/20"
            },
            {
              label: "Valor em Estoque",
              value: loadingEstoqueResumo ? "..." : moneyFormatter.format(estoqueResumo?.valorVenda ?? 0),
              icon: Warehouse,
              accent: "from-indigo-500/20 to-indigo-500/5 text-indigo-300",
              ring: "ring-indigo-500/20"
            }
          ].map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card rise-in overflow-hidden p-4" style={{ animationDelay: `${860 + index * 40}ms` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-400">{card.label}</p>
                    <p className={`mt-1.5 text-xl font-bold tracking-tight ${card.accent.split(" ").pop()}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`rounded-xl bg-gradient-to-br ${card.accent} p-2.5 ring-1 ${card.ring}`}>
                    <Icon size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gráfico por categoria + Alertas */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Gráfico: Estoque por Categoria */}
          <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "1000ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Estoque por Categoria</h3>
              <span className="ml-auto text-xs text-slate-500">Atual vs Mínimo</span>
            </div>
            <div className="h-64">
              {loadingEstoqueCategoria ? <LoadingBlock /> : (estoquePorCategoria?.length ?? 0) === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Nenhum produto cadastrado</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={estoquePorCategoria ?? []} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="bar-estoque-atual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.3} />
                      </linearGradient>
                      <linearGradient id="bar-estoque-minimo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                    <XAxis dataKey="categoria" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: "#cbd5e1" }}
                      cursor={{ fill: "rgba(99,102,241,0.06)" }}
                    />
                    <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                    <Bar dataKey="atual" name="Atual" fill="url(#bar-estoque-atual)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="minimo" name="Mínimo" fill="url(#bar-estoque-minimo)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tabela: Itens abaixo do mínimo */}
          <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "1060ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">Itens que Precisam de Reposição</h3>
            </div>
            {loadingEstoqueAlertas ? <LoadingBlock /> : (produtosAlerta?.length ?? 0) === 0 ? (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-emerald-400">
                <Package size={16} />
                Todos os itens estão dentro do estoque mínimo
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="table-pro min-w-full">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Categoria</th>
                      <th className="text-right">Atual</th>
                      <th className="text-right">Mínimo</th>
                      <th className="text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(produtosAlerta ?? []).map((produto) => {
                      const zerado = Number(produto.estoque_atual) === 0;
                      return (
                        <tr key={produto.id}>
                          <td className="font-medium text-slate-200">{produto.nome}</td>
                          <td><span className="badge bg-slate-800/60 text-slate-300">{produto.categoria}</span></td>
                          <td className={`text-right font-bold ${zerado ? "text-rose-300" : "text-amber-300"}`}>
                            {produto.estoque_atual}
                          </td>
                          <td className="text-right text-slate-400">{produto.estoque_minimo}</td>
                          <td className="text-right">
                            {zerado ? (
                              <span className="badge bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/20">Zerado</span>
                            ) : (
                              <span className="badge bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20">Baixo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      </div>

      {/* Footer info */}
      <div className="rise-in flex items-center gap-2 rounded-xl border border-slate-800/40 bg-slate-900/30 px-4 py-3 text-xs text-slate-500" style={{ animationDelay: "800ms" }}>
        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        Realtime ativo — atualizações chegam automaticamente via Supabase
      </div>
    </div>
  );
}
