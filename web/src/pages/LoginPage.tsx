import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
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
  UserRound,
  Zap,
} from "lucide-react";
import { signIn, signUp } from "../modules/auth/service";

/* ── variants — movimento mínimo, tudo entra junto ── */

// Ease expo-out: entra rápido, desacelera suave no final
const EXPO_OUT = [0.16, 1, 0.3, 1] as const;

const leftContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    // stagger muito apertado: 4 itens = 0.12s total de diferença
    transition: { staggerChildren: 0.04, delayChildren: 0 },
  },
};

const leftItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: EXPO_OUT },
  },
};

// Card entra junto com o painel esquerdo, só opacity + y leve — sem x
const rightVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EXPO_OUT },
  },
};

const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.14, ease: "easeIn" },
  },
};

const alertVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.14 } },
};

/* ── metric counter hook ── */
function useCounter(target: number, active = true) {
  const [count, setCount] = useState(active ? 0 : target);
  useEffect(() => {
    if (!active) { setCount(target); return; }
    let frame = 0;
    const total = 84; // ~1.4s @ 60fps
    const id = setInterval(() => {
      frame++;
      const t = frame / total;
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * target));
      if (frame >= total) clearInterval(id);
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [target, active]);
  return count;
}

/* ── input field ── */
interface InputFieldProps {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  endAdornment?: React.ReactNode;
}

function InputField({ label, icon: Icon, value, onChange, type = "text", placeholder, autoComplete, required, endAdornment }: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      <div className={`lp-input-wrap flex items-center gap-3 rounded-2xl border px-4 transition-all duration-200 ${
        focused
          ? "border-cyan-400/45 bg-[rgba(2,6,23,0.75)] shadow-[0_0_0_3px_rgba(34,211,238,0.07)]"
          : "border-white/8 bg-[rgba(2,6,23,0.5)]"
      }`}>
        <span className={`shrink-0 transition-colors duration-200 ${focused ? "text-cyan-400/75" : "text-slate-600"}`}>
          <Icon size={16} />
        </span>
        <input
          className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {endAdornment}
      </div>
    </div>
  );
}

/* ── metric card ── */
interface MetricCardProps { label: string; value: number; suffix: string; animate: boolean }
function MetricCard({ label, value, suffix, animate }: MetricCardProps) {
  const count = useCounter(value, animate);
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4 cursor-default will-change-transform"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">
        {count}<span className="text-cyan-400">{suffix}</span>
      </p>
    </motion.div>
  );
}

