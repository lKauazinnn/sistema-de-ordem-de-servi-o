import { describe, expect, it } from "vitest";
import { resolveRoleFromClaims } from "./role";

describe("resolveRoleFromClaims", () => {
  it("deve retornar admin para o owner por email", () => {
    expect(resolveRoleFromClaims({ role: "tecnico" }, "lkaua.lopes01@gmail.com")).toBe("admin");
  });

  it("deve retornar admin quando claim role for admin", () => {
    expect(resolveRoleFromClaims({ role: "admin" })).toBe("admin");
  });

  it("deve cair para tecnico quando role for invalida", () => {
    expect(resolveRoleFromClaims({ role: "foo" })).toBe("tecnico");
  });
});
