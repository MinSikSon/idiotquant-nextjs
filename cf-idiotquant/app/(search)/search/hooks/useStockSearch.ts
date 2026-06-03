import { useState, useEffect, useCallback, useRef } from "react"; // useCallback 추가
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import corpCodeJson from "@/public/data/validCorpCode.json";
import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import nyse_tickers from "@/public/data/usStockSymbols/nyse_tickers.json";
import amex_tickers from "@/public/data/usStockSymbols/amex_tickers.json";

// Redux Actions
import {
    reqGetInquirePrice,
    reqGetInquireDailyItemChartPrice,
    reqGetBalanceSheet,
    reqGetIncomeStatement,
    getKoreaInvestmentInquirePrice,
    getKoreaInvestmentBalanceSheet,
    getKoreaInvestmentIncomeStatement,
    getKoreaInvestmentInquireDailyItemChartPrice
} from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import {
    reqGetQuotationsSearchInfo,
    reqGetQuotationsPriceDetail,
    reqGetOverseasPriceQuotationsDailyPrice,
    getKoreaInvestmentUsMaretSearchInfo,
    getKoreaInvestmentUsMaretPriceDetail,
    getKoreaInvestmentUsMarketDailyPrice
} from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import {
    reqGetFinnhubUsFinancialsReported,
    selectFinnhubFinancialsAsReported
} from "@/lib/features/finnhubUsMarket/finnhubUsMarketSlice";
import { addKrMarketHistory } from "@/lib/features/searchHistory/searchHistorySlice";
import { reqPostSearchLog } from "@/lib/features/searchLog/searchLogSlice";

const us_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers];

export function useStockSearch() {
    const dispatch = useAppDispatch();
    const [krOrUs, setKrOrUs] = useState<"KR" | "US">("KR");
    const [name, setName] = useState("");
    const [waitResponse, setWaitResponse] = useState(false);

    // Selectors
    const kiPrice = useAppSelector(getKoreaInvestmentInquirePrice);
    const kiBS = useAppSelector(getKoreaInvestmentBalanceSheet);
    const kiIS = useAppSelector(getKoreaInvestmentIncomeStatement);
    const kiChart = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);
    const usSearchInfo = useAppSelector(getKoreaInvestmentUsMaretSearchInfo);
    const usDetail = useAppSelector(getKoreaInvestmentUsMaretPriceDetail);
    const usDaily = useAppSelector(getKoreaInvestmentUsMarketDailyPrice);
    const finnhubData = useAppSelector(selectFinnhubFinancialsAsReported);

    const lastLoggedTicker = useRef<string>("");
    // 로깅 Side Effect
    useEffect(() => {
        const currentTicker = name.toUpperCase();
        if (currentTicker && currentTicker !== lastLoggedTicker.current) {
            dispatch(reqPostSearchLog({
                ticker: currentTicker,
                name: name,
                isUs: krOrUs === "US"
            }));
            lastLoggedTicker.current = currentTicker;
        }
    }, [name, krOrUs, dispatch]);

    // [중요] useCallback으로 감싸서 함수 참조값을 고정합니다.
    const onSearch = useCallback((stockName: string) => {
        if (!stockName) return;

        const isUs = us_tickers.includes(stockName.toUpperCase());
        dispatch(addKrMarketHistory(stockName));
        setName(stockName);

        if (!isUs) {
            setKrOrUs("KR");
            const corp: any = corpCodeJson;
            const jsonStock = corp[stockName];
            if (jsonStock) {
                const code = jsonStock.stock_code;
                dispatch(reqGetInquirePrice({ PDNO: code }));
                dispatch(reqGetInquireDailyItemChartPrice({
                    PDNO: code,
                    FID_INPUT_DATE_1: "20170101",
                    FID_INPUT_DATE_2: new Date().toISOString().split('T')[0].replaceAll("-", "")
                }));
                dispatch(reqGetBalanceSheet({ PDNO: code }));
                dispatch(reqGetIncomeStatement({ PDNO: code }));
                setWaitResponse(true);
            }
        } else {
            setKrOrUs("US");
            const ticker = stockName.toUpperCase();
            dispatch(reqGetQuotationsSearchInfo({ PDNO: ticker }));
            dispatch(reqGetQuotationsPriceDetail({ PDNO: ticker }));
            dispatch(reqGetOverseasPriceQuotationsDailyPrice({
                PDNO: ticker,
                FID_INPUT_DATE_1: new Date().toISOString().split('T')[0].replaceAll("-", "")
            }));
            dispatch(reqGetFinnhubUsFinancialsReported(ticker));
        }
    }, [dispatch]);

    return {
        onSearch,
        krOrUs,
        name,
        waitResponse,
        data: {
            kiPrice,
            kiBS,
            kiIS,
            kiChart,
            usSearchInfo,
            usDetail,
            usDaily,
            finnhubData
        }
    };
}