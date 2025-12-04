"use client"

import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import { useEffect } from "react";

import { selectStrategyUsNcavLatest, reqGetUsNcavLatest, StrategyUsNcavLatestType } from "@/lib/features/backtest/backtestSlice";
import NCAVTable from "./table";
import { Code, Flex, Text } from "@radix-ui/themes";

const DEBUG = true;

export default function AlgorithmTrade() {
    const dispatch = useAppDispatch();

    const strategyUsNcavLatest: StrategyUsNcavLatestType = useAppSelector(selectStrategyUsNcavLatest);

    useEffect(() => {
        dispatch(reqGetUsNcavLatest());
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[AlgorithmTrade] strategyUsNcavLatest:`, strategyUsNcavLatest);
    }, [strategyUsNcavLatest]);

    return <>
        <Flex direction="column" align="center">
            <Text size="6"><Code>종목 추천</Code></Text>
            <NCAVTable strategies={strategyUsNcavLatest?.list ?? {}} />
        </Flex>
    </>
}