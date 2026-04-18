import { z } from "zod";
import { parseBody, sanitizeString } from "../_lib/security";
import { validateSerialOrImei } from "../_lib/imei";
import { supabaseAdmin } from "../_lib/supabaseAdmin";

const schema = z.object({
  value: z.string().min(1),
  tipo_equipamento: z.string().optional()
});

function imeiTac(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 15) return null;
  return digits.slice(0, 8);
}

function normalizeRequestBody(body: unknown) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return body;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  try {
    const body = normalizeRequestBody(req.body);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return res.status(200).json({
        valid: false,
        type: "serial",
        normalized: "",
        message: "Payload de validacao invalido."
      });
    }

    const input = parseBody(schema, parsed.data);

    const result = validateSerialOrImei({
      value: sanitizeString(input.value),
      tipoEquipamento: input.tipo_equipamento ? sanitizeString(input.tipo_equipamento) : undefined
    });

    if (!result.valid) {
      return res.status(200).json(result);
    }

    const { data: existingByNormalized } = await supabaseAdmin
      .from("ordens_servico")
      .select("tipo_equipamento,marca,modelo,serial_imei,created_at")
      .eq("serial_imei", result.normalized)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let existing = existingByNormalized;

    if (!existing) {
      const rawValue = sanitizeString(input.value);
      const { data: existingByRaw } = await supabaseAdmin
        .from("ordens_servico")
        .select("tipo_equipamento,marca,modelo,serial_imei,created_at")
        .eq("serial_imei", rawValue)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      existing = existingByRaw;
    }

    if (!existing && result.type === "imei") {
      const tac = imeiTac(result.normalized);

      if (tac) {
        const { data: existingByTac } = await supabaseAdmin
          .from("ordens_servico")
          .select("tipo_equipamento,marca,modelo,serial_imei,created_at")
          .like("serial_imei", `${tac}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingByTac) {
          return res.status(200).json({
            ...result,
            autoFill: {
              tipo_equipamento: sanitizeString(existingByTac.tipo_equipamento),
              marca: sanitizeString(existingByTac.marca),
              modelo: sanitizeString(existingByTac.modelo),
              source: "tac"
            }
          });
        }
      }
    }

    if (!existing) {
      return res.status(200).json(result);
    }

    return res.status(200).json({
      ...result,
      autoFill: {
        tipo_equipamento: sanitizeString(existing.tipo_equipamento),
        marca: sanitizeString(existing.marca),
        modelo: sanitizeString(existing.modelo),
        source: "historico"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(200).json({
      valid: false,
      type: "serial",
      normalized: "",
      message: `Falha ao validar IMEI/serial: ${message}`
    });
  }
}
