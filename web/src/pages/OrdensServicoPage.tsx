import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, Download, Edit3, FileText, Plus, Search, Trash2, X, Zap } from "lucide-react";
import { createOs, criarNotaServico, deleteOs, deleteUltimaNotaPorOs, emitirNfe, listOs, updateOs, updateStatus, validateImeiSerial } from "../modules/os/service";
import { gerarPdfOS } from "../lib/pdf";
import { useRealtimeChannel } from "../hooks/useRealtimeChannel";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabase";
import type { Cliente, OrdemServico } from "../types";

type NotaModalState = {
  osId: string;
  clienteId: string;
  numeroOs: number;
  equipamento: string;
};

type NotaFormState = {
  subtotal: string;
  descontos: string;
  impostos: string;
  formaPagamento: string;
  garantia: string;
  prazo: string;
};

const initialNotaForm: NotaFormState = {
  subtotal: "199.90",
  descontos: "0",
  impostos: "0",
  formaPagamento: "PIX",
  garantia: "90 dias",
  prazo: "Imediato"
};

type OsFormState = {
  clienteId: string;
  tipoEquipamento: string;
  marca: string;
  modelo: string;
  serialImei: string;
  problemaRelatado: string;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  prazoEstimado: string;
  observacoesInternas: string;
  status: OrdemServico["status"];
};

type ValidationState = {
  status: "idle" | "loading" | "valid" | "invalid";
  message: string | null;
};

const initialOsForm: OsFormState = {
  clienteId: "",
  tipoEquipamento: "celular",
  marca: "",
  modelo: "",
  serialImei: "",
  problemaRelatado: "",
  prioridade: "media",
  prazoEstimado: "",
  observacoesInternas: "",
  status: "aberta"
};

