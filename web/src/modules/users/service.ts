import { supabase } from "../../lib/supabase";
import type { UserFeatures, UserProfile, UserRole } from "../../types";

type ManagedUser = UserProfile & {
  created_at: string;
};

type CreateUserInput = {
  email: string;
  password: string;
  nome: string;
  role: UserRole;
  user_features: UserFeatures;
  streaming_url: string | null;
};

type UpdateUserInput = {
  id: string;
  nome?: string;
  role?: UserRole;
  user_features?: UserFeatures;
  streaming_url?: string | null;
};

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`
  };
}

export async function listManagedUsers() {
  try {
    const response = await fetch("/api/users/list", {
      method: "GET",
      headers: await authHeaders()
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Falha ao listar usuarios.");
    }

    return (payload.users ?? []) as ManagedUser[];
  } catch {
    // Fallback local: usa tabela profiles quando API serverless nao esta disponivel.
    const { data, error } = await supabase
      .from("profiles")
      .select("id,nome,email,role,user_features,streaming_url,created_at")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(error.message || "Falha ao listar usuarios.");
    }

    return (data ?? []).map((profile) => ({
      id: profile.id,
      nome: profile.nome,
      email: profile.email,
      role: profile.role,
      user_features: (profile.user_features ?? {}) as UserFeatures,
      streaming_url: profile.streaming_url,
      created_at: profile.created_at ?? new Date().toISOString()
    })) as ManagedUser[];
  }
}

export async function createManagedUser(input: CreateUserInput) {
  const response = await fetch("/api/users/create", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input)
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Falha ao criar usuario.");
  }

  return payload.user as ManagedUser;
}

export async function updateManagedUser(input: UpdateUserInput) {
  const response = await fetch("/api/users/update", {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(input)
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Falha ao atualizar usuario.");
  }

  return payload.user as ManagedUser;
}

export async function deleteManagedUser(userId: string) {
  const response = await fetch("/api/users/delete", {
    method: "DELETE",
    headers: await authHeaders(),
    body: JSON.stringify({ id: userId })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Falha ao excluir usuario.");
  }
}
