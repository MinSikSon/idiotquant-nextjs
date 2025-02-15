"use client"

import Login from "@/app/(login)/login/login";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import { getCookie, isValidCookie, registerCookie, Util } from "@/components/util";
import { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, KoreaInvestmentInquirePrice, getKoreaInvestmentInquirePrice, reqGetInquireDailyItemChartPrice, getKoreaInvestmentInquireDailyItemChartPrice, KoreaInvestmentInquireDailyItemChartPrice, reqGetBalanceSheet, getKoreaInvestmentBalanceSheet, KoreaInvestmentBalanceSheet } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { KoreaInvestmentApproval, KoreaInvestmentToken, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { setKoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { selectState } from "@/lib/features/login/loginSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, Input, Typography } from "@material-tailwind/react";
import React from "react";

import { usePathname } from "next/navigation";
import Auth from "@/components/auth";

export default function OpenApi() {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const kiApproval: KoreaInvestmentApproval = useAppSelector(getKoreaInvestmentApproval);
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
    const kiInquirePrice: KoreaInvestmentInquirePrice = useAppSelector(getKoreaInvestmentInquirePrice);
    const kiInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);
    const kiBalanceSheet: KoreaInvestmentBalanceSheet = useAppSelector(getKoreaInvestmentBalanceSheet);

    const [time, setTime] = React.useState<any>('');
    const loginState = useAppSelector(selectState);

    React.useEffect(() => {
        console.log(`[OpenApi]`, `kiToken:`, kiToken);
        const isValidKiAccessToken = !!kiToken["access_token"];
        if (true == isValidKiAccessToken) {
            setTime(new Date());
            dispatch(reqGetInquireBalance(kiToken));
        }
    }, [kiToken]);

    const example8TableHeadType: Example8TableHeadType[] = [
        {
            head: "종목명",
            // desc: "desc",
        },
        {
            head: "현재가",
        },
        {
            head: "보유수량/매도가능",
        },
        {
            head: "평가손익",
        },
        {
            head: "평가금액",
        },
        {
            head: "매수금액",
        },
        {
            head: "비중",
        },
    ];

    function handleOnClick(pdno: string, buyOrSell: string) {
        if ("buy" == buyOrSell || "sell" == buyOrSell) {
            dispatch(reqPostOrderCash({ koreaInvestmentToken: kiToken, PDNO: pdno, buyOrSell: buyOrSell }));
        }
    }

    let example8TableRowType: Example8TableRowType[] = [];
    if (!!kiBalance.output1 && kiBalance.output1.length > 0) {
        example8TableRowType = (kiBalance.output1.map((item, index) => {
            return {
                digitalAsset: item["prdt_name"], // key
                detail: item["prdt_name"],
                closePrice: Number(item["prpr"]).toLocaleString() + "원",
                expectedRateOfReturn: `${item['hldg_qty']}/${item['ord_psbl_qty']}`,
                expectedRateOfReturnColor: '', // x
                targetPrice: <>
                    <div className={`font-bold flex justify-between ${Number(Number(item["evlu_amt"]) / Number(item["pchs_amt"]) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                        <div className="pr-1">
                            ({Number(Number(item["evlu_amt"]) / Number(item["pchs_amt"]) * 100 - 100).toFixed(2)}%)
                        </div>
                        <div>
                            {Util.UnitConversion(Number(item["evlu_pfls_amt"]), true)}
                        </div>
                    </div>
                </>,
                market: Util.UnitConversion(Number(item["evlu_amt"]), true),
                netCurrentAssert: Util.UnitConversion(Number(item["pchs_amt"]), true),
                netIncome: `${(Number(item["pchs_amt"]) / Number(kiBalance.output2[0]["pchs_amt_smtl_amt"]) * 100).toFixed(2)} %`,
                chartName: '',
                tag: <>
                    <div className="mr-2 gap-1">
                        <Button className="p-0 py-1 m-0 mr-1" variant="outlined" size="sm" onClick={() => handleOnClick(item["pdno"], "buy")}>
                            매수
                        </Button>
                        <Button className="p-0 py-1 m-0" variant="outlined" size="sm" onClick={() => handleOnClick(item["pdno"], "sell")}>
                            매도
                        </Button>
                    </div>
                </>,
            }
        }));
    }

    let nass_amt: number = 0; // 순자산
    let evlu_amt_smtl_amt: number = 0; // 평가금액
    let pchs_amt_smtl_amt: number = 0; // 매입금액
    let evlu_pfls_smtl_amt: number = 0;// 수입
    if (!!kiBalance.output2 && kiBalance.output2.length > 0) {
        nass_amt = Number(kiBalance.output2[0]["nass_amt"]);
        evlu_amt_smtl_amt = Number(kiBalance.output2[0]["evlu_amt_smtl_amt"]);
        pchs_amt_smtl_amt = Number(kiBalance.output2[0]["pchs_amt_smtl_amt"]);
        evlu_pfls_smtl_amt = Number(kiBalance.output2[0]["evlu_pfls_smtl_amt"]);
    }
    const props: TablesExample8PropsType = {
        title: <>
            <div className="flex">
                <div className="pr-2">[OpenApi] 계좌 조회</div>
                <Button onClick={() => dispatch(reqGetInquireBalance(kiToken))} className="px-2 py-0 m-0" variant="outlined" size="sm">
                    다시 조회
                </Button>
            </div>
        </>,
        subTitle: ``,
        desc: <>
            <div className="text-lg font-bold text-black leading-none pb-3">
                평가손익: <span className={`${(Number(evlu_amt_smtl_amt) / Number(pchs_amt_smtl_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                    {Number(evlu_pfls_smtl_amt).toLocaleString()}원
                    ({pchs_amt_smtl_amt == 0 ? "-" : Number(Number(evlu_amt_smtl_amt / pchs_amt_smtl_amt) * 100 - 100).toFixed(2)}%)
                </span>
            </div>
            <div className="p-3 border rounded">
                <div className="text-sm font-bold text-black leading-none pb-2">
                    예수금액: {Number(Number(nass_amt) - Number(pchs_amt_smtl_amt)).toLocaleString()}원 순자산금액: {Number(nass_amt).toLocaleString()}원
                </div>
                <div className="text-sm font-bold text-black leading-none pb-2">
                    평가금액: {Number(evlu_amt_smtl_amt).toLocaleString()}원
                </div>
                <div className="text-sm font-bold text-black leading-none pb-1">
                    매입금액: {Number(pchs_amt_smtl_amt).toLocaleString()}원
                </div>
            </div>
        </>,
        financial_date: "",
        market_date: `- market_date: ${time.toString()}`,
        tableHead: example8TableHeadType,
        tableRow: example8TableRowType,
    }

    if ("init" == loginState) {
        return <>
            <Login parentUrl={pathname} />
        </>
    }

    if (false == isValidCookie("koreaInvestmentToken") || false == !!kiToken["access_token"]) {
        return <>
            <Auth />
        </>
    }

    return <>
        <TablesExample8 {...props} />
    </>
}
