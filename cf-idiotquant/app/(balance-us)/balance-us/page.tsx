"use client"

import NotFound from "@/app/not-found";
import InquireBalanceResult from "@/components/inquireBalanceResult";
import { CapitalTokenType, reqGetUsCapitalToken, selectUsCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { KakaoTotal, reqGetKakaoMemberList, selectKakaoMemberList, selectKakaoTatalState, selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import { reqGetOverseasStockTradingInquirePresentBalance, getKoreaInvestmentUsMaretPresentBalance, KoreaInvestmentOverseasPresentBalance, reqPostOrderUs, getKoreaInvestmentUsOrder, KoreaInvestmentUsOrder } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Box, Code, Flex, Text } from "@radix-ui/themes";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

let DEBUG = false;

export default function BalanceUs() {
    const pathname = usePathname();

    const kiBalance: KoreaInvestmentOverseasPresentBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance);

    const kiUsOrder: KoreaInvestmentUsOrder = useAppSelector(getKoreaInvestmentUsOrder);

    const dispatch = useAppDispatch();

    const us_capital_token: CapitalTokenType = useAppSelector(selectUsCapitalToken);

    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const kakaoMemberList = useAppSelector(selectKakaoMemberList);

    useEffect(() => {
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `kiBalance`, kiBalance);
        if ("init" == kiBalance.state) {
            dispatch(reqGetOverseasStockTradingInquirePresentBalance());
        }
    }, [kiBalance]);

    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `kr_capital_token`, us_capital_token);
        if ("init" == us_capital_token.state) {
            dispatch(reqGetUsCapitalToken());
        }
    }, [us_capital_token])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `kakaoTotal`, kakaoTotal);
        if (kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER) {
            dispatch(reqGetKakaoMemberList());
        }
    }, [kakaoTotal])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `kakaoMemberList`, kakaoMemberList);
    }, [kakaoMemberList])

    if (DEBUG) console.log(`kiBalance.state`, kiBalance.state);
    if (kiBalance.state == "rejected") {
        return <>
            <NotFound warnText="계좌 조회 권한이 없습니다" />
        </>
    }
    return <>
        <Box px="1"><Text size="3">🇺🇸 {!!kiBalance?.output2?.[0]?.frst_bltn_exrt ?
            `$1 = ₩${formatNumber(Number(kiBalance?.output2?.[0]?.frst_bltn_exrt))}`
            : ""}</Text></Box>
        <InquireBalanceResult
            kiBalance={kiBalance}
            reqGetInquireBalance={reqGetOverseasStockTradingInquirePresentBalance}
            kiOrderCash={kiUsOrder}
            reqPostOrderCash={reqPostOrderUs}
            stock_list={us_capital_token.value.stock_list}
            kakaoTotal={kakaoTotal}
            kakaoMemberList={kakaoMemberList}
        />
    </>
}

function formatNumber(num: number) {
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
}