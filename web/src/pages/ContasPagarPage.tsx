import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import {
  createContaPagar,
  getContasPagarResumo,
  getContasPagarVencimentos,
  updateContaPagarStatus
} from "../modules/dashboard/service";
import { useRealtimeChannel } from "../hooks/useRealtimeChannel";
import { useSession } from "../hooks/useSession";

export function ContasPagarPage() {
  const queryClient = useQueryClient();
  const { role } = useSession();
  const canManage = role === "admin" || role === "gerente" || role === "atendente";

  const [form, setForm] = useState({ descricao: "", fornecedor: "", valor: "", data_vencimento: "" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "pendente" | "pago" | "alerta" | "vencido">("todos");
  const [feedback, setFeedback] = useState<string | null>(null);

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
          { label: "Total", value: loadingResumo ? "..." : String(resumo?.total ?? 0) },
          { label: "Pendentes", value: loadingResumo ? "..." : String(resumo?.pendentes ?? 0) },
          { label: "Aviso 24h", value: loadingResumo ? "..." : String(resumo?.vencendo24h ?? 0) },
          { label: "Valor pendente", value: loadingResumo ? "..." : money.format(resumo?.valorPendente ?? 0) }
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-xs text-slate-400">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-indigo-200">{card.value}</p>
          </div>
        ))}
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
            <button className="btn-primary" onClick={handleCreate} disabled={createMutation.isPending}>Cadastrar conta</button>
          </div>
        </div>
      ) : null}

      <div className="card-static p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <input className="input-dark" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <th>Descrição</th><th>Fornecedor</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Alerta</th><th className="text-right">Ação</th>
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
                        <button className="btn-ghost !px-2 !py-1" onClick={() => statusMutation.mutate({ id: item.id, status: item.status_pagamento === "pago" ? "pendente" : "pago" })} disabled={statusMutation.isPending}>
                          {item.status_pagamento === "pago" ? "Marcar pendente" : "Marcar pago"}
                        </button>
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
