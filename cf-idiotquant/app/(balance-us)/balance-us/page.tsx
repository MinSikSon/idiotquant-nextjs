"use client"

import Login from "@/app/(login)/login/login";
import Auth from "@/components/auth";
import InquireBalanceResult from "@/components/inquireBalanceResult";
import { isValidCookie } from "@/components/util";
import { getKoreaInvestmentToken, KoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqGetOverseasStockTradingInquirePresentBalance, getKoreaInvestmentUsMaretPresentBalance, KoreaInvestmentOverseasPresentBalance, reqPostOrderUs, getKoreaInvestmentUsOrder, KoreaInvestmentUsOrder } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";


import { selectState } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { usePathname } from "next/navigation";
import React from "react";

export default function BalanceUs() {
    const pathname = usePathname();
    const loginState = useAppSelector(selectState);

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentOverseasPresentBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance);

    const kiUsOrder: KoreaInvestmentUsOrder = useAppSelector(getKoreaInvestmentUsOrder);

    const dispatch = useAppDispatch();

    React.useEffect(() => {
        // console.log(`[BalanceUs]`, `kiToken:`, kiToken);
        const isValidKiAccessToken = !!kiToken["access_token"];
        if (true == isValidKiAccessToken) {
            dispatch(reqGetOverseasStockTradingInquirePresentBalance(kiToken));
        }
    }, [kiToken]);

    React.useEffect(() => {
        // console.log(`[BalanceUs]`, `kiBalance`, kiBalance);
    }, [kiBalance]);

    React.useEffect(() => {
        // console.log(`[BalanceUs]`, `loginState`, loginState);
    }, [loginState]);


    // console.log(`loginState`, loginState);
    if ("init" == loginState || "rejected" == loginState) {
        return <>
            <Login parentUrl={pathname} />
        </>
    }

    if (false == isValidCookie("koreaInvestmentToken") || false == !!kiToken["access_token"]) {
        return <>
            <Auth />
        </>
    }

    return <InquireBalanceResult
        kiBalance={kiBalance}
        reqGetInquireBalance={reqGetOverseasStockTradingInquirePresentBalance}
        kiToken={kiToken}
        kiOrderCash={kiUsOrder}
        reqPostOrderCash={reqPostOrderUs}
    />
}