import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Calculator, CheckCircle2, Clock3, PlusCircle, Search, Trash2, Wallet } from "lucide-react";
import {
  createContaPagar,
  deleteContaPagar,
  getContasPagarResumo,
  getContasPagarVencimentos,
  updateContaPagarStatus
} from "../modules/dashboard/service";
import { useRealtimeChannel } from "../hooks/useRealtimeChannel";
import { useSession } from "../hooks/useSession";

const METODOS_SIM = [
  { value: "pix", label: "PIX", maxParcelas: 1 },
  { value: "debito_visa_mc", label: "Débito Visa / Mastercard", maxParcelas: 1 },
  { value: "debito_elo", label: "Débito Elo / Hipercard", maxParcelas: 1 },
  { value: "credito_visa_mc", label: "Crédito Visa / Mastercard", maxParcelas: 12 },
  { value: "credito_aura", label: "Crédito Aura / Brasilcard", maxParcelas: 18 },
  { value: "diners", label: "Diners Club", maxParcelas: 18 },
];

function calcTaxaPagbank(metodo: string, parcelas: number): { taxa: number; recebimento: string } {
  switch (metodo) {
    case "pix": return { taxa: 0, recebimento: "Na hora" };
    case "debito_visa_mc": return { taxa: 0.0085, recebimento: "Na hora" };
    case "debito_elo": return { taxa: 0.0199, recebimento: "Na hora" };
    case "credito_visa_mc":
      if (parcelas === 1) return { taxa: 0.0285, recebimento: "Na hora" };
      return { taxa: (1.65 + (parcelas - 1) * 1.85) / 100, recebimento: "Na hora" };
    case "credito_aura": return { taxa: 0.0559, recebimento: "Na hora" };
    case "diners":
      if (parcelas === 1) return { taxa: 0.0319, recebimento: "30 dias" };
      return { taxa: (3.79 + (parcelas - 1) * 1.85) / 100, recebimento: "Na hora" };
    default: return { taxa: 0, recebimento: "Na hora" };
  }
}

