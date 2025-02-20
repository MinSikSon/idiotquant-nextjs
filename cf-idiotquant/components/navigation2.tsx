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
                <Typography className="font-medium hover:text-blue-500" as="li" color="blue-gray">
                    {label}
                </Typography>
            </Link>
        );
    }

    const urlToLabel: any = {
        "": "main",
        "calculator": "calculator",
        "login": `${!!!kakaoId ? "login 🔒" : "logout"}`,
        "backtest": `backtest ${!!!kakaoId ? "🔒" : ""}`,
        // "article": "Article",
        "search": `search ${!!!kakaoId ? "🔒" : ""}`,
        "open-api": `open api ${!!!kakaoId ? "🔒" : ""}`,
        "algorithm-trade": "trade history",
    }

    function NavList() {
        return (
            <ul className="pl-2 pt-2 mb-4 mt-2 flex flex-col gap-2 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-8">
                {Object.keys(urlToLabel).map((key: string) => {
                    return <NavItem key={key} url={`/${key}`} label={urlToLabel[key]} />
                })}
            </ul>
        );
    }

    return (
        <Navbar color="transparent" fullWidth>
            <div className="container mx-auto flex items-center justify-between text-blue-gray-900">
                <Link href="/">
                    <Typography
                        color="blue-gray"
                        className="mr-2 cursor-pointer text-lg font-bold"
                    >
                        idiotquant<span className="text-blue-500">.</span>com
                    </Typography>
                </Link>
                <div className="flex flex-col px-1">
                    {!!kakaoNickName ? <>
                        <div className={`px-1 text-xs font-bold rounded bg-gray-500 text-white`}>{urlToLabel[splitPathName[1]]}</div>
                        <div className={`pl-1 text-xs`}>{kakaoNickName}님 반갑습니다. 😀</div>
                    </>
                        : <div className={`px-1 text-xs font-bold rounded bg-gray-500 text-white`}>{urlToLabel[splitPathName[1]]}</div>
                    }
                </div>
                <div className="hidden lg:block">
                    <NavList />
                </div>
                {/* <Button color="gray" className="hidden lg:inline-block">
                    Sign in
                </Button> */}
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
                <div className="pl-2 mt-2 rounded-xl bg-white border-2 border-gray-100">
                    <Typography
                        color="blue-gray"
                        variant="h1"
                        className="pt-4 pl-2 !text-2xl"
                    >
                        메뉴
                    </Typography>
                    <NavList />
                    {/* <Button className="mb-2" fullWidth>
                        Sign in
                    </Button> */}
                </div>
            </Collapse>
        </Navbar>
    );
}

export default NavbarWithSimpleLinks;