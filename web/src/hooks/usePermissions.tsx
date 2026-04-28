import type { PropsWithChildren, ReactNode } from "react";
import { useSession } from "./useSession";
import type { UserFeatureKey, UserRole } from "../types";

type PermissionCheck = {
  allowedRoles?: UserRole[];
  feature?: UserFeatureKey;
};

function matchesRoles(role: UserRole | null, allowedRoles?: UserRole[]) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return role ? allowedRoles.includes(role) : false;
}

export function usePermissions() {
  const session = useSession();

  function hasRole(...roles: UserRole[]) {
    return matchesRoles(session.role, roles);
  }

  function canAccess({ allowedRoles, feature }: PermissionCheck) {
    const roleOk = matchesRoles(session.role, allowedRoles);
    const featureOk = feature ? session.hasFeature(feature) : true;
    return Boolean(session.user) && roleOk && featureOk;
  }

  return {
    ...session,
    isAuthenticated: Boolean(session.user),
    hasRole,
    canAccess
  };
}

type PermissionGuardProps = PropsWithChildren<PermissionCheck & {
  fallback?: ReactNode;
}>;

export function PermissionGuard({ allowedRoles, feature, fallback = null, children }: PermissionGuardProps) {
  const { canAccess } = usePermissions();

  if (!canAccess({ allowedRoles, feature })) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}