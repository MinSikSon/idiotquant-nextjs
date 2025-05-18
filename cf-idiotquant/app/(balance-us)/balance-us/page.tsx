"use client"

import Login from "@/app/(login)/login/login";
import NotFound from "@/app/not-found";
import Auth from "@/components/auth";
import InquireBalanceResult from "@/components/InquireBalanceResult";
import { isValidCookie } from "@/components/util";
import { getKoreaInvestmentToken, KoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqGetOverseasStockTradingInquirePresentBalance, getKoreaInvestmentUsMaretPresentBalance, KoreaInvestmentOverseasPresentBalance, reqPostOrderUs, getKoreaInvestmentUsOrder, KoreaInvestmentUsOrder } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";


import { selectLoginState } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { usePathname } from "next/navigation";
import React from "react";

const DEBUG = false;

export default function BalanceUs() {
    const pathname = usePathname();
    const loginState = useAppSelector(selectLoginState);

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentOverseasPresentBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance);

    const kiUsOrder: KoreaInvestmentUsOrder = useAppSelector(getKoreaInvestmentUsOrder);

    const dispatch = useAppDispatch();

    React.useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `loginState`, loginState);
        if (DEBUG) console.log(`[BalanceUs]`, `kiToken:`, kiToken);
        const isValidKiAccessToken = !!kiToken["access_token"];
        if ("cf" == loginState || "kakao" == loginState) {
            if (true == isValidKiAccessToken) {
                dispatch(reqGetOverseasStockTradingInquirePresentBalance(kiToken));
            }
        }
    }, [kiToken, loginState]);

    React.useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `kiBalance`, kiBalance);
    }, [kiBalance]);


    // console.log(`loginState`, loginState);
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
            reqGetInquireBalance={reqGetOverseasStockTradingInquirePresentBalance}
            kiToken={kiToken}
            kiOrderCash={kiUsOrder}
            reqPostOrderCash={reqPostOrderUs}
        />
        <div className="dark:bg-black h-lvh"></div>
    </>
}