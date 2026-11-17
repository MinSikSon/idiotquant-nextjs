"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { WatchlistSample } from '@/components/home-watchlist';
import { ArrowRight, Heart, Search } from 'lucide-react';
import { useStockSearchModal } from '@/components/stock-search-provider';
import styles from './home.module.css';

const HeroArt = dynamic(() => import('./HeroArt'), { ssr: false });

export default function GuestLanding() {
  const { openSearch } = useStockSearchModal();
  return <div className="mx-auto w-full max-w-3xl px-4 py-10 text-neutral-900 dark:text-neutral-100 sm:px-6 sm:py-20">
    <section aria-labelledby="home-title" className="relative isolate">
      <div className={styles.heroArt} aria-hidden="true"><HeroArt /></div>
      <h1 id="home-title" className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">내 관심종목,<br />가격과 적정주가를 한눈에</h1>
      <p className="mt-5 max-w-lg text-sm leading-7 text-neutral-600 dark:text-neutral-300">관심종목을 담고 가격과 전략별 적정주가를 함께 살펴보세요.<br className="hidden sm:block" />궁금한 종목은 분석 화면에서 자세히 확인할 수 있습니다.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={openSearch} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover"><Search size={17} aria-hidden="true" />종목 검색</button>
        <Link href="/screener" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-neutral-300 px-5 text-sm font-medium dark:border-neutral-700">종목 발굴<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <p className="mt-3 text-xs text-neutral-500">검색과 발굴은 가입 없이 시작할 수 있습니다.</p>
    </section>
    <div className="mt-8"><WatchlistSample /></div>
    <section aria-labelledby="save-title" className="mt-12 rounded-[var(--radius-panel)] border border-neutral-200 bg-white p-5 dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-6">
      <h2 id="save-title" className="flex items-center gap-2 font-semibold"><Heart size={18} aria-hidden="true" />내 관심종목으로 시작하세요</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">분석 화면에서 하트를 눌러 저장하세요. 로그인하면 휴대폰과 PC에서 같은 관심종목을 볼 수 있습니다.</p>
      <Link href="/login?callbackUrl=%2F" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-ink">로그인하고 시작<ArrowRight size={15} aria-hidden="true" /></Link>
    </section>
    <footer className="mt-12 space-y-3 text-xs leading-5 text-neutral-500">
      <p>본 서비스는 투자 참고 정보이며 투자 판단과 결과는 이용자에게 있습니다.</p>
      <div className="flex flex-wrap gap-5"><span>© 2026 IdiotQuant</span><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보 처리방침</Link></div>
    </footer>
  </div>;
}
