'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { PAGE_WIDTH } from '@/components/pageHeader';
import { useSession } from 'next-auth/react';
import { ArrowRight, ChevronDown, Loader2, Plus, Search, X } from 'lucide-react';
import corpCodes from '@/public/data/validCorpCode.json';
import corpNames from '@/public/data/validCorpNameArray.json';
import nasdaq from '@/public/data/usStockSymbols/nasdaq_tickers.json';
import nyse from '@/public/data/usStockSymbols/nyse_tickers.json';
import amex from '@/public/data/usStockSymbols/amex_tickers.json';
import { getInquireDailyItemChartPrice, getInquirePrice } from '@/lib/features/koreaInvestment/koreaInvestmentAPI';
import { getOverseasPriceQuotationsDailyPrice, getQuotationsPriceDetail, getQuotationsSearchInfo } from '@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketAPI';
import { calculatePriceReturns, summarizeReturns } from './priceReturns';
import { historicalPrice } from './historicalPrice';

type ComparisonStock = {
  id: string; name: string; ticker: string; market: 'KR' | 'US';
  currentShares?: number;
  prices: Record<string, { price?: number; priceDate?: string; loading?: boolean; error?: string }>;
  per?: number; pbr?: number; eps?: number; bps?: number; roe?: number; currency: string;
};
type RecentStock = Pick<ComparisonStock, 'ticker' | 'name' | 'market'>;
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
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

