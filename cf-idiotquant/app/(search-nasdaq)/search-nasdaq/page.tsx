"use client"

import React from "react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectLoginState } from "@/lib/features/login/loginSlice";
import { usePathname } from "next/navigation";
import { isValidCookie } from "@/components/util";
import { getKoreaInvestmentUsMaretSearchInfo, getKoreaInvestmentUsMarketDailyPrice, KoreaInvestmentOverseasPriceDetail, KoreaInvestmentOverseasPriceDetailOutput, KoreaInvestmentOverseasPriceQuotationsDailyPrice, KoreaInvestmentOverseasPriceQuotationsInquireDailyChartPrice, KoreaInvestmentOverseasSearchInfo, KoreaInvestmentOverseasSearchInfoOutput, reqGetOverseasPriceQuotationsDailyPrice, reqGetQuotationsSearchInfo } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { getKoreaInvestmentUsMaretPriceDetail, reqGetQuotationsPriceDetail } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { getKoreaInvestmentToken, KoreaInvestmentToken, reqGetInquireBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import SearchAutocomplete from "@/components/searchAutoComplete";

import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import Login from "@/app/(login)/login/login";
import Auth from "@/components/auth";
import { FmpBalanceSheetStatementType, reqGetFmpBalanceSheetStatement, selectFmpBalanceSheetStatement, selectFmpState } from "@/lib/features/fmpUsMarket/fmpUsMarketSlice";
import LineChart from "@/components/LineChart";
import { addUsMarketHistory, selectUsMarketHistory } from "@/lib/features/searchHistory/searchHistorySlice";
import { getFmpBalanceSheetStatement } from "@/lib/features/fmpUsMarket/fmpUsMarketAPI";

const DEBUG = false;

export default function Search() {
    const pathname = usePathname();
    const dispatch = useAppDispatch();

    const loginState = useAppSelector(selectLoginState);

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);

    const kiUsMaretSearchInfo: KoreaInvestmentOverseasSearchInfo = useAppSelector(getKoreaInvestmentUsMaretSearchInfo);
    const kiUsMaretPriceDetail: KoreaInvestmentOverseasPriceDetail = useAppSelector(getKoreaInvestmentUsMaretPriceDetail);
    const kiUsDailyPrice: KoreaInvestmentOverseasPriceQuotationsDailyPrice = useAppSelector(getKoreaInvestmentUsMarketDailyPrice);

    const fmpState: any = useAppSelector(selectFmpState);
    const fmpUsBalanceSheetStatement: FmpBalanceSheetStatementType[] = useAppSelector(selectFmpBalanceSheetStatement);

    // const [startDate, setStartDate] = React.useState<any>("2024-01-03");
    const [startDate, setStartDate] = React.useState<any>((new Date()).toISOString().split('T')[0]);
    // const [endDate, setEndDate] = React.useState<any>((new Date()).toISOString().split('T')[0]);

    const usMarketHistory = useAppSelector(selectUsMarketHistory);

    const formatDate = (date: string) => {
        // const arrDate = date.split("-");
        const YYYYMMDD = date.replaceAll("-", ""); // YYYYMMDD
        // console.log("YYYYMMDD", YYYYMMDD);

        return YYYYMMDD;
    }

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
    React.useEffect(() => {
        if (DEBUG) console.log(`React.useEffect [kiUsDailyPrice]`, kiUsDailyPrice);
    }, [kiUsDailyPrice])
    React.useEffect(() => {
        if (DEBUG) console.log(`React.useEffect [fmpState]`, fmpState);
    }, [fmpState])
    React.useEffect(() => {
        if (DEBUG) console.log(`React.useEffect [fmpUsBalanceSheetStatement]`, fmpUsBalanceSheetStatement);
    }, [fmpUsBalanceSheetStatement])

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
        dispatch(reqGetOverseasPriceQuotationsDailyPrice({ koreaInvestmentToken: kiToken, PDNO: stockName, FID_INPUT_DATE_1: formatDate(startDate) }));
        // export const { reqGetOverseasPriceQuotationsInquireDailyChartPrice } = koreaInvestmentUsMarketSlice.actions;

        dispatch(reqGetFmpBalanceSheetStatement(stockName));

        dispatch(addUsMarketHistory(stockName));
    }

    if (!!!kiUsMaretSearchInfo.rt_cd && !!!kiUsMaretPriceDetail.rt_cd) {
        return <>
            <SearchAutocomplete placeHolder={"NASDAQ ticker 를 입력하세요..."} onSearchButton={onSearchButton} validCorpNameArray={nasdaq_tickers} />
            <div className="dark:bg-black h-lvh"></div>
        </>
    }

    const kiUsMaretSearchInfoOutput: KoreaInvestmentOverseasSearchInfoOutput = kiUsMaretSearchInfo.output;
    const kiUsMaretPriceDetailOutput: KoreaInvestmentOverseasPriceDetailOutput = kiUsMaretPriceDetail.output;

    function getNcav(balanceSheetStatement: FmpBalanceSheetStatementType[], maretPriceDetail: any, ratio: number) {
        const stck_oprc = Number(maretPriceDetail.output["last"] ?? 1); // 주식 시가2
        const lstn_stcn = Number(maretPriceDetail.output["shar"] ?? 1); // 상장 주수
        const cras = Number(balanceSheetStatement[0].totalCurrentAssets ?? 1); // 유동 자산
        const total_lblt = Number(balanceSheetStatement[0].totalLiabilities ?? 1); // 부채 총계

        const value: number = (((cras - total_lblt) / (stck_oprc * lstn_stcn * ratio) - 1) * 100);
        const target_price = (cras - total_lblt) / lstn_stcn;

        return <>
            <div className="flex gap-2">
                <div className="w-4/12 text-right text-[0.6rem]">전략-NCAV({ratio.toFixed(1)})</div>
                <div className="w-6/12 text-right"><span className="text-[0.6rem]">({value.toFixed(2)}%) 목표가: </span><span className={`${value >= 0 ? "text-red-500" : "text-blue-500"}`}>{(Number(target_price.toFixed(5)).toLocaleString())}</span></div>
                <div className="w-2/12 text-left text-[0.6rem]">USD</div>
            </div>
        </>
    }

    let bShowResult = getFmpBalanceSheetStatement;
    if (("fulfilled" != kiUsDailyPrice.state)
        // || ("fulfilled" != kiBalanceSheet.state)
        || ("fulfilled" != fmpState)
        || ("fulfilled" != kiUsMaretSearchInfo.state)
    ) {
        bShowResult = true;
    }

    const texts = ["종가", "시가총액", "상장추식수"];
    const maxLength = Math.max(...texts.map(text => text.length * 2));
    if (DEBUG) console.log(`maxLength`, maxLength);
    return <>
        <div className="flex flex-col w-full">
            <div className="flex flex-col w-full">
                <SearchAutocomplete placeHolder={"NASDAQ ticker 를 입력하세요..."} onSearchButton={onSearchButton} validCorpNameArray={nasdaq_tickers} />
                <div className="dark:bg-black flex px-4 gap-1 overflow-x-auto">
                    {usMarketHistory.map((stockName: string, index: number) => {
                        return (
                            <div key={index} className="dark:bg-black dark:text-white shadow border text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-xl px-1 py-0.5 transition-all duration-200 min-w-fit">
                                <div className="text-sm">
                                    <button
                                        className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
                                        onClick={() => {
                                            onSearchButton(stockName);
                                        }}
                                    >
                                        {stockName}
                                    </button>
                                </div>
                            </div>
                        );
                    }).reverse()}
                </div>
            </div>
            {true == bShowResult && "0" != kiUsMaretSearchInfo.rt_cd ?
                <>
                    <div className="dark:bg-black dark:text-white p-3 shadow">
                        {kiUsMaretSearchInfo.msg1}
                    </div>
                </>
                : <>
                    <div className="dark:bg-black dark:text-white p-3 shadow">
                        <div className="text-[0.6rem]">
                            {kiUsMaretSearchInfoOutput.ovrs_excg_cd} {kiUsMaretSearchInfoOutput.tr_mket_name} | {kiUsMaretSearchInfoOutput.prdt_eng_name}
                        </div>
                        <div className="text-xl">
                            {kiUsMaretSearchInfoOutput.prdt_name}
                        </div>
                    </div>
                    <div className="dark:bg-gray-200 text-xs p-3 shadow">
                        <div className="flex gap-2">
                            <div className="w-11/12">
                                <LineChart
                                    data_array={[
                                        {
                                            name: "주가",
                                            // data: test_data.stock_list.map((stock: any) => stock.remaining_token),
                                            // data: [10, 20, 30, 40, 50, 60, 70, 80, 90],
                                            data: kiUsDailyPrice.output2.map((item: any) => item.clos).reverse(),
                                            color: "#000000",
                                        }
                                    ]}
                                    category_array={kiUsDailyPrice.output2.map((item: any) => item.xymd).reverse()}
                                    markers={
                                        {
                                            size: 0,
                                            // colors: kiInquireDailyItemChartPrice.output2.map((_, index, arr) =>
                                            //   index === arr.length - 1 ? "" : "yellow"
                                            // ).reverse(), // 마지막 값만 빨간색, 나머지는 파란색
                                            // colors: "black",
                                            discrete: [
                                                {
                                                    seriesIndex: 0,
                                                    dataPointIndex: kiUsDailyPrice.output2.length - 1, // 마지막 값만 적용
                                                    fillColor: "yellow", // 마지막 마커 색상
                                                    strokeColor: "black", // 마커 테두리 색상
                                                    size: 3, // 마지막 마커 크기
                                                },
                                            ],
                                        }
                                    }
                                />
                            </div>
                            <div className="w-1/12"></div>
                        </div>
                    </div>
                    <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                        <div className="flex gap-2">
                            <div className="w-4/12 bg-yellow-200 text-right dark:bg-gray-500">현재가</div>
                            <div className="w-6/12 bg-yellow-100 text-right dark:bg-gray-500">{kiUsMaretPriceDetailOutput.last}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">시가총액</div>
                            <div className="w-6/12 text-right">{Number(kiUsMaretPriceDetailOutput.tomv).toLocaleString()}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">상장주식수</div>
                            <div className="w-6/12 text-right">{Number(kiUsMaretSearchInfoOutput.lstg_stck_num).toLocaleString()}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">개</div>
                        </div>
                    </div>
                    <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">52주 최저가</div>
                            <div className="w-6/12 text-right">({kiUsMaretPriceDetailOutput.l52d}) {kiUsMaretPriceDetailOutput.l52p}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right bg-red-300 dark:bg-gray-500">52주 최고가</div>
                            <div className="w-6/12 text-right bg-red-200 dark:bg-gray-500">({kiUsMaretPriceDetailOutput.h52d}) {kiUsMaretPriceDetailOutput.h52p} </div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                    </div>
                    <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">PER</div>
                            <div className="w-6/12 text-right">{kiUsMaretPriceDetailOutput.perx}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">배</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">PBR</div>
                            <div className="w-6/12 text-right">{kiUsMaretPriceDetailOutput.pbrx}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">배</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">EPS</div>
                            <div className="w-6/12 text-right">{kiUsMaretPriceDetailOutput.epsx}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">BPS</div>
                            <div className="w-6/12 text-right">{kiUsMaretPriceDetailOutput.bpsx}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                    </div>
                    <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">업종(섹터)</div>
                            <div className="w-6/12 text-right text-[0.6rem]">{kiUsMaretPriceDetailOutput.e_icod}</div>
                            <div className="w-2/12 text-left text-[0.6rem]"></div>
                        </div>
                    </div>
                    <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">거래량</div>
                            <div className="w-6/12 text-right">{Number(kiUsMaretPriceDetailOutput.tvol).toLocaleString()}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">회</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">전일 거래대금</div>
                            <div className="w-6/12 text-right">{Number(kiUsMaretPriceDetailOutput.pamt).toLocaleString()}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right text-[0.6rem]">거래대금/시가총액</div>
                            <div className="w-6/12 text-right">{(Number(Number(kiUsMaretPriceDetailOutput.pamt) / Number(kiUsMaretPriceDetailOutput.tomv)) * 100).toFixed(3)}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">%</div>
                        </div>
                    </div>
                    {"fulfilled" == fmpState ?
                        <>
                            <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                                {getNcav(fmpUsBalanceSheetStatement, kiUsMaretPriceDetail, 1.0)}
                                {getNcav(fmpUsBalanceSheetStatement, kiUsMaretPriceDetail, 1.5)}
                            </div>
                            <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                                <div className="flex gap-2">
                                    <div className="w-4/12 text-right">재무-유동자산</div>
                                    <div className="w-6/12 text-right">{Number(fmpUsBalanceSheetStatement[0].totalCurrentAssets).toLocaleString()}</div>
                                    <div className="w-2/12 text-left text-[0.6rem]">USD</div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-4/12 text-right">재무-부채총계</div>
                                    <div className="w-6/12 text-right">{Number(fmpUsBalanceSheetStatement[0].totalLiabilities).toLocaleString()}</div>
                                    <div className="w-2/12 text-left text-[0.6rem]">USD</div>
                                </div>
                            </div>
                        </>
                        : <></>
                    }
                </>
            }
            <div className="dark:bg-black h-lvh"></div>
        </div >
    </>
}