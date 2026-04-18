import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RouteGuard } from "./components/RouteGuard";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { OrdensServicoPage } from "./pages/OrdensServicoPage";
import { EstoquePage } from "./pages/EstoquePage";
import { ClientesPage } from "./pages/ClientesPage";
import { StreamingGestaoPage } from "./pages/StreamingGestaoPage";
import { ContasPagarPage } from "./pages/ContasPagarPage";
import { UsuariosPage } from "./pages/UsuariosPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RouteGuard allowedRoles={["admin", "gerente", "atendente", "tecnico"]} />}>
        <Route
          path="/"
          element={
            <AppShell>
              <DashboardPage />
            </AppShell>
          }
        />
      </Route>

      <Route element={<RouteGuard allowedRoles={["admin", "gerente", "atendente", "tecnico"]} />}>
        <Route
          path="/os"
          element={
            <AppShell>
              <OrdensServicoPage />
            </AppShell>
          }
        />
      </Route>

      <Route element={<RouteGuard allowedRoles={["admin", "gerente", "atendente"]} />}>
        <Route
          path="/estoque"
          element={
            <AppShell>
              <EstoquePage />
            </AppShell>
          }
        />
      </Route>

      <Route element={<RouteGuard allowedRoles={["admin", "gerente", "atendente"]} />}>
        <Route
          path="/clientes"
          element={
            <AppShell>
              <ClientesPage />
            </AppShell>
          }
        />
      </Route>

      <Route element={<RouteGuard allowedRoles={["admin", "gerente", "atendente", "tecnico"]} />}>
        <Route
          path="/streaming"
          element={
            <AppShell>
              <StreamingGestaoPage />
            </AppShell>
          }
        />
      </Route>

      <Route element={<RouteGuard allowedRoles={["admin", "gerente", "atendente", "tecnico"]} />}>
        <Route
          path="/contas-pagar"
          element={
            <AppShell>
              <ContasPagarPage />
            </AppShell>
          }
        />
      </Route>

      <Route element={<RouteGuard allowedRoles={["admin"]} />}>
        <Route
          path="/usuarios"
          element={
            <AppShell>
              <UsuariosPage />
            </AppShell>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
