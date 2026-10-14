import { technicalSummary, type PriceBar } from '@/lib/research/technical';

export default function TechnicalSummary({ bars, currency }: { bars: PriceBar[]; currency: string }) {
    const result = technicalSummary(bars);
    const format = (v: number | null, unit = '') => v == null ? '데이터 부족' : `${v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit}`;
    return (
        <section aria-label="모멘텀과 기술적 지표" className="border-t border-neutral-200 py-4 sm:rounded-lg sm:border sm:bg-white sm:p-5 dark:border-surface-dark-border dark:sm:bg-surface-dark-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">모멘텀 · 기술적 지표</h2>
                <span className="text-xs text-neutral-500">{result.date ? `${result.date.slice(0, 4)}.${result.date.slice(4, 6)}.${result.date.slice(6)} 기준 · 시세 ${result.count}개` : '시세를 불러오는 중입니다'}</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                {[
                    ['최근 20개 시세 기준 등락률', format(result.momentum20, '%')],
                    ['최근 60개 시세 기준 등락률', format(result.momentum60, '%')],
                    ['RSI · 14개 시세 기준', format(result.rsi14)],
                    ['최근 20개 종가 평균', result.sma20 == null ? '데이터 부족' : currency + format(result.sma20)],
                    ['최근 60개 종가 평균', result.sma60 == null ? '데이터 부족' : currency + format(result.sma60)],
                    ['직전 20개 시세 평균 대비 거래량', format(result.volumeRatio, '배')],
                ].map(([label, value]) => <div key={label}><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd></div>)}
            </dl>
            <p className="mt-4 text-xs leading-5 text-neutral-500">20·60은 날짜 수가 아닌 조회된 시세의 개수입니다. 일별 시세는 거래일, 월별 시세는 월 단위로 계산합니다.</p>
            <details className="mt-3 text-xs text-neutral-500">
                <summary className="cursor-pointer">계산 기준과 데이터 범위</summary>
                <p className="mt-2 leading-6">등락률은 최신 종가를 20개 또는 60개 앞선 시세의 종가와 비교한 값입니다. 이동평균은 최신 시세를 포함한 최근 20개 또는 60개 종가의 평균입니다. 거래량은 최신 값을 제외한 직전 20개 시세의 평균과 비교합니다. RSI는 14개 시세 간격의 가격 변화를 Wilder 방식으로 계산합니다. 누락된 시세는 보충하지 않으며, 수정주가 반영 여부와 진행 중인 거래일·월의 값은 원본 시세에 따릅니다. 실시간 주문 흐름이나 기관·외국인 수급 지표는 포함하지 않습니다.</p>
                <a className="mt-2 inline-block text-brand-ink hover:underline" href="https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi" target="_blank" rel="noreferrer">RSI 계산 방법 참고</a>
            </details>
        </section>
    );
}
