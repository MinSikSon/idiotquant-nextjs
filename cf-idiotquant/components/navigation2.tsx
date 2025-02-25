"use client"

import React from "react";
import {
    Navbar,
    Collapse,
    Typography,
    Button,
    IconButton,
} from "@material-tailwind/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { selectKakaoId, selectKakaoNickName } from "@/lib/features/login/loginSlice";
import { useAppSelector } from "@/lib/hooks";

import { usePathname } from "next/navigation";

interface NavItemPropsType {
    url: string;
    label: string;
}


export function NavbarWithSimpleLinks() {
    // console.log(`[NavbarWithSimpleLinks]`);
    const pathname = usePathname();
    const splitPathName = pathname.split("/");
    // console.log(`pathname`, pathname);
    // console.log(`splitPathName`, splitPathName);

    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen((cur) => !cur);

    const kakaoId = useAppSelector(selectKakaoId);
    const kakaoNickName = useAppSelector(selectKakaoNickName);

    React.useEffect(() => {
        window.addEventListener(
            "resize",
            () => window.innerWidth >= 960 && setOpen(false)
        );
    }, []);

    function NavItem({ url, label }: NavItemPropsType) {
        return (
            <Link href={url} onClick={() => setOpen(false)}>
                <div className="font-mono text-xs text-blue-gray-500 hover:text-blue-500">
                    {label}
                </div>
            </Link>
        );
    }

    const navListUrlToLabel: any = {
        "": "홈",
        "calculator": "수익 계산기",
        "login": `${!!!kakaoId ? "로그인 🔒" : "로그아웃"}`,
        "backtest": `백테스트 ${!!!kakaoId ? "🔒" : ""}`,
        // "article": "Article",
        "search": `종목 검색 ${!!!kakaoId ? "🔒" : ""}`,
        "open-api": `알고리즘 투자 - 계좌 조회 ${!!!kakaoId ? "🔒" : ""}`,
        "algorithm-trade": "알고리즘 투자 - 매매 이력",
    }

    const urlToLabel: any = {
        ...navListUrlToLabel,
        "strategy": "투자 전략",
        "strategy-register": "투자 전략 등록",
    }

    function NavList() {
        return (
            <ul className="pl-2 pt-2 mb-4 mt-2 flex flex-col gap-2 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-8">
                {Object.keys(navListUrlToLabel).map((key: string) => {
                    return <NavItem key={key} url={`/${key}`} label={navListUrlToLabel[key]} />
                })}
            </ul>
        );
    }

    return (
        <Navbar color="transparent" fullWidth className="px-2">
            <div className="container mx-auto flex items-center justify-between text-blue-gray-900">
                <Link href="/">
                    <Typography
                        color="blue-gray"
                        className="mr-2 cursor-pointer font-mono font-bold"
                    >
                        idiotquant<span className="text-blue-500">.</span>com
                    </Typography>
                </Link>
                <div className="flex flex-col px-1">
                    {!!kakaoNickName ? <>
                        <div className={`px-1 text-xs font-mono rounded border border-blue-500 text-black`}>{urlToLabel[splitPathName[1]]}</div>
                        <div className={`pl-1 text-xs font-mono`}>{kakaoNickName}님 반갑습니다. 😀</div>
                    </>
                        : <div className={`px-1 text-xs font-mono rounded border border-blue-500 text-black`}>{urlToLabel[splitPathName[1]]}</div>
                    }
                </div>
                <div className="hidden lg:block">
                    <NavList />
                </div>
                <IconButton
                    size="sm"
                    variant="text"
                    color="blue-gray"
                    onClick={handleOpen}
                    className="ml-auto inline-block text-blue-gray-900 lg:hidden"
                >
                    {open ? (
                        <XMarkIcon className="h-6 w-6" strokeWidth={2} />
                    ) : (
                        <Bars3Icon className="h-6 w-6" strokeWidth={2} />
                    )}
                </IconButton>
            </div>
            <Collapse open={open}>
                <div className="pl-2 mt-2 rounded-xl bg-white border border-gray-500">
                    <div className="font-mono font-bold text-xl text-black pt-4 pl-2">
                        menu
                    </div>
                    <NavList />
                </div>
            </Collapse>
        </Navbar>
    );
}

export default NavbarWithSimpleLinks;