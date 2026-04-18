import { requireAdmin } from "../_lib/authz";
import { supabaseAdmin } from "../_lib/supabaseAdmin";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) {
    return;
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 500
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const users = data.users ?? [];
  const userIds = users.map((u) => u.id);

  if (userIds.length === 0) {
    return res.status(200).json({ users: [] });
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id,nome,email,role,user_features,streaming_url,created_at")
    .in("id", userIds);

  // Fallback para bancos sem colunas novas (ex: user_features/streaming_url).
  let safeProfiles = profiles ?? [];
  if (profilesError) {
    const fallback = await supabaseAdmin
      .from("profiles")
      .select("id,nome,email,role,created_at")
      .in("id", userIds);

    if (!fallback.error) {
      safeProfiles = (fallback.data ?? []).map((profile) => ({
        ...profile,
        user_features: {},
        streaming_url: null
      }));
    }
  }

  const profileMap = new Map((safeProfiles ?? []).map((profile) => [profile.id, profile]));

  const payload = users.map((user) => {
    const profile = profileMap.get(user.id);
    const nomeMeta = typeof user.user_metadata?.nome === "string" ? user.user_metadata.nome : null;
    const roleMeta = typeof user.app_metadata?.role === "string" ? user.app_metadata.role : "tecnico";

    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      nome: profile?.nome ?? nomeMeta ?? "Usuario",
      role: profile?.role ?? roleMeta,
      user_features: profile?.user_features ?? {},
      streaming_url: profile?.streaming_url ?? null
    };
  });

  return res.status(200).json({ users: payload });
}
