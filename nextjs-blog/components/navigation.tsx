"use client"

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Nav = () => {
    const pathname = usePathname();

    const defaultDeco = 'pr-1';
    const decorations = 'underline decoration-green-400';
    const hoverDecorations = 'hover:underline hover:decoration-green-400';
    return (
        <nav className='bg-white flex justify-center text-xl'>
            <div className='flex'>
                <Link className={`flex-auto ${defaultDeco} ${hoverDecorations} ${pathname === "/" ? decorations : ""}`} href="/">Home</Link>
                <Link className={`flex-auto ${defaultDeco} ${hoverDecorations} ${pathname === "/calculator" ? decorations : ""}`} href="/calculator">Calculator</Link>
                <Link className={`flex-auto ${defaultDeco} ${hoverDecorations}  ${pathname === "/article" ? decorations : ""}`} href="/article">article</Link>
            </div>
        </nav>
    );
}
