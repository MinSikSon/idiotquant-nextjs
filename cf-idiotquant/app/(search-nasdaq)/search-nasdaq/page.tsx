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
import { FmpBalanceSheetStatementType, reqGetFmpBalanceSheetStatement, selectFmpBalanceSheetStatement } from "@/lib/features/fmpUsMarket/fmpUsMarketSlice";

const DEBUG = true;

export default function Search() {
    const pathname = usePathname();
    const dispatch = useAppDispatch();

    const loginState = useAppSelector(selectLoginState);

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);

    const kiUsMaretSearchInfo: KoreaInvestmentOverseasSearchInfo = useAppSelector(getKoreaInvestmentUsMaretSearchInfo);
    const kiUsMaretPriceDetail: KoreaInvestmentOverseasPriceDetail = useAppSelector(getKoreaInvestmentUsMaretPriceDetail);

    const fmpUsBalanceSheetStatement: FmpBalanceSheetStatementType[] = useAppSelector(selectFmpBalanceSheetStatement);

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
    // React.useEffect(() => {
    //     if (DEBUG) console.log(`React.useEffect [fmpUsBalanceSheetStatement]`, fmpUsBalanceSheetStatement);
    // }, [fmpUsBalanceSheetStatement])

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
        dispatch(reqGetFmpBalanceSheetStatement(stockName));
    }

    if (!!!kiUsMaretSearchInfo.rt_cd && !!!kiUsMaretPriceDetail.rt_cd) {
        return <SearchAutocomplete placeHolder={"NASDAQ ticker 를 입력하세요..."} onSearchButton={onSearchButton} validCorpNameArray={nasdaq_tickers} />
    }

    const kiUsMaretSearchInfoOutput: KoreaInvestmentOverseasSearchInfoOutput = kiUsMaretSearchInfo.output;
    const kiUsMaretPriceDetailOutput: KoreaInvestmentOverseasPriceDetailOutput = kiUsMaretPriceDetail.output;

    function getNcav(fmpUsBalanceSheetStatement: any, kiUsMaretPriceDetail: any, ratio: number) {
        const stck_oprc = Number(kiUsMaretPriceDetail.output["last"] ?? 1); // 주식 시가2
        const lstn_stcn = Number(kiUsMaretPriceDetail.output["shar"] ?? 1); // 상장 주수
        const cras = Number(fmpUsBalanceSheetStatement[0].totalCurrentAssets ?? 1); // 유동 자산
        const total_lblt = Number(fmpUsBalanceSheetStatement[0].totalLiabilities ?? 1); // 부채 총계

        const value: number = (((cras - total_lblt) / (stck_oprc * lstn_stcn * ratio) - 1) * 100);
        const target_price = (cras - total_lblt) / lstn_stcn;

        return <>
            <div className="flex gap-2">
                <div className="w-3/12 text-right text-[0.6rem]">전략-NCAV({ratio.toFixed(1)})</div>
                <div className="w-5/12 text-right">목표가: <span className={`${value >= 0 ? "text-red-500" : "text-blue-500"}`}>{(Number(target_price.toFixed(5)).toLocaleString())} USD</span></div>
                <div className="w-4/12"><span className={`${value >= 0 ? "text-red-500" : "text-blue-500"}`}>{value.toFixed(2)}%</span></div>
            </div>
        </>
    }

    const texts = ["종가", "시가총액", "상장추식수"];
    const maxLength = Math.max(...texts.map(text => text.length * 2));
    console.log(`maxLength`, maxLength);
    return <>
        <SearchAutocomplete placeHolder={"NASDAQ ticker 를 입력하세요..."} onSearchButton={onSearchButton} validCorpNameArray={nasdaq_tickers} />
        <div className="border border-black rounded p-1 m-1">
            <div className="text-base">
                {kiUsMaretSearchInfoOutput.prdt_name}({kiUsMaretSearchInfoOutput.prdt_eng_name}) - {kiUsMaretSearchInfoOutput.tr_mket_name}
            </div>
            <div className="text-xs border border-black rounded p-1 m-1">
                <div className="flex gap-2">
                    <div className="w-3/12 bg-yellow-200 text-right">현재가</div>
                    <div className="w-5/12 bg-yellow-100 text-right">{kiUsMaretPriceDetailOutput.last} {kiUsMaretPriceDetailOutput.curr}</div>
                    <div className="w-4/12"></div>
                </div>
                <div className="flex gap-2">
                    <div className="w-3/12 text-right">시가총액</div>
                    <div className="w-5/12 text-right">{kiUsMaretPriceDetailOutput.tomv} {kiUsMaretPriceDetailOutput.curr}</div>
                    <div className="w-4/12"></div>
                </div>
                <div className="flex gap-2">
                    <div className="w-3/12 text-right">상장주식수</div>
                    <div className="w-5/12 text-right">{kiUsMaretSearchInfoOutput.lstg_stck_num} 개</div>
                    <div className="w-4/12"></div>
                </div>
            </div>
            <div className="text-xs border border-black rounded p-1 m-1">
                <div className="flex gap-2">
                    <div className="w-3/12 text-right">52주 최저가</div>
                    <div className="w-5/12 text-right">{kiUsMaretPriceDetailOutput.l52p} {kiUsMaretPriceDetailOutput.curr}</div>
                    <div className="w-4/12 text-[0.6rem]">({kiUsMaretPriceDetailOutput.l52d})</div>
                </div>
                <div className="flex gap-2">
                    <div className="w-3/12 text-right bg-red-300">52주 최고가</div>
                    <div className="w-5/12 text-right bg-red-200">{kiUsMaretPriceDetailOutput.h52p} {kiUsMaretPriceDetailOutput.curr}</div>
                    <div className="w-4/12 text-[0.6rem]">({kiUsMaretPriceDetailOutput.h52d})</div>
                </div>
            </div>
            <div className="text-xs border border-black rounded p-1 m-1">
                <div className="flex gap-2">
                    <div className="w-3/12 text-right">PER</div>
                    <div className="w-5/12 text-right">{kiUsMaretPriceDetailOutput.perx} 배</div>
                    <div className="w-4/12"></div>
                </div>
                <div className="flex gap-2">
                    <div className="w-3/12 text-right">PBR</div>
                    <div className="w-5/12 text-right">{kiUsMaretPriceDetailOutput.pbrx} 배</div>
                    <div className="w-4/12"></div>
                </div>
                <div className="flex gap-2">
                    <div className="w-3/12 text-right">EPS</div>
                    <div className="w-5/12 text-right">{kiUsMaretPriceDetailOutput.epsx} {kiUsMaretPriceDetailOutput.curr}</div>
                    <div className="w-4/12"></div>
                </div>
                <div className="flex gap-2">
                    <div className="w-3/12 text-right">BPS</div>
                    <div className="w-5/12 text-right">{kiUsMaretPriceDetailOutput.bpsx} {kiUsMaretPriceDetailOutput.curr}</div>
                    <div className="w-4/12"></div>
                </div>
            </div>
            <div className="text-xs border border-black rounded p-1 m-1">
                <div className="flex gap-2">
                    <div className="w-3/12 text-right">업종(섹터)</div>
                    <div className="w-9/12 text-left">{kiUsMaretPriceDetailOutput.e_icod}</div>
                </div>
            </div>
            <div className="text-xs border border-black rounded p-1 m-1">
                <div className="flex gap-2">
                    <div className="w-3/12 text-right">거래량</div>
                    <div className="w-5/12 text-right">{Number(kiUsMaretPriceDetailOutput.tvol)} 회</div>
                    <div className="w-4/12"></div>
                </div>
                <div className="flex gap-2">
                    <div className="w-3/12 text-right">전일 거래대금</div>
                    <div className="w-5/12 text-right">{kiUsMaretPriceDetailOutput.pamt} {kiUsMaretPriceDetailOutput.curr}</div>
                    <div className="w-4/12"></div>
                </div>
                <div className="flex gap-2">
                    <div className="w-3/12 text-right text-[0.6rem]">거래대금/시가총액</div>
                    <div className="w-5/12 text-right">{(Number(Number(kiUsMaretPriceDetailOutput.pamt) / Number(kiUsMaretPriceDetailOutput.tomv)) * 100).toFixed(3)} %</div>
                    <div className="w-4/12"></div>
                </div>
            </div>
            <div className="text-xs border border-red-500 rounded p-1 m-1">
                {getNcav(fmpUsBalanceSheetStatement, kiUsMaretPriceDetail, 1.0)}
                {getNcav(fmpUsBalanceSheetStatement, kiUsMaretPriceDetail, 1.5)}
            </div>
        </div>
    </>
}