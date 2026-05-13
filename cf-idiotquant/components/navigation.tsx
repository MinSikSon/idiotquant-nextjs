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
    Unlock
} from "lucide-react";
import { useSession } from "next-auth/react";
import ThemeChanger from "@/components/theme_changer";

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

    // 드로어 열릴 때 스크롤 방지
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
                className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out h-14 border-b bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md dark:border-zinc-800 shadow-sm flex items-center px-4 md:px-8 ${
                    visible ? "translate-y-0" : "-translate-y-full"
                }`}
            >
                <div className="flex-1 flex items-center">
                    <Link href="/" className="no-underline group">
                        <span className="font-black tracking-tighter text-xl text-blue-600 dark:text-blue-400 group-hover:opacity-80 transition-opacity">
                            IDIOTQUANT
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                    {/* 데스크탑 메뉴 */}
                    <div className="hidden md:flex items-center gap-1 mr-4">
                        <NavLink href="/search" active={isActive('/search')} icon={<Search size={16} />}>
                            적정 주가 분석
                        </NavLink>
                        <NavLink href="/calculator" active={isActive('/calculator')} icon={<Calculator size={16} />}>
                            수익률 계산기
                        </NavLink>
                        <NavLink href="/algorithm-trade" active={isActive('/algorithm-trade')} icon={<Filter size={16} />}>
                            종목 추천
                        </NavLink>
                        
                        {session?.user?.name === process.env.NEXT_PUBLIC_MASTER && (
                            <>
                                <Divider className="mx-2" />
                                <NavLink href="/balance-kr" active={isActive('/balance-kr')} icon={<DollarSign size={16} />}>
                                    KR
                                </NavLink>
                                <NavLink href="/balance-us" active={isActive('/balance-us')} icon={<DollarSign size={16} />}>
                                    US
                                </NavLink>
                            </>
                        )}
                    </div>

                    <div className="hidden md:block">
                        <ThemeChanger />
                    </div>

                    {/* 모바일 메뉴 버튼 */}
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="md:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <MenuIcon size={24} />
                    </button>
                </div>
            </nav>

            {/* 모바일 드로어 오버레이 */}
            <div 
                className={`fixed inset-0 z-50 transition-opacity duration-300 ${
                    isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
            >
                {/* 배경 딤드 */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />
                
                {/* 드로어 본체 */}
                <aside 
                    className={`absolute right-0 top-0 h-full w-[80%] max-w-sm bg-white dark:bg-zinc-900 shadow-2xl transition-transform duration-300 ease-out transform ${
                        isDrawerOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                >
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between p-4 border-b dark:border-zinc-800">
                            <span className="font-bold uppercase text-xs tracking-widest opacity-50">Menu</span>
                            <button onClick={closeDrawer} className="p-2">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-4">
                            <div className="px-4 mb-2">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Main Services</span>
                            </div>
                            
                            <div className="space-y-1 px-2">
                                <MobileLink href="/search" active={isActive('/search')} onClick={closeDrawer} icon={<Search size={18} />}>
                                    적정 주가 분석
                                </MobileLink>
                                <MobileLink href="/calculator" active={isActive('/calculator')} onClick={closeDrawer} icon={<Calculator size={18} />}>
                                    수익률 계산기
                                </MobileLink>
                                <MobileLink href="/algorithm-trade" active={isActive('/algorithm-trade')} onClick={closeDrawer} icon={<Filter size={18} />}>
                                    종목 추천
                                </MobileLink>
                            </div>

                            {session?.user?.name === process.env.NEXT_PUBLIC_MASTER && (
                                <div className="mt-6">
                                    <div className="px-4 mb-2 border-t dark:border-zinc-800 pt-6">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Trading Account</span>
                                    </div>
                                    <div className="space-y-1 px-2">
                                        <MobileLink href="/balance-kr" active={isActive('/balance-kr')} onClick={closeDrawer} icon={<BarChart3 size={18} />}>
                                            Korea Market
                                        </MobileLink>
                                        <MobileLink href="/balance-us" active={isActive('/balance-us')} onClick={closeDrawer} icon={<Globe size={18} />}>
                                            US Market
                                        </MobileLink>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 border-t dark:border-zinc-800 pt-6 px-2">
                                <MobileLink 
                                    href="/login" 
                                    active={isActive('/login')} 
                                    onClick={closeDrawer} 
                                    icon={status === "authenticated" ? <Unlock size={18} /> : <Lock size={18} />}
                                    isHighlight={status !== "authenticated"}
                                >
                                    {status === "authenticated" ? `${session?.user?.name} (Logout)` : "Kakao Login"}
                                </MobileLink>
                            </div>
                        </div>

                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t dark:border-zinc-800 flex justify-between items-center">
                            <span className="text-xs font-bold">Theme Mode</span>
                            <ThemeChanger />
                        </div>
                    </div>
                </aside>
            </div>

            {/* 네비게이션 높이만큼 공간 확보 */}
            <div className="h-14" />
        </>
    );
}

// --- 보조 컴포넌트들 ---

function NavLink({ href, active, icon, children }: any) {
    return (
        <Link 
            href={href}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                active 
                ? "bg-blue-600/10 text-blue-600 dark:text-blue-400" 
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
            }`}
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
            className={`flex items-center justify-between w-full p-3 rounded-xl transition-colors ${
                active 
                ? "bg-blue-600 text-white" 
                : isHighlight 
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
        >
            <div className="flex items-center gap-3">
                {icon}
                <span className="font-bold text-sm">{children}</span>
            </div>
            {active ? (
                <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full">ACTIVE</span>
            ) : (
                <ChevronRight size={14} className="opacity-30" />
            )}
        </Link>
    );
}

function Divider({ className }: { className?: string }) {
    return <div className={`w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

export default NavbarWithSimpleLinks;