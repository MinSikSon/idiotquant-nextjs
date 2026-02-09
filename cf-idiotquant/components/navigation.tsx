"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Navbar,
    Button,
    Alignment,
    Menu,
    MenuItem,
    MenuDivider,
    Drawer,
    Position,
    Classes,
    Icon,
    Text,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import { useAppSelector } from "@/lib/hooks";
import { selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import ThemeChanger from "@/components/theme_changer";
import { useSession, signIn, signOut } from "next-auth/react";
import { redirect } from "next/navigation";

const DEBUG = false;

export function NavbarWithSimpleLinks() {
    const { data: session, status } = useSession();
    if (DEBUG) console.log(`[NavbarWithSimpleLinks]`, `session:`, session);
    if (DEBUG) console.log(`[NavbarWithSimpleLinks]`, `status:`, status);
    const pathname = usePathname();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [visible, setVisible] = useState(true);
    const lastScrollY = useRef(0);

    // 스크롤 감지 로직 (Navbar 숨김/노출)
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                setVisible(false); // 스크롤 내릴 때 숨김
            } else {
                setVisible(true); // 스크롤 올릴 때 노출
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // 메뉴 닫기 핸들러
    const closeDrawer = () => setIsDrawerOpen(false);

    return (
        <>
            <div
                className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${visible ? "translate-y-0" : "-translate-y-full"
                    }`}
            >
                <Navbar className="bp5-dark bg-white dark:!bg-zinc-950 border-b dark:border-zinc-800 shadow-sm">
                    <Navbar.Group align={Alignment.LEFT}>
                        <Link href="/" className="no-underline">
                            <Navbar.Heading className="font-black tracking-tighter !text-blue-600 dark:!text-blue-400">
                                IDIOTQUANT
                            </Navbar.Heading>
                        </Link>
                    </Navbar.Group>

                    <Navbar.Group align={Alignment.RIGHT}>
                        {/* 데스크탑 메뉴 (MD 이상 노출) */}
                        <div className="hidden md:flex gap-1 mr-4">
                            <Link href="/search"><Button minimal icon={IconNames.SEARCH} text="적정 주가 분석" /></Link>
                            <Link href="/calculator"><Button minimal icon={IconNames.CALCULATOR} text="수익률 계산기" /></Link>
                            {session?.user?.name === process.env.NEXT_PUBLIC_MASTER &&
                                <>
                                    <Link href="/balance-kr"><Button minimal icon={IconNames.DOLLAR} text="kr" /></Link>
                                    <Link href="/balance-us"><Button minimal icon={IconNames.DOLLAR} text="us" /></Link>
                                </>
                            }
                        </div>

                        <Divider className="hidden md:block mx-2" />

                        {/* 모바일 햄버거 버튼 */}
                        <Button
                            minimal
                            icon={IconNames.MENU}
                            onClick={() => setIsDrawerOpen(true)}
                            className="md:hidden"
                        />

                        {/* 테마 체인저 (데스크탑 상시 노출 가능) */}
                        <div className="hidden md:block">
                            <ThemeChanger />
                        </div>
                    </Navbar.Group>
                </Navbar>
            </div>

            {/* 모바일 전용 Drawer (사이드 메뉴) */}
            <Drawer
                isOpen={isDrawerOpen}
                onClose={closeDrawer}
                title="Menu"
                icon={IconNames.MENU_OPEN}
                position={Position.RIGHT}
                size="75%"
                className="!z-50 bp5-dark dark:!bg-zinc-900"
            >
                <div className={Classes.DRAWER_BODY}>
                    <Menu className="bg-transparent border-none">
                        <Text className="px-3 py-2 opacity-50 font-bold text-[10px] uppercase">Main Services</Text>
                        <Link href="/search" onClick={closeDrawer}>
                            <MenuItem
                                tagName="div"
                                icon={IconNames.SEARCH}
                                text="적정 주가 분석"
                                labelElement={<Icon icon={IconNames.CHEVRON_RIGHT} />}
                            />
                        </Link>
                        <Link href="/calculator" onClick={closeDrawer}>
                            <MenuItem
                                tagName="div"
                                icon={IconNames.CALCULATOR}
                                text="수익률 계산기"
                                labelElement={<Icon icon={IconNames.CHEVRON_RIGHT} />}
                            />
                        </Link>

                        {session?.user?.name === process.env.NEXT_PUBLIC_MASTER && <>
                            <MenuDivider title="Trading Account" />
                            <Link href="/balance-kr" onClick={closeDrawer}>
                                <MenuItem
                                    tagName="div"
                                    icon={IconNames.CHART}
                                    text="Korea Market"
                                />
                            </Link>
                            <Link href="/balance-us" onClick={closeDrawer}>
                                <MenuItem
                                    tagName="div"
                                    icon={IconNames.GLOBE}
                                    text="US Market"
                                />
                            </Link>
                        </>}
                        <MenuDivider />
                        <Link href="/login" onClick={closeDrawer}>
                            <MenuItem
                                tagName="div"
                                icon={"authenticated" === status ? IconNames.UNLOCK : IconNames.LOCK}
                                intent={"authenticated" === status ? "none" : "primary"}
                                text={"authenticated" === status ? `${session?.user?.name} (Logout)` : "Kakao Login"}
                            />
                        </Link>

                        <div className="mt-8 p-4 bg-zinc-100 dark:!bg-zinc-800 rounded-xl mx-2 flex justify-between items-center">
                            <Text className="text-xs font-bold">Theme Mode</Text>
                            <ThemeChanger />
                        </div>
                    </Menu>
                </div>
            </Drawer>

            {/* Navbar 높이만큼의 여백 확보 */}
            <div className="h-[50px]" />
        </>
    );
}

// 헬퍼 컴포넌트: 구분선
function Divider({ className }: { className?: string }) {
    return <div className={`w-[1px] h-6 bg-zinc-200 dark:!bg-zinc-800 ${className}`} />;
}

export default NavbarWithSimpleLinks;