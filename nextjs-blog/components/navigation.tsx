"use client"

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DefaultNav = (props) => {

    const defaultDeco = 'pr-1';
    const decorations = 'underline decoration-green-400';
    const hoverDecorations = 'hover:underline hover:decoration-green-400';
    return (
        <nav className='bg-white flex justify-center text-xl'>
            <div className='flex'>
                <Link className={`flex-auto ${defaultDeco} ${hoverDecorations} ${props.pathname === "/" ? decorations : ""}`} href="/">Home</Link>
                <Link className={`flex-auto ${defaultDeco} ${hoverDecorations} ${props.pathname === "/calculator" ? decorations : ""}`} href="/calculator">Calculator</Link>
                <Link className={`flex-auto ${defaultDeco} ${hoverDecorations}  ${props.pathname === "/article" ? decorations : ""}`} href="/article">article</Link>
            </div>
        </nav>
    );
}

export const Nav = () => {
    const pathname = usePathname();

    return <>
        <div className="fixed bottom-0 z-40 w-full border-t-2 border-r-2 rounded-t-lg">
            <DefaultNav pathname={pathname} />
        </div>
    </>
}
