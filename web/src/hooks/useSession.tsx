import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getValidAccessToken, supabase } from "../lib/supabase";
import { resolveRoleFromClaims } from "../modules/auth/service";
import type { UserFeatureKey, UserFeatures, UserProfile, UserRole } from "../types";

type SessionContextValue = {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  profile: UserProfile | null;
  hasFeature: (feature: UserFeatureKey) => boolean;
  loading: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

type ProfileRow = UserProfile;

type ProfileState = {
  /** id do usuario cujo perfil ja foi carregado (null = nenhum) */
  userId: string | null;
  row: ProfileRow | null;
};

function readUserFeatures(session: Session | null): UserFeatures {
  const appMetadata = session?.user?.app_metadata as { user_features?: UserFeatures } | undefined;
  return appMetadata?.user_features ?? {};
}

function buildProfileFromSession(session: Session | null, role: UserRole): UserProfile | null {
  const user = session?.user;
  if (!user) return null;

  const userMetadata = user.user_metadata as {
    nome?: string;
    streaming_url?: string | null;
    assistencia_nome?: string | null;
    assistencia_cnpj?: string | null;
    assistencia_telefone?: string | null;
    assistencia_endereco?: string | null;
    assistencia_instagram?: string | null;
    assistencia_logo_url?: string | null;
  } | undefined;
  const userFeatures = readUserFeatures(session);

  return {
    id: user.id,
    nome: typeof userMetadata?.nome === "string" && userMetadata.nome.trim() ? userMetadata.nome.trim() : "Usuario",
    email: user.email ?? null,
    role,
    user_features: userFeatures,
    streaming_url: typeof userMetadata?.streaming_url === "string" ? userMetadata.streaming_url : null,
    assistencia_nome: typeof userMetadata?.assistencia_nome === "string" ? userMetadata.assistencia_nome : null,
    assistencia_cnpj: typeof userMetadata?.assistencia_cnpj === "string" ? userMetadata.assistencia_cnpj : null,
    assistencia_telefone: typeof userMetadata?.assistencia_telefone === "string" ? userMetadata.assistencia_telefone : null,
    assistencia_endereco: typeof userMetadata?.assistencia_endereco === "string" ? userMetadata.assistencia_endereco : null,
    assistencia_instagram: typeof userMetadata?.assistencia_instagram === "string" ? userMetadata.assistencia_instagram : null,
    assistencia_logo_url: typeof userMetadata?.assistencia_logo_url === "string" ? userMetadata.assistencia_logo_url : null
  };
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profileState, setProfileState] = useState<ProfileState>({ userId: null, row: null });
  const [initializing, setInitializing] = useState(true);

  const userId = session?.user?.id ?? null;

  // Mantem a sessao mais recente acessivel dentro do efeito de perfil sem
  // fazer o efeito rodar de novo a cada renovacao de token.
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  // Resolve session sem consultar DB para evitar loop por RLS no login.
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitializing(false);
    });

    // Eventos como TOKEN_REFRESHED apenas atualizam o token guardado; nenhum
    // estado de carregamento e reativado, por isso as paginas nao remontam e
    // o que o usuario ja digitou continua na tela.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setInitializing(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Ao voltar para a aba (ou reconectar) apos muito tempo fora, forca a
  // renovacao do token imediatamente em vez de esperar o proximo ciclo
  // agendado do supabase-js, para a sessao nao morrer por inatividade.
  useEffect(() => {
    function revalidate() {
      void getValidAccessToken();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        revalidate();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", revalidate);
    window.addEventListener("online", revalidate);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("online", revalidate);
    };
  }, []);

  // Perfil so e recarregado quando muda o usuario logado, nunca a cada
  // renovacao de token.
  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setProfileState({ userId: null, row: null });
      return () => {
        cancelled = true;
      };
    }

    async function loadProfile(currentUserId: string) {
      const currentSession = sessionRef.current;
      const fallbackRole = resolveRoleFromClaims(currentSession?.user?.app_metadata, currentSession?.user?.email ?? null);
      const fallbackProfile = buildProfileFromSession(currentSession, fallbackRole);

      const { data, error } = await supabase
        .from("profiles")
        .select("id,nome,email,role,user_features,streaming_url,assistencia_nome,assistencia_cnpj,assistencia_telefone,assistencia_endereco,assistencia_instagram,assistencia_logo_url")
        .eq("id", currentUserId)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error || !data) {
        setProfileState({ userId: currentUserId, row: fallbackProfile });
        return;
      }

      setProfileState({
        userId: currentUserId,
        row: {
          id: data.id,
          nome: data.nome,
          email: data.email,
          role: data.role,
          user_features: (data.user_features ?? {}) as UserFeatures,
          streaming_url: data.streaming_url,
          assistencia_nome: data.assistencia_nome,
          assistencia_cnpj: data.assistencia_cnpj,
          assistencia_telefone: data.assistencia_telefone,
          assistencia_endereco: data.assistencia_endereco,
          assistencia_instagram: data.assistencia_instagram,
          assistencia_logo_url: data.assistencia_logo_url
        }
      });
    }

    void loadProfile(userId);

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value = useMemo<SessionContextValue>(() => {
    const fallbackRole = resolveRoleFromClaims(session?.user?.app_metadata, session?.user?.email ?? null);
    const profileRow = profileState.userId === userId ? profileState.row : null;
    const profile = profileRow ?? buildProfileFromSession(session, fallbackRole);
    const role = session ? (profile?.role ?? fallbackRole) : null;
    const userFeatures = profile?.user_features ?? readUserFeatures(session);
    // Carregando apenas ate a primeira resolucao de sessao/perfil. Depois disso
    // fica fixo em false para nunca desmontar as telas que estao em uso.
    const loading = initializing || (userId !== null && profileState.userId !== userId);

    return {
      user: session?.user ?? null,
      session,
      role: session ? role : null,
      profile,
      hasFeature: (feature) => Boolean(userFeatures?.[feature]),
      loading
    };
  }, [initializing, profileState, session, userId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession deve ser usado dentro de SessionProvider");
  }

  return context;
}
