"use client"

import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import { useState, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";

import { Badge, Box, Card, Flex, Grid, Heading, Spinner, Text } from "@radix-ui/themes";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import { selectStrategyUsNcavList, reqGetUsNcavList, selectStrategyUsNcavLatest, reqGetUsNcavLatest, StrategyUsNcavLatestType, StrategyUsNcavListType, StrategyUsNcavLatestItemType, CanditateType } from "@/lib/features/backtest/backtestSlice";
import { Util } from "@/components/util";
import NCAVTable from "./table";

const DEBUG = false;

function MarketTabs({ setMarket }: { setMarket: (m: "KR" | "US") => void }) {
    return (
        <Tabs.Root defaultValue="KR" className="mx-1">
            <Tabs.List className="w-full flex bg-gray-300">
                <Tabs.Trigger
                    value="KR"
                    onClick={() => setMarket("KR")}
                    className="flex-1 p-1 transition 
                     data-[state=active]:bg-blue-500 data-[state=active]:font-bold"
                >
                    KR
                </Tabs.Trigger>
                <Tabs.Trigger
                    value="US"
                    onClick={() => setMarket("US")}
                    className="flex-1 p-1 transition 
                     data-[state=active]:bg-blue-500 data-[state=active]:font-bold"
                >
                    US
                </Tabs.Trigger>
            </Tabs.List>
        </Tabs.Root>
    );
}

export default function AlgorithmTrade() {
    const dispatch = useAppDispatch();

    const strategyUsNcavList: StrategyUsNcavListType = useAppSelector(selectStrategyUsNcavList);
    const strategyUsNcavLatest: StrategyUsNcavLatestType = useAppSelector(selectStrategyUsNcavLatest);

    useEffect(() => {
        dispatch(reqGetUsNcavList());
        dispatch(reqGetUsNcavLatest());
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[AlgorithmTrade] strategyUsNcavList:`, strategyUsNcavList);
    }, [strategyUsNcavList]);
    useEffect(() => {
        if (DEBUG) console.log(`[AlgorithmTrade] strategyUsNcavLatest:`, strategyUsNcavLatest);
    }, [strategyUsNcavLatest]);

    if (strategyUsNcavLatest?.state != "fulfilled") {
        return <Spinner loading />

    }
    return <NCAVTable strategies={strategyUsNcavLatest?.list} />

    // return <>
    //     <Flex align="center" gap="0" p="1">
    //         {/* <Flex flexShrink="0" gap="6" direction="column" width="640px">
    //             first
    //         </Flex> */}
    //         {/* <Flex flexShrink="0" gap="6" direction="column" width="640px"> */}
    //         <Flex flexShrink="0" gap="0" direction="column" width="100%">
    //             <Flex direction="row" width="100%" align="center" className="!justify-between">
    //                 <Box>
    //                     <Text size="5">
    //                         NCAV 전략 추천 종목
    //                     </Text>
    //                 </Box>
    //                 <Box>
    //                     <Flex direction="column">
    //                         <Text as="p" color="gray" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
    //                             NCAV: Net Current Asset Value (순유동자산가치)
    //                         </Text>
    //                         <Text as="p" color="gray" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
    //                             순유동자산가치: 유동자산 - 총부채
    //                         </Text>
    //                         <Text as="p" color="gray" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
    //                             Q:0: 연간보고서
    //                         </Text>
    //                         <Text as="p" color="gray" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
    //                             단위: USD
    //                         </Text>
    //                     </Flex>
    //                 </Box>
    //             </Flex>
    //             {(strategyUsNcavLatest?.list?.length ?? 0) > 0 && (strategyUsNcavLatest?.list ?? []).map((list: StrategyUsNcavLatestItemType, i: any) => (
    //                 <Box key={i} className="border m-1 p-1 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border-gray-300">
    //                     <Flex align="center" className="!justify-between">
    //                         <Text size="4">{list.name}</Text>
    //                         <Text size="2">{list.strategyId}</Text>
    //                         <Text size="1">YEAR:{list.kvFilter.year} Q:{list.kvFilter.quarter}</Text>
    //                     </Flex>
    //                     <Grid columns="1" gap="0">
    //                         {Object.keys(list.candidates).map((key: any, j: any) => {
    //                             const item: CanditateType = list.candidates[key];
    //                             const ncavRatio = Number((Number(item.condition.AssetsCurrent) - Number(item.condition.LiabilitiesCurrent)) / (Number(item.condition.MarketCapitalization) * 1.5));

    //                             return <Box key={j} className="border-b border-r" pb="1" ml="0" mb="0">
    //                                 <Flex direction="column" width="100%" gap="0" mb="0" align="center" className="!justify-center">
    //                                     <Flex width="100%" gap="0" mb="0" align="center" className="!justify-between">
    //                                         <Flex align="center" gap="1">
    //                                             <Text size="4" weight={"bold"}>
    //                                                 {/* {item.latest.stock_name} */}
    //                                                 {item.symbol}
    //                                             </Text>
    //                                             <Text size="1" color="gray">
    //                                                 {`${item.condition.LastPrice}`}
    //                                             </Text>
    //                                             <Text size="1">→</Text>
    //                                             <Text size="1" weight="bold" color="green">
    //                                                 {`${Number(Number(item.condition.LastPrice) * ncavRatio).toFixed(2)}`} USD
    //                                             </Text>
    //                                             <Text size="1" color="green">
    //                                                 (+{Number((ncavRatio - 1) * 100).toFixed(2)}%)
    //                                             </Text>
    //                                         </Flex>
    //                                         <Text size="1" color="gray">
    //                                             {item.condition.date ?? new Date().toISOString().split("T")[0]}
    //                                         </Text>
    //                                     </Flex>
    //                                     <Flex align="center" className="!justify-start">
    //                                         <Text size="1">
    //                                             <Badge radius="medium">
    //                                                 <Flex direction="column" align="center">
    //                                                     <Text className="text-[0.6rem]">NCAV1.5</Text>
    //                                                     <Text className="text-[0.5rem]">
    //                                                         {ncavRatio.toFixed(2)}
    //                                                     </Text>
    //                                                 </Flex>
    //                                             </Badge>
    //                                             =
    //                                             (<Badge radius="medium">
    //                                                 <Flex direction="column" align="center">
    //                                                     <Text className="text-[0.6rem]">유동자산</Text>
    //                                                     <Text className="text-[0.5rem]">
    //                                                         {Number(item.condition.AssetsCurrent).toLocaleString()}
    //                                                     </Text>
    //                                                 </Flex>
    //                                             </Badge>
    //                                             -
    //                                             <Badge radius="medium" color="ruby">
    //                                                 <Flex direction="column" align="center">
    //                                                     <Text className="text-[0.6rem]">총부채</Text>
    //                                                     <Text className="text-[0.5rem]">
    //                                                         {Number(item.condition.LiabilitiesCurrent).toLocaleString()}
    //                                                     </Text>
    //                                                 </Flex>
    //                                             </Badge>)
    //                                             /
    //                                             (1.5 *
    //                                             <Badge radius="medium" >
    //                                                 <Flex direction="column" align="center">
    //                                                     <Text className="text-[0.6rem]">시가총액</Text>
    //                                                     <Text className="text-[0.5rem]">
    //                                                         {Number(item.condition.MarketCapitalization).toLocaleString()}
    //                                                     </Text>
    //                                                 </Flex>
    //                                             </Badge>
    //                                             )
    //                                         </Text>
    //                                     </Flex>
    //                                 </Flex>
    //                                 <Text color="gray" mb="0" className="text-[0.4rem] sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
    //                                     <Flex width="100%" direction="row" align="center" gap="1" className="!justify-center">

    //                                     </Flex>
    //                                 </Text>
    //                             </Box>
    //                         })}</Grid>
    //                 </Box>
    //             ))
    //             }
    //         </Flex>
    //     </Flex >
    // </>
}