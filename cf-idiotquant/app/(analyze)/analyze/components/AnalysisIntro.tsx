import { BarChart3, ShieldCheck, Layers3, ArrowUpRight, ChevronDown } from 'lucide-react';
import { VALUATION_MODEL_DESCRIPTIONS } from '@/app/(search)/search/components/valuationModelDescriptions';
import styles from '../analyze.module.css';

const steps = [
  { title: '지표로 현재를 읽고', description: '주가와 PER·PBR·ROE를 함께 보며 기업의 현재 위치를 살펴보세요.', icon: BarChart3 },
  { title: '여러 기준으로 가치를 비교하고', description: 'NCAV부터 S-RIM까지, 서로 다른 가정에서 계산한 가격을 비교하세요.', icon: Layers3 },
  { title: '재무와 위험으로 근거를 확인하세요', description: '재무제표와 기준일, 상장유지 위험도를 확인하며 판단을 이어가세요.', icon: ShieldCheck },
];

export default function AnalysisIntro({ onSearch }: { onSearch: (value: string) => void }) {
  return (
    <section className={styles.intro} aria-labelledby="analysis-intro-title">
      <div className={styles.introHeading}>
        <div>
          <p className={styles.eyebrow}>분석을 시작하는 세 가지 관점</p>
          <h2 id="analysis-intro-title" className={styles.introTitle}>가격을 넘어,<br />가치의 근거까지.</h2>
        </div>
        <p className={styles.introNote}>국내 종목명이나 미국 티커를 검색하세요.<br />지표에서 재무까지, 한 흐름으로 살펴봅니다.</p>
      </div>
      <div className={styles.steps}>
        {steps.map(({ title, description, icon: Icon }, index) => (
          <article key={title} className={styles.step}>
            <div className={styles.stepTop}><span>0{index + 1}</span><Icon size={18} aria-hidden="true" strokeWidth={1.5} /></div>
            <h3>{title}</h3><p>{description}</p>
          </article>
        ))}
      </div>
      <div className={styles.quickSearches} aria-label="예시 종목 바로 분석">
        <span>바로 살펴보기</span>
        {['삼성전자', 'SK하이닉스', 'NAVER', 'AAPL', 'NVDA', 'MSFT'].map(ticker => (
          <button type="button" key={ticker} onClick={() => onSearch(ticker)}>{ticker}<ArrowUpRight size={12} aria-hidden="true" /></button>
        ))}
      </div>
      <details className={styles.methods}>
        <summary>계산 방법과 가정 살펴보기<ChevronDown size={15} aria-hidden="true" /></summary>
        <div className={styles.models}>
          {Object.entries(VALUATION_MODEL_DESCRIPTIONS).map(([name, model]) => (
            <article key={name} className={styles.model}>
              <h3>{name === 'SRIM' ? 'S-RIM' : name}</h3>
              <p>{model.short} {model.detail}</p><p className={styles.caution}>{model.caution}</p>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