export function ContasPagarPage() {
  const queryClient = useQueryClient();
  const { role } = useSession();
  const canManage = role === "admin" || role === "gerente" || role === "atendente";

  const [form, setForm] = useState({ descricao: "", fornecedor: "", valor: "", data_vencimento: "" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "pendente" | "pago" | "alerta" | "vencido">("todos");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sim, setSim] = useState({ valor: "", metodo: "pix", parcelas: 1 });

  const money = useMemo(() => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }), []);

  useRealtimeChannel(["contas-resumo-page"], "contas_pagar");
  useRealtimeChannel(["contas-vencimentos-page"], "contas_pagar");

  const { data: resumo, isLoading: loadingResumo } = useQuery({
    queryKey: ["contas-resumo-page"],
    queryFn: getContasPagarResumo
  });

  const { data: rows = [], isLoading: loadingRows } = useQuery({
    queryKey: ["contas-vencimentos-page"],
    queryFn: () => getContasPagarVencimentos(200)
  });

  const createMutation = useMutation({
    mutationFn: createContaPagar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-resumo-page"] });
      queryClient.invalidateQueries({ queryKey: ["contas-vencimentos-page"] });
      setFeedback("Conta cadastrada com sucesso.");
      setForm({ descricao: "", fornecedor: "", valor: "", data_vencimento: "" });
    },
    onError: (err) => setFeedback(err instanceof Error ? err.message : "Falha ao cadastrar conta.")
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "pago" | "pendente" }) => updateContaPagarStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-resumo-page"] });
      queryClient.invalidateQueries({ queryKey: ["contas-vencimentos-page"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContaPagar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-resumo-page"] });
      queryClient.invalidateQueries({ queryKey: ["contas-vencimentos-page"] });
      setConfirmDeleteId(null);
      setFeedback("Conta excluída.");
    },
    onError: (err) => { setFeedback(err instanceof Error ? err.message : "Erro ao excluir."); setConfirmDeleteId(null); }
  });

  const data = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((item: any) => {
      if (filter === "pendente" && item.status_pagamento !== "pendente") return false;
      if (filter === "pago" && item.status_pagamento !== "pago") return false;
      if (filter === "vencido" && item.alerta?.level !== "vencido") return false;
      if (filter === "alerta" && !(item.alerta?.level === "hoje" || item.alerta?.level === "um_dia")) return false;
      if (!term) return true;
      return [item.descricao, item.fornecedor ?? ""].join(" ").toLowerCase().includes(term);
    });
  }, [filter, rows, search]);

  const metodoSim = METODOS_SIM.find((m) => m.value === sim.metodo)!;
  const simResult = useMemo(() => {
    const valor = parseFloat(sim.valor.replace(",", "."));
    if (!valor || isNaN(valor) || valor <= 0) return null;
    const { taxa, recebimento } = calcTaxaPagbank(sim.metodo, sim.parcelas);
    const taxaValor = valor * taxa;
    return { valor, taxa, taxaValor, liquido: valor - taxaValor, recebimento };
  }, [sim]);

  async function handleCreate() {
    setFeedback(null);
    const valor = Number(String(form.valor).replace(",", "."));

    if (!form.descricao.trim() || !form.data_vencimento || Number.isNaN(valor)) {
      setFeedback("Preencha descrição, valor e vencimento.");
      return;
    }

    await createMutation.mutateAsync({
      descricao: form.descricao.trim(),
      fornecedor: form.fornecedor.trim() || null,
      valor,
      data_vencimento: new Date(form.data_vencimento).toISOString()
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Contas a Pagar</h2>
          <p className="text-sm text-slate-400">Gestão de vencimentos e pendências financeiras</p>
        </div>
        <div className="badge bg-indigo-500/10 text-indigo-200"><Wallet size={14} className="mr-1.5" />Financeiro</div>
      </div>

      {feedback ? <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 px-4 py-3 text-sm text-indigo-100">{feedback}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total", value: loadingResumo ? "..." : String(resumo?.total ?? 0), icon: Wallet, color: "text-indigo-300" },
          { label: "Pendentes", value: loadingResumo ? "..." : String(resumo?.pendentes ?? 0), icon: Clock3, color: "text-amber-300" },
          { label: "Aviso 24h", value: loadingResumo ? "..." : String(resumo?.vencendo24h ?? 0), icon: AlertTriangle, color: "text-rose-300" },
          { label: "Valor pendente", value: loadingResumo ? "..." : money.format(resumo?.valorPendente ?? 0), icon: Calculator, color: "text-cyan-300" }
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-400">{card.label}</p>
              <card.icon size={14} className={card.color} />
            </div>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card-static p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15">
            <Calculator size={17} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Simulador de Taxas PagBank</p>
            <p className="text-xs text-slate-400">Calcule o valor líquido após dedução das taxas</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Valor bruto (R$)</label>
            <input
              className="input-dark w-full"
              placeholder="0,00"
              value={sim.valor}
              onChange={(e) => setSim((p) => ({ ...p, valor: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Forma de pagamento</label>
            <select
              className="input-dark w-full"
              value={sim.metodo}
              onChange={(e) => setSim((p) => ({ ...p, metodo: e.target.value, parcelas: 1 }))}
            >
              {METODOS_SIM.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          {metodoSim.maxParcelas > 1 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Parcelas</label>
              <select
                className="input-dark w-full"
                value={sim.parcelas}
                onChange={(e) => setSim((p) => ({ ...p, parcelas: Number(e.target.value) }))}
              >
                {Array.from({ length: metodoSim.maxParcelas }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n === 1 ? "À vista (1x)" : `${n}x`}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {simResult && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-700/40">
                <p className="text-xs text-slate-400">Taxa aplicada</p>
                <p className="mt-1 text-xl font-bold text-indigo-300">{(simResult.taxa * 100).toFixed(2)}%</p>
              </div>
              <div className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-700/40">
                <p className="text-xs text-slate-400">Custo da taxa</p>
                <p className="mt-1 text-xl font-bold text-rose-300">− {money.format(simResult.taxaValor)}</p>
              </div>
              <div className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-700/40">
                <p className="text-xs text-slate-400">Valor líquido</p>
                <p className="mt-1 text-xl font-bold text-emerald-300">{money.format(simResult.liquido)}</p>
              </div>
              <div className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-700/40">
                <p className="text-xs text-slate-400">Recebimento</p>
                <p className="mt-1 text-xl font-bold text-cyan-300">{simResult.recebimento}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-full bg-slate-800/60 h-2">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${((simResult.liquido / simResult.valor) * 100).toFixed(1)}%` }}
              />
            </div>
            <p className="text-right text-xs text-slate-500">
              Você recebe{" "}
              <span className="font-semibold text-emerald-400">
                {((simResult.liquido / simResult.valor) * 100).toFixed(2)}%
              </span>{" "}
              do valor bruto
            </p>
          </div>
        )}
      </div>

      {canManage ? (
        <div className="card-static p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Cadastro</p>
          <div className="grid gap-3 md:grid-cols-4">
            <input className="input-dark" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} />
            <input className="input-dark" placeholder="Fornecedor" value={form.fornecedor} onChange={(e) => setForm((p) => ({ ...p, fornecedor: e.target.value }))} />
            <input className="input-dark" placeholder="Valor" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} />
            <input className="input-dark" type="datetime-local" value={form.data_vencimento} onChange={(e) => setForm((p) => ({ ...p, data_vencimento: e.target.value }))} />
          </div>
          <div className="mt-3 flex justify-end">
            <button className="btn-primary" onClick={handleCreate} disabled={createMutation.isPending}>
              <PlusCircle size={15} />
              Cadastrar conta
            </button>
          </div>
        </div>
      ) : null}

      <div className="card-static p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-950/70 px-3">
            <Search size={15} className="text-slate-500" />
            <input className="input-dark !border-0 !bg-transparent !px-0 !shadow-none" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {["todos", "pendente", "alerta", "vencido", "pago"].map((opt) => (
              <button key={opt} type="button" onClick={() => setFilter(opt as any)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === opt ? "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-400/30" : "bg-slate-900/60 text-slate-300 ring-1 ring-slate-700/60 hover:text-white"}`}>{opt}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card-static overflow-hidden p-4">
        <div className="overflow-auto">
          <table className="table-pro min-w-full">
            <thead>
              <tr>
                <th>Descrição</th><th>Fornecedor</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Alerta</th><th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingRows ? (
                <tr><td colSpan={7} className="text-center text-slate-400">Carregando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-slate-500">Nenhuma conta cadastrada.</td></tr>
              ) : (
                data.map((item: any) => (
                  <tr key={item.id}>
                    <td className="font-medium text-slate-200">{item.descricao}</td>
                    <td>{item.fornecedor ?? "-"}</td>
                    <td>{money.format(Number(item.valor ?? 0))}</td>
                    <td>{new Date(item.data_vencimento).toLocaleString("pt-BR")}</td>
                    <td><span className={`badge ${item.status_pagamento === "pago" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{item.status_pagamento}</span></td>
                    <td><span className={`badge ${item.alerta?.level === "vencido" ? "bg-rose-500/15 text-rose-300" : item.alerta?.level === "hoje" || item.alerta?.level === "um_dia" ? "bg-amber-500/15 text-amber-300" : "bg-slate-700/60 text-slate-300"}`}>{item.alerta?.message ?? "Em dia"}</span></td>
                    <td className="text-right">
                      {canManage ? (
                        <div className="flex items-center justify-end gap-2">
                          <button className="btn-ghost !px-2 !py-1" onClick={() => statusMutation.mutate({ id: item.id, status: item.status_pagamento === "pago" ? "pendente" : "pago" })} disabled={statusMutation.isPending}>
                            <CheckCircle2 size={13} />
                            {item.status_pagamento === "pago" ? "Pendente" : "Pago"}
                          </button>
                          {confirmDeleteId === item.id ? (
                            <>
                              <button className="btn-danger !px-2 !py-1 !text-xs" onClick={() => deleteMutation.mutate(item.id)} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "..." : "Confirmar"}</button>
                              <button className="btn-ghost !px-2 !py-1" onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
                            </>
                          ) : (
                            <button className="btn-ghost !px-2 !py-1 !text-rose-400 !border-rose-500/20" onClick={() => setConfirmDeleteId(item.id)} title="Excluir"><Trash2 size={13} /></button>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
