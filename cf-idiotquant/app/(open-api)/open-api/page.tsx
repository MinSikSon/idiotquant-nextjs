"use client"

import Login from "@/app/(login)/login/login";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import { getCookie, isValidCookie, registerCookie, Util } from "@/components/util";
import { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, KoreaInvestmentInquirePrice, getKoreaInvestmentInquirePrice, reqGetInquireDailyItemChartPrice, getKoreaInvestmentInquireDailyItemChartPrice, KoreaInvestmentInquireDailyItemChartPrice, reqGetBalanceSheet, getKoreaInvestmentBalanceSheet, KoreaInvestmentBalanceSheet, getKoreaInvestmentOrderCash, KoreaInvestmentOrderCash } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { KoreaInvestmentApproval, KoreaInvestmentToken, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { setKoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { selectState } from "@/lib/features/login/loginSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, Input, Typography } from "@material-tailwind/react";
import React from "react";

import { usePathname } from "next/navigation";
import Auth from "@/components/auth";
import { DesignButton } from "@/components/designButton";

export default function OpenApi() {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const kiApproval: KoreaInvestmentApproval = useAppSelector(getKoreaInvestmentApproval);
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
    const kiInquirePrice: KoreaInvestmentInquirePrice = useAppSelector(getKoreaInvestmentInquirePrice);
    const kiInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);
    const kiBalanceSheet: KoreaInvestmentBalanceSheet = useAppSelector(getKoreaInvestmentBalanceSheet);

    const kiOrderCash: KoreaInvestmentOrderCash = useAppSelector(getKoreaInvestmentOrderCash);

    const [msg, setMsg] = React.useState<any>("");
    const [orderName, setOrderName] = React.useState<any>("");

    const [time, setTime] = React.useState<any>('');
    const loginState = useAppSelector(selectState);

    const [show, setShow] = React.useState<boolean>(false);

    const showAlert = (additionalMsg: string) => {
        setMsg(additionalMsg);
        setShow(true);

        setTimeout(() => {
            setShow(false);
        }, 3000);
    };

    React.useEffect(() => {
        // console.log(`[OpenApi]`, `kiToken:`, kiToken);
        const isValidKiAccessToken = !!kiToken["access_token"];
        if (true == isValidKiAccessToken) {
            setTime(new Date());
            dispatch(reqGetInquireBalance(kiToken));
        }
    }, [kiToken]);

    React.useEffect(() => {
        console.log(`kiBalance`, kiBalance);
    }, [kiBalance]);

    React.useEffect(() => {
        console.log(`kiOrderCash`, kiOrderCash);
    }, [kiOrderCash])

    if ("init" == loginState) {
        return <>
            <Login parentUrl={pathname} />
        </>
    }

    const example8TableHeadType: Example8TableHeadType[] = [
        {
            head: "종목명",
            desc: "종목명",
        },
        {
            head: "현재가",
            desc: "현재가",
        },
        {
            head: "보유/주문가능",
            desc: "보유/주문가능",
        },
        {
            head: "평가손익",
            desc: "평가손익",
        },
        {
            head: "평가금액",
            desc: "평가금액",
        },
        {
            head: "매수금액",
            desc: "매수금액",
        },
        {
            head: "비중",
            desc: "비중",
        },
    ];

    function handleOnClick(item: any, buyOrSell: string) {
        if ("buy" == buyOrSell || "sell" == buyOrSell) {
            const korBuyOrSell = "buy" == buyOrSell ? "구매" : "판매";
            setOrderName(item["prdt_name"] + " " + korBuyOrSell + " 시도");
            dispatch(reqPostOrderCash({ koreaInvestmentToken: kiToken, PDNO: item["pdno"], buyOrSell: buyOrSell }));
            showAlert("");
        }
    }

    let example8TableRowType: Example8TableRowType[] = [];
    if ("fulfilled" == kiBalance.state) {
        let kiBalanceOutput1 = [...kiBalance.output1];
        console.log(`kiBalanceOutput1`, kiBalanceOutput1);
        example8TableRowType = (kiBalanceOutput1.sort((a, b) => Number(b["pchs_amt"]) - Number(a["pchs_amt"])).map((item, index) => {
            // console.log(`item["prdt_name"]`, item["prdt_name"], `item["prdt_name"].length`, item["prdt_name"].length);
            return {
                digitalAsset: item["prdt_name"], // key
                detail: <div className={`font-mono ${item["prdt_name"].length >= 7 ? "text-[0.6rem]" : "text-xs"}`}>{item["prdt_name"]}</div>,
                closePrice: <div className="font-mono font-bold text-xs text-black">{Number(item["prpr"]).toLocaleString() + "원"}</div>,
                expectedRateOfReturn: <div className="font-mono text-xs text-black">{item['hldg_qty']}/{item['ord_psbl_qty']}</div>,
                expectedRateOfReturnColor: '', // x
                targetPrice: <>
                    <div className={`font-mono font-bold text-xs flex justify-between ${Number(Number(item["evlu_amt"]) / Number(item["pchs_amt"]) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                        <div className="font-mono pr-1">
                            ({Number(Number(item["evlu_amt"]) / Number(item["pchs_amt"]) * 100 - 100).toFixed(2)}%)
                        </div>
                        <div>
                            {Util.UnitConversion(Number(item["evlu_pfls_amt"]), true)}
                        </div>
                    </div>
                </>,
                market: <div className="text-xs font-mono text-black">{Util.UnitConversion(Number(item["evlu_amt"]), true)}</div>,
                netCurrentAssert: <div className="text-xs font-mono text-black">{Util.UnitConversion(Number(item["pchs_amt"]), true)}</div>,
                netIncome: <div className="text-xs font-mono font-bold text-black">{(Number(item["pchs_amt"]) / Number(kiBalance.output2[0]["pchs_amt_smtl_amt"]) * 100).toFixed(2)} %</div>,
                chartName: '',
                tag: <>
                    <div className="flex p-0 m-0 gap-1 mr-2 font-mono">
                        <DesignButton
                            handleOnClick={() => handleOnClick(item, "buy")}
                            buttonName="buy"
                            buttonBgColor="bg-blue-500"
                            buttonBorderColor="border-blue-400"
                            buttonShadowColor="#1b6ff8"
                            textStyle="text-[0.5rem]"
                            buttonStyle="m-0 p-0"
                        />
                        <DesignButton
                            handleOnClick={() => handleOnClick(item, "sell")}
                            buttonName="sell"
                            buttonBgColor="bg-red-400"
                            buttonBorderColor="border-red-300"
                            buttonShadowColor="#910000"
                            textStyle="text-[0.5rem]"
                            buttonStyle="m-0 p-0"
                        />
                    </div>
                </>,
            }
        }));
    }

    console.log(`kiOrderCash.msg1`, kiOrderCash.msg1); // TODO: 클릭한 종목 바로 밑에 msg 뜨게 변경..!!

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
            <div className="flex pb-2 items-center">
                <div className="pr-2 text-black">알고리즘 매매 계좌 조회</div>
                <DesignButton
                    handleOnClick={() => {
                        showAlert("지난 주문 확인");
                        dispatch(reqGetInquireBalance(kiToken));
                    }}
                    buttonName="계좌 조회"
                    buttonBgColor="bg-green-400"
                    buttonBorderColor="border-green-300"
                    buttonShadowColor="#129600"
                    textStyle="text-xs pt-0.5"
                />
                {"pending" == kiBalance.state ?
                    <Button loading={true} className="p-0 px-1 m-0 bg-white text-black font-mono">loading...</Button>
                    : <></>}
            </div>
        </>,
        subTitle: ``,
        desc: <>
            <div className="text-lg font-mono text-black leading-none pb-3">
                평가손익:<span className={`${(Number(evlu_amt_smtl_amt) / Number(pchs_amt_smtl_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                    {Number(evlu_pfls_smtl_amt).toLocaleString()}원
                    ({pchs_amt_smtl_amt == 0 ? "-" : Number(Number(evlu_amt_smtl_amt / pchs_amt_smtl_amt) * 100 - 100).toFixed(2)}%)
                </span>
            </div>
            <div className="text-xs font-mono text-black p-3 border rounded">
                <div className="leading-none pb-2">
                    예수금액:{Number(Number(nass_amt) - Number(pchs_amt_smtl_amt)).toLocaleString()}원 순자산금액:{Number(nass_amt).toLocaleString()}원
                </div>
                <div className="leading-none pb-2">
                    평가금액:{Number(evlu_amt_smtl_amt).toLocaleString()}원
                </div>
                <div className="leading-none pb-1">
                    매입금액:{Number(pchs_amt_smtl_amt).toLocaleString()}원
                </div>
            </div>
        </>,
        financial_date: "",
        market_date: <div className="flex flex-col">
            <div className="text-xs">market_date: {time.toString()}</div>
        </div>,
        tableHead: example8TableHeadType,
        tableRow: example8TableRowType,
    }

    if (false == isValidCookie("koreaInvestmentToken") || false == !!kiToken["access_token"]) {
        return <>
            <Auth />
        </>
    }

    return <>
        <div
            className={`text-center w-80 z-10 fixed top-32 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg text-white shadow-lg transition-all duration-500 ${show ? "opacity-100 scale-100 bg-green-500" : "opacity-0 scale-95 pointer-events-none"
                }`}
        >
            <div className="">{msg}</div>
            <div className="text-lg">✅ {orderName}</div>
            <div className="">{kiOrderCash.msg1}</div>
        </div>

        <TablesExample8 {...props} />
    </>
}
