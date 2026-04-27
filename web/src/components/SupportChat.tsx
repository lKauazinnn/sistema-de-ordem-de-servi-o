import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

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

async function askGroq(messages: Message[]): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("Chave VITE_GROQ_API_KEY não configurada no .env.local");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1024,
      temperature: 0.6
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `Erro ${response.status} ao chamar Groq.`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Resposta vazia do assistente.");
  return content as string;
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (messages.length === 0) {
        setMessages([{ role: "assistant", content: "Olá! Sou o assistente da OrdemFlow. Como posso ajudar você hoje?" }]);
      }
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const reply = await askGroq(newMessages.slice(-10));
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="fixed bottom-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-lg ring-2 ring-cyan-400/30 transition-all hover:scale-105 hover:shadow-cyan-500/30"
        title="Suporte IA"
        aria-label="Abrir chat de suporte"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* Janela do chat */}
      {open && (
        <div
          className="fixed bottom-20 left-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950/98 shadow-2xl backdrop-blur-md"
          style={{ height: 460 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-800/70 bg-slate-900/80 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 ring-1 ring-cyan-400/20">
              <Bot size={16} className="text-cyan-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Suporte IA</p>
              <p className="text-[10px] text-slate-400">Powered by Groq · Llama 3.1</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto text-slate-500 transition hover:text-slate-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto space-y-3 p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/20"
                      : "bg-slate-800/80 text-slate-200 ring-1 ring-slate-700/50"
                  }`}
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-slate-800/80 px-3 py-2 ring-1 ring-slate-700/50">
                  <Loader2 size={13} className="animate-spin text-cyan-400" />
                  <span className="text-xs text-slate-400">Digitando...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-800/70 bg-slate-900/60 px-3 py-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-950/80 px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Pergunte algo..."
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 transition hover:bg-cyan-500/30 disabled:opacity-40"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
