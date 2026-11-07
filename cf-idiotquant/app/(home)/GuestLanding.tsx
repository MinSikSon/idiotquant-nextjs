"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { HOME_FAQ } from "@/lib/seo-content";
import { ArrowRight, Search, SlidersHorizontal, ChartNoAxesCombined, GitCompareArrows, ArrowUpRight } from "lucide-react";
import type { NcavDailyItem } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import styles from "./home.module.css";
import { matchesGuestPer } from "@/lib/utils/guestStocks";
import { HOME_STOCK_FILTERS, LARGE_CAP_EXAMPLES, homeStockPreview, type HomeStockFilter } from "@/lib/utils/homeStockPreview";

type GuestLandingProps = {
  list: NcavDailyItem[];
  totalCount: number;
  isLoading: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  scanDate: string | null;
  backgroundArt: ReactNode;
  isLoggedIn?: boolean;
  refreshStatus?: ReactNode;
};

const formatPrice = (value: number) =>
  value > 0 ? `₩${Math.round(value).toLocaleString("ko-KR")}` : "—";

const tools = [
  { href: "/screener", icon: SlidersHorizontal, number: "01", title: "기준으로 발굴", description: "NCAV, 저PBR, 저PER. 숫자로 후보를 좁혀보세요.", action: "종목 발굴" },
  { href: "/analyze", icon: ChartNoAxesCombined, number: "02", title: "근거까지 분석", description: "발굴한 종목을 눌러 지표와 기업 가치를 확인하세요. 상세 재무·위험도는 로그인 후 볼 수 있습니다.", action: "종목 분석" },
  { href: "/compare", icon: GitCompareArrows, number: "03", title: "나란히 비교", description: "날짜를 먼저 추가한 뒤 후보 종목을 검색해 담으세요. 날짜별 종가·변화율과 현재 지표를 비교합니다.", action: "종목 비교" },
];

