"use client"

import { DesignButton } from "@/components/designButton";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import { selectCapitalToken, selectInquirePriceMulti } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { reqGetCapitalToken, reqGetInquirePriceMulti } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { getKoreaInvestmentToken, KoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, Popover, PopoverContent, PopoverHandler } from "@material-tailwind/react";
import React from "react";

export default function AlgorithmTrade() {
    const dispatch = useAppDispatch();

    const capitalToken: any = useAppSelector(selectCapitalToken);
    const inquirePriceMulti: any = useAppSelector(selectInquirePriceMulti);
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);

    const [time, setTime] = React.useState<any>('');

    function handleOnClick() {
        setTime(new Date());
        // console.log(`[handleOnClick] kiToken`, kiToken);
        dispatch(reqGetCapitalToken({ koreaInvestmentToken: kiToken }));
    }

    React.useEffect(() => {
        handleOnClick();
    }, []);

    React.useEffect(() => {
        console.log(`capitalToken`, capitalToken);
        console.log(`kiToken`, kiToken);

        if ("fulfilled" == kiToken.state && "fulfilled" == capitalToken.state && capitalToken.value.stock_list.length > 0) {
            const PDNOs = capitalToken.value.stock_list.map((item: any) => item.PDNO);
            const filteredPDNOs = PDNOs.filter((item: any) => {
                if (undefined == inquirePriceMulti[item]) {
                    return true;
                }

                if (1 == inquirePriceMulti[item].rt_cd) // fail
                {
                    return true;
                }

                return false;
            });

            const chunkSize = 20;
            for (let i = 0; i < filteredPDNOs.length; i += chunkSize) {
                const chunk = filteredPDNOs.slice(i, i + chunkSize);
                console.log(`Dispatching filteredPDNOs:`, chunk);

                dispatch(reqGetInquirePriceMulti({ koreaInvestmentToken: kiToken, PDNOs: chunk }));
            }
        }
    }, [capitalToken, kiToken]);

    React.useEffect(() => {
        // console.log(`inquirePriceMulti`, inquirePriceMulti);
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
        date = date.replaceAll("\"", "").replaceAll("-", "/");
        const dateArr = date.split("T");
        const dateArr2 = dateArr[1].split(".");
        return `${dateArr[0]} ${dateArr2[0]}`;
    }

    let cummulative_investment = 0;
    const purchase_log = capitalToken.value.purchase_log ?? [];
    // console.log(`purchase_log`, purchase_log);
    let example8TableRow: Example8TableRowType[] = (purchase_log.map((item: any, index: number) => {
        const bgColor = index % 2 == 0 ? "bg-white" : "bg-gray-100";
        return item["stock_list"].map((subItem: any) => {
            const investment = (subItem["stck_prpr"] * subItem["ORD_QTY"]);
            cummulative_investment += investment;
            return {
                id: item["time_stamp"] + subItem["stock_name"], // key
                column_2: <div className="text-xs">{subItem["stock_name"]}</div>,
                column_3: <div className="text-xs">{subItem["remaining_token"]}</div>,
                column_4: <div className="text-xs">{Number(subItem["stck_prpr"]).toLocaleString() + "원"}</div>,
                expectedRateOfReturnColor: '', // x
                column_5: <div className="text-xs">{subItem["ORD_QTY"]}</div>,
                column_6: <div className="text-xs">{subItem["remaining_token"] - investment}</div>,
                column_7: <div className="text-xs">{formatDateTime(item["time_stamp"])}</div>,
                column_8: <div className="text-xs">{subItem["buyOrSell"] ?? "buy"}</div>,
                bgColor: bgColor,
            }
        })
    })).reverse().flat();

    const time_stamp: any = capitalToken.value.time_stamp ?? {};
    const stock_list: any = capitalToken.value.stock_list ?? [];
    const refill_stock_index = capitalToken.value.refill_stock_index ?? 0;
    const stock_list_length = stock_list.length > 0 ? stock_list.length : 1;
    const capital_charge_rate = capitalToken.value.capital_charge_rate ?? 0;
    const token_per_stock = capitalToken.value.tokenPerStock ?? 0;
    // console.log(`stock_list`, stock_list);
    let cummulative_token = 0;
    const props: TablesExample8PropsType = {
        title: <>
            <div className="flex pb-2 items-center">
                <DesignButton
                    handleOnClick={() => {
                        handleOnClick()
                    }}
                    buttonName={`알고리즘 투자 이력 조회 ${kiToken.state == "fulfilled" ? "+ @" : ""}`}
                    buttonBgColor="bg-white"
                    buttonBorderColor="border-gray-500"
                    buttonShadowColor="#D5D5D5"
                    textStyle="text-black text-xs"
                    buttonStyle={`rounded-lg px-2 py-1 flex items-center justify-center mb-2 button bg-white cursor-pointer select-none
                                       active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                                       transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]
                                       `}
                />

                {"fulfilled" != capitalToken.state ?
                    <Button loading={true} className="p-0 px-1 m-0 bg-white text-black font-mono">loading...</Button>
                    : <>
                        <div className="font-mono text-[0.6rem] text-black ml-2">{time.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</div>
                    </>}
            </div>
        </>,
        desc: <>
            <div className="text-sm font-mono text-black leading-none pb-2">
                <Popover>
                    <PopoverHandler>
                        <div className="cursor-pointer">
                            <div className="pb-1"><span className="underline decoration-4 decoration-yellow-500">주식 구매 포인트</span> 적립 이력</div>
                            <div className="ml-1 flex gap-1">
                                {Object.keys(time_stamp).reverse().map((key, index) => {
                                    let bgColor = "bg-blue-200";
                                    if (1 == index) {
                                        bgColor = "bg-blue-500";
                                    }
                                    else if (2 == index) {
                                        bgColor = "bg-blue-700";
                                    }
                                    return <div key={index} className={`text-xs rounded border border-black px-1 ${bgColor} text-white`}>{formatDateTime(time_stamp[key])}</div>;
                                })}
                            </div>
                        </div>
                    </PopoverHandler>
                    <PopoverContent className="p-2 border border-black rounded shadow shadow-blue-gray-500">
                        <div className="text-xs font-mono text-black">10분 간격으로 <span className="underline decoration-4 decoration-yellow-500">주식 구매 포인트</span> 적립 및 알고리즘 매매 수행합니다.</div>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="text-sm font-mono text-black leading-none pb-2">
                <Popover>
                    <PopoverHandler>
                        <div className="cursor-pointer pb-1">
                            <span className="underline decoration-4 decoration-yellow-500">주식 구매 포인트</span> 적립 현황
                        </div>
                    </PopoverHandler>
                    <PopoverContent className="p-2 border border-black rounded shadow shadow-blue-gray-500">
                        <div className="text-xs font-mono text-black">{`"주식 구매 포인트 >= 주가" 인 경우 구매 시도`}</div>
                    </PopoverContent>
                </Popover>
                <div className="ml-1 p-2 border rounded border-black">
                    <div className="flex items-center text-xs font-mono text-black leading-none pb-1">
                        <div>10분 마다 <span className="underline decoration-4 decoration-yellow-500">주식 구매 포인트</span> 충전</div>
                        {/* <div className="ml-2 px-1 text-xs font-normal rounded border border-black">{token_per_stock}</div> */}
                        <div className="ml-2 px-1 font-normal rounded border border-black"><span className="text-[0.6rem]">종목 당 충전 포인트:</span> {token_per_stock}</div>
                    </div>
                    <div className="flex items-center text-xs font-mono text-black leading-none pb-1">
                        <div>마지막 구매 시도 종목</div>
                        <div className="ml-2 px-1 text-xs font-normal rounded border border-black">{refill_stock_index}) {!!stock_list[refill_stock_index] ? stock_list[refill_stock_index]["name"] : 0}</div>
                    </div>
                    <div className="font-mono text-black leading-none">
                        <Popover >
                            <PopoverHandler>
                                <div className="text-xs cursor-pointer">알고리즘 매매 대상 종목</div>
                            </PopoverHandler>
                            <PopoverContent className="p-2 border border-black rounded shadow shadow-blue-gray-500">
                                <div className="text-xs font-mono text-black pb-1">10 분 마다 종목당 <span className="underline decoration-4 decoration-yellow-500">주식 구매 포인트</span> {token_per_stock} 적립</div>
                            </PopoverContent>
                        </Popover>
                        {stock_list.map((item: any, index: number) => {
                            cummulative_token += isNaN(Number(item["token"])) ? 0 : Number(item["token"]);
                            return <Popover key={index}>
                                <PopoverHandler>
                                    <div className={`flex pl-1 items-center gap-x-1 ${index % 2 == 0 ? "bg-white" : "bg-gray-100"} ${item["refill"] ? "" : "font-bold line-through"}`}>
                                        <div className="flex items-center min-w-[95px] text-xs">
                                            <div>
                                                {index})
                                            </div>
                                            <div className={`${item["name"].length >= 8 ? "text-[0.5rem]" : (item["name"].length >= 7 ? "text-[0.6rem]" : "text-xs")}`}>
                                                {item["name"]}
                                            </div>
                                        </div>
                                        <div className="flex items-center min-w-[65px]">
                                            <div className="border rounded border-black p-0 text-[0.6rem]">
                                                포인트
                                            </div>
                                            <div className="ml-1 min-w-[35px] text-right text-xs">
                                                {item["token"]}
                                            </div>
                                        </div>
                                        {(() => {
                                            const priceMulti = inquirePriceMulti[item["PDNO"]];
                                            if (undefined == priceMulti) {
                                                return <></>;
                                            }

                                            if (1 == inquirePriceMulti[item["PDNO"]].rt_cd) {
                                                return <></>;
                                            }

                                            return <>
                                                <div className="flex items-center min-w-[70px]">
                                                    <div className="border rounded border-black p-0 text-[0.6rem]">
                                                        주가
                                                    </div>
                                                    <div className={`ml-1 min-w-[45px] text-right ${(inquirePriceMulti[item["PDNO"]].output.stck_prpr).length >= 7 ? "text-[0.5rem]" : ((inquirePriceMulti[item["PDNO"]].output.stck_prpr).length >= 5 ? "text-[0.6rem]" : "text-xs")}`}>
                                                        {Number(inquirePriceMulti[item["PDNO"]].output.stck_prpr).toLocaleString()}원
                                                    </div>
                                                </div>
                                                <div className="flex items-center min-w-[55px]">
                                                    <div className="border rounded border-black p-0 text-[0.6rem]">
                                                        PER
                                                    </div>
                                                    <div className="ml-1 min-w-[40px] text-right text-[0.6rem]">
                                                        {inquirePriceMulti[item["PDNO"]].output.per}
                                                    </div>
                                                </div>
                                            </>
                                        })()}
                                    </div>
                                </PopoverHandler>
                                <PopoverContent className="p-2 border border-black rounded shadow shadow-blue-gray-500">
                                    {item["refill"] ?
                                        <div className="text-xs font-mono text-black">{`${item["name"]} 을(를) "${token_per_stock} token / 10 분" 만큼 리필`}</div>
                                        :
                                        <div className="text-xs font-mono text-black">{`${item["name"]} 을(를) 매매 대상에서 임시 제외`}</div>
                                    }
                                </PopoverContent>
                            </Popover>
                        })}
                    </div>
                    <div className="flex items-center text-xs font-mono text-black leading-none pb-1">
                        <div>누적 token</div>
                        <div className="ml-2 px-1 text-xs font-mono rounded border border-black">{cummulative_token}</div>
                    </div>
                </div>
            </div>

        </>,
        // financial_date: <><div className="text-sm">market_date</div><div className="ml-4 text-xs">{time.toString()}</div></>,
        market_date: <Popover>
            <PopoverHandler>
                <div className="cursor-pointer pt-4 text-sm font-mono text-black">
                    구매 history <span className="text-xs text-black">{`(누적 알고리즘 매수금: ${cummulative_investment}원)`}</span>
                </div>
            </PopoverHandler>
            <PopoverContent className="p-2 border border-black rounded shadow shadow-blue-gray-500">
                <div className="text-xs font-mono text-black">알고리즘 매매 내역</div>
            </PopoverContent>
        </Popover>,
        tableHead: example8TableHead,
        tableRow: example8TableRow,
    }

    return <>
        <TablesExample8 {...props} />
    </>
}