async function getHistoricalPrice(ticker: string, market: 'KR' | 'US', date: string) {
  const end = date.replaceAll('-', '');
  const startDate = new Date(`${date}T00:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 14);
  const result = market === 'KR'
    ? await getInquireDailyItemChartPrice(ticker, startDate.toISOString().slice(0, 10).replaceAll('-', ''), end)
    : await getOverseasPriceQuotationsDailyPrice(ticker, end);
  return historicalPrice(result, market, end);
}

async function loadStock(ticker: string, market: 'KR' | 'US', nameHint: string, dates: string[]): Promise<ComparisonStock> {
  const domesticName = Object.entries(corpCodes as Record<string, { stock_code?: string }>).find(([, item]) => item.stock_code === ticker)?.[0] ?? nameHint;
  const pricesPromise = Promise.all(dates.map(async date => {
    try { return [date, await getHistoricalPrice(ticker, market, date)] as const; }
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

export default function ComparePage() {
  const { status: sessionStatus } = useSession();
  const limits = sessionStatus === 'authenticated' ? MEMBER_LIMITS : GUEST_LIMITS;
  const sessionLoading = sessionStatus === 'loading';
  const limitsRef = useRef(limits);
  limitsRef.current = limits;
  const [query, setQuery] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [stocks, setStocks] = useState<ComparisonStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateLoading, setDateLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentStocks, setRecentStocks] = useState<RecentStock[]>([]);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [importProgress, setImportProgress] = useState<{ loaded: number; total: number } | null>(null);
  const importedRef = useRef(false);

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
  useEffect(() => {
    if (sessionLoading || importedRef.current) return;
    importedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const market = params.get('country');
    const date = params.get('date');
    if ((market !== 'KR' && market !== 'US') || !date || !/^\d{8}$/.test(date)) return;
    const tickers = [...new Set((params.get('tickers') ?? '').split(',').map(ticker => ticker.trim().toUpperCase()))]
      .filter(ticker => market === 'KR' ? /^\d{6}$/.test(ticker) : /^[A-Z][A-Z0-9.-]{0,5}$/.test(ticker))
      .slice(0, limits.stocks);
    if (!tickers.length) return;
    const selectedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
    setDates([selectedDate]);
    setDateInput(selectedDate);
    setLoading(true);
    setImportProgress({ loaded: 0, total: tickers.length });
    void (async () => {
      let failed = 0;
      for (const [index, ticker] of tickers.entries()) {
        try {
          const stock = await loadStock(ticker, market, ticker, [selectedDate]);
          setStocks(current => current.length < limitsRef.current.stocks ? [...current, stock] : current);
        } catch { failed++; }
        setImportProgress({ loaded: index + 1, total: tickers.length });
      }
      if (failed) setError(`${failed}개 종목의 시세를 불러오지 못했습니다. 나머지 종목은 비교표에 추가했습니다.`);
      setLoading(false);
      setImportProgress(null);
    })();
  }, [sessionLoading, limits.stocks]);
  useEffect(() => {
    if (sessionLoading) return;
    setDates(current => current.length > limits.dates ? current.slice(0, limits.dates) : current);
    setStocks(current => current.length > limits.stocks ? current.slice(0, limits.stocks) : current);
  }, [sessionLoading, limits.dates, limits.stocks]);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const kr = (corpNames as string[]).filter(n => n.toLowerCase().includes(q)).slice(0, 5);
    const us = [...usTickers].filter(t => t.toLowerCase().includes(q)).slice(0, 5);
    return [...kr, ...us];
  }, [query]);
  const priceReturns = useMemo(() => calculatePriceReturns(stocks.flatMap(stock => dates.map(date => ({
    id: `${stock.id}:${date}`, ticker: stock.ticker, market: stock.market,
    price: stock.prices[date]?.price, priceDate: stock.prices[date]?.priceDate,
  })))), [stocks, dates]);
  const returnStats = useMemo(() => dates.map(date => ({
    date,
    summary: summarizeReturns(stocks.flatMap(stock => {
      const result = priceReturns.get(`${stock.id}:${date}`);
      return result && stock.prices[date]?.priceDate !== result.baselineDate ? [result.percent] : [];
    })),
  })).filter(item => item.summary), [dates, stocks, priceReturns]);

  async function addStock(raw: string) {
    const value = raw.trim();
    if (!value || sessionLoading || stocks.length >= limits.stocks || loading || dateLoading) return;
    if (!dates.length) { setError('비교할 날짜를 먼저 추가해 주세요.'); return; }
    const upper = value.toUpperCase();
    const code = (corpCodes as Record<string, { stock_code?: string }>)[value]?.stock_code ?? (/^\d{6}$/.test(value) ? value : undefined);
    const isUs = !code && (usTickers.has(upper) || /^[A-Z][A-Z0-9.-]{0,5}$/.test(upper));
    const ticker = code ?? (isUs ? upper : '');
    if (!ticker) { setError('종목명 또는 6자리 종목코드를 확인해 주세요. 미국 종목은 티커를 입력할 수 있습니다.'); return; }
    if (stocks.some(stock => stock.ticker === ticker && stock.market === (isUs ? 'US' : 'KR'))) {
      setError('이미 추가한 종목입니다. 날짜를 추가하면 해당 종목의 가격도 함께 조회됩니다.'); return;
    }
    setLoading(true); setError('');
    try {
      const stock = await loadStock(ticker, isUs ? 'US' : 'KR', value, dates);
      setStocks(current => current.length < limitsRef.current.stocks ? [...current, stock] : current);
      setRecentStocks(current => [
        { ticker: stock.ticker, name: stock.name, market: stock.market },
        ...current.filter(item => item.ticker !== stock.ticker || item.market !== stock.market),
      ].slice(0, RECENT_STOCKS_LIMIT));
      setQuery('');
    } catch (e) { setError(e instanceof Error ? e.message : '종목 정보를 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }

  function submit(e: FormEvent) { e.preventDefault(); void addStock(query); }

  async function addDate() {
    const date = dateInput;
    if (!date || sessionLoading || dates.includes(date) || dates.length >= limits.dates || loading || dateLoading) return;
    setError(''); setDateLoading(true);
    setDates(current => current.length < limits.dates ? [...current, date].sort() : current);
    setStocks(current => current.map(stock => ({ ...stock, prices: { ...stock.prices, [date]: { loading: true } } })));
    await Promise.all(stocks.map(async stock => {
      const result = await getHistoricalPrice(stock.ticker, stock.market, date)
        .catch(e => ({ error: e instanceof Error ? e.message : '가격을 불러오지 못했습니다.' }));
      setStocks(current => current.map(item => item.id === stock.id && item.prices[date]?.loading
        ? { ...item, prices: { ...item.prices, [date]: result } }
        : item));
    }));
    setDateLoading(false);
  }

  function removeDate(date: string) {
    if (dateLoading || loading) return;
    setDates(current => current.filter(item => item !== date));
    setStocks(current => current.map(stock => {
      const prices = { ...stock.prices };
      delete prices[date];
      return { ...stock, prices };
    }));
  }

  function priceContent(stock: ComparisonStock, date: string) {
    const item = stock.prices[date];
    const result = priceReturns.get(`${stock.id}:${date}`);
    return item?.loading ? <Loader2 size={16} className="animate-spin" aria-label="가격 조회 중" /> : item?.price ? <>
      <p>{stock.currency}{show(item.price)}</p>
      <p className="mt-1 text-xs font-normal text-neutral-500">{formatDate(item.priceDate!)} 종가</p>
      {result && <p className={`mt-1 text-xs font-semibold ${result.baseline ? 'text-neutral-500' : result.percent >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>{result.baseline ? '변화율 기준' : `${result.percent >= 0 ? '+' : ''}${show(result.percent)}%`}</p>}
    </> : <span className="text-xs font-normal text-rose-600 dark:text-rose-400">{item?.error ?? '가격 없음'}</span>;
  }

  const rows: { label: string; value: (s: ComparisonStock) => string }[] = [
    { label: '현재 상장주식 수', value: s => s.currentShares ? `${show(s.currentShares, 0)}주` : '—' },
    { label: 'PER', value: s => show(s.per) },
    { label: 'PBR', value: s => show(s.pbr) },
    { label: 'EPS', value: s => `${s.currency}${show(s.eps)}` },
    { label: 'BPS', value: s => `${s.currency}${show(s.bps)}` },
    { label: 'ROE', value: s => s.roe == null ? '—' : `${show(s.roe)}%` },
  ];

  return <main className="min-h-screen bg-surface-canvas py-8 text-neutral-900 dark:bg-surface-dark-canvas dark:text-neutral-100 sm:py-12">
    <div className={PAGE_WIDTH.data}>
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">종목 비교</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">날짜와 종목을 추가해 주가와 변화율을 비교하세요.</p>
      </header>

      <section className="mt-8" aria-label="비교 날짜">
        <h2 className="text-sm font-semibold">비교 날짜</h2>
        <div className="mt-2 grid min-w-0 gap-2 sm:flex sm:items-end">
          <label className="block min-w-0 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            가격 기준일
            <input type="date" value={dateInput} max={localToday()} onChange={e => setDateInput(e.target.value)} disabled={sessionLoading || dateLoading || loading} className="relative mt-1 block h-11 w-full min-w-0 max-w-full appearance-none rounded-xl border border-neutral-300 bg-white px-3 text-center text-base text-neutral-900 outline-none focus:border-[#635bdb] dark:border-neutral-700 dark:bg-surface-dark-card dark:text-neutral-100 sm:w-56 sm:text-sm [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:flex [&::-webkit-date-and-time-value]:h-full [&::-webkit-date-and-time-value]:w-full [&::-webkit-date-and-time-value]:min-h-0 [&::-webkit-date-and-time-value]:items-center [&::-webkit-date-and-time-value]:justify-center [&::-webkit-date-and-time-value]:text-center [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:h-full [&::-webkit-datetime-edit]:w-full [&::-webkit-datetime-edit]:items-center [&::-webkit-datetime-edit]:justify-center [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2" />
          </label>
          <button type="button" onClick={() => void addDate()} disabled={sessionLoading || !dateInput || dates.includes(dateInput) || dates.length >= limits.dates || dateLoading || loading} className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#635bdb] px-3 text-sm font-semibold text-brand-ink disabled:opacity-50 dark:text-brand-ink sm:px-4">
            {dateLoading ? <Loader2 size={16} className="shrink-0 animate-spin" /> : <Plus size={16} className="shrink-0" />} 날짜 추가
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500">날짜 {dates.length}/{limits.dates}개 · {sessionStatus === 'authenticated' ? '로그인' : '비로그인'} 기준</p>
        {dates.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
          {dates.map(date => <span key={date} className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-neutral-700 dark:bg-surface-dark-card">
            {formatDate(date.replaceAll('-', ''))}
            <button type="button" onClick={() => removeDate(date)} disabled={dateLoading || loading} aria-label={`${date} 날짜 제거`} className="rounded p-0.5 text-neutral-400 hover:text-neutral-800 disabled:opacity-50 dark:hover:text-white"><X size={13} /></button>
          </span>)}
        </div>}
        <p className="mt-2 text-xs text-neutral-500">휴장일은 선택일 이전의 최근 거래일 종가를 사용하며, 실제 거래일을 함께 표시합니다.</p>
      </section>

      <section className="mt-8" aria-label="비교 종목 추가">
        <h2 className="text-sm font-semibold">비교 종목</h2>
        <form onSubmit={submit} className="relative mt-2 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="예: 삼성전자, 005930, AAPL" disabled={sessionLoading || loading || dateLoading || stocks.length >= limits.stocks || !dates.length} className="h-12 w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-3 text-base outline-none focus:border-[#635bdb] disabled:opacity-50 dark:border-neutral-700 dark:bg-surface-dark-card sm:text-sm" />
            {suggestions.length > 0 && dates.length > 0 && <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-surface-dark-card">{suggestions.map(s => <li key={s}><button type="button" onClick={() => void addStock(s)} disabled={loading || dateLoading} className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 disabled:opacity-50 dark:hover:bg-neutral-800">{s}</button></li>)}</ul>}
          </div>
          <button disabled={sessionLoading || loading || dateLoading || !dates.length || stocks.length >= limits.stocks || !query.trim()} aria-label="종목 추가" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}<span className="hidden sm:inline">추가</span></button>
        </form>
        <p className="mt-2 text-xs text-neutral-500">종목 {stocks.length}/{limits.stocks}개 · 국내와 미국 종목을 함께 볼 수 있습니다.</p>
        {importProgress && <p role="status" className="mt-2 text-xs text-neutral-500">스크리너 종목을 불러오는 중 · {importProgress.loaded}/{importProgress.total}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </section>

      {recentStocks.length > 0 && !query.trim() && dates.length > 0 && stocks.length < limits.stocks && <section className="mt-5" aria-label="최근 검색한 종목">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold text-neutral-500">최근 검색</h2>
          <button type="button" onClick={() => setRecentStocks([])} className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">기록 지우기</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {recentStocks.map(stock => <button key={`${stock.market}:${stock.ticker}`} type="button" onClick={() => void addStock(stock.market === 'US' ? stock.ticker : stock.name)} disabled={loading || dateLoading || stocks.some(item => item.ticker === stock.ticker && item.market === stock.market)} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left text-xs font-medium hover:border-[#635bdb] hover:text-brand-ink disabled:cursor-default disabled:opacity-45 dark:border-neutral-700 dark:bg-surface-dark-card dark:hover:text-brand-ink">
            {stock.name} <span className="ml-1 font-mono text-neutral-400">{stock.ticker} · {stock.market}</span>
          </button>)}
        </div>
      </section>}

      {returnStats.length > 0 && <section className="mt-6" aria-label="날짜별 주가 변화율 통계">
        <h2 className="text-sm font-semibold sm:text-base">날짜별 주가 변화율 통계</h2>
        <p className="mt-1 hidden text-xs text-neutral-500 sm:block">각 종목의 가장 이른 거래일 종가와 비교할 수 있는 종목만 집계합니다.</p>
        <div className="mt-2 grid gap-1.5 sm:mt-3 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {returnStats.map(({ date, summary }) => summary && <div key={date} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-surface-dark-card sm:p-4">
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="text-xs font-semibold text-neutral-500">{formatDate(date.replaceAll('-', ''))} · {summary.count}종목</p>
              <p className={`text-sm font-semibold tabular-nums sm:mt-2 sm:text-xl ${summary.average >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>평균 {summary.average >= 0 ? '+' : ''}{show(summary.average)}%</p>
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-500 sm:mt-1 sm:text-xs">중앙값 {summary.median >= 0 ? '+' : ''}{show(summary.median)}% · 상승 {summary.positiveCount}/{summary.count}종목</p>
          </div>)}
        </div>
      </section>}
      {stocks.length === 0 ? <section className="mt-8 border-t border-neutral-200 px-0 py-8 dark:border-neutral-700">
        <p className="text-sm font-medium">{dates.length ? '비교할 종목을 추가해 주세요.' : '비교할 날짜를 먼저 추가해 주세요.'}</p>
        <p className="mt-2 text-sm text-neutral-500">{dates.length ? '예: 삼성전자와 SK하이닉스, 또는 AAPL과 MSFT' : '날짜를 등록하면 종목별 가격을 해당 날짜마다 조회합니다.'}</p>
      </section> : <section className="mt-5 sm:mt-8" aria-label="종목 비교 결과">
        <div className="space-y-2 md:hidden">
          {stocks.map(stock => {
            const latestDate = dates.at(-1);
            const latest = latestDate ? stock.prices[latestDate] : undefined;
            const latestReturn = latestDate ? priceReturns.get(`${stock.id}:${latestDate}`) : undefined;
            const hasReturn = latestReturn && latest?.priceDate !== latestReturn.baselineDate;
            return <details key={stock.id} className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-surface-dark-card">
              <summary className="cursor-pointer list-none px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{stock.name}</span>
                  <span className="shrink-0 text-[11px] text-neutral-500">{stock.ticker} · {stock.market}</span>
                  <ChevronDown size={15} className="shrink-0 text-neutral-400 transition-transform group-open:rotate-180" aria-hidden />
                </div>
                {latestDate ? <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="shrink-0 text-neutral-500">{formatDate(latest?.priceDate ?? latestDate.replaceAll('-', ''))} 종가</span>
                  <span className={`min-w-0 text-right font-semibold tabular-nums ${latest?.error ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                    {latest?.loading ? '조회 중' : latest?.price ? `${stock.currency}${show(latest.price)}` : latest?.error ?? '가격 없음'}
                  </span>
                </div> : <p className="mt-1.5 text-xs text-neutral-500">비교 날짜를 추가하면 가격을 볼 수 있습니다.</p>}
                {hasReturn && <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                  <span className="text-neutral-500">{formatDate(latestReturn.baselineDate)} 대비</span>
                  <span className={`font-semibold tabular-nums ${latestReturn.percent >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>{latestReturn.percent >= 0 ? '+' : ''}{show(latestReturn.percent)}%</span>
                </div>}
              </summary>
              <div className="divide-y divide-neutral-100 border-t border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
                {dates.map(date => <div key={date} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 px-3 py-2.5 text-sm">
                  <p className="text-xs font-medium text-neutral-500">{formatDate(date.replaceAll('-', ''))} 종가</p>
                  <div className="text-right font-semibold tabular-nums">{priceContent(stock, date)}</div>
                </div>)}
              </div>
              <div className="border-t border-neutral-100 px-3 py-3 dark:border-neutral-800">
                <p className="text-xs text-neutral-500">현재 기준 지표</p>
                <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-3">
                  {rows.map(row => <div key={row.label} className={row.label === '현재 상장주식 수' ? 'col-span-3 flex items-baseline justify-between gap-3' : 'min-w-0'}>
                    <dt className="text-xs text-neutral-500">{row.label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium tabular-nums">{row.value(stock)}</dd>
                  </div>)}
                </dl>
                <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <Link href={`/analyze?ticker=${encodeURIComponent(stock.market === 'US' ? stock.ticker : stock.name)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink dark:text-brand-ink">상세 분석 <ArrowRight size={13} /></Link>
                  <button type="button" aria-label={`${stock.name} 제거`} onClick={() => setStocks(items => items.filter(item => item.id !== stock.id))} disabled={loading || dateLoading} className="inline-flex items-center gap-1 rounded p-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-white"><X size={15} /> 제거</button>
                </div>
              </div>
            </details>;
          })}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-surface-dark-card md:block">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead><tr className="border-b border-neutral-200 dark:border-neutral-700">
              <th className="sticky left-0 z-10 min-w-44 bg-white px-4 py-4 text-left text-xs font-medium text-neutral-500 dark:bg-surface-dark-card">종목</th>
              {dates.map(date => <th key={date} className="min-w-40 px-4 py-4 text-left text-xs font-medium text-neutral-500">{formatDate(date.replaceAll('-', ''))} 종가</th>)}
              {rows.map(row => <th key={row.label} className="min-w-24 px-4 py-4 text-left text-xs font-medium text-neutral-500">{row.label}<span className="block text-[10px] font-normal">현재 기준</span></th>)}
            </tr></thead>
            <tbody>{stocks.map(stock => <tr key={stock.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
              <th className="sticky left-0 z-10 bg-white px-4 py-4 text-left dark:bg-surface-dark-card">
                <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{stock.name}</p><p className="mt-1 text-xs font-normal text-neutral-500">{stock.ticker} · {stock.market}</p></div><button type="button" aria-label={`${stock.name} 제거`} onClick={() => setStocks(items => items.filter(item => item.id !== stock.id))} disabled={loading || dateLoading} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-white"><X size={15} /></button></div>
                <Link href={`/analyze?ticker=${encodeURIComponent(stock.market === 'US' ? stock.ticker : stock.name)}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-ink dark:text-brand-ink">상세 분석 <ArrowRight size={13} /></Link>
              </th>
              {dates.map(date => <td key={date} className="px-4 py-4 align-top font-medium tabular-nums">{priceContent(stock, date)}</td>)}
              {rows.map(row => <td key={row.label} className="px-4 py-4 align-top font-medium tabular-nums">{row.value(stock)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </section>}
      <p className="mt-5 text-xs leading-5 text-neutral-500">비교 가격은 제공된 시세의 종가 기준입니다. 액면분할·병합이 있었던 종목은 시세에 반영된 조정 방식에 따라 가격과 변화율 비교가 부정확할 수 있습니다. 변화율은 배당금·수수료·세금을 포함한 실제 투자 수익률과 다릅니다. PER·PBR·EPS·BPS·ROE는 현재 기준입니다.</p>
    </div>
  </main>;
}
