"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HOME_FAQ } from "@/lib/seo-content";
import { ArrowRight, Search, SlidersHorizontal, ChartNoAxesCombined, GitCompareArrows, ArrowUpRight } from "lucide-react";
import type { NcavDailyItem } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import styles from "./home.module.css";
import { matchesGuestPer } from "@/lib/utils/guestStocks";

type GuestLandingProps = {
  list: NcavDailyItem[];
  totalCount: number;
  isLoading: boolean;
  scanDate: string | null;
  backgroundArt: ReactNode;
  isLoggedIn?: boolean;
  refreshStatus?: ReactNode;
};

const formatPrice = (value: number) =>
  value > 0 ? `₩${Math.round(value).toLocaleString("ko-KR")}` : "—";

const tools = [
  { href: "/screener", icon: SlidersHorizontal, number: "01", title: "기준으로 발굴", description: "NCAV, 저PBR, 저PER. 숫자로 후보를 좁혀보세요.", action: "종목 발굴" },
  { href: "/compare", icon: GitCompareArrows, number: "02", title: "나란히 비교", description: "여러 회사의 핵심 지표를 같은 기준으로 살펴보세요.", action: "종목 비교" },
  { href: "/analyze", icon: ChartNoAxesCombined, number: "03", title: "근거까지 분석", description: "재무 정보부터 기업 가치까지, 숫자의 이유를 확인하세요.", action: "종목 분석" },
];

export default function GuestLanding({ list, totalCount, isLoading, scanDate, backgroundArt, isLoggedIn = false, refreshStatus }: GuestLandingProps) {
  const dateLabel = scanDate
    ? `${scanDate.slice(0, 4)}.${scanDate.slice(4, 6)}.${scanDate.slice(6, 8)}`
    : "최신 데이터";
  const preview = list.filter(matchesGuestPer).slice(0, 5);

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
            <p className={styles.note}>{isLoggedIn ? "발굴 → 비교 → 분석, 나만의 기준으로 이어가세요." : "가입 없이, 바로 시작할 수 있습니다."}</p>
          </div>

          <section aria-labelledby="preview-title" className={styles.preview}>
            <div className={styles.previewTop}><span className={styles.eyebrow}>DISCOVERY</span><span className={styles.date}>{dateLabel}</span></div>
            <div className={styles.previewTitle}><h2 id="preview-title">오늘의 발굴 종목</h2><span className={styles.count}>{isLoading && !preview.length ? "조회 중" : `전체 ${totalCount.toLocaleString()}개`}</span></div>
            <p className={styles.previewDescription}>PER 0 초과·20 이하인 종목 미리보기</p>
            {refreshStatus}
            <div className={styles.table}>
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
              )) : <div className={styles.empty}><SlidersHorizontal size={24} aria-hidden="true" /><p>PER 조건에 맞는 미리보기 종목이 없습니다.</p><Link href="/screener">발굴 기준 살펴보기 <ArrowRight size={14} aria-hidden="true" /></Link></div>}
            </div>
            <Link href="/screener?mincap=500" className={styles.previewFooter}>발굴 결과 전체 보기 <ArrowRight size={15} aria-hidden="true" /></Link>
          </section>
        </section>

        <section id="features" className={styles.features} aria-labelledby="tools-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>YOUR WORKFLOW</p><h2 id="tools-title">생각의 흐름을 끊지 않도록.</h2></div><p>찾고, 비교하고, 이해하세요.</p></div>
          <div className={styles.toolGrid}>{tools.map(({ href, icon: Icon, number, title, description, action }) => (
            <Link href={href} key={href} className={styles.tool} aria-label={action}>
              <div className={styles.toolTop}><Icon size={21} strokeWidth={1.6} aria-hidden="true" /><span>{number}</span></div>
              <h3>{title}</h3><p>{description}</p><span className={styles.toolAction}>{action} <ArrowRight size={15} aria-hidden="true" /></span>
            </Link>
          ))}</div>
        </section>

        <section id="faq" className={styles.faq} aria-labelledby="faq-title">
          <div><p className={styles.eyebrow}>A LITTLE GUIDANCE</p><h2 id="faq-title">처음이라면,<br />여기서 시작하세요.</h2><Link href="/quant" className={styles.guideLink}>퀀트 투자와 전략 안내 <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          <div className={styles.questions}>{HOME_FAQ.map(({ q, a }) => (
            <details key={q}><summary>{q}<span aria-hidden="true">＋</span></summary><p>{a}</p></details>
          ))}</div>
        </section>
      </div>
      <footer className={styles.footer}><div className={styles.container}><span>© 2026 IdiotQuant</span><p>본 서비스는 투자 참고 정보이며 투자 판단과 결과는 이용자에게 있습니다.</p><div><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보 처리방침</Link></div></div></footer>
    </div>
  );
}
