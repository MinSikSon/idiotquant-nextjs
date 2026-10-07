"use client";

import Link from "next/link";
import { ArrowRight, Search, SlidersHorizontal, ChartNoAxesCombined } from "lucide-react";
import type { NcavDailyItem } from "@/lib/features/algorithmTrade/algorithmTradeSlice";

type GuestLandingProps = {
  list: NcavDailyItem[];
  totalCount: number;
  isLoading: boolean;
  scanDate: string | null;
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
        ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] bg-[#635bdb] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5148c8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635bdb]"
        : "inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-500 dark:border-neutral-600 dark:bg-[#111a14] dark:text-neutral-100 dark:hover:border-neutral-400"}
    >
      {children}
    </Link>
  );
}

export default function GuestLanding({ list, totalCount, isLoading, scanDate }: GuestLandingProps) {
  const dateLabel = scanDate
    ? `${scanDate.slice(0, 4)}.${scanDate.slice(4, 6)}.${scanDate.slice(6, 8)}`
    : "오늘";
  const preview = list.slice(0, 4);

  return (
    <div id="public-home" className="min-h-screen bg-white text-neutral-900 dark:bg-[#080d0a] dark:text-neutral-100">
      <header className="border-b border-neutral-200/80 bg-white/90 dark:border-neutral-800 dark:bg-[#080d0a]/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
            idiot<span className="text-[#635bdb]">quant</span>
          </Link>
          <nav aria-label="주요 메뉴" className="hidden flex-1 items-center gap-7 text-sm text-neutral-600 dark:text-neutral-300 sm:flex">
            <a href="#features" className="hover:text-neutral-950 dark:hover:text-white">서비스</a>
            <Link href="/screener" className="hover:text-neutral-950 dark:hover:text-white">종목 발굴</Link>
            <Link href="/analyze" className="hover:text-neutral-950 dark:hover:text-white">종목 분석</Link>
            <a href="#faq" className="hover:text-neutral-950 dark:hover:text-white">안내</a>
          </nav>
          <div className="ml-auto flex w-full flex-col gap-2 sm:ml-0 sm:w-auto sm:flex-row sm:items-center">
            <ActionLink href="/login">로그인</ActionLink>
            <ActionLink href="/screener?mincap=500" primary>지금 시작하기</ActionLink>
          </div>
        </div>
      </header>

      <div>
        <section className="relative overflow-hidden border-b border-neutral-200 dark:border-neutral-800">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_76%_0%,rgba(126,160,255,0.3),transparent_37%),radial-gradient(ellipse_at_88%_38%,rgba(201,155,255,0.22),transparent_38%),radial-gradient(ellipse_at_58%_92%,rgba(255,208,164,0.16),transparent_35%)] dark:opacity-50" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:px-10 lg:py-24">
            <div>
              <p className="mb-5 text-sm font-semibold text-[#5148c8] dark:text-[#aaa4ff]">코스피·코스닥 종목 발굴과 분석</p>
              <h1 className="max-w-2xl text-4xl font-semibold leading-[1.12] tracking-[-0.045em] sm:text-5xl lg:text-[3.65rem]">
                좋은 회사를 찾고,<br />
                <span className="text-[#5148c8] dark:text-[#aaa4ff]">더 깊이 살펴보세요.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:text-lg sm:leading-8">
                매일 재무 기준으로 종목을 찾고, 핵심 숫자와 기업 가치를 한곳에서 비교할 수 있습니다.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ActionLink href="/screener?mincap=500" primary>
                  오늘의 발굴 종목 보기 <ArrowRight size={16} aria-hidden="true" />
                </ActionLink>
                <ActionLink href="/login">계정 만들기</ActionLink>
              </div>
              <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">종목 발굴과 분석은 로그인 없이 둘러볼 수 있습니다.</p>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
              <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-[#b7c9ff]/60 via-[#e5d6ff]/60 to-[#ffe4d2]/60 blur-2xl dark:opacity-30" />
              <section aria-label="오늘의 종목 미리보기" className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(36,40,72,0.14)] dark:border-neutral-700 dark:bg-[#111a14]">
                <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
                  <div>
                    <p className="text-sm font-semibold">오늘의 발굴 종목</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{dateLabel} 기준</p>
                  </div>
                  <span className="rounded-[3px] bg-[#efefff] px-2 py-1 text-xs font-semibold text-[#5148c8] dark:bg-[#282544] dark:text-[#c6c1ff]">{totalCount.toLocaleString()}개</span>
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
                <Link href="/screener?mincap=500" className="flex min-h-12 items-center justify-between border-t border-neutral-200 px-5 text-sm font-semibold text-[#5148c8] hover:bg-neutral-50 dark:border-neutral-700 dark:text-[#aaa4ff] dark:hover:bg-neutral-800/50">
                  발굴 결과 전체 보기 <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </section>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#5148c8] dark:text-[#aaa4ff]">발굴부터 분석까지</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">투자에 필요한 정보를 한곳에서</h2>
            <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">관심 있는 기준으로 찾고, 여러 지표를 비교하고, 회사별 분석 근거를 확인하세요.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <article className="rounded-md border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-[#101812]">
              <SlidersHorizontal size={19} className="text-[#635bdb] dark:text-[#aaa4ff]" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold">기준으로 종목 찾기</h3>
              <p className="mt-2 min-h-[3.5rem] text-sm leading-6 text-neutral-600 dark:text-neutral-300">NCAV, 저PBR, 저PER 등 다양한 기준으로 회사를 찾아보세요.</p>
              <Link className="mt-5 inline-flex min-h-11 w-full items-center justify-between rounded-[4px] border border-neutral-300 px-3 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800/50 sm:w-auto sm:justify-center sm:gap-2" href="/screener">발굴 기준 보기 <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
            <article className="rounded-md border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-[#101812]">
              <Search size={19} className="text-[#635bdb] dark:text-[#aaa4ff]" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold">핵심 숫자 비교하기</h3>
              <p className="mt-2 min-h-[3.5rem] text-sm leading-6 text-neutral-600 dark:text-neutral-300">PER, PBR, 재무 정보를 나란히 비교해 후보를 좁혀보세요.</p>
              <Link className="mt-5 inline-flex min-h-11 w-full items-center justify-between rounded-[4px] border border-neutral-300 px-3 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800/50 sm:w-auto sm:justify-center sm:gap-2" href="/screener">종목 비교하기 <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
            <article className="rounded-md border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-[#101812]">
              <ChartNoAxesCombined size={19} className="text-[#635bdb] dark:text-[#aaa4ff]" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold">기업 가치 살펴보기</h3>
              <p className="mt-2 min-h-[3.5rem] text-sm leading-6 text-neutral-600 dark:text-neutral-300">여러 평가 방법으로 계산한 가치와 계산 근거를 확인하세요.</p>
              <Link className="mt-5 inline-flex min-h-11 w-full items-center justify-between rounded-[4px] border border-neutral-300 px-3 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800/50 sm:w-auto sm:justify-center sm:gap-2" href="/analyze">종목 분석하기 <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
          </div>
        </section>

        <section id="today" className="border-y border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-[#0d130f]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#5148c8] dark:text-[#aaa4ff]">{dateLabel} 업데이트</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">오늘 찾은 회사</h2>
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">조건에 맞는 종목 {totalCount.toLocaleString()}개</p>
              </div>
              <Link href="/screener?mincap=500" className="hidden min-h-11 items-center gap-2 rounded-[4px] border border-neutral-300 bg-white px-4 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-600 dark:bg-[#111a14] dark:hover:bg-neutral-800/50 sm:inline-flex">전체 결과 보기 <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
            <div className="mt-7 overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-[#101812]">
              <div className="grid grid-cols-[1.5fr_.7fr_.7fr] gap-3 border-b border-neutral-200 px-4 py-3 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400 sm:px-6"><span>회사</span><span>PER</span><span>PBR</span></div>
              {preview.map((item) => (
                <div key={item.ticker} className="grid grid-cols-[1.5fr_.7fr_.7fr] items-center gap-3 border-b border-neutral-100 px-4 py-4 text-sm last:border-0 dark:border-neutral-800 sm:px-6">
                  <div className="min-w-0"><p className="truncate font-semibold">{item.name}</p><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{item.ticker}</p></div>
                  <span className="tabular-nums">{item.per > 0 ? item.per.toFixed(1) : "—"}</span>
                  <span className="tabular-nums">{item.pbr > 0 ? item.pbr.toFixed(2) : "—"}</span>
                </div>
              ))}
              {!isLoading && preview.length === 0 && <p className="px-4 py-8 text-sm text-neutral-500 dark:text-neutral-400">현재 표시할 종목이 없습니다.</p>}
            </div>
            <Link href="/screener?mincap=500" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[4px] border border-neutral-300 bg-white px-4 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-600 dark:bg-[#111a14] dark:hover:bg-neutral-800/50 sm:hidden">전체 결과 보기 <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold text-[#5148c8] dark:text-[#aaa4ff]">궁금한 점</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">처음이라면</h2>
            </div>
            <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              <details className="group py-5" open><summary className="cursor-pointer list-none pr-6 text-base font-semibold">무엇을 하는 서비스인가요?<span className="float-right text-[#635bdb] group-open:rotate-45">＋</span></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">재무 기준으로 종목을 찾고, 회사별 숫자와 가치 평가를 살펴볼 수 있습니다.</p></details>
              <details className="group py-5"><summary className="cursor-pointer list-none pr-6 text-base font-semibold">발굴 결과는 매수 추천인가요?<span className="float-right text-[#635bdb] group-open:rotate-45">＋</span></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">아닙니다. 투자 판단을 위한 참고 정보이며 수익을 보장하지 않습니다.</p></details>
              <details className="group py-5"><summary className="cursor-pointer list-none pr-6 text-base font-semibold">로그인하면 무엇이 달라지나요?<span className="float-right text-[#635bdb] group-open:rotate-45">＋</span></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">관심 종목과 포트폴리오를 저장하고 이어서 관리할 수 있습니다.</p></details>
            </div>
          </div>
        </section>

        <section className="border-t border-neutral-200 bg-[#f5f4ff] dark:border-neutral-800 dark:bg-[#17152a]">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
            <div><h2 className="text-2xl font-semibold tracking-[-0.04em]">오늘의 종목부터 살펴보세요.</h2><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">마음에 드는 회사를 찾고, 분석을 이어가세요.</p></div>
            <ActionLink href="/screener?mincap=500" primary>종목 찾기 <ArrowRight size={16} aria-hidden="true" /></ActionLink>
          </div>
        </section>
      </div>

      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-neutral-500 dark:text-neutral-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>© 2026 IdiotQuant</span>
          <span>본 서비스는 투자 참고 정보이며 투자 판단과 결과는 이용자에게 있습니다.</span>
        </div>
      </footer>
    </div>
  );
}
