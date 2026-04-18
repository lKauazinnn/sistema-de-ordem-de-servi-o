import { z } from "zod";
import { requireAdmin } from "../_lib/authz";
import { parseBody, sanitizeString } from "../_lib/security";
import { supabaseAdmin } from "../_lib/supabaseAdmin";

const schema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(2).max(120).optional(),
  role: z.enum(["admin", "gerente", "atendente", "tecnico"]).optional(),
  user_features: z.object({
    streaming_panel: z.boolean().optional()
  }).optional(),
  streaming_url: z.string().url().optional().or(z.literal("")).nullable()
});

export default async function handler(req: any, res: any) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) {
    return;
  }

  try {
    const input = parseBody(schema, req.body);
    const updateAuthPayload: {
      app_metadata?: { role?: string; user_features?: { streaming_panel?: boolean } };
      user_metadata?: { nome?: string; streaming_url?: string | null };
    } = {};

    const cleanedStreamingUrl = typeof input.streaming_url === "string" ? input.streaming_url.trim() : null;

    if (input.role) {
      updateAuthPayload.app_metadata = {
        ...(updateAuthPayload.app_metadata ?? {}),
        role: input.role
      };
    }

    if (input.nome) {
      updateAuthPayload.user_metadata = {
        ...(updateAuthPayload.user_metadata ?? {}),
        nome: sanitizeString(input.nome)
      };
    }

    if (input.user_features) {
      updateAuthPayload.app_metadata = {
        ...(updateAuthPayload.app_metadata ?? {}),
        user_features: {
          streaming_panel: Boolean(input.user_features.streaming_panel)
        }
      };
    }

    if (input.streaming_url !== undefined) {
      updateAuthPayload.user_metadata = {
        ...(updateAuthPayload.user_metadata ?? {}),
        streaming_url: cleanedStreamingUrl || null
      };
    }

    if (updateAuthPayload.app_metadata || updateAuthPayload.user_metadata) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(input.id, updateAuthPayload);
      if (authError) {
        return res.status(400).json({ error: authError.message });
      }
    }

    const profilePatch: Record<string, unknown> = {};

    if (input.nome) {
      profilePatch.nome = sanitizeString(input.nome);
    }

    if (input.role) {
      profilePatch.role = input.role;
    }

    const wantsStreamingEnabled = input.user_features?.streaming_panel;
    if (input.user_features) {
      profilePatch.user_features = {
        streaming_panel: Boolean(input.user_features.streaming_panel)
      };
    }

    if (input.streaming_url !== undefined) {
      profilePatch.streaming_url = cleanedStreamingUrl || null;
    }

    if (wantsStreamingEnabled === false) {
      profilePatch.streaming_url = null;
      updateAuthPayload.user_metadata = {
        ...(updateAuthPayload.user_metadata ?? {}),
        streaming_url: null
      };
    }

    if (Object.keys(profilePatch).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profilePatch)
        .eq("id", input.id);

      if (profileError) {
        return res.status(400).json({ error: profileError.message });
      }
    }

    const { data: updatedProfile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("id,nome,email,role,user_features,streaming_url,created_at")
      .eq("id", input.id)
      .single();

    if (fetchError) {
      return res.status(400).json({ error: fetchError.message });
    }

    return res.status(200).json({ user: updatedProfile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
}
