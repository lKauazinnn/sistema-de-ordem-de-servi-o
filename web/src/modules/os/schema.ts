import { z } from "zod";

export const osSchema = z.object({
  cliente_id: z.string().uuid(),
  tecnico_id: z.string().uuid(),
  tipo_equipamento: z.string().min(2),
  marca: z.string().min(2),
  modelo: z.string().min(2),
  serial_imei: z.string().min(3),
  problema_relatado: z.string().min(5),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]),
  prazo_estimado: z.string(),
  observacoes_internas: z.string().optional()
});

export type OsInput = z.infer<typeof osSchema>;
