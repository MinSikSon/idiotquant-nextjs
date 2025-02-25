"use client"

import Auth from "@/components/auth";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import { isValidCookie } from "@/components/util";
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
        // console.log(`capitalToken`, capitalToken);
        // console.log(`kiToken`, kiToken);

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

            // console.log(`filteredPDNOs`, filteredPDNOs);

            // console.log(`PDNOs`, PDNOs);
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

    const example8TableHeadType: Example8TableHeadType[] = [
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
    let example8TableRowType: Example8TableRowType[] = [];
    example8TableRowType = (purchase_log.map((item: any, index: number) => {
        const bgColor = index % 2 == 0 ? "bg-white" : "bg-gray-100";
        return item["stock_list"].map((subItem: any) => {
            const investment = (subItem["stck_prpr"] * subItem["ORD_QTY"]);
            cummulative_investment += investment;
            return {
                digitalAsset: item["time_stamp"] + subItem["stock_name"], // key
                detail: <div className="text-xs">{subItem["stock_name"]}</div>,
                closePrice: <div className="text-xs">{subItem["remaining_token"]}</div>,
                expectedRateOfReturn: <div className="text-xs">{Number(subItem["stck_prpr"]).toLocaleString() + "원"}</div>,
                expectedRateOfReturnColor: '', // x
                targetPrice: <div className="text-xs">{subItem["ORD_QTY"]}</div>,
                market: <div className="text-xs">{subItem["remaining_token"] - investment}</div>,
                netCurrentAssert: <div className="text-xs">{formatDateTime(item["time_stamp"])}</div>,
                bgColor: bgColor,
            }
        })
    })).reverse().flat();

    const time_stamp: any = capitalToken.value.time_stamp ?? {};
    const stock_list: any = capitalToken.value.stock_list ?? [];
    const refill_stock_index = capitalToken.value.refill_stock_index ?? 0;
    const stock_list_length = stock_list.length > 0 ? stock_list.length : 1;
    const capital_charge_rate = capitalToken.value.capital_charge_rate ?? 0;
    // console.log(`stock_list`, stock_list);
    let cummulative_token = 0;
    const props: TablesExample8PropsType = {
        title: <>
            <div className="flex pb-2 items-center">
                <Popover>
                    <PopoverHandler>
                        <div className="text-base font-mono pr-2 text-black">알고리즘 투자 이력</div>
                    </PopoverHandler>
                    <PopoverContent>
                        <div className="text-xs font-mono text-red-500">10분 간격으로 token 충전 및 알고리즘 매매 수행합니다.</div>
                    </PopoverContent>
                </Popover>
                <div
                    onClick={() => {
                        handleOnClick()
                    }}
                    className='mb-2 px-2 button bg-green-400 rounded-full cursor-pointer select-none
                    active:translate-y-1 active:[box-shadow:0_0px_0_0_#129600,0_0px_0_0_#12960041] active:border-b-[0px]
                    transition-all duration-150 [box-shadow:0_4px_0_0_#129600,0_8px_0_0_#12960041] border-b-[1px] border-green-300'>
                    <span className='flex flex-col justify-center items-center h-full text-white text-xs font-mono pt-0.5'>다시 조회 {kiToken.state == "fulfilled" ? "+ @" : ""}</span>
                </div>
                {"fulfilled" != capitalToken.state ?
                    <Button loading={true} className="p-0 px-1 m-0 bg-white text-black text-mono">loading...</Button>
                    : <></>}
            </div>
        </>,
        subTitle: ``,
        desc: <>
            <div className="text-sm font-mono text-black leading-none pb-2">
                <Popover>
                    <PopoverHandler>
                        <div className="cursor-pointer">
                            <>
                                token 충전 이력
                            </>
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
                    <PopoverContent>
                        <div className="text-xs text-red-500">10분 간격으로 token 충전 및 알고리즘 매매 수행합니다.</div>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="text-sm font-mono text-black leading-none pb-2">
                <Popover>
                    <PopoverHandler>
                        <div className="cursor-pointer">
                            token 현황
                        </div>
                    </PopoverHandler>
                    <PopoverContent>
                        <div className="text-xs text-red-500">{`"token >= 주가" 인 경우 구매 시도`}</div>
                    </PopoverContent>
                </Popover>
                <div className="ml-1 p-2 border rounded border-black">
                    <div className="flex items-center text-xs font-mono text-black leading-none pb-1">
                        <div>10분 당 충전 token</div>
                        <div className="ml-2 px-1 text-xs font-normal rounded border border-black">{Math.trunc(capital_charge_rate / stock_list_length) * stock_list_length}</div>
                        <div className="ml-2">(종목 당 충전 token</div><div className="ml-2 px-1 text-xs font-normal rounded border border-black">{Math.trunc(capital_charge_rate / stock_list_length)}</div>)
                    </div>
                    <div className="flex items-center text-xs font-mono text-black leading-none pb-1">
                        <div>마지막 구매 시도 종목</div>
                        <div className="ml-2 px-1 text-xs font-normal rounded border border-black">{refill_stock_index} {!!stock_list[refill_stock_index] ? stock_list[refill_stock_index]["name"] : 0}</div>
                    </div>
                    <div className="font-mono text-black leading-none">
                        <div className="text-xs">
                            알고리즘 매매 대상 종목
                        </div>
                        <>
                            {stock_list.map((item: any, index: number) => {
                                cummulative_token += isNaN(Number(item["token"])) ? 0 : Number(item["token"]);
                                return <div key={index} className={`flex pl-1 items-center gap-x-1 ${index % 2 == 0 ? "bg-white" : "bg-gray-100"}`}>
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
                                            token
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
                            })}
                        </>
                    </div>
                    <div className="flex items-center text-xs font-mono text-black leading-none pb-1">
                        <div>누적 token</div>
                        <div className="ml-2 px-1 text-xs font-mono rounded border border-black">{cummulative_token}</div>
                    </div>
                </div>
            </div>

        </>,
        financial_date: <><div className="text-sm">market_date</div><div className="ml-4 text-xs">{time.toString()}</div></>,
        market_date: <Popover>
            <PopoverHandler>
                <div className="cursor-pointer pt-4 text-sm font-mono text-black">
                    구매 history <span className="text-xs text-black">{`(누적 알고리즘 매수금: ${cummulative_investment}원)`}</span>
                </div>
            </PopoverHandler>
            <PopoverContent>
                <div className="text-xs font-mono text-red-500">알고리즘 매매 내역</div>
            </PopoverContent>
        </Popover>,
        tableHead: example8TableHeadType,
        tableRow: example8TableRowType,
    }

    return <>
        <TablesExample8 {...props} />
    </>
}