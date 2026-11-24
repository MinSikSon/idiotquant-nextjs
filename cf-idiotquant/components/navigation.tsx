"use client";

import { useEffect, useState, useRef, Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import ThemeChanger from "@/components/theme_changer";
import { useMobilePageHeader } from "@/components/mobile-page-header";
import { StockSearchTrigger } from "@/components/stock-search-provider";
import { PageShareTools } from "@/components/page-share";
import { NavigationPopover } from "@/components/navigation-popover";
import { navigationScroll, type NavigationScrollState } from "@/lib/navigation-scroll";
import QuickNavigation from "@/components/quick-navigation";
import { cn } from "@/lib/utils";
import { CONTROL_FOCUS_CLS } from "@/lib/ui-controls";
import { useViewAsUser, setViewAsUser } from "@/lib/viewAsUser";
import {
  Home,
  Filter,
  ChartLine,
  Calculator,
  LogOut,
  LogIn,
  Eye,
  ShieldCheck,
  MoreHorizontal,
  LayoutGrid,
  ChevronDown,
  Check,
  UserRound,
  NotebookText,
  Heart,
  EyeOff,
  Swords,
  GitCompareArrows,
  Layers,
  Plus,
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

// 홈 온보딩 순서에 맞춰 발굴 다음에 분석을 표시한다.
const MAIN_NAV: NavItem[] = [
  { label: "오늘", href: "/", icon: Home, exact: true },
  { label: "발굴", href: "/screener", icon: Filter, emoji: "🥇", badge: "Pro" },
  { label: "분석", href: "/analyze", icon: ChartLine },
];

const DESKTOP_NAV_CONTROL = cn(
  "navigation-menubar-item inline-flex min-h-7 items-center whitespace-nowrap px-2.5 font-medium lg:px-3",
  CONTROL_FOCUS_CLS,
);
const MOBILE_NAV_CONTROL = "service-button-quiet service-nav-tab navigation-tab flex h-11 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-[3px] py-1";

// '더 보기'로 숨기는 보조 메뉴
const MORE_NAV: NavItem[] = [
  { label: "가상 ETF", href: "/etfs", icon: Layers },
  { label: "종목 비교", href: "/compare", icon: GitCompareArrows },
  { label: "내 관심종목", href: "/screener?filter=liked", icon: Heart, authOnly: true },
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

const MOBILE_PAGE_TITLES: Pick<NavItem, "href" | "label" | "exact">[] = [
  { href: "/admin/ticker-map", label: "종목 매핑" },
  { href: "/ledger/join", label: "가계부 초대" },
  { href: "/games/crafting-prototype", label: "제작 게임" },
  { href: "/screener", label: "종목 발굴" },
  { href: "/analyze", label: "종목 분석" },
  ...MAIN_NAV,
  ...MORE_NAV,
  ...PORTFOLIO_NAV,
  { href: "/admin", label: "회원 관리" },
  { href: "/profile", label: "내 계정" },
  { href: "/login", label: "로그인" },
  { href: "/search", label: "종목 검색" },
  { href: "/backtest", label: "백테스트" },
  { href: "/algorithm-trade", label: "자동매매" },
  { href: "/quant", label: "퀀트 투자" },
  { href: "/share", label: "공유 결과" },
  { href: "/data-sources", label: "데이터 출처" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보 처리방침" },
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
          : "font-medium text-neutral-600 dark:text-neutral-400 hover:bg-surface-muted-hover dark:hover:bg-surface-dark-hover hover:text-neutral-900 dark:hover:text-neutral-100"
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
            : "bg-neutral-200/60 dark:bg-surface-dark-muted text-neutral-600 dark:text-neutral-400"
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
  href: string; label: string; icon?: any; isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={MOBILE_NAV_CONTROL}
    >
      <Icon size={20} strokeWidth={isActive ? 2 : 1.6} />
      <span className="text-xs font-semibold leading-none">{label}</span>
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
            className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0"
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
        className="flex items-center justify-center gap-2 service-button w-full py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold"
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
        aria-label="내 계정"
        className="w-7 h-7 rounded-xl bg-neutral-200 dark:bg-surface-dark-elevated flex items-center justify-center text-neutral-700 dark:text-neutral-200 text-[10px] font-black shrink-0 hover:ring-2 hover:ring-brand/50 transition-all"
      >
        {session?.user?.name?.[0] ?? "U"}
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      aria-label="로그인"
      className="service-button px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-semibold"
    >
      <LogIn size={16} className="navigation-login-icon hidden" aria-hidden="true" />
      <span className="navigation-login-label">로그인</span>
    </Link>
  );
}

/* ─── MAIN EXPORT ─────────────────────────────────────────────────── */
export function NavbarWithSimpleLinks() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const pageHeader = useMobilePageHeader();
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

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
  const utilityNav: NavItem[] = [...moreNav, ...(isMasterUser ? PORTFOLIO_NAV : []),
    ...(isMasterUser ? [{ label: "회원 관리", href: "/admin", icon: ShieldCheck }] : [])];
  const moreActive = moreNav.some(i => active(pathname, i.href, i.exact)) ||
    (isMasterUser && (active(pathname, "/balance") || active(pathname, "/admin")));

  /* 게임 화면에서는 이 바도 **기기의 일부**다. 흰 앱 껍데기로 남아 있으면 기기가 그
     안에 얹힌 다른 물건으로 보인다. 구조는 그대로 두고 색만 바꿔 끼운다 — 이 바는 모든
     화면이 쓰는 것이라, 게임 때문에 배치가 달라지면 다른 화면이 그 값을 치른다.

     `/game` Rogue는 DOM이라 앱 테마를 따른다. */
  const inGame = pathname.startsWith("/games");
  const inEtfFeed = pathname === "/etfs";
  const inScreener = pathname === "/screener";
  const fixedPageIdentity = pathname === "/analyze" || inScreener;
  // 게임 안에서는 금융 서비스 이름 대신 게임 묶음의 이름을 쓴다. 공통 헤더지만
  // 경로에 따라 한 단어만 바꾸므로, 게임 바의 색·배치는 그대로 유지된다.
  const brandSuffix = inGame ? "GAMES" : "QUANT";
  const barStyle = inGame
      ? ({ background: "var(--rg-bg)", borderColor: "var(--rg-line-faint)" } as const)
      : undefined;
  const [moreOpen, setMoreOpen] = useState(false);
  const [sheetState, setSheetState] = useState({ pathname, open: false });
  if (sheetState.pathname !== pathname) setSheetState({ pathname, open: false });
  const moreSheet = sheetState.pathname === pathname && sheetState.open;
  const setMoreSheet = (open: boolean) => setSheetState({ pathname, open });
  const [bottomState, setBottomState] = useState({ pathname, hidden: false });
  if (bottomState.pathname !== pathname) setBottomState({ pathname, hidden: false });
  const bottomHidden = bottomState.pathname === pathname && bottomState.hidden;
  const setBottomHidden = (hidden: boolean) => setBottomState(previous => previous.pathname === pathname && previous.hidden === hidden ? previous : { pathname, hidden });
  const [gameScroll, setGameScroll] = useState({ pathname, scrolled: false });
  if (gameScroll.pathname !== pathname) setGameScroll({ pathname, scrolled: false });
  const gameScrolled = gameScroll.scrolled;
  const bottomNav = useRef<HTMLElement>(null);
  const identity = useRef<HTMLDivElement>(null);
  const [identityScrolled, setIdentityScrolled] = useState(false);
  const [identityOffset, setIdentityOffset] = useState(0);
  const mobilePageTitle = MOBILE_PAGE_TITLES.find(item => active(pathname, item.href, item.exact))?.label;
  const showMore = moreOpen || moreActive;

  useEffect(() => {
    if (inGame) {
      const update = () => {
        const scrolled = window.scrollY > 64;
        setGameScroll(previous => previous.pathname === pathname && previous.scrolled === scrolled ? previous : { pathname, scrolled });
      };
      window.addEventListener("scroll", update, { passive: true });
      return () => window.removeEventListener("scroll", update);
    }
    let state: NavigationScrollState = { y: Math.max(0, window.scrollY), direction: 0, travel: 0, hidden: false };
    const onScroll = () => {
      const header = document.querySelector('[data-navigation-header]');
      if (fixedPageIdentity) {
        const offset = Math.min(56, Math.max(0, window.scrollY));
        setIdentityOffset(offset);
        setIdentityScrolled(offset >= 56);
      } else {
        setIdentityScrolled(!!identity.current && !!header && identity.current.getBoundingClientRect().bottom <= header.getBoundingClientRect().bottom);
      }
      state = navigationScroll(state, window.scrollY,
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
        moreSheet || !!bottomNav.current?.querySelector(":focus-visible"));
      setBottomState(previous => previous.pathname === pathname && previous.hidden === state.hidden ? previous : { pathname, hidden: state.hidden });
    };
    const observer = new ResizeObserver(onScroll);
    observer.observe(document.body);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname, inGame, moreSheet, fixedPageIdentity]);

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

  const serviceMenu = (compact: boolean) => {
    const research = [...(compact ? MAIN_NAV : []), ...moreNav.filter(item =>
      ["/compare", "/screener?filter=liked"].includes(item.href))];
    const groups = [
      { label: "종목 리서치", items: research },
      { label: "투자 도구 · 게임", items: moreNav.filter(item => !research.includes(item)) },
      { label: "관리", items: utilityNav.filter(item => !moreNav.includes(item)) },
    ];
    return <div className="navigation-service-menu text-base">
      {!inEtfFeed && <section aria-label="페이지 도구" className="navigation-menu-group py-1.5">
        <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold text-[var(--service-muted)]">페이지 도구</p>
        <div ref={mobile === compact ? pageHeader?.setToolsTarget : undefined}>
          {mobile === compact && !pageHeader?.active && <PageShareTools key={pathname} inMenu share={pathname.startsWith("/ledger/join/") ? { path: "/ledger" } : undefined} />}
        </div>
      </section>}
      <nav aria-label={compact ? "전체 서비스" : "추가 서비스"}>
        {groups.filter(group => group.items.length).map(group => <section key={group.label} aria-label={group.label} className="navigation-menu-group py-1.5">
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold text-[var(--service-muted)]">{group.label}</p>
          {group.items.map(({ icon: Icon, ...item }) => {
            const isActive = active(pathname, item.href, item.exact);
            return <Link key={item.href} href={item.href}
              aria-current={isActive ? "page" : undefined}
              className="navigation-menu-link flex min-h-11 items-center gap-2.5 px-2.5 py-1.5 leading-6">
              <span className="navigation-menu-icon grid size-7 shrink-0 place-items-center rounded-md">
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">{item.label}</span>
              {isActive && <Check size={16} aria-hidden="true" className="shrink-0" />}
            </Link>;
          })}
        </section>)}
      </nav>
      <div className="navigation-menu-group flex items-center gap-2 px-2.5 pt-2"><ThemeChanger compact /><QuickNavigation compact={compact} items={[...MAIN_NAV, ...utilityNav]} /></div>
      {(compact || status === "authenticated") && <div className="navigation-menu-group mt-2 pt-1">
        {status === "authenticated" ? <>
          <Link href="/profile" aria-current={pathname === "/profile" ? "page" : undefined} className="navigation-menu-link flex min-h-11 items-center gap-3 px-2.5 py-2">
            <UserRound size={18} aria-hidden="true" className="shrink-0 text-neutral-500 dark:text-neutral-400" /><span className="min-w-0 flex-1 break-words">{session?.user?.name || "내 계정"}<span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">내 계정</span></span>
          </Link>
          <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="navigation-menu-link flex min-h-11 w-full items-center gap-3 px-2.5 py-2 text-left"><LogOut size={18} aria-hidden="true" className="shrink-0" />로그아웃</button>
        </> : status === "unauthenticated" ? <Link href="/login" className="navigation-menu-link flex min-h-11 items-center gap-3 px-2.5 py-2"><LogIn size={18} aria-hidden="true" className="shrink-0" />로그인</Link> : <span className="block p-3 text-sm text-neutral-500 dark:text-neutral-400">계정 확인 중…</span>}
      </div>}
    </div>;
  };

  const logoClass = "min-h-11 shrink-0 items-center whitespace-nowrap text-xl font-bold tracking-tight text-neutral-900 dark:text-white";
  const logoText = <span>idiot<span className="text-brand-ink">quant</span></span>;
  const mobileIdentity = (
    <div
      className={cn("flex min-h-11 items-center gap-3 px-3", fixedPageIdentity && "h-[56px]", identityScrolled && "invisible")}
      style={fixedPageIdentity ? { transform: `translateY(-${identityOffset}px)` } : undefined}
      aria-hidden={identityScrolled || undefined}
    >
      <Link href="/" aria-label="idiotquant 홈" className={cn(logoClass, "inline-flex")}>
        {logoText}
      </Link>
      <div ref={mobile ? pageHeader?.setTitleTarget : undefined} className={cn("min-w-0 flex-1", !pageHeader?.active && "hidden")} />
      {!pageHeader?.active && pathname !== "/" && <span className="truncate text-base font-semibold">{mobilePageTitle}</span>}
    </div>
  );

  return (
    <>
      {/* 게임은 전체 높이 지도에 맞춘 사이드바를 유지한다. */}
      {inGame && <aside className={cn("desktop-game-sidebar hidden md:flex flex-col fixed left-0 top-0 h-full w-[220px] z-40 border-r md:max-lg:hidden",
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
                : "text-neutral-600 dark:text-neutral-400 hover:bg-surface-muted-hover dark:hover:bg-surface-dark-hover hover:text-neutral-900 dark:hover:text-neutral-100"
            )}
          >
            <MoreHorizontal size={16} strokeWidth={1.8} className="shrink-0" />
            <span className="flex-1 truncate text-left">더 보기</span>
            <ChevronDown size={14} className={cn("shrink-0 text-neutral-600 dark:text-neutral-400 transition-transform", showMore && "rotate-180")} />
          </button>
          {showMore && moreNav.map(item => (
            <SideItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={active(pathname, item.href, item.exact)}
            />
          ))}

          {isMasterUser && (
            <>
              <div className="pt-4 pb-1.5 px-1">
                <div className="h-px bg-neutral-100 dark:bg-surface-dark-border mb-3" />
                <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-widest">
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
                <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-widest">
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

      {!inGame && <header data-navigation-header data-screener-navigation={inScreener || undefined} className="navigation-header fixed inset-x-0 top-0 z-40 md:sticky">
        <div className="navigation-main flex items-center gap-2 px-3 md:gap-3 md:px-6">
          <Link href="/" aria-label="idiotquant 홈" className={cn(logoClass, "navigation-brand md:inline-flex md:min-h-7", inEtfFeed || identityScrolled ? "inline-flex" : "hidden")}>
            {logoText}
          </Link>
          <nav aria-label="주요 서비스" className="hidden shrink-0 items-center gap-1 md:flex">
            {MAIN_NAV.map(item => {
              const isActive = active(pathname, item.href, item.exact);
              return <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined}
                className={DESKTOP_NAV_CONTROL}>
                {item.label}
              </Link>;
            })}
            <NavigationPopover label="사용자 및 서비스 메뉴" align="start" className="navigation-service-popover" trigger={
              <button type="button" data-current-section={(!inScreener && moreActive) || undefined} className={DESKTOP_NAV_CONTROL}>
                더 보기
              </button>
            }>
              {serviceMenu(false)}
            </NavigationPopover>
          </nav>
          <div ref={!mobile ? pageHeader?.setTitleTarget : undefined} data-navigation-desktop-context className={cn("hidden min-w-0 flex-1 md:block lg:flex-[0_1_16rem]", !pageHeader?.active && "md:hidden")} />
          {!pageHeader?.active && !inScreener && <span className="hidden min-w-0 flex-1 truncate text-sm font-semibold md:block lg:flex-[0_1_16rem] lg:empty:hidden">{pathname === "/" || inEtfFeed ? null : mobilePageTitle}</span>}
          <div className="min-w-0 flex-1 md:hidden">
            <div ref={pageHeader?.setInfoTarget} data-navigation-info />
            <div ref={pageHeader?.setScrollTitleTarget} data-navigation-scroll-title hidden={!identityScrolled} />
          </div>
          <div className="flex shrink-0 items-center gap-2 md:ml-auto md:gap-1.5">
            <div ref={pageHeader?.setPrimaryActionTarget} className="shrink-0 empty:hidden md:hidden" />
            <div ref={pageHeader?.setActionsTarget} data-navigation-actions className="shrink-0 empty:hidden" />
            {inEtfFeed && <Link href="/etfs/draft" className={cn("service-button-quiet order-first inline-flex min-h-11 shrink-0 items-center gap-1 rounded px-1.5 text-sm font-semibold text-brand-ink sm:px-2 md:min-h-7", CONTROL_FOCUS_CLS)}>
              <Plus size={16} aria-hidden="true" />ETF 만들기
            </Link>}
            {status === "unauthenticated" && pathname !== "/login" && <Link href="/login"
              className="service-button navigation-login hidden min-h-7 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 font-semibold md:inline-flex">
              <LogIn size={16} aria-hidden="true" />로그인
            </Link>}
            <StockSearchTrigger showDesktopLabel />
          </div>
        </div>
        {fixedPageIdentity && (
          <div className="navigation-analysis-identity overflow-hidden md:hidden" style={{ height: 56 - identityOffset }}>
            {mobileIdentity}
          </div>
        )}
        <div ref={pageHeader?.setTabsTarget} data-navigation-tabs />
      </header>}

      {!inGame && !fixedPageIdentity && !inEtfFeed && <div ref={identity} className="navigation-identity bg-surface-canvas dark:bg-surface-dark-canvas md:hidden">
        {mobileIdentity}
      </div>}

      {/* 게임 전용 모바일 헤더는 기존 구성을 유지한다. */}
      {inGame && <header data-navigation-header data-mobile-header data-page-active={pageHeader?.active || undefined} className={cn("navigation-mobile-header md:hidden fixed top-0 left-0 right-0 z-40 border-b",
        barStyle ? "" : "bg-surface-canvas/95 backdrop-blur-[12px] dark:bg-surface-dark-canvas/95 border-neutral-300/50 dark:border-neutral-700/60")}
        style={barStyle}>
        <div className="navigation-main flex min-h-12 items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Link href="/" aria-label="idiotquant 홈" className={cn(logoClass, "inline-flex")}>
              {logoText}
            </Link>
            <div ref={pageHeader?.setTitleTarget} className={cn("min-w-0 flex-1", !pageHeader?.active && "hidden")} />
            {!pageHeader?.active && gameScrolled && mobilePageTitle && (
              <span className="truncate text-base font-semibold text-neutral-900 dark:text-white">{mobilePageTitle}</span>
            )}
          </div>
          <div className="navigation-service-actions flex shrink-0 items-center gap-1">
            <StockSearchTrigger />
            {!pageHeader?.active && <QuickNavigation compact items={[...MAIN_NAV, ...utilityNav]} />}
            <ThemeChanger compact />
            <MiniSession session={session} status={status} />
            <PageShareTools key={pathname} />
          </div>
        </div>
        <div ref={pageHeader?.setActionsTarget} data-navigation-actions className={cn("navigation-mobile-actions px-4 pb-1.5", !pageHeader?.active && "hidden")} />
      </header>}

      {/* ══ MOBILE BOTTOM TAB BAR ════════════════════════════════════ */}
      <nav ref={bottomNav} aria-label="하단 메뉴" data-bottom-navigation data-hidden={bottomHidden && !moreSheet && !inEtfFeed || undefined}
        onFocusCapture={() => setBottomHidden(false)}
        className={cn(inGame ? "hidden" : "md:hidden navigation-bottom fixed bottom-0 left-0 right-0 z-40 flex items-center gap-1.5 px-3")}>
        {MAIN_NAV.map(item => (
          <TabItem key={item.href} href={item.href} label={item.label} icon={item.icon}
            isActive={active(pathname, item.href, item.exact)} />
        ))}
        <NavigationPopover label="서비스 메뉴" side="top" className="navigation-service-popover" onOpenChange={open => { setMoreSheet(open); setBottomHidden(false); }} trigger={
          <button type="button" data-current-section={moreActive || undefined} className={MOBILE_NAV_CONTROL}>
            <LayoutGrid size={20} aria-hidden="true" /><span className="text-xs font-semibold leading-none">더 보기</span>
          </button>
        }>{!inGame && serviceMenu(true)}</NavigationPopover>
      </nav>

      {/* ══ 일반 사용자 화면으로 보는 중 ══════════════════════════════
          켜 놓고 잊으면 "메뉴가 왜 없지" 가 되므로 어디서나 보이는 자리에 둔다.
          이 알약 자체가 끄는 버튼이다 — 내 계정까지 돌아가지 않아도 된다.
          /game 에는 안 띄운다: 관리자 전용 메뉴가 없어 볼 것이 없고, 그 화면은
          기기 한 대라 위에 뜬 버튼이 판을 가린다. */}
      {realAdmin && viewAsUser && !inGame && (
        <button
          type="button"
          onClick={() => setViewAsUser(false)}
          className="fixed z-50 bottom-[calc(var(--bottombar-h)+12px)] left-3 md:bottom-4 md:left-4 flex items-center gap-2 rounded-xl border border-brand-light-hover bg-brand-light px-3.5 py-2 text-[11px] font-bold text-brand-ink shadow-lg hover:bg-[#e5e3ff] dark:border-brand/40 dark:bg-brand-muted dark:text-brand-ink-hover"
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
