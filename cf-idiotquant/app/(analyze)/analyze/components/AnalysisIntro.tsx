import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { VALUATION_MODEL_DESCRIPTIONS } from '@/app/(search)/search/components/valuationModelDescriptions';
import styles from '../analyze.module.css';

const examples = [
  ['005930', '삼성전자'], ['000660', 'SK하이닉스'], ['035420', 'NAVER'],
  ['AAPL', 'AAPL'], ['NVDA', 'NVDA'], ['MSFT', 'MSFT'],
];

export default function AnalysisIntro() {
  return (
    <section aria-label="예시 종목과 계산 방법">
      <div className={styles.quickSearches}>
        <span>예시 종목</span>
        {examples.map(([ticker, name]) => (
          <Link key={ticker} className={`service-button ${styles.stockShortcut}`} href={`/analyze?ticker=${ticker}`}>{name}</Link>
        ))}
      </div>
      <details className={styles.methods}>
        <summary>적정주가 계산 방법<ChevronDown size={15} aria-hidden="true" /></summary>
        <div className={styles.models}>
          {Object.entries(VALUATION_MODEL_DESCRIPTIONS).map(([name, model]) => (
            <article key={name} className={styles.model}>
              <h3>{name === 'SRIM' ? 'S-RIM' : name}</h3>
              <p>{model.detail}</p><p className={styles.caution}>{model.caution}</p>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
