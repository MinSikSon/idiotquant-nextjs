"use client"

import React from "react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectLoginState } from "@/lib/features/login/loginSlice";
import { usePathname } from "next/navigation";
import { isValidCookie } from "@/components/util";
import { getKoreaInvestmentUsMaretSearchInfo, reqGetQuotationsSearchInfo } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { getKoreaInvestmentUsMaretPriceDetail, reqGetQuotationsPriceDetail } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { getKoreaInvestmentToken, KoreaInvestmentToken, reqGetInquireBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import SearchAutocomplete from "@/components/searchAutoComplete";

import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import Login from "@/app/(login)/login/login";
import Auth from "@/components/auth";

export default function Search() {
    const pathname = usePathname();
    const dispatch = useAppDispatch();

    const loginState = useAppSelector(selectLoginState);

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);

    const kiUsMaretSearchInfo: any = useAppSelector(getKoreaInvestmentUsMaretSearchInfo);
    const kiUsMaretPriceDetail: any = useAppSelector(getKoreaInvestmentUsMaretPriceDetail);

    React.useEffect(() => {
        // console.log(`[Search]`, `kiToken:`, kiToken);
        const isValidKiAccessToken = !!kiToken["access_token"];
        if (true == isValidKiAccessToken) {
            dispatch(reqGetInquireBalance(kiToken));
        }
    }, [kiToken]);

    React.useEffect(() => {
        // console.log(`React.useEffect [kiUsMaretSearchInfo]`, kiUsMaretSearchInfo);
    }, [kiUsMaretSearchInfo])
    React.useEffect(() => {
        // console.log(`React.useEffect [kiUsMaretPriceDetail]`, kiUsMaretPriceDetail);
    }, [kiUsMaretPriceDetail])

    if ("init" == loginState || "rejected" == loginState) {
        return <>
            <Login parentUrl={pathname} />
        </>;
    }

    if (false == isValidCookie("koreaInvestmentToken") || false == !!kiToken["access_token"]) {
        return <>
            <Auth />
        </>
    }

    function onSearchButton(stockName: any) {
        console.log(`[onSearchButton]`, `stockName`, stockName);
        dispatch(reqGetQuotationsSearchInfo({ koreaInvestmentToken: kiToken, PDNO: stockName }));
        dispatch(reqGetQuotationsPriceDetail({ koreaInvestmentToken: kiToken, PDNO: stockName }));
    }

    return <>
        <SearchAutocomplete onSearchButton={onSearchButton} validCorpNameArray={nasdaq_tickers} />
        <div className="text-xs text-red-500">test run</div>
        <div>
            <div className="text-xs">/uapi/overseas-price/v1/quotations/search-info</div>
            <div className="text-[0.5rem]">{JSON.stringify(kiUsMaretSearchInfo)}</div>
            <div className="text-[0.5rem]">{!!kiUsMaretSearchInfo.output ? Object.keys(kiUsMaretSearchInfo.output).map((key: any) => { return <div key={key}>{key} : {kiUsMaretSearchInfo.output[key]}</div> }) : <></>}</div>
        </div>
        <div>
            <div className="text-xs">/uapi/overseas-price/v1/quotations/price-detail</div>
            <div className="text-[0.5rem]">{JSON.stringify(kiUsMaretPriceDetail)}</div>
            <div className="text-[0.5rem]">{!!kiUsMaretPriceDetail.output ? Object.keys(kiUsMaretPriceDetail.output).map((key: any) => { return <div key={key}>{key} : {kiUsMaretPriceDetail.output[key]}</div> }) : <></>}</div>
        </div>
    </>
}