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

import { selectKakaoId } from "@/lib/features/login/loginSlice";
import { useAppSelector } from "@/lib/hooks";

interface NavItemPropsType {
    url: string;
    label: string;
}


export function NavbarWithSimpleLinks() {
    // console.log(`[NavbarWithSimpleLinks]`);

    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen((cur) => !cur);

    const kakaoId = useAppSelector(selectKakaoId);

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

    function NavList() {
        return (
            <ul className="pl-2 pt-2 mb-4 mt-2 flex flex-col gap-2 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-8">
                <NavItem url="/" label="idiot.quant" />
                <NavItem url="/login" label={`login ${!!!kakaoId ? '🔒' : '🔓'}`} />
                {/* <NavItem url="/backtest" label="Backtest" /> */}
                <NavItem url="/calculator" label="기대 수익 계산기 🎲" />
                {/* <NavItem url="/article" label="Article" /> */}
            </ul>
        );
    }

    return (
        <Navbar color="transparent" fullWidth>
            <div className="container mx-auto flex items-center justify-between text-blue-gray-900">
                <Link href="/">
                    <Typography
                        color="blue-gray"
                        className="mr-4 cursor-pointer text-lg font-bold"
                    >
                        idiot<span className="text-blue-500">.</span>quant
                    </Typography>
                </Link>
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