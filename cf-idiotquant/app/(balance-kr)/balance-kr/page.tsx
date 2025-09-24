"use client"

import { isValidCookie, } from "@/components/util";
import { getKoreaInvestmentToken, KoreaInvestmentToken, } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqGetInquireBalance, getKoreaInvestmentBalance, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqPostOrderCash, getKoreaInvestmentOrderCash, KoreaInvestmentOrderCash } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useState, useEffect } from "react";

import { usePathname } from "next/navigation";
import Auth from "@/components/auth";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import NotFound from "@/app/not-found";
import { CapitalTokenType, reqGetCapitalToken, selectCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";

let DEBUG = false;

export default function BalanceKr() {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);

    const kiOrderCash: KoreaInvestmentOrderCash = useAppSelector(getKoreaInvestmentOrderCash);

    const kr_capital_token: CapitalTokenType = useAppSelector(selectCapitalToken);

    useEffect(() => {

        const isValidKiAccessToken = !!kiToken["access_token"];
        if (DEBUG) console.log(`[BalanceKr]`, `isValidKiAccessToken`, isValidKiAccessToken);
        if (true == isValidKiAccessToken) {
            dispatch(reqGetInquireBalance(kiToken));
        }

    }, [kiToken]);

    useEffect(() => {
        if (true == DEBUG) console.log(`[BalanceKr]`, `kiBalance`, kiBalance);
    }, [kiBalance]);

    useEffect(() => {
        // console.log(`[BalanceKr]`, `kiOrderCash`, kiOrderCash);
    }, [kiOrderCash])

    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `kr_capital_token`, kr_capital_token);
        if ("init" == kr_capital_token.state) {
            dispatch(reqGetCapitalToken({ koreaInvestmentToken: kiToken }));
        }
    }, [kr_capital_token])

    const [validCookie, setValidCookie] = useState<any>(false);
    useEffect(() => {
        setValidCookie(isValidCookie("koreaInvestmentToken"));
    }, []);

    if (false == validCookie || false == !!kiToken["access_token"]) {
        return <>
            <Auth />
            <div className="dark:bg-black h-lvh"></div>
        </>
    }

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
            kiToken={kiToken}
            kiOrderCash={kiOrderCash}
            reqPostOrderCash={reqPostOrderCash}
            stock_list={kr_capital_token.value.stock_list}
        />
        <div className="dark:bg-black h-lvh"></div>
    </>
}
