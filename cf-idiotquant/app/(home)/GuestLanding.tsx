"use client";

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useWatchlistSample } from '@/components/home-watchlist';
import { StockLogo } from '@/components/stockLogo';
import { scanDateLabel } from '@/lib/features/stockLikes/changes';
import { WATCHLIST_SAMPLE_COMPANIES } from '@/lib/features/stockLikes/sample';
import { scanValuationSummary } from '@/lib/utils/valuationSummary';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useStockSearchModal } from '@/components/stock-search-provider';

const HeroArt = dynamic(() => import('./HeroArt'), { ssr: false });
const choice = 'service-button group flex min-w-0 flex-col items-center justify-between gap-1 px-2 pb-3 pt-1 text-center font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink';
const choiceArt = 'h-28 w-full object-contain motion-safe:transition-transform motion-safe:group-hover:-translate-y-1 motion-safe:group-active:translate-y-0 motion-safe:group-active:scale-95 sm:h-36';

export default function GuestLanding() {
  const { openSearch } = useStockSearchModal();
  return <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-3 text-neutral-900 dark:text-neutral-100 sm:space-y-8 sm:px-6 sm:py-8">
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-6">
      <section aria-labelledby="home-title" className="relative isolate rounded-2xl bg-[#faf4e9] p-4 dark:bg-[#26221f] sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl [mask-image:linear-gradient(to_bottom,transparent_2.25rem,black_4rem,black_90%,transparent)]">
          <HeroArt />
        </div>
        <h1 id="home-title" className="text-balance break-keep text-center text-2xl font-semibold leading-tight tracking-tight">종목을 어떻게 찾을까요?</h1>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4">
          <button type="button" onClick={openSearch} className={`${choice} bg-[#f8eee8]/80 text-[#563626] hover:bg-[#f3e4db]/90 dark:bg-[#392c2d]/75 dark:text-[#ffe3d3] dark:hover:bg-[#443334]/90`}>
            <Image src="/images/onboarding/search-company.webp" width={480} height={480} alt="" unoptimized loading="eager" className={choiceArt} />
            <span>종목 검색</span>
          </button>
          <Link href="/screener" className={`${choice} bg-[#e7f1eb]/80 text-[#244b3e] hover:bg-[#dcebe3]/90 dark:bg-[#243b31]/75 dark:text-[#d9f4e7] dark:hover:bg-[#2b4239]/90`}>
            <Image src="/images/onboarding/discover-stocks.webp" width={480} height={480} alt="" unoptimized loading="eager" className={choiceArt} />
            <span>종목 발굴</span>
          </Link>
        </div>
      </section>
      <GuestWatchlistSample />
    </div>
    <section aria-label="관심종목 시작하기" className="border-y border-neutral-200 dark:border-surface-dark-border">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          이용 방법 <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
        </summary>
        <p className="pb-3 leading-relaxed text-neutral-600 dark:text-neutral-300">검색과 발굴은 로그인 없이 이용할 수 있습니다. 관심종목을 저장하려면 로그인한 뒤 분석 화면에서 하트를 누르세요.</p>
      </details>
      <Link href="/login?callbackUrl=%2F" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-ink">로그인<ArrowRight size={15} aria-hidden="true" /></Link>
    </section>
    <footer className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">서비스 안내 <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" /></summary>
        <p className="pb-2">이 사이트의 데이터와 분석은 투자 참고용입니다. 투자 결정은 이용자 본인의 책임입니다.</p>
      </details>
      <div className="flex flex-wrap items-center gap-x-5"><span>© 2026 IdiotQuant</span><Link className="inline-flex min-h-11 items-center" href="/terms">이용약관</Link><Link className="inline-flex min-h-11 items-center" href="/privacy">개인정보 처리방침</Link></div>
    </footer>
  </div>;
}

const formatPrice = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

function GuestWatchlistSample() {
    const { data, retry } = useWatchlistSample();
    return <section aria-labelledby="guest-watchlist-title" className="rounded-lg border border-neutral-200 bg-white px-2 py-3 dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2 pb-2">
            <h2 id="guest-watchlist-title" className="text-base font-semibold">관심종목 예시</h2>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">스캔 기준가</span>
        </div>
        <ul className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
            {WATCHLIST_SAMPLE_COMPANIES.map(({ ticker, name }) => {
                const item = data?.items.find(stock => stock.ticker === ticker);
                return <li key={ticker}>
                    <Link href={`/analyze?ticker=${ticker}`} className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded px-2 py-2 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:hover:bg-white/5">
                        <span className="rounded-md bg-white p-1 ring-1 ring-neutral-200 dark:ring-transparent"><StockLogo ticker={ticker} name={name} isUs={false} /></span>
                        <span className="font-medium [overflow-wrap:anywhere]">{name}</span>
                        <span className="inline-flex items-center gap-2 tabular-nums">
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
                    {data.items.length > 0 && <p className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">적정주가는 스캔일 재무 데이터로 계산한 추정치입니다. 차이율은 스캔 기준가 대비입니다.</p>}
                </>}
            </div>
        </details>
    </section>;
}
