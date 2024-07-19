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

interface NavItemPropsType {
    url: string;
    label: string;
}

function NavItem({ url, label }: NavItemPropsType) {
    return (
        <a href={url}>
            <Typography as="li" color="blue-gray" className="p-1 font-medium">
                {label}
            </Typography>
        </a>
    );
}

function NavList() {
    return (
        <ul className="mb-4 mt-2 flex flex-col gap-3 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-8">
            <NavItem url="/" label="Home" />
            <NavItem url="/backtest" label="Backtest" />
            <NavItem url="/calculator" label="Calculator" />
            <NavItem url="/article" label="Article" />
        </ul>
    );
}

export function NavbarWithSimpleLinks() {
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen((cur) => !cur);

    React.useEffect(() => {
        window.addEventListener(
            "resize",
            () => window.innerWidth >= 960 && setOpen(false)
        );
    }, []);

    return (
        <Navbar color="transparent" fullWidth>
            <div className="container mx-auto flex items-center justify-between text-blue-gray-900">
                <Typography
                    as="a"
                    href="/"
                    color="blue-gray"
                    className="mr-4 cursor-pointer text-lg font-bold"
                >
                    Idiot Quant
                </Typography>
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
                <div className="mt-2 rounded-xl bg-white py-2">
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