export default function GuestLanding({ list, totalCount, isLoading, scanDate, backgroundArt, isLoggedIn = false, refreshStatus, hasError = false, onRetry }: GuestLandingProps) {
  const dateLabel = scanDate
    ? `${scanDate.slice(0, 4)}.${scanDate.slice(4, 6)}.${scanDate.slice(6, 8)}`
    : "최신 데이터";
  const [filter, setFilter] = useState<HomeStockFilter>("per20");
  const [exampleMarket, setExampleMarket] = useState<"KR" | "US">("KR");
  const selectedFilter = HOME_STOCK_FILTERS.find(item => item.id === filter)!;
  const sampleCount = list.filter(matchesGuestPer).length;
  const preview = homeStockPreview(list, filter);
  const resultsHref = `/screener?maxper=${filter === "per10" ? 10 : 20}${filter === "low_pbr" || filter === "ncav" ? `&strategies=${filter}` : ""}`;

  return (
    <div id="public-home" className={styles.home}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroArt} aria-hidden="true">{backgroundArt}</div>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}><span className={styles.marker} /> 숫자로 시작하는 가치투자</p>
            <h1>더 적은 탐색.<br /><span>더 깊은 확신.</span></h1>
            <p className={styles.intro}>좋은 회사를 찾는 일에 집중하세요.<br />종목 발굴부터 비교, 기업 가치 분석까지<br className={styles.desktopBreak} /> 필요한 숫자를 한곳에 모았습니다.</p>
            <div className={styles.actions}>
              <Link href="/screener?mincap=500" className={styles.primary}>오늘의 종목 발굴 <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="/analyze" className={styles.secondary}><Search size={16} aria-hidden="true" /> 종목 분석하기</Link>
            </div>
            <p className={styles.note}>{isLoggedIn ? "발굴 → 분석 → 비교, 나만의 기준으로 이어가세요." : "가입 없이 발굴 미리보기·기본 분석을 이용하세요. 전체 목록·고급 필터·상세 분석은 로그인 후 제공됩니다."}</p>
          </div>

          <section aria-labelledby="preview-title" className={styles.preview}>
            <div className={styles.previewTop}><span className={styles.eyebrow}>Discovery</span><span className={styles.date}>{dateLabel}</span></div>
            <div className={styles.previewTitle}><h2 id="preview-title">오늘의 발굴 종목</h2><span className={styles.count}>{isLoading ? "조회 중" : hasError ? "조회 실패" : `수집 ${totalCount.toLocaleString()}개`}</span></div>
            <div className={styles.previewFilters} role="group" aria-label="미리보기 조건">
              {HOME_STOCK_FILTERS.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
            </div>
            <p className={styles.previewDescription}>PER 20 이하 미리보기 {sampleCount}개 중, {selectedFilter.description}인 종목을 최대 5개 표시합니다. 종목을 누르면 분석으로 이동합니다.</p>
            {hasError && <div role="alert" className="mx-4 my-3 rounded-lg border border-amber-300/50 p-3 text-sm">
              <p>{preview.length ? "새 데이터를 불러오지 못했습니다. 이전 조회 결과를 표시합니다." : "발굴 종목을 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요."}</p>
              <button type="button" onClick={onRetry} disabled={isLoading} className="mt-2 min-h-11 font-semibold underline underline-offset-4">다시 불러오기</button>
            </div>}
            {refreshStatus}
            <div className={styles.table} aria-live="polite" aria-busy={isLoading}>
              <div className={styles.tableHead}><span>종목 / 현재가</span><span>PER <small>배</small></span><span>PBR <small>배</small></span><span /></div>
              {isLoading && !preview.length ? (
                <div role="status" aria-label="발굴 종목을 불러오는 중" className={styles.skeletons}>{[0, 1, 2, 3, 4].map(i => <div key={i} className={styles.skeleton} />)}</div>
              ) : preview.length ? preview.map((item) => (
                <Link href={`/analyze?ticker=${encodeURIComponent(item.ticker)}`} key={item.ticker} className={styles.stockRow} aria-label={`${item.name} 종목 분석`}>
                  <div className={styles.company}><strong>{item.name}</strong><span>{item.ticker} <span aria-hidden="true">·</span> {formatPrice(item.last_price)}</span></div>
                  <span className={styles.metric}>{item.per > 0 ? item.per.toFixed(1) : "—"}</span>
                  <span className={styles.metric}>{item.pbr > 0 ? item.pbr.toFixed(2) : "—"}</span>
                  <ArrowUpRight size={14} aria-hidden="true" className={styles.rowArrow} />
                </Link>
              )) : !hasError && <div className={styles.empty}><SlidersHorizontal size={24} aria-hidden="true" /><p>이 미리보기 안에는 선택한 조건에 맞는 종목이 없습니다.</p><Link href="/screener">발굴 기준 살펴보기 <ArrowRight size={14} aria-hidden="true" /></Link></div>}
            </div>
            <section className={styles.stockExamples} aria-labelledby="stock-examples-title">
              <h3 id="stock-examples-title">대형주로 분석 시작하기</h3>
              <p>익숙한 국내·미국 기업부터 살펴보세요.</p>
              <div className={styles.previewFilters} role="group" aria-label="대형주 예시 시장">
                {(["KR", "US"] as const).map(market => <button key={market} type="button" aria-pressed={exampleMarket === market} onClick={() => setExampleMarket(market)}>{market === "KR" ? "국내 주식" : "미국 주식"}</button>)}
              </div>
              <div className={styles.exampleLinks} aria-live="polite">
                {LARGE_CAP_EXAMPLES[exampleMarket].map(item => <Link key={item.ticker} href={`/analyze?ticker=${item.ticker}`} aria-label={`${item.name} 종목 분석`}>{item.name}<ArrowUpRight size={13} aria-hidden="true" /></Link>)}
              </div>
            </section>
            <Link href={resultsHref} className={styles.previewFooter}>{isLoggedIn ? "발굴 결과 전체 보기" : "발굴 종목 더 살펴보기"} <ArrowRight size={15} aria-hidden="true" /></Link>
          </section>
        </section>

        <section id="features" className={styles.features} aria-labelledby="tools-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Your workflow</p><h2 id="tools-title">생각의 흐름을 끊지 않도록.</h2></div><p>찾고, 이해하고, 비교하세요.</p></div>
          <div className={styles.toolGrid}>{tools.map(({ href, icon: Icon, number, title, description, action }) => (
            <Link href={href} key={href} className={styles.tool} aria-label={action}>
              <div className={styles.toolTop}><Icon size={21} strokeWidth={1.6} aria-hidden="true" /><span>{number}</span></div>
              <h3>{title}</h3><p>{description}</p><span className={styles.toolAction}>{action} <ArrowRight size={15} aria-hidden="true" /></span>
            </Link>
          ))}</div>
        </section>

        <section id="faq" className={styles.faq} aria-labelledby="faq-title">
          <div><p className={styles.eyebrow}>A little guidance</p><h2 id="faq-title">처음이라면,<br />여기서 시작하세요.</h2><Link href="/quant" className={styles.guideLink}>퀀트 투자와 전략 안내 <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          <div className={styles.questions}>{HOME_FAQ.map(({ q, a }) => (
            <details key={q}><summary>{q}<span aria-hidden="true">＋</span></summary><p>{a}</p></details>
          ))}</div>
        </section>
      </div>
      <footer className={styles.footer}><div className={styles.container}><span>© 2026 IdiotQuant</span><p>본 서비스는 투자 참고 정보이며 투자 판단과 결과는 이용자에게 있습니다.</p><div><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보 처리방침</Link></div></div></footer>
    </div>
  );
}
