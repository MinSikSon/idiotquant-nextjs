"use client"

import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import { useEffect } from "react";

import { selectStrategyUsNcavLatest, reqGetUsNcavLatest, StrategyUsNcavLatestType } from "@/lib/features/backtest/backtestSlice";
import NCAVTable from "./table";

const DEBUG = false;

export default function AlgorithmTrade() {
    const dispatch = useAppDispatch();

    const strategyUsNcavLatest: StrategyUsNcavLatestType = useAppSelector(selectStrategyUsNcavLatest);

    useEffect(() => {
        dispatch(reqGetUsNcavLatest());
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[AlgorithmTrade] strategyUsNcavLatest:`, strategyUsNcavLatest);
    }, [strategyUsNcavLatest]);

    return <NCAVTable strategies={strategyUsNcavLatest?.list ?? {}} />
}