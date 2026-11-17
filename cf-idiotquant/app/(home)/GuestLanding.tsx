"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { WatchlistSample } from '@/components/home-watchlist';
import { ArrowRight, ChartNoAxesCombined, Heart, Search, SlidersHorizontal } from 'lucide-react';
import { useStockSearchModal } from '@/components/stock-search-provider';
import styles from './home.module.css';

const HeroArt = dynamic(() => import('./HeroArt'), { ssr: false });

const steps = [
  { icon: SlidersHorizontal, number: '01', title: '기준을 정해 발굴', text: 'PER·PBR·ROE와 재무 기준을 조합해 살펴볼 종목을 좁힙니다.', href: '/screener', action: '스크리너 둘러보기' },
  { icon: ChartNoAxesCombined, number: '02', title: '숫자로 분석', text: '실적과 재무 지표, 여러 방식으로 계산한 적정주가를 확인합니다.', href: '/analyze', action: '분석 화면 보기' },
  { icon: Heart, number: '03', title: '관심종목으로 추적', text: '관심 있는 기업을 모아 현재가와 전략별 추정 가치를 함께 봅니다.', href: '/login?callbackUrl=%2F', action: '관심종목 시작' },
];

export default function GuestLanding() {
  const { openSearch } = useStockSearchModal();
  return <main className={styles.home}>
    <div className={styles.container}>
      <section aria-labelledby="home-title" className={styles.hero}>
        <div className={styles.heroArt} aria-hidden="true"><HeroArt /></div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span /> 국내·미국 주식 리서치</p>
          <h1 id="home-title">좋은 기업을 찾고,<br /><span>가격을 숫자로 판단하세요.</span></h1>
          <p className={styles.intro}>재무 기준으로 종목을 발굴하고, 기업의 실적과 여러 적정주가를 비교해 보세요. 관심종목에 담아 꾸준히 살펴볼 수 있습니다.</p>
          <div className={styles.actions}>
            <Link href="/screener" className={styles.primaryAction}>종목 발굴 시작<ArrowRight size={17} aria-hidden="true" /></Link>
            <button type="button" onClick={openSearch} className={styles.secondaryAction}><Search size={17} aria-hidden="true" /> 종목 바로 검색</button>
          </div>
          <p className={styles.note}>회원가입 없이 종목 발굴과 분석을 둘러볼 수 있습니다.</p>
        </div>
        <div className={styles.heroIndex} aria-hidden="true"><span>IDIOTQUANT</span><span>RESEARCH · 01</span></div>
      </section>

      <section aria-labelledby="sample-title" className={styles.preview}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>먼저 화면을 살펴보세요</p><h2 id="sample-title">숫자와 판단 근거를 한곳에서</h2></div>
          <p>실제 스캔 데이터를 바탕으로 한 예시</p>
        </div>
        <WatchlistSample />
      </section>

      <section aria-labelledby="steps-title" className={styles.stepsSection}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>발굴부터 추적까지</p><h2 id="steps-title">투자 아이디어를 확인하는 세 단계</h2></div>
          <p>필요한 화면으로 바로 이동해 직접 확인해 보세요.</p>
        </div>
        <div className={styles.stepGrid}>{steps.map(({ icon: Icon, number, title, text, href, action }) => <article key={number} className={styles.step}>
          <div className={styles.stepTop}><span>{number}</span><Icon size={19} aria-hidden="true" /></div>
          <h3>{title}</h3><p>{text}</p><Link href={href}>{action}<ArrowRight size={15} aria-hidden="true" /></Link>
        </article>)}</div>
      </section>

      <section className={styles.closing} aria-label="종목 탐색 시작">
        <div><p className={styles.kicker}>지금 궁금한 종목부터</p><h2>관심 기업의 숫자를 직접 확인해 보세요.</h2></div>
        <button type="button" onClick={openSearch}>종목 검색<Search size={17} aria-hidden="true" /></button>
      </section>

      <footer className={styles.footer}>
        <p>본 서비스의 정보는 투자 참고용이며, 투자 판단과 결과는 이용자에게 있습니다.</p>
        <div><span>© 2026 IdiotQuant</span><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보 처리방침</Link></div>
      </footer>
    </div>
  </main>;
}
