"use client"

import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import { selectCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { reqGetCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button } from "@material-tailwind/react";
import React from "react";

export default function AlgorithmTrade() {
    const dispatch = useAppDispatch();

    const capitalToken: any = useAppSelector(selectCapitalToken);
    const [time, setTime] = React.useState<any>('');

    function handleOnClick() {
        setTime(new Date());
        dispatch(reqGetCapitalToken());
    }

    React.useEffect(() => {
        handleOnClick();
    }, []);

    console.log(`capitalToken`, capitalToken);
    // console.log(`typeof capitalToken`, typeof capitalToken);
    // console.log(Object.keys(capitalToken).length);

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
            head: "구매개수",
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
    const purchase_log = capitalToken.purchase_log ?? [];
    // console.log(`capitalToken.purchase_log`, capitalToken.purchase_log);
    // console.log(`purchase_log`, purchase_log);
    let example8TableRowType: Example8TableRowType[] = [];
    example8TableRowType = (purchase_log.map((item: any, index: number) => {
        const bgColor = index % 2 == 0 ? "bg-white" : "bg-gray-100";
        return item["stock_list"].map((subItem: any) => {
            const investment = (subItem["stck_prpr"] * subItem["ORD_QTY"]);
            cummulative_investment += investment;
            return {
                digitalAsset: item["time_stamp"] + subItem["stock_name"], // key
                detail: subItem["stock_name"],

                closePrice: subItem["remaining_token"],
                expectedRateOfReturn: subItem["stck_prpr"] + "원",
                expectedRateOfReturnColor: '', // x
                targetPrice: subItem["ORD_QTY"],
                market: subItem["remaining_token"] - investment,
                netCurrentAssert: formatDateTime(item["time_stamp"]),
                bgColor: bgColor,
            }
        })
    })).reverse().flat();

    const time_stamp: any = capitalToken.time_stamp ?? {};
    const stock_list: any = capitalToken.stock_list ?? [];
    const refill_stock_index = capitalToken.refill_stock_index ?? 0;
    const stock_list_length = stock_list.length > 0 ? stock_list.length : 1;
    const capital_charge_rate = capitalToken.capital_charge_rate ?? 0;
    // console.log(`stock_list`, stock_list);
    let cummulative_token = 0;
    const props: TablesExample8PropsType = {
        title: <>
            <div className="flex pb-2">
                <div className="pr-2 font-bold text-black">[algo trade log] 주식 구매 이력</div>
                <Button onClick={() => handleOnClick()} className="px-2 py-0 m-0" size="sm">
                    다시 조회
                </Button>
            </div>
        </>,
        subTitle: ``,
        desc: <>
            <div className="text-sm font-bold text-black leading-none pb-2">
                token 충전 이력
                <div className="ml-2 flex gap-1">
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
            <div className="text-sm font-bold text-black leading-none pb-2">
                token 현황 <span className="text-xs font-normal">{`("token >= 시가" 인 경우 구매 시도)`}</span>
                <div className="ml-2 p-3 border rounded border-black">
                    <div className="flex items-center text-xs font-bold text-black leading-none pb-1">
                        <div>충전 총 token</div>
                        <div className="ml-2 px-1 text-xs font-normal rounded border border-black">{Math.trunc(capital_charge_rate / stock_list_length) * stock_list_length}</div>
                        <div className="ml-2">(종목당 충전 token</div><div className="ml-2 px-1 text-xs font-normal rounded border border-black">{Math.trunc(capital_charge_rate / stock_list_length)}</div>)
                    </div>
                    <div className="flex items-center text-xs font-bold text-black leading-none pb-1">
                        <div>마지막 구매 시도 종목</div>
                        <div className="ml-2 px-1 text-xs font-normal rounded border border-black">{refill_stock_index} {!!stock_list[refill_stock_index] ? stock_list[refill_stock_index]["name"] : 0}</div>
                    </div>
                    <div className="text-xs font-bold text-black leading-none">
                        [index] 종목명: token <>
                            {stock_list.map((item: any, index: number) => {
                                cummulative_token += isNaN(Number(item["token"])) ? 0 : Number(item["token"]);
                                return <div key={index} className="text-xs font-normal pl-2">[{index}] {item["name"]}: {item["token"]}</div>
                            })}
                        </>
                    </div>
                    <div className="flex items-center text-xs font-bold text-black leading-none pb-1">
                        <div>누적 token</div>
                        <div className="ml-2 px-1 text-xs font-normal rounded border border-black">{cummulative_token}</div>
                    </div>
                </div>
            </div>

        </>,
        financial_date: <><div className="text-sm">market_date</div><div className="ml-4 text-xs">{time.toString()}</div></>,
        market_date: <div className="pt-4 text-base font-bold text-black">구매 history <span className="text-sm text-black">{`(누적 알고리즘 매수금: ${cummulative_investment}원)`}</span></div>,
        tableHead: example8TableHeadType,
        tableRow: example8TableRowType,
    }

    return <>
        <TablesExample8 {...props} />
    </>
}