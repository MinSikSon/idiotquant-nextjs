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
import { UsCapitalType, reqGetUsCapital, reqPostUsCapitalTokenPlusAll, reqPostUsCapitalTokenPlusOne, reqPostUsCapitalTokenMinusAll, reqPostUsCapitalTokenMinusOne, selectUsCapital, selectUsCapitalTokenMinusAll, selectUsCapitalTokenPlusAll, selectUsCapitalTokenPlusOne, selectUsCapitalTokenMinusOne } from "@/lib/features/capital/capitalSlice";
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
    const usCapitalTokenPlusAll = useAppSelector(selectUsCapitalTokenPlusAll);
    const usCapitalTokenPlusOne = useAppSelector(selectUsCapitalTokenPlusOne);
    const usCapitalTokenMinusAll = useAppSelector(selectUsCapitalTokenMinusAll);
    const usCapitalTokenMinusOne = useAppSelector(selectUsCapitalTokenMinusOne);

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
        if (DEBUG) console.log(`[BalanceUs]`, `usCapitalTokenPlusAll`, usCapitalTokenPlusAll);
        if ("fulfilled" == usCapitalTokenPlusAll?.state) {
            dispatch(reqGetUsCapital(balanceKey));
        }
    }, [usCapitalTokenPlusAll])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `usCapitalTokenPlusOne`, usCapitalTokenPlusOne);
        if ("fulfilled" == usCapitalTokenPlusOne?.state) {
            dispatch(reqGetUsCapital(balanceKey));
        }
    }, [usCapitalTokenPlusOne])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `usCapitalTokenMinusAll`, usCapitalTokenMinusAll);
        if ("fulfilled" == usCapitalTokenMinusAll?.state) {
            dispatch(reqGetUsCapital(balanceKey));
        }
    }, [usCapitalTokenMinusAll])
    useEffect(() => {
        if (DEBUG) console.log(`[BalanceUs]`, `usCapitalTokenMinusOne`, usCapitalTokenMinusOne);
        if ("fulfilled" == usCapitalTokenMinusOne?.state) {
            dispatch(reqGetUsCapital(balanceKey));
        }
    }, [usCapitalTokenMinusOne])


    if (DEBUG) console.log(`kiBalance.state`, kiBalance.state);
    if (kiBalance.state == "rejected") {
        return <>
            <NotFound warnText="계좌 조회 권한이 없습니다" />
        </>
    }

    function doTokenPlusAll(num: number) {
        console.log(`doTokenPlusAll`);
        dispatch(reqPostUsCapitalTokenPlusAll({ key: balanceKey, num: num }));
    }
    function doTokenPlusOne(num: number, ticker: string) {
        console.log(`doTokenPlusOne ticker:`, ticker);
        if (undefined == ticker) {
            return;
        }
        dispatch(reqPostUsCapitalTokenPlusOne({ key: balanceKey, num: num, ticker: ticker }));
    }
    function doTokenMinusAll(num: number) {
        console.log(`doTokenMinusAll`);
        dispatch(reqPostUsCapitalTokenMinusAll({ key: balanceKey, num: num }));
    }

    function doTokenMinusOne(num: number, ticker: string) {
        console.log(`doTokenMinusOne ticker:`, ticker);
        if (undefined == ticker) {
            return;
        }
        dispatch(reqPostUsCapitalTokenMinusOne({ key: balanceKey, num: num, ticker: ticker }));
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
        <StockListTable data={usCapital}
            kakaoTotal={kakaoTotal}
            doTokenPlusAll={doTokenPlusAll} doTokenMinusAll={doTokenMinusAll}
            doTokenPlusOne={doTokenPlusOne} doTokenMinusOne={doTokenMinusOne}
        />
        <OverseasCcnlTable data={kiCcnl} />
        <OverseasNccsTable data={kiNccs} />
    </>
}

function formatNumber(num: number) {
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
}