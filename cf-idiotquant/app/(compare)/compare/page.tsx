'use client';

import { useTranslations } from "next-intl";
import { PageSearch } from "@/components/page-search";
import { SecondarySection } from "@/components/secondary-section";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CONTROL_INPUT_CLS, CONTROL_ICON_BUTTON_CLS } from '@/lib/ui-controls';
import { PageHeader, PAGE_WIDTH, PAGE_ACTION_CLS, PAGE_PRIMARY_ACTION_CLS } from '@/components/pageHeader';
import { compareSnapshot } from '@/lib/share/builders';
import { useSession } from 'next-auth/react';
import { ArrowRight, ChevronDown, Loader2, Plus, Trash2, X } from 'lucide-react';
import corpCodes from '@/public/data/validCorpCode.json';
import nasdaq from '@/public/data/usStockSymbols/nasdaq_tickers.json';
import nyse from '@/public/data/usStockSymbols/nyse_tickers.json';
import amex from '@/public/data/usStockSymbols/amex_tickers.json';
import { getInquireDailyItemChartPrice, getInquirePrice } from '@/lib/features/koreaInvestment/koreaInvestmentAPI';
import { getOverseasPriceQuotationsDailyPrice, getQuotationsPriceDetail, getQuotationsSearchInfo } from '@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketAPI';
import { calculatePriceReturns, summarizeReturns } from './priceReturns';
import { historicalPrice } from './historicalPrice';
import { getScanDailyByTicker } from '@/lib/features/algorithmTrade/algorithmTradeAPI';
import { comparisonPrices, historicalMarketCap } from '@/lib/features/compare/pricing';
import { getExternalMarketCap } from '@/lib/features/compare/marketCap';
import { loadStaticStockData, type StaticStockData } from '@/lib/utils/stockSearchData';
import { isUsTicker, resolveStockSearchInput } from '@/lib/utils/stockSearchInput';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  type ComparisonStock, selectComparison, setQuery, setDateInput, setError,
  stockLoadStarted, stockReceived, stockLoadFinished, dateLoadStarted, datePriceReceived, marketCapReceived,
  dateLoadFinished, removeDate as removeComparisonDate, removeStock, applyLimits,
  importStarted, importAdvanced, importFinished, clearComparison, restoreComparison,
} from '@/lib/features/compare/compareSlice';
import { COMPARISON_STORAGE_KEY, readComparisonSnapshot, serializeComparison } from '@/lib/features/compare/storage';
import { comparisonImportSource, planComparisonImport } from '@/lib/features/compare/import';
import ImportConfirmation from './ImportConfirmation';
import { defaultComparisonDates, isComparisonDate, localToday } from '@/lib/features/compare/dates';

type RecentStock = Pick<ComparisonStock, 'ticker' | 'name' | 'market'>;
type ScreenerImport = { source: string; market: 'KR' | 'US'; date: string; tickers: string[] };
const RECENT_STOCKS_KEY = 'idiotquant:compare:recent-stocks:v1';
const RECENT_STOCKS_LIMIT = 10;
const GUEST_LIMITS = { stocks: 4, dates: 2 };
const MEMBER_LIMITS = { stocks: 20, dates: 10 };

const usTickers = new Set([...nasdaq, ...nyse, ...amex].map((x) => String(x).toUpperCase()));
const numberOrNull = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : undefined;
};
const positiveShares = (value: unknown): number | undefined => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
};
const show = (n: number | undefined, digits = 2) => n == null ? '—' : n.toLocaleString('ko-KR', { maximumFractionDigits: digits });
const formatDate = (date: string) => /^\d{8}$/.test(date) ? `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6)}` : date;

