"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HOME_FAQ } from "@/lib/seo-content";
import { ArrowRight, SlidersHorizontal, ChartNoAxesCombined, Heart, ArrowUpRight } from "lucide-react";
import styles from "./home.module.css";
import HomeCandidates from "./HomeCandidates";

type GuestLandingProps = {
  backgroundArt: ReactNode;
  isLoggedIn?: boolean;
};

const tools = [
  { href: "/screener", icon: SlidersHorizontal, number: "01", title: "기준으로 발굴", description: "NCAV, 저PBR, 저PER. 숫자로 후보를 좁혀보세요.", action: "종목 발굴" },
  { href: "/analyze", icon: ChartNoAxesCombined, number: "02", title: "근거까지 분석", description: "발굴한 종목을 눌러 지표와 기업 가치를 확인하세요. 상세 재무·위험도는 로그인 후 볼 수 있습니다.", action: "종목 분석" },
  { href: "/screener?filter=liked", icon: Heart, number: "03", title: "담고 다시 확인", description: "관심종목을 저장하고 변화와 분석을 이어서 확인하세요.", action: "관심종목" },
];

export default function GuestLanding({ backgroundArt, isLoggedIn = false }: GuestLandingProps) {
  return (
    <div id="public-home" className={styles.home}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroArt} aria-hidden="true">{backgroundArt}</div>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>잠깐의 탐색, 내일의 투자 후보</p>
            <h1>내일 살펴볼 종목,<br className={styles.mobileBreak} /> 지금 비교해보세요.</h1>
            <p className={styles.intro}>국장·미장 가격과 재무 조건부터 전략 충족 여부까지.</p>

          </div>
        </section>

        <HomeCandidates isLoggedIn={isLoggedIn} />

        <section id="features" className={styles.features} aria-labelledby="tools-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>이용 순서</p><h2 id="tools-title">생각의 흐름을 끊지 않도록.</h2></div><p>찾고, 이해하고, 다시 확인하세요.</p></div>
          <div className={styles.toolGrid}>{tools.map(({ href, icon: Icon, number, title, description, action }) => (
            <Link href={href.includes("filter=liked") && !isLoggedIn ? `/login?callbackUrl=${encodeURIComponent(href)}` : href} key={href} className={styles.tool} aria-label={action}>
              <div className={styles.toolTop}><Icon size={21} strokeWidth={2} aria-hidden="true" /><span>{number}</span></div>
              <h3>{title}</h3><p>{description}</p><span className={styles.toolAction}>{action} <ArrowRight size={15} aria-hidden="true" /></span>
            </Link>
          ))}</div>
          <p className={styles.note}>후보가 여러 개라면 <Link href="/compare" className="underline underline-offset-4">종목 비교</Link>에서 나란히 살펴보세요.</p>
        </section>

        <section id="faq" className={styles.faq} aria-labelledby="faq-title">
          <div><p className={styles.eyebrow}>이용 안내</p><h2 id="faq-title">처음이라면,<br />여기서 시작하세요.</h2><Link href="/quant" className={styles.guideLink}>퀀트 투자와 전략 안내 <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          <div className={styles.questions}>{HOME_FAQ.map(({ q, a }) => (
            <details key={q}><summary>{q}<span aria-hidden="true">＋</span></summary><p>{a}</p></details>
          ))}</div>
        </section>
      </div>
      <footer className={styles.footer}><div className={styles.container}><span>© 2026 IdiotQuant</span><p>본 서비스는 투자 참고 정보이며 투자 판단과 결과는 이용자에게 있습니다.</p><div><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보 처리방침</Link></div></div></footer>
    </div>
  );
}
