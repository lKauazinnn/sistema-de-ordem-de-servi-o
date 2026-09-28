import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorios.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Sessao fica gravada no localStorage e e renovada sozinha: o usuario
    // continua logado mesmo depois de horas/dias com a aba aberta ou fechada.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined
  }
});

/**
 * Devolve um access token valido, renovando a sessao quando o token atual ja
 * expirou (ou esta a menos de um minuto de expirar). Usado antes de chamar as
 * rotas /api para que o usuario nao seja obrigado a relogar depois de ficar
 * muito tempo parado na pagina.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const current = data.session;

  if (current?.access_token) {
    const expiresAtMs = current.expires_at ? current.expires_at * 1000 : 0;
    if (!expiresAtMs || expiresAtMs - Date.now() > 60_000) {
      return current.access_token;
    }
  }

  try {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session?.access_token ?? current?.access_token ?? null;
  } catch {
    return current?.access_token ?? null;
  }
}
