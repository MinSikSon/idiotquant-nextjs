"use client"

import { DesignButton } from "@/components/designButton";
import LineChart from "@/components/LineChart";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import { CapitalTokenType, QuantRule, QuantRuleValue, reqGetQuantRule, reqGetQuantRuleDesc, reqGetUsCapitalToken, selectCapitalToken, selectInquirePriceMulti, selectQuantRule, selectQuantRuleDesc, selectUsCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { reqGetCapitalToken, reqGetInquirePriceMulti } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { getKoreaInvestmentToken, KoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, ButtonGroup, Spinner, Switch, Tabs, Typography } from "@material-tailwind/react";
import React from "react";

import {
    Popover,
} from "@material-tailwind/react";

const DEBUG = false;

export default function AlgorithmTrade() {
    const dispatch = useAppDispatch();

    const kr_capital_token: CapitalTokenType = useAppSelector(selectCapitalToken);
    const us_capital_token: CapitalTokenType = useAppSelector(selectUsCapitalToken);
    const inquirePriceMulti: any = useAppSelector(selectInquirePriceMulti);
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const quant_rule: QuantRule = useAppSelector(selectQuantRule);
    const quant_rule_desc: QuantRule = useAppSelector(selectQuantRuleDesc);

    const [time, setTime] = React.useState<any>('');

    const [market, setMarket] = React.useState<"KR" | "US">("KR");

    const [visibleCount, setVisibleCount] = React.useState(50);

    function handleOnClick() {
        setTime(new Date());
        if (DEBUG) console.log(`[handleOnClick] kiToken`, kiToken);
        dispatch(reqGetCapitalToken({ koreaInvestmentToken: kiToken }));
        dispatch(reqGetUsCapitalToken({ koreaInvestmentToken: kiToken }));
    }

    React.useEffect(() => {
        dispatch(reqGetQuantRule());
        dispatch(reqGetQuantRuleDesc());
        handleOnClick();
    }, []);

    React.useEffect(() => {
        if (DEBUG) console.log(`kr_capital_token`, kr_capital_token);
        if (DEBUG) console.log(`us_capital_token`, us_capital_token);
        if (DEBUG) console.log(`kiToken`, kiToken);
        if (DEBUG) console.log(`quant_rule`, quant_rule);

        // if ("fulfilled" == kiToken.state) {
        //     if ("fulfilled" == kr_capital_token.state && kr_capital_token.value.stock_list.length > 0) {
        //         const PDNOs = kr_capital_token.value.stock_list.map((item: any) => item.PDNO);
        //         const filteredPDNOs = PDNOs.filter((item: any) => {
        //             if (undefined == inquirePriceMulti[item]) {
        //                 return true;
        //             }

        //             if (1 == inquirePriceMulti[item].rt_cd) // fail
        //             {
        //                 return true;
        //             }

        //             return false;
        //         });

        //         const chunkSize = 20;
        //         for (let i = 0; i < filteredPDNOs.length; i += chunkSize) {
        //             const chunk = filteredPDNOs.slice(i, i + chunkSize);
        //             console.log(`Dispatching filteredPDNOs:`, chunk);

        //             dispatch(reqGetInquirePriceMulti({ koreaInvestmentToken: kiToken, PDNOs: chunk }));
        //         }
        //     }
        // }
    }, [kr_capital_token, us_capital_token, kiToken]);

    React.useEffect(() => {
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

    function getCumulatePurchaseArray() {
        const capitalToken = "KR" == market ? kr_capital_token : us_capital_token;
        const purchase_log = capitalToken.value.purchase_log ?? [];
        let cumulatePurchase = 0
        const cumulatePurchaseArray = purchase_log.map((entry: any) => {
            cumulatePurchase += entry.stock_list.reduce((sum: any, stock: any) => {
                return sum + (Number(stock.stck_prpr) * Number(stock.ORD_QTY)) * (stock.buyOrSell == "sell" ? -1 : 1) * (market == "KR" ? 1 : capitalToken.value.frst_bltn_exrt);
            }, 0);
            return Number(cumulatePurchase).toFixed(0);
        }
        );
        // console.log(`cumulatePurchaseArray`, cumulatePurchaseArray);
        return cumulatePurchaseArray;
    }

    function getLineDataArray() {
        return [
            {
                name: "누적 포인트",
                // data: test_data.stock_list.map((stock: any) => stock.remaining_token),
                // data: [10, 20, 30, 40, 50, 60, 70, 80, 90],
                data: getCumulateTokenArray(),
                color: "#FF4560",
            },
            {
                name: "매수 - 매도",
                // data: test_data.stock_list.map((stock: any) => stock.stck_prpr * stock.ORD_QTY),
                // data: [50, 60, 70, 80, 90, 10, 20, 30, 40],
                data: getCumulatePurchaseArray(),
                color: "#0088CC",
            },
            // {
            //     name: "Sales_b",
            //     data: [350, 200, 230, 500, 50, 40, 300, 320, 500],
            // },
        ];
    }

    function getCategoryArray() {
        const capitalToken = "KR" == market ? kr_capital_token : us_capital_token;
        const purchase_log = capitalToken.value.purchase_log ?? [];
        return purchase_log.map((entry: any) => entry.time_stamp);
    }

    let cummulative_investment = 0;
    let cummulative_investment_sell = 0;

    const capitalToken = "KR" == market ? kr_capital_token : us_capital_token;
    const purchase_log = capitalToken.value.purchase_log ?? [];
    if (DEBUG) console.log(`purchase_log`, purchase_log);
    let example8TableRow: Example8TableRowType[] = (purchase_log.map((item: any, index: number) => {
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
                        {Number(subItem["stck_prpr"]).toLocaleString() + " "}<span className="text-[0.6rem]">{market == "KR" ? "원" : `USD (${Number(Number(subItem["stck_prpr"]) * capitalToken.value.frst_bltn_exrt).toFixed(0)} 원)`}</span>
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
    // if ("fulfilled" != capitalToken.state) {
    //     return <Button variant="ghost"><Spinner size="sm" /> loading...</Button>;
    // }

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
                    buttonName={`알고리즘 투자 이력 조회`}
                    buttonBgColor="bg-white dark:bg-black"
                    buttonBorderColor="border-gray-500"
                    buttonShadowColor="#D5D5D5"
                    textStyle="text-black dark:text-white text-xs"
                    buttonStyle={`rounded-lg px-2 py-1 flex items-center justify-center mb-2 button bg-white cursor-pointer select-none
                                       active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                                       transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]
                                       `}
                />
                <Tabs defaultValue="KR" className="mx-1">
                    <Tabs.List className="w-full bg-gray-300 py-0">
                        <Tabs.Trigger className="w-full p-1 text-white" value="KR" onClick={() => setMarket("KR")}>
                            KR
                        </Tabs.Trigger>
                        <Tabs.Trigger className="w-full p-1 text-white" value="US" onClick={() => setMarket("US")}>
                            US
                        </Tabs.Trigger>
                        <Tabs.TriggerIndicator className="bg-blue-500 p-1" />
                    </Tabs.List>
                </Tabs>
                {"fulfilled" != capitalToken.state ?
                    <Button variant="ghost"><Spinner size="sm" /> loading...</Button>
                    : <>
                        <div className="text-[0.6rem] text-black dark:text-white ml-1">{time.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</div>
                    </>}
            </div>
        </>,
        desc: <>
            <div className="dark:border-gray-700 border rounded-lg px-2 pb-1 m-2 shadow">
                <div className="text-xl">
                    알고리즘 매매 전략
                </div>
                <table className="text-[0.5rem] border-none border-gray-300 w-full text-left">
                    <thead>
                        <tr>
                            {Object.keys(quant_rule.value).map((key) => {
                                const typedKey = key as keyof QuantRuleValue;
                                return (
                                    <th key={key} className="border py-1 text-center">
                                        <Popover>
                                            <Popover.Trigger className="cursor-pointer">
                                                {key}
                                            </Popover.Trigger>
                                            <Popover.Content className="text-[0.6rem] p-2 bg-white dark:bg-gray-800 text-black dark:text-white shadow-xl rounded">
                                                <span className="font-bold">{key}(={quant_rule.value[typedKey]}): </span>{quant_rule_desc.value[typedKey] ?? "설명 없음"}
                                            </Popover.Content>
                                        </Popover>

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
                                        {quant_rule.value[typedKey]}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
                <div className="text-xl">
                    주식 거래 이력
                </div>
                <div className="flex">
                    <div className="dark:border-gray-700 border flex-1 rounded-lg px-2 pb-1 mx-1 mb-2 shadow">
                        <div className="text-[0.6rem]">누적 알고리즘 매수</div>
                        <div className="flex flex-col justify-end items-end">
                            <div className="">{market == "KR" ? `${Number(Number(cummulative_investment).toFixed(0)).toLocaleString()} 원` : `${Number(Number(cummulative_investment).toFixed(0)).toLocaleString()} 원`}</div>
                            <div className="text-[0.6rem]">{market == "KR" ? "" : `(${Number(Number(cummulative_investment) / Number(us_capital_token.value.frst_bltn_exrt)).toFixed(3)} USD)`}</div>
                        </div>
                    </div>
                    <div className="dark:border-gray-700 border flex-1 rounded-lg px-2 pb-1 mx-1 mb-2 shadow">
                        <div className="text-[0.6rem]">누적 알고리즘 매도</div>
                        <div className="flex flex-col justify-end items-end">
                            <div className="">{market == "KR" ? `${Number(Number(cummulative_investment_sell).toFixed(0)).toLocaleString()} 원` : `${Number(Number(cummulative_investment_sell).toFixed(0)).toLocaleString()} 원`}</div>
                            <div className="text-[0.6rem]">{market == "KR" ? "" : `(${Number(Number(cummulative_investment_sell) / Number(us_capital_token.value.frst_bltn_exrt)).toFixed(3)} USD)`}</div>
                        </div>
                    </div>
                </div>
                <div className={`flex gap-2`}>
                    <div className="dark:bg-gray-200 bg-white w-full border rounded-lg mx-1">
                        <LineChart
                            data_array={getLineDataArray()}
                            category_array={getCategoryArray()}
                            // type="bar"
                            type="line"
                            height={200}
                        />
                    </div>
                </div>
            </div>
        </>,
        financial_date: <></>,
        market_date: <div >
            <div className="dark:border-gray-700 border rounded-lg px-2 pb-1 m-2 shadow">
                <div className="text-xl">
                    <span className="underline decoration-4 decoration-yellow-100">주식 구매 포인트</span> 적립 이력
                </div>
                <div className="flex">
                    {Object.keys(time_stamp).reverse().map((key, index) => {
                        return <div key={index} className="dark:border-gray-700 border flex-1 rounded-lg px-2 pb-1 mx-1 mb-2 shadow">
                            <div className="text-[0.6rem]">{key}</div>
                            <div className="flex flex-col justify-end items-end">{formatDateTime(time_stamp[key])}</div>
                        </div>
                    })}
                </div>
            </div>
            <div className="dark:border-gray-700 border rounded-lg px-2 pb-1 m-2 shadow">
                <div className="text-xl">
                    <span className="underline decoration-4 decoration-yellow-100">주식 구매 포인트</span> 적립 현황
                </div>
                <div className="flex">
                    <div className="dark:border-gray-700 border flex-1 rounded-lg px-2 pb-1 mr-2 mx-1 shadow">
                        <div className="text-[0.6rem]">종목 당 충전 포인트</div>
                        <div className="flex flex-col justify-end items-end">{token_per_stock} point / 10 min</div>
                    </div>
                    <div className="dark:border-gray-700 border flex-1 rounded-lg px-2 pb-1 mr-2 mx-1 shadow">
                        <div className="text-[0.6rem]">다음 구매 시도 종목</div>
                        <div className="flex flex-col justify-end items-end">{refill_stock_index}) {!!stock_list[refill_stock_index] ? stock_list[refill_stock_index]["name"] : 0}</div>
                    </div>
                </div>
            </div>
            <div className="dark:border-gray-700 border rounded-lg px-2 pb-1 m-2 shadow">
                <div className="text-xl">
                    <div className="">알고리즘 매매 대상 종목</div>
                </div>
                <div className="rounded px-2 pb-1 m-2 shadow">
                    <div className="text-black leading-none">
                        {stock_list.map((item: any, index: number) => {
                            const token = isNaN(Number(item["token"])) ? 0 : Number(item["token"]);
                            cummulative_token += token;
                            exclude_count += item["refill"] ? 0 : 1;
                            exclude_token += item["refill"] ? 0 : token;
                            return <Popover key={index}>
                                <Popover.Trigger>
                                    <div className={`flex pl-1 items-center gap-x-1 ${index % 2 == 0 ? "bg-white" : "bg-gray-100"} ${item["refill"] ? "" : "font-bold line-through"}`}>
                                        <div className="flex items-center min-w-[115px] text-xs">
                                            <div>
                                                ({String(index).padStart(3, "0")}-
                                            </div>
                                            <div className={`${item["name"].length >= 8 ? "text-[0.6rem]" : (item["name"].length >= 7 ? "text-[0.7rem]" : "text-xs")}`}>
                                                {item["name"]}
                                            </div>
                                        </div>
                                        <div className="flex items-center min-w-[85px]">
                                            <div className="border rounded border-black p-0 text-[0.6rem]">
                                                포인트
                                            </div>
                                            <div className="ml-1 min-w-[50px] text-right text-xs">
                                                {item["token"]})
                                            </div>
                                        </div>
                                    </div>
                                </Popover.Trigger>
                                <Popover.Content className="p-2 border border-black dark:text-white rounded shadow shadow-blue-gray-500">
                                    {item["refill"] ?
                                        <div className="text-xs text-black dark:text-white">{`${item["name"]} 을(를) "${token_per_stock} token / 10 분" 만큼 리필`}</div>
                                        :
                                        <div className="text-xs text-black dark:text-white">{`${item["name"]} 을(를) 매매 대상에서 임시 제외`}</div>
                                    }
                                </Popover.Content>
                            </Popover>
                        })}
                    </div>
                    <div className="flex items-center text-xs text-black dark:text-white leading-none pb-1">
                        <div>종목 개수</div>
                        <div className="mx-1 mr-2 px-1 text-xs rounded border border-black border-white">{stock_list.length - exclude_count} / {stock_list.length}</div>
                        <div>누적 포인트</div>
                        <div className="mx-1 mr-2 px-1 text-xs rounded border border-black border-white">{cummulative_token - exclude_token} / {cummulative_token}</div>
                    </div>
                </div>
            </div>
        </div>,
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