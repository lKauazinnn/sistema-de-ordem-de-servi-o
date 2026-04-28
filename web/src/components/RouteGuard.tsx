import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "../types";
import { usePermissions } from "../hooks/usePermissions";

type Props = {
  allowedRoles: UserRole[];
};

export function RouteGuard({ allowedRoles }: Props) {
  const { loading, isAuthenticated, canAccess } = usePermissions();

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccess({ allowedRoles })) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