export function OrdensServicoPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showOsModal, setShowOsModal] = useState(false);
  const [editingOsId, setEditingOsId] = useState<string | null>(null);
  const [osForm, setOsForm] = useState<OsFormState>(initialOsForm);
  const [imeiValidation, setImeiValidation] = useState<ValidationState>({ status: "idle", message: null });
  const [notaModal, setNotaModal] = useState<NotaModalState | null>(null);
  const [notaForm, setNotaForm] = useState<NotaFormState>(initialNotaForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { user } = useSession();
  const queryClient = useQueryClient();

  const isOwner = user?.email === "lkaua.lopes01@gmail.com" || user?.app_metadata?.role === "admin";
  useRealtimeChannel(["os", page, search], "ordens_servico");

  const { data, isLoading } = useQuery({
    queryKey: ["os", page, search],
    queryFn: () => listOs({ page, pageSize: 10, search })
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: async () => {
      const { data: clientesData, error } = await supabase
        .from("clientes")
        .select("id,nome_razao_social,cpf_cnpj,telefone,email,endereco,cep,ativo")
        .eq("ativo", true)
        .order("nome_razao_social");
      if (error) throw new Error(error.message);
      return (clientesData ?? []) as Cliente[];
    }
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data?.count ?? 0) / 10)), [data?.count]);

  const notaPreview = useMemo(() => {
    const subtotal = Number(notaForm.subtotal.replace(",", ".")) || 0;
    const descontos = Number(notaForm.descontos.replace(",", ".")) || 0;
    const impostos = Number(notaForm.impostos.replace(",", ".")) || 0;
    return Number((subtotal - descontos + impostos).toFixed(2));
  }, [notaForm.descontos, notaForm.impostos, notaForm.subtotal]);

  const createMutation = useMutation({ mutationFn: createOs, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["os"] }) });
  const updateMutation = useMutation({ mutationFn: ({ id, ...input }: { id: string } & Record<string, unknown>) => updateOs(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["os"] }) });
  const nfeMutation = useMutation({ mutationFn: emitirNfe, onSuccess: () => setFeedback("NF-e criada com status pendente.") });
  const deleteNotaMutation = useMutation({ mutationFn: deleteUltimaNotaPorOs, onSuccess: () => setFeedback("Nota excluída."), onError: (err) => setFeedback(err instanceof Error ? err.message : "Falha ao excluir nota.") });
  const notaMutation = useMutation({ mutationFn: criarNotaServico, onSuccess: (nota) => setFeedback(`Nota #${nota.numero} criada. Total R$ ${Number(nota.total).toFixed(2)}.`) });
  const deleteMutation = useMutation({
    mutationFn: deleteOs,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["os"] }); setFeedback("OS excluída."); setConfirmDeleteId(null); },
    onError: (err) => { setFeedback(err instanceof Error ? err.message : "Falha ao excluir OS."); setConfirmDeleteId(null); }
  });

  const concluirMutation = useMutation({
    mutationFn: (osId: string) => updateStatus(osId, "concluida"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["os"] }); setFeedback("OS marcada como concluída."); },
    onError: (err) => setFeedback(err instanceof Error ? err.message : "Falha ao concluir OS.")
  });

  function abrirModalOs() {
    setFeedback(null);
    setEditingOsId(null);
    setImeiValidation({ status: "idle", message: null });
    setOsForm({ ...initialOsForm, clienteId: clientes?.[0]?.id ?? "", prazoEstimado: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16) });
    setShowOsModal(true);
  }

  function abrirModalEditarOs(os: OrdemServico) {
    setFeedback(null);
    setEditingOsId(os.id);
    setImeiValidation({ status: "idle", message: null });
    setOsForm({
      clienteId: os.cliente_id,
      tipoEquipamento: os.tipo_equipamento,
      marca: os.marca,
      modelo: os.modelo,
      serialImei: os.serial_imei,
      problemaRelatado: os.problema_relatado,
      prioridade: os.prioridade,
      prazoEstimado: os.prazo_estimado ? new Date(os.prazo_estimado).toISOString().slice(0, 16) : "",
      observacoesInternas: os.observacoes_internas ?? "",
      status: os.status
    });
    setShowOsModal(true);
  }

  async function validarImeiEPreencher() {
    const value = osForm.serialImei.trim();

    if (!value) {
      setImeiValidation({ status: "idle", message: null });
      return null;
    }

    setImeiValidation({ status: "loading", message: "Validando IMEI/serial..." });
    const result = await validateImeiSerial({
      value,
      tipoEquipamento: osForm.tipoEquipamento
    });

    if (!result.valid) {
      setImeiValidation({ status: "invalid", message: result.message });
      return result;
    }

    setOsForm((current) => {
      let next = { ...current, serialImei: result.normalized };

      if (result.autoFill) {
        next = {
          ...next,
          tipoEquipamento: result.autoFill.tipo_equipamento || next.tipoEquipamento,
          marca: result.autoFill.marca || next.marca,
          modelo: result.autoFill.modelo || next.modelo
        };
      }

      return next;
    });

    setImeiValidation({
      status: "valid",
      message: result.autoFill
        ? `${result.message} Dados do aparelho preenchidos automaticamente.`
        : result.message
    });

    return result;
  }

  function fecharModalOs() {
    if (createMutation.isPending || updateMutation.isPending) return;
    setShowOsModal(false);
    setEditingOsId(null);
  }

  async function handleSaveOs() {
    setFeedback(null);
    if (!user?.id) { setFeedback("Usuário não autenticado."); return; }
    if (!osForm.clienteId) { setFeedback("Selecione um cliente."); return; }

    const validation = await validarImeiEPreencher();

    if (!validation?.valid) {
      setFeedback(validation?.message ?? "Informe um serial/IMEI válido.");
      return;
    }

    try {
      if (editingOsId) {
        await updateMutation.mutateAsync({
          id: editingOsId,
          cliente_id: osForm.clienteId,
          tipo_equipamento: osForm.tipoEquipamento,
          marca: osForm.marca,
          modelo: osForm.modelo,
          serial_imei: validation.normalized,
          problema_relatado: osForm.problemaRelatado,
          prioridade: osForm.prioridade,
          prazo_estimado: osForm.prazoEstimado ? new Date(osForm.prazoEstimado).toISOString() : undefined,
          observacoes_internas: osForm.observacoesInternas,
          status: osForm.status
        });
        setFeedback("OS atualizada com sucesso.");
      } else {
        await createMutation.mutateAsync({
          cliente_id: osForm.clienteId,
          tecnico_id: user.id,
          tipo_equipamento: osForm.tipoEquipamento,
          marca: osForm.marca,
          modelo: osForm.modelo,
          serial_imei: validation.normalized,
          problema_relatado: osForm.problemaRelatado,
          prioridade: osForm.prioridade,
          prazo_estimado: new Date(osForm.prazoEstimado).toISOString(),
          observacoes_internas: osForm.observacoesInternas
        });
        setFeedback("OS criada com sucesso.");
      }
      setShowOsModal(false);
      setEditingOsId(null);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Falha ao salvar OS.");
    }
  }

  async function handleEmitirNfe(osId: string, clienteId: string) {
    setFeedback(null);
    try { await nfeMutation.mutateAsync({ os_id: osId, cliente_id: clienteId, valor_total: 199.9, ambiente: "homologacao" }); }
    catch (err) { setFeedback(err instanceof Error ? err.message : "Falha ao emitir NF-e"); }
  }

  function abrirModalNota(osId: string, clienteId: string, numeroOs: number, equipamento: string) {
    setFeedback(null);
    setNotaForm(initialNotaForm);
    setNotaModal({ osId, clienteId, numeroOs, equipamento });
  }

  function fecharModalNota() { if (!notaMutation.isPending) setNotaModal(null); }

  async function handleCriarNota() {
    if (!notaModal) return;
    const subtotal = Number(notaForm.subtotal.replace(",", "."));
    if (Number.isNaN(subtotal) || subtotal <= 0) { setFeedback("Valor inválido."); return; }
    const descontos = Number(notaForm.descontos.replace(",", "."));
    const impostos = Number(notaForm.impostos.replace(",", "."));
    try {
      const nota = await notaMutation.mutateAsync({ os_id: notaModal.osId, cliente_id: notaModal.clienteId, subtotal, descontos, impostos, forma_pagamento: notaForm.formaPagamento, garantia: notaForm.garantia, prazo: notaForm.prazo });
      setFeedback(`Nota #${nota.numero} criada. Total R$ ${Number(nota.total).toFixed(2)}.`);
      setNotaModal(null);
    } catch (err) { setFeedback(err instanceof Error ? err.message : "Falha ao criar nota."); }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Ordens de Serviço</h2>
          <p className="text-sm text-slate-400">{data?.count ?? 0} registros</p>
        </div>
        <button onClick={abrirModalOs} className="btn-primary" disabled={isSaving}>
          <Plus size={16} />
          Nova OS
        </button>
      </div>

      {feedback && (
        <div className="slide-up rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">
          {feedback}
          <button onClick={() => setFeedback(null)} className="ml-3 text-cyan-300/60 hover:text-cyan-100"><X size={14} /></button>
        </div>
      )}

      {/* Search */}
      <div className="card-static flex items-center gap-3 px-4 py-3">
        <Search size={16} className="text-slate-500" />
        <input
          placeholder="Buscar por marca, modelo ou serial..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
        {search && <button onClick={() => setSearch("")} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>}
      </div>

      {/* Table */}
      <div className="card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-pro min-w-full">
            <thead>
              <tr>
                <th>Número</th>
                <th>Equipamento</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Data</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center text-slate-400">Carregando...</td></tr>
              ) : (
                data?.data.map((os) => (
                  <tr key={os.id}>
                    <td className="font-semibold text-cyan-200">#{os.numero_sequencial}</td>
                    <td className="text-slate-200">{os.tipo_equipamento} {os.marca} {os.modelo}</td>
                    <td><span className={`badge status-${os.status}`}>{os.status.replace(/_/g, " ")}</span></td>
                    <td><span className={`badge prioridade-${os.prioridade}`}>{os.prioridade}</span></td>
                    <td className="text-slate-400">{new Date(os.created_at).toLocaleDateString("pt-BR")}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {!["concluida", "entregue", "cancelada"].includes(os.status) && (
                          <button
                            className="btn-ghost !px-2 !py-1.5 !text-emerald-300 !border-emerald-500/20"
                            onClick={() => concluirMutation.mutate(os.id)}
                            disabled={concluirMutation.isPending}
                            title="Concluir OS"
                          >
                            <CheckCircle2 size={13} />
                          </button>
                        )}
                        <button className="btn-ghost !px-2 !py-1.5" onClick={() => abrirModalEditarOs(os)} title="Editar"><Edit3 size={13} /></button>
                        <button className="btn-ghost !px-2 !py-1.5" onClick={() => gerarPdfOS(os)} title="PDF"><Download size={13} /></button>
                        <button className="btn-ghost !px-2 !py-1.5 !text-indigo-300 !border-indigo-500/20" onClick={() => abrirModalNota(os.id, os.cliente_id, os.numero_sequencial, `${os.tipo_equipamento} ${os.marca} ${os.modelo}`)} disabled={notaMutation.isPending} title="Nota"><FileText size={13} /></button>
                        <button className="btn-ghost !px-2 !py-1.5 !text-emerald-300 !border-emerald-500/20" onClick={() => handleEmitirNfe(os.id, os.cliente_id)} disabled={nfeMutation.isPending} title="NF-e"><Zap size={13} /></button>
                        {isOwner && (
                          <>
                            <button className="btn-ghost !px-2 !py-1.5 !text-rose-300 !border-rose-500/20" onClick={() => deleteNotaMutation.mutate(os.id)} disabled={deleteNotaMutation.isPending} title="Excluir nota"><FileText size={13} /><X size={10} className="-ml-1.5" /></button>
                            {confirmDeleteId === os.id ? (
                              <span className="flex items-center gap-1">
                                <button className="btn-danger" onClick={() => deleteMutation.mutate(os.id)} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "..." : "Confirmar"}</button>
                                <button className="btn-ghost !px-2 !py-1" onClick={() => setConfirmDeleteId(null)}>Não</button>
                              </span>
                            ) : (
                              <button className="btn-ghost !px-2 !py-1.5 !text-rose-400 !border-rose-500/20" onClick={() => { setConfirmDeleteId(os.id); setFeedback(null); }} title="Excluir OS"><Trash2 size={13} /></button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Página {page} de {totalPages}</span>
        <div className="flex items-center gap-1">
          <button className="btn-ghost !px-2 !py-1.5" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft size={14} /></button>
          <button className="btn-ghost !px-2 !py-1.5" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight size={14} /></button>
        </div>
      </div>

      {/* OS Modal (Create / Edit) */}
      {showOsModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="modal-content card-static w-full max-w-4xl border-slate-700 bg-slate-950/98 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400/70">{editingOsId ? "Editar" : "Nova"} Ordem de Serviço</p>
                <h3 className="mt-1 font-display text-xl font-bold text-white">{editingOsId ? "Atualizar OS" : "Criar OS"}</h3>
              </div>
              <button className="btn-ghost !px-3 !py-1.5" onClick={fecharModalOs}><X size={16} /></button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-slate-300">Cliente</span>
                <select value={osForm.clienteId} onChange={(e) => setOsForm((c) => ({ ...c, clienteId: e.target.value }))} className="input-dark">
                  <option value="">Selecione um cliente</option>
                  {clientes?.map((c) => <option key={c.id} value={c.id}>{c.nome_razao_social}</option>)}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">Tipo de equipamento</span>
                <select
                  value={osForm.tipoEquipamento}
                  onChange={(e) => {
                    setImeiValidation({ status: "idle", message: null });
                    setOsForm((c) => ({ ...c, tipoEquipamento: e.target.value }));
                  }}
                  className="input-dark"
                >
                  {["celular", "notebook", "tablet", "tv", "videogame", "outro"].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">Prioridade</span>
                <select value={osForm.prioridade} onChange={(e) => setOsForm((c) => ({ ...c, prioridade: e.target.value as OsFormState["prioridade"] }))} className="input-dark">
                  {["baixa", "media", "alta", "urgente"].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </label>

              {editingOsId && (
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-300">Status</span>
                  <select value={osForm.status} onChange={(e) => setOsForm((c) => ({ ...c, status: e.target.value as OrdemServico["status"] }))} className="input-dark">
                    {["aberta", "diagnostico", "aguardando_aprovacao", "aguardando_pecas", "execucao", "concluida", "entregue", "cancelada"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </label>
              )}

              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">Marca</span>
                <input
                  value={osForm.marca}
                  onChange={(e) => {
                    setImeiValidation({ status: "idle", message: null });
                    setOsForm((c) => ({ ...c, marca: e.target.value }));
                  }}
                  className="input-dark"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">Modelo</span>
                <input
                  value={osForm.modelo}
                  onChange={(e) => {
                    setImeiValidation({ status: "idle", message: null });
                    setOsForm((c) => ({ ...c, modelo: e.target.value }));
                  }}
                  className="input-dark"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">Serial / IMEI</span>
                <input
                  value={osForm.serialImei}
                  onChange={(e) => {
                    setImeiValidation({ status: "idle", message: null });
                    setOsForm((c) => ({ ...c, serialImei: e.target.value }));
                  }}
                  onBlur={() => {
                    void validarImeiEPreencher();
                  }}
                  className="input-dark"
                />
                {imeiValidation.status !== "idle" && (
                  <p className={`mt-1.5 text-xs ${imeiValidation.status === "loading" ? "text-slate-400" : imeiValidation.status === "valid" ? "text-emerald-400" : "text-rose-400"}`}>
                    {imeiValidation.message}
                  </p>
                )}
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">Prazo estimado</span>
                <input type="datetime-local" value={osForm.prazoEstimado} onChange={(e) => setOsForm((c) => ({ ...c, prazoEstimado: e.target.value }))} className="input-dark" />
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-slate-300">Problema relatado</span>
                <textarea value={osForm.problemaRelatado} onChange={(e) => setOsForm((c) => ({ ...c, problemaRelatado: e.target.value }))} rows={3} className="input-dark" />
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-slate-300">Observações internas</span>
                <textarea value={osForm.observacoesInternas} onChange={(e) => setOsForm((c) => ({ ...c, observacoesInternas: e.target.value }))} rows={2} className="input-dark" />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-ghost" onClick={fecharModalOs}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveOs} disabled={isSaving}>
                {isSaving ? "Salvando..." : editingOsId ? "Atualizar OS" : "Criar OS"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nota Modal */}
      {notaModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="modal-content card-static w-full max-w-3xl border-slate-700 bg-slate-950/98 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400/70">Nota de Serviço</p>
                <h3 className="mt-1 font-display text-xl font-bold text-white">OS #{notaModal.numeroOs}</h3>
                <p className="mt-0.5 text-sm text-slate-400">{notaModal.equipamento}</p>
              </div>
              <button className="btn-ghost !px-3 !py-1.5" onClick={fecharModalNota}><X size={16} /></button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="grid gap-4 sm:grid-cols-2">
                {([["Subtotal", "subtotal", "199.90"], ["Descontos", "descontos", "0"], ["Impostos", "impostos", "0"], ["Forma de pagamento", "formaPagamento", "PIX"], ["Garantia", "garantia", "90 dias"], ["Prazo", "prazo", "Imediato"]] as const).map(([label, key, placeholder]) => (
                  <label key={key} className="block text-sm">
                    <span className="mb-1.5 block font-medium text-slate-300">{label}</span>
                    <input
                      value={notaForm[key]}
                      onChange={(e) => setNotaForm((c) => ({ ...c, [key]: e.target.value }))}
                      className="input-dark"
                      placeholder={placeholder}
                    />
                  </label>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Preview</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="flex justify-between"><span>Subtotal</span><strong>R$ {Number(notaForm.subtotal.replace(",", ".") || 0).toFixed(2)}</strong></div>
                  <div className="flex justify-between"><span>Descontos</span><strong>R$ {Number(notaForm.descontos.replace(",", ".") || 0).toFixed(2)}</strong></div>
                  <div className="flex justify-between"><span>Impostos</span><strong>R$ {Number(notaForm.impostos.replace(",", ".") || 0).toFixed(2)}</strong></div>
                  <div className="border-t border-slate-800/60" />
                  <div className="flex justify-between text-base font-bold text-white"><span>Total</span><span>R$ {notaPreview.toFixed(2)}</span></div>
                  <div className="mt-2 rounded-xl bg-slate-950/60 p-3 text-xs text-slate-500">
                    Pagamento: {notaForm.formaPagamento || "N/I"}<br />
                    Garantia: {notaForm.garantia || "N/I"}<br />
                    Prazo: {notaForm.prazo || "N/I"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-ghost" onClick={fecharModalNota}>Cancelar</button>
              <button className="btn-primary !bg-gradient-to-r !from-indigo-600 !to-indigo-500" onClick={handleCriarNota} disabled={notaMutation.isPending}>
                {notaMutation.isPending ? "Criando..." : "Salvar nota"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
