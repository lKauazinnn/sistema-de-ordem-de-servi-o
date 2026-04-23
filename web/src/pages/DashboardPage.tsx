import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  FolderOpen,
  Layers,
  Package,
  PackageX,
  Settings,
  TrendingUp,
  Warehouse,
  XCircle,
  Zap
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

/* ── Custom Tooltip: gráficos de linha/barra/área ── */
function ChartTooltip({ active, payload, label, money = false }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  money?: boolean;
}) {
  const fmt = useMemo(() => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }), []);
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] rounded-xl border border-white/10 bg-black/95 px-3.5 py-3 shadow-2xl backdrop-blur-sm">
      {label && <p className="mb-2.5 border-b border-white/8 pb-2 text-xs font-medium text-slate-400">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: entry.color }} />
            <span className="text-xs text-slate-300">{entry.name}</span>
            <span className="ml-auto pl-3 text-xs font-semibold text-white">
              {money ? fmt.format(Number(entry.value ?? 0)) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Custom Tooltip: pizza ── */
function PieTooltip({ active, payload, money = false }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill?: string; percent?: number } }>;
  money?: boolean;
}) {
  const fmt = useMemo(() => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }), []);
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const pct = entry.payload?.percent != null ? `${(entry.payload.percent * 100).toFixed(1)}%` : "";
  return (
    <div className="rounded-xl border border-white/10 bg-black/95 px-3.5 py-3 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.payload?.fill ?? CHART_COLORS[0] }} />
        <span className="text-xs font-semibold text-slate-200">{entry.name}</span>
      </div>
      <p className="text-xl font-bold text-white">
        {money ? fmt.format(Number(entry.value ?? 0)) : entry.value}
      </p>
      {pct && <p className="mt-0.5 text-xs text-slate-400">{pct} do total</p>}
    </div>
  );
}

