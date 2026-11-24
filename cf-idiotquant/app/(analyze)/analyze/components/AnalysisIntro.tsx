'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { krStockCode, krStockDisplayName } from '@/lib/utils/krStockNames';
import { useUsStockDirectory, usStockDisplayName } from '@/lib/utils/usStockNames';
import { ChevronDown } from 'lucide-react';
import styles from '../analyze.module.css';

const examples = [
  ['005930', '삼성전자'], ['000660', 'SK하이닉스'], ['035420', 'NAVER'],
  ['AAPL', 'AAPL'], ['NVDA', 'NVDA'], ['MSFT', 'MSFT'],
];
const models = ["NCAV", "PBR", "SRIM", "DCF", "PER", "PEG"] as const;

export default function AnalysisIntro() {
  const t = useTranslations("analysisIntro");
  const valuation = useTranslations("valuation");
  const locale = useLocale();
  const usDirectory = useUsStockDirectory();
  return (
    <section aria-label={t("section")}>
      <div className={styles.quickSearches}>
        <span>{t("examples")}</span>
        {examples.map(([ticker, name]) => {
          const displayName = krStockCode(ticker) ? krStockDisplayName(ticker, name, locale)
            : usStockDisplayName(usDirectory?.get(ticker), name, locale);
          return <Link key={ticker} className={`service-button ${styles.stockShortcut}`} href={`/analyze?ticker=${ticker}`}>
            {displayName}{locale !== "ko" && displayName !== ticker && ` · ${ticker}`}
          </Link>;
        })}
      </div>
      <details className={styles.methods}>
        <summary>{t("method")}<ChevronDown size={15} aria-hidden="true" /></summary>
        <div className={styles.models}>
          {models.map(name => (
            <article key={name} className={styles.model}>
              <h3>{name === 'SRIM' ? 'S-RIM' : name}</h3>
              <p>{valuation(`${name}Detail`)}</p><p className={styles.caution}>{valuation(`${name}Caution`)}</p>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
