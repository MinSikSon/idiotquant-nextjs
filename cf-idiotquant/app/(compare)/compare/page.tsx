'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Plus, Search, X } from 'lucide-react';
import corpCodes from '@/public/data/validCorpCode.json';
import corpNames from '@/public/data/validCorpNameArray.json';
import nasdaq from '@/public/data/usStockSymbols/nasdaq_tickers.json';
import nyse from '@/public/data/usStockSymbols/nyse_tickers.json';
import amex from '@/public/data/usStockSymbols/amex_tickers.json';
import { getInquireDailyItemChartPrice, getInquirePrice } from '@/lib/features/koreaInvestment/koreaInvestmentAPI';
import { getOverseasPriceQuotationsDailyPrice, getQuotationsPriceDetail, getQuotationsSearchInfo } from '@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketAPI';
import { calculatePriceReturns } from './priceReturns';

type ComparisonStock = {
  id: string; name: string; ticker: string; market: 'KR' | 'US';
  prices: Record<string, { price?: number; priceDate?: string; loading?: boolean; error?: string }>;
  per?: number; pbr?: number; eps?: number; bps?: number; roe?: number; currency: string;
};
type RecentStock = Pick<ComparisonStock, 'ticker' | 'name' | 'market'>;
const RECENT_STOCKS_KEY = 'idiotquant:compare:recent-stocks:v1';
const RECENT_STOCKS_LIMIT = 10;
const MAX_COMPARISON_STOCKS = 10;

const usTickers = new Set([...nasdaq, ...nyse, ...amex].map((x) => String(x).toUpperCase()));
const numberOrNull = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : undefined;
};
const show = (n: number | undefined, digits = 2) => n == null ? '—' : n.toLocaleString('ko-KR', { maximumFractionDigits: digits });
const formatDate = (date: string) => /^\d{8}$/.test(date) ? `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6)}` : date;
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

