"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import ThemeChanger from "@/components/theme_changer";
import { cn } from "@/lib/utils";
import {
  Home,
  Filter,
  Search,
  Calculator,
  LogOut,
  LogIn,
  Eye,
  DollarSign,
} from "lucide-react";

/* ─── NAV CONFIG ──────────────────────────────────────────────────── */
const MAIN_NAV = [
  { label: "홈",        href: "/",           icon: Home,       exact: true  },
  { label: "종목 발굴", href: "/screener",    icon: Filter,     badge: "Pro" },
  { label: "적정 주가", href: "/analyze",     icon: Search                  },
  { label: "수익 계산", href: "/calculator",  icon: Calculator              },
];

const PORTFOLIO_NAV = [
  { label: "KR 포트폴리오", href: "/balance-kr", icon: Eye         },
  { label: "US 포트폴리오", href: "/balance-us", icon: DollarSign  },
];

/* ─── HELPERS ─────────────────────────────────────────────────────── */
function active(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/") || (href !== "/" && pathname.startsWith(href));
}

/* ─── SIDEBAR NAV ITEM ────────────────────────────────────────────── */
function SideItem({
  href, label, icon: Icon, isActive, badge,
}: {
  href: string; label: string; icon: any; isActive: boolean; badge?: string | null;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-150",
        isActive
          ? "bg-stone-200/80 dark:bg-[#2a2a2a] text-neutral-900 dark:text-neutral-50 font-semibold"
          : "font-medium text-neutral-500 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-[#1f1f1f] hover:text-neutral-900 dark:hover:text-neutral-100"
      )}
    >
      <Icon
        size={16}
        strokeWidth={isActive ? 2.2 : 1.8}
        className={cn("shrink-0 transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "")}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className={cn(
          "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-tight",
          isActive
            ? "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
            : "bg-neutral-200/60 dark:bg-[#2a2a2a] text-neutral-500 dark:text-neutral-400"
        )}>
          {badge}
        </span>
      )}
    </Link>
  );
}

/* ─── BOTTOM TAB ITEM (mobile) ────────────────────────────────────── */
function TabItem({
  href, label, icon: Icon, isActive,
}: {
  href: string; label: string; icon: any; isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-[3px] py-2 rounded-xl transition-colors",
        isActive
          ? "text-blue-600 dark:text-blue-400 bg-stone-100 dark:bg-[#2a2a2a]"
          : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      )}
    >
      <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </Link>
  );
}

/* ─── SIDEBAR USER SECTION ────────────────────────────────────────── */
function SidebarUser({ session, status }: { session: any; status: string }) {
  if (status === "loading") {
    return (
      <div className="mx-3 mb-4 h-10 bg-stone-100 dark:bg-[#1a1a1a] rounded-xl animate-pulse" />
    );
  }

  if (status === "authenticated") {
    return (
      <div className="px-3 pb-4">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-stone-100 dark:bg-[#1f1f1f]">
          <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-[#3a3a3a] flex items-center justify-center text-neutral-700 dark:text-neutral-200 text-[10px] font-black shrink-0">
            {session?.user?.name?.[0] ?? "U"}
          </div>
          <span className="flex-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate min-w-0">
            {session?.user?.name}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0"
            title="로그아웃"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4">
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm"
      >
        <LogIn size={14} />
        카카오 로그인
      </Link>
    </div>
  );
}

/* ─── MOBILE MINI SESSION ─────────────────────────────────────────── */
function MiniSession({ session, status }: { session: any; status: string }) {
  if (status === "loading") {
    return <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-neutral-800 animate-pulse" />;
  }

  if (status === "authenticated") {
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-black shrink-0">
        {session?.user?.name?.[0] ?? "U"}
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
    >
      로그인
    </Link>
  );
}

/* ─── MAIN EXPORT ─────────────────────────────────────────────────── */
export function NavbarWithSimpleLinks() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isMasterUser = session?.user?.name === process.env.NEXT_PUBLIC_MASTER;

  /* Theme sync: persist choice in localStorage, hydrate on mount */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ══ DESKTOP SIDEBAR ══════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-[220px] z-40 bg-white dark:bg-[#111111] border-r border-neutral-200/70 dark:border-[#222222]">

        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-neutral-100 dark:border-[#1f1f1f] shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0">
              <span className="text-white text-[10px] font-black italic leading-none">IQ</span>
            </div>
            <span className="font-black tracking-tighter text-sm text-neutral-900 dark:text-white">
              IDIOT<span className="text-blue-600">QUANT</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {MAIN_NAV.map(item => (
            <SideItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={active(pathname, item.href, item.exact)}
              badge={item.badge}
            />
          ))}

          {isMasterUser && (
            <>
              <div className="pt-4 pb-1.5 px-1">
                <div className="h-px bg-neutral-100 dark:bg-[#222222] mb-3" />
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                  Portfolio
                </span>
              </div>
              {PORTFOLIO_NAV.map(item => (
                <SideItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={active(pathname, item.href)}
                />
              ))}
            </>
          )}
        </nav>

        {/* Theme toggle + User */}
        <div className="border-t border-neutral-100 dark:border-[#1f1f1f] shrink-0">
          <div className="flex items-center justify-end px-4 py-2.5">
            <ThemeChanger />
          </div>
          <SidebarUser session={session} status={status} />
        </div>
      </aside>

      {/* ══ MOBILE TOP HEADER ════════════════════════════════════════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-[48px] z-40 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-xl border-b border-neutral-200/70 dark:border-[#222222] flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center shadow-sm shadow-blue-600/25 shrink-0">
            <span className="text-white text-[9px] font-black italic leading-none">IQ</span>
          </div>
          <span className="font-black tracking-tighter text-sm text-neutral-900 dark:text-white">
            IDIOT<span className="text-blue-600">QUANT</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeChanger />
          <MiniSession session={session} status={status} />
        </div>
      </header>

      {/* ══ MOBILE BOTTOM TAB BAR ════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] z-40 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-xl border-t border-neutral-200/70 dark:border-[#222222] flex items-center px-3">
        <TabItem href="/"           label="홈"     icon={Home}       isActive={pathname === "/"} />
        <TabItem href="/screener"   label="발굴"   icon={Filter}     isActive={pathname.startsWith("/screener")} />
        <TabItem href="/analyze"    label="분석"   icon={Search}     isActive={pathname.startsWith("/analyze")} />
        <TabItem href="/calculator" label="계산기" icon={Calculator} isActive={pathname.startsWith("/calculator")} />
      </nav>
    </>
  );
}

export default NavbarWithSimpleLinks;
