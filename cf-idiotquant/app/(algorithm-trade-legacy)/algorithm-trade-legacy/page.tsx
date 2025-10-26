"use client"

import { DesignButton } from "@/components/designButton";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import { CapitalTokenType, QuantRule, reqGetQuantRule, reqGetQuantRuleDesc, reqGetUsCapitalToken, selectCapitalToken, selectInquirePriceMulti, selectQuantRule, selectQuantRuleDesc, selectUsCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { reqGetCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { getKoreaInvestmentToken, KoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import { useState, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";

import CountUp from '@/src/TextAnimations/CountUp/CountUp';
import GradientText from '@/src/TextAnimations/GradientText/GradientText';
import Loading from '@/components/loading';
import { Box, Flex, Text } from "@radix-ui/themes";

const DEBUG = false;

function MarketTabs({ setMarket }: { setMarket: (m: "KR" | "US") => void }) {
    return (
        <Tabs.Root defaultValue="KR" className="mx-1">
            <Tabs.List className="w-full flex bg-gray-300">
                <Tabs.Trigger
                    value="KR"
                    onClick={() => setMarket("KR")}
                    className="flex-1 p-1 text-white transition 
                     data-[state=active]:bg-blue-500 data-[state=active]:font-bold"
                >
                    KR
                </Tabs.Trigger>
                <Tabs.Trigger
                    value="US"
                    onClick={() => setMarket("US")}
                    className="flex-1 p-1 text-white transition 
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
    }, [kr_capital_token]);
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

    const example8TableHead: Example8TableHeadType[] = [
        {
            head: "",
        },
        {
            head: "종목명",
        },
        {
            head: "구매전 토큰",
        },
        {
            head: "구매가격",
        },
        {
            head: "개수",
        },
        {
            head: "구매후 토큰",
        },
        {
            head: "구매 날짜 및 시간",
        },
        {
            head: "buyOrSell",
        },
    ];

    function formatDateTime(date: string) {
        // console.log(`formatDateTime`, `date`, date);
        if (!!!date) {
            return "";
        }
        date = date.replaceAll("\"", "").replaceAll("-", "/");
        const dateArr = date.split("T");
        const dateArr2 = dateArr[1].split(".");
        return `${dateArr[0]} ${dateArr2[0]}`;
    }

    function getCumulateTokenArray() {
        const capitalToken = "KR" == market ? kr_capital_token : us_capital_token;
        const purchase_log = capitalToken.value.purchase_log ?? [];
        let cumulateToken = 0
        const cumulateTokenArray = purchase_log.map((entry: any) => {
            cumulateToken += entry.stock_list.reduce((sum: any, stock: any) => sum + Number(stock.remaining_token), 0);
            return Number(cumulateToken).toFixed(0);
        }
        );
        // console.log(`cumulateTokenArray`, cumulateTokenArray);
        return cumulateTokenArray;
    }

    let cummulative_investment = 0;
    let cummulative_investment_sell = 0;

    const capitalToken = "KR" == market ? kr_capital_token : us_capital_token;
    const purchase_log = capitalToken.value.purchase_log ?? [];
    if (DEBUG) console.log(`purchase_log`, purchase_log);
    let example8TableRow: Example8TableRowType[] = (purchase_log.slice(-60).map((item: any, index: number) => {
        const bgColor = index % 2 == 0 ? "bg-white" : "bg-gray-100";
        return item["stock_list"].map((subItem: any) => {
            const frst_bltn_exrt = "KR" == market ? 1 : capitalToken.value.frst_bltn_exrt;
            const investment = (subItem["stck_prpr"] * subItem["ORD_QTY"] * frst_bltn_exrt);
            if ("buy" == (subItem["buyOrSell"] ?? "buy")) {
                cummulative_investment += investment;
            }
            else {
                cummulative_investment_sell += investment;
            }

            return {
                id: item["time_stamp"] + subItem["stock_name"], // key
                column_2: <div className="text-xs">{subItem["stock_name"]}</div>,
                column_3: <div className="text-xs">{subItem["remaining_token"]}</div>,
                column_4: <>
                    <div className="text-xs">
                        {Number(subItem["stck_prpr"]).toLocaleString() + " "}<span className="text-[0.6rem]">{market == "KR" ? "KRW" : `USD (${Number(Number(subItem["stck_prpr"]) * capitalToken.value.frst_bltn_exrt).toFixed(0)} KRW)`}</span>
                    </div>
                </>,
                expectedRateOfReturnColor: '', // x
                column_5: <div className="text-xs">{subItem["ORD_QTY"]}</div>,
                column_6: <div className="text-xs">{Number(subItem["remaining_token"] - investment).toFixed(0)}</div>,
                column_7: <div className="text-xs">{formatDateTime(item["time_stamp"])}</div>,
                column_8: <div className="text-xs">{subItem["buyOrSell"] ?? "buy"}</div>,
                bgColor: bgColor,
            }
        })
    })).reverse().flat();

    if (DEBUG) console.log(`capitalToken.state`, capitalToken.state);

    const time_stamp: any = capitalToken.value.time_stamp ?? {};
    const stock_list: any = capitalToken.value.stock_list ?? [];
    const refill_stock_index = capitalToken.value.refill_stock_index ?? 0;
    const token_per_stock = capitalToken.value.token_per_stock ?? 0;
    if (DEBUG) console.log(`stock_list`, stock_list);
    let cummulative_token = 0;
    let exclude_count = 0;
    let exclude_token = 0;
    const props: TablesExample8PropsType = {
        title: <>
            <div className="flex items-center p-2">
                <DesignButton
                    handleOnClick={() => {
                        handleOnClick()
                    }}
                    buttonName={`refresh data`}
                    buttonBgColor="bg-white dark:bg-black"
                    buttonBorderColor="border-gray-500"
                    buttonShadowColor="#D5D5D5"
                    textStyle="text-black dark:text-white text-xs"
                    buttonStyle={`rounded-lg px-2 py-1 flex items-center justify-center mb-2 button bg-white cursor-pointer select-none
                                       active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                                       transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]
                                       `}
                />
                <MarketTabs setMarket={setMarket} />
                {"fulfilled" != capitalToken.state ?
                    <Loading />
                    : <>
                        <div className="text-[0.6rem] text-black dark:text-white ml-1">{time.toLocaleString("en-US", { timeZone: "Asia/Seoul" })}</div>
                    </>}
            </div>
        </>,
        desc: <>
            <Box p="2" className="dark:border-gray-700 border rounded-lg shadow">
                {/* <div className="text-xl">
                    Trading Strategy
                </div>
                <table className="text-[0.5rem] border-none border-gray-300 w-full text-left">
                    <thead>
                        <tr>
                            {Object.keys(quant_rule.value).map((key) => {
                                const typedKey = key as keyof QuantRuleValue;
                                return (
                                    <th key={key} className="border py-1 text-center">
                                        <RulePopover keyLabel={key} value={quant_rule.value[typedKey]} desc={quant_rule_desc.value[typedKey] ?? "설명 없음"} />
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {Object.keys(quant_rule.value).map((key) => {
                                const typedKey = key as keyof QuantRuleValue;
                                return (
                                    <td key={key} className="text-center border py-1">
                                        <RulePopover keyLabel={key} value={quant_rule.value[typedKey]} desc={quant_rule_desc.value[typedKey] ?? "설명 없음"} />
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table> */}
                <Box p="2">
                    <Flex direction="column" className="dark:text-white">
                        <Text size="2">
                            Total Algorithmic Buys
                        </Text>
                        <div className="flex flex-col justify-end items-end">
                            <div className="">{market == "KR" ?
                                <GradientText
                                    colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                    animationSpeed={3}
                                    showBorder={false}
                                ><CountUp
                                        from={0}
                                        to={Number(Number(cummulative_investment).toFixed(0))}
                                        separator=","
                                        direction="up"
                                        duration={1}
                                        className="count-up-text"
                                    /> KRW
                                </GradientText>
                                : <GradientText
                                    colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                    animationSpeed={3}
                                    showBorder={false}
                                >
                                    <CountUp
                                        from={0}
                                        to={Number(Number(cummulative_investment).toFixed(0))}
                                        separator=","
                                        direction="up"
                                        duration={2}
                                        className="count-up-text"
                                    /> KRW</GradientText>
                            }</div>
                            {market == "KR" ? <></>
                                : <Text size="1"><GradientText
                                    colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                    animationSpeed={3}
                                    showBorder={false}
                                ><CountUp
                                        from={0}
                                        to={Number(Number(Number(cummulative_investment) / Number(us_capital_token.value.frst_bltn_exrt)).toFixed(3))}
                                        separator=","
                                        direction="up"
                                        duration={1}
                                        className="count-up-text"
                                    /> USD</GradientText></Text>}
                        </div>
                        {/* <div className="dark:border-gray-700 border flex-1 rounded-lg px-2 pb-1 mx-1 mb-2 shadow">
                        <div className="text-[0.6rem]">Total Algorithmic Sells</div>
                        <div className="flex flex-col justify-end items-end">
                            <div className="">{market == "KR" ? `${Number(Number(cummulative_investment_sell).toFixed(0)).toLocaleString()} KRW` : `${Number(Number(cummulative_investment_sell).toFixed(0)).toLocaleString()} KRW`}</div>
                            <div className="text-[0.6rem]">{market == "KR" ? "" : `(${Number(Number(cummulative_investment_sell) / Number(us_capital_token.value.frst_bltn_exrt)).toFixed(3)} USD)`}</div>
                        </div>
                    </div> */}
                    </Flex>
                </Box>
                {/* <div className={`flex gap-2`}>
                    <div className="dark:bg-gray-200 bg-white w-full border rounded-lg mx-1">
                        <LineChart
                            data_array={getLineDataArray()}
                            category_array={getCategoryArray()}
                            type={"area"}
                            height={110}
                        />
                    </div>
                </div> */}
            </Box>
        </>,
        financial_date: <></>,
        market_date: < >
            <Box p="2" className="dark:border-gray-700 border rounded-lg shadow">
                <Text>
                    Stock Purchase Point Accumulation History
                </Text>
                <Flex direction="column">
                    {Object.keys(time_stamp).reverse().map((key) => {
                        return <>
                            <Flex key={key} px="2" mx="2" className="dark:border-gray-700 border rounded-lg shadow">
                                <Box minWidth="160px">
                                    <Text size="1">{key == "prevPrev" ? "Two Periods Ago" : (key == "prev" ? "Previous Period" : "Current Data")}</Text>
                                </Box>
                                <Box>
                                    <Text size="1">{formatDateTime(time_stamp[key])}</Text>
                                </Box>
                            </Flex>
                        </>
                    })}
                </Flex>
            </Box>
            <Box p="2" className="dark:border-gray-700 border rounded-lg shadow">
                <Text>
                    Current Stock Purchase Points
                </Text>
                <Flex direction="column">
                    <Flex direction="row" px="1" mx="1" gap="1" className="dark:border-gray-700 border rounded-lg shadow">
                        <Box minWidth="180px">
                            <Text size="1">Points per stock</Text>
                        </Box>
                        <Box>
                            <Text size="1">{token_per_stock} point / 10 min</Text>
                        </Box>
                    </Flex>
                    <Flex direction="row" px="1" mx="1" gap="1" className="dark:border-gray-700 border rounded-lg shadow">
                        <Box minWidth="180px">
                            <Text size="1">Next Stock to Attempt Purchase</Text>
                        </Box>
                        <Box>
                            <Text size="1">{refill_stock_index}) {!!stock_list[refill_stock_index] ? stock_list[refill_stock_index]["name"] : 0}</Text>
                        </Box>
                    </Flex>
                </Flex>
            </Box>
            <Box p="2" className="dark:border-gray-700 border rounded-lg shadow">
                <Text>
                    <div>Stocks Targeted for Algorithmic Trading</div>
                </Text>
                <div className="rounded px-2 pb-1 m-2 shadow">
                    <Box>
                        {stock_list.map((item: any, index: number) => {
                            const token = isNaN(Number(item["token"])) ? 0 : Number(item["token"]);
                            cummulative_token += token;
                            exclude_count += item["refill"] ? 0 : 1;
                            exclude_token += item["refill"] ? 0 : token;
                            return <div key={index} className={`flex justify-between gap-x-1 px-1 text-xs ${index % 2 == 0 ? "bg-white" : "bg-gray-100"} ${item["refill"] ? "" : "line-through"} `}>
                                <div className="font-mono min-w-10 text-right">
                                    {String(index).padStart(3, "0")}
                                </div>
                                {/* <div className={`min-w-28 ${item["name"].length >= 8 ? "text-[0.6rem]" : (item["name"].length >= 7 ? "text-[0.7rem]" : "text-xs")}`}> */}
                                <div className={`min-w-32`}>
                                    {item["name"]}
                                </div>
                                <div className="min-w-12 text-right">
                                    {item["token"]}
                                </div>
                                <div className="min-w-12 text-right">
                                    {item["action"]}
                                </div>
                            </div>
                        })}
                    </Box>
                    <Flex direction="column" justify="between" p="1" align="start" className="dark:text-white">
                        <Box>
                            <Flex direction="row" justify="between" gap="1">
                                <Box minWidth="160px">
                                    <Text size="1">Number of Stocks</Text>
                                </Box>
                                <Box>
                                    <Text size="1">{stock_list.length - exclude_count} / {stock_list.length}</Text>
                                </Box>
                            </Flex>
                        </Box>
                        <Box>
                            <Flex direction="row" justify="between" gap="1">
                                <Box minWidth="160px">
                                    <Text size="1">Total Points Accumulated</Text>
                                </Box>
                                <Box>
                                    <Text size="1">{cummulative_token - exclude_token} / {cummulative_token}</Text>
                                </Box>
                            </Flex>
                        </Box>
                    </Flex>
                </div >
            </Box >
        </>,
        tableHead: example8TableHead,
        tableRow: example8TableRow,
        visibleCount: visibleCount,
        setVisibleCount: setVisibleCount,
    }

    // console.log(`example8TableRow`, example8TableRow);
    if (DEBUG) console.log(`purchase_log`, purchase_log);

    return <>
        <TablesExample8 {...props} />
        <div className="dark:bg-black h-lvh"></div>
    </>
}