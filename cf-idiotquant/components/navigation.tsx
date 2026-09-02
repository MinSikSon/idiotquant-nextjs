"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { R } from "@/lib/retroPalette";
import { useSession, signOut } from "next-auth/react";
import ThemeChanger from "@/components/theme_changer";
import { cn } from "@/lib/utils";
import { useViewAsUser, setViewAsUser } from "@/lib/viewAsUser";
import {
  Home,
  Filter,
  Search,
  Calculator,
  LogOut,
  LogIn,
  Eye,
  ShieldCheck,
  History,
  Wallet,
  MoreHorizontal,
  ChevronDown,
  NotebookText,
  EyeOff,
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
  authOnly?: boolean;   // 로그인해야 보이는 항목 (미들웨어가 어차피 막지만, 못 쓸 메뉴를 띄우지 않는다)
};

// 순서·아이콘을 홈 온보딩 설명 순서에 맞춤: 발굴(🥇) → 분석(💎).
const MAIN_NAV: NavItem[] = [
  { label: "홈",        href: "/",           icon: Home,       exact: true  },
  { label: "종목 발굴", href: "/screener",    icon: Filter,     emoji: "🥇", badge: "Pro" },
  { label: "전략 히스토리", href: "/backtest", icon: History, adminOnly: true },
  { label: "적정 주가", href: "/analyze",     icon: Search,     emoji: "💎"   },
];

// '더 보기'로 숨기는 보조 메뉴
const MORE_NAV: NavItem[] = [
  { label: "수익 계산", href: "/calculator",  icon: Calculator              },
  { label: "가계부",    href: "/ledger",      icon: NotebookText, authOnly: true },
  // 모의투자는 주 메뉴가 아니라 여기 있다 — 매일 쓰는 도구가 아니라 가끔 켜는 게임이다.
  // 로그인 없이도 굴러가므로 authOnly 를 안 붙인다.
  //
  // 카드 도감(/game/cards)은 **여기 없다.** 게임을 안 켠 사람에게 카드 목록은 읽을 수
  // 없는 글이고, 게임을 켠 사람에게는 화면 안에 문이 있다.
  { label: "모의투자",  href: "/game",        icon: Wallet },
];

// 한 화면(/balance)으로 가는 항목이라 하나만 둔다. 국가 선택은 그 화면 안의 🇰🇷/🇺🇸 토글이 맡는다.
// 예전엔 KR/US 두 항목이 각각 /balance-kr · /balance-us 로 갔다가 클라이언트 리다이렉트로
// 같은 화면에 도착했다 — 누를 때마다 "이동 중…" 이 한 번 스쳤다.
const PORTFOLIO_NAV = [
  { label: "포트폴리오", href: "/balance", icon: Eye },
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
          ? "bg-surface-muted/80 dark:bg-surface-dark-muted text-neutral-900 dark:text-neutral-50 font-semibold"
          : "font-medium text-neutral-500 dark:text-neutral-400 hover:bg-surface-muted-hover dark:hover:bg-surface-dark-hover hover:text-neutral-900 dark:hover:text-neutral-100"
      )}
    >
      {emoji && isActive ? (
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
            : "bg-neutral-200/60 dark:bg-surface-dark-muted text-neutral-500 dark:text-neutral-400"
        )}>
          {badge}
        </span>
      )}
    </Link>
  );
}

