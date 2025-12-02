"use client"

import { DesignButton } from "@/components/designButton";
import TableTemplate, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import { CapitalTokenType, PurchaseLogType, QuantRule, reqGetKrPurchaseLogLatest, reqGetQuantRule, reqGetQuantRuleDesc, reqGetUsCapitalToken, selectCapitalToken, selectInquirePriceMulti, selectkrPurchaseLogLatest, selectQuantRule, selectQuantRuleDesc, selectUsCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { reqGetCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { getKoreaInvestmentToken, KoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import { useState, useEffect, useRef } from "react";
import * as Tabs from "@radix-ui/react-tabs";

import CountUp from '@/src/TextAnimations/CountUp/CountUp';
import GradientText from '@/src/TextAnimations/GradientText/GradientText';
import { Badge, Box, Button, Flex, Grid, Spinner, Text } from "@radix-ui/themes";

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

export default function AlgorithmTradeLegacy() {
    const dispatch = useAppDispatch();

    const kr_capital_token: CapitalTokenType = useAppSelector(selectCapitalToken);
    const krPurchaseLogLatest: PurchaseLogType = useAppSelector(selectkrPurchaseLogLatest);

    const us_capital_token: CapitalTokenType = useAppSelector(selectUsCapitalToken);
    const inquirePriceMulti: any = useAppSelector(selectInquirePriceMulti);
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    // const quant_rule: QuantRule = useAppSelector(selectQuantRule);
    // const quant_rule_desc: QuantRule = useAppSelector(selectQuantRuleDesc);

    const [time, setTime] = useState<any>('');
    const [market, setMarket] = useState<"KR" | "US">("KR");
    const [visibleCount, setVisibleCount] = useState(0);

    function handleOnClick() {
        setTime(new Date());
        if (DEBUG) console.log(`[handleOnClick] kiToken`, kiToken);
        dispatch(reqGetCapitalToken());
        dispatch(reqGetUsCapitalToken());
        dispatch(reqGetKrPurchaseLogLatest());
    }

    useEffect(() => {
        // dispatch(reqGetQuantRule());
        // dispatch(reqGetQuantRuleDesc());
        handleOnClick();
    }, []);
    useEffect(() => {
        if (DEBUG) console.log(`kr_capital_token`, kr_capital_token);
    }, [kr_capital_token]);
    useEffect(() => {
        if (DEBUG) console.log(`krPurchaseLogLatest`, krPurchaseLogLatest);
    }, [krPurchaseLogLatest]);

    useEffect(() => {
        if (DEBUG) console.log(`us_capital_token`, us_capital_token);
    }, [us_capital_token]);
    useEffect(() => {
        if (DEBUG) console.log(`kiToken`, kiToken);
    }, [kiToken]);
    // useEffect(() => {
    //     if (DEBUG) console.log(`quant_rule`, quant_rule);
    // }, [quant_rule]);
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

    function yyyymmddhhmiss(d: Date) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        const ss = String(d.getSeconds()).padStart(2, "0");

        return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    }


    let cummulative_investment = 0;
    let cummulative_investment_sell = 0;

    const capitalToken = "KR" == market ? kr_capital_token : us_capital_token;
    // const purchase_log = capitalToken.value.purchase_log ?? [];
    const purchase_log = "KR" == market ? krPurchaseLogLatest.value : [];
    // const purchase_log: Example8TableRowType[] = [];
    if (DEBUG) console.log(`purchase_log`, purchase_log);
    // purchase_log.slice(-60) 에서 -60은 일자가 아님.
    // let example8TableRow: Example8TableRowType[] = (purchase_log.map((item: any, index: number) => {
    //     const bgColor = index % 2 == 0 ? "bg-white" : "bg-gray-100";
    //     return item["stock_list"].map((subItem: any) => {
    //         const frst_bltn_exrt = "KR" == market ? 1 : capitalToken.value.frst_bltn_exrt;
    //         const investment = (Number(subItem["stck_prpr"]) * Number(subItem["ORD_QTY"]) * Number(frst_bltn_exrt));
    //         if ("buy" == (subItem["buyOrSell"] ?? "buy")) {
    //             cummulative_investment += investment;
    //         }
    //         else {
    //             cummulative_investment_sell += investment;
    //         }

    //         return {
    //             id: item["time_stamp"] + subItem["stock_name"], // key
    //             column_2: <div className="text-xs">{subItem["stock_name"]}</div>,
    //             column_3: <div className="text-xs">{subItem["remaining_token"]}</div>,
    //             column_4: <>
    //                 <div className="text-xs">
    //                     {market == "KR" ? "₩" : "$"}{Number(subItem["stck_prpr"]).toLocaleString() + " "}<span className="text-[0.6rem]">{market == "KR" ? "" : `(₩${Number(Number(subItem["stck_prpr"]) * capitalToken.value.frst_bltn_exrt).toFixed(0)})`}</span>
    //                 </div>
    //             </>,
    //             expectedRateOfReturnColor: '', // x
    //             column_5: <div className="text-xs">{subItem["ORD_QTY"]}</div>,
    //             column_6: <div className="text-xs">{Number(subItem["remaining_token"] - investment).toFixed(0)}</div>,
    //             column_7: <div className="text-xs">{formatDateTime(item["time_stamp"])}</div>,
    //             column_8: <div className="text-xs">{subItem["buyOrSell"] ?? "buy"}</div>,
    //             bgColor: bgColor,
    //         }
    //     })
    // })).reverse().flat();
    let example8TableRow: Example8TableRowType[] = purchase_log.map((subItem: any, index: number) => {
        const bgColor = index % 2 == 0 ? "bg-white" : "bg-gray-100";

        const frst_bltn_exrt = "KR" == market ? 1 : capitalToken.value.frst_bltn_exrt;
        const investment = (Number(subItem["stck_prpr"]) * Number(subItem["ORD_QTY"]) * Number(frst_bltn_exrt));
        if ("buy" == (subItem["buyOrSell"] ?? "buy")) {
            cummulative_investment += investment;
        }
        else {
            cummulative_investment_sell += investment;
        }

        return {
            id: subItem["key"], // key
            column_2: <div className="text-xs">{subItem["stock_name"]}</div>,
            column_3: <div className="text-xs">{subItem["remaining_token"]}</div>,
            column_4: <>
                <div className="text-xs">
                    {market == "KR" ? "₩" : "$"}{Number(subItem["stck_prpr"]).toLocaleString() + " "}<span className="text-[0.6rem]">{market == "KR" ? "" : `(₩${Number(Number(subItem["stck_prpr"]) * capitalToken.value.frst_bltn_exrt).toFixed(0)})`}</span>
                </div>
            </>,
            expectedRateOfReturnColor: '', // x
            column_5: <div className="text-xs">{subItem["ORD_QTY"]}</div>,
            column_6: <div className="text-xs">{Number(subItem["remaining_token"] - investment).toFixed(0)}</div>,
            column_7: <div className="text-xs">{yyyymmddhhmiss(new Date(Number(subItem["key"]?.split(":").pop() ?? 0)))}</div>,
            column_8: <div className="text-xs">{subItem["buyOrSell"] ?? "buy"}</div>,
            bgColor: bgColor,
        }
    }).flat();

    if (DEBUG) console.log(`capitalToken.state`, capitalToken.state);

    const time_stamp: any = capitalToken.value.time_stamp ?? {};
    const stock_list: any = capitalToken.value.stock_list ?? [];
    const refill_stock_index = capitalToken.value.refill_stock_index ?? 0;
    const token_per_stock = capitalToken.value.token_per_stock ?? 0;
    if (DEBUG) console.log(`stock_list`, stock_list);
    let cummulative_token = 0;
    let exclude_count = 0;
    let exclude_token = 0;

    const tokenList = stock_list.map((item: any, index: number) => {
        const token = isNaN(Number(item["token"])) ? 0 : Number(item["token"]);
        cummulative_token += token;
        exclude_count += item["refill"] ? 0 : 1;
        exclude_token += item["refill"] ? 0 : token;
        let badgeColor: "ruby" | "gray" | "gold" | "bronze" | "brown" | "yellow" | "amber" | "orange" | "tomato" | "red" | "crimson" | "pink" | "plum" | "purple" | "violet" | "iris" | "indigo" | "blue" | "cyan" | "teal" | "jade" | "green" | "grass" | "lime" | "mint" | "sky" | undefined
            = "gray";

        if (item["refill"]) {
            if (item["token"] >= 200000) {
                badgeColor = "pink";
            }
            else if (item["token"] >= 100000) {
                badgeColor = "ruby";
            }
            else if (item["token"] >= 70000) {
                badgeColor = "amber";
            }
            else if (item["token"] >= 50000) {
                badgeColor = "yellow";
            }
            else if (item["token"] >= 30000) {
                badgeColor = "grass";
            }
            else if (item["token"] >= 20000) {
                badgeColor = "sky";
            }
            else if (item["token"] >= 10000) {
                badgeColor = "green";
            }
            else if (item["token"] >= 5000) {
                badgeColor = "bronze";
            }
        }
        return <div key={index}>
            <Box className="border-b border-r border-gray-300">
                <Flex direction="column" key={index}
                // className={`!justify-between text-xs ${index % 2 == 0 ? "bg-white" : "bg-gray-100"} ${item["refill"] ? "" : "line-through"} `}
                >
                    <Text align={"center"} className="text-[0.5rem]">
                        {item["action"]}
                    </Text>
                    <Text align={"center"} className="text-[0.6rem]">
                        {String(index).padStart(3, "0")}
                    </Text>
                    {/* <div className={`min-w-28 ${item["name"].length >= 8 ? "text-[0.6rem]" : (item["name"].length >= 7 ? "text-[0.7rem]" : "text-xs")}`}> */}
                    <Text align={"center"} className="text-[0.6rem]">
                        {item["name"]}
                    </Text>
                    <Flex width="100%" gap="0" mb="0" align="center" className="!justify-center">
                        <Badge color={badgeColor} radius="full" className={`${item["refill"] ? "" : "line-through"}`}>
                            {item["token"]}
                        </Badge>
                    </Flex>
                </Flex>
            </Box>
        </div>
    });
    const props: TablesExample8PropsType = {
        title: <>
            <Flex p="2" className="!items-center">
                <Button onClick={() => handleOnClick()}>refresh data</Button>
                <MarketTabs setMarket={setMarket} />
                {"fulfilled" != capitalToken?.state ?
                    // <Spinner loading />
                    <></>
                    : <>
                        <Text className="text-[0.6rem] text-black dark:text-white ml-1">{time.toLocaleString("en-US", { timeZone: "Asia/Seoul" })}</Text>
                    </>}
            </Flex>
        </>,
        desc: <>
            <Box p="2" className="dark:border-gray-700 border shadow">
                <Box p="2">
                    <Flex direction="column" className="dark:text-white">
                        <Text size="3">
                            Total Algorithmic Buys
                        </Text>
                        <div className="flex flex-col justify-end items-end">
                            <div className="">{market == "KR" ?
                                <Flex direction="column" gap="1" align="end">
                                    <Box>
                                        <Flex gap="1" align="end">
                                            <Text>BUY:</Text>
                                            <Text>₩</Text>
                                            <GradientText
                                                colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                                animationSpeed={3}
                                                showBorder={false}
                                            >
                                                <CountUp
                                                    from={0}
                                                    to={Number(Number(cummulative_investment).toFixed(0))}
                                                    separator=","
                                                    direction="up"
                                                    duration={1}
                                                    className="count-up-text"
                                                />
                                            </GradientText>
                                        </Flex>
                                    </Box>
                                    <Flex gap="1" align="end">
                                        <Text>SELL:</Text>
                                        <Text>₩</Text>
                                        <CountUp
                                            from={0}
                                            to={Number(Number(cummulative_investment_sell).toFixed(0))}
                                            separator=","
                                            direction="up"
                                            duration={1}
                                            className="count-up-text"
                                        />
                                    </Flex>
                                </Flex>
                                : <GradientText
                                    colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                    animationSpeed={3}
                                    showBorder={false}
                                >
                                    ₩<CountUp
                                        from={0}
                                        to={Number(Number(cummulative_investment).toFixed(0))}
                                        separator=","
                                        direction="up"
                                        duration={2}
                                        className="count-up-text"
                                    /></GradientText>
                            }</div>
                            {market == "KR" ? <></>
                                : <Text size="1"><GradientText
                                    colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                    animationSpeed={3}
                                    showBorder={false}
                                >$<CountUp
                                        from={0}
                                        to={Number(Number(Number(cummulative_investment) / Number(us_capital_token.value.frst_bltn_exrt)).toFixed(3))}
                                        separator=","
                                        direction="up"
                                        duration={1}
                                        className="count-up-text"
                                    /></GradientText></Text>}
                        </div>
                    </Flex>
                </Box >
            </Box >
        </>,
        financial_date: <></>,
        market_date: < >
            <Box p="0" className="dark:border-gray-700 border shadow">
                <Text>
                    Stock Purchase Point Accumulation History
                </Text>
                <Flex direction="row" gap="1" align="center" className="!justify-between">
                    {Object.keys(time_stamp).reverse().map((key, index) => {
                        return <div key={index}>
                            <Flex direction="column" p="1" align="center" className="dark:border-gray-700 border rounded-lg shadow">
                                <Text className="text-[0.6rem]">{key == "prevPrev" ? "Two Periods Ago" : (key == "prev" ? "Previous Period" : "Current Data")}</Text>
                                <Text className="text-[0.5rem]">{formatDateTime(time_stamp[key])}</Text>
                            </Flex>
                        </div>
                    })}
                </Flex>
            </Box>
            <Box p="0" className="dark:border-gray-700 border rounded-lg shadow">
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
            <Box p="0" className="dark:border-gray-700 border rounded-lg shadow">
                <Text>Stocks Targeted for Algorithmic Trading
                </Text>
                <div className="rounded shadow">
                    <Flex direction="column" justify="between" p="1" align="start">
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
                    <Grid columns="4" gap="0">
                        {tokenList}
                    </Grid>
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
        <TableTemplate {...props} />
        <div className="dark:bg-black h-lvh"></div>
    </>
}