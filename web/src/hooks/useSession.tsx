import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
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
    assistencia_telefone: typeof userMetadata?.assistencia_telefone === "string" ? userMetadata.assistencia_telefone : null
  };
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profileRow, setProfileRow] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolve session sem consultar DB para evitar loop por RLS no login.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(currentSession: Session | null) {
      if (!currentSession?.user?.id) {
        if (!cancelled) {
          setProfileRow(null);
        }
        return;
      }

      const fallbackRole = resolveRoleFromClaims(currentSession.user.app_metadata, currentSession.user.email ?? null);
      const fallbackProfile = buildProfileFromSession(currentSession, fallbackRole);

      const { data, error } = await supabase
        .from("profiles")
        .select("id,nome,email,role,user_features,streaming_url,assistencia_nome,assistencia_cnpj,assistencia_telefone")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error || !data) {
        setProfileRow(fallbackProfile);
        return;
      }

      setProfileRow({
        id: data.id,
        nome: data.nome,
        email: data.email,
        role: data.role,
        user_features: (data.user_features ?? {}) as UserFeatures,
        streaming_url: data.streaming_url,
        assistencia_nome: data.assistencia_nome,
        assistencia_cnpj: data.assistencia_cnpj,
        assistencia_telefone: data.assistencia_telefone
      });
    }

    setLoading(true);
    void loadProfile(session).finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const value = useMemo<SessionContextValue>(() => {
    const fallbackRole = resolveRoleFromClaims(session?.user?.app_metadata, session?.user?.email ?? null);
    const profile = profileRow ?? buildProfileFromSession(session, fallbackRole);
    const role = session ? (profile?.role ?? fallbackRole) : null;
    const userFeatures = profile?.user_features ?? readUserFeatures(session);

    return {
      user: session?.user ?? null,
      session,
      role: session ? role : null,
      profile,
      hasFeature: (feature) => Boolean(userFeatures?.[feature]),
      loading
    };
  }, [loading, profileRow, session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession deve ser usado dentro de SessionProvider");
  }

  return context;
}
