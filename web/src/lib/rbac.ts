import type { UserRole } from "../types";

export const roleGroups = {
  staff: ["admin", "gerente", "atendente", "tecnico"] as UserRole[],
  operations: ["admin", "gerente", "atendente"] as UserRole[],
  leadership: ["admin", "gerente"] as UserRole[],
  adminOnly: ["admin"] as UserRole[]
};

export const appAccess = {
  dashboard: roleGroups.staff,
  ordensServico: roleGroups.staff,
  estoque: roleGroups.operations,
  clientes: roleGroups.operations,
  streaming: roleGroups.staff,
  contasPagar: roleGroups.staff,
  usuarios: roleGroups.adminOnly
};