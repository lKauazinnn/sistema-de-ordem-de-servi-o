import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  UserRound
} from "lucide-react";
import { signIn, signUp } from "../modules/auth/service";

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: "easeOut" as const }
  }
};

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
  const prefersReducedMotion = useReducedMotion();
  const navigate = useNavigate();

  const highlights = useMemo(
    () => [
      { icon: ShieldCheck, title: "RBAC ativo", desc: "Permissoes por papel para operacao, gestao e administracao." },
      { icon: TrendingUp, title: "Fluxo continuo", desc: "Equipe, financeiro e suporte trabalhando no mesmo painel." },
      { icon: Boxes, title: "Dados conectados", desc: "OS, estoque, clientes e contas em uma unica camada." }
    ],
    []
  );

  const metrics = useMemo(
    () => [
      { label: "Perfis de acesso", value: "4" },
      { label: "Modulos integrados", value: "6" },
      { label: "Atualizacao", value: "Tempo real" }
    ],
    []
  );

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
        setSuccessMessage("Conta criada com sucesso. Verifique o email se a confirmacao estiver habilitada.");
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
    <div className="login-mesh relative min-h-screen overflow-hidden px-4 py-6 sm:px-8 lg:px-10">
      <div className="login-aurora login-aurora-one" />
      <div className="login-aurora login-aurora-two" />
      <div className="login-aurora login-aurora-three" />

      <motion.div
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
        variants={panelVariants}
        className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center justify-center transform-gpu"
      >
        <div className="login-shell grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/40 shadow-[0_22px_70px_rgba(2,6,23,0.5)] backdrop-blur-xl xl:grid-cols-[1.15fr_0.95fr]">
          <section className="relative flex min-h-[320px] flex-col justify-between overflow-hidden px-6 py-8 text-white sm:px-8 lg:px-12 lg:py-10">
            <div className="login-grid-overlay absolute inset-0 opacity-25" />
            <div className="login-radial absolute -left-16 top-24 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="login-radial absolute bottom-[-3rem] right-[-2rem] h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/90 backdrop-blur-md">
                <Sparkles size={13} />
                OrdemFlow Tech
              </div>

              <div className="mt-8 max-w-xl">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-200/80">Controle operacional com acesso segmentado</p>
                <h1 className="mt-4 font-display text-4xl leading-[1.05] text-white sm:text-5xl">
                  Login desenhado para operacao, gestao e escala.
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-6 text-slate-200/85 sm:text-base">
                  Acesse um painel unificado com regras de RBAC e visibilidade por papel.
                </p>
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-3">
                {highlights.map((item) => (
                  <div key={item.title} className="rounded-[1.6rem] border border-white/12 bg-white/8 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-100 ring-1 ring-white/10">
                      <item.icon size={18} />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300/90">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-10 grid gap-3 sm:grid-cols-3">
              {metrics.map((item) => (
                <div key={item.label} className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300/70">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative flex items-center justify-center bg-white/[0.04] px-4 py-6 sm:px-8 lg:px-10">
            <div className="login-form-glass w-full max-w-lg rounded-[2rem] border border-white/12 bg-white/10 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.3)] backdrop-blur-lg sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    <Shield size={12} />
                    Seguranca de acesso
                  </div>
                  <h2 className="mt-4 font-display text-3xl text-white">
                    {mode === "login" ? "Entrar no painel" : "Criar novo acesso"}
                  </h2>
                </div>
                <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-cyan-100 sm:flex">
                  <BadgeCheck size={20} />
                </div>
              </div>

              <div className="mt-6 inline-flex rounded-2xl border border-white/10 bg-slate-900/55 p-1 text-sm text-slate-300 shadow-inner shadow-black/20">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`rounded-[1rem] px-4 py-2.5 font-semibold transition ${
                    mode === "login" ? "bg-white text-slate-900 shadow-lg shadow-white/10" : "text-slate-300"
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
                  className={`rounded-[1rem] px-4 py-2.5 font-semibold transition ${
                    mode === "signup" ? "bg-white text-slate-900 shadow-lg shadow-white/10" : "text-slate-300"
                  }`}
                >
                  Cadastrar usuario
                </button>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {mode === "signup" ? (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-200">Nome</label>
                    <div className="login-input-group flex items-center gap-3 rounded-[1.2rem] border bg-slate-950/45 px-4">
                      <UserRound size={17} className="text-slate-400" />
                      <input className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-500" value={nome} onChange={(e) => setNome(e.target.value)} type="text" placeholder="Nome do colaborador" required />
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-200">E-mail</label>
                  <div className="login-input-group flex items-center gap-3 rounded-[1.2rem] border bg-slate-950/45 px-4">
                    <Mail size={17} className="text-slate-400" />
                    <input className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-500" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="voce@empresa.com" required />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-200">Senha</label>
                  <div className="login-input-group flex items-center gap-3 rounded-[1.2rem] border bg-slate-950/45 px-4">
                    <Lock size={17} className="text-slate-400" />
                    <input className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-500" value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Sua senha" required />
                    <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {mode === "signup" ? (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-200">Confirmar senha</label>
                    <div className="login-input-group flex items-center gap-3 rounded-[1.2rem] border bg-slate-950/45 px-4">
                      <KeyRound size={17} className="text-slate-400" />
                      <input className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-500" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repita a senha" required />
                      <button type="button" onClick={() => setShowConfirmPassword((prev) => !prev)} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label={showConfirmPassword ? "Ocultar confirmacao" : "Mostrar confirmacao"}>
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                ) : null}

                {error ? <p className="rounded-[1.2rem] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
                {successMessage ? <p className="rounded-[1.2rem] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{successMessage}</p> : null}

                <motion.button
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.01, y: -1 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1.3rem] bg-gradient-to-r from-cyan-500 via-sky-500 to-amber-400 px-4 py-3.5 font-semibold text-slate-950 shadow-[0_18px_45px_rgba(14,165,233,0.28)] transition disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isLoading}
                >
                  {mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}
                  {isLoading ? "Processando..." : mode === "login" ? "Entrar no painel" : "Cadastrar usuario"}
                  {!isLoading ? <ArrowRight size={16} /> : null}
                </motion.button>
              </form>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
