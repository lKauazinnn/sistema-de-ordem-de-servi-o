import { z } from "zod";
import { supabaseAdmin } from "../_lib/supabaseAdmin";
import { checkRateLimit, parseBody, sanitizeString } from "../_lib/security";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  const ip = req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "unknown";
  if (!checkRateLimit(String(ip), 10, 60_000)) {
    return res.status(429).json({ error: "Muitas tentativas. Tente novamente em instantes." });
  }

  try {
    const input = parseBody(schema, req.body);
    const email = sanitizeString(input.email);

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password: input.password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
}
