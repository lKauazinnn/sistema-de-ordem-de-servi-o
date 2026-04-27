import { z } from "zod";
import { requireAdmin } from "../_lib/authz";
import { parseBody } from "../_lib/security";
import { supabaseAdmin } from "../_lib/supabaseAdmin";

const schema = z.object({
  id: z.string().uuid()
});

export default async function handler(req: any, res: any) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) {
    return;
  }

  try {
    const input = parseBody(schema, req.body);

    if (input.id === auth.userId) {
      return res.status(400).json({ error: "Voce nao pode excluir sua propria conta." });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(input.id);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
}
