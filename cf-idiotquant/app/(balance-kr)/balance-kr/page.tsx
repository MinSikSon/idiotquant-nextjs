"use client"

import { reqGetInquireBalance, getKoreaInvestmentBalance, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqPostOrderCash, getKoreaInvestmentOrderCash, KoreaInvestmentOrderCash } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import NotFound from "@/app/not-found";
import { CapitalTokenType, reqGetCapitalToken, selectCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { Box, Code, Flex, Text } from "@radix-ui/themes";
import { KakaoTotal, reqGetKakaoMemberList, selectKakaoMemberList, selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import StockListTable from "@/components/balance/stockListTable";

let DEBUG = false;

export default function BalanceKr() {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);

    const kiOrderCash: KoreaInvestmentOrderCash = useAppSelector(getKoreaInvestmentOrderCash);

    const kr_capital_token: CapitalTokenType = useAppSelector(selectCapitalToken);

    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const kakaoMemberList = useAppSelector(selectKakaoMemberList);

    const [balanceKey, setBalanceKey] = useState(String(kakaoTotal?.id));

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
            <NotFound warnText="계좌 조회 권한이 없습니다" />
        </>
    }

    function doTokenPlusAll() {
        if (DEBUG) console.log(`doTokenPlusAll`);
    }
    function doTokenPlusOne() {
        if (DEBUG) console.log(`doTokenPlusOne`);
    }
    function doTokenMinusAll() {
        if (DEBUG) console.log(`doTokenMinusAll`);
    }
    function doTokenMinusOne() {
        if (DEBUG) console.log(`doTokenMinusOne`);
    }
    return <>
        <Flex direction="column" align="center" justify="center" gap="2">
            <Text size="6">
                <Code>로그인</Code>
            </Text>
            <Text size="3">🇰🇷</Text>
        </Flex>
        <InquireBalanceResult
            balanceKey={balanceKey}
            setBalanceKey={setBalanceKey}
            kiBalance={kiBalance}
            reqGetInquireBalance={reqGetInquireBalance}
            kiOrderCash={kiOrderCash}
            reqPostOrderCash={reqPostOrderCash}
            stock_list={kr_capital_token.value.stock_list}
            kakaoTotal={kakaoTotal}
            kakaoMemberList={kakaoMemberList}
        />
        <StockListTable
            dataKr={kr_capital_token}
            kakaoTotal={kakaoTotal}
            doTokenPlusAll={doTokenPlusAll} doTokenMinusAll={doTokenMinusAll}
            doTokenPlusOne={doTokenPlusOne} doTokenMinusOne={doTokenMinusOne}
        />
    </>
}