async function getHistoricalClose(ticker: string, market: 'KR' | 'US', date: string) {
  const end = date.replaceAll('-', '');
  const startDate = new Date(`${date}T00:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 14);
  const result = market === 'KR'
    ? await getInquireDailyItemChartPrice(ticker, startDate.toISOString().slice(0, 10).replaceAll('-', ''), end)
    : await getOverseasPriceQuotationsDailyPrice(ticker, end);
  if (result?.rt_cd !== '0') throw new Error('해당 날짜의 시세를 불러오지 못했습니다.');
  const row = (Array.isArray(result.output2) ? result.output2 : [])
    .filter((item: any) => (market === 'KR' ? item.stck_bsop_date : item.xymd) <= end)
    .sort((a: any, b: any) => (market === 'KR' ? b.stck_bsop_date.localeCompare(a.stck_bsop_date) : b.xymd.localeCompare(a.xymd)))[0];
  const price = numberOrNull(market === 'KR' ? row?.stck_clpr : row?.clos);
  if (!price) throw new Error('선택한 날짜 이전의 거래 가격이 없습니다.');
  return { price, priceDate: market === 'KR' ? row.stck_bsop_date : row.xymd };
}

export default function ComparePage() {
  const [query, setQuery] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [stocks, setStocks] = useState<ComparisonStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateLoading, setDateLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentStocks, setRecentStocks] = useState<RecentStock[]>([]);
  const [recentLoaded, setRecentLoaded] = useState(false);

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

  async function addStock(raw: string) {
    const value = raw.trim();
    if (!value || stocks.length >= MAX_COMPARISON_STOCKS || loading || dateLoading) return;
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
      let stock: ComparisonStock;
      if (isUs) {
        const [detailRes, infoRes] = await Promise.all([getQuotationsPriceDetail(ticker), getQuotationsSearchInfo(ticker)]);
        const d = detailRes?.output ?? detailRes?.output1 ?? {};
        const i = infoRes?.output ?? {};
        const eps = numberOrNull(d.epsx), bps = numberOrNull(d.bpsx);
        stock = { id: crypto.randomUUID(), ticker, name: i.prdt_eng_name || i.ovrs_item_name || ticker, market: 'US', currency: '$', prices: {}, per: numberOrNull(d.perx), pbr: numberOrNull(d.pbrx), eps, bps, roe: eps && bps ? eps / bps * 100 : undefined };
      } else {
        const res = await getInquirePrice(ticker);
        const d = res?.output ?? {};
        const name = Object.entries(corpCodes as Record<string, { stock_code?: string }>).find(([, item]) => item.stock_code === ticker)?.[0] ?? value;
        const eps = numberOrNull(d.eps), bps = numberOrNull(d.bps);
        stock = { id: crypto.randomUUID(), ticker, name: d.rprs_mrkt_kor_name ? `${name}` : name, market: 'KR', currency: '₩', prices: {}, per: numberOrNull(d.per), pbr: numberOrNull(d.pbr), eps, bps, roe: eps && bps ? eps / bps * 100 : undefined };
      }
      stock.prices = Object.fromEntries(await Promise.all(dates.map(async date => {
        try { return [date, await getHistoricalClose(ticker, stock.market, date)]; }
        catch (e) { return [date, { error: e instanceof Error ? e.message : '가격을 불러오지 못했습니다.' }]; }
      })));
      if (Object.values(stock.prices).every(item => !item.price) && !stock.per && !stock.pbr) {
        throw new Error('종목 정보를 불러오지 못했습니다. 종목명이나 티커를 확인해 주세요.');
      }
      setStocks(current => [...current, stock]);
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
    if (!date || dates.includes(date) || loading || dateLoading) return;
    setError(''); setDateLoading(true);
    setDates(current => [...current, date].sort());
    setStocks(current => current.map(stock => ({ ...stock, prices: { ...stock.prices, [date]: { loading: true } } })));
    await Promise.all(stocks.map(async stock => {
      let result;
      try { result = await getHistoricalClose(stock.ticker, stock.market, date); }
      catch (e) { result = { error: e instanceof Error ? e.message : '가격을 불러오지 못했습니다.' }; }
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

  const rows: { label: string; value: (s: ComparisonStock) => string }[] = [
    { label: 'PER', value: s => show(s.per) },
    { label: 'PBR', value: s => show(s.pbr) },
    { label: 'EPS', value: s => `${s.currency}${show(s.eps)}` },
    { label: 'BPS', value: s => `${s.currency}${show(s.bps)}` },
    { label: 'ROE', value: s => s.roe == null ? '—' : `${show(s.roe)}%` },
  ];

  return <main className="min-h-screen bg-[#fafaf9] px-4 py-8 text-neutral-900 dark:bg-surface-dark-canvas dark:text-neutral-100 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white">← idiotquant</Link>
      <header className="mt-8 max-w-2xl">
        <p className="text-sm font-semibold text-[#5148c8] dark:text-[#aaa4ff]">종목 비교</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">궁금한 회사의 숫자를<br className="sm:hidden" /> 나란히 살펴보세요.</h1>
        <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">비교할 날짜를 등록한 뒤 종목을 추가하세요. 각 종목의 모든 날짜별 종가와 수익률을 한눈에 볼 수 있습니다.</p>
      </header>

      <section className="mt-8" aria-label="비교 날짜">
        <h2 className="text-sm font-semibold">1. 비교할 날짜 추가</h2>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
            가격 기준일
            <input type="date" value={dateInput} max={localToday()} onChange={e => setDateInput(e.target.value)} disabled={dateLoading || loading} className="mt-1 block h-11 rounded-[4px] border border-neutral-300 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-[#111a14] dark:text-neutral-100" />
          </label>
          <button type="button" onClick={() => void addDate()} disabled={!dateInput || dates.includes(dateInput) || dateLoading || loading} className="inline-flex h-11 items-center gap-1.5 rounded-[4px] border border-[#635bdb] px-4 text-sm font-semibold text-[#5148c8] disabled:opacity-50 dark:text-[#aaa4ff]">
            {dateLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} 날짜 추가
          </button>
        </div>
        {dates.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
          {dates.map(date => <span key={date} className="inline-flex items-center gap-1.5 rounded-[4px] border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-neutral-700 dark:bg-[#101812]">
            {formatDate(date.replaceAll('-', ''))}
            <button type="button" onClick={() => removeDate(date)} disabled={dateLoading || loading} aria-label={`${date} 날짜 제거`} className="rounded p-0.5 text-neutral-400 hover:text-neutral-800 disabled:opacity-50 dark:hover:text-white"><X size={13} /></button>
          </span>)}
        </div>}
        <p className="mt-2 text-xs text-neutral-500">휴장일은 선택일 이전의 최근 거래일 종가를 사용하며, 실제 거래일을 표에 표시합니다.</p>
      </section>

      <section className="mt-8" aria-label="비교 종목 추가">
        <h2 className="text-sm font-semibold">2. 종목 추가</h2>
        <form onSubmit={submit} className="relative mt-2 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="예: 삼성전자, 005930, AAPL" disabled={loading || dateLoading || stocks.length >= MAX_COMPARISON_STOCKS || !dates.length} className="h-12 w-full rounded-[4px] border border-neutral-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#635bdb] disabled:opacity-50 dark:border-neutral-700 dark:bg-[#111a14]" />
            {suggestions.length > 0 && dates.length > 0 && <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[4px] border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-[#111a14]">{suggestions.map(s => <li key={s}><button type="button" onClick={() => void addStock(s)} disabled={loading || dateLoading} className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 disabled:opacity-50 dark:hover:bg-neutral-800">{s}</button></li>)}</ul>}
          </div>
          <button disabled={loading || dateLoading || !dates.length || stocks.length >= MAX_COMPARISON_STOCKS || !query.trim()} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-[4px] bg-[#635bdb] px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}<span className="hidden sm:inline">추가</span></button>
        </form>
        <p className="mt-2 text-xs text-neutral-500">종목 최대 10개 · 국내와 미국 종목을 함께 볼 수 있습니다.</p>
        {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </section>

      {recentStocks.length > 0 && !query.trim() && dates.length > 0 && stocks.length < MAX_COMPARISON_STOCKS && <section className="mt-5" aria-label="최근 검색한 종목">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold text-neutral-500">최근 검색</h2>
          <button type="button" onClick={() => setRecentStocks([])} className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">기록 지우기</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {recentStocks.map(stock => <button key={`${stock.market}:${stock.ticker}`} type="button" onClick={() => void addStock(stock.market === 'US' ? stock.ticker : stock.name)} disabled={loading || dateLoading || stocks.some(item => item.ticker === stock.ticker && item.market === stock.market)} className="rounded-[4px] border border-neutral-200 bg-white px-3 py-2 text-left text-xs font-medium hover:border-[#635bdb] hover:text-[#5148c8] disabled:cursor-default disabled:opacity-45 dark:border-neutral-700 dark:bg-[#101812] dark:hover:text-[#aaa4ff]">
            {stock.name} <span className="ml-1 font-mono text-neutral-400">{stock.ticker} · {stock.market}</span>
          </button>)}
        </div>
      </section>}

      {stocks.length === 0 ? <section className="mt-8 rounded-md border border-dashed border-neutral-300 bg-white/70 px-5 py-12 text-center dark:border-neutral-700 dark:bg-[#101812]">
        <p className="text-sm font-medium">{dates.length ? '비교할 종목을 추가해 주세요.' : '비교할 날짜를 먼저 추가해 주세요.'}</p>
        <p className="mt-2 text-sm text-neutral-500">{dates.length ? '예: 삼성전자와 SK하이닉스, 또는 AAPL과 MSFT' : '날짜를 등록하면 종목별 가격을 해당 날짜마다 조회합니다.'}</p>
      </section> : <section className="mt-8 overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-[#101812]" aria-label="종목 비교 결과">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead><tr className="border-b border-neutral-200 dark:border-neutral-700">
              <th className="sticky left-0 z-10 min-w-44 bg-white px-4 py-4 text-left text-xs font-medium text-neutral-500 dark:bg-[#101812]">종목</th>
              {dates.map(date => <th key={date} className="min-w-40 px-4 py-4 text-left text-xs font-medium text-neutral-500">{formatDate(date.replaceAll('-', ''))} 종가</th>)}
              {rows.map(row => <th key={row.label} className="min-w-24 px-4 py-4 text-left text-xs font-medium text-neutral-500">{row.label}<span className="block text-[10px] font-normal">현재 기준</span></th>)}
            </tr></thead>
            <tbody>{stocks.map(stock => <tr key={stock.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
              <th className="sticky left-0 z-10 bg-white px-4 py-4 text-left dark:bg-[#101812]">
                <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{stock.name}</p><p className="mt-1 text-xs font-normal text-neutral-500">{stock.ticker} · {stock.market}</p></div><button type="button" aria-label={`${stock.name} 제거`} onClick={() => setStocks(items => items.filter(item => item.id !== stock.id))} disabled={loading || dateLoading} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-white"><X size={15} /></button></div>
                <Link href={`/analyze?ticker=${encodeURIComponent(stock.market === 'US' ? stock.ticker : stock.name)}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5148c8] dark:text-[#aaa4ff]">상세 분석 <ArrowRight size={13} /></Link>
              </th>
              {dates.map(date => {
                const item = stock.prices[date];
                const result = priceReturns.get(`${stock.id}:${date}`);
                return <td key={date} className="px-4 py-4 align-top font-medium tabular-nums">
                  {item?.loading ? <Loader2 size={16} className="animate-spin" aria-label="가격 조회 중" /> : item?.price ? <>
                    <p>{stock.currency}{show(item.price, stock.market === 'KR' ? 0 : 2)}</p>
                    <p className="mt-1 text-xs font-normal text-neutral-500">{formatDate(item.priceDate!)} 거래</p>
                    {result && <p className={`mt-1 text-xs font-semibold ${result.baseline ? 'text-neutral-500' : result.percent >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>{result.baseline ? '수익률 기준' : `${result.percent >= 0 ? '+' : ''}${show(result.percent)}%`}</p>}
                  </> : <span className="text-xs font-normal text-rose-600 dark:text-rose-400">{item?.error ?? '가격 없음'}</span>}
                </td>;
              })}
              {rows.map(row => <td key={row.label} className="px-4 py-4 align-top font-medium tabular-nums">{row.value(stock)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </section>}
      <p className="mt-5 text-xs leading-5 text-neutral-500">수익률은 같은 종목의 가장 이른 실제 거래일 종가 대비 가격 변화율입니다. PER·PBR·EPS·BPS·ROE는 현재 기준이며, 투자 판단을 위한 참고 정보로 활용해 주세요.</p>
    </div>
  </main>;
}
