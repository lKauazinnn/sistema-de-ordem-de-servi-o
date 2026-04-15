import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useSession } from "../hooks/useSession";
import type { Cliente } from "../types";

type ClienteFormState = {
  nome_razao_social: string;
  cpf_cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  cep: string;
};

const initialClienteForm: ClienteFormState = {
  nome_razao_social: "",
  cpf_cnpj: "",
  telefone: "",
  email: "",
  endereco: "",
  cep: ""
};

async function listClientes() {
  const { data, error } = await supabase.from("clientes").select("*").order("nome_razao_social");
  if (error) throw new Error(error.message);
  return (data ?? []) as Cliente[];
}

export function ClientesPage() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const isOwner = user?.email === "lkaua.lopes01@gmail.com" || user?.app_metadata?.role === "admin";

  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteFormState>(initialClienteForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["clientes"], queryFn: listClientes });

  const filteredData = (data ?? []).filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.nome_razao_social.toLowerCase().includes(s) || c.cpf_cnpj?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s);
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, ...input }: ClienteFormState & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from("clientes").update(input).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("clientes").insert(input);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clientes"] }); queryClient.invalidateQueries({ queryKey: ["clientes-select"] }); }
  });

  const deleteMutation = useMutation({
    mutationFn: async (clienteId: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clientes"] }); queryClient.invalidateQueries({ queryKey: ["clientes-select"] }); setConfirmDeleteId(null); setFeedback("Cliente excluído."); },
    onError: (err) => { setFeedback(err instanceof Error ? err.message : "Erro ao excluir."); setConfirmDeleteId(null); }
  });

  function abrirModal(cliente?: Cliente) {
    setFeedback(null);
    if (cliente) {
      setEditingId(cliente.id);
      setForm({
        nome_razao_social: cliente.nome_razao_social,
        cpf_cnpj: cliente.cpf_cnpj,
        telefone: cliente.telefone,
        email: cliente.email ?? "",
        endereco: cliente.endereco ?? "",
        cep: cliente.cep ?? ""
      });
    } else {
      setEditingId(null);
      setForm(initialClienteForm);
    }
    setShowModal(true);
  }

  async function handleSave() {
    setFeedback(null);
    if (!form.nome_razao_social || !form.cpf_cnpj || !form.telefone) {
      setFeedback("Preencha nome, CPF/CNPJ e telefone.");
      return;
    }
    try {
      await saveMutation.mutateAsync({ ...form, id: editingId ?? undefined });
      setFeedback(editingId ? "Cliente atualizado." : "Cliente criado.");
      setShowModal(false);
      setEditingId(null);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Clientes</h2>
          <p className="text-sm text-slate-400">{filteredData.length} registros</p>
        </div>
        <button onClick={() => abrirModal()} className="btn-primary"><Plus size={16} /> Novo cliente</button>
      </div>

      {feedback && (
        <div className="slide-up rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">
          {feedback}
          <button onClick={() => setFeedback(null)} className="ml-3 text-cyan-300/60 hover:text-cyan-100"><X size={14} /></button>
        </div>
      )}

      <div className="card-static flex items-center gap-3 px-4 py-3">
        <Search size={16} className="text-slate-500" />
        <input placeholder="Buscar por nome, CPF/CNPJ ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500" />
        {search && <button onClick={() => setSearch("")} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>}
      </div>

      <div className="card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-pro min-w-full">
            <thead>
              <tr>
                <th>Nome/Razão Social</th>
                <th>CPF/CNPJ</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center text-slate-400">Carregando...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-slate-500">Nenhum cliente encontrado.</td></tr>
              ) : (
                filteredData.map((cliente) => (
                  <tr key={cliente.id}>
                    <td className="font-medium text-cyan-200">{cliente.nome_razao_social}</td>
                    <td className="text-slate-300">{cliente.cpf_cnpj}</td>
                    <td className="text-slate-300">{cliente.telefone}</td>
                    <td className="text-slate-400">{cliente.email ?? "-"}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button className="btn-ghost !px-2 !py-1.5" onClick={() => abrirModal(cliente)} title="Editar"><Edit3 size={13} /></button>
                        {isOwner && (
                          confirmDeleteId === cliente.id ? (
                            <span className="flex items-center gap-1">
                              <button className="btn-danger" onClick={() => deleteMutation.mutate(cliente.id)} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "..." : "Sim"}</button>
                              <button className="btn-ghost !px-2 !py-1" onClick={() => setConfirmDeleteId(null)}>Não</button>
                            </span>
                          ) : (
                            <button className="btn-ghost !px-2 !py-1.5 !text-rose-400 !border-rose-500/20" onClick={() => { setConfirmDeleteId(cliente.id); setFeedback(null); }} title="Excluir"><Trash2 size={13} /></button>
                          )
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

      {showModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="modal-content card-static w-full max-w-2xl border-slate-700 bg-slate-950/98 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400/70">{editingId ? "Editar" : "Novo"} Cliente</p>
                <h3 className="mt-1 font-display text-xl font-bold text-white">{editingId ? "Atualizar dados" : "Cadastrar cliente"}</h3>
              </div>
              <button className="btn-ghost !px-3 !py-1.5" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-slate-300">Nome / Razão Social</span>
                <input value={form.nome_razao_social} onChange={(e) => setForm((c) => ({ ...c, nome_razao_social: e.target.value }))} className="input-dark" />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">CPF/CNPJ</span>
                <input value={form.cpf_cnpj} onChange={(e) => setForm((c) => ({ ...c, cpf_cnpj: e.target.value }))} className="input-dark" />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">Telefone</span>
                <input value={form.telefone} onChange={(e) => setForm((c) => ({ ...c, telefone: e.target.value }))} className="input-dark" />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">E-mail</span>
                <input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} className="input-dark" />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">CEP</span>
                <input value={form.cep} onChange={(e) => setForm((c) => ({ ...c, cep: e.target.value }))} className="input-dark" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-slate-300">Endereço</span>
                <input value={form.endereco} onChange={(e) => setForm((c) => ({ ...c, endereco: e.target.value }))} className="input-dark" />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
