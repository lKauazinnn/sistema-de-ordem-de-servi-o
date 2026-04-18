import { z } from "zod";
import { supabaseAdmin } from "../_lib/supabaseAdmin";
import { parseBody, sanitizeString } from "../_lib/security";
import { validateSerialOrImei } from "../_lib/imei";

const schema = z.object({
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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  try {
    const input = parseBody(schema, req.body);

    const tipoEquipamento = sanitizeString(input.tipo_equipamento);
    const serialImei = sanitizeString(input.serial_imei);
    const imeiValidation = validateSerialOrImei({
      value: serialImei,
      tipoEquipamento
    });

    if (!imeiValidation.valid) {
      return res.status(400).json({ error: imeiValidation.message });
    }

    const payload = {
      ...input,
      tipo_equipamento: tipoEquipamento,
      marca: sanitizeString(input.marca),
      modelo: sanitizeString(input.modelo),
      serial_imei: imeiValidation.normalized,
      problema_relatado: sanitizeString(input.problema_relatado),
      observacoes_internas: input.observacoes_internas ? sanitizeString(input.observacoes_internas) : null
    };

    const { data, error } = await supabaseAdmin.from("ordens_servico").insert(payload).select("*").single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
}
