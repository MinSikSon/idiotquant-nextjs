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
    const searchIdRef = useRef(0);
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
        const searchId = ++searchIdRef.current;

        // 연속 검색 시 이전 호출의 await가 나중에 끝나 name이 뒤집히는 것을 막기 위해
        // await 이전에 동기적으로 호출 순서대로 세팅한다.
        dispatch(addKrMarketHistory(stockName));
        setName(stockName);
        setWaitResponse(true);

        const upper = stockName.toUpperCase();
        const searchKr = (code: string) => {
            setKrOrUs("KR");
            dispatch(resetKrStockData());
            dispatch(reqGetInquirePrice({ PDNO: code }));
            dispatch(reqGetInquireDailyItemChartPrice({
                PDNO: code,
                FID_INPUT_DATE_1: "20170101",
                FID_INPUT_DATE_2: new Date().toISOString().split('T')[0].replaceAll("-", "")
            }));
            dispatch(reqGetBalanceSheet({ PDNO: code }));
            dispatch(reqGetIncomeStatement({ PDNO: code }));
        };
        const searchUs = () => {
            setKrOrUs("US");
            const ticker = upper;
            dispatch(reqGetQuotationsSearchInfo({ PDNO: ticker }));
            dispatch(reqGetQuotationsPriceDetail({ PDNO: ticker }));
            dispatch(reqGetOverseasPriceQuotationsDailyPrice({
                PDNO: ticker,
                FID_INPUT_DATE_1: new Date().toISOString().split('T')[0].replaceAll("-", "")
            }));
            dispatch(reqGetFinnhubUsFinancialsReported(ticker));
        };

        if (us_tickers.includes(upper)) { searchUs(); return; }
        const localCode = (corpCodeJson as Record<string, { stock_code?: string }>)[stockName]?.stock_code
            ?? (/^\d{6}$/.test(stockName) ? stockName : undefined);
        if (localCode && /^\d{6}$/.test(localCode)) { searchKr(localCode); return; }

        // 정적 목록에 없는 종목만 오버라이드를 조회한다. 두 목록은 동시에 받을 수 있다.
        const [usOverrides, krOverrides] = await Promise.all([loadUsOverrides(), loadKrOverrides()]);
        if (searchId !== searchIdRef.current) return;
        if (usOverrides.has(upper)) searchUs();
        else {
            const code = krOverrides.get(stockName);
            if (code && /^\d{6}$/.test(code)) searchKr(code);
            else searchUs(); // 유효한 국내 코드가 없으면 미국 티커로 폴백
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
