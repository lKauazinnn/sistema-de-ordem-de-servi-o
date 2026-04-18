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

function readUserFeatures(session: Session | null): UserFeatures {
  const appMetadata = session?.user?.app_metadata as { user_features?: UserFeatures } | undefined;
  return appMetadata?.user_features ?? {};
}

function buildProfileFromSession(session: Session | null, role: UserRole): UserProfile | null {
  const user = session?.user;
  if (!user) return null;

  const userMetadata = user.user_metadata as { nome?: string; streaming_url?: string | null } | undefined;
  const userFeatures = readUserFeatures(session);

  return {
    id: user.id,
    nome: typeof userMetadata?.nome === "string" && userMetadata.nome.trim() ? userMetadata.nome.trim() : "Usuario",
    email: user.email ?? null,
    role,
    user_features: userFeatures,
    streaming_url: typeof userMetadata?.streaming_url === "string" ? userMetadata.streaming_url : null
  };
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
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

  const value = useMemo<SessionContextValue>(() => {
    const role = resolveRoleFromClaims(session?.user?.app_metadata, session?.user?.email ?? null);
    const profile = buildProfileFromSession(session, role);
    const userFeatures = readUserFeatures(session);

    return {
      user: session?.user ?? null,
      session,
      role: session ? role : null,
      profile,
      hasFeature: (feature) => Boolean(userFeatures?.[feature]),
      loading
    };
  }, [loading, session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession deve ser usado dentro de SessionProvider");
  }

  return context;
}
