import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, Edit3, Package, Plus, Search, Trash2, X } from "lucide-react";
import { createProduto, deleteProduto, listProdutos, registrarEntradaManual, registrarSaidaManual, updateProduto } from "../modules/estoque/service";
import { useRealtimeChannel } from "../hooks/useRealtimeChannel";
import { useSession } from "../hooks/useSession";
import type { Produto } from "../types";

type ProdutoFormState = {
  nome: string;
  sku: string;
  categoria: string;
  unidadeMedida: string;
  estoqueMinimo: string;
  precoCusto: string;
  precoVenda: string;
  estoqueInicial: string;
};

const initialProdutoForm: ProdutoFormState = {
  nome: "",
  sku: "",
  categoria: "Pecas",
  unidadeMedida: "un",
  estoqueMinimo: "1",
  precoCusto: "0",
  precoVenda: "0",
  estoqueInicial: "0"
};

export function EstoquePage() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [produtoForm, setProdutoForm] = useState<ProdutoFormState>(initialProdutoForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const isOwner = user?.email === "lkaua.lopes01@gmail.com" || user?.app_metadata?.role === "admin";
  useRealtimeChannel(["produtos"], "produtos");

  const { data, isLoading } = useQuery({ queryKey: ["produtos"], queryFn: listProdutos });

  const filteredData = (data ?? []).filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.nome.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || p.categoria.toLowerCase().includes(s);
  });

  const baixaMutation = useMutation({ mutationFn: registrarSaidaManual, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["produtos"] }); setFeedback("Saída registrada."); }, onError: (err) => setFeedback(err instanceof Error ? err.message : "Erro.") });
  const entradaMutation = useMutation({ mutationFn: registrarEntradaManual, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["produtos"] }); setFeedback("Entrada registrada."); }, onError: (err) => setFeedback(err instanceof Error ? err.message : "Erro.") });
  const createProdutoMutation = useMutation({ mutationFn: createProduto, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["produtos"] }) });
  const updateProdutoMutation = useMutation({ mutationFn: ({ id, ...input }: { id: string } & Record<string, unknown>) => updateProduto(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["produtos"] }) });
  const deleteMutation = useMutation({ mutationFn: deleteProduto, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["produtos"] }); setConfirmDeleteId(null); setFeedback("Produto excluído."); }, onError: (err) => { setFeedback(err instanceof Error ? err.message : "Erro."); setConfirmDeleteId(null); } });

  const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  function abrirModal(produto?: Produto) {
    setFeedback(null);
    if (produto) {
      setEditingId(produto.id);
      setProdutoForm({
        nome: produto.nome,
        sku: produto.sku,
        categoria: produto.categoria,
        unidadeMedida: produto.unidade_medida,
        estoqueMinimo: String(produto.estoque_minimo),
        precoCusto: String(produto.preco_custo),
        precoVenda: String(produto.preco_venda),
        estoqueInicial: "0"
      });
    } else {
      setEditingId(null);
      setProdutoForm(initialProdutoForm);
    }
    setShowModal(true);
  }

  async function handleSave() {
    setFeedback(null);
    const estoqueInicial = Number(produtoForm.estoqueInicial.replace(",", "."));
    const estoqueMinimo = Number(produtoForm.estoqueMinimo.replace(",", "."));
    const precoCusto = Number(produtoForm.precoCusto.replace(",", "."));
    const precoVenda = Number(produtoForm.precoVenda.replace(",", "."));

    if (!produtoForm.nome || !produtoForm.sku) { setFeedback("Preencha nome e SKU."); return; }
    if ([estoqueMinimo, precoCusto, precoVenda].some((v) => Number.isNaN(v) || v < 0)) { setFeedback("Valores numéricos inválidos."); return; }

    try {
      if (editingId) {
        await updateProdutoMutation.mutateAsync({
          id: editingId,
          nome: produtoForm.nome,
          sku: produtoForm.sku,
          categoria: produtoForm.categoria,
          unidade_medida: produtoForm.unidadeMedida,
          estoque_minimo: estoqueMinimo,
          preco_custo: precoCusto,
          preco_venda: precoVenda
        });
        setFeedback("Produto atualizado.");
      } else {
        const novoProduto = await createProdutoMutation.mutateAsync({
          nome: produtoForm.nome,
          sku: produtoForm.sku,
          categoria: produtoForm.categoria,
          unidade_medida: produtoForm.unidadeMedida,
          estoque_minimo: estoqueMinimo,
          preco_custo: precoCusto,
          preco_venda: precoVenda
        });
        if (estoqueInicial > 0) {
          await entradaMutation.mutateAsync({ produto_id: novoProduto.id, quantidade: estoqueInicial, justificativa: "Estoque inicial de cadastro" });
        }
        setFeedback("Produto criado.");
      }
      setProdutoForm(initialProdutoForm);
      setShowModal(false);
      setEditingId(null);
    } catch (err) { setFeedback(err instanceof Error ? err.message : "Erro ao salvar."); }
  }

  const isSaving = createProdutoMutation.isPending || updateProdutoMutation.isPending || entradaMutation.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Estoque</h2>
          <p className="text-sm text-slate-400">{filteredData.length} produtos</p>
        </div>
        <button onClick={() => abrirModal()} className="btn-primary"><Plus size={16} /> Novo produto</button>
      </div>

      {feedback && (
        <div className="slide-up rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">
          {feedback}
          <button onClick={() => setFeedback(null)} className="ml-3 text-cyan-300/60 hover:text-cyan-100"><X size={14} /></button>
        </div>
      )}

      <div className="card-static flex items-center gap-3 px-4 py-3">
        <Search size={16} className="text-slate-500" />
        <input placeholder="Buscar por nome, SKU ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500" />
        {search && <button onClick={() => setSearch("")} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>}
      </div>

      <div className="card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-pro min-w-full">
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Categoria</th>
                <th>Saldo</th>
                <th>Mín.</th>
                <th>Custo</th>
                <th>Venda</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center text-slate-400">Carregando...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-slate-500">Nenhum produto encontrado.</td></tr>
              ) : (
                filteredData.map((produto) => {
                  const lowStock = produto.estoque_atual <= produto.estoque_minimo;
                  return (
                    <tr key={produto.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-slate-500" />
                          <span className="font-medium text-cyan-200">{produto.nome}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-slate-400">{produto.sku}</td>
                      <td><span className="badge bg-slate-800/60 text-slate-300">{produto.categoria}</span></td>
                      <td>
                        <span className={`font-semibold ${lowStock ? "text-rose-300" : "text-emerald-300"}`}>
                          {produto.estoque_atual}
                        </span>
                        {lowStock && <span className="ml-1.5 text-[10px] text-rose-400">BAIXO</span>}
                      </td>
                      <td className="text-slate-400">{produto.estoque_minimo}</td>
                      <td className="text-slate-400">{moneyFormatter.format(produto.preco_custo)}</td>
                      <td className="font-medium text-slate-200">{moneyFormatter.format(produto.preco_venda)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="btn-ghost !px-2 !py-1.5 !text-emerald-300 !border-emerald-500/20" onClick={() => entradaMutation.mutate({ produto_id: produto.id, quantidade: 1, justificativa: "Reposição manual" })} disabled={entradaMutation.isPending} title="Entrada +1"><ArrowUpCircle size={14} /></button>
                          <button className="btn-ghost !px-2 !py-1.5 !text-amber-300 !border-amber-500/20" onClick={() => baixaMutation.mutate({ produto_id: produto.id, quantidade: 1, justificativa: "Saída manual" })} disabled={baixaMutation.isPending} title="Saída -1"><ArrowDownCircle size={14} /></button>
                          <button className="btn-ghost !px-2 !py-1.5" onClick={() => abrirModal(produto)} title="Editar"><Edit3 size={13} /></button>
                          {isOwner && (
                            confirmDeleteId === produto.id ? (
                              <span className="flex items-center gap-1">
                                <button className="btn-danger" onClick={() => deleteMutation.mutate(produto.id)} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "..." : "Sim"}</button>
                                <button className="btn-ghost !px-2 !py-1" onClick={() => setConfirmDeleteId(null)}>Não</button>
                              </span>
                            ) : (
                              <button className="btn-ghost !px-2 !py-1.5 !text-rose-400 !border-rose-500/20" onClick={() => { setConfirmDeleteId(produto.id); setFeedback(null); }} title="Excluir"><Trash2 size={13} /></button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal (Create / Edit) */}
      {showModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="modal-content card-static w-full max-w-3xl border-slate-700 bg-slate-950/98 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400/70">{editingId ? "Editar" : "Novo"} Produto</p>
                <h3 className="mt-1 font-display text-xl font-bold text-white">{editingId ? "Atualizar produto" : "Cadastrar produto"}</h3>
              </div>
              <button className="btn-ghost !px-3 !py-1.5" onClick={() => { setShowModal(false); setEditingId(null); }}><X size={16} /></button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {([
                ["Nome", "nome"],
                ["SKU", "sku"],
                ["Categoria", "categoria"],
                ["Unidade", "unidadeMedida"],
                ["Estoque mínimo", "estoqueMinimo"],
                ...(editingId ? [] : [["Estoque inicial", "estoqueInicial"]]),
                ["Preço de custo", "precoCusto"],
                ["Preço de venda", "precoVenda"]
              ] as [string, keyof ProdutoFormState][]).map(([label, key]) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-300">{label}</span>
                  <input
                    value={produtoForm[key]}
                    onChange={(e) => setProdutoForm((c) => ({ ...c, [key]: e.target.value }))}
                    className="input-dark"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-ghost" onClick={() => { setShowModal(false); setEditingId(null); }}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