/* ── feature card ── */
interface FeatureCardProps { icon: React.ElementType; title: string; desc: string; colorClass: string }
function FeatureCard({ icon: Icon, title, desc, colorClass }: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className="group rounded-2xl border border-white/8 bg-white/[0.04] p-4 cursor-default will-change-transform hover:border-white/14 transition-colors"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 ring-1 ring-white/8 ${colorClass}`}>
        <Icon size={17} />
      </div>
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{desc}</p>
    </motion.div>
  );
}

/* ── main ── */
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

  /* 3-D tilt — roda no compositor via transform */
  const cardRef = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [6, -6]), { stiffness: 160, damping: 26, mass: 0.6 });
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-6, 6]), { stiffness: 160, damping: 26, mass: 0.6 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    rawX.set((e.clientX - r.left) / r.width - 0.5);
    rawY.set((e.clientY - r.top) / r.height - 0.5);
  }, [rawX, rawY, prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => { rawX.set(0); rawY.set(0); }, [rawX, rawY]);

  const highlights: FeatureCardProps[] = useMemo(() => [
    { icon: ShieldCheck, title: "RBAC ativo", desc: "Permissões por papel — operação, gestão e admin.", colorClass: "text-cyan-300" },
    { icon: TrendingUp, title: "Fluxo contínuo", desc: "Equipe, financeiro e suporte no mesmo painel.", colorClass: "text-blue-300" },
    { icon: Boxes, title: "Dados conectados", desc: "OS, estoque, clientes e contas integrados.", colorClass: "text-amber-300" },
  ], []);

  const metrics: MetricCardProps[] = useMemo(() => [
    { label: "Perfis de acesso", value: 4, suffix: "", animate: !prefersReducedMotion },
    { label: "Módulos integrados", value: 6, suffix: "+", animate: !prefersReducedMotion },
    { label: "Uptime", value: 99, suffix: "%", animate: !prefersReducedMotion },
  ], [prefersReducedMotion]);

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setError(null);
    setSuccessMessage(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      if (mode === "signup") {
        if (password !== confirmPassword) throw new Error("As senhas não conferem.");
        await signUp(email, password, nome);
        setSuccessMessage("Conta criada! Verifique seu e-mail se necessário.");
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
    <div className="lp-bg relative min-h-screen overflow-hidden">
      {/* Aurora orbs — pure CSS, compositor-only */}
      <div className="lp-orb lp-orb-1" />
      <div className="lp-orb lp-orb-2" />
      <div className="lp-orb lp-orb-3" />
      <div className="lp-orb lp-orb-4" />

      {/* Dot grid */}
      <div className="lp-dots absolute inset-0 pointer-events-none" />

      {/* Particles — pure CSS, zero JS per frame */}
      <div className="lp-particles absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className={`lp-particle lp-p-${i}`} />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-7xl">
          <div className="grid gap-10 xl:grid-cols-[1.2fr_0.88fr] xl:gap-16 items-center">

            {/* ── Left panel ── */}
            <motion.div
              variants={leftContainerVariants}
              initial={prefersReducedMotion ? false : "hidden"}
              animate="visible"
              className="hidden xl:flex flex-col gap-8"
            >
              {/* Brand badge */}
              <motion.div variants={leftItemVariants}>
                <div className="inline-flex items-center gap-2.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
                  <span className="lp-pulse-dot h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                  <Sparkles size={12} className="opacity-70" />
                  OrdemFlow Tech
                </div>
              </motion.div>

              {/* Headline */}
              <motion.div variants={leftItemVariants} className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-300/75">
                  Controle operacional com acesso segmentado
                </p>
                <h1 className="font-display text-5xl leading-[1.07] text-white lg:text-[3.5rem]">
                  Login desenhado para{" "}
                  <span className="lp-gradient-text">operação,</span>
                  <br />gestão e escala.
                </h1>
                <p className="max-w-lg text-base leading-relaxed text-slate-400">
                  Painel unificado com RBAC e visibilidade por papel — do técnico ao gestor.
                </p>
              </motion.div>

              {/* Feature cards */}
              <motion.div variants={leftItemVariants} className="grid gap-3 grid-cols-3">
                {highlights.map((h) => <FeatureCard key={h.title} {...h} />)}
              </motion.div>

              {/* Metrics */}
              <motion.div variants={leftItemVariants} className="grid grid-cols-3 gap-3">
                {metrics.map((m) => <MetricCard key={m.label} {...m} />)}
              </motion.div>
            </motion.div>

            {/* ── Form card ── */}
            <motion.div
              variants={rightVariants}
              initial={prefersReducedMotion ? false : "hidden"}
              animate="visible"
              style={prefersReducedMotion ? undefined : { rotateX, rotateY, transformPerspective: 1000 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              ref={cardRef}
              className="lp-card relative w-full max-w-md mx-auto xl:max-w-none rounded-[2rem] p-7 sm:p-9 will-change-transform"
            >
              <div className="lp-card-topline absolute inset-x-0 top-0 h-px rounded-full pointer-events-none" />
              <div className="lp-card-glow absolute inset-0 rounded-[2rem] pointer-events-none" />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-7">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                      <Shield size={10} />
                      Acesso seguro
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.h2
                        key={mode}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="mt-3 font-display text-3xl text-white"
                      >
                        {mode === "login" ? "Entrar no painel" : "Criar novo acesso"}
                      </motion.h2>
                    </AnimatePresence>
                  </div>
                  <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-cyan-300 sm:flex">
                    <BadgeCheck size={19} />
                  </div>
                </div>

                {/* Tab switcher — layoutId spring */}
                <div className="relative mb-7 grid grid-cols-2 rounded-2xl border border-white/8 bg-black/30 p-1">
                  {(["login", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => switchMode(m)}
                      className={`relative z-10 rounded-[14px] py-2.5 text-sm font-semibold transition-colors duration-200 ${
                        mode === m ? "text-slate-950" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {mode === m && (
                        <motion.span
                          layoutId="tab-pill"
                          className="absolute inset-0 rounded-[14px] bg-white shadow-sm"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="relative z-10">
                        {m === "login" ? "Entrar" : "Cadastrar"}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="space-y-4">
                  <AnimatePresence initial={false}>
                    {mode === "signup" && (
                      <motion.div
                        key="nome-field"
                        variants={fieldVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <InputField
                          label="Nome completo"
                          icon={UserRound}
                          value={nome}
                          onChange={setNome}
                          placeholder="Nome do colaborador"
                          required
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <InputField
                    label="E-mail"
                    icon={Mail}
                    value={email}
                    onChange={setEmail}
                    type="email"
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    required
                  />

                  <InputField
                    label="Senha"
                    icon={Lock}
                    value={password}
                    onChange={setPassword}
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha segura"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    endAdornment={
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="rounded-xl p-1.5 text-slate-600 hover:text-slate-300 transition-colors"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                  />

                  <AnimatePresence initial={false}>
                    {mode === "signup" && (
                      <motion.div
                        key="confirm-field"
                        variants={fieldVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <InputField
                          label="Confirmar senha"
                          icon={KeyRound}
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Repita a senha"
                          autoComplete="new-password"
                          required
                          endAdornment={
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((p) => !p)}
                              className="rounded-xl p-1.5 text-slate-600 hover:text-slate-300 transition-colors"
                              aria-label={showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"}
                            >
                              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          }
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Alerts */}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        key="error"
                        variants={alertVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                      >
                        {error}
                      </motion.p>
                    )}
                    {successMessage && (
                      <motion.p
                        key="success"
                        variants={alertVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                      >
                        {successMessage}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <motion.button
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.025, y: -2 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.975 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22 }}
                    className="lp-btn relative mt-2 w-full overflow-hidden rounded-2xl px-4 py-4 font-bold text-white shadow-[0_8px_36px_rgba(34,211,238,0.22)] will-change-transform disabled:opacity-55 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {/* Shimmer — transform only, GPU */}
                    {!isLoading && !prefersReducedMotion && (
                      <span className="lp-shimmer absolute inset-0 pointer-events-none" />
                    )}
                    <span className="relative flex items-center justify-center gap-2.5">
                      {isLoading ? (
                        <span className="lp-spinner h-4 w-4 rounded-full border-2 border-white/25 border-t-white" />
                      ) : mode === "login" ? (
                        <LogIn size={17} />
                      ) : (
                        <UserPlus size={17} />
                      )}
                      {isLoading ? "Processando..." : mode === "login" ? "Entrar no painel" : "Criar conta"}
                      {!isLoading && <ArrowRight size={16} className="lp-arrow" />}
                    </span>
                  </motion.button>
                </form>

                {/* Footer */}
                <div className="mt-6 flex items-center gap-3 text-[11px] text-slate-600">
                  <div className="h-px flex-1 bg-white/5" />
                  <Zap size={11} className="text-cyan-400/50" />
                  <span>Conexão criptografada · Dados seguros</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
