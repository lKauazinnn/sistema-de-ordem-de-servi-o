import type { UserRole } from "../../types";

const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL ?? "lkaua.lopes01@gmail.com").toLowerCase();

export function resolveRoleFromClaims(claims: unknown, email?: string | null): UserRole {
  if (email?.toLowerCase() === OWNER_EMAIL) {
    return "admin";
  }

  const role = typeof claims === "object" && claims !== null ? (claims as { role?: string }).role : undefined;

  if (role === "admin" || role === "gerente" || role === "atendente" || role === "tecnico") {
    return role;
  }

  return "tecnico";
}
