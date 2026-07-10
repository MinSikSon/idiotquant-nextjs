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
  ShieldCheck,
  History,
  Gamepad2,
} from "lucide-react";

/* ─── NAV CONFIG ──────────────────────────────────────────────────── */
type NavItem = {
  label: string;
  href: string;
  icon: any;
  emoji?: string;   // 홈 온보딩 3D 모티브(돛단배·금화·젬)를 활용한 아이콘
  exact?: boolean;
  badge?: string;
  adminOnly?: boolean;
};

// 순서·아이콘을 홈 온보딩 설명 순서에 맞춤: 게임(⛵) → 발굴(🪙) → 분석(💎)
const MAIN_NAV: NavItem[] = [
  { label: "홈",        href: "/",           icon: Home,       exact: true  },
  { label: "카드 게임", href: "/game",        icon: Gamepad2,   emoji: "⛵", badge: "New" },
  { label: "종목 발굴", href: "/screener",    icon: Filter,     emoji: "🪙", badge: "Pro" },
  { label: "전략 히스토리", href: "/backtest", icon: History, adminOnly: true },
  { label: "적정 주가", href: "/analyze",     icon: Search,     emoji: "💎"   },
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
  href, label, icon: Icon, emoji, isActive, badge,
}: {
  href: string; label: string; icon?: any; emoji?: string; isActive: boolean; badge?: string | null;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-150",
        isActive
          ? "bg-[#ede8df]/80 dark:bg-[#35332e] text-neutral-900 dark:text-neutral-50 font-semibold"
          : "font-medium text-neutral-500 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27] hover:text-neutral-900 dark:hover:text-neutral-100"
      )}
    >
      {emoji ? (
        <span className="shrink-0 w-4 text-center text-[15px] leading-none transition-transform group-hover:scale-110" aria-hidden>{emoji}</span>
      ) : (
        <Icon
          size={16}
          strokeWidth={isActive ? 2.2 : 1.8}
          className={cn("shrink-0 transition-colors", isActive ? "text-[#16a34a] dark:text-[#16a34a]" : "")}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className={cn(
          "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-tight",
          isActive
            ? "bg-[#dcfce7] dark:bg-[#052e16]/50 text-[#16a34a] dark:text-[#16a34a]"
            : "bg-neutral-200/60 dark:bg-[#35332e] text-neutral-500 dark:text-neutral-400"
        )}>
          {badge}
        </span>
      )}
    </Link>
  );
}

/* ─── BOTTOM TAB ITEM (mobile) ────────────────────────────────────── */
function TabItem({
  href, label, icon: Icon, emoji, isActive,
}: {
  href: string; label: string; icon?: any; emoji?: string; isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-[3px] py-2 rounded-xl transition-colors",
        isActive
          ? "text-[#16a34a] dark:text-[#16a34a] bg-[#faf9f7] dark:bg-[#35332e]"
          : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      )}
    >
      {emoji ? (
        <span className="text-[19px] leading-none h-5 flex items-center" aria-hidden>{emoji}</span>
      ) : (
        <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
      )}
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </Link>
  );
}