async function getHistoricalPrice(ticker: string, market: 'KR' | 'US', date: string, history: unknown) {
  const end = date.replaceAll('-', '');
  const startDate = new Date(`${date}T00:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 14);
  const result = market === 'KR'
    ? await getInquireDailyItemChartPrice(ticker, startDate.toISOString().slice(0, 10).replaceAll('-', ''), end)
    : await getOverseasPriceQuotationsDailyPrice(ticker, end);
  const price = historicalPrice(result, market, end);
  const marketCap = historicalMarketCap(history, market, price.priceDate);
  if (marketCap) return { ...price, marketCap };
  if (market === 'US') return price;
  // 휴장일에는 선택일이 아니라 KIS가 확인한 실제 거래일로 외부 시총을 조회한다.
  return { ...price, ...await getExternalMarketCap(ticker, price.priceDate) };
}

async function loadStock(ticker: string, market: 'KR' | 'US', nameHint: string, dates: string[]): Promise<ComparisonStock> {
  const domesticName = Object.entries(corpCodes as Record<string, { stock_code?: string }>).find(([, item]) => item.stock_code === ticker)?.[0] ?? nameHint;
  const historyPromise = market === 'KR' ? getScanDailyByTicker(ticker, 200).catch(() => undefined) : Promise.resolve(undefined);
  const pricesPromise = Promise.all(dates.map(async date => {
    try { return [date, await getHistoricalPrice(ticker, market, date, await historyPromise)] as const; }
    catch (e) { return [date, { error: e instanceof Error ? e.message : '가격을 불러오지 못했습니다.' }] as const; }
  }));
  let stock: ComparisonStock;
  if (market === 'US') {
    const [detailRes, infoRes, prices] = await Promise.all([getQuotationsPriceDetail(ticker), getQuotationsSearchInfo(ticker), pricesPromise]);
    const d = detailRes?.output ?? detailRes?.output1 ?? {};
    const i = infoRes?.output ?? {};
    const eps = numberOrNull(d.epsx), bps = numberOrNull(d.bpsx);
    stock = { id: crypto.randomUUID(), ticker, name: i.prdt_eng_name || i.ovrs_item_name || ticker, market, currency: '$', currentShares: (infoRes?.rt_cd === '0' ? positiveShares(i.lstg_stck_num) : undefined) ?? (detailRes?.rt_cd === '0' ? positiveShares(d.shar) : undefined), prices: {}, per: numberOrNull(d.perx), pbr: numberOrNull(d.pbrx), eps, bps, roe: eps && bps ? eps / bps * 100 : undefined };
    stock.prices = Object.fromEntries(prices);
  } else {
    const [res, prices] = await Promise.all([getInquirePrice(ticker), pricesPromise]);
    const d = res?.output ?? {};
    const name = domesticName;
    const eps = numberOrNull(d.eps), bps = numberOrNull(d.bps);
    stock = { id: crypto.randomUUID(), ticker, name, market, currency: '₩', currentShares: res?.rt_cd === '0' ? positiveShares(d.lstn_stcn) : undefined, prices: {}, per: numberOrNull(d.per), pbr: numberOrNull(d.pbr), eps, bps, roe: eps && bps ? eps / bps * 100 : undefined };
    stock.prices = Object.fromEntries(prices);
  }
  if (Object.values(stock.prices).every(item => !item.price) && !stock.per && !stock.pbr && !stock.currentShares) {
    throw new Error('종목 정보를 불러오지 못했습니다. 종목명이나 티커를 확인해 주세요.');
  }
  return stock;
}

function ComparePageContent() {
  const t = useTranslations("compare");
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';
  const limits = sessionStatus === 'authenticated' ? MEMBER_LIMITS : GUEST_LIMITS;
  const sessionLoading = sessionStatus === 'loading';
  const limitsRef = useRef(limits);
  limitsRef.current = limits;
  const dispatch = useAppDispatch();
  const { query, dateInput, dates, stocks, loading, dateLoading, error, importProgress, importSource } = useAppSelector(selectComparison);
  const [recentStocks, setRecentStocks] = useState<RecentStock[]>([]);
  const [searchData, setSearchData] = useState<StaticStockData | null>(null);

  const [recentLoaded, setRecentLoaded] = useState(false);
  const importedRef = useRef<string | null>(null);
  const [comparisonReady, setComparisonReady] = useState(false);
  const backfilledCaps = useRef(new Set<string>());
  const [storageFailed, setStorageFailed] = useState(false);
  const [pendingImport, setPendingImport] = useState<ScreenerImport | null>(null);
  const today = localToday();
  const dateInvalid = !!dateInput && !isComparisonDate(dateInput, today);

  useEffect(() => {
    let active = true;
    loadStaticStockData().then(data => { if (active) setSearchData(data); }).catch(() => {
      if (active) dispatch(setError('검색용 종목 목록을 불러오지 못했습니다. 종목코드나 티커로 추가해 주세요.'));
    });
    return () => { active = false; };
  }, [dispatch]);

  useEffect(() => {
    if (sessionLoading) return;
    try {
      // 직접 발굴 링크로 진입해도 저장된 종목을 복원한 뒤 초과 여부를 확인한다.
      if (!stocks.length && !dates.length && !loading && !dateLoading) {
        const saved = readComparisonSnapshot(localStorage.getItem(COMPARISON_STORAGE_KEY));
        if (saved) dispatch(restoreComparison({ ...saved, dateInput: saved.dateInput || defaultComparisonDates()[0], stocks: saved.stocks.slice(0, limits.stocks), dates: saved.dates.slice(0, limits.dates) }));
        else if (!dateInput) dispatch(setDateInput(defaultComparisonDates()[0]));
      }
    } catch { setStorageFailed(true); }
    setComparisonReady(true);
    // 저장본 복원은 페이지 진입 시 세션 한도가 정해진 뒤 한 번만 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading]);

  useEffect(() => {
    if (!comparisonReady || sessionLoading || loading || dateLoading) return;
    for (const stock of stocks) {
      if (stock.market !== 'KR') continue;
      const missing = dates.flatMap(date => {
        const price = stock.prices[date];
        const key = `${stock.id}:${date}:${price?.priceDate}`;
        if (price?.loading || !price?.price || !price.priceDate || price.marketCap || backfilledCaps.current.has(key)) return [];
        backfilledCaps.current.add(key);
        return [{ date, priceDate: price.priceDate }];
      });
      // 같은 종목의 날짜는 순차 조회해 저장본 복원 시 요청이 몰리지 않게 한다.
      void (async () => {
        for (const { date, priceDate } of missing) {
          const update = await getExternalMarketCap(stock.ticker, priceDate);
          dispatch(marketCapReceived({ id: stock.id, date, priceDate, update }));
        }
      })();
    }
  }, [comparisonReady, sessionLoading, loading, dateLoading, stocks, dates, dispatch]);

  useEffect(() => {
    if (!comparisonReady || loading || dateLoading) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(COMPARISON_STORAGE_KEY, serializeComparison({ stocks, dates, query, dateInput }));
        setStorageFailed(false);
      } catch { setStorageFailed(true); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [comparisonReady, stocks, dates, query, dateInput, loading, dateLoading]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(RECENT_STOCKS_KEY) ?? '[]');
      if (Array.isArray(saved)) {
        setRecentStocks(saved.filter((item): item is RecentStock =>
          item && typeof item.ticker === 'string' && typeof item.name === 'string' &&
          (item.market === 'KR' || item.market === 'US')
        ).slice(0, RECENT_STOCKS_LIMIT));
      }
    } catch { /* 저장소가 비어 있거나 사용할 수 없으면 빈 목록으로 시작한다. */ }
    setRecentLoaded(true);
  }, []);

  useEffect(() => {
    if (!recentLoaded) return;
    try { window.localStorage.setItem(RECENT_STOCKS_KEY, JSON.stringify(recentStocks)); }
    catch { /* 저장소가 막혀 있어도 종목 비교는 계속 쓸 수 있다. */ }
  }, [recentStocks, recentLoaded]);
  const runImport = useCallback(async (request: ScreenerImport, replace: boolean) => {
    if (!isComparisonDate(request.date)) {
      dispatch(setError('비교 날짜는 오늘 또는 이전의 올바른 날짜를 선택해 주세요.'));
      return;
    }
    const plan = planComparisonImport(stocks, request.tickers, request.market, limits.stocks);
    const tickers = replace ? plan.selected : plan.added;
    const importDates = replace ? [request.date] : [...new Set([...dates, request.date])].sort();
    if (importDates.length > limits.dates) {
      dispatch(setError(`비교 날짜는 최대 ${limits.dates}개입니다. 기존 날짜를 하나 지운 뒤 다시 가져와 주세요.`));
      return;
    }
    dispatch(importStarted({ source: request.source, date: request.date, total: tickers.length, keepExisting: !replace }));
    try {
      if (!replace && !dates.includes(request.date)) {
        for (const stock of stocks) {
          const history = stock.market === 'KR' ? await getScanDailyByTicker(stock.ticker, 200).catch(() => undefined) : undefined;
          const price = await getHistoricalPrice(stock.ticker, stock.market, request.date, history)
            .catch(e => ({ error: e instanceof Error ? e.message : '가격을 불러오지 못했습니다.' }));
          dispatch(datePriceReceived({ id: stock.id, date: request.date, price }));
        }
      }
      let failed = 0;
      for (const [index, ticker] of tickers.entries()) {
        try {
          const stock = await loadStock(ticker, request.market, ticker, importDates);
          dispatch(stockReceived({ stock, limit: limitsRef.current.stocks }));
        } catch { failed++; }
        dispatch(importAdvanced(index + 1));
      }
      if (failed) dispatch(setError(`${failed}개 종목의 시세를 불러오지 못했습니다. 나머지 종목은 비교표에 추가했습니다.`));
    } finally { dispatch(importFinished()); }
  }, [stocks, dates, limits.stocks, limits.dates, dispatch]);

  useEffect(() => {
    if (!comparisonReady || sessionLoading || loading || dateLoading) return;
    const params = searchParams;
    const market = params.get('country');
    const date = params.get('date');
    if ((market !== 'KR' && market !== 'US') || !date || !/^\d{8}$/.test(date)) return;
    const tickers = [...new Set((params.get('tickers') ?? '').split(',').map(ticker => ticker.trim().toUpperCase()))]
      .filter(ticker => market === 'KR' ? /^\d{6}$/.test(ticker) : isUsTicker(ticker))
      .slice(0, limits.stocks);
    if (!tickers.length) return;
    const selectedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
    if (!isComparisonDate(selectedDate)) {
      dispatch(setError('비교 날짜는 오늘 또는 이전의 올바른 날짜를 선택해 주세요.'));
      return;
    }
    const source = comparisonImportSource(market, date, tickers, params.get('request'));
    if (importSource === source || importedRef.current === source) return;
    importedRef.current = source;
    const request: ScreenerImport = { source, market, date: selectedDate, tickers };
    if (planComparisonImport(stocks, tickers, market, limits.stocks).exceedsLimit) setPendingImport(request);
    else void runImport(request, false);
  }, [comparisonReady, sessionLoading, limits.stocks, importSource, loading, dateLoading, stocks, runImport, searchParams]);
  useEffect(() => {
    if (sessionLoading) return;
    dispatch(applyLimits(limits));
  }, [sessionLoading, limits.dates, limits.stocks, dispatch]);
  const pricesByStock = useMemo(() => new Map(stocks.map(stock => [stock.id, comparisonPrices(stock, dates)])), [stocks, dates]);
  const priceReturns = useMemo(() => calculatePriceReturns(stocks.flatMap(stock => dates.map(date => ({
    id: `${stock.id}:${date}`, ticker: stock.ticker, market: stock.market,
    price: pricesByStock.get(stock.id)?.prices[date], priceDate: stock.prices[date]?.priceDate,
  })))), [stocks, dates, pricesByStock]);
  const returnStats = useMemo(() => dates.map(date => ({
    date,
    summary: summarizeReturns(stocks.flatMap(stock => {
      const result = priceReturns.get(`${stock.id}:${date}`);
      return result && stock.prices[date]?.priceDate !== result.baselineDate ? [result.percent] : [];
    })),
  })).filter(item => item.summary), [dates, stocks, priceReturns]);

  async function addStock(raw: string) {
    const value = raw.trim();
    if (!value || !comparisonReady || sessionLoading || stocks.length >= limits.stocks || loading || dateLoading) return;
    const selectedDates = dates.length ? dates : defaultComparisonDates();
    const upper = resolveStockSearchInput(value, searchData?.allTickers ?? [...usTickers]) ?? value.toUpperCase();
    const code = ((searchData?.corpCodeJson ?? corpCodes) as Record<string, { stock_code?: string }>)[value]?.stock_code ?? (/^[A-Z0-9]{6}$/i.test(value) ? value.toUpperCase() : undefined);
    const isUs = !code && (usTickers.has(upper) || isUsTicker(upper));
    const ticker = code ?? (isUs ? upper : '');
    if (!ticker) { dispatch(setError('종목명 또는 6자리 종목코드를 확인해 주세요. 미국 종목은 티커를 입력할 수 있습니다.')); return; }
    if (stocks.some(stock => stock.ticker === ticker && stock.market === (isUs ? 'US' : 'KR'))) {
      dispatch(setError('이미 추가한 종목입니다. 날짜를 추가하면 해당 종목의 가격도 함께 조회됩니다.')); return;
    }
    if (!dates.length) {
      for (const date of selectedDates) dispatch(dateLoadStarted(date));
      dispatch(dateLoadFinished());
    }
    dispatch(stockLoadStarted());
    try {
      const stock = await loadStock(ticker, isUs ? 'US' : 'KR', value, selectedDates);
      dispatch(stockReceived({ stock, limit: limitsRef.current.stocks }));
      setRecentStocks(current => [
        { ticker: stock.ticker, name: stock.name, market: stock.market },
        ...current.filter(item => item.ticker !== stock.ticker || item.market !== stock.market),
      ].slice(0, RECENT_STOCKS_LIMIT));
      dispatch(setQuery(''));
    } catch (e) { dispatch(setError(e instanceof Error ? e.message : '종목 정보를 불러오지 못했습니다.')); }
    finally { dispatch(stockLoadFinished()); }
  }


  async function addDate() {
    const date = dateInput;
    if (!isComparisonDate(date) || sessionLoading || dates.includes(date) || dates.length >= limits.dates || loading || dateLoading) return;
    dispatch(dateLoadStarted(date));
    await Promise.all(stocks.map(async stock => {
      const history = stock.market === 'KR' ? await getScanDailyByTicker(stock.ticker, 200).catch(() => undefined) : undefined;
      const result = await getHistoricalPrice(stock.ticker, stock.market, date, history)
        .catch(e => ({ error: e instanceof Error ? e.message : '가격을 불러오지 못했습니다.' }));
      dispatch(datePriceReceived({ id: stock.id, date, price: result }));
    }));
    dispatch(dateLoadFinished());
  }

  function removeDate(date: string) {
    if (dateLoading || loading) return;
    dispatch(removeComparisonDate(date));
  }

  function priceContent(stock: ComparisonStock, date: string) {
    const item = stock.prices[date];
    const result = priceReturns.get(`${stock.id}:${date}`);
    const comparison = pricesByStock.get(stock.id)!;
    const value = comparison.prices[date];
    return item?.loading ? <Loader2 size={16} className="animate-spin" aria-label={t("priceLoading")} /> : item?.price ? <>
      <p>{`${stock.currency}${show(value)}`}</p>
      <p className="mt-1 text-xs font-normal text-neutral-600 dark:text-neutral-400">{formatDate(item.priceDate!)} {comparison.closing ? t("closing") : t("adjusted")}</p>
      {item.marketCap && <p className="mt-1 text-xs font-normal text-neutral-500">{t("marketCap")} {stock.currency}{show(item.marketCap, 0)} · {item.marketCapSource === 'data-go-kr' ? t("portal") : t("savedPrice")}</p>}
      {item.marketCapError && <p className="mt-1 text-xs font-normal text-amber-700 dark:text-amber-400">{item.marketCapError}</p>}
      {result && <p className={`mt-1 text-xs font-semibold ${result.baseline ? 'text-neutral-600 dark:text-neutral-400' : result.percent >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>{result.baseline ? t("returnBaseline") : `${result.percent >= 0 ? '+' : ''}${show(result.percent)}%`}</p>}
    </> : <span className="text-xs font-normal text-rose-600 dark:text-rose-400">{item?.error ?? t("noPrice")}</span>;
  }

  const rows: { label: string; value: (s: ComparisonStock) => string }[] = [
    { label: t("shares"), value: s => s.currentShares ? t("shareCount", { count: show(s.currentShares, 0) }) : '—' },
    { label: 'PER', value: s => show(s.per) },
    { label: 'PBR', value: s => show(s.pbr) },
    { label: 'EPS', value: s => `${s.currency}${show(s.eps)}` },
    { label: 'BPS', value: s => `${s.currency}${show(s.bps)}` },
    { label: 'ROE', value: s => s.roe == null ? '—' : `${show(s.roe)}%` },
  ];

  return <div className="min-h-screen bg-surface-canvas text-neutral-900 dark:bg-surface-dark-canvas dark:text-neutral-100">
    {pendingImport && <ImportConfirmation
      limit={limits.stocks}
      onDecision={replace => {
        const request = pendingImport;
        setPendingImport(null);
        if (replace) void runImport(request, true);
      }}
    />}
    <PageHeader
      title={t("title")}
      mobileTitleInNavigation
      meta={storageFailed ? t("storageError") : t("storage")}
      mobileCompact
      share={!loading && !dateLoading && stocks.length ? { getSnapshot: () => compareSnapshot(stocks, dates) } : undefined}
    />
    <main className={`${PAGE_WIDTH.data} service-content`}>
      <section aria-label={t("addSection")}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("stocks")}</h2>
          <button type="button" aria-label={t("clear")} onClick={() => dispatch(clearComparison())}
            disabled={loading || dateLoading || (!stocks.length && !dates.length && !query && !dateInput && !error)}
            className={PAGE_ACTION_CLS}>
            <Trash2 size={15} aria-hidden="true" /><span>{t("clear")}</span>
          </button>
        </div>
        <PageSearch purpose="compare" label={t("search")} onSelect={addStock}
          disabled={!comparisonReady || sessionLoading || loading || dateLoading || stocks.length >= limits.stocks}
          disabledMessage={stocks.length >= limits.stocks ? t("searchLimit", { limit: limits.stocks }) : t("searchBusy")} />
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{t("stockCount", { count: stocks.length, limit: limits.stocks })}</p>
        {sessionStatus === 'unauthenticated' && <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{t("guestLimit", { guestStocks: GUEST_LIMITS.stocks, guestDates: GUEST_LIMITS.dates, memberStocks: MEMBER_LIMITS.stocks, memberDates: MEMBER_LIMITS.dates })}</p>}
        {importProgress && <p role="status" className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{t("importing", importProgress)}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </section>

      {recentStocks.length > 0 && !query.trim() && stocks.length < limits.stocks && <section className="mt-5" aria-label={t("recentLabel")}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">{t("recent")}</h2>
          <button type="button" onClick={() => setRecentStocks([])} className="inline-flex min-h-11 items-center px-3 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">{t("clearHistory")}</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {recentStocks.map(stock => <button key={`${stock.market}:${stock.ticker}`} type="button" onClick={() => void addStock(stock.market === 'US' ? stock.ticker : stock.name)} disabled={loading || dateLoading || stocks.some(item => item.ticker === stock.ticker && item.market === stock.market)} className="min-h-11 rounded border border-neutral-200 bg-white px-3 py-2 text-left text-sm font-medium hover:border-brand-ink hover:text-brand-ink disabled:cursor-default disabled:opacity-45 dark:border-neutral-700 dark:bg-surface-dark-card dark:hover:text-brand-ink">
            {stock.name} <span className="ml-1 font-mono text-neutral-600 dark:text-neutral-400">{stock.ticker} · {stock.market}</span>
          </button>)}
        </div>
      </section>}

      {dates.length > 0 && <p className="mt-4 text-xs text-neutral-600 dark:text-neutral-400">{t("dates", { dates: dates.map(date => formatDate(date.replaceAll('-', ''))).join(', ') })}</p>}
      <SecondarySection title={t("editDates")} className="mt-4">
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{t("dateHint")}</p>
        <div className="mt-4 grid min-w-0 gap-3 sm:flex sm:items-end">
          <label className="block min-w-0 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {t("priceDate")}
            <input type="date" value={dateInput} max={today} aria-invalid={dateInvalid || undefined} aria-describedby={dateInvalid ? "compare-date-error" : undefined} onChange={e => dispatch(setDateInput(e.target.value))} disabled={sessionLoading || dateLoading || loading} className={cn(CONTROL_INPUT_CLS, "relative mt-1 block h-11 w-full min-w-0 max-w-full appearance-none bg-white px-3 text-center text-base text-neutral-900 outline-none dark:bg-surface-dark-card dark:text-neutral-100 sm:w-56 sm:text-sm [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:flex [&::-webkit-date-and-time-value]:h-full [&::-webkit-date-and-time-value]:w-full [&::-webkit-date-and-time-value]:min-h-0 [&::-webkit-date-and-time-value]:items-center [&::-webkit-date-and-time-value]:justify-center [&::-webkit-date-and-time-value]:text-center [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:h-full [&::-webkit-datetime-edit]:w-full [&::-webkit-datetime-edit]:items-center [&::-webkit-datetime-edit]:justify-center [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2")} />
          </label>
          <button type="button" onClick={() => void addDate()} disabled={sessionLoading || !isComparisonDate(dateInput, today) || dates.includes(dateInput) || dates.length >= limits.dates || dateLoading || loading} className={PAGE_PRIMARY_ACTION_CLS}>
            {dateLoading ? <Loader2 size={16} className="shrink-0 animate-spin" /> : <Plus size={16} className="shrink-0" />} {t("addDate")}
          </button>
        </div>
        {dateInvalid && <p id="compare-date-error" role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{t("invalidDate")}</p>}
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{t("dateCount", { count: dates.length, limit: limits.dates, access: t(sessionStatus === "authenticated" ? "signedIn" : "guest") })}</p>
        {dates.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
          {dates.map(date => <span key={date} className="inline-flex items-center gap-1.5 rounded border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-neutral-700 dark:bg-surface-dark-card">
            {formatDate(date.replaceAll('-', ''))}
            <button type="button" onClick={() => removeDate(date)} disabled={dateLoading || loading} aria-label={t("removeDate", { date })} className={CONTROL_ICON_BUTTON_CLS}><X size={13} /></button>
          </span>)}
        </div>}
      </SecondarySection>

      {stocks.length === 0 ? <section className="mt-8 border-t border-neutral-200 px-0 py-8 dark:border-neutral-700">
        <p className="text-sm font-medium">{t("empty")}</p>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t("emptyHint")}</p>
      </section> : <section className="mt-5 sm:mt-8" aria-label={t("results")}>
        <div className="space-y-2 md:hidden">
          {stocks.map(stock => {
            const latestDate = dates.at(-1);
            const latest = latestDate ? stock.prices[latestDate] : undefined;
            const comparison = pricesByStock.get(stock.id)!;
            const latestPrice = latestDate ? comparison.prices[latestDate] : undefined;
            const latestReturn = latestDate ? priceReturns.get(`${stock.id}:${latestDate}`) : undefined;
            const hasReturn = latestReturn && latest?.priceDate !== latestReturn.baselineDate;
            return <details key={stock.id} className="group overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-surface-dark-card">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-ink">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={stock.name}>{stock.name}</span>
                <span className={`shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums ${latest?.error ? 'text-rose-600 dark:text-rose-400' : ''}`} title={latestDate ? `${formatDate(latest?.priceDate ?? latestDate.replaceAll('-', ''))} ${comparison.closing ? t("closing") : t("adjusted")}` : undefined}>
                  {latestDate ? latest?.loading ? t("loading") : latest?.price ? `${stock.currency}${show(latestPrice)}` : latest?.error ? t("failed") : t("noPrice") : t("addDate")}
                </span>
                {hasReturn && <span className={`shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums ${latestReturn.percent >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`} title={t("relativeTo", { date: formatDate(latestReturn.baselineDate) })}>{latestReturn.percent >= 0 ? '+' : ''}{show(latestReturn.percent)}%</span>}
                <ChevronDown size={15} className="shrink-0 text-neutral-600 dark:text-neutral-400 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="min-w-0 break-words text-sm font-semibold">{stock.name}</span>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{stock.ticker} · {stock.market} · {comparison.closing ? t("closing") : t("adjusted")}</span>
                </p>
                {!latestDate && <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t("missingDate")}</p>}
                {latest?.price && !latest.loading && comparison.closing && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{t("closingFallback")}</p>}
              </div>
              <div className="divide-y divide-neutral-100 border-t border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
                {dates.map(date => {
                  const item = stock.prices[date];
                  const result = priceReturns.get(`${stock.id}:${date}`);
                  return <div key={date} className="px-3 py-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-2">
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">{formatDate(date.replaceAll('-', ''))}</p>
                      <div className="text-right text-sm font-semibold tabular-nums">
                        {item?.loading ? <Loader2 size={16} className="animate-spin" aria-label={t("priceLoading")} /> : item?.price ? `${stock.currency}${show(comparison.prices[date])}` : <span className="text-rose-600 dark:text-rose-400">{item?.error ? t("failed") : t("noPrice")}</span>}
                      </div>
                      <p className={`min-w-14 text-right text-sm font-semibold tabular-nums ${!result || result.baseline ? 'text-neutral-600 dark:text-neutral-400' : result.percent >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {result ? result.baseline ? t("baseline") : `${result.percent >= 0 ? '+' : ''}${show(result.percent)}%` : '—'}
                      </p>
                    </div>
                    {item?.price && item.priceDate && item.priceDate !== date.replaceAll('-', '') && <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t("actualDate", { date: formatDate(item.priceDate) })}</p>}
                    {item?.error && <p className="mt-1 break-words text-xs text-rose-600 dark:text-rose-400">{item.error}</p>}
                    {item?.marketCapError && <p className="mt-1 break-words text-xs text-amber-700 dark:text-amber-400">{item.marketCapError}</p>}
                  </div>;
                })}
              </div>
              {dates.some(date => stock.prices[date]?.marketCap) && <details className="group/evidence border-t border-neutral-100 dark:border-neutral-800">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-ink dark:text-neutral-400 [&::-webkit-details-marker]:hidden">
                  {t("marketCapSource")}
                  <ChevronDown size={14} className="shrink-0 transition-transform group-open/evidence:rotate-180" aria-hidden />
                </summary>
                <div className="space-y-1 px-3 pb-2 text-xs text-neutral-600 dark:text-neutral-400">
                  {dates.map(date => {
                    const item = stock.prices[date];
                    return item?.marketCap ? <p key={date} className="break-words tabular-nums">{formatDate(item.priceDate ?? date.replaceAll('-', ''))} · {stock.currency}{show(item.marketCap, 0)} · {item.marketCapSource === 'data-go-kr' ? t("portal") : t("savedPrice")}</p> : null;
                  })}
                </div>
              </details>}
              <div className="border-t border-neutral-100 px-3 pt-2 dark:border-neutral-800">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{t("metrics")}</p>
                <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                  {rows.map(row => <div key={row.label} className={row.label === t("shares") ? 'col-span-2 flex items-baseline justify-between gap-2' : 'flex min-w-0 flex-wrap items-baseline justify-between gap-x-2'}>
                    <dt className="text-xs text-neutral-600 dark:text-neutral-400">{row.label}</dt>
                    <dd className="min-w-0 break-words text-sm font-medium tabular-nums">{row.value(stock)}</dd>
                  </div>)}
                </dl>
                <div className="mt-2 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
                  <Link href={`/analyze?ticker=${encodeURIComponent(stock.market === 'US' ? stock.ticker : stock.name)}`} className="inline-flex min-h-11 items-center gap-1 pr-3 text-sm font-semibold text-brand-ink dark:text-brand-ink">{t("analyze")} <ArrowRight size={14} /></Link>
                  <button type="button" aria-label={t("removeStock", { stock: stock.name })} onClick={() => dispatch(removeStock(stock.id))} disabled={loading || dateLoading} className={PAGE_ACTION_CLS}><X size={15} /> {t("remove")}</button>
                </div>
              </div>
            </details>;
          })}
        </div>
        <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-surface-dark-card md:block">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead><tr className="border-b border-neutral-200 dark:border-neutral-700">
              <th className="sticky left-0 z-10 min-w-44 bg-white px-4 py-4 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400 dark:bg-surface-dark-card">{t("stock")}</th>
              {dates.map(date => <th key={date} className="min-w-40 px-4 py-4 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">{t("priceOn", { date: formatDate(date.replaceAll('-', '')) })}</th>)}
              {rows.map(row => <th key={row.label} className="min-w-24 px-4 py-4 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">{row.label}<span className="block text-xs font-normal">{t("onLookup")}</span></th>)}
            </tr></thead>
            <tbody>{stocks.map(stock => <tr key={stock.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
              <th className="sticky left-0 z-10 bg-white px-4 py-4 text-left dark:bg-surface-dark-card">
                <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{stock.name}</p><p className="mt-1 text-xs font-normal text-neutral-600 dark:text-neutral-400">{stock.ticker} · {stock.market}</p></div><button type="button" aria-label={t("removeStock", { stock: stock.name })} onClick={() => dispatch(removeStock(stock.id))} disabled={loading || dateLoading} className={CONTROL_ICON_BUTTON_CLS}><X size={15} /></button></div>
                <Link href={`/analyze?ticker=${encodeURIComponent(stock.market === 'US' ? stock.ticker : stock.name)}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-ink dark:text-brand-ink">{t("analyze")} <ArrowRight size={13} /></Link>
              </th>
              {dates.map(date => <td key={date} className="px-4 py-4 align-top font-medium tabular-nums">{priceContent(stock, date)}</td>)}
              {rows.map(row => <td key={row.label} className="px-4 py-4 align-top font-medium tabular-nums">{row.value(stock)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </section>}
      {returnStats.length > 0 && <SecondarySection title={t("stats")} className="mt-5">
        <p className="mt-1 hidden text-xs text-neutral-600 dark:text-neutral-400 sm:block">{t("statsHint")}</p>
        <div className="mt-2 grid gap-1.5 sm:mt-3 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {returnStats.map(({ date, summary }) => summary && <div key={date} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-surface-dark-card sm:p-4">
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">{formatDate(date.replaceAll('-', ''))} · {t("count", { count: summary.count })}</p>
              <p className={`text-sm font-semibold tabular-nums sm:mt-2 sm:text-xl ${summary.average >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>{t("average", { value: `${summary.average >= 0 ? "+" : ""}${show(summary.average)}` })}</p>
            </div>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400 sm:mt-1">{t("median", { value: `${summary.median >= 0 ? "+" : ""}${show(summary.median)}`, rising: summary.positiveCount, total: summary.count })}</p>
          </div>)}
        </div>
      </SecondarySection>}
      {isAdmin && <p className="mt-5 text-xs leading-5 text-neutral-500">출처: 한국투자증권(시세·지표), 금융위원회 · 공공데이터포털(과거 시가총액 보완). <Link href="/data-sources" className="underline">데이터별 출처 및 이용 조건</Link></p>}
      <p className="mt-5 max-w-prose text-xs leading-5 text-neutral-600 dark:text-neutral-400">{t("returnNotice")}</p>
      <SecondarySection title={t("method")} className="mt-3">
        <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{t("methodKr")}</p>
        <p className="mt-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{t("methodUs")}</p>
        <p className="mt-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{t("methodAdjusted")}</p>
        <p className="mt-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{t("methodMetrics")}</p>
      </SecondarySection>
    </main>
  </div>;
}

export default function ComparePage() {
  const t = useTranslations("compare");
  return <Suspense fallback={<p className="p-6 text-sm text-neutral-500">{t("opening")}</p>}><ComparePageContent /></Suspense>;
}
