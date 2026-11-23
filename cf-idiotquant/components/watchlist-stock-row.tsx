import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StockLogo } from '@/components/stockLogo';
import { scanDateLabel } from '@/lib/features/stockLikes/changes';
import { analysisHref } from '@/lib/investmentFlow';
import { valuationComparisonAxis } from '@/lib/utils/valuationSummary';

const secondary = 'text-neutral-600 dark:text-neutral-300';

export function WatchlistPriceLegend() {
    return <p className={`flex flex-wrap gap-x-3 gap-y-1 text-xs ${secondary}`}>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-px bg-brand-ink" />비교 기준가</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 rounded-full bg-brand-ink" />전략별 적정주가</span>
    </p>;
}

type WatchlistStockRowProps = {
    ticker: string;
    name: string;
    isUs: boolean;
    scanDate: string | null;
    reference: { price: number | null; label: '현재가' | '스캔 기준가'; pending?: boolean } | null;
    models: { label: string; basis: string; targetPrice: number | null }[];
    emptyMessage?: string;
};

export function WatchlistStockRow({ ticker, name, isUs, scanDate, reference, models, emptyMessage }: WatchlistStockRowProps) {
    const formatPrice = (value: number) => `${isUs ? '$' : '₩'}${value.toLocaleString('ko-KR', {
        minimumFractionDigits: isUs ? 2 : 0,
        maximumFractionDigits: isUs ? 4 : 0,
    })}`;
    const price = reference?.price ?? null;
    const axis = valuationComparisonAxis(price ?? 0, models.map(model => model.targetPrice));
    const referencePosition = price === null ? null : axis.position(price);

    return <Link href={analysisHref(ticker)} aria-label={`${name}${isUs && name !== ticker ? ` ${ticker}` : ''} 분석`}
        className="block min-h-11 rounded px-1 py-1.5 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink dark:hover:bg-white/5">
        <div className="flex min-h-8 items-center gap-2">
            <span className="shrink-0 rounded-lg bg-white ring-1 ring-neutral-200 dark:ring-transparent">
                <StockLogo ticker={ticker} name={name} isUs={isUs} decorative />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-2">
                <div className="min-w-0 flex-1 basis-24 [overflow-wrap:anywhere]">
                    <p className="font-semibold leading-5">{name}{isUs && name !== ticker && <span className={`ml-1 text-xs font-normal ${secondary}`}>{ticker}</span>}</p>
                    {scanDate && <p className={`text-xs ${secondary}`}>스캔 {scanDateLabel(scanDate)}</p>}
                </div>
                {reference && <div className="ml-auto min-w-0 max-w-full text-right tabular-nums [overflow-wrap:anywhere]">
                    <p className={`text-xs ${secondary}`}>{reference.label}</p>
                    <p className="font-semibold leading-5">{price !== null ? formatPrice(price) : reference.pending ? '조회 중' : '조회 불가'}</p>
                </div>}
            </div>
            <ArrowRight size={15} aria-hidden="true" className="shrink-0 text-brand-ink" />
        </div>
        {models.length > 0 ? <dl aria-label="전략별 적정주가" className="mt-1.5 grid grid-cols-[auto_minmax(1.25rem,1fr)_minmax(0,max-content)] gap-x-2 text-sm leading-5">
            {models.map(({ label, basis, targetPrice }) => {
                const targetPosition = targetPrice === null ? null : axis.position(targetPrice);
                const difference = axis.difference(targetPrice);
                return <div key={label} className="col-span-3 grid grid-cols-subgrid items-center">
                    <dt className="font-medium">{label} <span className={`text-xs font-normal ${secondary}`}>{basis}</span></dt>
                    <dd className="col-span-2 grid grid-cols-subgrid items-center self-stretch">
                        <span aria-hidden="true" className="relative self-stretch">
                            <span className="absolute inset-x-0 top-1/2 h-px bg-neutral-200 dark:bg-neutral-700" />
                            {referencePosition !== null && <span className="absolute inset-y-0 z-10 w-px bg-brand-ink" style={{ left: `${referencePosition}%` }} />}
                            {targetPosition !== null && <>
                                {referencePosition !== null && <span className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-brand-ink/30" style={{
                                    left: `${Math.min(referencePosition, targetPosition)}%`,
                                    width: `${Math.abs(referencePosition - targetPosition)}%`,
                                }} />}
                                <span className="absolute top-1/2 z-20 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-ink" style={{ left: `${targetPosition}%` }} />
                            </>}
                        </span>
                        <span className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-2 text-right tabular-nums [overflow-wrap:anywhere]">
                            <span>{targetPrice === null ? '계산 불가' : formatPrice(targetPrice)}</span>
                            {difference !== null && <span className={`text-xs ${secondary}`}>{difference > 0 ? '+' : ''}{difference.toFixed(1)}%</span>}
                        </span>
                    </dd>
                </div>;
            })}
        </dl> : emptyMessage && <p className={`mt-1 text-xs ${secondary}`}>{emptyMessage}</p>}
    </Link>;
}
