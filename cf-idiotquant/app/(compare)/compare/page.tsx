'use client';

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Plus, Search, X } from 'lucide-react';
import corpCodes from '@/public/data/validCorpCode.json';
import corpNames from '@/public/data/validCorpNameArray.json';
import nasdaq from '@/public/data/usStockSymbols/nasdaq_tickers.json';
import nyse from '@/public/data/usStockSymbols/nyse_tickers.json';
import amex from '@/public/data/usStockSymbols/amex_tickers.json';
import { getInquirePrice } from '@/lib/features/koreaInvestment/koreaInvestmentAPI';
import { getQuotationsPriceDetail, getQuotationsSearchInfo } from '@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketAPI';

type ComparisonStock = {
  id: string; name: string; ticker: string; market: 'KR' | 'US'; price?: number;
  per?: number; pbr?: number; eps?: number; bps?: number; roe?: number; currency: string;
};

const usTickers = new Set([...nasdaq, ...nyse, ...amex].map((x) => String(x).toUpperCase()));
const numberOrNull = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : undefined;
};
const show = (n: number | undefined, digits = 2) => n == null ? '—' : n.toLocaleString('ko-KR', { maximumFractionDigits: digits });

export default function ComparePage() {
  const [query, setQuery] = useState('');
  const [stocks, setStocks] = useState<ComparisonStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const kr = (corpNames as string[]).filter(n => n.toLowerCase().includes(q)).slice(0, 5);
    const us = [...usTickers].filter(t => t.toLowerCase().includes(q)).slice(0, 5);
    return [...kr, ...us];
  }, [query]);

  async function addStock(raw: string) {
    const value = raw.trim();
    if (!value || stocks.length >= 4 || loading) return;
    const upper = value.toUpperCase();
    const code = (corpCodes as Record<string, { stock_code?: string }>)[value]?.stock_code ?? (/^\d{6}$/.test(value) ? value : undefined);
    const isUs = !code && (usTickers.has(upper) || /^[A-Z][A-Z0-9.-]{0,5}$/.test(upper));
    const ticker = code ?? (isUs ? upper : '');
    if (!ticker) { setError('종목명 또는 6자리 종목코드를 확인해 주세요. 미국 종목은 티커를 입력할 수 있습니다.'); return; }
    if (stocks.some(s => s.ticker === ticker)) { setError('이미 비교 목록에 있는 종목입니다.'); return; }
    setLoading(true); setError('');
    try {
      let stock: ComparisonStock;
      if (isUs) {
        const [detailRes, infoRes] = await Promise.all([getQuotationsPriceDetail(ticker), getQuotationsSearchInfo(ticker)]);
        const d = detailRes?.output ?? detailRes?.output1 ?? {};
        const i = infoRes?.output ?? {};
        const eps = numberOrNull(d.epsx), bps = numberOrNull(d.bpsx);
        stock = { id: ticker, ticker, name: i.prdt_eng_name || i.ovrs_item_name || ticker, market: 'US', currency: '$', price: numberOrNull(d.last), per: numberOrNull(d.perx), pbr: numberOrNull(d.pbrx), eps, bps, roe: eps && bps ? eps / bps * 100 : undefined };
      } else {
        const res = await getInquirePrice(ticker);
        const d = res?.output ?? {};
        const name = Object.entries(corpCodes as Record<string, { stock_code?: string }>).find(([, item]) => item.stock_code === ticker)?.[0] ?? value;
        const eps = numberOrNull(d.eps), bps = numberOrNull(d.bps);
        stock = { id: ticker, ticker, name: d.rprs_mrkt_kor_name ? `${name}` : name, market: 'KR', currency: '₩', price: numberOrNull(d.stck_prpr), per: numberOrNull(d.per), pbr: numberOrNull(d.pbr), eps, bps, roe: eps && bps ? eps / bps * 100 : undefined };
      }
      if (!stock.price && !stock.per && !stock.pbr) throw new Error('종목 정보를 불러오지 못했습니다. 종목명이나 티커를 확인해 주세요.');
      setStocks(current => [...current, stock]); setQuery('');
    } catch (e) { setError(e instanceof Error ? e.message : '종목 정보를 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }

  function submit(e: FormEvent) { e.preventDefault(); void addStock(query); }

  const rows: { label: string; value: (s: ComparisonStock) => string }[] = [
    { label: '현재가', value: s => `${s.currency}${show(s.price, s.market === 'KR' ? 0 : 2)}` },
    { label: 'PER', value: s => show(s.per) },
    { label: 'PBR', value: s => show(s.pbr) },
    { label: 'EPS', value: s => `${s.currency}${show(s.eps)}` },
    { label: 'BPS', value: s => `${s.currency}${show(s.bps)}` },
    { label: 'ROE', value: s => s.roe == null ? '—' : `${show(s.roe)}%` },
  ];

  return <main className="min-h-screen bg-[#fafaf9] px-4 py-8 text-neutral-900 dark:bg-surface-dark-canvas dark:text-neutral-100 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white">← idiotquant</Link>
      <header className="mt-8 max-w-2xl"><p className="text-sm font-semibold text-[#5148c8] dark:text-[#aaa4ff]">종목 비교</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">궁금한 회사의 숫자를<br className="sm:hidden" /> 나란히 살펴보세요.</h1><p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">국내 종목명·종목코드 또는 미국 티커를 추가해 핵심 지표를 비교할 수 있습니다.</p></header>

      <form onSubmit={submit} className="relative mt-8 flex gap-2">
        <div className="relative min-w-0 flex-1"><Search aria-hidden size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="예: 삼성전자, 005930, AAPL" disabled={loading || stocks.length >= 4} className="h-12 w-full rounded-[4px] border border-neutral-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#635bdb] dark:border-neutral-700 dark:bg-[#111a14]" />
          {suggestions.length > 0 && <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[4px] border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-[#111a14]">{suggestions.map(s => <li key={s}><button type="button" onClick={() => void addStock(s)} className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">{s}</button></li>)}</ul>}
        </div><button disabled={loading || stocks.length >= 4 || !query.trim()} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-[4px] bg-[#635bdb] px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}<span className="hidden sm:inline">추가</span></button>
      </form>
      <p className="mt-2 text-xs text-neutral-500">최대 4개 · 국내와 미국 종목을 함께 볼 수 있습니다.</p>
      {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {stocks.length === 0 ? <section className="mt-8 rounded-md border border-dashed border-neutral-300 bg-white/70 px-5 py-12 text-center dark:border-neutral-700 dark:bg-[#101812]"><p className="text-sm font-medium">비교할 종목을 추가해 주세요.</p><p className="mt-2 text-sm text-neutral-500">예: 삼성전자와 SK하이닉스, 또는 AAPL과 MSFT</p></section> : <section className="mt-8 overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-[#101812]" aria-label="종목 비교 결과">
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-sm"><thead><tr className="border-b border-neutral-200 dark:border-neutral-700"><th className="w-28 px-4 py-4 text-left text-xs font-medium text-neutral-500">지표</th>{stocks.map(s => <th key={s.id} className="min-w-40 px-4 py-4 text-left"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold">{s.name}</p><p className="mt-1 text-xs font-normal text-neutral-500">{s.ticker} · {s.market}</p></div><button aria-label={`${s.name} 제거`} onClick={() => setStocks(items => items.filter(x => x.id !== s.id))} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-white"><X size={15} /></button></div><Link href={`/analyze?ticker=${encodeURIComponent(s.market === 'US' ? s.ticker : s.name)}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#5148c8] dark:text-[#aaa4ff]">상세 분석 <ArrowRight size={13} /></Link></th>)}{stocks.length < 4 && <th className="min-w-32 px-4 py-4 text-left"><button onClick={() => document.querySelector<HTMLInputElement>('input[placeholder^="예:"]')?.focus()} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Plus size={14} />종목 추가</button></th>}</tr></thead><tbody>{rows.map(row => <tr key={row.label} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"><th className="px-4 py-4 text-left text-xs font-medium text-neutral-500">{row.label}</th>{stocks.map(s => <td key={s.id} className="px-4 py-4 font-medium tabular-nums">{row.value(s)}</td>)}{stocks.length < 4 && <td />}</tr>)}</tbody></table></div>
      </section>}
      <p className="mt-5 text-xs leading-5 text-neutral-500">표시되는 지표는 데이터 제공처와 시장에 따라 다를 수 있습니다. 투자 판단을 위한 참고 정보로 활용해 주세요.</p>
    </div>
  </main>;
}
