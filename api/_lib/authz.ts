import { supabaseAdmin } from "./supabaseAdmin";

const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "lkaua.lopes01@gmail.com").toLowerCase();

function getBearerToken(req: any): string | null {
  const header = req.headers?.authorization;
  if (!header || typeof header !== "string") {
    return null;
  }

  const [prefix, token] = header.split(" ");
  if (prefix?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

async function resolveAuthenticatedUser(req: any, res: any) {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    res.status(401).json({ error: "Token de acesso ausente." });
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) {
    res.status(401).json({ error: "Sessao invalida." });
    return null;
  }

  const userId = data.user.id;
  const email = (data.user.email ?? "").toLowerCase();
  const roleFromMetadata = typeof data.user.app_metadata?.role === "string" ? data.user.app_metadata.role : null;
  const isOwner = email === OWNER_EMAIL;

  // Fast-path: owner/admin em metadata nao depende de tabela profiles.
  if (isOwner || roleFromMetadata === "admin") {
    return { userId, accessToken, role: "admin" as const };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    // Evita 500 quando schema/permissoes de profiles ainda nao estao prontos.
    res.status(403).json({ error: "Nao foi possivel verificar as permissoes do usuario." });
    return null;
  }

  const role = profile?.role ?? roleFromMetadata ?? "tecnico";
  return { userId, accessToken, role };
}

export async function requireAdmin(req: any, res: any) {
  const auth = await resolveAuthenticatedUser(req, res);
  if (!auth) {
    return null;
  }

  if (auth.role !== "admin") {
    res.status(403).json({ error: "Acesso permitido apenas para administradores." });
    return null;
  }

  return { userId: auth.userId, accessToken: auth.accessToken };
}

export async function requireRole(req: any, res: any, allowedRoles: string[]) {
  const auth = await resolveAuthenticatedUser(req, res);
  if (!auth) {
    return null;
  }

  if (!allowedRoles.includes(auth.role)) {
    res.status(403).json({ error: "Voce nao tem permissao para executar esta acao." });
    return null;
  }

  return auth;
}