/* ── Donut com texto central ── */
function DonutChart({ data, total, label, money = false }: {
  data: Array<{ name: string; value: number }>;
  total: string;
  label: string;
  money?: boolean;
}) {
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="82%"
            cornerRadius={8}
            paddingAngle={4}
            dataKey="value"
            nameKey="name"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip content={(props) => <PieTooltip {...props} money={money} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <p className="text-2xl font-bold tracking-tight text-white">{total}</p>
        <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

/* ── Legenda customizada para pizza ── */
function PieLegend({ data }: { data: Array<{ name: string; value: number | string }> }) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {data.map((item, i) => (
        <div key={item.name} className="flex items-center gap-1.5">
          <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
          <span className="text-xs text-slate-400">{item.name}</span>
          <span className="text-xs font-semibold text-slate-200">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="font-display text-lg font-bold text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {badge}
    </div>
  );
}

/* ── KPI card ── */
function KpiCard({ label, value, icon: Icon, color, accent, ring, loading, delay = 0 }: {
  label: string; value: string; icon: LucideIcon; color: string;
  accent: string; ring: string; loading?: boolean; delay?: number;
}) {
  return (
    <div className="card rise-in p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-400">{label}</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${color}`}>{loading ? "—" : value}</p>
        </div>
        <div className={`shrink-0 rounded-xl bg-gradient-to-br ${accent} p-2.5 ring-1 ${ring}`}>
          <Icon size={16} className={color} />
        </div>
      </div>
    </div>
  );
}

function LoadingChart() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="skeleton h-3 w-24 rounded-lg" />
    </div>
  );
}

const STATUS_META: Record<string, { icon: LucideIcon; color: string; accent: string; ring: string }> = {
  "Abertas":              { icon: FolderOpen,  color: "text-cyan-300",    accent: "from-cyan-500/20 to-cyan-500/5",    ring: "ring-cyan-500/20" },
  "Em andamento":         { icon: Settings,    color: "text-blue-300",    accent: "from-blue-500/20 to-blue-500/5",    ring: "ring-blue-500/20" },
  "Concluídas":           { icon: CheckCircle, color: "text-emerald-300", accent: "from-emerald-500/20 to-emerald-500/5", ring: "ring-emerald-500/20" },
  "Canceladas":           { icon: XCircle,     color: "text-rose-300",    accent: "from-rose-500/20 to-rose-500/5",    ring: "ring-rose-500/20" },
  "Aguardando aprovação": { icon: Clock,       color: "text-amber-300",   accent: "from-amber-500/20 to-amber-500/5",  ring: "ring-amber-500/20" }
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

  const { data: resumo, isLoading: loadingResumo, isError: erroResumo, error: resumoError } = useQuery({ queryKey: ["dashboard-resumo", periodoResumo], queryFn: () => getResumoDashboard(periodoResumo) });
  const { data: osPorTecnico, isLoading: loadingTecnicos, isError: erroTecnicos, error: tecnicosError } = useQuery({ queryKey: ["dashboard-tecnicos"], queryFn: () => getOsPorTecnico(6) });
  const { data: receitaMensal, isLoading: loadingReceita, isError: erroReceita, error: receitaError } = useQuery({ queryKey: ["dashboard-receita", mesesReceita], queryFn: () => getReceitaMensal(mesesReceita) });
  const { data: faturamentoResumo, isLoading: loadingFaturamentoResumo, isError: erroFaturamentoResumo, error: faturamentoResumoError } = useQuery({ queryKey: ["dashboard-faturamento-resumo"], queryFn: getFaturamentoResumo });
  const { data: faturamentoPorForma, isLoading: loadingFormaPagamento, isError: erroFormaPagamento, error: formaPagamentoError } = useQuery({ queryKey: ["dashboard-faturamento-forma"], queryFn: () => getFaturamentoPorFormaPagamento(6) });
  const { data: ultimasNotas, isLoading: loadingUltimasNotas, isError: erroUltimasNotas, error: ultimasNotasError } = useQuery({ queryKey: ["dashboard-ultimas-notas"], queryFn: () => getUltimasNotasServico(8) });
  const { data: estoqueResumo, isLoading: loadingEstoqueResumo, isError: erroEstoqueResumo, error: estoqueResumoError } = useQuery({ queryKey: ["dashboard-estoque-resumo"], queryFn: getEstoqueDashboard });
  const { data: produtosAlerta, isLoading: loadingEstoqueAlertas, isError: erroEstoqueAlertas, error: estoqueAlertasError } = useQuery({ queryKey: ["dashboard-estoque-alertas"], queryFn: () => getProdutosAbaixoMinimo(8) });
  const { data: estoquePorCategoria, isLoading: loadingEstoqueCategoria } = useQuery({ queryKey: ["dashboard-estoque-categoria"], queryFn: getEstoquePorCategoria });
  const { data: streamingResumo, isLoading: loadingStreamingResumo, isError: erroStreamingResumo, error: streamingResumoError } = useQuery({ queryKey: ["dashboard-streaming-resumo"], queryFn: getStreamingResumo });
  const { data: contasResumo, isLoading: loadingContasResumo, isError: erroContasResumo, error: contasResumoError } = useQuery({ queryKey: ["dashboard-contas-resumo"], queryFn: getContasPagarResumo });

  const fmt = useMemo(() => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }), []);

  const osStatusData = useMemo(() => [
    { name: "Abertas",    value: resumo?.abertas ?? 0 },
    { name: "Andamento",  value: resumo?.andamento ?? 0 },
    { name: "Concluídas", value: resumo?.concluidas ?? 0 },
    { name: "Canceladas", value: resumo?.canceladas ?? 0 },
    { name: "Aguardando", value: resumo?.aguardando_aprovacao ?? 0 }
  ], [resumo]);

  const formaPagamentoData = useMemo(
    () => (faturamentoPorForma ?? []).map((item) => ({ name: item.forma, value: Number(item.total ?? 0) })),
    [faturamentoPorForma]
  );

  const osCards = useMemo(() => [
    { label: "Abertas",              value: resumo?.abertas ?? 0 },
    { label: "Em andamento",         value: resumo?.andamento ?? 0 },
    { label: "Concluídas",           value: resumo?.concluidas ?? 0 },
    { label: "Canceladas",           value: resumo?.canceladas ?? 0 },
    { label: "Aguardando aprovação", value: resumo?.aguardando_aprovacao ?? 0 }
  ], [resumo]);

  const totalOs = osCards.reduce((a, c) => a + c.value, 0);
  const totalPorForma = formaPagamentoData.reduce((a, c) => a + c.value, 0);
  const variacao = faturamentoResumo?.variacaoPercentual ?? 0;

  const receitaComposta = useMemo(() => {
    let acum = 0;
    return (receitaMensal ?? []).map((item) => {
      acum += Number(item.receita ?? 0);
      return { ...item, receita_acumulada: Number(acum.toFixed(2)) };
    });
  }, [receitaMensal]);

  const avgReceita = useMemo(() => {
    const d = receitaMensal ?? [];
    if (!d.length) return 0;
    return d.reduce((a, item) => a + Number(item.receita ?? 0), 0) / d.length;
  }, [receitaMensal]);

  const contasSimulacao = useMemo(() => {
    const base = Number(contasResumo?.valorPendente ?? 0);
    const recebiveisMes = Number(faturamentoResumo?.mesAtual ?? 0);
    const d7  = Number((base * 0.35).toFixed(2));
    const d15 = Number((base * 0.30).toFixed(2));
    const d30 = Number(Math.max(base - d7 - d15, 0).toFixed(2));
    return { d7, d15, d30, folga: Number((recebiveisMes - base).toFixed(2)) };
  }, [contasResumo?.valorPendente, faturamentoResumo?.mesAtual]);

  const getLegendOpacity = (key: string) => (legendOpacityKey && legendOpacityKey !== key ? 0.15 : 1);

  const axisTick = { fill: "#4b5563", fontSize: 11 };
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="rgba(40,40,40,0.9)" vertical={false} />;

  const hasAlgumErro = erroResumo || erroTecnicos || erroReceita || erroFaturamentoResumo || erroFormaPagamento || erroUltimasNotas || erroEstoqueResumo || erroEstoqueAlertas || erroStreamingResumo || erroContasResumo;
  const erroMsg = (resumoError as Error | undefined)?.message ?? (tecnicosError as Error | undefined)?.message ?? (receitaError as Error | undefined)?.message ?? (faturamentoResumoError as Error | undefined)?.message ?? (formaPagamentoError as Error | undefined)?.message ?? (ultimasNotasError as Error | undefined)?.message ?? (estoqueResumoError as Error | undefined)?.message ?? (estoqueAlertasError as Error | undefined)?.message ?? (streamingResumoError as Error | undefined)?.message ?? (contasResumoError as Error | undefined)?.message ?? "Verifique permissões RLS e conexão com o Supabase.";

  return (
    <div className="space-y-7">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="rise-in flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Dashboard</h2>
          <p className="mt-0.5 text-sm text-slate-500">Visão executiva da operação em tempo real</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-white/8 bg-white/[0.04] p-1">
            {([30, 60, 90] as const).map((d) => (
              <button key={d} onClick={() => setPeriodoResumo(d)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${periodoResumo === d ? "bg-cyan-500/20 text-cyan-200" : "text-slate-500 hover:text-slate-200"}`}>
                {d}d
              </button>
            ))}
          </div>
          <div className="flex rounded-xl border border-white/8 bg-white/[0.04] p-1">
            {([6, 12] as const).map((m) => (
              <button key={m} onClick={() => setMesesReceita(m)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${mesesReceita === m ? "bg-indigo-500/20 text-indigo-200" : "text-slate-500 hover:text-slate-200"}`}>
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasAlgumErro && (
        <div className="rise-in rounded-xl border border-rose-500/20 bg-rose-950/20 px-4 py-3 text-sm">
          <p className="font-medium text-rose-200">Alguns dados não puderam ser carregados.</p>
          <p className="mt-0.5 text-rose-300/60">{erroMsg}</p>
        </div>
      )}

      {/* ── 1. KPIs de Ordens de Serviço ─────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader title="Ordens de Serviço" subtitle={`Últimos ${periodoResumo} dias`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {osCards.map((card, i) => {
            const meta = STATUS_META[card.label] ?? { icon: ClipboardList, color: "text-slate-300", accent: "from-slate-500/20 to-slate-500/5", ring: "ring-slate-500/20" };
            return (
              <KpiCard
                key={card.label}
                label={card.label}
                value={String(card.value)}
                icon={meta.icon}
                color={meta.color}
                accent={meta.accent}
                ring={meta.ring}
                loading={loadingResumo}
                delay={60 + i * 35}
              />
            );
          })}
        </div>
      </section>

      {/* ── 2. Gráficos de Pizza + Bar + Contas ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* Donut: Status das OS */}
        <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "60ms" }}>
          <div className="mb-3 flex items-center gap-2">
            <Layers size={14} className="text-cyan-400" />
            <h4 className="text-sm font-semibold text-slate-200">Status das OS</h4>
            <span className="ml-auto rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">{totalOs} total</span>
          </div>
          <div className="h-52">
            {loadingResumo ? <LoadingChart /> : (
              <DonutChart
                data={osStatusData}
                total={String(totalOs)}
                label="ordens"
              />
            )}
          </div>
          {!loadingResumo && <PieLegend data={osStatusData} />}
        </div>

        {/* Donut: Receita por Pagamento */}
        <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "100ms" }}>
          <div className="mb-3 flex items-center gap-2">
            <CreditCard size={14} className="text-indigo-400" />
            <h4 className="text-sm font-semibold text-slate-200">Receita por Pagamento</h4>
            <span className="ml-auto rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">{fmt.format(totalPorForma)}</span>
          </div>
          <div className="h-52">
            {loadingFormaPagamento ? <LoadingChart /> : (
              <DonutChart
                data={formaPagamentoData}
                total={fmt.format(totalPorForma)}
                label="recebido"
                money
              />
            )}
          </div>
          {!loadingFormaPagamento && <PieLegend data={formaPagamentoData.map(d => ({ ...d, value: fmt.format(d.value) }))} />}
        </div>

        {/* Bar: OS por Técnico */}
        <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "140ms" }}>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 size={14} className="text-violet-400" />
            <h4 className="text-sm font-semibold text-slate-200">OS por Técnico</h4>
          </div>
          <div className="h-52">
            {loadingTecnicos ? <LoadingChart /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={osPorTecnico ?? []} barCategoryGap="30%" margin={{ top: 16, right: 4, bottom: 0, left: -16 }}>
                  {grid}
                  <XAxis dataKey="tecnico" tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={(props) => <ChartTooltip {...props} />} />
                  <Bar dataKey="total" name="Ordens" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    <LabelList dataKey="total" position="top" style={{ fill: "#6b7280", fontSize: 10, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Contas a Pagar simulação */}
        <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "180ms" }}>
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-amber-400" />
                <h4 className="text-sm font-semibold text-slate-200">Contas a Pagar</h4>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">Simulação de desembolso</p>
            </div>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">Simulação</span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: "7 dias",  value: contasSimulacao.d7,    color: "text-rose-300",    bg: "bg-rose-500/8" },
              { label: "15 dias", value: contasSimulacao.d15,   color: "text-amber-300",   bg: "bg-amber-500/8" },
              { label: "30 dias", value: contasSimulacao.d30,   color: "text-cyan-300",    bg: "bg-cyan-500/8" },
              { label: "Folga",   value: contasSimulacao.folga,  color: contasSimulacao.folga >= 0 ? "text-emerald-300" : "text-rose-300", bg: contasSimulacao.folga >= 0 ? "bg-emerald-500/8" : "bg-rose-500/8" }
            ].map((row) => (
              <div key={row.label} className={`flex items-center justify-between rounded-xl px-3 py-2 ${row.bg}`}>
                <p className="text-[11px] text-slate-500">{row.label}</p>
                <p className={`text-xs font-bold ${row.color}`}>{fmt.format(row.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Faturamento ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Faturamento"
          subtitle="Visão financeira consolidada"
          badge={
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${variacao >= 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
              {variacao >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {variacao >= 0 ? "+" : ""}{variacao.toFixed(1)}% vs mês anterior
            </div>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Faturamento atual", value: fmt.format(faturamentoResumo?.mesAtual ?? 0),    icon: DollarSign, color: "text-emerald-300", accent: "from-emerald-500/20 to-emerald-500/5", ring: "ring-emerald-500/20" },
            { label: "Mês anterior",      value: fmt.format(faturamentoResumo?.mesAnterior ?? 0), icon: TrendingUp, color: "text-sky-300",     accent: "from-sky-500/20 to-sky-500/5",        ring: "ring-sky-500/20" },
            { label: "Ticket médio",      value: fmt.format(faturamentoResumo?.ticketMedio ?? 0), icon: CreditCard, color: "text-cyan-300",    accent: "from-cyan-500/20 to-cyan-500/5",      ring: "ring-cyan-500/20" },
            { label: "Notas no mês",      value: String(faturamentoResumo?.notasMesAtual ?? 0),   icon: FileText,   color: "text-indigo-300",  accent: "from-indigo-500/20 to-indigo-500/5",  ring: "ring-indigo-500/20" }
          ].map((card, i) => (
            <KpiCard key={card.label} {...card} loading={loadingFaturamentoResumo} delay={400 + i * 40} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Forma de Pagamento */}
          <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "560ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <CreditCard size={14} className="text-cyan-400" />
              <h4 className="text-sm font-semibold text-slate-200">Por Forma de Pagamento</h4>
            </div>
            <div className="h-56">
              {loadingFormaPagamento ? <LoadingChart /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={faturamentoPorForma ?? []} layout="vertical" barCategoryGap="22%" margin={{ top: 0, right: 60, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="grad-forma" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(40,40,40,0.9)" horizontal={false} />
                    <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => fmt.format(Number(v))} />
                    <YAxis type="category" dataKey="forma" tick={axisTick} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={(props) => <ChartTooltip {...props} money />} />
                    <Bar dataKey="total" name="Total" fill="url(#grad-forma)" radius={[0, 6, 6, 0]} maxBarSize={28}>
                      <LabelList dataKey="total" position="right" formatter={(v: number) => fmt.format(Number(v))} style={{ fill: "#6b7280", fontSize: 10 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Últimas Notas */}
          <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "600ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <FileText size={14} className="text-indigo-400" />
              <h4 className="text-sm font-semibold text-slate-200">Últimas Notas Emitidas</h4>
            </div>
            {loadingUltimasNotas ? <LoadingChart /> : (
              <div className="overflow-auto">
                <table className="table-pro min-w-full">
                  <thead><tr><th>Nota</th><th>Data</th><th>Forma</th><th className="text-right">Total</th></tr></thead>
                  <tbody>
                    {(ultimasNotas ?? []).map((nota) => (
                      <tr key={nota.id}>
                        <td className="font-semibold text-cyan-300">#{nota.numero ?? "—"}</td>
                        <td className="text-slate-400">{new Date(nota.created_at).toLocaleDateString("pt-BR")}</td>
                        <td><span className="badge bg-white/5 text-slate-400">{nota.forma_pagamento ?? "N/I"}</span></td>
                        <td className="text-right font-semibold text-slate-200">{fmt.format(Number(nota.total ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. Receita Mensal ─────────────────────────────────────────────── */}
      <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "640ms" }}>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-400" />
          <h4 className="text-sm font-semibold text-slate-200">Receita Mensal — últimos {mesesReceita} meses</h4>
          {avgReceita > 0 && (
            <span className="ml-auto rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
              Média: {fmt.format(avgReceita)}
            </span>
          )}
        </div>
        <div className="h-72">
          {loadingReceita ? <LoadingChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={receitaMensal ?? []} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="grad-receita-mensal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {grid}
                <XAxis dataKey="mes" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => fmt.format(Number(v))} width={115} />
                {avgReceita > 0 && (
                  <ReferenceLine
                    y={avgReceita}
                    stroke="#6b7280"
                    strokeDasharray="5 4"
                    label={{ value: "Média", fill: "#6b7280", fontSize: 10, position: "insideTopRight" }}
                  />
                )}
                <Tooltip content={(props) => <ChartTooltip {...props} money />} />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="#22d3ee"
                  strokeWidth={2.5}
                  fill="url(#grad-receita-mensal)"
                  dot={{ r: 4, fill: "#22d3ee", strokeWidth: 0 }}
                  activeDot={{ r: 7, fill: "#22d3ee", stroke: "rgba(34,211,238,0.3)", strokeWidth: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── 5. Análise composta + Ticket Médio ───────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Receita × Notas × Acumulado */}
        <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "700ms" }}>
          <div className="mb-4 flex items-center gap-2">
            <Activity size={14} className="text-sky-400" />
            <h4 className="text-sm font-semibold text-slate-200">Receita × Notas × Acumulado</h4>
          </div>
          <div className="h-72">
            {loadingReceita ? <LoadingChart /> : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={receitaComposta} margin={{ top: 4, right: 4, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="grad-acum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-notas-bar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  {grid}
                  <XAxis dataKey="mes" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="fin" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => fmt.format(Number(v))} width={110} />
                  <YAxis yAxisId="qtd" orientation="right" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={(props) => (
                    <ChartTooltip
                      {...props}
                      money={false}
                    />
                  )} />
                  <Legend wrapperStyle={{ color: "#4b5563", fontSize: 11, paddingTop: 8 }} />
                  <Area yAxisId="fin" type="monotone" dataKey="receita_acumulada" name="Acumulado" fill="url(#grad-acum)" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
                  <Bar yAxisId="qtd" dataKey="notas" name="Notas" fill="url(#grad-notas-bar)" radius={[5, 5, 0, 0]} maxBarSize={24} />
                  <Line yAxisId="fin" type="monotone" dataKey="receita" name="Receita" stroke="#67e8f9" strokeWidth={2.5} dot={{ r: 3, fill: "#67e8f9", strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Receita × Ticket Médio */}
        <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "740ms" }}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-purple-400" />
              <h4 className="text-sm font-semibold text-slate-200">Receita × Ticket Médio</h4>
            </div>
            <span className="text-[10px] text-slate-600">Passe o mouse na legenda</span>
          </div>
          <div className="h-72">
            {loadingReceita ? <LoadingChart /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={receitaComposta} margin={{ top: 4, right: 4, bottom: 0, left: 8 }}>
                  {grid}
                  <XAxis dataKey="mes" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rec" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => fmt.format(Number(v))} width={110} />
                  <YAxis yAxisId="tkt" orientation="right" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => fmt.format(Number(v))} width={110} />
                  <Tooltip content={(props) => <ChartTooltip {...props} money />} />
                  <Legend
                    wrapperStyle={{ color: "#4b5563", fontSize: 11, cursor: "pointer", paddingTop: 8 }}
                    onMouseEnter={(p) => setLegendOpacityKey(p?.dataKey ? String(p.dataKey) : null)}
                    onMouseLeave={() => setLegendOpacityKey(null)}
                  />
                  <Line yAxisId="rec" type="monotone" dataKey="receita" name="Receita" stroke="#22d3ee" strokeWidth={2.5}
                    dot={{ r: 3.5, fill: "#22d3ee", strokeWidth: 0 }} strokeOpacity={getLegendOpacity("receita")} />
                  <Line yAxisId="tkt" type="monotone" dataKey="ticket_medio" name="Ticket médio" stroke="#a78bfa" strokeWidth={2.5}
                    dot={{ r: 3.5, fill: "#a78bfa", strokeWidth: 0 }} strokeOpacity={getLegendOpacity("ticket_medio")} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. Estoque ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Estoque"
          subtitle="Posição atual do inventário"
          badge={
            (estoqueResumo?.alertas ?? 0) > 0 ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-300 ring-1 ring-amber-500/20">
                <AlertTriangle size={13} />
                {estoqueResumo!.alertas} {estoqueResumo!.alertas === 1 ? "item" : "itens"} com alerta
              </div>
            ) : null
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total de Produtos", value: String(estoqueResumo?.totalProdutos ?? 0),       icon: Package,       color: "text-cyan-300",   accent: "from-cyan-500/20 to-cyan-500/5",    ring: "ring-cyan-500/20" },
            { label: "Abaixo do Mínimo",  value: String(estoqueResumo?.abaixoMinimo ?? 0),        icon: AlertTriangle, color: (estoqueResumo?.abaixoMinimo ?? 0) > 0 ? "text-amber-300" : "text-slate-500", accent: (estoqueResumo?.abaixoMinimo ?? 0) > 0 ? "from-amber-500/20 to-amber-500/5" : "from-slate-800/30 to-slate-800/10", ring: (estoqueResumo?.abaixoMinimo ?? 0) > 0 ? "ring-amber-500/20" : "ring-slate-700/20" },
            { label: "Itens Zerados",     value: String(estoqueResumo?.zerados ?? 0),             icon: PackageX,      color: (estoqueResumo?.zerados ?? 0) > 0 ? "text-rose-300" : "text-slate-500",  accent: (estoqueResumo?.zerados ?? 0) > 0 ? "from-rose-500/20 to-rose-500/5" : "from-slate-800/30 to-slate-800/10",   ring: (estoqueResumo?.zerados ?? 0) > 0 ? "ring-rose-500/20" : "ring-slate-700/20" },
            { label: "Valor em Estoque",  value: fmt.format(estoqueResumo?.valorVenda ?? 0),      icon: Warehouse,     color: "text-indigo-300",  accent: "from-indigo-500/20 to-indigo-500/5",  ring: "ring-indigo-500/20" }
          ].map((card, i) => (
            <KpiCard key={card.label} {...card} loading={loadingEstoqueResumo} delay={800 + i * 35} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "940ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-cyan-400" />
              <h4 className="text-sm font-semibold text-slate-200">Estoque por Categoria</h4>
              <span className="ml-auto text-[11px] text-slate-500">Atual vs Mínimo</span>
            </div>
            <div className="h-64">
              {loadingEstoqueCategoria ? <LoadingChart /> : (estoquePorCategoria?.length ?? 0) === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-600">Nenhum produto cadastrado</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={estoquePorCategoria ?? []} barCategoryGap="22%" margin={{ top: 16, right: 4, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="grad-atual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="grad-minimo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    {grid}
                    <XAxis dataKey="categoria" tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={(props) => <ChartTooltip {...props} />} />
                    <Legend wrapperStyle={{ color: "#4b5563", fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="atual"  name="Atual"  fill="url(#grad-atual)"  radius={[5, 5, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="minimo" name="Mínimo" fill="url(#grad-minimo)" radius={[5, 5, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card-static rise-in overflow-hidden p-5" style={{ animationDelay: "980ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <h4 className="text-sm font-semibold text-slate-200">Itens para Reposição</h4>
            </div>
            {loadingEstoqueAlertas ? <LoadingChart /> : (produtosAlerta?.length ?? 0) === 0 ? (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-emerald-500">
                <Package size={15} /> Todos os itens OK
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="table-pro min-w-full">
                  <thead><tr><th>Produto</th><th>Cat.</th><th className="text-right">Atual</th><th className="text-right">Mín.</th><th className="text-right">Status</th></tr></thead>
                  <tbody>
                    {(produtosAlerta ?? []).map((p) => {
                      const z = Number(p.estoque_atual) === 0;
                      return (
                        <tr key={p.id}>
                          <td className="font-medium text-slate-200">{p.nome}</td>
                          <td><span className="badge bg-white/5 text-slate-500">{p.categoria}</span></td>
                          <td className={`text-right font-bold ${z ? "text-rose-300" : "text-amber-300"}`}>{p.estoque_atual}</td>
                          <td className="text-right text-slate-600">{p.estoque_minimo}</td>
                          <td className="text-right">
                            {z ? <span className="badge bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/20">Zerado</span>
                               : <span className="badge bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/20">Baixo</span>}
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

      {/* ── 7. Painel Executivo ───────────────────────────────────────────── */}
      <section className="card-static rise-in overflow-hidden p-6" style={{ animationDelay: "1020ms" }}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/50">Painel Executivo</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Streaming e Financeiro</h3>
            <p className="text-xs text-slate-600">Itens que exigem atenção imediata</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/streaming" className="btn-ghost text-xs !py-2 !px-3">Abrir Streaming</Link>
            <Link to="/contas-pagar" className="btn-ghost text-xs !py-2 !px-3">Abrir Contas</Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Streaming pendentes", value: loadingStreamingResumo ? "—" : String(streamingResumo?.pendentes ?? 0), border: "border-cyan-500/15",   bg: "bg-cyan-500/5",    color: "text-cyan-200" },
            { label: "Streaming vencidos",  value: loadingStreamingResumo ? "—" : String(streamingResumo?.vencidos ?? 0),  border: "border-rose-500/15",   bg: "bg-rose-500/5",    color: "text-rose-300" },
            { label: "Contas pendentes",    value: loadingContasResumo    ? "—" : String(contasResumo?.pendentes ?? 0),    border: "border-indigo-500/15", bg: "bg-indigo-500/5",  color: "text-indigo-200" },
            { label: "Valor pendente",      value: loadingContasResumo    ? "—" : fmt.format(contasResumo?.valorPendente ?? 0), border: "border-amber-500/15", bg: "bg-amber-500/5", color: "text-amber-300" }
          ].map((item) => (
            <div key={item.label} className={`rounded-2xl border ${item.border} ${item.bg} p-4`}>
              <p className="text-[11px] text-slate-500">{item.label}</p>
              <p className={`mt-2 text-2xl font-bold tracking-tight ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs text-slate-700">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <Zap size={11} className="text-emerald-600" />
        </div>
        Realtime ativo — atualizações automáticas via Supabase
      </div>

    </div>
  );
}
