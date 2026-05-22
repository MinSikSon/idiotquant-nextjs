"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MagnifyingGlassIcon,
  CalculatorIcon,
  FunnelIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  GlobeAltIcon,
  LockClosedIcon,
  LockOpenIcon,
  UserIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import ThemeChanger from "@/components/theme_changer";
import { cn } from "@/lib/utils";
import { EyeIcon, TrendingUp, TrendingDown, Activity } from "lucide-react";

/* ──────────────────────────────────────────
   NAV ITEMS CONFIG
────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    label: "적정 주가",
    href: "/search",
    icon: MagnifyingGlassIcon,
    desc: "7가지 밸류에이션 모델 기반 적정 주가 산출",
    badge: null,
  },
  {
    label: "수익률 계산",
    href: "/calculator",
    icon: CalculatorIcon,
    desc: "세후 순수익·복리·연환산 시뮬레이션",
    badge: null,
  },
  {
    label: "퀀트 추천",
    href: "/algorithm-trade",
    icon: FunnelIcon,
    desc: "NCAV·F-Score 멀티팩터 종목 자동 선별",
    badge: "Pro",
  },
];

/* ──────────────────────────────────────────
   SCROLL PROGRESS BAR
────────────────────────────────────────── */
function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-zinc-200/60 dark:bg-zinc-800/60">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-[width] duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────
   DROPDOWN MENU
────────────────────────────────────────── */
function NavDropdown({
  session,
  status,
  pathname,
}: {
  session: any;
  status: string;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
          open
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
            : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
        )}
      >
        서비스
        <ChevronDownIcon
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-[340px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl shadow-zinc-900/10 dark:shadow-black/40 overflow-hidden z-50">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50">
            <p className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
              Core Tools
            </p>
          </div>

          {/* Items */}
          <div className="p-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-4 px-4 py-3 rounded-xl transition-all",
                    active
                      ? "bg-blue-600 text-white"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      active
                        ? "bg-white/20"
                        : "bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        active
                          ? "text-white"
                          : "text-zinc-600 dark:text-zinc-400"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          active
                            ? "text-white"
                            : "text-zinc-800 dark:text-zinc-200"
                        )}
                      >
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          className={cn(
                            "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-tight",
                            active
                              ? "bg-white/20 text-white"
                              : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-[11px] mt-0.5 truncate",
                        active
                          ? "text-blue-100"
                          : "text-zinc-400 dark:text-zinc-500"
                      )}
                    >
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRightIcon
                    className={cn(
                      "w-3.5 h-3.5 shrink-0 transition-all",
                      active
                        ? "text-white opacity-60"
                        : "text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 group-hover:translate-x-0.5"
                    )}
                  />
                </Link>
              );
            })}
          </div>

          {/* Footer CTA */}
          <div className="px-3 pb-3">
            <Link
              href="/algorithm-trade"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <span>Pro 플랜으로 업그레이드</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   SESSION BUTTON (desktop)
────────────────────────────────────────── */
function SessionButton({
  session,
  status,
}: {
  session: any;
  status: string;
}) {
  if (status === "loading") {
    return (
      <div className="w-20 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
    );
  }

  if (status === "authenticated") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-black">
          {session?.user?.name?.[0] ?? "U"}
        </div>
        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 max-w-[80px] truncate">
          {session?.user?.name}
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold tracking-wide transition-all shadow-md shadow-blue-600/25"
    >
      <LockClosedIcon className="w-3 h-3" />
      <div className="w-10">로그인</div>
    </Link>
  );
}

