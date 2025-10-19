"use client"

import { useState, useEffect, useRef } from "react";
import { Bars3Icon, CalculatorIcon, LockClosedIcon, LockOpenIcon, MagnifyingGlassCircleIcon, WalletIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { useAppSelector } from "@/lib/hooks";

import { usePathname } from "next/navigation";
import { DesignButton } from "./designButton";
import ThemeChanger from "@/components/theme_changer";
import RotatingText from "@/src/TextAnimations/RotatingText/RotatingText";
import { selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import { Button, DropdownMenu } from "@radix-ui/themes";

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
            <Link href={url} onClick={() => {
                setOpen(false)
                setSelectPath(url.split("/")[1]);
            }}>
                <div className={`px-2 py-1.5 rounded dark:text-white font-mono text-[0.8rem] hover:bg-gray-100 hover:dark:bg-gray-700 ${selectPath == url.split("/")[1] ? "bg-slate-100 dark:bg-gray-500" : ""} `}>
                    {label}
                </div>
            </Link>
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
        "login": <div className={navListDesign}>{!!!kakaoTotal?.id ? <><div>kakao login</div> <LockClosedIcon className="h-4 w-4" strokeWidth={2} /></> : <><div>{kakaoTotal?.kakao_account?.profile?.nickname}<span className="text-[0.5rem]">님 반갑습니다.</span></div><LockOpenIcon className="h-4 w-4" strokeWidth={2} /></>}</div>,
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
            <div className="flex flex-col justify-center content-center">
                {Object.keys(navListUrlToLabelHanburgerButton).map((key: string) => {
                    return <NavItemFlexCol key={key} url={`/${key}`} label={navListUrlToLabelHanburgerButton[key]} />
                })}
            </div>
        );
    }

    return (
        <>
            <div className="fixed top-0 left-0 w-full z-30 border-r dark:border-gray-600">
                <div className={`${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"} transition-all duration-300 ease-in-out bg-slate-50 dark:bg-gray-900 dark:text-white flex items-center justify-start text-blue-gray-900 min-w-56`}>
                    <div className="p-3 w-full dark:border-gray-600">
                        <div className="bg-white dark:bg-black flex md:flex-col lg:flex-col border dark:border-gray-600 rounded-lg items-center py-2 w-full">
                            <Link href="/">
                                <div className="flex items-center justify-center gap-2 px-2 font-mono font-bold cursor-pointer">
                                    <div className="pt-0.5">idiot</div>
                                    <RotatingText
                                        texts={['quant', '퀀트', 'quant investing', 'ncav strategy', '순자산가치 전략', 'emotion-free', 'profitability', '수익성', 'undervaluation', '저평가', 'volume', '거래량']}
                                        mainClassName="px-2 sm:px-2 md:px-3 pt-0.5 pt-1 justify-center rounded-md bg-blue-500 text-white overflow-hidden "
                                        staggerFrom={"last"}
                                        initial={{ y: "100%" }}
                                        animate={{ y: 0 }}
                                        exit={{ y: "-120%" }}
                                        staggerDuration={0.025}
                                        splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                                        rotationInterval={10000}
                                    />
                                </div>
                            </Link>
                            {/* <div className="font-mono text-[0.6rem] dark:text-white min-w-32 text-center">
                            {!!kakaoNickName ? <>{kakaoNickName}님 반갑습니다. 😀</>
                                : <></>
                            }
                        </div> */}
                        </div>
                    </div>
                    {/* <div className="hidden md:block lg:block w-full">
                    <div className="flex flex-col w-full p-2 justify-items-center">
                        <div className="flex flex-col p-2 min-h-44 justify-between">
                            <NavListFlexCol />
                            <ThemeChanger />
                        </div>
                    </div>
                </div> */}
                    {/* <div className="md:hidden lg:hidden dark:bg-gray-900 pr-2 py-3"> */}
                    <div className="dark:bg-gray-900 pr-2 py-3">
                        {/* <DesignButton
                            handleOnClick={() => handleOpen()}
                            buttonName={<>
                                {open ? (
                                    <XMarkIcon className="h-6 w-6" strokeWidth={2} />
                                ) : (
                                    <Bars3Icon className="h-6 w-6" strokeWidth={2} />
                                )}
                            </>}
                            buttonBgColor="bg-white"
                            buttonBorderColor="border-gray-500"
                            buttonShadowColor="#D5D5D5"
                            textStyle="text-black text-xs font-bold"
                            buttonStyle={`rounded-lg p-1 flex items-center justify-center mb-2 button bg-white cursor-pointer select-none
                        active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                        transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]
                        `}
                        /> */}
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                                <Button variant="soft">
                                    Options
                                    <DropdownMenu.TriggerIcon />
                                </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content>
                                <DropdownMenu.Item shortcut="⌘ E"><NavListFlexCol /></DropdownMenu.Item>
                                <DropdownMenu.Item shortcut="⌘ D"><ThemeChanger
                                    handleOpen={handleOpen}
                                    toggleTheme={toggleTheme}
                                    setToggleTheme={setToggleTheme}
                                />
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator />

                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </div>
                </div>
                <div className="transition-all duration-300 ease-in-out">
                    <div className={`${visible ? "translate-y-0" : "-translate-y-16 bg-[radial-gradient(circle,_#d1d5db_1px,transparent_1px)] bg-[size:5px_5px]"} dark:text-white flex flex-col w-full p-2 justify-items-center justify-between`}>
                        <NavList />
                        {/* <ThemeChanger /> */}
                    </div>
                </div>

            </div>

            {/* <Collapse open={open} className="fixed z-50">
                <div className="dark:border gap-2 fixed top-14 right-2 z-40 w-fit shadow-[0_0_10px_2px_rgba(0,0,0,0.2)] rounded-xl bg-white dark:bg-black dark:text-white flex flex-col p-2 justify-items-center justify-between">
                    <NavListFlexCol />
                    <ThemeChanger
                        handleOpen={handleOpen}
                        toggleTheme={toggleTheme}
                        setToggleTheme={setToggleTheme}
                    />
                </div>
            </Collapse> */}

        </>
    );
}

export default NavbarWithSimpleLinks;