import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo nao permitido" }), { status: 405 });
  }

  try {
    const body = await req.json();
    const nfeId = body.nfe_id as string;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Placeholder para integracao SOAP com SEFAZ e assinatura com certificado A1.
    const sefazMock = {
      status: "autorizada",
      protocolo: `PROTO-${Date.now()}`,
      mensagem: "Autorizada em ambiente de homologacao"
    };

    const { error } = await supabase
      .from("nfe_historico")
      .update({
        status: sefazMock.status,
        protocolo: sefazMock.protocolo,
        mensagem_retorno: sefazMock.mensagem,
        updated_at: new Date().toISOString()
      })
      .eq("id", nfeId);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ ok: true, sefaz: sefazMock }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
});
