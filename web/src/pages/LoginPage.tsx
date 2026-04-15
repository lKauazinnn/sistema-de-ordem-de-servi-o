import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { signIn, signUp } from "../modules/auth/service";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("As senhas nao conferem.");
        }

        await signUp(email, password, nome);
        setSuccessMessage("Conta criada com sucesso. Se seu projeto exigir confirmacao por email, verifique sua caixa de entrada.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
      } else {
        await signIn(email, password);
        navigate("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-mesh relative min-h-screen overflow-hidden px-4 py-8 sm:px-8">
      <div className="pointer-events-none absolute -left-20 top-[-5rem] h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-[-4rem] h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
            <section className="relative hidden bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 p-10 text-white lg:block">
              <div className="login-grid-overlay absolute inset-0 opacity-35" />
              <div className="relative">
                <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs tracking-wide text-cyan-100">
                  OrdemFlow Tech
                </p>
                <h1 className="mt-5 font-display text-4xl leading-tight">Controle total da sua assistencia tecnica</h1>
                <p className="mt-4 max-w-sm text-sm text-slate-200">
                  Acompanhe ordens de servico, estoque e produtividade com um painel moderno e seguro.
                </p>
              </div>
            </section>

            <section className="p-6 sm:p-10">
              <div className="mx-auto w-full max-w-md">
                <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      mode === "login" ? "bg-white text-slate-900 shadow" : "text-slate-600"
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      mode === "signup" ? "bg-white text-slate-900 shadow" : "text-slate-600"
                    }`}
                  >
                    Cadastrar usuario
                  </button>
                </div>

                <h2 className="font-display text-3xl text-slate-900">
                  {mode === "login" ? "Entrar no sistema" : "Criar novo usuario"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {mode === "login"
                    ? "Use suas credenciais para acessar o painel."
                    : "Cadastre um usuario de equipe para usar a plataforma."}
                </p>

                <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                  {mode === "signup" ? (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Nome</label>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        type="text"
                        required
                      />
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail</label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Senha</label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      required
                    />
                  </div>

                  {mode === "signup" ? (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirmar senha</label>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type="password"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  ) : null}

                  {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
                  {successMessage ? (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
                  ) : null}

                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-500 px-4 py-2.5 font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isLoading}
                  >
                    {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
                    {isLoading ? "Processando..." : mode === "login" ? "Entrar" : "Cadastrar usuario"}
                  </button>
                </form>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
