import { useState } from "react";
import type { PropsWithChildren } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardList, LayoutDashboard, LogOut, Menu, Package, Users, X } from "lucide-react";
import { signOut } from "../modules/auth/service";
import { useSession } from "../hooks/useSession";
import { Logo } from "./Logo";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/os", label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/clientes", label: "Clientes", icon: Users }
];

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [isRelogging, setIsRelogging] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleRelogar() {
    setIsRelogging(true);
    try {
      await signOut();
    } finally {
      setIsRelogging(false);
      navigate("/login", { replace: true });
    }
  }

  const currentPageLabel = links.find((l) => l.to === location.pathname)?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-slate-100">
      <header className="glass-header sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-all hover:bg-white/5"
            aria-label="Ir para Dashboard"
          >
            <Logo size={34} />
            <div className="hidden sm:block">
              <h1 className="text-base font-bold tracking-tight text-slate-50">OrdemFlow</h1>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/60">Tech</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1.5 md:flex">
            {links.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`nav-pill flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium ${
                    active
                      ? "bg-cyan-500/12 text-cyan-100 ring-1 ring-cyan-400/25"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 lg:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-xs font-bold text-cyan-200 ring-1 ring-cyan-400/20">
                {(user?.email?.[0] ?? "U").toUpperCase()}
              </div>
              <span className="max-w-[140px] truncate text-xs text-slate-300">{user?.email ?? ""}</span>
            </div>

            <button
              onClick={handleRelogar}
              disabled={isRelogging}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 ring-1 ring-slate-700/70 transition-all hover:bg-slate-700/80 hover:text-white disabled:opacity-50"
              title="Sair e fazer login novamente"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">{isRelogging ? "Saindo..." : "Sair"}</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              className="rounded-xl p-2 text-slate-300 transition hover:bg-white/5 hover:text-white md:hidden"
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="fade-in border-t border-slate-800/50 px-4 pb-3 pt-2 md:hidden">
            {links.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    active ? "bg-cyan-500/12 text-cyan-100" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                  {active && <ChevronRight size={14} className="ml-auto text-cyan-400/50" />}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>OrdemFlow</span>
          <ChevronRight size={12} />
          <span className="text-slate-300">{currentPageLabel}</span>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-4 lg:px-6">{children}</main>
    </div>
  );
}
