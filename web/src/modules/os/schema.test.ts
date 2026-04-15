import { describe, expect, it } from "vitest";
import { osSchema } from "./schema";

describe("osSchema", () => {
  it("aceita payload valido", () => {
    const parsed = osSchema.parse({
      cliente_id: "bf319b6f-3139-4ef2-a77f-2d8cc3d2a745",
      tecnico_id: "9fbc66f1-53e2-4155-bc9e-92315b718e33",
      tipo_equipamento: "notebook",
      marca: "Dell",
      modelo: "Inspiron",
      serial_imei: "SN123",
      problema_relatado: "Nao liga",
      prioridade: "alta",
      prazo_estimado: new Date().toISOString(),
      observacoes_internas: "Urgente"
    });

    expect(parsed.marca).toBe("Dell");
  });
});
