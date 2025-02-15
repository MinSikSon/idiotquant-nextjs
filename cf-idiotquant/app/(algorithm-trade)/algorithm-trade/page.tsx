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
            head: "남은토큰",
        },
        {
            head: "구매가격",
        },
        {
            head: "구매개수",
        },
        {
            head: "구매 날짜/시간",
        },
    ];

    function formatDateTime(date: string) {
        date = date.replaceAll("\"", "");
        const dateArr = date.split("T");
        const dateArr2 = dateArr[1].split(".");
        return `${dateArr[0]} ${dateArr2[0]}`;
    }

    const purchase_log = capitalToken.purchase_log ?? [];
    // console.log(`capitalToken.purchase_log`, capitalToken.purchase_log);
    // console.log(`purchase_log`, purchase_log);
    let example8TableRowType: Example8TableRowType[] = [];
    example8TableRowType = (purchase_log.map((item: any) => {
        return item["stock_list"].map((subItem: any) => {
            return {
                digitalAsset: item["time_stamp"] + subItem["stock_name"], // key
                detail: subItem["stock_name"],

                closePrice: subItem["remaining_token"],
                expectedRateOfReturn: subItem["stck_prpr"] + "원",
                expectedRateOfReturnColor: '', // x
                targetPrice: subItem["ORD_QTY"],
                market: formatDateTime(item["time_stamp"]),
            }
        })
    })).reverse().flat();

    const time_stamp: any = capitalToken.time_stamp ?? {};
    const stock_list: any = capitalToken.stock_list ?? [];
    const refill_stock_index = capitalToken.refill_stock_index ?? 0;
    const stock_list_length = stock_list.length > 0 ? stock_list.length : 1;
    const capital_charge_rate = capitalToken.capital_charge_rate ?? 0;
    // console.log(`stock_list`, stock_list);
    const props: TablesExample8PropsType = {
        title: <>
            <div className="flex">
                <div className="pr-2 font-bold text-black">[TradeLog] 주식 구매 이력</div>
                <Button onClick={() => handleOnClick()} className="px-2 py-0 m-0" size="sm">
                    다시 조회
                </Button>
            </div>
        </>,
        subTitle: ``,
        desc: <>
            <div className="text-sm font-bold text-black leading-none pb-2">
                {/* <div className="text-lg font-bold text-black leading-none pb-3"> */}
                갱신 이력:
                <div className="flex gap-1">
                    {Object.keys(time_stamp).reverse().map((key, index) => {
                        return <div key={index} className={`text-xs rounded border border-black px-1 ${`bg-gray-${200 + index * 200}`}`}>{formatDateTime(time_stamp[key])}</div>;
                    })}
                </div>
            </div>
            <div className="text-sm font-bold text-black leading-none pb-2">
                동작 현황: <span className="text-xs font-normal">{`"token >= 시가" 인 경우 구매 시도`}</span>
                <div className="p-3 border rounded border-black">
                    <div className="text-sm font-bold text-black leading-none pb-2">
                        갱신 시 충전되는 총 token: <span className="text-xs font-normal">{capital_charge_rate}</span>
                    </div>
                    <div className="text-sm font-bold text-black leading-none pb-2">
                        갱신 시 종목당 충전되는 token: <span className="text-xs font-normal">{Math.trunc(capital_charge_rate / stock_list_length)}</span>
                    </div>
                    <div className="text-sm font-bold text-black leading-none pb-2">
                        마지막에 구매 시도한 종목: <span className="text-xs font-normal">{refill_stock_index} {!!stock_list[refill_stock_index] ? stock_list[refill_stock_index]["name"] : 0}</span>
                    </div>
                    <div className="text-sm font-bold text-black leading-none">
                        [index] 종목명: token <>
                            {stock_list.map((item: any, index: number) => {
                                return <div key={index} className="text-xs font-normal pl-2">[{index}] {item["name"]}: {item["token"]}</div>
                            })}
                        </>
                    </div>
                </div>
            </div>

        </>,
        financial_date: "",
        market_date: `- market_date: ${time.toString()}`,
        tableHead: example8TableHeadType,
        tableRow: example8TableRowType,
    }

    return <>
        <TablesExample8 {...props} />
    </>
}