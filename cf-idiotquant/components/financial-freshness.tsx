import { AlertTriangle, Info } from 'lucide-react';
import {
  financialFreshness,
  collectionFinancialFreshness,
  financialSourceLabel,
  type FinancialPeriod,
} from '@/lib/utils/financialFreshness';

export default function FinancialFreshnessNotice(props: {
  periods: FinancialPeriod[];
  banner?: boolean;
  source?: string | null;
  collectionDate?: unknown;
}) {
  const { periods, banner = false, source } = props;
  const collected = 'collectionDate' in props;
  const result = collected
    ? collectionFinancialFreshness(periods, props.collectionDate)
    : financialFreshness(periods);
  const sourceLabel = financialSourceLabel(source);
  if (result.status === 'fresh' && !sourceLabel) return null;
  const Icon = result.status === 'stale' ? AlertTriangle : Info;
  const tone =
    result.status === 'stale'
      ? 'text-amber-800 dark:text-amber-300'
      : 'text-neutral-500 dark:text-neutral-400';
  if (!banner)
    return (
      <span
        className={`inline-flex max-w-full flex-col items-start text-[10px] font-medium ${tone}`}
        title={`${sourceLabel ? `재무 출처: ${sourceLabel}. ` : ''}${result.message}${!collected && result.periods ? ` (${result.periods})` : ''}`}
      >
        <span className="inline-flex items-center gap-1">
          <Icon size={11} className="shrink-0" aria-hidden="true" />
          <span>{sourceLabel}{sourceLabel && result.status !== 'fresh' ? ' · ' : ''}{result.status !== 'fresh' ? result.label : ''}</span>
        </span>
        {collected && result.status !== 'fresh' && (
          <span className="mt-0.5 text-[10px] font-normal leading-4">{result.message}</span>
        )}
      </span>
    );
  return (
    <aside
      role="note"
      aria-label={result.status === 'fresh' ? '재무정보 출처' : result.label}
      className={`mb-4 flex items-start gap-2.5 rounded-xl border p-3 sm:p-4 ${tone} ${result.status === 'stale' ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-surface-dark-card'}`}
    >
      <Icon size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold">{result.status === 'fresh' ? `재무 출처: ${sourceLabel}` : result.label}</p>
        <p className="mt-1 text-xs leading-5">{result.status === 'fresh' ? `${result.periods} 기준${source === 'sec' ? ' 연간' : ''} 재무자료입니다.` : `${sourceLabel ? `재무 출처: ${sourceLabel}. ` : ''}${result.message}`}</p>
      </div>
    </aside>
  );
}
