import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tv } from "lucide-react";
import {
  createStreamingRegistro,
  getStreamingResumo,
  getStreamingVencimentos,
  updateStreamingStatus
} from "../modules/dashboard/service";
import { useRealtimeChannel } from "../hooks/useRealtimeChannel";
import { useSession } from "../hooks/useSession";

export function StreamingGestaoPage() {
  const queryClient = useQueryClient();
  const { role } = useSession();
  const canManage = role === "admin" || role === "gerente" || role === "atendente";

  const [form, setForm] = useState({
    cliente_nome: "",
    servidor: "",
    dispositivo: "",
    aplicativo: "",
    data_ativacao: "",
    data_vencimento: ""
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "pendente" | "pago" | "alerta" | "vencido">("todos");
  const [feedback, setFeedback] = useState<string | null>(null);

  useRealtimeChannel(["streaming-resumo-page"], "streaming_assinaturas");
  useRealtimeChannel(["streaming-vencimentos-page"], "streaming_assinaturas");

  const { data: resumo, isLoading: loadingResumo } = useQuery({
    queryKey: ["streaming-resumo-page"],
    queryFn: getStreamingResumo
  });

  const { data: rows = [], isLoading: loadingRows } = useQuery({
    queryKey: ["streaming-vencimentos-page"],
    queryFn: () => getStreamingVencimentos(200)
  });

  const createMutation = useMutation({
    mutationFn: createStreamingRegistro,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaming-resumo-page"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-vencimentos-page"] });
      setFeedback("Streaming cadastrado com sucesso.");
      setForm({ cliente_nome: "", servidor: "", dispositivo: "", aplicativo: "", data_ativacao: "", data_vencimento: "" });
    },
    onError: (err) => setFeedback(err instanceof Error ? err.message : "Falha ao cadastrar streaming.")
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "pago" | "pendente" }) => updateStreamingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaming-resumo-page"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-vencimentos-page"] });
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
      return [item.cliente_nome, item.servidor, item.dispositivo, item.aplicativo].join(" ").toLowerCase().includes(term);
    });
  }, [filter, rows, search]);

  async function handleCreate() {
    setFeedback(null);
    if (!form.cliente_nome.trim() || !form.servidor.trim() || !form.dispositivo.trim() || !form.aplicativo.trim() || !form.data_ativacao || !form.data_vencimento) {
      setFeedback("Preencha todos os campos.");
      return;
    }

    await createMutation.mutateAsync({
      cliente_nome: form.cliente_nome.trim(),
      servidor: form.servidor.trim(),
      dispositivo: form.dispositivo.trim(),
      aplicativo: form.aplicativo.trim(),
      data_ativacao: form.data_ativacao,
      data_vencimento: new Date(form.data_vencimento).toISOString()
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Streaming</h2>
          <p className="text-sm text-slate-400">Gestão de cliente, servidor, dispositivo e vencimento</p>
        </div>
        <div className="badge bg-cyan-500/10 text-cyan-200"><Tv size={14} className="mr-1.5" />IPTV</div>
      </div>

      {feedback ? <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">{feedback}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total", value: loadingResumo ? "..." : String(resumo?.total ?? 0) },
          { label: "Pendentes", value: loadingResumo ? "..." : String(resumo?.pendentes ?? 0) },
          { label: "Aviso 24h", value: loadingResumo ? "..." : String(resumo?.vencendo24h ?? 0) },
          { label: "Vencidos", value: loadingResumo ? "..." : String(resumo?.vencidos ?? 0) }
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-xs text-slate-400">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-cyan-200">{card.value}</p>
          </div>
        ))}
      </div>

      {canManage ? (
        <div className="card-static p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Cadastro</p>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="input-dark" placeholder="Cliente" value={form.cliente_nome} onChange={(e) => setForm((p) => ({ ...p, cliente_nome: e.target.value }))} />
            <input className="input-dark" placeholder="Servidor" value={form.servidor} onChange={(e) => setForm((p) => ({ ...p, servidor: e.target.value }))} />
            <input className="input-dark" placeholder="Dispositivo" value={form.dispositivo} onChange={(e) => setForm((p) => ({ ...p, dispositivo: e.target.value }))} />
            <input className="input-dark" placeholder="Aplicativo" value={form.aplicativo} onChange={(e) => setForm((p) => ({ ...p, aplicativo: e.target.value }))} />
            <input className="input-dark" type="date" value={form.data_ativacao} onChange={(e) => setForm((p) => ({ ...p, data_ativacao: e.target.value }))} />
            <input className="input-dark" type="datetime-local" value={form.data_vencimento} onChange={(e) => setForm((p) => ({ ...p, data_vencimento: e.target.value }))} />
          </div>
          <div className="mt-3 flex justify-end">
            <button className="btn-primary" onClick={handleCreate} disabled={createMutation.isPending}>Cadastrar streaming</button>
          </div>
        </div>
      ) : null}

      <div className="card-static p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <input className="input-dark" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {["todos", "pendente", "alerta", "vencido", "pago"].map((opt) => (
              <button key={opt} type="button" onClick={() => setFilter(opt as any)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === opt ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/30" : "bg-slate-900/60 text-slate-300 ring-1 ring-slate-700/60 hover:text-white"}`}>{opt}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card-static overflow-hidden p-4">
        <div className="overflow-auto">
          <table className="table-pro min-w-full">
            <thead>
              <tr>
                <th>Cliente</th><th>Servidor</th><th>Dispositivo/App</th><th>Ativação</th><th>Vencimento</th><th>Status</th><th>Alerta</th><th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loadingRows ? (
                <tr><td colSpan={8} className="text-center text-slate-400">Carregando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-slate-500">Nenhum registro.</td></tr>
              ) : (
                data.map((item: any) => (
                  <tr key={item.id}>
                    <td className="font-medium text-slate-200">{item.cliente_nome}</td>
                    <td>{item.servidor}</td>
                    <td>{item.dispositivo} / {item.aplicativo}</td>
                    <td>{new Date(item.data_ativacao).toLocaleDateString("pt-BR")}</td>
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
