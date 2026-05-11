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
    
    const data = useAppSelector((state) => selectStockByTicker(state, tickerFromUrl));

    useEffect(() => {
        if (data?.state === "pending" || data?.state === "fulfilled") return;

        const fetchData = async () => {
            dispatch(setStockState({ ticker: tickerFromUrl, status: "pending" }));

            try {
                const upperTicker = tickerFromUrl.toUpperCase();
                let payload: any = { ticker: tickerFromUrl, name, isUs };

                if (isUs) {
                    const [finnhubRes, usDetailRes, usSearchRes, usDailyRes] = await Promise.all([
                        dispatch(reqGetFinnhubUsFinancialsReported(upperTicker)).unwrap(),
                        dispatch(reqGetQuotationsPriceDetail({ PDNO: upperTicker })).unwrap(),
                        dispatch(reqGetQuotationsSearchInfo({ PDNO: upperTicker })).unwrap(),
                        dispatch(reqGetOverseasPriceQuotationsDailyPrice({
                            PDNO: upperTicker,
                            FID_INPUT_DATE_1: new Date().toISOString().split('T')[0].replaceAll("-", "")
                        })).unwrap(),
                    ]);

                    payload.finnhubData = finnhubRes;
                    payload.usDetail = usDetailRes;
                    payload.usSearchInfo = usSearchRes;
                    payload.usDaily = usDailyRes;
                } else {
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
    }, [tickerFromUrl, name, isUs, dispatch]);

    // 1. 기본 상태 분기 (로딩/에러)
    if (!data || data.state === "pending") {
        return <div className="h-[480px] w-full animate-pulse bg-zinc-100 dark:bg-zinc-900 rounded-3xl" />;
    }

    if (data.state === "rejected") {
        return <div className="h-[480px] flex items-center justify-center border-2 border-dashed rounded-3xl text-zinc-400 font-bold">Data Unavailable</div>;
    }

    // 2. 데이터 구조 안전성 검사 (데이터가 있어도 내부 필드가 없는 경우 대비)
    const isKrReady = !isUs && data.kiBS && data.kiChart && data.kiPrice;
    const isUsReady = isUs && data.finnhubData && data.usDetail;

    if (!isKrReady && !isUsReady) {
        return <div className="h-[480px] flex items-center justify-center border-2 border-dashed rounded-3xl text-zinc-400 font-bold">Processing Data...</div>;
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
                        // 옵셔널 체이닝(?.)을 활용하여 undefined 전파 방지
                        grade: getUsNcavGrade(data?.finnhubData, data?.usDetail) || "N/A",
                        curPrice: Number(data?.usDetail?.output?.last ?? 0).toFixed(2),
                        fairValue: '$' + (calculateUsNcavValue(data?.finnhubData, data?.usDetail) ?? '0'),
                        ncavScore: calculateUsNcavRatio(data?.finnhubData, data?.usDetail) ?? 0,
                        srimScore: getUsSRIMTargetPrice(data?.finnhubData, data?.usDetail) ?? 0,
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
                        grade: getKrNcavGrade(data?.kiBS, data?.kiChart) || "N/A",
                        curPrice: data?.kiPrice?.output?.stck_prpr ?? 0,
                        fairValue: '₩' + (calculateKrNcavValue(data?.kiBS, data?.kiChart) ?? '0'),
                        ncavScore: calculateKrNcavRatio(data?.kiBS, data?.kiChart) ?? 0,
                        srimScore: getKrSRIMTargetPrice(data?.kiBS, data?.kiIS, data?.kiChart) ?? 0,
                        per: data?.kiPrice?.output?.per ?? 0,
                        pbr: data?.kiPrice?.output?.pbr ?? 0,
                        eps: "₩" + Number(data?.kiPrice?.output?.eps ?? 0).toFixed(0),
                        sector: data?.kiPrice?.output?.bstp_kor_isnm ?? "DEFAULT",
                    }
            }
            chartConfig={{}} 
            rawData={data} 
        />
    );
};

export default StockDataFetcher;