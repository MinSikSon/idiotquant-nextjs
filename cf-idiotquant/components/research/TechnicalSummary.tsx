import { technicalSummary, type PriceBar } from '@/lib/research/technical';

export default function TechnicalSummary({ bars, currency }: { bars: PriceBar[]; currency: string }) {
    const result = technicalSummary(bars);
    const format = (v: number | null, unit = '') => v == null ? '데이터 부족' : `${v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit}`;
    return (
        <section aria-label="모멘텀과 기술적 지표" className="border-t border-neutral-200 py-4 sm:rounded-lg sm:border sm:bg-white sm:p-5 dark:border-surface-dark-border dark:sm:bg-surface-dark-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">모멘텀 · 기술적 지표</h2>
                <span className="text-xs text-neutral-500">{result.date ? `${result.date.slice(0, 4)}.${result.date.slice(4, 6)}.${result.date.slice(6)} 기준 · ${result.count}개 관측값` : '일별 시세를 기다리고 있습니다'}</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                {[
                    ['20기간 가격 변화', format(result.momentum20, '%')],
                    ['60기간 가격 변화', format(result.momentum60, '%')],
                    ['RSI · 14기간', format(result.rsi14)],
                    ['20기간 이동평균', result.sma20 == null ? '데이터 부족' : currency + format(result.sma20)],
                    ['60기간 이동평균', result.sma60 == null ? '데이터 부족' : currency + format(result.sma60)],
                    ['거래량 / 이전 20기간 평균', format(result.volumeRatio, '배')],
                ].map(([label, value]) => <div key={label}><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd></div>)}
            </dl>
            <details className="mt-5 text-xs text-neutral-500">
                <summary className="cursor-pointer">계산 기준과 데이터 범위</summary>
                <p className="mt-2 leading-6">기간은 API가 제공한 일별 시세의 관측 개수입니다. RSI는 Wilder 방식으로 계산합니다. 조회 구간에 없는 시세와 거래량은 보충하지 않으며, 수정주가·당일 장중 값 여부는 원본 시세에 따릅니다. 실시간 주문 흐름이나 기관·외국인 수급 지표는 포함하지 않습니다.</p>
                <a className="mt-2 inline-block text-brand-ink hover:underline" href="https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi" target="_blank" rel="noreferrer">RSI 계산 방법 참고</a>
            </details>
        </section>
    );
}
