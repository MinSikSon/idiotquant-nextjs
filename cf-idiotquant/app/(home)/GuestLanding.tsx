"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useWatchlistSample } from '@/components/home-watchlist';
import { StockLogo } from '@/components/stockLogo';
import { scanDateLabel } from '@/lib/features/stockLikes/changes';
import { WATCHLIST_SAMPLE_COMPANIES } from '@/lib/features/stockLikes/sample';
import { scanValuationSummary } from '@/lib/utils/valuationSummary';
import { ArrowRight, ChevronDown, Search } from 'lucide-react';
import { useStockSearchModal } from '@/components/stock-search-provider';

export default function GuestLanding() {
  const { openSearch } = useStockSearchModal();
  return <div className="mx-auto w-full max-w-3xl space-y-10 px-4 py-6 text-neutral-900 dark:text-neutral-100 sm:space-y-12 sm:px-6 sm:py-12">
    <section aria-labelledby="home-title" className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] sm:gap-8">
      <Image src="/images/onboarding/stock-research.webp" alt="" width={720} height={480} unoptimized fetchPriority="high"
        className="mx-auto h-40 w-full object-contain sm:order-last sm:h-auto" />
      <div>
        <h1 id="home-title" className="text-balance break-keep text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">관심종목의 가격과 적정주가를 한눈에</h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={openSearch} className="inline-flex min-h-11 items-center gap-2 rounded bg-brand-ink px-4 font-semibold text-white hover:bg-brand-ink-hover dark:text-neutral-950"><Search size={17} aria-hidden="true" />종목 검색</button>
          <Link href="/screener" className="inline-flex min-h-11 items-center gap-2 rounded border border-neutral-300 px-4 font-medium dark:border-neutral-700">종목 발굴<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
    <GuestWatchlistSample />
    <section aria-label="관심종목 시작하기" className="border-y border-neutral-200 dark:border-surface-dark-border">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          이용 방법 <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
        </summary>
        <p className="pb-3 leading-relaxed text-neutral-600 dark:text-neutral-300">종목 검색과 발굴은 가입 없이 이용할 수 있어요. 로그인 후 분석 화면에서 하트를 누르면 휴대폰과 PC에서 같은 관심종목을 볼 수 있습니다.</p>
      </details>
      <Link href="/login?callbackUrl=%2F" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-ink">로그인하고 시작<ArrowRight size={15} aria-hidden="true" /></Link>
    </section>
    <footer className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">서비스 안내 <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" /></summary>
        <p className="pb-2">본 서비스는 투자 참고 정보이며 투자 판단과 결과는 이용자에게 있습니다.</p>
      </details>
      <div className="flex flex-wrap items-center gap-x-5"><span>© 2026 IdiotQuant</span><Link className="inline-flex min-h-11 items-center" href="/terms">이용약관</Link><Link className="inline-flex min-h-11 items-center" href="/privacy">개인정보 처리방침</Link></div>
    </footer>
  </div>;
}

const formatPrice = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

function GuestWatchlistSample() {
    const { data, retry } = useWatchlistSample();
    return <section aria-labelledby="guest-watchlist-title" className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2 pb-2">
            <h2 id="guest-watchlist-title" className="text-base font-semibold">관심종목 예시</h2>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">스캔 기준가</span>
        </div>
        <ul className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
            {WATCHLIST_SAMPLE_COMPANIES.map(({ ticker, name }) => {
                const item = data?.items.find(stock => stock.ticker === ticker);
                return <li key={ticker} className="flex items-center gap-3 px-2">
                    <span className="shrink-0 rounded-md bg-white p-1 ring-1 ring-neutral-200 dark:ring-transparent"><StockLogo ticker={ticker} name={name} isUs={false} /></span>
                    <Link href={`/analyze?ticker=${ticker}`} className="flex min-h-14 min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                        <span className="break-keep font-medium">{name}</span>
                        <span className="ml-auto inline-flex items-center gap-2 tabular-nums">
                            {item?.last_price == null ? '—' : `₩${formatPrice(item.last_price)}`}
                            <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-brand-ink" />
                        </span>
                    </Link>
                </li>;
            })}
        </ul>
        <details className="group border-t border-neutral-200 px-2 dark:border-surface-dark-border">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium text-brand-ink [&::-webkit-details-marker]:hidden">
                전략별 적정주가 보기 <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
            </summary>
            <div className="space-y-3 pb-2 text-sm">
                {!data ? <p role="status">스캔 데이터를 불러오는 중…</p> : <>
                    {data.failed > 0 && <div role="alert">
                        <p>일부 종목 데이터를 불러오지 못했습니다.</p>
                        <button type="button" className="min-h-11 underline" onClick={retry}>다시 불러오기</button>
                    </div>}
                    {data.items.length === 0 && data.failed === 0 && <p>아직 표시할 스캔 데이터가 없습니다.</p>}
                    {data.items.map(item => <div key={item.ticker} className="border-t border-neutral-200 pt-3 dark:border-surface-dark-border">
                        <h3 className="font-semibold">{item.stock_name || item.ticker} <span className="text-xs font-normal text-neutral-600 dark:text-neutral-400">· {scanDateLabel(item.scan_date!)} 스캔</span></h3>
                        <dl className="mt-2 space-y-1 tabular-nums">{scanValuationSummary(item).map(model => <div key={model.label} className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <dt>{model.label} <span className="text-xs text-neutral-600 dark:text-neutral-400">{model.basis}</span></dt>
                            <dd>{model.targetPrice === null ? '계산 불가' : `₩${formatPrice(model.targetPrice)}`}{model.gapPercent !== null && <span className="ml-2 text-xs text-neutral-600 dark:text-neutral-400">{model.gapPercent > 0 ? '+' : ''}{model.gapPercent.toFixed(1)}%</span>}</dd>
                        </div>)}</dl>
                    </div>)}
                    {data.items.length > 0 && <p className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">스캔 재무를 바탕으로 계산한 추정치입니다. %는 기준가 대비 차이입니다.</p>}
                </>}
            </div>
        </details>
    </section>;
}
