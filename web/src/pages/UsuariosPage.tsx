import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Search, ShieldAlert, Trash2, Tv, UserCog, X } from "lucide-react";
import { createManagedUser, deleteManagedUser, listManagedUsers, updateManagedUser } from "../modules/users/service";
import { usePermissions } from "../hooks/usePermissions";
import { roleGroups } from "../lib/rbac";
import type { UserRole } from "../types";

type UserForm = {
  email: string;
  password: string;
  nome: string;
  role: UserRole;
  streaming_panel: boolean;
  streaming_url: string;
};

const initialForm: UserForm = {
  email: "",
  password: "",
  nome: "",
  role: "tecnico",
  streaming_panel: false,
  streaming_url: ""
};

const ROLE_OPTIONS: UserRole[] = ["admin", "gerente", "atendente", "tecnico"];

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const { role, hasRole } = usePermissions();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<UserForm>(initialForm);
  const [inlineEdits, setInlineEdits] = useState<Record<string, Omit<UserForm, "email" | "password">>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ["managed-users"],
    queryFn: listManagedUsers,
    enabled: role === "admin"
  });

  const createMutation = useMutation({
    mutationFn: createManagedUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      setCreateModalOpen(false);
      setCreateForm(initialForm);
      setFeedback("Usuario criado com sucesso.");
    },
    onError: (err) => setFeedback(err instanceof Error ? err.message : "Falha ao criar usuario.")
  });

  const updateMutation = useMutation({
    mutationFn: updateManagedUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      setFeedback("Usuario atualizado com sucesso.");
    },
    onError: (err) => setFeedback(err instanceof Error ? err.message : "Falha ao atualizar usuario.")
  });

  const deleteMutation = useMutation({
    mutationFn: deleteManagedUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      setConfirmDeleteId(null);
      setFeedback("Usuario excluido com sucesso.");
    },
    onError: (err) => { setFeedback(err instanceof Error ? err.message : "Falha ao excluir usuario."); setConfirmDeleteId(null); }
  });

  const filteredUsers = useMemo(() => {
    if (!search.trim()) {
      return users;
    }

    const q = search.toLowerCase();
    return users.filter((user) => {
      const nome = user.nome?.toLowerCase() ?? "";
      const email = user.email?.toLowerCase() ?? "";
      return nome.includes(q) || email.includes(q);
    });
  }, [search, users]);

  function editableState(user: typeof users[number]) {
    return (
      inlineEdits[user.id] ?? {
        nome: user.nome,
        role: user.role,
        streaming_panel: Boolean(user.user_features?.streaming_panel),
        streaming_url: user.streaming_url ?? ""
      }
    );
  }

  function setEditableState(userId: string, patch: Partial<Omit<UserForm, "email" | "password">>) {
    const current = inlineEdits[userId];
    setInlineEdits((previous) => ({
      ...previous,
      [userId]: {
        nome: current?.nome ?? "",
        role: current?.role ?? "tecnico",
        streaming_panel: current?.streaming_panel ?? false,
        streaming_url: current?.streaming_url ?? "",
        ...patch
      }
    }));
  }

  async function handleCreateUser() {
    setFeedback(null);

    if (!createForm.nome.trim() || !createForm.email.trim() || createForm.password.length < 6) {
      setFeedback("Preencha nome, e-mail e senha (minimo 6 caracteres).");
      return;
    }

    await createMutation.mutateAsync({
      nome: createForm.nome.trim(),
      email: createForm.email.trim().toLowerCase(),
      password: createForm.password,
      role: createForm.role,
      user_features: {
        streaming_panel: createForm.streaming_panel
      },
      streaming_url: createForm.streaming_panel ? (createForm.streaming_url.trim() || null) : null
    });
  }

  async function handleSaveUser(userId: string) {
    const values = inlineEdits[userId];
    if (!values) {
      return;
    }

    await updateMutation.mutateAsync({
      id: userId,
      nome: values.nome.trim(),
      role: values.role,
      user_features: {
        streaming_panel: values.streaming_panel
      },
      streaming_url: values.streaming_panel ? (values.streaming_url.trim() || null) : null
    });

    setInlineEdits((previous) => {
      const clone = { ...previous };
      delete clone[userId];
      return clone;
    });
  }

  if (!hasRole(...roleGroups.adminOnly)) {
    return (
      <div className="card-static max-w-3xl p-6">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/80">
          <ShieldAlert size={13} />
          Acesso restrito
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-white">Sem permissao para gerenciar usuarios</h2>
        <p className="mt-3 text-sm text-slate-300">Esta area e exclusiva para administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Gerenciamento de Usuarios</h2>
          <p className="text-sm text-slate-400">Defina papel e recursos personalizados por usuario.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateModalOpen(true)}>
          <Plus size={16} />
          Novo usuario
        </button>
      </div>

      {feedback ? (
        <div className="slide-up rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">
          {feedback}
          <button onClick={() => setFeedback(null)} className="ml-3 text-cyan-300/60 hover:text-cyan-100">
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div className="card-static flex items-center gap-3 px-4 py-3">
        <Search size={16} className="text-slate-500" />
        <input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-pro min-w-full">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Papel</th>
                <th>Streaming</th>
                <th>URL do painel</th>
                <th className="text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400">Carregando usuarios...</td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="text-center text-rose-300">
                    {error instanceof Error ? error.message : "Erro ao listar usuarios."}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500">Nenhum usuario encontrado.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const edit = editableState(user);
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="space-y-1">
                          <input
                            value={edit.nome}
                            onChange={(event) => setEditableState(user.id, { nome: event.target.value })}
                            className="input-dark !h-9 !py-1.5"
                          />
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </td>
                      <td>
                        <select
                          value={edit.role}
                          onChange={(event) => setEditableState(user.id, { role: event.target.value as UserRole })}
                          className="input-dark !h-9 !py-1.5"
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={edit.streaming_panel}
                            onChange={(event) => setEditableState(user.id, { streaming_panel: event.target.checked })}
                          />
                          <Tv size={14} className="text-cyan-300" />
                          IPTV
                        </label>
                      </td>
                      <td>
                        <input
                          value={edit.streaming_url}
                          onChange={(event) => setEditableState(user.id, { streaming_url: event.target.value })}
                          disabled={!edit.streaming_panel}
                          placeholder="https://painel.exemplo.com"
                          className="input-dark !h-9 !py-1.5"
                        />
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn-ghost !px-3 !py-1.5"
                            onClick={() => handleSaveUser(user.id)}
                            disabled={updateMutation.isPending}
                          >
                            <Save size={14} />
                            Salvar
                          </button>
                          {confirmDeleteId === user.id ? (
                            <>
                              <button className="btn-danger !px-2 !py-1.5 !text-xs" onClick={() => deleteMutation.mutate(user.id)} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "..." : "Confirmar"}</button>
                              <button className="btn-ghost !px-2 !py-1.5" onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
                            </>
                          ) : (
                            <button className="btn-ghost !px-2 !py-1.5 !text-rose-400 !border-rose-500/20" onClick={() => setConfirmDeleteId(user.id)} title="Excluir usuario"><Trash2 size={14} /></button>
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

      {createModalOpen ? (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="modal-content card-static w-full max-w-2xl border-slate-700 bg-slate-950/98 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400/70">Novo acesso</p>
                <h3 className="mt-1 font-display text-xl font-bold text-white">Criar usuario personalizado</h3>
              </div>
              <button className="btn-ghost !px-3 !py-1.5" onClick={() => setCreateModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">Nome</span>
                <input
                  value={createForm.nome}
                  onChange={(event) => setCreateForm((current) => ({ ...current, nome: event.target.value }))}
                  className="input-dark"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">E-mail</span>
                <input
                  value={createForm.email}
                  onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                  className="input-dark"
                  type="email"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">Senha inicial</span>
                <input
                  value={createForm.password}
                  onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                  className="input-dark"
                  type="password"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-300">Papel</span>
                <select
                  value={createForm.role}
                  onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value as UserRole }))}
                  className="input-dark"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-slate-700/80 bg-slate-900/60 p-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={createForm.streaming_panel}
                  onChange={(event) => setCreateForm((current) => ({ ...current, streaming_panel: event.target.checked }))}
                />
                <UserCog size={15} className="text-cyan-300" />
                Habilitar modulo IPTV/Streaming para este usuario
              </label>

              {createForm.streaming_panel ? (
                <label className="mt-3 block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-300">URL base do painel de streaming</span>
                  <input
                    value={createForm.streaming_url}
                    onChange={(event) => setCreateForm((current) => ({ ...current, streaming_url: event.target.value }))}
                    className="input-dark"
                    placeholder="https://painel.exemplo.com"
                  />
                </label>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-ghost" onClick={() => setCreateModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateUser} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar usuario"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
