"use client";

import React, { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { 
    updateStockDetail, 
    setStockState, 
    selectStockByTicker 
} from "@/lib/features/algorithmTrade/algorithmTradeSlice";

// 계산 로직 및 데이터 로드
import { 
    getKrNcavGrade, calculateKrNcavValue, calculateKrNcavRatio, getKrSRIMTargetPrice,
    getUsNcavGrade, calculateUsNcavValue, calculateUsNcavRatio, getUsSRIMTargetPrice 
} from "@/components/utils/financeCalc"; 
import corpCodeJson from "@/public/data/validCorpCode.json";
import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import nyse_tickers from "@/public/data/usStockSymbols/nyse_tickers.json";
import amex_tickers from "@/public/data/usStockSymbols/amex_tickers.json";

// API Actions
import { 
    reqGetInquirePrice, 
    reqGetBalanceSheet, 
    reqGetIncomeStatement, 
    reqGetInquireDailyItemChartPrice 
} from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { 
    reqGetQuotationsPriceDetail, 
    reqGetQuotationsSearchInfo, 
    reqGetOverseasPriceQuotationsDailyPrice 
} from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { reqGetFinnhubUsFinancialsReported } from "@/lib/features/finnhubUsMarket/finnhubUsMarketSlice";
import { StockCard } from "@/app/(search)/search/components/StockCard";


const us_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers];

interface Props {
    ticker: string;
    name: string;
}

const StockDataFetcher = ({ ticker: tickerFromUrl, name }: Props) => {
    const dispatch = useAppDispatch();
    const isUs = useMemo(() => us_tickers.includes(tickerFromUrl.toUpperCase()), [tickerFromUrl]);
    
    // 확장된 algorithmTradeSlice에서 티커별 데이터 구독
    const data = useAppSelector((state) => selectStockByTicker(state, tickerFromUrl));

    useEffect(() => {
        // 이미 로딩 중이거나 성공했다면 skip
        if (data?.state === "pending" || data?.state === "fulfilled") return;

        const fetchData = async () => {
            dispatch(setStockState({ ticker: tickerFromUrl, status: "pending" }));

            try {
                const upperTicker = tickerFromUrl.toUpperCase();
                let payload: any = { ticker: tickerFromUrl, name, isUs };

                if (isUs) {
                    // [미국 주식] Finnhub 및 한국투자증권 해외주식 API 병렬 호출
                    const [finnhubRes, usDetailRes, usSearchRes, usDailyRes] = await Promise.all([
                        dispatch(reqGetFinnhubUsFinancialsReported(upperTicker)).unwrap(),
                        dispatch(reqGetQuotationsPriceDetail({ PDNO: upperTicker })).unwrap(),
                        dispatch(reqGetQuotationsSearchInfo({ PDNO: upperTicker })).unwrap(),
                        dispatch(reqGetOverseasPriceQuotationsDailyPrice({
                            PDNO: upperTicker,
                            FID_INPUT_DATE_1: new Date().toISOString().split('T')[0].replaceAll("-", "")
                        })).unwrap(),
                    ]);

                    // Finnhub 데이터 구조(action.payload)를 data 객체 형식으로 매핑
                    payload.finnhubData = finnhubRes; // FinnhubFinancialsAsReportedType
                    payload.usDetail = usDetailRes;
                    payload.usSearchInfo = usSearchRes;
                    payload.usDaily = usDailyRes;
                } else {
                    // [한국 주식] 한국투자증권 국내주식 API 병렬 호출
                    const corp: any = corpCodeJson;
                    const jsonStock = corp[name] || Object.values(corp).find((v: any) => v.stock_code === tickerFromUrl);
                    const code = jsonStock?.stock_code || tickerFromUrl;

                    const [price, bs, is, chart] = await Promise.all([
                        dispatch(reqGetInquirePrice({ PDNO: code })).unwrap(),
                        dispatch(reqGetBalanceSheet({ PDNO: code })).unwrap(),
                        dispatch(reqGetIncomeStatement({ PDNO: code })).unwrap(),
                        dispatch(reqGetInquireDailyItemChartPrice({
                            PDNO: code,
                            FID_INPUT_DATE_1: "20240101",
                            FID_INPUT_DATE_2: new Date().toISOString().split('T')[0].replaceAll("-", "")
                        })).unwrap(),
                    ]);

                    payload.kiPrice = price;
                    payload.kiBS = bs;
                    payload.kiIS = is;
                    payload.kiChart = chart;
                }

                // 티커별 독립 스토어 업데이트
                dispatch(updateStockDetail({ 
                    ticker: tickerFromUrl, 
                    data: { ...payload, state: "fulfilled" } 
                }));

            } catch (error) {
                console.error(`Fetch Error for ${tickerFromUrl}:`, error);
                dispatch(setStockState({ ticker: tickerFromUrl, status: "rejected" }));
            }
        };

        fetchData();
    }, [tickerFromUrl, name, isUs, dispatch]); // 의존성에서 data.state 제거 (무한루프 방지)

    if (!data || data.state === "pending") {
        return <div className="h-[480px] w-full animate-pulse bg-zinc-100 dark:bg-zinc-900 rounded-3xl" />;
    }

    if (data.state === "rejected") {
        return <div className="h-[480px] flex items-center justify-center border-2 border-dashed rounded-3xl text-zinc-400 font-bold">Data Unavailable</div>;
    }

    return (
        <StockCard
            stock={
                data.isUs
                    ? {
                        code: tickerFromUrl,
                        isUs: true,
                        name,
                        ticker: name,
                        // Finnhub slice 데이터(data.finnhubData)를 계산 함수에 전달
                        grade: getUsNcavGrade(data.finnhubData, data.usDetail),
                        curPrice: Number(data?.usDetail?.output?.last ?? 0).toFixed(2),
                        fairValue: '$' + calculateUsNcavValue(data.finnhubData, data.usDetail),
                        ncavScore: calculateUsNcavRatio(data.finnhubData, data.usDetail),
                        srimScore: getUsSRIMTargetPrice(data.finnhubData, data.usDetail),
                        per: data?.usDetail?.output?.perx ?? 0,
                        pbr: data?.usDetail?.output?.pbrx ?? 0,
                        eps: "$" + (data?.usDetail?.output?.epsx ?? 0),
                        sector: data?.usDetail?.output?.e_icod ?? "DEFAULT",
                    }
                    : {
                        code: tickerFromUrl,
                        isUs: false,
                        name,
                        ticker: (corpCodeJson as any)?.[name]?.stock_code ?? '',
                        grade: getKrNcavGrade(data.kiBS, data.kiChart),
                        curPrice: data?.kiPrice?.output?.stck_prpr ?? 0,
                        fairValue: '₩' + calculateKrNcavValue(data.kiBS, data.kiChart),
                        ncavScore: calculateKrNcavRatio(data.kiBS, data.kiChart),
                        srimScore: getKrSRIMTargetPrice(data.kiBS, data.kiIS, data.kiChart),
                        per: data?.kiPrice?.output?.per ?? 0,
                        pbr: data?.kiPrice?.output?.pbr ?? 0,
                        eps: "₩" + Number(data?.kiPrice?.output?.eps ?? 0).toFixed(0),
                        sector: data?.kiPrice?.output?.bstp_kor_isnm ?? "DEFAULT",
                    }
            }
            chartConfig={{}} // 필요 시 data.kiChart 등을 기반으로 생성
            rawData={data} 
        />
    );
};

export default StockDataFetcher;