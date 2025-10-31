"use client"

import { CapitalTokenType, QuantRule, reqGetQuantRule, reqGetQuantRuleDesc, reqGetUsCapitalToken, selectCapitalToken, selectInquirePriceMulti, selectQuantRule, selectQuantRuleDesc, selectUsCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { reqGetCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { getKoreaInvestmentToken, KoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import { useState, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";

import { Badge, Box, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from "@heroicons/react/24/outline";

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

    const kr_capital_token: CapitalTokenType = useAppSelector(selectCapitalToken);
    const us_capital_token: CapitalTokenType = useAppSelector(selectUsCapitalToken);
    const inquirePriceMulti: any = useAppSelector(selectInquirePriceMulti);
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const quant_rule: QuantRule = useAppSelector(selectQuantRule);
    const quant_rule_desc: QuantRule = useAppSelector(selectQuantRuleDesc);

    const [time, setTime] = useState<any>('');
    const [market, setMarket] = useState<"KR" | "US">("KR");
    const [visibleCount, setVisibleCount] = useState(0);
    const [mergedResult, setMergedResult] = useState<any>([]);

    function handleOnClick() {
        setTime(new Date());
        if (DEBUG) console.log(`[handleOnClick] kiToken`, kiToken);
        dispatch(reqGetCapitalToken());
        dispatch(reqGetUsCapitalToken());
    }

    useEffect(() => {
        dispatch(reqGetQuantRule());
        dispatch(reqGetQuantRuleDesc());
        handleOnClick();
    }, []);
    useEffect(() => {
        if (DEBUG) console.log(`kr_capital_token`, kr_capital_token);

        if (DEBUG) console.log(`mergedResult`, mergedResult);
        if (DEBUG) console.log(`mergedResult.length`, mergedResult.length);
        if ("fulfilled" == kr_capital_token.state && 0 == mergedResult.length) {
            const oldestMerged = new Set();
            const seen = new Set();
            const oldestPurchageLog = kr_capital_token.value.purchase_log.slice(60, 90).flat();

            if (DEBUG) console.log(`oldestPurchageLog`, oldestPurchageLog);
            oldestPurchageLog.forEach(item => {
                item.stock_list.forEach(stock => {
                    if (!seen.has(stock.stock_name)) {
                        seen.add(stock.stock_name);
                        oldestMerged.add({
                            ...stock,
                            time_stamp: item.time_stamp, // 필요시 언제 등장했는지도 같이 저장
                        });
                    }
                });
            });

            if (DEBUG) console.log(`oldestMerged`, oldestMerged);
            if (DEBUG) console.log(`seen`, seen);
            if (DEBUG) console.log(`seen.size`, seen.size);

            const latestMerged = new Set();
            const latestSeen = new Set();
            const latestPurchageLog = kr_capital_token.value.purchase_log.slice(-30).flat();
            if (DEBUG) console.log(`latestPurchageLog`, latestPurchageLog);
            latestPurchageLog.forEach(item => {
                item.stock_list.forEach(stock => {
                    if (!latestSeen.has(stock.stock_name)) {
                        latestSeen.add(stock.stock_name);
                        latestMerged.add({
                            ...stock,
                            time_stamp: item.time_stamp, // 필요시 언제 등장했는지도 같이 저장
                        });
                    }
                });
            });

            if (DEBUG) console.log(`latestMerged`, latestMerged);
            if (DEBUG) console.log(`latestSeen`, latestSeen);
            if (DEBUG) console.log(`latestSeen.size`, latestSeen.size);

            // Set → Array로 변환 (Set은 직접 index 접근이 불가하므로)
            const oldestArr: any = [...oldestMerged];
            const latestArr: any = [...latestMerged];

            // latest를 빠르게 찾기 위한 Map 생성
            const latestMap = new Map(
                latestArr.map((item: { stock_name: unknown }) => [item.stock_name, item])
            );

            const tmpMergedResult: any = [];

            oldestArr.forEach((oldItem: { stock_name: unknown; }) => {
                const match = latestMap.get(oldItem.stock_name);
                if (match) {
                    tmpMergedResult.push({
                        stock_name: oldItem.stock_name,
                        oldest: oldItem,
                        latest: match,
                    });
                }
            });

            if (DEBUG) console.log("tmpMergedResult", tmpMergedResult);
            setMergedResult(tmpMergedResult);
        }
    }, [kr_capital_token]);
    useEffect(() => {
        if (DEBUG) console.log(`mergedResult`, mergedResult);
    }, [mergedResult]);
    useEffect(() => {
        if (DEBUG) console.log(`us_capital_token`, us_capital_token);
    }, [us_capital_token]);
    useEffect(() => {
        if (DEBUG) console.log(`kiToken`, kiToken);
    }, [kiToken]);
    useEffect(() => {
        if (DEBUG) console.log(`quant_rule`, quant_rule);
    }, [quant_rule]);
    useEffect(() => {
        if (DEBUG) console.log(`inquirePriceMulti`, inquirePriceMulti);
    }, [inquirePriceMulti]);

    return <>
        <Flex align="center" gap="0" p="1">
            {/* <Flex flexShrink="0" gap="6" direction="column" width="640px">
                first
            </Flex> */}
            {/* <Flex flexShrink="0" gap="6" direction="column" width="640px"> */}
            <Flex flexShrink="0" gap="0" direction="column" width="100%">
                <Flex direction="row" width="100%" align="center" className="!justify-between">
                    <Box px="1">
                        <Text as="p" className="text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl font-bold">
                            NCAV 전략 기반 추천 종목
                        </Text>
                    </Box>
                    <Box px="1">
                        <Flex direction="column">
                            <Text as="p" color="gray" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
                                연초 대비 상승/하락 정도 표시
                            </Text>
                            <Text as="p" color="gray" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
                                stock 메뉴에서 적정 주가 확인 가능
                            </Text>
                        </Flex>
                    </Box>
                </Flex>
                <Grid columns="4" gap="0">
                    {/* <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-11"> */}
                    {mergedResult.length > 0 && mergedResult.map((item: any, i: any) => (
                        <Box key={i} className="border-b border-r" pb="0" ml="0" mb="0">
                            <Flex width="100%" gap="0" mb="0" align="center" className="!justify-center">
                                <Text weight={"bold"} className="text-[0.6rem] sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
                                    {item.latest.stock_name}
                                </Text>
                            </Flex>
                            <Flex width="100%" gap="0" mb="0" align="center" className="!justify-center">
                                {/* <Text
                                    className={`text-[0.4rem] sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl 
                                            rounded-full
                                            border
                                            ${Number(item.latest.stck_prpr) - Number(item.oldest.stck_prpr) >= 0 ? "border-red-50" : "border-teal-50"}`}
                                >
                                    {((Number(item.latest.stck_prpr) - Number(item.oldest.stck_prpr)) / Number(item.latest.stck_prpr) * 100).toFixed(2)}%
                                </Text> */}
                                <Badge color={`${Number(item.latest.stck_prpr) - Number(item.oldest.stck_prpr) >= 0 ? "red" : "teal"}`} radius="full">
                                    {((Number(item.latest.stck_prpr) - Number(item.oldest.stck_prpr)) / Number(item.latest.stck_prpr) * 100).toFixed(2)}%
                                </Badge>
                            </Flex>
                            <Flex width="100%" gap="0" mb="0" align="center" className="!justify-center">
                                <Text className="text-[0.5rem] sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
                                    <Flex width="100%" direction="row" align="center" gap="1">
                                        {`${item.oldest.stck_prpr}원`}→{`${item.latest.stck_prpr}원`}
                                    </Flex>
                                </Text>
                            </Flex>
                            <Text color="gray" mb="0" className="text-[0.4rem] sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
                                <Flex width="100%" direction="row" align="center" gap="1" className="!justify-center">
                                    {`${item.oldest.time_stamp.slice(0, 10)}`}→{`${item.latest.time_stamp.slice(5, 10)}`}
                                </Flex>
                            </Text>
                        </Box>
                    ))}
                    {/* </div> */}
                </Grid>
            </Flex>
        </Flex >
    </>
}