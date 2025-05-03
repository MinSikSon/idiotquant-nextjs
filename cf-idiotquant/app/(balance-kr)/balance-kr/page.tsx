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
import NotFound from "@/app/not-found";

export default function BalanceKr() {
    const pathname = usePathname();
    const loginState = useAppSelector(selectLoginState);

    const dispatch = useAppDispatch();
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);

    const kiOrderCash: KoreaInvestmentOrderCash = useAppSelector(getKoreaInvestmentOrderCash);

    React.useEffect(() => {
        // console.log(`[BalanceKr]`, `loginState`, loginState);
        // console.log(`[BalanceKr]`, `kiToken:`, kiToken);
        if ("cf" == loginState || "kakao" == loginState) {
            const isValidKiAccessToken = !!kiToken["access_token"];
            if (true == isValidKiAccessToken) {
                dispatch(reqGetInquireBalance(kiToken));
            }
        }
    }, [kiToken, loginState]);

    React.useEffect(() => {
        // console.log(`[BalanceKr]`, `kiBalance`, kiBalance);
    }, [kiBalance]);

    React.useEffect(() => {
        // console.log(`[BalanceKr]`, `kiOrderCash`, kiOrderCash);
    }, [kiOrderCash])

    if ("init" == loginState || "rejected" == loginState) {
        return <>
            <Login parentUrl={pathname} />
            <div className="dark:bg-black h-lvh"></div>
        </>
    }

    if (false == isValidCookie("koreaInvestmentToken") || false == !!kiToken["access_token"]) {
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
        />
        <div className="dark:bg-black h-lvh"></div>
    </>
}
