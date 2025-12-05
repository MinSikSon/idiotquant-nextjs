"use client"

import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import { useEffect } from "react";

import { selectStrategyNcavLatest, reqGetNcavLatest, StrategyNcavLatestType } from "@/lib/features/backtest/backtestSlice";
import NCAVTable from "./table";
import { Code, Flex, Text } from "@radix-ui/themes";

const DEBUG = true;

export default function AlgorithmTrade() {
    const dispatch = useAppDispatch();

    const strategyNcavLatest: StrategyNcavLatestType = useAppSelector(selectStrategyNcavLatest);

    useEffect(() => {
        dispatch(reqGetNcavLatest());
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[AlgorithmTrade] strategyNcavLatest:`, strategyNcavLatest);
    }, [strategyNcavLatest]);

    return <>
        <Flex direction="column" align="center">
            <Text size="6"><Code>종목 추천</Code></Text>
            <NCAVTable strategies={strategyNcavLatest?.list ?? {}} />
        </Flex>
    </>
}