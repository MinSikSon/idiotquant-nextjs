"use client"

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { initFinancialInfo, selectFinancialInfo, selectLoaded } from "@/lib/features/financialInfo/financialInfoSlice";
import { initMarketInfo, selectMarketInfo, selectMarketInfoLoaded } from "@/lib/features/marketInfo/marketInfoSlice";

export const Nav = () => {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const financialInfoLoaded = useAppSelector(selectLoaded);
    const financialInfo: object = useAppSelector(selectFinancialInfo);

    const marketInfoLoaded = useAppSelector(selectMarketInfoLoaded);
    const marketInfo: object = useAppSelector(selectMarketInfo);

    useEffect(() => {
        if (false == financialInfoLoaded) {
            console.log(`loaded:`, financialInfoLoaded);
            const year: string = "2023";
            const quarter: string = "4";
            dispatch(initFinancialInfo({ year, quarter }));
        }
        if (false == marketInfoLoaded) {
            console.log(`loaded:`, marketInfoLoaded);
            const date: string = "20230426";
            dispatch(initMarketInfo({ date }));
        }
    }, [])

    console.log(`financialInfo`, financialInfo);
    console.log(`marketInfo`, marketInfo);

    const defaultDeco = 'pr-1';
    const decorations = 'underline decoration-green-400';
    const hoverDecorations = 'hover:underline hover:decoration-green-400';
    return (
        <nav className='bg-white flex justify-center text-xl lx:text-2xl 2xl:text-2xl'>
            <div className='flex'>
                <Link className={`flex-auto ${defaultDeco} ${hoverDecorations} ${pathname === "/" ? decorations : ""}`} href="/">Home</Link>
                <Link className={`flex-auto ${defaultDeco} ${hoverDecorations} ${pathname === "/calculator" ? decorations : ""}`} href="/calculator">Calculator</Link>
                <Link className={`flex-auto ${defaultDeco} ${hoverDecorations}  ${pathname === "/article" ? decorations : ""}`} href="/article">article</Link>
            </div>
        </nav>
    );
}
