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
  id: string; name: string; ticker: string; market: 'KR' | 'US'; price?: number;
  currentPrice?: number; selectedDate: string; priceDate?: string; priceLoading?: boolean; priceError?: string;
  per?: number; pbr?: number; eps?: number; bps?: number; roe?: number; currency: string;
};
type RecentStock = Pick<ComparisonStock, 'ticker' | 'name' | 'market'>;
const RECENT_STOCKS_KEY = 'idiotquant:compare:recent-stocks:v1';
const RECENT_STOCKS_LIMIT = 10;

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
  const [addDate, setAddDate] = useState('');
  const [stocks, setStocks] = useState<ComparisonStock[]>([]);
  const [loading, setLoading] = useState(false);
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
  const priceReturns = useMemo(() => calculatePriceReturns(stocks), [stocks]);

  async function addStock(raw: string) {
    const value = raw.trim();
    if (!value || stocks.length >= 4 || loading) return;
    const selectedDate = addDate;
    const upper = value.toUpperCase();
    const code = (corpCodes as Record<string, { stock_code?: string }>)[value]?.stock_code ?? (/^\d{6}$/.test(value) ? value : undefined);
    const isUs = !code && (usTickers.has(upper) || /^[A-Z][A-Z0-9.-]{0,5}$/.test(upper));
    const ticker = code ?? (isUs ? upper : '');
    if (!ticker) { setError('종목명 또는 6자리 종목코드를 확인해 주세요. 미국 종목은 티커를 입력할 수 있습니다.'); return; }
    setLoading(true); setError('');
    try {
      let stock: ComparisonStock;
      if (isUs) {
        const [detailRes, infoRes] = await Promise.all([getQuotationsPriceDetail(ticker), getQuotationsSearchInfo(ticker)]);
        const d = detailRes?.output ?? detailRes?.output1 ?? {};
        const i = infoRes?.output ?? {};
        const eps = numberOrNull(d.epsx), bps = numberOrNull(d.bpsx);
        stock = { id: crypto.randomUUID(), ticker, name: i.prdt_eng_name || i.ovrs_item_name || ticker, market: 'US', currency: '$', price: numberOrNull(d.last), selectedDate: '', per: numberOrNull(d.perx), pbr: numberOrNull(d.pbrx), eps, bps, roe: eps && bps ? eps / bps * 100 : undefined };
      } else {
        const res = await getInquirePrice(ticker);
        const d = res?.output ?? {};
        const name = Object.entries(corpCodes as Record<string, { stock_code?: string }>).find(([, item]) => item.stock_code === ticker)?.[0] ?? value;
        const eps = numberOrNull(d.eps), bps = numberOrNull(d.bps);
        stock = { id: crypto.randomUUID(), ticker, name: d.rprs_mrkt_kor_name ? `${name}` : name, market: 'KR', currency: '₩', price: numberOrNull(d.stck_prpr), selectedDate: '', per: numberOrNull(d.per), pbr: numberOrNull(d.pbr), eps, bps, roe: eps && bps ? eps / bps * 100 : undefined };
      }
      if (!stock.price && !stock.per && !stock.pbr) throw new Error('종목 정보를 불러오지 못했습니다. 종목명이나 티커를 확인해 주세요.');
      stock.currentPrice = stock.price;
      if (selectedDate) {
        const { price, priceDate } = await getHistoricalClose(ticker, stock.market, selectedDate);
        stock = { ...stock, selectedDate, price, priceDate };
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

  async function setPriceDate(id: string, date: string) {
    const stock = stocks.find(item => item.id === id);
    if (!stock) return;
    if (!date) {
      setStocks(items => items.map(item => item.id === id
        ? { ...item, selectedDate: '', price: item.currentPrice, priceDate: undefined, priceLoading: false, priceError: undefined }
        : item));
      return;
    }
    setStocks(items => items.map(item => item.id === id
      ? { ...item, selectedDate: date, price: undefined, priceDate: undefined, priceLoading: true, priceError: undefined }
      : item));
    try {
      const { price, priceDate } = await getHistoricalClose(stock.ticker, stock.market, date);
      setStocks(items => items.map(item => item.id === id && item.selectedDate === date
        ? { ...item, price, priceDate, priceLoading: false }
        : item));
    } catch (e) {
      setStocks(items => items.map(item => item.id === id && item.selectedDate === date
        ? { ...item, priceLoading: false, priceError: e instanceof Error ? e.message : '가격을 불러오지 못했습니다.' }
        : item));
    }
  }

  const rows: { label: string; value: (s: ComparisonStock) => string }[] = [
    { label: 'PER', value: s => show(s.per) },
    { label: 'PBR', value: s => show(s.pbr) },
    { label: 'EPS', value: s => `${s.currency}${show(s.eps)}` },
    { label: 'BPS', value: s => `${s.currency}${show(s.bps)}` },
    { label: 'ROE', value: s => s.roe == null ? '—' : `${show(s.roe)}%` },
  ];
  const returnComparisons = stocks.flatMap(stock => {
    const result = priceReturns.get(stock.id);
    if (!result || result.baseline || stock.priceDate === result.baselineDate) return [];
    const baseline = stocks.find(item => item.market === stock.market && item.ticker === stock.ticker && item.priceDate === result.baselineDate && item.price);
    return baseline ? [{ stock, baseline, percent: result.percent }] : [];
  });

  return <main className="min-h-screen bg-[#fafaf9] px-4 py-8 text-neutral-900 dark:bg-surface-dark-canvas dark:text-neutral-100 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white">← idiotquant</Link>
      <header className="mt-8 max-w-2xl"><p className="text-sm font-semibold text-[#5148c8] dark:text-[#aaa4ff]">종목 비교</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">궁금한 회사의 숫자를<br className="sm:hidden" /> 나란히 살펴보세요.</h1><p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">국내 종목명·종목코드 또는 미국 티커를 추가해 핵심 지표를 비교할 수 있습니다. 같은 종목을 여러 번 추가해 서로 다른 날짜의 가격도 비교해 보세요.</p></header>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
          추가할 가격 기준일
          <input type="date" value={addDate} max={localToday()} onChange={e => setAddDate(e.target.value)} className="mt-1 block h-12 w-full rounded-[4px] border border-neutral-300 bg-white px-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-[#111a14] dark:text-neutral-100 sm:w-44" />
        </label>
      <form onSubmit={submit} className="relative flex min-w-0 flex-1 gap-2">
        <div className="relative min-w-0 flex-1"><Search aria-hidden size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="예: 삼성전자, 005930, AAPL" disabled={loading || stocks.length >= 4} className="h-12 w-full rounded-[4px] border border-neutral-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#635bdb] dark:border-neutral-700 dark:bg-[#111a14]" />
          {suggestions.length > 0 && <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[4px] border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-[#111a14]">{suggestions.map(s => <li key={s}><button type="button" onClick={() => void addStock(s)} className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">{s}</button></li>)}</ul>}
        </div><button disabled={loading || stocks.length >= 4 || !query.trim()} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-[4px] bg-[#635bdb] px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}<span className="hidden sm:inline">추가</span></button>
      </form>
      </div>
      <p className="mt-2 text-xs text-neutral-500">날짜를 고른 뒤 종목을 추가하세요. 날짜를 비우면 현재 시세로 추가됩니다. 최대 4개 · 국내와 미국 종목을 함께 볼 수 있습니다.</p>
      {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {recentStocks.length > 0 && !query.trim() && stocks.length < 4 && <section className="mt-5" aria-label="최근 검색한 종목">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold text-neutral-500">최근 검색</h2>
          <button type="button" onClick={() => setRecentStocks([])} className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">기록 지우기</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {recentStocks.map(stock => <button key={`${stock.market}:${stock.ticker}`} type="button"
            onClick={() => void addStock(stock.market === 'US' ? stock.ticker : stock.name)} disabled={loading}
            className="rounded-[4px] border border-neutral-200 bg-white px-3 py-2 text-left text-xs font-medium hover:border-[#635bdb] hover:text-[#5148c8] disabled:cursor-default disabled:opacity-45 dark:border-neutral-700 dark:bg-[#101812] dark:hover:text-[#aaa4ff]">
            {stock.name} <span className="ml-1 font-mono text-neutral-400">{stock.ticker} · {stock.market}</span>
          </button>)}
        </div>
      </section>}

      {stocks.length === 0 ? <section className="mt-8 rounded-md border border-dashed border-neutral-300 bg-white/70 px-5 py-12 text-center dark:border-neutral-700 dark:bg-[#101812]"><p className="text-sm font-medium">비교할 종목을 추가해 주세요.</p><p className="mt-2 text-sm text-neutral-500">예: 삼성전자와 SK하이닉스, 또는 AAPL과 MSFT</p></section> : <section className="mt-8 overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-[#101812]" aria-label="종목 비교 결과">
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-sm"><thead><tr className="border-b border-neutral-200 dark:border-neutral-700"><th className="w-28 px-4 py-4 text-left text-xs font-medium text-neutral-500">지표</th>{stocks.map((s, index) => <th key={s.id} className="min-w-40 px-4 py-4 text-left"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold">{s.name}</p><p className="mt-1 text-xs font-normal text-neutral-500">{s.ticker} · {s.market}</p></div><button aria-label={`${s.name} ${index + 1}번째 항목 제거`} onClick={() => setStocks(items => items.filter(x => x.id !== s.id))} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-white"><X size={15} /></button></div><label className="mt-3 block text-xs font-medium text-neutral-500">가격 기준일<input type="date" value={s.selectedDate} max={localToday()} onChange={e => void setPriceDate(s.id, e.target.value)} aria-label={`${s.name} ${index + 1}번째 가격 기준일`} className="mt-1 block w-full rounded-[4px] border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-[#111a14] dark:text-neutral-100" /></label><div className="mt-1 flex items-center justify-between gap-1 text-[11px] font-normal text-neutral-500"><span>{s.selectedDate ? '선택일 이전 최근 거래 종가' : '날짜 미선택 · 현재 시세'}</span>{s.selectedDate && <button type="button" onClick={() => void setPriceDate(s.id, '')} className="shrink-0 font-semibold text-[#5148c8] dark:text-[#aaa4ff]">현재로</button>}</div><Link href={`/analyze?ticker=${encodeURIComponent(s.market === 'US' ? s.ticker : s.name)}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#5148c8] dark:text-[#aaa4ff]">상세 분석 <ArrowRight size={13} /></Link></th>)}{stocks.length < 4 && <th className="min-w-32 px-4 py-4 text-left"><button onClick={() => document.querySelector<HTMLInputElement>('input[placeholder^="예:"]')?.focus()} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Plus size={14} />종목 추가</button></th>}</tr></thead><tbody><tr className="border-b border-neutral-100 dark:border-neutral-800"><th className="px-4 py-4 text-left text-xs font-medium text-neutral-500">가격</th>{stocks.map(s => <td key={s.id} className="px-4 py-4 font-medium tabular-nums">{s.priceLoading ? <Loader2 size={16} className="animate-spin" aria-label="가격 조회 중" /> : <>{s.price == null ? '—' : `${s.currency}${show(s.price, s.market === 'KR' ? 0 : 2)}`}{s.priceDate && <p className="mt-1 text-xs font-normal text-neutral-500">{formatDate(s.priceDate)} 종가</p>}{s.priceError && <p className="mt-1 text-xs font-normal text-rose-600 dark:text-rose-400">{s.priceError}</p>}</>}</td>)}{stocks.length < 4 && <td />}</tr>{rows.map(row => <tr key={row.label} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"><th className="px-4 py-4 text-left text-xs font-medium text-neutral-500">{row.label}</th>{stocks.map(s => <td key={s.id} className="px-4 py-4 font-medium tabular-nums">{row.value(s)}</td>)}{stocks.length < 4 && <td />}</tr>)}</tbody></table></div>
      </section>}
      {returnComparisons.length > 0 && <section className="mt-6 rounded-md border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-[#101812]" aria-label="날짜 간 수익률">
        <h2 className="text-base font-semibold">날짜 간 수익률</h2>
        <p className="mt-1 text-xs text-neutral-500">같은 종목의 가장 이른 실제 거래일 종가 대비 가격 변화율입니다.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {returnComparisons.map(({ stock, baseline, percent }) => <div key={stock.id} className="rounded-[4px] border border-neutral-200 p-4 dark:border-neutral-700">
            <p className="text-sm font-semibold">{stock.name} <span className="font-mono text-xs font-normal text-neutral-500">{stock.ticker}</span></p>
            <p className="mt-2 text-xs text-neutral-500">{formatDate(baseline.priceDate!)} {baseline.currency}{show(baseline.price, stock.market === 'KR' ? 0 : 2)} → {formatDate(stock.priceDate!)} {stock.currency}{show(stock.price, stock.market === 'KR' ? 0 : 2)}</p>
            <p className={`mt-2 text-xl font-semibold tabular-nums ${percent >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>{percent >= 0 ? '+' : ''}{show(percent)}%</p>
          </div>)}
        </div>
      </section>}
      <p className="mt-5 text-xs leading-5 text-neutral-500">날짜 선택은 가격에만 적용됩니다. PER·PBR·EPS·BPS·ROE는 현재 기준이며, 표시되는 지표는 데이터 제공처와 시장에 따라 다를 수 있습니다. 투자 판단을 위한 참고 정보로 활용해 주세요.</p>
    </div>
  </main>;
}
