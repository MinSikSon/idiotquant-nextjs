"use client"

import React from "react";
import {
    Navbar,
    Collapse,
    Typography,
    Button,
    IconButton,
} from "@material-tailwind/react";
import { Bars3Icon, CalculatorIcon, HomeIcon, LockClosedIcon, LockOpenIcon, MagnifyingGlassCircleIcon, SparklesIcon, WalletIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { selectKakaoId, selectKakaoNickName } from "@/lib/features/login/loginSlice";
import { useAppSelector } from "@/lib/hooks";

import { usePathname } from "next/navigation";
import { DesignButton } from "./designButton";
import ThemeChanger from "./theme_changer";

interface NavItemPropsType {
    url: string;
    label: string;
}

export function NavbarWithSimpleLinks() {
    // console.log(`[NavbarWithSimpleLinks]`);
    const pathname = usePathname();
    const splitPathName = pathname.split("/");
    // console.log(`pathname`, pathname);
    console.log(`splitPathName`, splitPathName);

    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen((cur) => !cur);

    const [selectPath, setSelectPath] = React.useState<string>(splitPathName[1]);

    const kakaoId = useAppSelector(selectKakaoId);
    const kakaoNickName = useAppSelector(selectKakaoNickName);

    React.useEffect(() => {
        window.addEventListener(
            "resize",
            () => window.innerWidth >= 960 && setOpen(false)
        );
    }, []);

    React.useEffect(() => {
        if (!!!open) {
            setSelectPath(splitPathName[1]);
        }
    }, [open]);
    React.useEffect(() => {
        console.log(`selectPath`, selectPath);
    }, [selectPath]);

    function NavItem({ url, label }: NavItemPropsType) {
        return (
            <Link href={url} onClick={() => {
                setOpen(false)
                setSelectPath(url.split("/")[1]);
            }}>
                <div className={`p-2 rounded-lg dark:text-white font-mono text-[0.8rem] hover:bg-gray-400 hover:text-white ${selectPath == url.split("/")[1] ? "bg-gray-500 text-white" : ""} `}>
                    {label}
                </div>
            </Link>
        );
    }

    const navListUrlToLabel: any = {
        "": <div className="flex gap-1 justify-items-center"><HomeIcon className="h-4 w-4" strokeWidth={2} /><div>홈</div></div>,
        "calculator": <div className="flex gap-1 justify-items-center"><CalculatorIcon className="h-4 w-4" strokeWidth={2} /><div>수익계산기</div></div>,
        "login": <div className="flex gap-1 justify-items-center">{!!!kakaoId ? <LockClosedIcon className="h-4 w-4" strokeWidth={2} /> : <LockOpenIcon className="h-4 w-4" strokeWidth={2} />}<div>로그인</div></div>,
        "search": <div className="flex gap-1 justify-items-center"><MagnifyingGlassCircleIcon className="h-4 w-4" strokeWidth={2} /><div>종목검색</div></div>,
        "search-nasdaq": <div className="flex gap-1 justify-items-center"><MagnifyingGlassCircleIcon className="h-4 w-4" strokeWidth={2} /><div>종목검색(nasdaq)</div></div>,
        "balance-kr": <div className="flex gap-1 justify-items-center"><WalletIcon className="h-4 w-4" strokeWidth={2} /><div>알고투자-계좌조회(국내)</div></div>,
        "balance-us": <div className="flex gap-1 justify-items-center"><WalletIcon className="h-4 w-4" strokeWidth={2} /><div>알고투자-계좌조회(해외)</div></div>,
        "chat": <div className="flex gap-1 justify-items-center"><SparklesIcon className="h-4 w-4" strokeWidth={2} /><div>LLM</div></div>,
    }

    const urlToLabel: any = {
        ...navListUrlToLabel,
        "backtest": `백테스트 ${!!!kakaoId ? "🔒" : ""}`,
        "strategy": "투자 전략",
        "strategy-register": "투자 전략 등록",
    }

    function NavList() {
        return (
            <div className="flex flex-col lg:mb-0 lg:mt-0 lg:flex-col lg:items-left">
                {Object.keys(navListUrlToLabel).map((key: string) => {
                    return <NavItem key={key} url={`/${key}`} label={navListUrlToLabel[key]} />
                })}
            </div>
        );
    }

    return (
        <Navbar className="flex-none lg:w-60 dark:bg-black p-2 rounded-none">
            <div className="container mx-auto flex lg:flex-col items-center justify-between text-blue-gray-900">
                <div className="h-2"></div>
                <Link href="/">
                    <Typography color="primary" className="mr-2 cursor-pointer font-mono font-bold"
                    >
                        idiotquant<span className="text-blue-500">.</span>com
                    </Typography>
                </Link>
                <div className="font-mono h-2 pl-1 text-[0.6rem] dark:text-white">
                    {!!kakaoNickName ? <>{kakaoNickName}님 반갑습니다. 😀</>
                        : <></>
                    }
                </div>
                <div className="hidden lg:block">
                    <div className="w-full my-2 border border-b border-black"></div>
                    <div className="w-full p-2 ">
                        <NavList />
                    </div>
                </div>
                <div className="lg:hidden">
                    <DesignButton
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
                    />
                </div>
                <ThemeChanger />
            </div>
            <Collapse open={open}>
                <NavList />
            </Collapse>
        </Navbar>
    );
}

export default NavbarWithSimpleLinks;