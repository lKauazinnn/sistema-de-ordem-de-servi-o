import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "../types";
import { useSession } from "../hooks/useSession";

type Props = {
  allowedRoles: UserRole[];
};

export function RouteGuard({ allowedRoles }: Props) {
  const { loading, user, role } = useSession();

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  if (!user || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
