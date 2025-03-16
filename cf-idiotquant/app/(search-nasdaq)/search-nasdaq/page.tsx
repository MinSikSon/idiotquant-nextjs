"use client"

import React from "react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectLoginState } from "@/lib/features/login/loginSlice";
import { usePathname } from "next/navigation";
import { isValidCookie } from "@/components/util";
import { getKoreaInvestmentUsMaretSearchInfo, KoreaInvestmentOverseasPriceDetail, KoreaInvestmentOverseasPriceDetailOutput, KoreaInvestmentOverseasSearchInfo, KoreaInvestmentOverseasSearchInfoOutput, reqGetQuotationsSearchInfo } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { getKoreaInvestmentUsMaretPriceDetail, reqGetQuotationsPriceDetail } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { getKoreaInvestmentToken, KoreaInvestmentToken, reqGetInquireBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import SearchAutocomplete from "@/components/searchAutoComplete";

import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import Login from "@/app/(login)/login/login";
import Auth from "@/components/auth";

const DEBUG = true;

export default function Search() {
    const pathname = usePathname();
    const dispatch = useAppDispatch();

    const loginState = useAppSelector(selectLoginState);

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);

    const kiUsMaretSearchInfo: KoreaInvestmentOverseasSearchInfo = useAppSelector(getKoreaInvestmentUsMaretSearchInfo);
    const kiUsMaretPriceDetail: KoreaInvestmentOverseasPriceDetail = useAppSelector(getKoreaInvestmentUsMaretPriceDetail);

    React.useEffect(() => {
        if (DEBUG) console.log(`[Search]`, `kiToken:`, kiToken);
        if (DEBUG) console.log(`[Search]`, `loginState:`, loginState);
        if ("cf" == loginState || "kakao" == loginState) {
            const isValidKiAccessToken = !!kiToken["access_token"];
            if (true == isValidKiAccessToken) {
                dispatch(reqGetInquireBalance(kiToken));
            }
        }
    }, [kiToken, loginState]);

    React.useEffect(() => {
        if (DEBUG) console.log(`React.useEffect [kiUsMaretSearchInfo]`, kiUsMaretSearchInfo);
    }, [kiUsMaretSearchInfo])
    React.useEffect(() => {
        if (DEBUG) console.log(`React.useEffect [kiUsMaretPriceDetail]`, kiUsMaretPriceDetail);
    }, [kiUsMaretPriceDetail])

    if (DEBUG) console.log(`kiUsMaretSearchInfo`, kiUsMaretSearchInfo);
    if (DEBUG) console.log(`kiUsMaretPriceDetail`, kiUsMaretPriceDetail);
    if ("init" == loginState || "rejected" == loginState || "pending" == loginState) {
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
        if (DEBUG) console.log(`[onSearchButton]`, `stockName`, stockName);
        dispatch(reqGetQuotationsSearchInfo({ koreaInvestmentToken: kiToken, PDNO: stockName }));
        dispatch(reqGetQuotationsPriceDetail({ koreaInvestmentToken: kiToken, PDNO: stockName }));
    }

    const kiUsMaretSearchInfoOutput: KoreaInvestmentOverseasSearchInfoOutput = kiUsMaretSearchInfo.output;
    const kiUsMaretPriceDetailOutput: KoreaInvestmentOverseasPriceDetailOutput = kiUsMaretPriceDetail.output;
    if (!!!kiUsMaretSearchInfoOutput && !!!kiUsMaretPriceDetailOutput) {
        <SearchAutocomplete onSearchButton={onSearchButton} validCorpNameArray={nasdaq_tickers} />
    }

    return <>
        <SearchAutocomplete onSearchButton={onSearchButton} validCorpNameArray={nasdaq_tickers} />
        <div className="font-mono">{kiUsMaretSearchInfoOutput.prdt_name} ({kiUsMaretSearchInfoOutput.prdt_eng_name})</div>
        <div>
            {/* <div className="text-xs">/uapi/overseas-price/v1/quotations/search-info</div> */}
            {/* <div className="text-[0.5rem]">{JSON.stringify(kiUsMaretSearchInfo)}</div> */}
            <div className="text-[0.5rem]">{Object.keys(kiUsMaretSearchInfoOutput).map(key => { return <div key={key}>{key}:{kiUsMaretSearchInfoOutput[key as keyof typeof kiUsMaretSearchInfoOutput]}</div> })}</div>
        </div>
        <div>
            {/* <div className="text-xs">/uapi/overseas-price/v1/quotations/price-detail</div> */}
            {/* <div className="text-[0.5rem]">{JSON.stringify(kiUsMaretPriceDetail)}</div> */}
            <div className="text-[0.5rem]">{Object.keys(kiUsMaretPriceDetailOutput).map(key => { return <div key={key}>{key}:{kiUsMaretPriceDetailOutput[key as keyof typeof kiUsMaretPriceDetailOutput]}</div> })}</div>
        </div>
    </>
}