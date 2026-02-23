import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import corpCodeJson from "@/public/data/validCorpCode.json";
import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import nyse_tickers from "@/public/data/usStockSymbols/nyse_tickers.json";
import amex_tickers from "@/public/data/usStockSymbols/amex_tickers.json";

// ... Redux Actions Import (생략 없이 모두 포함해야 함)
import { reqGetInquirePrice, reqGetInquireDailyItemChartPrice, reqGetBalanceSheet, reqGetIncomeStatement, getKoreaInvestmentInquirePrice, getKoreaInvestmentBalanceSheet, getKoreaInvestmentIncomeStatement, getKoreaInvestmentInquireDailyItemChartPrice } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqGetQuotationsSearchInfo, reqGetQuotationsPriceDetail, reqGetOverseasPriceQuotationsDailyPrice, getKoreaInvestmentUsMaretSearchInfo, getKoreaInvestmentUsMaretPriceDetail, getKoreaInvestmentUsMarketDailyPrice } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { reqGetFinnhubUsFinancialsReported, selectFinnhubFinancialsAsReported } from "@/lib/features/finnhubUsMarket/finnhubUsMarketSlice";
import { reqPostLaboratory } from "@/lib/features/ai/aiSlice";
import { selectAiStreamOutput } from "@/lib/features/ai/aiStreamSlice";
import { addKrMarketHistory } from "@/lib/features/searchHistory/searchHistorySlice";

const us_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers];

export function useStockSearch() {
    const dispatch = useAppDispatch();
    const [krOrUs, setKrOrUs] = useState<"KR" | "US">("KR");
    const [name, setName] = useState("");
    const [response, setResponse] = useState("");
    const [waitResponse, setWaitResponse] = useState(false);

    // Selectors
    const kiPrice = useAppSelector(getKoreaInvestmentInquirePrice);
    const kiBS = useAppSelector(getKoreaInvestmentBalanceSheet);
    const kiIS = useAppSelector(getKoreaInvestmentIncomeStatement);
    const kiChart = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);
    const aiStreamOutput = useAppSelector(selectAiStreamOutput);
    const usSearchInfo = useAppSelector(getKoreaInvestmentUsMaretSearchInfo);
    const usDetail = useAppSelector(getKoreaInvestmentUsMaretPriceDetail);
    const usDaily = useAppSelector(getKoreaInvestmentUsMarketDailyPrice);
    const finnhubData = useAppSelector(selectFinnhubFinancialsAsReported);

    const onSearch = (stockName: string) => {
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
                dispatch(reqGetInquireDailyItemChartPrice({ PDNO: code, FID_INPUT_DATE_1: "20170101", FID_INPUT_DATE_2: new Date().toISOString().split('T')[0].replaceAll("-", "") }));
                dispatch(reqGetBalanceSheet({ PDNO: code }));
                dispatch(reqGetIncomeStatement({ PDNO: code }));
                setWaitResponse(true);
            }
        } else {
            setKrOrUs("US");
            const ticker = stockName.toUpperCase();
            dispatch(reqGetQuotationsSearchInfo({ PDNO: ticker }));
            dispatch(reqGetQuotationsPriceDetail({ PDNO: ticker }));
            dispatch(reqGetOverseasPriceQuotationsDailyPrice({ PDNO: ticker, FID_INPUT_DATE_1: new Date().toISOString().split('T')[0].replaceAll("-", "") }));
            dispatch(reqGetFinnhubUsFinancialsReported(ticker));
        }
    };

    // AI Stream Parsing
    useEffect(() => {
        if (aiStreamOutput) {
            const lines = aiStreamOutput.split('\n');
            let content = "";
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    if (jsonStr === '[DONE]') { setWaitResponse(false); break; }
                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.response) content += parsed.response;
                    } catch (e) { }
                }
            }
            setResponse(content);
        }
    }, [aiStreamOutput]);

    return { onSearch, krOrUs, name, response, waitResponse, data: { kiPrice, kiBS, kiIS, kiChart, usSearchInfo, usDetail, usDaily, finnhubData } };
}