/* ─── BOTTOM TAB ITEM (mobile) ────────────────────────────────────── */
function TabItem({
  href, label, icon: Icon, emoji, isActive, retro,
}: {
  href: string; label: string; icon?: any; emoji?: string; isActive: boolean;
  /** /game 에서는 이 바도 기기의 일부다 — 색만 바꿔 끼운다. */
  retro?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-[3px] py-2 transition-colors",
        // 각진 모서리도 일체감의 일부다. 이 기기에는 둥근 것이 없다.
        retro ? "rounded-none" : "rounded-xl",
        // 안 고른 탭은 레트로에서도 같은 회색을 쓴다 — 옆의 '더보기' 는 TabItem 이
        // 아니라 이 색을 클래스로 갖고 있어서, 여기만 따로 칠하면 둘이 어긋난다.
        isActive
          ? (retro ? "" : "text-[#16a34a] dark:text-[#16a34a] bg-surface-canvas dark:bg-surface-dark-muted")
          : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      )}
      style={retro && isActive ? { color: R.neon } : undefined}
    >
      {emoji && isActive ? (
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
      <div className="mx-3 mb-4 h-10 bg-surface-canvas dark:bg-surface-dark-card rounded-xl animate-pulse" />
    );
  }

  if (status === "authenticated") {
    return (
      <div className="px-3 pb-4">
        <div className="flex items-center gap-1 px-1 py-0.5 rounded-xl bg-surface-canvas dark:bg-surface-dark-hover">
          <Link
            href="/profile"
            className="flex items-center gap-2 flex-1 px-2 py-2 rounded-lg hover:bg-surface-muted/60 dark:hover:bg-surface-dark-muted transition-colors min-w-0"
          >
            <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-surface-dark-elevated flex items-center justify-center text-neutral-700 dark:text-neutral-200 text-[10px] font-black shrink-0">
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
        className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-surface-dark-elevated flex items-center justify-center text-neutral-700 dark:text-neutral-200 text-[10px] font-black shrink-0 hover:ring-2 hover:ring-[#16a34a]/50 transition-all"
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
  // 관리자가 일반 사용자 화면을 보는 중인가. **권한이 아니라 표시**만 접는다 —
  // 주소를 치면 그대로 열리고, 서버는 이 값을 아예 모른다(lib/viewAsUser.ts).
  const viewAsUser = useViewAsUser();
  const realAdmin = (session?.user as any)?.role === "admin";
  // 이름은 **자격이 아니다.** 프로필 이름은 본인이 바꿀 수 있고 같은 이름을 쓰는 계정도
  // 있다. 이름은 "여러 관리자 중 그 한 명" 을 가리는 데만 쓰고, 관리자인지는 역할로 본다.
  const isMasterUser = realAdmin && session?.user?.name === process.env.NEXT_PUBLIC_MASTER && !viewAsUser;
  const isAdmin = realAdmin && !viewAsUser;

  // '더 보기' — 보조 메뉴(계산기·가계부) 접기/펼치기. 해당 경로에 있으면 자동 노출.
  // 필터는 한 번만 만들어 데스크톱·모바일이 같은 목록을 본다 — 따로 걸면 둘이 어긋난다.
  const moreNav = MORE_NAV.filter(i => !i.authOnly || status === "authenticated");
  const moreActive = moreNav.some(i => active(pathname, i.href));

  /* /game 은 90년대 기기 한 대다. 위아래 바가 흰 앱 껍데기로 남아 있으면 기기가 그
     안에 얹힌 다른 물건으로 보인다 — 같은 어둠에 같은 모서리로 맞춘다.
     구조는 그대로 두고 색과 모서리만 바꿔 끼운다: 이 바는 모든 화면이 쓰는 것이라
     게임 때문에 배치가 달라지면 다른 화면이 그 값을 치른다. */
  const retro = pathname.startsWith("/game");
  /* 바 안의 글자·아이콘 색을 하나하나 바꾸지 않는다. 이 바들은 이미 어두운 바탕용
     dark: 변형을 다 갖고 있으므로, 바에 `dark` 를 씌워 그 색을 쓰게 한다(tailwind 는
     class 기반이라 앱 테마와 무관하게 이 안에서만 켜진다). 바탕만 기기와 같은 어둠으로
     덮으면 끝이고, 나중에 메뉴가 늘어도 색을 또 손볼 일이 없다. */
  const retroBar = { background: R.bg, borderColor: R.lo } as const;
  const retroScope = retro ? "dark" : "";
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreSheet, setMoreSheet] = useState(false);
  const showMore = moreOpen || moreActive;

  /* Theme sync: persist choice in localStorage, hydrate on mount */
  useEffect(() => {
    if (typeof window === "undefined") return;
    // 기본값은 다크 — 저장된 선택이 'light'일 때만 밝게 간다(OS 설정은 보지 않는다).
    // layout.tsx의 선반영 스크립트와 판정 기준이 같아야 마운트 순간 테마가 뒤집히지 않는다.
    if (localStorage.getItem("theme") !== "light") {
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
      <aside className={cn("hidden md:flex flex-col fixed left-0 top-0 h-full w-[220px] z-40 border-r", retroScope,
        retro ? "" : "bg-white dark:bg-surface-dark border-neutral-200/70 dark:border-surface-dark-border")}
        style={retro ? retroBar : undefined}>

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
          {MAIN_NAV.filter(item => !item.adminOnly || isAdmin).map(item => {
            const isActive = active(pathname, item.href, item.exact);
            return (
              <Fragment key={item.href}>
                <SideItem
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  emoji={item.emoji}
                  isActive={isActive}
                  badge={item.badge}
                />
              </Fragment>
            );
          })}

          {/* 더 보기 (보조 메뉴 — 계산기) */}
          <button
            type="button"
            onClick={() => setMoreOpen(v => !v)}
            className={cn(
              "group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              moreActive
                ? "text-neutral-900 dark:text-neutral-50"
                : "text-neutral-500 dark:text-neutral-400 hover:bg-surface-muted-hover dark:hover:bg-surface-dark-hover hover:text-neutral-900 dark:hover:text-neutral-100"
            )}
          >
            <MoreHorizontal size={16} strokeWidth={1.8} className="shrink-0" />
            <span className="flex-1 truncate text-left">더 보기</span>
            <ChevronDown size={14} className={cn("shrink-0 text-neutral-400 transition-transform", showMore && "rotate-180")} />
          </button>
          {showMore && moreNav.map(item => (
            <SideItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={active(pathname, item.href)}
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
      <header className={cn("md:hidden fixed top-0 left-0 right-0 h-[48px] z-40 border-b flex items-center justify-between px-4", retroScope,
        retro ? "" : "bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl border-neutral-200/70 dark:border-surface-dark-border")}
        style={retro ? retroBar : undefined}>
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
      <nav className={cn("md:hidden fixed bottom-0 left-0 right-0 h-[64px] z-40 border-t flex items-center px-3", retroScope,
        retro ? "" : "bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl border-neutral-200/70 dark:border-surface-dark-border")}
        style={retro ? retroBar : undefined}>
        <TabItem retro={retro} href="/"           label="홈"     icon={Home}       isActive={pathname === "/"} />
        {/* 모의투자는 아래쪽 탭이 아니라 "더보기" 안에 있다(MORE_NAV) */}
        <TabItem retro={retro} href="/screener"   label="발굴"   icon={Filter}     emoji="🥇" isActive={pathname.startsWith("/screener")} />
        {isAdmin && (
          <TabItem retro={retro} href="/backtest"   label="히스토리" icon={History}  isActive={pathname.startsWith("/backtest")} />
        )}
        <TabItem retro={retro} href="/analyze"    label="분석"   icon={Search}     emoji="💎" isActive={pathname.startsWith("/analyze")} />
        <button
          type="button"
          onClick={() => setMoreSheet(v => !v)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-[3px] py-2 rounded-xl transition-colors",
            moreActive || moreSheet
              ? "text-[#16a34a] dark:text-[#16a34a] bg-surface-canvas dark:bg-surface-dark-muted"
              : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          )}
        >
          <MoreHorizontal size={20} strokeWidth={moreActive ? 2.2 : 1.6} />
          <span className="text-[10px] font-semibold leading-none">더보기</span>
        </button>
      </nav>

      {/* ══ MOBILE '더보기' 시트 ══════════════════════════════════════ */}
      {moreSheet && (
        <>
          <div className="md:hidden fixed inset-0 z-40" onClick={() => setMoreSheet(false)} />
          <div className="md:hidden fixed bottom-[72px] right-3 z-50 min-w-[160px] rounded-2xl bg-white dark:bg-surface-dark-card border border-neutral-200 dark:border-border-subtle-dark shadow-xl p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {moreNav.map(item => {
              const Icon = item.icon;
              const isActive = active(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreSheet(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-surface-canvas dark:bg-surface-dark-muted text-[#16a34a]"
                      : "text-neutral-600 dark:text-neutral-300 hover:bg-surface-muted-hover dark:hover:bg-surface-dark-hover"
                  )}
                >
                  <Icon size={16} className={cn("shrink-0", isActive && "text-[#16a34a]")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* ══ 일반 사용자 화면으로 보는 중 ══════════════════════════════
          켜 놓고 잊으면 "메뉴가 왜 없지" 가 되므로 어디서나 보이는 자리에 둔다.
          이 알약 자체가 끄는 버튼이다 — 내 계정까지 돌아가지 않아도 된다.
          /game 에는 안 띄운다: 관리자 전용 메뉴가 없어 볼 것이 없고, 그 화면은
          기기 한 대라 위에 뜬 버튼이 판을 가린다. */}
      {realAdmin && viewAsUser && !retro && (
        <button
          type="button"
          onClick={() => setViewAsUser(false)}
          className="fixed z-50 bottom-[76px] left-3 md:bottom-4 md:left-[236px] flex items-center gap-2 rounded-full border border-[#16a34a]/40 bg-[#052e16] px-3.5 py-2 text-[11px] font-bold text-[#dcfce7] shadow-lg hover:bg-[#064e2b] transition-colors"
        >
          <EyeOff size={13} className="shrink-0" />
          일반 사용자 화면
          <span className="rounded-full bg-[#16a34a] px-2 py-0.5 text-[10px] font-extrabold text-white">
            끄기
          </span>
        </button>
      )}
    </>
  );
}

export default NavbarWithSimpleLinks;
