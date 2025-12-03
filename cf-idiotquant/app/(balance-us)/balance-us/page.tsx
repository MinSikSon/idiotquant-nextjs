"use client"

import NotFound from "@/app/not-found";
import InquireBalanceResult from "@/components/inquireBalanceResult";
import OverseasCcnlTable from "@/components/balance/ccnlTable";
import OverseasNccsTable from "@/components/balance/nccsTable";
import { CapitalTokenType, reqGetUsCapitalToken, selectUsCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { KakaoTotal, reqGetKakaoMemberList, selectKakaoMemberList, selectKakaoTatalState, selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import { reqGetOverseasStockTradingInquirePresentBalance, getKoreaInvestmentUsMaretPresentBalance, KoreaInvestmentOverseasPresentBalance, reqPostOrderUs, getKoreaInvestmentUsOrder, KoreaInvestmentUsOrder, KoreaInvestmentOverseasNccs, getKoreaInvestmentUsMaretNccs, reqGetOverseasStockTradingInquireNccs, KoreaInvestmentOverseasCcnl, getKoreaInvestmentUsMaretCcnl, reqGetOverseasStockTradingInquireCcnl } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Box, Button, Code, Flex, Text } from "@radix-ui/themes";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { UsCapitalType, reqGetUsCapital, reqPostUsCapitalTokenAllPlus, reqPostUsCapitalTokenAllMinus, selectUsCapital, selectUsCapitalTokenAllMinus, selectUsCapitalTokenAllPlus } from "@/lib/features/capital/capitalSlice";
import StockListTable from "@/components/balance/stockListTable";

let DEBUG = false;

export default function BalanceUs() {
    const pathname = usePathname();

    const kiBalance: KoreaInvestmentOverseasPresentBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance);
    const kiCcnl: KoreaInvestmentOverseasCcnl = useAppSelector(getKoreaInvestmentUsMaretCcnl);
    const kiNccs: KoreaInvestmentOverseasNccs = useAppSelector(getKoreaInvestmentUsMaretNccs);

    const kiUsOrder: KoreaInvestmentUsOrder = useAppSelector(getKoreaInvestmentUsOrder);

    const dispatch = useAppDispatch();

    const us_capital_token: CapitalTokenType = useAppSelector(selectUsCapitalToken);

    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const kakaoMemberList = useAppSelector(selectKakaoMemberList);

    const [balanceKey, setBalanceKey] = useState(String(kakaoTotal?.id));

    const usCapital: UsCapitalType = useAppSelector(selectUsCapital);
    const usCapitalTokenAllPlus = useAppSelector(selectUsCapitalTokenAllPlus);
    const usCapitalTokenAllMinus = useAppSelector(selectUsCapitalTokenAllMinus);

    useEffect(() => {
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `kiBalance`, kiBalance);
        if ("init" == kiBalance.state) {
            dispatch(reqGetOverseasStockTradingInquirePresentBalance());
        }
    }, [kiBalance]);
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `kiCcnl`, kiCcnl);
        if ("init" == kiNccs.state) {
            dispatch(reqGetOverseasStockTradingInquireCcnl());
        }
    }, [kiCcnl]);
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `kiNccs`, kiNccs);
        if ("init" == kiNccs.state) {
            dispatch(reqGetOverseasStockTradingInquireNccs());
        }
    }, [kiNccs]);
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `usCapital`, usCapital);
        if ("init" == kiNccs.state) {
            dispatch(reqGetUsCapital());
        }
    }, [usCapital]);

    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `kr_capital_token`, us_capital_token);
        if ("init" == us_capital_token.state) {
            dispatch(reqGetUsCapitalToken());
        }
    }, [us_capital_token])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `kakaoTotal`, kakaoTotal);
        if (kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER) {
            dispatch(reqGetKakaoMemberList());
        }
    }, [kakaoTotal])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `kakaoMemberList`, kakaoMemberList);
    }, [kakaoMemberList])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `usCapitalTokenAllPlus`, usCapitalTokenAllPlus);
        if ("fulfilled" == usCapitalTokenAllPlus?.state) {
            dispatch(reqGetUsCapital(balanceKey));
        }
    }, [usCapitalTokenAllPlus])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `usCapitalTokenAllMinus`, usCapitalTokenAllMinus);
        if ("fulfilled" == usCapitalTokenAllMinus?.state) {
            dispatch(reqGetUsCapital(balanceKey));
        }
    }, [usCapitalTokenAllMinus])


    if (DEBUG) console.log(`kiBalance.state`, kiBalance.state);
    if (kiBalance.state == "rejected") {
        return <>
            <NotFound warnText="계좌 조회 권한이 없습니다" />
        </>
    }

    function doAllTokenPlus(num: number) {
        console.log(`doAllTokenPlus`);
        dispatch(reqPostUsCapitalTokenAllPlus({ key: balanceKey, num: num }));
    }
    function doAllTokenMinus(num: number) {
        console.log(`doAllTokenMinus`);
        dispatch(reqPostUsCapitalTokenAllMinus({ key: balanceKey, num: num }));
    }
    return <>
        <Flex direction="column" align="center" justify="center" gap="2">
            <Text size="6">
                <Code>로그인</Code>
            </Text>
            <Text size="3">
                🇺🇸{" "}
                {!!kiBalance?.output2?.[0]?.frst_bltn_exrt ?
                    `$1 = ₩${formatNumber(Number(kiBalance?.output2?.[0]?.frst_bltn_exrt))}`
                    : ""}</Text>

        </Flex>
        <InquireBalanceResult
            balanceKey={balanceKey}
            setBalanceKey={setBalanceKey}
            kiBalance={kiBalance}
            reqGetInquireBalance={reqGetOverseasStockTradingInquirePresentBalance}
            reqGetInquireCcnl={reqGetOverseasStockTradingInquireCcnl}
            reqGetInquireNccs={reqGetOverseasStockTradingInquireNccs}
            reqGetUsCapital={reqGetUsCapital}
            kiOrderCash={kiUsOrder}
            reqPostOrderCash={reqPostOrderUs}
            stock_list={us_capital_token.value.stock_list}
            kakaoTotal={kakaoTotal}
            kakaoMemberList={kakaoMemberList}
        />
        <OverseasCcnlTable data={kiCcnl} />
        <OverseasNccsTable data={kiNccs} />
        <StockListTable data={usCapital} doAllTokenPlus={doAllTokenPlus} doAllTokenMinus={doAllTokenMinus} />
    </>
}

function formatNumber(num: number) {
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
}