import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound
} from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      <div className="pointer-events-none absolute -left-24 top-[-4rem] h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-7rem] top-[20%] h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-[35%] h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/70 shadow-2xl shadow-slate-900/20 backdrop-blur-2xl">
          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr]">
            <section className="relative hidden bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-10 text-white xl:block">
              <div className="login-grid-overlay absolute inset-0 opacity-35" />
              <div className="relative h-full">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-100">
                  <Sparkles size={13} />
                  OrdemFlow Tech
                </div>
                <h1 className="mt-5 max-w-lg font-display text-4xl leading-tight text-white">
                  Operação técnica com visão executiva em tempo real
                </h1>
                <p className="mt-4 max-w-md text-sm text-slate-200">
                  Uma experiência limpa para equipe, financeiro e gestão trabalharem no mesmo ritmo, com dados atualizados em segundos.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: ShieldCheck, title: "Acesso seguro", desc: "Autenticação e sessão protegidas" },
                    { icon: BadgeCheck, title: "Fluxo padronizado", desc: "Operação com processos consistentes" },
                    { icon: KeyRound, title: "Controle por perfil", desc: "Permissões conforme cargo" },
                    { icon: Sparkles, title: "Tempo real", desc: "Atualizações instantâneas com Supabase" }
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-cyan-400/12 p-1.5 text-cyan-200">
                          <item.icon size={14} />
                        </div>
                        <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-300">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="p-6 sm:p-10">
              <div className="mx-auto w-full max-w-md">
                <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/70">
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
                    Cadastrar usuário
                  </button>
                </div>

                <h2 className="font-display text-3xl text-slate-900">
                  {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {mode === "login"
                    ? "Entre para acessar dashboard, ordens e financeiro em um único painel."
                    : "Cadastre um novo usuário para sua equipe iniciar o trabalho."}
                </p>

                <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                  {mode === "signup" ? (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Nome</label>
                      <div className="group flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
                        <UserRound size={16} className="text-slate-400 group-focus-within:text-cyan-600" />
                        <input
                          className="w-full bg-transparent py-2.5 text-slate-900 outline-none"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          type="text"
                          required
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail</label>
                    <div className="group flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
                      <Mail size={16} className="text-slate-400 group-focus-within:text-cyan-600" />
                      <input
                        className="w-full bg-transparent py-2.5 text-slate-900 outline-none"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Senha</label>
                    <div className="group flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
                      <Lock size={16} className="text-slate-400 group-focus-within:text-cyan-600" />
                      <input
                        className="w-full bg-transparent py-2.5 text-slate-900 outline-none"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {mode === "signup" ? (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirmar senha</label>
                      <div className="group flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
                        <Lock size={16} className="text-slate-400 group-focus-within:text-cyan-600" />
                        <input
                          className="w-full bg-transparent py-2.5 text-slate-900 outline-none"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label={showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
                  {successMessage ? (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
                  ) : null}

                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-indigo-500 px-4 py-3 font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isLoading}
                  >
                    {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
                    {isLoading ? "Processando..." : mode === "login" ? "Entrar no painel" : "Cadastrar usuário"}
                    {!isLoading ? <ArrowRight size={15} /> : null}
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
