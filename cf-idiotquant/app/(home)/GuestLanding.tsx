"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Search, SlidersHorizontal, ChartNoAxesCombined } from "lucide-react";
import type { NcavDailyItem } from "@/lib/features/algorithmTrade/algorithmTradeSlice";

type GuestLandingProps = {
  list: NcavDailyItem[];
  totalCount: number;
  isLoading: boolean;
  scanDate: string | null;
  backgroundArt: ReactNode;
  isLoggedIn?: boolean;
};

const formatPrice = (value: number) =>
  value > 0 ? `₩${Math.round(value).toLocaleString("ko-KR")}` : "—";

function ActionLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={primary
        ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635bdb]"
        : "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-500 dark:border-neutral-600 dark:bg-surface-dark-card dark:text-neutral-100 dark:hover:border-neutral-400"}
    >
      {children}
    </Link>
  );
}

export default function GuestLanding({ list, totalCount, isLoading, scanDate, backgroundArt, isLoggedIn = false }: GuestLandingProps) {
  const dateLabel = scanDate
    ? `${scanDate.slice(0, 4)}.${scanDate.slice(4, 6)}.${scanDate.slice(6, 8)}`
    : "오늘";
  const preview = list.slice(0, 4);

  return (
    <div id="public-home" className="relative min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas text-neutral-900 dark:text-neutral-100">
      <div className="relative z-10">

      <div>
        <section className="relative overflow-hidden border-b border-neutral-200 dark:border-neutral-800">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-60 [mask-image:linear-gradient(to_right,transparent,black_60%)]">
            {backgroundArt}
          </div>
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-2 lg:gap-14 lg:px-10 lg:py-16">
            <div>
              <p className="mb-5 text-sm font-semibold text-brand-ink dark:text-brand-ink">코스피·코스닥 종목 발굴과 분석</p>
              <h1 className="max-w-2xl text-3xl font-medium leading-[1.3] tracking-[-0.035em] sm:text-4xl">
                좋은 회사를 찾고,<br />
                <span className="text-neutral-900 dark:text-neutral-100">더 깊이 살펴보세요.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:text-lg sm:leading-8">
                매일 재무 기준으로 종목을 찾고, 핵심 숫자와 기업 가치를 한곳에서 비교할 수 있습니다.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <ActionLink href="/screener?mincap=500" primary>
                  오늘의 발굴 종목 보기 <ArrowRight size={16} aria-hidden="true" />
                </ActionLink>
                {!isLoggedIn && <Link href="/login" className="inline-flex min-h-11 items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">로그인 <ArrowRight size={14} aria-hidden="true" /></Link>}
              </div>
              {!isLoggedIn && <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">종목 발굴과 분석은 로그인 없이 둘러볼 수 있습니다.</p>}
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
              <section aria-label="오늘의 종목 미리보기" className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-surface-dark-card">
                <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
                  <div>
                    <p className="text-sm font-semibold">오늘의 발굴 종목</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{dateLabel} 기준</p>
                  </div>
                  <span className="rounded-[3px] bg-brand-light px-2 py-1 text-xs font-semibold text-brand-ink dark:bg-brand-muted dark:text-brand-ink-hover">{totalCount.toLocaleString()}개</span>
                </div>
                <div className="grid grid-cols-[1.5fr_.7fr_.7fr] gap-3 border-b border-neutral-200 px-5 py-2.5 text-[11px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                  <span>회사</span><span>PER</span><span>PBR</span>
                </div>
                {isLoading && preview.length === 0 ? (
                  <div className="space-y-3 px-5 py-6" aria-live="polite">
                    <div className="h-4 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                    <div className="h-4 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                    <div className="h-4 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                  </div>
                ) : preview.length ? preview.map((item) => (
                  <div key={item.ticker} className="grid grid-cols-[1.5fr_.7fr_.7fr] items-center gap-3 border-b border-neutral-100 px-5 py-3.5 text-sm last:border-0 dark:border-neutral-800">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.name}</p>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{item.ticker} · {formatPrice(item.last_price)}</p>
                    </div>
                    <span className="tabular-nums">{item.per > 0 ? item.per.toFixed(1) : "—"}</span>
                    <span className="tabular-nums">{item.pbr > 0 ? item.pbr.toFixed(2) : "—"}</span>
                  </div>
                )) : (
                  <p className="px-5 py-6 text-sm text-neutral-500 dark:text-neutral-400">현재 표시할 발굴 종목이 없습니다.</p>
                )}
                <Link href="/screener?mincap=500" className="flex min-h-12 items-center justify-between border-t border-neutral-200 px-5 text-sm font-semibold text-brand-ink hover:bg-neutral-50 dark:border-neutral-700 dark:text-brand-ink dark:hover:bg-neutral-800/50">
                  발굴 결과 전체 보기 <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </section>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand-ink dark:text-brand-ink">발굴부터 분석까지</p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight">투자에 필요한 정보를 한곳에서</h2>
            <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">관심 있는 기준으로 찾고, 여러 지표를 비교하고, 회사별 분석 근거를 확인하세요.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <article className="border-t border-neutral-200 py-6 dark:border-neutral-700">
              <SlidersHorizontal size={19} className="text-brand-ink dark:text-brand-ink" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold">기준으로 종목 찾기</h3>
              <p className="mt-2 min-h-[3.5rem] text-sm leading-6 text-neutral-600 dark:text-neutral-300">NCAV, 저PBR, 저PER 등 다양한 기준으로 회사를 찾아보세요.</p>
              <Link className="mt-5 inline-flex min-h-11 w-full items-center justify-between rounded-xl border border-neutral-300 px-3 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800/50 sm:w-auto sm:justify-center sm:gap-2" href="/screener">발굴 기준 보기 <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
            <article className="border-t border-neutral-200 py-6 dark:border-neutral-700">
              <Search size={19} className="text-brand-ink dark:text-brand-ink" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold">핵심 숫자 비교하기</h3>
              <p className="mt-2 min-h-[3.5rem] text-sm leading-6 text-neutral-600 dark:text-neutral-300">PER, PBR, 재무 정보를 나란히 비교해 후보를 좁혀보세요.</p>
              <Link className="mt-5 inline-flex min-h-11 w-full items-center justify-between rounded-xl border border-neutral-300 px-3 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800/50 sm:w-auto sm:justify-center sm:gap-2" href="/compare">종목 비교하기 <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
            <article className="border-t border-neutral-200 py-6 dark:border-neutral-700">
              <ChartNoAxesCombined size={19} className="text-brand-ink dark:text-brand-ink" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold">기업 가치 살펴보기</h3>
              <p className="mt-2 min-h-[3.5rem] text-sm leading-6 text-neutral-600 dark:text-neutral-300">여러 평가 방법으로 계산한 가치와 계산 근거를 확인하세요.</p>
              <Link className="mt-5 inline-flex min-h-11 w-full items-center justify-between rounded-xl border border-neutral-300 px-3 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800/50 sm:w-auto sm:justify-center sm:gap-2" href="/analyze">종목 분석하기 <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold text-brand-ink dark:text-brand-ink">궁금한 점</p>
              <h2 className="mt-3 text-2xl font-medium tracking-tight">처음이라면</h2>
            </div>
            <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              <details className="group py-5" open><summary className="cursor-pointer list-none pr-6 text-base font-semibold">무엇을 하는 서비스인가요?<span className="float-right text-brand-ink group-open:rotate-45">＋</span></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">재무 기준으로 종목을 찾고, 회사별 숫자와 가치 평가를 살펴볼 수 있습니다.</p></details>
              <details className="group py-5"><summary className="cursor-pointer list-none pr-6 text-base font-semibold">발굴 결과는 매수 추천인가요?<span className="float-right text-brand-ink group-open:rotate-45">＋</span></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">아닙니다. 투자 판단을 위한 참고 정보이며 수익을 보장하지 않습니다.</p></details>
              <details className="group py-5"><summary className="cursor-pointer list-none pr-6 text-base font-semibold">로그인하면 무엇이 달라지나요?<span className="float-right text-brand-ink group-open:rotate-45">＋</span></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">관심 종목과 포트폴리오를 저장하고 이어서 관리할 수 있습니다.</p></details>
            </div>
          </div>
        </section>

      </div>

      <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-surface-dark-canvas">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-neutral-500 dark:text-neutral-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>© 2026 IdiotQuant</span>
          <span>본 서비스는 투자 참고 정보이며 투자 판단과 결과는 이용자에게 있습니다.</span>
        </div>
      </footer>
      </div>
    </div>
  );
}
