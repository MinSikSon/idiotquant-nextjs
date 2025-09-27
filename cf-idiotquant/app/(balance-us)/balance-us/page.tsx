"use client"

import NotFound from "@/app/not-found";
import Auth from "@/components/auth";
import InquireBalanceResult from "@/components/inquireBalanceResult";
import { isValidCookie } from "@/components/util";
import { CapitalTokenType, reqGetUsCapitalToken, selectUsCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { selectKakaoTatalState } from "@/lib/features/kakao/kakaoSlice";
import { getKoreaInvestmentToken, KoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqGetOverseasStockTradingInquirePresentBalance, getKoreaInvestmentUsMaretPresentBalance, KoreaInvestmentOverseasPresentBalance, reqPostOrderUs, getKoreaInvestmentUsOrder, KoreaInvestmentUsOrder } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const DEBUG = false;

export default function BalanceUs() {
    const pathname = usePathname();

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentOverseasPresentBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance);

    const kiUsOrder: KoreaInvestmentUsOrder = useAppSelector(getKoreaInvestmentUsOrder);

    const dispatch = useAppDispatch();

    const us_capital_token: CapitalTokenType = useAppSelector(selectUsCapitalToken);

    const [validCookie, setValidCookie] = useState<any>(false);

    const kakaoTotalState = useAppSelector(selectKakaoTatalState);

    useEffect(() => {
        setValidCookie(isValidCookie("koreaInvestmentToken"));
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `kiToken:`, kiToken);
        const isValidKiAccessToken = !!kiToken["access_token"];
        if (true == isValidKiAccessToken) {
            dispatch(reqGetOverseasStockTradingInquirePresentBalance(kiToken));
        }

        if (DEBUG) console.log(`[BalanceUs]`, `validCookie:`, validCookie);
        if (false == validCookie) {
            setValidCookie(isValidCookie("koreaInvestmentToken"));
        }
    }, [kiToken]);

    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `kiBalance`, kiBalance);
    }, [kiBalance]);

    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `kr_capital_token`, us_capital_token);
        if ("init" == us_capital_token.state) {
            dispatch(reqGetUsCapitalToken({ koreaInvestmentToken: kiToken }));
        }
    }, [us_capital_token])

    if (DEBUG) console.log(`[BalanceUs] validCookie:`, validCookie);
    if (DEBUG) console.log(`[BalanceUs] kiToken:`, kiToken);
    if ("fulfilled" != kiToken?.state) {
        return <>
            <Auth />
            <div className="dark:bg-black h-lvh"></div>
        </>
    }

    if (DEBUG) console.log(`kiBalance.state`, kiBalance.state);
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
            stock_list={us_capital_token.value.stock_list}
        />
        <div className="dark:bg-black h-lvh"></div>
    </>
}