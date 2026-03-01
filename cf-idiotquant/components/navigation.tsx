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
    Intent,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import ThemeChanger from "@/components/theme_changer";
import { useSession } from "next-auth/react";

const DEBUG = false;

export function NavbarWithSimpleLinks() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [visible, setVisible] = useState(true);
    const lastScrollY = useRef(0);

    // 현재 경로가 메뉴의 경로와 일치하는지 확인하는 함수
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
                        {/* 데스크탑 메뉴: active 속성 및 스타일 적용 */}
                        <div className="hidden md:flex gap-1 mr-4">
                            <Link href="/search">
                                <Button
                                    className={`dark:!text-white ${isActive('/search') ? '!bg-blue-600/10 !text-blue-600' : ''}`}
                                    minimal
                                    active={isActive('/search')}
                                    icon={IconNames.SEARCH}
                                    text="적정 주가 분석"
                                />
                            </Link>
                            <Link href="/calculator">
                                <Button
                                    className={`dark:!text-white ${isActive('/calculator') ? '!bg-blue-600/10 !text-blue-600' : ''}`}
                                    minimal
                                    active={isActive('/calculator')}
                                    icon={IconNames.CALCULATOR}
                                    text="수익률 계산기"
                                />
                            </Link>
                            <Link href="/algorithm-trade">
                                <Button
                                    className={`dark:!text-white ${isActive('/algorithm-trade') ? '!bg-blue-600/10 !text-blue-600' : ''}`}
                                    minimal
                                    active={isActive('/algorithm-trade')}
                                    icon={IconNames.FILTER_LIST}
                                    text="종목 추천"
                                />
                            </Link>
                            {session?.user?.name === process.env.NEXT_PUBLIC_MASTER &&
                                <>
                                    <Link href="/balance-kr">
                                        <Button className={`dark:!text-white ${isActive('/balance-kr') ? '!bg-blue-600/10' : ''}`} minimal active={isActive('/balance-kr')} icon={IconNames.DOLLAR} text="kr" />
                                    </Link>
                                    <Link href="/balance-us">
                                        <Button className={`dark:!text-white ${isActive('/balance-us') ? '!bg-blue-600/10' : ''}`} minimal active={isActive('/balance-us')} icon={IconNames.DOLLAR} text="us" />
                                    </Link>
                                </>
                            }
                        </div>

                        <Divider className="hidden md:block mx-2" />

                        <Button
                            minimal
                            icon={IconNames.MENU}
                            onClick={() => setIsDrawerOpen(true)}
                            className="md:hidden"
                        />

                        <div className="hidden md:block">
                            <ThemeChanger />
                        </div>
                    </Navbar.Group>
                </Navbar>
            </div>

            <Drawer
                isOpen={isDrawerOpen}
                onClose={closeDrawer}
                title="Menu"
                icon={IconNames.MENU_OPEN}
                position={Position.RIGHT}
                size="75%"
                className="!z-50 bp5-dark dark:!bg-zinc-900 dark:!text-white"
            >
                <div className={Classes.DRAWER_BODY}>
                    <Menu className="!bg-transparent border-none">
                        <Text className="px-3 py-2 opacity-50 font-bold text-[10px] uppercase">Main Services</Text>

                        {/* 모바일 메뉴: selected 속성 적용 */}
                        <Link href="/search" onClick={closeDrawer}>
                            <MenuItem
                                selected={isActive('/search')}
                                tagName="div"
                                icon={IconNames.SEARCH}
                                text="적정 주가 분석"
                                labelElement={isActive('/search') ? <Tag intent={Intent.PRIMARY} minimal>Active</Tag> : <Icon icon={IconNames.CHEVRON_RIGHT} />}
                            />
                        </Link>
                        <Link href="/calculator" onClick={closeDrawer}>
                            <MenuItem
                                selected={isActive('/calculator')}
                                tagName="div"
                                icon={IconNames.CALCULATOR}
                                text="수익률 계산기"
                                labelElement={isActive('/calculator') ? <Tag intent={Intent.PRIMARY} minimal>Active</Tag> : <Icon icon={IconNames.CHEVRON_RIGHT} />}
                            />
                        </Link>
                        <Link href="/algorithm-trade" onClick={closeDrawer}>
                            <MenuItem
                                selected={isActive('/algorithm-trade')}
                                tagName="div"
                                icon={IconNames.FILTER_LIST}
                                text="종목 추천"
                                labelElement={isActive('/algorithm-trade') ? <Tag intent={Intent.PRIMARY} minimal>Active</Tag> : <Icon icon={IconNames.CHEVRON_RIGHT} />}
                            />
                        </Link>

                        {session?.user?.name === process.env.NEXT_PUBLIC_MASTER && <>
                            <MenuDivider title="Trading Account" />
                            <Link href="/balance-kr" onClick={closeDrawer}>
                                <MenuItem
                                    selected={isActive('/balance-kr')}
                                    tagName="div"
                                    icon={IconNames.CHART}
                                    text="Korea Market"
                                />
                            </Link>
                            <Link href="/balance-us" onClick={closeDrawer}>
                                <MenuItem
                                    selected={isActive('/balance-us')}
                                    tagName="div"
                                    icon={IconNames.GLOBE}
                                    text="US Market"
                                />
                            </Link>
                        </>}

                        <MenuDivider />

                        <Link href="/login" onClick={closeDrawer}>
                            <MenuItem
                                selected={isActive('/login')}
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

            <div className="h-[50px]" />
        </>
    );
}

function Divider({ className }: { className?: string }) {
    return <div className={`w-[1px] h-6 bg-zinc-200 dark:!bg-zinc-800 ${className}`} />;
}

export default NavbarWithSimpleLinks;

// 간단한 Tag 컴포넌트 추가 (Blueprintjs Tag를 써도 됩니다)
function Tag({ children, intent, minimal }: { children: React.ReactNode, intent?: Intent, minimal?: boolean }) {
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${intent === Intent.PRIMARY ? 'bg-blue-500/20 text-blue-500' : ''}`}>{children}</span>;
}