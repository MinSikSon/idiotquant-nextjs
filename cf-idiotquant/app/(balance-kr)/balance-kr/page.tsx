"use client"

import { reqGetInquireBalance, getKoreaInvestmentBalance, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqPostOrderCash, getKoreaInvestmentOrderCash, KoreaInvestmentOrderCash } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useEffect } from "react";

import { usePathname } from "next/navigation";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import NotFound from "@/app/not-found";
import { CapitalTokenType, reqGetCapitalToken, selectCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { Box, Text } from "@radix-ui/themes";
import { KakaoTotal, reqGetKakaoMemberList, selectKakaoMemberList, selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";

let DEBUG = false;

export default function BalanceKr() {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);

    const kiOrderCash: KoreaInvestmentOrderCash = useAppSelector(getKoreaInvestmentOrderCash);

    const kr_capital_token: CapitalTokenType = useAppSelector(selectCapitalToken);

    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const kakaoMemberList = useAppSelector(selectKakaoMemberList);

    useEffect(() => {

    }, []);
    useEffect(() => {
        dispatch(reqGetInquireBalance());
        dispatch(reqGetCapitalToken());
    }, []);
    useEffect(() => {
        if (true == DEBUG) console.log(`[BalanceKr]`, `kiBalance`, kiBalance);
    }, [kiBalance])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `kr_capital_token`, kr_capital_token);
    }, [kr_capital_token])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `kakaoTotal`, kakaoTotal);
        if (kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER) {
            dispatch(reqGetKakaoMemberList());
        }
    }, [kakaoTotal])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `kakaoMemberList`, kakaoMemberList);
    }, [kakaoMemberList])

    // console.log(`kiBalance.state`, kiBalance.state);
    if (kiBalance.state == "rejected") {
        return <>
            <NotFound warnText={"계좌 조회 권한이 없습니다"} />
            <Box className="dark:bg-black h-lvh"></Box>
        </>
    }

    return <>
        <Box px="1"><Text size="3">🇰🇷</Text></Box>
        <InquireBalanceResult
            kiBalance={kiBalance}
            reqGetInquireBalance={reqGetInquireBalance}
            kiOrderCash={kiOrderCash}
            reqPostOrderCash={reqPostOrderCash}
            stock_list={kr_capital_token.value.stock_list}
            kakaoTotal={kakaoTotal}
            kakaoMemberList={kakaoMemberList}
        />
    </>
}
