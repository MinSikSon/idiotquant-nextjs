"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  MoreHorizontal,
  ChevronDown,
  NotebookText,
  EyeOff,
  Swords,
  GitCompareArrows,
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
  { label: "종목 비교", href: "/compare",     icon: GitCompareArrows },
  { label: "종목 분석", href: "/analyze",     icon: Search,     emoji: "💎"   },
];

// '더 보기'로 숨기는 보조 메뉴
const MORE_NAV: NavItem[] = [
  { label: "수익 계산", href: "/calculator",  icon: Calculator              },
  { label: "가계부",    href: "/ledger",      icon: NotebookText, authOnly: true },
  // 게임은 주 메뉴가 아니라 여기 있다 — 매일 쓰는 도구가 아니라 가끔 켜는 것이다.
  // 로그인 없이도 굴러가므로 authOnly 를 안 붙인다.
  //
  // ── 이름이 「모의투자」였다 ────────────────────────────────────────
  // 그때는 주식 로그라이크였으니 맞는 이름이었는데, /game 이 Rogue(1980) 클론으로
  // 바뀌면서 **메뉴가 없는 것을 가리키게 됐다.** 눌러 보면 던전이 나온다.
  //
  // 「로그」로 안 쓴다 — 이 앱에는 가계부와 기록이 있어서 그 두 글자가 log 로 읽힌다.
  // 메뉴는 「게임」으로 묶어 누구나 쉽게 찾게 한다.
  //
  { label: "게임",     href: "/games",       icon: Swords },
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
          className={cn("shrink-0 transition-colors", isActive ? "text-brand-ink dark:text-brand-ink" : "")}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className={cn(
          "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-tight",
          isActive
            ? "bg-brand-light dark:bg-brand-muted/50 text-brand-ink dark:text-brand-ink"
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
  href, label, icon: Icon, emoji, isActive,
}: {
  href: string; label: string; icon?: any; emoji?: string; isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-full min-h-[44px] flex-1 flex-col items-center justify-center gap-[3px] py-2 transition-colors",
        // 랜딩의 각진 버튼 모양을 모바일 탭에도 사용한다.
        "rounded-xl",
        isActive
          ? "text-brand-ink dark:text-brand-ink"
          : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      )}
    >
      <Icon size={20} strokeWidth={isActive ? 2 : 1.6} />
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </Link>
  );
}

