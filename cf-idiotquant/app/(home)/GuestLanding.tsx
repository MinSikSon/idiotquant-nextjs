"use client";

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ChevronDown } from 'lucide-react';
import GuestWatchlist from './GuestWatchlist';
import { useStockSearchModal } from '@/components/stock-search-provider';

const HeroArt = dynamic(() => import('./HeroArt'), { ssr: false });
const choice = 'service-button group flex min-w-0 flex-col items-center justify-between gap-1 px-2 pb-3 pt-1 text-center font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink md:flex-row md:justify-center md:px-3 md:py-2 md:text-left';
const choiceArt = 'h-24 w-full object-contain motion-safe:transition-transform motion-safe:group-hover:-translate-y-1 motion-safe:group-active:translate-y-0 motion-safe:group-active:scale-95 md:h-20 md:w-20';
const choiceDescription = 'hidden break-keep text-sm font-normal leading-snug md:block';

export default function GuestLanding() {
  const { openSearch } = useStockSearchModal();
  return <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-3 text-neutral-900 dark:text-neutral-100 sm:space-y-8 sm:px-6 sm:py-8">
    <section aria-labelledby="home-title" className="relative isolate rounded-2xl bg-[#faf4e9] p-4 dark:bg-[#26221f] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)] md:items-center md:gap-5 md:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl [mask-image:linear-gradient(to_bottom,transparent_2.25rem,black_4rem,black_90%,transparent)]">
        <HeroArt />
      </div>
      <h1 id="home-title" className="text-balance break-keep text-center text-2xl font-semibold leading-tight tracking-tight">종목을 어떻게 찾을까요?</h1>
      <div className="mt-3 grid grid-cols-2 gap-3 md:mt-0 md:gap-4">
        <button type="button" onClick={openSearch} className={`${choice} bg-[#f8eee8]/80 text-[#563626] hover:bg-[#f3e4db]/90 dark:bg-[#392c2d]/75 dark:text-[#ffe3d3] dark:hover:bg-[#443334]/90`}>
          <Image src="/images/onboarding/search-company.webp" width={480} height={480} alt="" unoptimized loading="eager" className={choiceArt} />
          <span>종목 검색<span className={choiceDescription}>이름이나 티커로 찾기</span></span>
        </button>
        <Link href="/screener" className={`${choice} bg-[#e7f1eb]/80 text-[#244b3e] hover:bg-[#dcebe3]/90 dark:bg-[#243b31]/75 dark:text-[#d9f4e7] dark:hover:bg-[#2b4239]/90`}>
          <Image src="/images/onboarding/discover-stocks.webp" width={480} height={480} alt="" unoptimized loading="eager" className={choiceArt} />
          <span>종목 발굴<span className={choiceDescription}>재무 조건으로 찾아보기</span></span>
        </Link>
      </div>
    </section>
    <GuestWatchlist />
    <div className="border-y border-neutral-200 dark:border-surface-dark-border">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          이용 방법 <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
        </summary>
        <p className="pb-3 leading-relaxed text-neutral-600 dark:text-neutral-300">검색과 발굴은 로그인 없이 이용할 수 있습니다. 관심종목을 저장하려면 로그인한 뒤 분석 화면에서 하트를 누르세요.</p>
      </details>
    </div>
    <footer className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">서비스 안내 <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" /></summary>
        <p className="pb-2">이 사이트의 데이터와 분석은 투자 참고용입니다. 투자 결정은 이용자 본인의 책임입니다.</p>
      </details>
      <div className="flex flex-wrap items-center gap-x-5"><span>© 2026 IdiotQuant</span><Link className="inline-flex min-h-11 items-center" href="/terms">이용약관</Link><Link className="inline-flex min-h-11 items-center" href="/privacy">개인정보 처리방침</Link></div>
    </footer>
  </div>;
}
