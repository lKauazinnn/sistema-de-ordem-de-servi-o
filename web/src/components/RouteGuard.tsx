import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "../types";
import { usePermissions } from "../hooks/usePermissions";

type Props = {
  allowedRoles: UserRole[];
};

export function RouteGuard({ allowedRoles }: Props) {
  const { loading, isAuthenticated, canAccess } = usePermissions();

  // `loading` so e verdadeiro ate a primeira resolucao da sessao/perfil.
  // Renovacoes de token nao reativam esse estado, entao a pagina em uso nunca e
  // desmontada e o que o usuario digitou continua na tela.
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
