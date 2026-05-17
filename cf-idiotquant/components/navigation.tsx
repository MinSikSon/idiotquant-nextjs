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
    UserIcon
} from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import ThemeChanger from "@/components/theme_changer";
import { cn } from "@/lib/utils";
import { EyeIcon } from "lucide-react";

export function NavbarWithSimpleLinks() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [visible, setVisible] = useState(true);
    const lastScrollY = useRef(0);

    const isActive = (path: string) => pathname === path;

    // 1. Cloudflare & Next.js SSR 환경에서 안전하게 localStorage 및 DOM 동기화
    useEffect(() => {
        if (typeof window === "undefined") return;

        // 초기 테마 상태 적용 함수
        const syncInitialTheme = () => {
            const savedTheme = localStorage.getItem("theme");
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            
            if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        };

        // 최초 마운트 시 실행
        syncInitialTheme();

        // 2. <ThemeChanger /> 등 외부 컴포넌트에 의해 클래스가 바뀔 때 로컬스토리지 자동 동기화 관찰 (MutationObserver)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "class") {
                    const isDark = document.documentElement.classList.contains("dark");
                    localStorage.setItem("theme", isDark ? "dark" : "light");
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    // 스크롤 감지 헤더 노출 제어
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                setVisible(false);
            } else {
                setVisible(true);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // 드로어 활성화 시 바디 스크롤 차단
    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
    }, [isDrawerOpen]);

    const closeDrawer = () => setIsDrawerOpen(false);

    return (
        <>
            {/* 상단 네비게이션 바 */}
            <nav
                className={cn(
                    "fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-in-out h-14 border-b transform-gpu",
                    "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-zinc-200 dark:border-zinc-800",
                    visible ? "translate-y-0" : "-translate-y-full",
                    "flex items-center px-4 md:px-8"
                )}
            >
                <div className="flex-1 flex items-center">
                    <Link href="/" className="no-underline group flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20">
                            <span className="text-white text-[10px] font-black italic">IQ</span>
                        </div>
                        <span className="font-black tracking-tighter text-md text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            IDIOT<span className="text-blue-600 dark:text-blue-400">QUANT</span>
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                    {/* 데스크탑 메뉴 구역 */}
                    <div className="hidden md:flex items-center gap-1 mr-4">
                        <NavLink href="/search" active={isActive('/search')} icon={<MagnifyingGlassIcon className="w-4 h-4" />}>
                            적정 주가
                        </NavLink>
                        <NavLink href="/calculator" active={isActive('/calculator')} icon={<CalculatorIcon className="w-4 h-4" />}>
                            수익률 계산
                        </NavLink>
                        <NavLink href="/algorithm-trade" active={isActive('/algorithm-trade')} icon={<FunnelIcon className="w-4 h-4" />}>
                            종목 추천
                        </NavLink>
                        
                        {session?.user?.name === process.env.NEXT_PUBLIC_MASTER && (
                            <div className="flex items-center">
                                <Divider className="mx-2" />
                                <NavLink href="/balance-kr" active={isActive('/balance-kr')} icon={<EyeIcon className="w-4 h-4" />}>
                                    KR
                                </NavLink>
                                <NavLink href="/balance-us" active={isActive('/balance-us')} icon={<CurrencyDollarIcon className="w-4 h-4" />}>
                                    US
                                </NavLink>
                            </div>
                        )}
                    </div>

                    <div className="hidden md:block border-l border-zinc-200 dark:border-zinc-800 pl-4">
                        <ThemeChanger />
                    </div>

                    {/* 모바일 햄버거 단추 */}
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                        <Bars3Icon className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            {/* 모바일 토글 드로어 사이드 패널 */}
            <div 
                className={cn(
                    "fixed inset-0 z-50 transition-all duration-300",
                    isDrawerOpen ? "visible" : "invisible"
                )}
            >
                <div 
                    className={cn(
                        "absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300",
                        isDrawerOpen ? "opacity-100" : "opacity-0"
                    )} 
                    onClick={closeDrawer} 
                />
                
                <aside 
                    className={cn(
                        "absolute right-0 top-0 h-full w-[85%] max-w-[320px] bg-white dark:bg-zinc-950 shadow-2xl transition-transform duration-300 ease-out flex flex-col border-l border-zinc-200 dark:border-zinc-800",
                        isDrawerOpen ? "translate-x-0" : "translate-x-full"
                    )}
                >
                    <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2">
                            <ChartBarIcon className="w-4 h-4 text-blue-600" />
                            <span className="font-black text-xs tracking-tight text-zinc-700 dark:text-zinc-300">MENU NAVIGATION</span>
                        </div>
                        <button onClick={closeDrawer} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">
                        <section>
                            <div className="px-1 mb-3">
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Strategy</span>
                            </div>
                            <div className="space-y-1.5">
                                <MobileLink href="/search" active={isActive('/search')} onClick={closeDrawer} icon={<MagnifyingGlassIcon className="w-4 h-4" />}>
                                    적정 주가 분석
                                </MobileLink>
                                <MobileLink href="/calculator" active={isActive('/calculator')} onClick={closeDrawer} icon={<CalculatorIcon className="w-4 h-4" />}>
                                    수익률 계산기
                                </MobileLink>
                                <MobileLink href="/algorithm-trade" active={isActive('/algorithm-trade')} onClick={closeDrawer} icon={<FunnelIcon className="w-4 h-4" />}>
                                    퀀트 종목 추천
                                </MobileLink>
                            </div>
                        </section>

                        {session?.user?.name === process.env.NEXT_PUBLIC_MASTER && (
                            <section>
                                <div className="px-1 mb-3">
                                    <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Portfolio</span>
                                </div>
                                <div className="space-y-1.5">
                                    <MobileLink href="/balance-kr" active={isActive('/balance-kr')} onClick={closeDrawer} icon={<ChartBarIcon className="w-4 h-4" />}>
                                        Korea Balance
                                    </MobileLink>
                                    <MobileLink href="/balance-us" active={isActive('/balance-us')} onClick={closeDrawer} icon={<GlobeAltIcon className="w-4 h-4" />}>
                                        US Balance
                                    </MobileLink>
                                </div>
                            </section>
                        )}

                        <section>
                            <div className="px-1 mb-3">
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Account</span>
                            </div>
                            <MobileLink 
                                href="/login" 
                                active={isActive('/login')} 
                                onClick={closeDrawer} 
                                icon={status === "authenticated" ? <LockOpenIcon className="w-4 h-4 text-emerald-500" /> : <LockClosedIcon className="w-4 h-4 text-emerald-500" />}
                                isHighlight={status !== "authenticated"}
                            >
                                {status === "authenticated" ? (
                                    <div className="flex flex-col items-start">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs">{session?.user?.name}</span>
                                        <span className="text-[9px] opacity-60">Connected Account</span>
                                    </div>
                                ) : "Sign in with Kakao"}
                            </MobileLink>
                        </section>
                    </div>

                    {/* 하단 모바일 Display 모드 스위치 연동 단추 */}
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white dark:bg-zinc-800 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-700">
                                <UserIcon className="w-3.5 h-3.5 text-zinc-500" />
                            </div>
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Display Mode</span>
                        </div>
                        <ThemeChanger />
                    </div>
                </aside>
            </div>

            <div className="h-14" />
        </>
    );
}

function NavLink({ href, active, icon, children }: any) {
    return (
        <Link 
            href={href}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                active 
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
            )}
        >
            {icon}
            {children}
        </Link>
    );
}

function MobileLink({ href, active, onClick, icon, children, isHighlight }: any) {
    return (
        <Link 
            href={href} 
            onClick={onClick}
            className={cn(
                "flex items-center justify-between w-full p-4 rounded-2xl transition-all border",
                active 
                ? "bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900 shadow-xl" 
                : isHighlight 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-white dark:bg-zinc-950/40 border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
            )}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                    active ? "bg-white/20 dark:bg-black/10" : "bg-zinc-100 dark:bg-zinc-800"
                )}>
                    {icon}
                </div>
                <div className="font-bold text-sm tracking-tight text-left min-w-0 flex-1">{children}</div>
            </div>
            {!isHighlight && (
                <ChevronRightIcon className={cn("w-3.5 h-3.5 transition-opacity ml-2 shrink-0", active ? "opacity-100" : "opacity-30")} />
            )}
        </Link>
    );
}

function Divider({ className }: { className?: string }) {
    return <div className={cn("w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800", className)} />;
}

export default NavbarWithSimpleLinks;