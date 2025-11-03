"use client"

import { reqGetInquireBalance, getKoreaInvestmentBalance, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqPostOrderCash, getKoreaInvestmentOrderCash, KoreaInvestmentOrderCash } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useEffect } from "react";

import { usePathname } from "next/navigation";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import NotFound from "@/app/not-found";
import { CapitalTokenType, reqGetCapitalToken, selectCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { Box } from "@radix-ui/themes";

let DEBUG = false;

export default function BalanceKr() {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);

    const kiOrderCash: KoreaInvestmentOrderCash = useAppSelector(getKoreaInvestmentOrderCash);

    const kr_capital_token: CapitalTokenType = useAppSelector(selectCapitalToken);

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

    // console.log(`kiBalance.state`, kiBalance.state);
    if (kiBalance.state == "rejected") {
        return <>
            <NotFound warnText={"계좌 조회 권한이 없습니다"} />
            <Box className="dark:bg-black h-lvh"></Box>
        </>
    }

    return <>
        <InquireBalanceResult
            kiBalance={kiBalance}
            reqGetInquireBalance={reqGetInquireBalance}
            kiOrderCash={kiOrderCash}
            reqPostOrderCash={reqPostOrderCash}
            stock_list={kr_capital_token.value.stock_list}
        />
        <Box className="dark:bg-black h-lvh"></Box>
    </>
}
