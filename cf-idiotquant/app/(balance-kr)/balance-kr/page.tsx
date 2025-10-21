"use client"

import { reqGetInquireBalance, getKoreaInvestmentBalance, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqPostOrderCash, getKoreaInvestmentOrderCash, KoreaInvestmentOrderCash } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useEffect } from "react";

import { usePathname } from "next/navigation";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import NotFound from "@/app/not-found";
import { CapitalTokenType, reqGetCapitalToken, selectCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";

let DEBUG = false;

export default function BalanceKr() {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);

    const kiOrderCash: KoreaInvestmentOrderCash = useAppSelector(getKoreaInvestmentOrderCash);

    const kr_capital_token: CapitalTokenType = useAppSelector(selectCapitalToken);

    useEffect(() => {

    }, []);
    useEffect(() => {
        if (true == DEBUG) console.log(`[BalanceKr]`, `kiBalance`, kiBalance);
        if ("fulfilled" != kiBalance.state) {
            dispatch(reqGetInquireBalance());
        }
    }, [kiBalance]);
    useEffect(() => {
        // console.log(`[BalanceKr]`, `kiOrderCash`, kiOrderCash);
    }, [kiOrderCash])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `kr_capital_token`, kr_capital_token);
        if ("init" == kr_capital_token.state) {
            dispatch(reqGetCapitalToken());
        }
    }, [kr_capital_token])

    // console.log(`kiBalance.state`, kiBalance.state);
    if (kiBalance.state == "rejected") {
        return <>
            <NotFound warnText={"계좌 조회 권한이 없습니다"} />
            <div className="dark:bg-black h-lvh"></div>
        </>
    }

    return <>
        <InquireBalanceResult
            kiBalance={kiBalance}
            reqGetInquireBalance={reqGetInquireBalance}
            kiOrderCash={kiOrderCash}
            reqPostOrderCash={reqPostOrderCash}
            stock_list={kr_capital_token.value.stock_list}
        />
        <div className="dark:bg-black h-lvh"></div>
    </>
}
