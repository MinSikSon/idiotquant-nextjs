"use client"

import Login from "@/app/(login)/login/login";
import Auth from "@/components/auth";
import InquireBalanceResult from "@/components/inquireBalanceResult";
import { isValidCookie } from "@/components/util";
import { getKoreaInvestmentToken, KoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqGetOverseasStockTradingInquireBalance, getKoreaInvestmentUsMaretBalance, KoreaInvestmentOverseasBalance } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";


import { selectState } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { usePathname } from "next/navigation";
import React from "react";

export default function BalanceUs() {
    const pathname = usePathname();
    const loginState = useAppSelector(selectState);

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentOverseasBalance = useAppSelector(getKoreaInvestmentUsMaretBalance);

    const dispatch = useAppDispatch();

    React.useEffect(() => {
        // console.log(`[BalanceUs]`, `kiToken:`, kiToken);
        const isValidKiAccessToken = !!kiToken["access_token"];
        if (true == isValidKiAccessToken) {
            dispatch(reqGetOverseasStockTradingInquireBalance(kiToken));
        }
    }, [kiToken]);

    React.useEffect(() => {
        // console.log(`[BalanceUs]`, `kiBalance`, kiBalance);
    }, [kiBalance]);

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

    return <InquireBalanceResult
        kiBalance={kiBalance}
        reqGetInquireBalance={reqGetOverseasStockTradingInquireBalance}
        kiToken={kiToken}
    //    kiOrderCash={kiOrderCash}
    //    reqPostOrderCash={reqPostOrderCash}
    />
}