/* ─── SIDEBAR USER SECTION ────────────────────────────────────────── */
function SidebarUser({ session, status }: { session: any; status: string }) {
  if (status === "loading") {
    return (
      <div className="mx-3 mb-4 h-10 bg-[#faf9f7] dark:bg-[#242320] rounded-xl animate-pulse" />
    );
  }

  if (status === "authenticated") {
    return (
      <div className="px-3 pb-4">
        <div className="flex items-center gap-1 px-1 py-0.5 rounded-xl bg-[#faf9f7] dark:bg-[#2c2b27]">
          <Link
            href="/profile"
            className="flex items-center gap-2 flex-1 px-2 py-2 rounded-lg hover:bg-[#ede8df]/60 dark:hover:bg-[#35332e] transition-colors min-w-0"
          >
            <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-[#4a4641] flex items-center justify-center text-neutral-700 dark:text-neutral-200 text-[10px] font-black shrink-0">
              {session?.user?.name?.[0] ?? "U"}
            </div>
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate min-w-0">
              {session?.user?.name}
            </span>
          </Link>
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
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold transition-colors shadow-sm"
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
      <Link
        href="/profile"
        className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-[#4a4641] flex items-center justify-center text-neutral-700 dark:text-neutral-200 text-[10px] font-black shrink-0 hover:ring-2 hover:ring-[#16a34a]/50 transition-all"
      >
        {session?.user?.name?.[0] ?? "U"}
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="px-3 py-1.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold transition-colors"
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
  const isAdmin = (session?.user as any)?.role === "admin";

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
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-[220px] z-40 bg-white dark:bg-[#1f1e1b] border-r border-neutral-200/70 dark:border-[#3a3834]">

        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-neutral-100 dark:border-[#2c2b27] shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#16a34a] rounded-lg flex items-center justify-center shadow-md shadow-[#16a34a]/25 shrink-0">
              <span className="text-white text-[10px] font-black italic leading-none">IQ</span>
            </div>
            <span className="font-black tracking-tighter text-sm text-neutral-900 dark:text-white">
              IDIOT<span className="text-[#16a34a]">QUANT</span>
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wide border border-[#16a34a]/40 text-[#16a34a] dark:text-[#16a34a] bg-[#dcfce7]/60 dark:bg-[#052e16]/40">
              BETA
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {MAIN_NAV.filter(item => !item.adminOnly || isAdmin).map(item => (
            <SideItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              emoji={item.emoji}
              isActive={active(pathname, item.href, item.exact)}
              badge={item.badge}
            />
          ))}

          {isMasterUser && (
            <>
              <div className="pt-4 pb-1.5 px-1">
                <div className="h-px bg-neutral-100 dark:bg-[#3a3834] mb-3" />
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
              <div className="pt-4 pb-1.5 px-1">
                <div className="h-px bg-neutral-100 dark:bg-[#3a3834] mb-3" />
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                  Admin
                </span>
              </div>
              <SideItem
                href="/admin"
                label="회원 관리"
                icon={ShieldCheck}
                isActive={active(pathname, "/admin")}
              />
            </>
          )}
        </nav>

        {/* Theme toggle + User */}
        <div className="border-t border-neutral-100 dark:border-[#2c2b27] shrink-0">
          <div className="flex items-center justify-end px-4 py-2.5">
            <ThemeChanger />
          </div>
          <SidebarUser session={session} status={status} />
        </div>
      </aside>

      {/* ══ MOBILE TOP HEADER ════════════════════════════════════════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-[48px] z-40 bg-white/95 dark:bg-[#1f1e1b]/95 backdrop-blur-xl border-b border-neutral-200/70 dark:border-[#3a3834] flex items-center justify-between px-4">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <div className="w-6 h-6 bg-[#16a34a] rounded-md flex items-center justify-center shadow-sm shadow-[#16a34a]/25 shrink-0">
              <span className="text-white text-[9px] font-black italic leading-none">IQ</span>
            </div>
            <span className="font-black tracking-tighter text-sm text-neutral-900 dark:text-white">
              IDIOT<span className="text-[#16a34a]">QUANT</span>
            </span>
          </Link>
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wide border border-[#16a34a]/40 text-[#16a34a] dark:text-[#16a34a] bg-[#dcfce7]/60 dark:bg-[#052e16]/40 shrink-0">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeChanger />
          <MiniSession session={session} status={status} />
        </div>
      </header>

      {/* ══ MOBILE BOTTOM TAB BAR ════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] z-40 bg-white/95 dark:bg-[#1f1e1b]/95 backdrop-blur-xl border-t border-neutral-200/70 dark:border-[#3a3834] flex items-center px-3">
        <TabItem href="/"           label="홈"     icon={Home}       isActive={pathname === "/"} />
        <TabItem href="/game"       label="게임"   emoji="⛵"        isActive={pathname.startsWith("/game")} />
        <TabItem href="/screener"   label="발굴"   emoji="🪙"        isActive={pathname.startsWith("/screener")} />
        {isAdmin && (
          <TabItem href="/backtest"   label="히스토리" icon={History}  isActive={pathname.startsWith("/backtest")} />
        )}
        <TabItem href="/analyze"    label="분석"   emoji="💎"        isActive={pathname.startsWith("/analyze")} />
        <TabItem href="/calculator" label="계산기" icon={Calculator} isActive={pathname.startsWith("/calculator")} />
      </nav>
    </>
  );
}

export default NavbarWithSimpleLinks;