/* ─── SIDEBAR USER SECTION ────────────────────────────────────────── */
function SidebarUser({ session, status }: { session: any; status: string }) {
  if (status === "loading") {
    return (
      <div className="mx-3 mb-4 h-10 bg-neutral-200 dark:bg-surface-dark-elevated rounded-xl animate-pulse" />
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
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-colors shadow-sm"
      >
        <LogIn size={14} />
        로그인
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
        className="w-7 h-7 rounded-xl bg-neutral-200 dark:bg-surface-dark-elevated flex items-center justify-center text-neutral-700 dark:text-neutral-200 text-[10px] font-black shrink-0 hover:ring-2 hover:ring-brand/50 transition-all"
      >
        {session?.user?.name?.[0] ?? "U"}
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors"
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
  const utilityNav = [...moreNav, ...(isMasterUser ? PORTFOLIO_NAV : []),
    ...(isMasterUser ? [{ label: "회원 관리", href: "/admin", icon: ShieldCheck }] : [])];
  const moreActive = moreNav.some(i => active(pathname, i.href)) ||
    (isMasterUser && (active(pathname, "/balance") || active(pathname, "/admin")));

  /* 게임 화면에서는 이 바도 **기기의 일부**다. 흰 앱 껍데기로 남아 있으면 기기가 그
     안에 얹힌 다른 물건으로 보인다. 구조는 그대로 두고 색만 바꿔 끼운다 — 이 바는 모든
     화면이 쓰는 것이라, 게임 때문에 배치가 달라지면 다른 화면이 그 값을 치른다.

     `/game` Rogue는 DOM이라 앱 테마를 따른다. */
  const inGame = pathname.startsWith("/games");
  // 게임 안에서는 금융 서비스 이름 대신 게임 묶음의 이름을 쓴다. 공통 헤더지만
  // 경로에 따라 한 단어만 바꾸므로, 게임 바의 색·배치는 그대로 유지된다.
  const brandSuffix = inGame ? "GAMES" : "QUANT";
  const barStyle = inGame
      ? ({ background: "var(--rg-bg)", borderColor: "var(--rg-line-faint)" } as const)
      : undefined;
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreSheet, setMoreSheet] = useState(false);
  const [bottomBarCompact, setBottomBarCompact] = useState(false);
  const compactBottomBar = bottomBarCompact && !moreSheet;
  const showMore = moreOpen || moreActive;

  useEffect(() => {
    setBottomBarCompact(false);
    if (inGame) return;

    const mobile = window.matchMedia("(max-width: 767px)");
    let previousY = Math.max(0, window.scrollY);
    const onScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      if (!mobile.matches || currentY <= 64) {
        setBottomBarCompact(false);
      } else {
        // 손떨림 정도의 움직임에는 바 크기를 바꾸지 않는다.
        if (Math.abs(currentY - previousY) < 8) return;
        setBottomBarCompact(currentY > previousY);
      }
      previousY = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, inGame]);

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
      {/* 게임은 전체 높이 지도에 맞춘 사이드바를 유지한다. */}
      {inGame && <aside className={cn("hidden md:flex flex-col fixed left-0 top-0 h-full w-[220px] z-40 border-r md:max-lg:hidden",
        barStyle ? "" : "bg-white dark:bg-surface-dark border-neutral-200/70 dark:border-surface-dark-border")}
        style={barStyle}>

        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-neutral-100 dark:border-surface-dark-hover shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center shadow-md shadow-brand/25 shrink-0">
              <span className="text-white text-[10px] font-black italic leading-none">IQ</span>
            </div>
            <span className="font-black tracking-tighter text-sm text-neutral-900 dark:text-white">
              IDIOT<span className="text-brand">{brandSuffix}</span>
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wide border border-brand/40 text-brand-ink dark:text-brand-ink bg-brand-light/60 dark:bg-brand-muted/40">
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
                <div className="h-px bg-neutral-100 dark:bg-surface-dark-border mb-3" />
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
                <div className="h-px bg-neutral-100 dark:bg-surface-dark-border mb-3" />
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
        <div className="border-t border-neutral-100 dark:border-surface-dark-hover shrink-0">
          <div className="flex items-center justify-end px-4 py-2.5">
            <ThemeChanger />
          </div>
          <SidebarUser session={session} status={status} />
        </div>
      </aside>}

      {/* 공개 랜딩과 같은 가로 헤더를 일반 페이지 전체에서 사용한다. */}
      {!inGame && <header className="hidden md:block sticky top-0 z-40 border-b border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-surface-dark-canvas">
        <div className="mx-auto flex min-h-[64px] max-w-[1600px] items-center gap-6 px-5 sm:px-8 lg:gap-8 lg:px-10">
          <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            idiot<span className="text-[#635bdb] dark:text-brand-ink">quant</span>
          </Link>
          <nav aria-label="주요 메뉴" className="flex min-w-0 flex-1 items-center gap-3 text-xs text-neutral-600 dark:text-neutral-300 lg:gap-6 lg:text-sm">
            {MAIN_NAV.filter(item => item.href !== "/").map(item => (
              <Link key={item.href} href={item.href} aria-current={active(pathname, item.href) ? "page" : undefined}
                className={cn("whitespace-nowrap py-2 font-medium transition-colors hover:text-neutral-950 dark:hover:text-white",
                  active(pathname, item.href) && "font-semibold text-brand-ink dark:text-brand-ink")}>
                {item.label}
              </Link>
            ))}
            <div className="relative">
              <button type="button" onClick={() => setMoreOpen(v => !v)} aria-expanded={moreOpen} aria-controls="desktop-more-menu"
                className={cn("inline-flex items-center gap-1 whitespace-nowrap py-2 font-medium transition-colors hover:text-neutral-950 dark:hover:text-white",
                  moreActive && "text-brand-ink dark:text-brand-ink")}>
                더 보기 <ChevronDown size={14} className={cn("transition-transform", moreOpen && "rotate-180")} />
              </button>
              {moreOpen && <div id="desktop-more-menu" className="absolute left-0 top-full z-50 mt-2 min-w-44 rounded-md border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-surface-dark-card">
                {utilityNav.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}
                    className={cn("block rounded-xl px-3 py-2 text-sm transition-colors hover:bg-brand-light dark:hover:bg-brand-muted",
                      active(pathname, item.href) && "font-semibold text-brand-ink dark:text-brand-ink")}>
                    {item.label}
                  </Link>
                ))}
              </div>}
            </div>
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            <ThemeChanger compact />
            {status === "authenticated" ? <>
              <Link href="/profile" className="max-w-28 truncate rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-500 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-neutral-400">
                {session?.user?.name || "내 계정"}
              </Link>
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} aria-label="로그아웃" title="로그아웃"
                className="text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"><LogOut size={16} /></button>
            </> : status === "unauthenticated" ?
              <Link href="/login" className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover">로그인</Link> : null}
          </div>
        </div>
      </header>}

      {/* ══ MOBILE TOP HEADER ════════════════════════════════════════ */}
      <header className={cn("md:hidden fixed top-0 left-0 right-0 h-[48px] z-40 border-b flex items-center justify-between px-5",
        barStyle ? "" : "bg-white dark:bg-surface-dark-canvas border-neutral-200/80 dark:border-neutral-800")}
        style={barStyle}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              idiot<span className={inGame ? "text-[var(--rg-gold)]" : "text-[#635bdb] dark:text-brand-ink"}>{inGame ? "games" : "quant"}</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeChanger />
          <MiniSession session={session} status={status} />
        </div>
      </header>

      {/* ══ MOBILE BOTTOM TAB BAR ════════════════════════════════════ */}
      <nav aria-label="하단 메뉴" className={cn(inGame ? "hidden" : "md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center px-3 transition-[height] duration-200 motion-reduce:transition-none",
        compactBottomBar ? "h-[44px] [&>a]:py-1 [&>button]:py-1" : "h-[64px]",
        barStyle ? "" : "bg-white dark:bg-surface-dark-canvas border-neutral-200/80 dark:border-neutral-800")}
        style={barStyle}>
        <TabItem href="/"           label="홈"     icon={Home}       isActive={pathname === "/"} />
        {/* 게임(Rogue)은 아래쪽 탭이 아니라 "더보기" 안에 있다(MORE_NAV) */}
        <TabItem href="/screener"   label="발굴"   icon={Filter}     emoji="🥇" isActive={pathname.startsWith("/screener")} />
        <TabItem href="/compare"    label="비교"   icon={GitCompareArrows} isActive={pathname.startsWith("/compare")} />
        <TabItem href="/analyze"    label="분석"   icon={Search}     emoji="💎" isActive={pathname.startsWith("/analyze")} />
        <button
          type="button"
          onClick={() => setMoreSheet(v => !v)}
          className={cn(
            "flex h-full min-h-[44px] flex-1 flex-col items-center justify-center gap-[3px] py-2 rounded-xl transition-colors",
            moreActive || moreSheet
              ? "text-brand-ink dark:text-brand-ink"
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
          <div className="md:hidden fixed bottom-[72px] right-3 z-50 min-w-[160px] rounded-md bg-white dark:bg-surface-dark-card border border-neutral-200 dark:border-neutral-700 shadow-xl p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {utilityNav.map(item => {
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
                      ? "bg-brand-light dark:bg-brand-muted text-brand-ink dark:text-brand-ink"
                      : "text-neutral-600 dark:text-neutral-300 hover:bg-brand-light dark:hover:bg-brand-muted"
                  )}
                >
                  <Icon size={16} className="shrink-0" />
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
      {realAdmin && viewAsUser && !inGame && (
        <button
          type="button"
          onClick={() => setViewAsUser(false)}
          className="fixed z-50 bottom-[76px] left-3 md:bottom-4 md:left-4 flex items-center gap-2 rounded-xl border border-brand-light-hover bg-brand-light px-3.5 py-2 text-[11px] font-bold text-brand-ink shadow-lg hover:bg-[#e5e3ff] dark:border-brand/40 dark:bg-brand-muted dark:text-brand-ink-hover"
        >
          <EyeOff size={13} className="shrink-0" />
          일반 사용자 화면
          <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-extrabold text-white">
            끄기
          </span>
        </button>
      )}
    </>
  );
}

export default NavbarWithSimpleLinks;
