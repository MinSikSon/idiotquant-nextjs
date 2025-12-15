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
import { KrUsCapitalType, reqGetKrCapital, reqPostKrCapitalTokenMinusAll, reqPostKrCapitalTokenMinusOne, reqPostKrCapitalTokenPlusAll, reqPostKrCapitalTokenPlusOne, selectKrCapital, selectKrCapitalTokenMinusAll, selectKrCapitalTokenMinusOne, selectKrCapitalTokenPlusAll, selectKrCapitalTokenPlusOne } from "@/lib/features/capital/capitalSlice";

let DEBUG = false;

export default function BalanceKr() {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);

    const kiOrderCash: KoreaInvestmentOrderCash = useAppSelector(getKoreaInvestmentOrderCash);

    // const kr_capital_token: CapitalTokenType = useAppSelector(selectCapitalToken);


    const krCapital: KrUsCapitalType = useAppSelector(selectKrCapital);
    const krCapitalTokenPlusAll = useAppSelector(selectKrCapitalTokenPlusAll);
    const krCapitalTokenPlusOne = useAppSelector(selectKrCapitalTokenPlusOne);
    const krCapitalTokenMinusAll = useAppSelector(selectKrCapitalTokenMinusAll);
    const krCapitalTokenMinusOne = useAppSelector(selectKrCapitalTokenMinusOne);

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
    // useEffect(() => {
    //     if (DEBUG) console.log(`[BalanceKr]`, `kr_capital_token`, kr_capital_token);
    // }, [kr_capital_token])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `krCapital`, krCapital);
        if ("init" == krCapital.state) {
            dispatch(reqGetKrCapital());
        }
    }, [krCapital]);
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `kakaoTotal`, kakaoTotal);
        if (kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER) {
            dispatch(reqGetKakaoMemberList());
        }
    }, [kakaoTotal])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `kakaoMemberList`, kakaoMemberList);
    }, [kakaoMemberList])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `krCapitalTokenPlusAll`, krCapitalTokenPlusAll);
        if ("fulfilled" == krCapitalTokenPlusAll?.state) {
            dispatch(reqGetKrCapital(balanceKey));
        }
    }, [krCapitalTokenPlusAll])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `krCapitalTokenPlusOne`, krCapitalTokenPlusOne);
        if ("fulfilled" == krCapitalTokenPlusOne?.state) {
            dispatch(reqGetKrCapital(balanceKey));
        }
    }, [krCapitalTokenPlusOne])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `krCapitalTokenMinusAll`, krCapitalTokenMinusAll);
        if ("fulfilled" == krCapitalTokenMinusAll?.state) {
            dispatch(reqGetKrCapital(balanceKey));
        }
    }, [krCapitalTokenMinusAll])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceKr]`, `krCapitalTokenMinusOne`, krCapitalTokenMinusOne);
        if ("fulfilled" == krCapitalTokenMinusOne?.state) {
            dispatch(reqGetKrCapital(balanceKey));
        }
    }, [krCapitalTokenMinusOne])

    // console.log(`kiBalance.state`, kiBalance.state);
    if (kiBalance.state == "rejected") {
        return <>
            <NotFound warnText="계좌 조회 권한이 없습니다" />
        </>
    }
    function doTokenPlusAll(num: number) {
        console.log(`doTokenPlusAll`);
        dispatch(reqPostKrCapitalTokenPlusAll({ key: balanceKey, num: num }));
    }
    function doTokenPlusOne(num: number, ticker: string) {
        console.log(`doTokenPlusOne ticker:`, ticker);
        if (undefined == ticker) {
            return;
        }
        dispatch(reqPostKrCapitalTokenPlusOne({ key: balanceKey, num: num, ticker: ticker }));
    }
    function doTokenMinusAll(num: number) {
        console.log(`doTokenMinusAll`);
        dispatch(reqPostKrCapitalTokenMinusAll({ key: balanceKey, num: num }));
    }

    function doTokenMinusOne(num: number, ticker: string) {
        console.log(`doTokenMinusOne ticker:`, ticker);
        if (undefined == ticker) {
            return;
        }
        dispatch(reqPostKrCapitalTokenMinusOne({ key: balanceKey, num: num, ticker: ticker }));
    }
    return <>
        <Flex direction="column" align="center" justify="center" gap="2">
            <Text size="6">
                <Code>계좌조회</Code>
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
            // stock_list={kr_capital_token.value.stock_list}
            kakaoTotal={kakaoTotal}
            kakaoMemberList={kakaoMemberList}
        />
        <StockListTable
            // dataKr={kr_capital_token}
            data={krCapital}
            kakaoTotal={kakaoTotal}
            doTokenPlusAll={doTokenPlusAll} doTokenMinusAll={doTokenMinusAll}
            doTokenPlusOne={doTokenPlusOne} doTokenMinusOne={doTokenMinusOne}
        />
    </>
}
