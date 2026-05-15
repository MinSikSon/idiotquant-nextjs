"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    Search, 
    Calculator, 
    Filter, 
    Menu as MenuIcon, 
    X, 
    ChevronRight, 
    DollarSign,
    BarChart3,
    Globe,
    Lock,
    Unlock,
    User
} from "lucide-react";
import { useSession } from "next-auth/react";
import ThemeChanger from "@/components/theme_changer";
import { cn } from "@/lib/utils";

export function NavbarWithSimpleLinks() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [visible, setVisible] = useState(true);
    const lastScrollY = useRef(0);

    const isActive = (path: string) => pathname === path;

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
                    "fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-in-out h-14 border-b",
                    "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-zinc-200 dark:border-zinc-800",
                    visible ? "translate-y-0" : "-translate-y-full",
                    "flex items-center px-4 md:px-8"
                )}
            >
                <div className="flex-1 flex items-center">
                    <Link href="/" className="no-underline group flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <span className="text-white text-[10px] font-black italic">IQ</span>
                        </div>
                        <span className="font-black tracking-tighter text-lg text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            IDIOT<span className="text-blue-600 dark:text-blue-400">QUANT</span>
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                    {/* 데스크탑 메뉴 */}
                    <div className="hidden md:flex items-center gap-1 mr-4">
                        <NavLink href="/search" active={isActive('/search')} icon={<Search size={15} />}>
                            적정 주가
                        </NavLink>
                        <NavLink href="/calculator" active={isActive('/calculator')} icon={<Calculator size={15} />}>
                            수익률 계산
                        </NavLink>
                        <NavLink href="/algorithm-trade" active={isActive('/algorithm-trade')} icon={<Filter size={15} />}>
                            종목 추천
                        </NavLink>
                        
                        {session?.user?.name === process.env.NEXT_PUBLIC_MASTER && (
                            <div className="flex items-center">
                                <Divider className="mx-2" />
                                <NavLink href="/balance-kr" active={isActive('/balance-kr')} icon={<DollarSign size={15} />}>
                                    KR
                                </NavLink>
                                <NavLink href="/balance-us" active={isActive('/balance-us')} icon={<DollarSign size={15} />}>
                                    US
                                </NavLink>
                            </div>
                        )}
                    </div>

                    <div className="hidden md:block border-l dark:border-zinc-800 pl-4">
                        <ThemeChanger />
                    </div>

                    {/* 모바일 메뉴 버튼 */}
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                        <MenuIcon size={22} />
                    </button>
                </div>
            </nav>

            {/* 모바일 드로어 오버레이 */}
            <div 
                className={cn(
                    "fixed inset-0 z-50 transition-all duration-300",
                    isDrawerOpen ? "visible" : "invisible"
                )}
            >
                {/* 배경 딤드 */}
                <div 
                    className={cn(
                        "absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300",
                        isDrawerOpen ? "opacity-100" : "opacity-0"
                    )} 
                    onClick={closeDrawer} 
                />
                
                {/* 드로어 본체 */}
                <aside 
                    className={cn(
                        "absolute right-0 top-0 h-full w-[85%] max-w-[320px] bg-white dark:bg-zinc-950 shadow-2xl transition-transform duration-300 ease-out flex flex-col border-l border-zinc-200 dark:border-zinc-800",
                        isDrawerOpen ? "translate-x-0" : "translate-x-full"
                    )}
                >
                    <div className="flex items-center justify-between p-5 border-b dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="text-blue-600" size={18} />
                            <span className="font-black text-sm tracking-tight">MENU NAVIGATION</span>
                        </div>
                        <button onClick={closeDrawer} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
                        {/* 서비스 섹션 */}
                        <section>
                            <div className="px-1 mb-3">
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Strategy</span>
                            </div>
                            <div className="space-y-1.5">
                                <MobileLink href="/search" active={isActive('/search')} onClick={closeDrawer} icon={<Search size={18} />}>
                                    적정 주가 분석
                                </MobileLink>
                                <MobileLink href="/calculator" active={isActive('/calculator')} onClick={closeDrawer} icon={<Calculator size={18} />}>
                                    수익률 계산기
                                </MobileLink>
                                <MobileLink href="/algorithm-trade" active={isActive('/algorithm-trade')} onClick={closeDrawer} icon={<Filter size={18} />}>
                                    퀀트 종목 추천
                                </MobileLink>
                            </div>
                        </section>

                        {/* 관리자 섹션 */}
                        {session?.user?.name === process.env.NEXT_PUBLIC_MASTER && (
                            <section>
                                <div className="px-1 mb-3">
                                    <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Portfolio</span>
                                </div>
                                <div className="space-y-1.5">
                                    <MobileLink href="/balance-kr" active={isActive('/balance-kr')} onClick={closeDrawer} icon={<BarChart3 size={18} />}>
                                        Korea Balance
                                    </MobileLink>
                                    <MobileLink href="/balance-us" active={isActive('/balance-us')} onClick={closeDrawer} icon={<Globe size={18} />}>
                                        US Balance
                                    </MobileLink>
                                </div>
                            </section>
                        )}

                        {/* 계정 섹션 */}
                        <section>
                            <div className="px-1 mb-3">
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Account</span>
                            </div>
                            <MobileLink 
                                href="/login" 
                                active={isActive('/login')} 
                                onClick={closeDrawer} 
                                icon={status === "authenticated" ? <Unlock size={18} className="text-emerald-500" /> : <Lock size={18} />}
                                isHighlight={status !== "authenticated"}
                            >
                                {status === "authenticated" ? (
                                    <div className="flex flex-col items-start">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-black">{session?.user?.name}</span>
                                        <span className="text-[9px] opacity-60">Connected Account</span>
                                    </div>
                                ) : "Sign in with Kakao"}
                            </MobileLink>
                        </section>
                    </div>

                    {/* 하단 테마 설정 */}
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-900 border-t dark:border-zinc-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white dark:bg-zinc-800 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-700">
                                <User size={14} className="text-zinc-500" />
                            </div>
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Display Mode</span>
                        </div>
                        <ThemeChanger />
                    </div>
                </aside>
            </div>

            {/* 네비게이션 높이만큼 공간 확보 */}
            <div className="h-14" />
        </>
    );
}

// --- 보조 컴포넌트들 (Dark Mode Optimized) ---

function NavLink({ href, active, icon, children }: any) {
    return (
        <Link 
            href={href}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
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
                    : "bg-white dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
            )}
        >
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    active ? "bg-white/20 dark:bg-black/10" : "bg-zinc-100 dark:bg-zinc-800"
                )}>
                    {icon}
                </div>
                <span className="font-bold text-sm tracking-tight">{children}</span>
            </div>
            {!isHighlight && (
                <ChevronRight size={14} className={cn("transition-opacity", active ? "opacity-100" : "opacity-30")} />
            )}
        </Link>
    );
}

function Divider({ className }: { className?: string }) {
    return <div className={cn("w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800", className)} />;
}

export default NavbarWithSimpleLinks;