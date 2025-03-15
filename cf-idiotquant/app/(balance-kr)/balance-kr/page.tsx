"use client"

import Login from "@/app/(login)/login/login";
import { selectLoginState } from "@/lib/features/login/loginSlice";
import { isValidCookie, } from "@/components/util";
import { getKoreaInvestmentToken, KoreaInvestmentToken, } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqGetInquireBalance, getKoreaInvestmentBalance, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqPostOrderCash, getKoreaInvestmentOrderCash, KoreaInvestmentOrderCash } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import React from "react";

import { usePathname } from "next/navigation";
import Auth from "@/components/auth";

import InquireBalanceResult from "@/components/inquireBalanceResult";

export default function BalanceKr() {
    const pathname = usePathname();
    const loginState = useAppSelector(selectLoginState);

    const dispatch = useAppDispatch();
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);

    const kiOrderCash: KoreaInvestmentOrderCash = useAppSelector(getKoreaInvestmentOrderCash);

    React.useEffect(() => {
        // console.log(`[BalanceKr]`, `kiToken:`, kiToken);
        const isValidKiAccessToken = !!kiToken["access_token"];
        if (true == isValidKiAccessToken) {
            dispatch(reqGetInquireBalance(kiToken));
        }
    }, [kiToken]);

    React.useEffect(() => {
        // console.log(`[BalanceKr]`, `kiBalance`, kiBalance);
    }, [kiBalance]);

    React.useEffect(() => {
        // console.log(`[BalanceKr]`, `kiOrderCash`, kiOrderCash);
    }, [kiOrderCash])

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
        reqGetInquireBalance={reqGetInquireBalance}
        kiToken={kiToken}
        kiOrderCash={kiOrderCash}
        reqPostOrderCash={reqPostOrderCash}
    />
}
