"use client";

import { useTranslations } from "next-intl";
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import paper from '@/app/(profile)/newsletter/newsletter.module.css';
import styles from './home.module.css';
import { NewsletterEntry } from '@/components/newsletter-entry';
import { useStockSearchModal } from '@/components/stock-search-provider';

const HeroCoinRain = dynamic(() => import('@/components/hero-coin-rain'), { ssr: false });
const choice = 'group flex min-h-20 min-w-0 items-center justify-between gap-2 px-4 py-3 text-left md:justify-center md:px-3 md:py-2';
const choiceArt = 'hidden h-20 w-20 shrink-0 object-contain motion-safe:transition-transform motion-safe:group-hover:-translate-y-1 md:block';
const choiceDescription = 'mt-0.5 block break-keep text-sm font-normal leading-snug text-[var(--newsletter-muted)] md:mt-0 md:text-current';

export default function HomeLanding({ children }: { children: ReactNode }) {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const { openSearch } = useStockSearchModal();
  return <div className={paper.homePaper}>
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-3 sm:space-y-8 sm:px-6 sm:py-8">
      <NewsletterEntry label={t("newsletter")} description={t("newsletterHint")} />
      <section aria-labelledby="home-title" className="relative isolate -mx-4 border-y border-[var(--newsletter-line)] px-4 pb-5 pt-5 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)] md:items-center md:gap-5 md:rounded-xl md:border md:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden rounded-2xl [mask-image:linear-gradient(to_bottom,transparent_2.25rem,black_4rem,black_90%,transparent)] md:block">
          <HeroCoinRain />
        </div>
        <div className="relative flex min-h-24 items-center pb-3 pr-24 md:block md:min-h-0 md:p-0">
          <h1 id="home-title" className="text-balance break-keep text-2xl font-bold leading-tight tracking-tight md:text-center">{t("heading")}</h1>
          <Image src="/images/onboarding/discover-stocks.webp" width={480} height={480} alt="" unoptimized className="pointer-events-none absolute bottom-0 right-0 size-24 object-contain md:hidden" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {[
            { title: t("search"), hint: t("searchHint"), art: "search-company" },
            { title: t("discover"), hint: t("discoverHint"), art: "discover-stocks", href: "/screener" },
            { title: nav("analyzeStocks"), hint: t("analyzeHint"), href: "/analyze", style: "md:hidden" },
            { title: nav("compare"), hint: t("compareHint"), href: "/compare", style: "md:hidden" },
          ].map(({ title, hint, art, href, style }) => {
            const content = <>
              {art && <Image src={`/images/onboarding/${art}.webp`} width={480} height={480} alt="" unoptimized loading="eager" className={choiceArt} />}
              <span className="min-w-0 break-keep text-lg font-semibold leading-tight md:text-base">
                {title}<span className={choiceDescription}>{hint}</span>
              </span>
              <span aria-hidden="true" className="grid min-h-11 shrink-0 place-items-center rounded-lg bg-[var(--newsletter-gold)] px-3 text-sm font-semibold text-[var(--newsletter-gold-ink)] group-active:opacity-80 md:hidden">{t("openService")}</span>
            </>;
            return href
              ? <Link key={href} href={href} className={`${choice} ${styles.paperChoice} ${style ?? ""}`}>{content}</Link>
              : <button key="search" type="button" onClick={openSearch} className={`${choice} ${styles.paperChoice} ${style ?? ""}`}>{content}</button>;
          })}
        </div>
      </section>
      {children}
      <div className="border-y border-[var(--newsletter-line)]">
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            {t("guide")} <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
          </summary>
          <p className="pb-3 leading-relaxed text-[var(--newsletter-muted)]">{t("guideBody")}</p>
        </details>
      </div>
      <footer className="text-xs leading-5 text-[var(--newsletter-muted)]">
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">{t("service")} <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" /></summary>
          <p className="pb-2">{t("disclaimer")}</p>
        </details>
        <div className="flex flex-wrap items-center gap-x-5"><span>© 2026 IdiotQuant</span><Link className="inline-flex min-h-11 items-center" href="/terms">{t("terms")}</Link><Link className="inline-flex min-h-11 items-center" href="/privacy">{t("privacy")}</Link></div>
      </footer>
    </div>
  </div>;
}
