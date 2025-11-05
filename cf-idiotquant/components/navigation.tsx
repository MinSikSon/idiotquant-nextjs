"use client"

import { useState, useEffect, useRef } from "react";
import { CalculatorIcon, LockClosedIcon, LockOpenIcon, MagnifyingGlassCircleIcon, WalletIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { useAppSelector } from "@/lib/hooks";

import { usePathname } from "next/navigation";
// import { DesignButton } from "./designButton";
import ThemeChanger from "@/components/theme_changer";
import RotatingText from "@/src/TextAnimations/RotatingText/RotatingText";
import { selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import { Box, Button, DropdownMenu, Flex, Text } from "@radix-ui/themes";
interface NavItemPropsType {
    url: string;
    label: string;
}

export function NavbarWithSimpleLinks() {
    // console.log(`[NavbarWithSimpleLinks]`);
    const pathname = usePathname();
    // console.log(`pathname`, pathname);
    const splitPathName = pathname.split("/");
    // console.log(`splitPathName`, splitPathName);

    const [open, setOpen] = useState(false);
    const [toggleTheme, setToggleTheme] = useState(false);
    const handleOpen = () => setOpen((cur) => !cur);

    const [selectPath, setSelectPath] = useState<string>(splitPathName[1]);

    const kakaoTotal = useAppSelector(selectKakaoTotal);

    const [visible, setVisible] = useState(true);
    // const [lastScrollY, setLastScrollY] = useState(0);
    const lastScrollY = useRef(0);

    useEffect(() => {
        window.addEventListener(
            "resize",
            () => window.innerWidth >= 960 && setOpen(false)
        );
    }, []);

    useEffect(() => {
        setSelectPath(splitPathName[1]);
    }, [open]);
    useEffect(() => {
        setSelectPath(splitPathName[1]);
    }, [splitPathName]);


    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > lastScrollY.current && currentScrollY > 30) {
                // 스크롤 내릴 때
                setVisible(false);
            } else {
                // 스크롤 올릴 때
                setVisible(true);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    function NavItem({ url, label }: NavItemPropsType) {
        return (
            <Link href={url} onClick={() => {
                setOpen(false)
                setSelectPath(url.split("/")[1]);
            }}>
                <div className={`border sm:border-none md:border-none lg:border-none px-2 py-1.5 rounded-2xl dark:text-white font-mono text-[0.8rem] hover:bg-gray-100 hover:dark:bg-gray-700 ${selectPath == url.split("/")[1] ? "bg-slate-100 dark:bg-gray-500" : ""} `}>
                    {label}
                </div>
            </Link>
        );
    }
    function NavItemFlexCol({ url, label }: NavItemPropsType) {
        return (
            <Box width="100%">
                <Link href={url} onClick={() => {
                    setOpen(false)
                    setSelectPath(url.split("/")[1]);
                }}>
                    {/* <div className={`px-2 py-1.5 rounded dark:text-white font-mono text-[0.8rem] hover:bg-gray-100 hover:dark:bg-gray-700 ${selectPath == url.split("/")[1] ? "bg-slate-100 dark:bg-gray-500" : ""} `}> */}
                    {label}
                </Link>
            </Box>
        );
    }

    const navListDesign = "font-mono flex gap-2 justify-items-center";
    // const navListUrlToLabel: any = {
    //     "": <div className={navListDesign}><HomeIcon className="h-4 w-4" strokeWidth={2} /><div>Home</div></div>,
    //     "calculator": <div className={navListDesign}><CalculatorIcon className="h-4 w-4" strokeWidth={2} /><div>수익계산기</div></div>,
    //     "login": <div className={navListDesign}>{!!!kakaoTotal?.id ? <LockClosedIcon className="h-4 w-4" strokeWidth={2} /> : <LockOpenIcon className="h-4 w-4" strokeWidth={2} />}<div>로그인</div></div>,
    //     "search": <div className={navListDesign}>{!!!kakaoTotal?.id ? <LockClosedIcon className="h-4 w-4" strokeWidth={2} /> : <LockOpenIcon className="h-4 w-4" strokeWidth={2} />}<MagnifyingGlassCircleIcon className="h-4 w-4" strokeWidth={2} /><div>종목검색</div></div>,
    //     "search-nasdaq": <div className={navListDesign}>{!!!kakaoTotal?.id ? <LockClosedIcon className="h-4 w-4" strokeWidth={2} /> : <LockOpenIcon className="h-4 w-4" strokeWidth={2} />}<MagnifyingGlassCircleIcon className="h-4 w-4" strokeWidth={2} /><div>종목검색(nasdaq)</div></div>,
    //     "balance-kr": <div className={navListDesign}>{!!!kakaoTotal?.id ? <LockClosedIcon className="h-4 w-4" strokeWidth={2} /> : <LockOpenIcon className="h-4 w-4" strokeWidth={2} />}<WalletIcon className="h-4 w-4" strokeWidth={2} /><div>알고투자-계좌조회(국내)</div></div>,
    //     "balance-us": <div className={navListDesign}>{!!!kakaoTotal?.id ? <LockClosedIcon className="h-4 w-4" strokeWidth={2} /> : <LockOpenIcon className="h-4 w-4" strokeWidth={2} />}<WalletIcon className="h-4 w-4" strokeWidth={2} /><div>알고투자-계좌조회(해외)</div></div>,
    //     // "chat": <div className={navListDesign}><SparklesIcon className="h-4 w-4" strokeWidth={2} /><div>LLM</div></div>,
    // }
    const navListUrlToLabel: any = {
        // "": <div className={navListDesign}><HomeIcon className="h-4 w-4" strokeWidth={2} /><div>home</div></div>,
        "search": <div className={navListDesign}><MagnifyingGlassCircleIcon className="h-4 w-4" strokeWidth={2} /><div>stock</div></div>,
        // "search-kr": <div className={navListDesign}><MagnifyingGlassCircleIcon className="h-4 w-4" strokeWidth={2} /><div>stock search (kospi/kosdaq/konex)</div></div>,
        // "search-nasdaq": <div className={navListDesign}><MagnifyingGlassCircleIcon className="h-4 w-4" strokeWidth={2} /><div>stock search (nasdaq)</div></div>,
        "calculator": <div className={navListDesign}><CalculatorIcon className="h-4 w-4" strokeWidth={2} /><div>profit</div></div>,
        "balance": <div className={navListDesign}><WalletIcon className="h-4 w-4" strokeWidth={2} /><div>account</div> {!!!kakaoTotal?.id ? <LockClosedIcon className="h-4 w-4" strokeWidth={2} /> : <LockOpenIcon className="h-4 w-4" strokeWidth={2} />}</div>,
        // "balance-kr": <div className={navListDesign}>{!!!kakaoTotal?.id ? <LockClosedIcon className="h-4 w-4" strokeWidth={2} /> : <LockOpenIcon className="h-4 w-4" strokeWidth={2} />}<WalletIcon className="h-4 w-4" strokeWidth={2} /><div>account inquiry (Korea)</div></div>,
        // "balance-us": <div className={navListDesign}>{!!!kakaoTotal?.id ? <LockClosedIcon className="h-4 w-4" strokeWidth={2} /> : <LockOpenIcon className="h-4 w-4" strokeWidth={2} />}<WalletIcon className="h-4 w-4" strokeWidth={2} /><div>account inquiry (US)</div></div>,
    }
    const navListUrlToLabelHanburgerButton: any = {
        "login": <Box width="100%" className={navListDesign}>
            {!!!kakaoTotal?.id ?
                <>
                    <Box width="100%">
                        <Flex gap="1" align="center">
                            <Text>kakao login</Text>
                            <LockClosedIcon className="h-4 w-4" strokeWidth={2} />
                        </Flex>
                    </Box>
                </>
                : <>
                    <Box width="100%">
                        <Flex gap="1">
                            <Text>{kakaoTotal?.kakao_account?.profile?.nickname}님 반갑습니다.</Text>
                            <LockOpenIcon className="h-4 w-4" strokeWidth={2} />
                        </Flex>
                    </Box>
                </>}
        </Box>,
    }


    const urlToLabel: any = {
        ...navListUrlToLabel,
        // "backtest": `백테스트 ${!!!kakaoTotal?.id ? "🔒" : ""}`,
        "strategy": "투자 전략",
        "strategy-register": "투자 전략 등록",
    }

    function NavList() {
        return (
            <div className="gap-2 flex justify-center content-center">
                {Object.keys(navListUrlToLabel).map((key: string) => {
                    return <NavItem key={key} url={`/${key}`} label={navListUrlToLabel[key]} />
                })}
            </div>
        );
    }

    function NavListFlexCol() {
        return (
            <Box width="100%" >
                <Flex className="!justify-center !content-center">
                    {Object.keys(navListUrlToLabelHanburgerButton).map((key: string) => {
                        return <NavItemFlexCol key={key} url={`/${key}`} label={navListUrlToLabelHanburgerButton[key]} />
                    })}
                </Flex>
            </Box>
        );
    }

    return (
        <>
            <div className="w-full fixed top-0 left-0 px-2 border-r dark:border-gray-600">
                <Box p="1" className={`${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"} transition-all duration-300 ease-in-out items-center justify-start`}>
                    <Flex align="center" gap="2" width="100%" className="!justify-between">
                        <Box p="2" width="100%" className="!items-center">
                            <Link href="/" className="cursor-pointer">
                                <Flex align="center" gap="1">
                                    <Text>idiotquant.com</Text>
                                </Flex>
                            </Link>
                        </Box>
                        <Box>
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                    <Button variant="soft">
                                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                        <DropdownMenu.TriggerIcon />
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content>
                                    <DropdownMenu.Sub>
                                        <DropdownMenu.SubTrigger><MagnifyingGlassCircleIcon className="h-4 w-4" strokeWidth={2} /> search</DropdownMenu.SubTrigger>
                                        <DropdownMenu.SubContent>
                                            <Link href="/search-kr">
                                                <DropdownMenu.Item>🇰🇷</DropdownMenu.Item>
                                            </Link>
                                            <Link href="/search-us">
                                                <DropdownMenu.Item>🇺🇸</DropdownMenu.Item>
                                            </Link>
                                        </DropdownMenu.SubContent>
                                    </DropdownMenu.Sub>
                                    <Link href="/calculator">
                                        <DropdownMenu.Item shortcut="">
                                            <CalculatorIcon className="h-4 w-4" strokeWidth={2} /> calculator
                                        </DropdownMenu.Item>
                                    </Link>
                                    <DropdownMenu.Sub>
                                        <DropdownMenu.SubTrigger><WalletIcon className="h-4 w-4" strokeWidth={2} /> account</DropdownMenu.SubTrigger>
                                        <DropdownMenu.SubContent>
                                            <Link href="/balance-kr">
                                                <DropdownMenu.Item>🇰🇷</DropdownMenu.Item>
                                            </Link>
                                            <Link href="/balance-us">
                                                <DropdownMenu.Item>🇺🇸</DropdownMenu.Item>
                                            </Link>
                                        </DropdownMenu.SubContent>
                                    </DropdownMenu.Sub>
                                    <DropdownMenu.Separator />
                                    <DropdownMenu.Item shortcut="">
                                        <NavListFlexCol />
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Separator />
                                    <DropdownMenu.Item shortcut="">
                                        <ThemeChanger />
                                    </DropdownMenu.Item>
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                        </Box>
                    </Flex>
                </Box>
            </div>
        </>
    );
}

export default NavbarWithSimpleLinks;