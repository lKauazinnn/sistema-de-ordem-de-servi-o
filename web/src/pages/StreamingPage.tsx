import { useState } from "react";
import { ExternalLink, PlayCircle, ShieldAlert, Tv } from "lucide-react";
import { useSession } from "../hooks/useSession";

const DEFAULT_HINT = "https://seu-player-streaming.com/canal-principal";

export function StreamingPage() {
  const { hasFeature, profile } = useSession();
  const [manualUrl, setManualUrl] = useState(profile?.streaming_url ?? "");
  const canAccessStreaming = hasFeature("streaming_panel");

  if (!canAccessStreaming) {
    return (
      <div className="card-static max-w-3xl p-6">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/80">
          <ShieldAlert size={13} />
          Acesso restrito
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-white">Painel de Streaming indisponivel</h2>
        <p className="mt-3 text-sm text-slate-300">
          Este usuario ainda nao tem o recurso de IPTV/streaming habilitado.
          Solicite ao administrador para ativar o recurso no gerenciamento de usuarios.
        </p>
      </div>
    );
  }

  const streamingUrl = manualUrl.trim() || profile?.streaming_url || "";

  return (
    <div className="space-y-6">
      <div className="card-static p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">Modulo personalizado</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Painel Streaming / IPTV</h2>
            <p className="mt-2 text-sm text-slate-300">
              Use esta area para abrir o seu painel de transmissao. Se o provider bloquear iframe,
              use o botao para abrir em nova aba.
            </p>
          </div>
          <div className="badge bg-cyan-500/10 text-cyan-200">
            <Tv size={14} className="mr-1.5" />
            Recurso ativo
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={manualUrl}
            onChange={(event) => setManualUrl(event.target.value)}
            className="input-dark"
            placeholder={DEFAULT_HINT}
          />
          <button
            className="btn-primary"
            onClick={() => setManualUrl((current) => current.trim())}
            disabled={!manualUrl.trim()}
          >
            <PlayCircle size={16} />
            Carregar
          </button>
          <a
            href={streamingUrl || undefined}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
            aria-disabled={!streamingUrl}
          >
            <ExternalLink size={16} />
            Nova aba
          </a>
        </div>
      </div>

      <div className="card-static overflow-hidden border-cyan-500/20">
        {streamingUrl ? (
          <iframe
            title="Painel de Streaming"
            src={streamingUrl}
            className="h-[68vh] min-h-[420px] w-full"
            allow="autoplay; encrypted-media; fullscreen"
          />
        ) : (
          <div className="flex h-[58vh] min-h-[360px] flex-col items-center justify-center gap-3 px-6 text-center">
            <Tv size={28} className="text-cyan-300/70" />
            <h3 className="font-display text-xl font-semibold text-slate-100">Informe a URL do painel</h3>
            <p className="max-w-lg text-sm text-slate-400">
              Nenhuma URL de streaming foi configurada para este usuario. Digite acima para iniciar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
