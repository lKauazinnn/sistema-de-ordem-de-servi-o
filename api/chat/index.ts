import { z } from "zod";
import { parseBody } from "../_lib/security";

const schema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(4000)
    })
  ).max(20)
});

const SYSTEM_PROMPT = `Você é o assistente de suporte da OrdemFlow Tech, um sistema de gestão de ordens de serviço para assistências técnicas. Responda sempre em português brasileiro.

Você pode ajudar com:
- Ordens de Serviço (OS): criação, status, edição, exclusão
- Estoque: cadastro de produtos, entradas e saídas manuais
- Clientes: cadastro e edição
- Contas a Pagar: cadastro e controle de vencimentos
- Streaming/IPTV: gestão de assinaturas
- Usuários: criação e permissões (admin)
- Notas de serviço e emissão de NF-e
- Dashboard e relatórios

Seja direto, claro e objetivo. Se não souber a resposta, diga honestamente.`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Servico de chat nao configurado." });
  }

  try {
    const input = parseBody(schema, req.body);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...input.messages
        ],
        max_tokens: 1024,
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(502).json({ error: (err as any)?.error?.message ?? "Erro ao chamar o servico de IA." });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
}
