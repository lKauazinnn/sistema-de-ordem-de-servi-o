import { z } from "zod";
import { supabaseAdmin } from "../_lib/supabaseAdmin";
import { parseBody } from "../_lib/security";

const nfeSchema = z.object({
  os_id: z.string().uuid(),
  cliente_id: z.string().uuid(),
  valor_total: z.number().positive(),
  ambiente: z.enum(["homologacao", "producao"])
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  try {
    const input = parseBody(nfeSchema, req.body);
    const provider = (process.env.NFE_PROVIDER ?? "manual").toLowerCase();
    const manualMode = (process.env.NFE_MANUAL_MODE ?? "true").toLowerCase() === "true";

    let status = "pendente";
    let message = "NF-e enfileirada para processamento na Edge Function.";

    if (provider === "manual" || manualMode) {
      status = "emitida_manual";
      message = "Documento registrado em modo manual (sem validacao fiscal automatica).";
    } else if (provider === "plugnotas") {
      status = "pendente_integracao";
      message = "Integracao PlugNotas pendente de configuracao de credenciais de producao.";
    } else if (provider === "acbr") {
      status = "pendente_integracao";
      message = "Integracao ACBr pendente de configuracao do servico emissor.";
    }

    const { data, error } = await supabaseAdmin.from("nfe_historico").insert({
      os_id: input.os_id,
      cliente_id: input.cliente_id,
      status,
      ambiente: input.ambiente,
      valor_total: input.valor_total
    }).select("*").single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(202).json({
      message,
      provider,
      nfe: data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
}
