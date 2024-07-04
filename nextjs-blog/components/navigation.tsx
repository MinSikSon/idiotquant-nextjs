"use client"

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { initFinancialInfo, selectFinancialInfo, selectLoaded } from "@/lib/features/financialInfo/financialInfoSlice";
import { initMarketInfo, selectMarketInfo, selectMarketInfoLoaded } from "@/lib/features/marketInfo/marketInfoSlice";
import { getStrategyList, setStrategyList, selectNcavListState, setRetry, setLoading } from "@/lib/features/strategy/strategySlice";

export const Nav = () => {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const financialInfoLoaded = useAppSelector(selectLoaded);
    const financialInfo: object = useAppSelector(selectFinancialInfo);

    const marketInfoLoaded = useAppSelector(selectMarketInfoLoaded);
    const marketInfo: object = useAppSelector(selectMarketInfo);

    const ncavListState = useAppSelector(selectNcavListState);

    // test data
    // const year: string = "2023";
    // const quarter: string = "4";
    const year: string = "2024";
    const quarter: string = "1";
    const marketInfoDate: string = "20230426";

    useEffect(() => {
        if (false == financialInfoLoaded) {
            console.log(`financialInfoLoaded:`, financialInfoLoaded);
            dispatch(initFinancialInfo({ year, quarter }));
        }
        if (false == marketInfoLoaded) {
            console.log(`marketInfoLoaded:`, marketInfoLoaded);
            dispatch(initMarketInfo({ date: marketInfoDate }));
        }
        if ("ready" == ncavListState) {
            dispatch(setLoading());
            const financialInfoDate = `${year}${quarter}Q`;
            console.log(`[ncavListState 1]`, ncavListState);
            dispatch(getStrategyList({ financialInfoDate, marketInfoDate }));
        }
    }, [])

    useEffect(() => {
        console.log(`[ncavListState 2]`, ncavListState);
        const ncavList = ["손민식", "김수빈"];
        if ("loading" == ncavListState) {
            dispatch(setRetry());
            console.log(`rejected!!!!!!!!!!`);
            const dummy = {
                financialInfoDate: `${year}${quarter}Q`,
                marketInfoDate: marketInfoDate,
                ncavList: ncavList
            }
            dispatch(setStrategyList(dummy));
        }
        if ("retry" == ncavListState) {
            console.log(`end!!!!!!!!!!!!!!`);
        }
    }, [ncavListState]);

    console.log(`financialInfo`, financialInfo);
    console.log(`marketInfo`, marketInfo);

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
