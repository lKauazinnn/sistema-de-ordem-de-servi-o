import { z } from "zod";
import { requireAdmin } from "../_lib/authz";
import { parseBody, sanitizeString } from "../_lib/security";
import { supabaseAdmin } from "../_lib/supabaseAdmin";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nome: z.string().min(2).max(120).optional(),
  role: z.enum(["admin", "gerente", "atendente", "tecnico"]),
  user_features: z.object({
    streaming_panel: z.boolean().optional()
  }).optional(),
  streaming_url: z.string().url().optional().or(z.literal(""))
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) {
    return;
  }

  try {
    const input = parseBody(schema, req.body);
    const nome = input.nome ? sanitizeString(input.nome) : "Usuario";
    const normalizedEmail = sanitizeString(input.email).toLowerCase();
    const streamingUrl = input.streaming_url ? input.streaming_url.trim() : null;
    const features = {
      streaming_panel: Boolean(input.user_features?.streaming_panel)
    };

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        nome,
        streaming_url: features.streaming_panel ? streamingUrl : null
      },
      app_metadata: {
        role: input.role,
        user_features: features
      }
    });

    if (error || !data.user) {
      return res.status(400).json({ error: error?.message ?? "Falha ao criar usuario." });
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      nome,
      email: normalizedEmail,
      role: input.role,
      user_features: features,
      streaming_url: features.streaming_panel ? streamingUrl : null
    });

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    return res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        nome,
        role: input.role,
        user_features: features,
        streaming_url: features.streaming_panel ? streamingUrl : null,
        created_at: data.user.created_at
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
}
