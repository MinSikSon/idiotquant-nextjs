"use client";

import { useTranslations } from "next-intl";
import Link from 'next/link';
import Image from 'next/image';
import HeroCoinRain from '@/components/hero-coin-rain';
import { ChevronDown } from 'lucide-react';
import GuestWatchlist from './GuestWatchlist';
import { useStockSearchModal } from '@/components/stock-search-provider';

const choice = 'service-button group flex min-w-0 flex-col items-center justify-between gap-1 px-2 pb-3 pt-1 text-center font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink md:flex-row md:justify-center md:px-3 md:py-2 md:text-left';
const choiceArt = 'h-24 w-full object-contain motion-safe:transition-transform motion-safe:group-hover:-translate-y-1 motion-safe:group-active:translate-y-0 motion-safe:group-active:scale-95 md:h-20 md:w-20';
const choiceDescription = 'hidden break-keep text-sm font-normal leading-snug md:block';

export default function GuestLanding() {
  const t = useTranslations("home");
  const { openSearch } = useStockSearchModal();
  return <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-3 text-neutral-900 dark:text-neutral-100 sm:space-y-8 sm:px-6 sm:py-8">
    <section aria-labelledby="home-title" className="relative isolate rounded-2xl bg-[#faf4e9] p-4 dark:bg-[#26221f] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)] md:items-center md:gap-5 md:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl [mask-image:linear-gradient(to_bottom,transparent_2.25rem,black_4rem,black_90%,transparent)]">
        <HeroCoinRain />
      </div>
      <h1 id="home-title" className="text-balance break-keep text-center text-2xl font-semibold leading-tight tracking-tight">{t("heading")}</h1>
      <div className="mt-3 grid grid-cols-2 gap-3 md:mt-0 md:gap-4">
        <button type="button" onClick={openSearch} className={`${choice} bg-[#f8eee8]/80 text-[#563626] hover:bg-[#f3e4db]/90 dark:bg-[#392c2d]/75 dark:text-[#ffe3d3] dark:hover:bg-[#443334]/90`}>
          <Image src="/images/onboarding/search-company.webp" width={480} height={480} alt="" unoptimized loading="eager" className={choiceArt} />
          <span>{t("search")}<span className={choiceDescription}>{t("searchHint")}</span></span>
        </button>
        <Link href="/screener" className={`${choice} bg-[#e7f1eb]/80 text-[#244b3e] hover:bg-[#dcebe3]/90 dark:bg-[#243b31]/75 dark:text-[#d9f4e7] dark:hover:bg-[#2b4239]/90`}>
          <Image src="/images/onboarding/discover-stocks.webp" width={480} height={480} alt="" unoptimized loading="eager" className={choiceArt} />
          <span>{t("discover")}<span className={choiceDescription}>{t("discoverHint")}</span></span>
        </Link>
      </div>
    </section>
    <GuestWatchlist />
    <div className="border-y border-neutral-200 dark:border-surface-dark-border">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          {t("guide")} <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
        </summary>
        <p className="pb-3 leading-relaxed text-neutral-600 dark:text-neutral-300">{t("guideBody")}</p>
      </details>
    </div>
    <footer className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">{t("service")} <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" /></summary>
        <p className="pb-2">{t("disclaimer")}</p>
      </details>
      <div className="flex flex-wrap items-center gap-x-5"><span>© 2026 IdiotQuant</span><Link className="inline-flex min-h-11 items-center" href="/terms">{t("terms")}</Link><Link className="inline-flex min-h-11 items-center" href="/privacy">{t("privacy")}</Link></div>
    </footer>
  </div>;
}
