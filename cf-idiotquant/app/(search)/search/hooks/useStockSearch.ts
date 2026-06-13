import { useState, useEffect, useCallback, useRef } from "react"; // useCallback 추가
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import corpCodeJson from "@/public/data/validCorpCode.json";
import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import nyse_tickers from "@/public/data/usStockSymbols/nyse_tickers.json";
import amex_tickers from "@/public/data/usStockSymbols/amex_tickers.json";

// KR ticker-map override 캐시 (name → 6자리 코드)
let _krOverrideMap: Map<string, string> | null = null;
let _krOverridePromise: Promise<Map<string, string>> | null = null;
function loadKrOverrides(): Promise<Map<string, string>> {
    if (_krOverrideMap) return Promise.resolve(_krOverrideMap);
    if (_krOverridePromise) return _krOverridePromise;
    _krOverridePromise = fetch('/api/proxy/ticker-map?source=overrides&country=KR&limit=500')
        .then(r => r.json())
        .then(json => {
            const map = new Map<string, string>();
            for (const e of (json.data ?? [])) {
                if (e.name && e.ticker) map.set(e.name, e.ticker);
            }
            _krOverrideMap = map;
            return map;
        })
        .catch(() => new Map());
    return _krOverridePromise;
}

// US ticker-map override 캐시 (ticker 집합 — 정적 JSON에 없는 종목 보완)
let _usOverrideSet: Set<string> | null = null;
let _usOverridePromise: Promise<Set<string>> | null = null;
function loadUsOverrides(): Promise<Set<string>> {
    if (_usOverrideSet) return Promise.resolve(_usOverrideSet);
    if (_usOverridePromise) return _usOverridePromise;
    _usOverridePromise = fetch('/api/proxy/ticker-map?source=overrides&country=US&limit=500')
        .then(r => r.json())
        .then(json => {
            const set = new Set<string>();
            for (const e of (json.data ?? [])) {
                if (e.ticker) set.add(e.ticker.toUpperCase());
            }
            _usOverrideSet = set;
            return set;
        })
        .catch(() => new Set<string>());
    return _usOverridePromise;
}

// Redux Actions
import {
    reqGetInquirePrice,
    reqGetInquireDailyItemChartPrice,
    reqGetBalanceSheet,
    reqGetIncomeStatement,
    resetKrStockData,
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
    const onSearch = useCallback(async (stockName: string) => {
        if (!stockName) return;

        const upper = stockName.toUpperCase();
        const usOverrides = await loadUsOverrides();
        const isUs = us_tickers.includes(upper) || usOverrides.has(upper);
        dispatch(addKrMarketHistory(stockName));
        setName(stockName);

        if (!isUs) {
            setKrOrUs("KR");
            dispatch(resetKrStockData());
            const corp: any = corpCodeJson;
            const jsonStock = corp[stockName];
            // 이름 조회 실패 시 6자리 종목코드 직접 입력으로 폴백, 그 다음 ticker-map override 폴백
            let code: string | undefined = jsonStock?.stock_code
                ?? (/^\d{6}$/.test(stockName) ? stockName : undefined);
            if (!code) {
                const overrides = await loadKrOverrides();
                code = overrides.get(stockName);
            }
            if (code && /^\d{6}$/.test(code)) {
                dispatch(reqGetInquirePrice({ PDNO: code }));
                dispatch(reqGetInquireDailyItemChartPrice({
                    PDNO: code,
                    FID_INPUT_DATE_1: "20170101",
                    FID_INPUT_DATE_2: new Date().toISOString().split('T')[0].replaceAll("-", "")
                }));
                dispatch(reqGetBalanceSheet({ PDNO: code }));
                dispatch(reqGetIncomeStatement({ PDNO: code }));
                setWaitResponse(true);
            } else {
                // 유효한 6자리 KR 코드가 없으면 US 티커로 폴백 (오버라이드 country 미설정 등)
                setKrOrUs("US");
                const ticker = upper;
                dispatch(reqGetQuotationsSearchInfo({ PDNO: ticker }));
                dispatch(reqGetQuotationsPriceDetail({ PDNO: ticker }));
                dispatch(reqGetOverseasPriceQuotationsDailyPrice({
                    PDNO: ticker,
                    FID_INPUT_DATE_1: new Date().toISOString().split('T')[0].replaceAll("-", "")
                }));
                dispatch(reqGetFinnhubUsFinancialsReported(ticker));
            }
        } else {
            setKrOrUs("US");
            const ticker = upper;
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