/* ──────────────────────────────────────────
   MAIN NAVBAR
────────────────────────────────────────── */
export function NavbarWithSimpleLinks() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);

  // Theme sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncInitialTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    syncInitialTheme();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.attributeName === "class") {
          const isDark = document.documentElement.classList.contains("dark");
          localStorage.setItem("theme", isDark ? "dark" : "light");
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 8);
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Body lock
  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? "hidden" : "auto";
  }, [isDrawerOpen]);

  const closeDrawer = () => setIsDrawerOpen(false);
  const isMasterUser = session?.user?.name === process.env.NEXT_PUBLIC_MASTER;

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-40 h-14 transition-all duration-300 ease-in-out transform-gpu",
          // visible ? "translate-y-0" : "-translate-y-full",
          scrolled
            ? "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-sm"
            : "bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md border-b border-zinc-200/40 dark:border-zinc-800/40"
        )}
      >
        <div className="h-full max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-4">
          {/* ── Logo ── */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="relative w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:shadow-blue-600/50 transition-shadow">
              <span className="text-white text-[10px] font-black italic leading-none">
                IQ
              </span>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <span className="font-black tracking-tighter text-[15px] text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              IDIOT
              <span className="text-blue-600 dark:text-blue-400">QUANT</span>
            </span>
          </Link>

          {/* ── Divider ── */}
          <div className="hidden md:block w-px h-4 bg-zinc-200 dark:bg-zinc-800" />

          {/* ── Spacer ── */}
          <div className="flex-1" />

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-1">
            <NavDropdown session={session} status={status} pathname={pathname} />

            {/* Direct links */}
            <NavLink href="/search" active={pathname === "/search"}>
              <MagnifyingGlassIcon className="w-3.5 h-3.5" />
              적정 주가
            </NavLink>
            <NavLink href="/calculator" active={pathname === "/calculator"}>
              <CalculatorIcon className="w-3.5 h-3.5" />
              계산기
            </NavLink>

            {/* Master-only links */}
            {isMasterUser && (
              <>
                <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                <NavLink href="/balance-kr" active={pathname === "/balance-kr"}>
                  <EyeIcon className="w-3.5 h-3.5" />
                  KR
                </NavLink>
                <NavLink href="/balance-us" active={pathname === "/balance-us"}>
                  <CurrencyDollarIcon className="w-3.5 h-3.5" />
                  US
                </NavLink>
              </>
            )}
          </div>

          {/* ── Right cluster ── */}
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-zinc-200 dark:border-zinc-800">
            <ThemeChanger />
            <SessionButton session={session} status={status} />
          </div>

          {/* ── Mobile burger ── */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            aria-label="메뉴 열기"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
        </div>

        <ScrollProgress />
      </nav>

      {/* ──────────────────────────────────
          MOBILE DRAWER
      ────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-all duration-300",
          isDrawerOpen ? "visible" : "invisible"
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-zinc-900/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300",
            isDrawerOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={closeDrawer}
        />

        {/* Panel */}
        <aside
          className={cn(
            "absolute right-0 top-0 h-full w-[88%] max-w-[340px] bg-white dark:bg-[#0e0e10] shadow-2xl transition-transform duration-300 ease-out flex flex-col border-l border-zinc-200 dark:border-zinc-800",
            isDrawerOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
            <Link href="/" onClick={closeDrawer} className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white text-[9px] font-black italic">IQ</span>
              </div>
              <span className="font-black tracking-tighter text-sm text-zinc-900 dark:text-white">
                IDIOT<span className="text-blue-600">QUANT</span>
              </span>
            </Link>
            <button
              onClick={closeDrawer}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

            {/* Account card */}
            <div className={cn(
              "rounded-2xl p-4 border",
              status === "authenticated"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60"
                : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  status === "authenticated"
                    ? "bg-emerald-500/20"
                    : "bg-blue-500/20"
                )}>
                  {status === "authenticated"
                    ? <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-black">
                        {session?.user?.name?.[0] ?? "U"}
                      </div>
                    : <LockClosedIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  {status === "authenticated" ? (
                    <>
                      <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 truncate">
                        {session?.user?.name}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Connected
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">로그인하세요</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Pro 기능을 사용하려면 로그인이 필요합니다.</p>
                    </>
                  )}
                </div>
                {status !== "authenticated" && (
                  <Link
                    href="/login"
                    onClick={closeDrawer}
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold hover:bg-blue-700 transition-colors"
                  >
                    시작하기
                  </Link>
                )}
              </div>
            </div>

            {/* Strategy links */}
            <section>
              <SectionLabel>Strategy</SectionLabel>
              <div className="space-y-1.5 mt-2.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <MobileLink
                      key={item.href}
                      href={item.href}
                      active={pathname === item.href}
                      onClick={closeDrawer}
                      icon={<Icon className="w-4 h-4" />}
                      badge={item.badge}
                    >
                      {item.label}
                    </MobileLink>
                  );
                })}
              </div>
            </section>

            {/* Master-only section */}
            {isMasterUser && (
              <section>
                <SectionLabel>Portfolio</SectionLabel>
                <div className="space-y-1.5 mt-2.5">
                  <MobileLink
                    href="/balance-kr"
                    active={pathname === "/balance-kr"}
                    onClick={closeDrawer}
                    icon={<ChartBarIcon className="w-4 h-4" />}
                  >
                    Korea Balance
                  </MobileLink>
                  <MobileLink
                    href="/balance-us"
                    active={pathname === "/balance-us"}
                    onClick={closeDrawer}
                    icon={<GlobeAltIcon className="w-4 h-4" />}
                  >
                    US Balance
                  </MobileLink>
                </div>
              </section>
            )}
          </div>

          {/* Panel footer */}
          <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                Display Mode
              </span>
            </div>
            <ThemeChanger />
          </div>
        </aside>
      </div>

      {/* Spacer */}
      <div className="h-14" />
    </>
  );
}

/* ──────────────────────────────────────────
   SUB-COMPONENTS
────────────────────────────────────────── */
function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
        active
          ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
      )}
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  active,
  onClick,
  icon,
  children,
  badge,
}: {
  href: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: string | null;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all",
        active
          ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20"
          : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
        active
          ? "bg-white/20 text-white"
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
      )}>
        {icon}
      </div>
      <span className={cn(
        "flex-1 text-sm font-bold",
        active ? "text-white" : "text-zinc-800 dark:text-zinc-200"
      )}>
        {children}
      </span>
      {badge && (
        <span className={cn(
          "text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tight",
          active
            ? "bg-white/20 text-white"
            : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
        )}>
          {badge}
        </span>
      )}
      <ChevronRightIcon className={cn(
        "w-3.5 h-3.5 shrink-0 transition-all",
        active
          ? "text-white opacity-50"
          : "text-zinc-300 dark:text-zinc-600 group-hover:translate-x-0.5 group-hover:text-zinc-400"
      )} />
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.22em] px-1">
      {children}
    </span>
  );
}

export default NavbarWithSimpleLinks;