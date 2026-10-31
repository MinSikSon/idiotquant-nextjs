import ui from "./research-ui.module.css";
import { technicalSummary, type PriceBar } from '@/lib/research/technical';

export default function TechnicalSummary({ bars, currency }: { bars: PriceBar[]; currency: string }) {
    const result = technicalSummary(bars);
    const format = (v: number | null, unit = '') => v == null ? '데이터 부족' : `${v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit}`;
    return (
        <section aria-label="모멘텀과 기술적 지표" className={`${ui.surface} p-4 sm:p-6`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">모멘텀 · 기술적 지표</h2>
                <span className="text-[13px] text-neutral-600 dark:text-neutral-300">{result.date ? `${result.date.slice(0, 4)}.${result.date.slice(4, 6)}.${result.date.slice(6)} 기준 · 시세 ${result.count}개` : '시세를 불러오는 중입니다'}</span>
            </div>
            <dl className="mt-4 grid grid-cols-1 min-[380px]:grid-cols-2 gap-x-6 gap-y-6 xl:grid-cols-3">
                {[
                    ['최근 20개 시세 기준 등락률', format(result.momentum20, '%')],
                    ['최근 60개 시세 기준 등락률', format(result.momentum60, '%')],
                    ['RSI · 14개 시세 기준', format(result.rsi14)],
                    ['최근 20개 종가 평균', result.sma20 == null ? '데이터 부족' : currency + format(result.sma20)],
                    ['최근 60개 종가 평균', result.sma60 == null ? '데이터 부족' : currency + format(result.sma60)],
                    ['직전 20개 시세 평균 대비 거래량', format(result.volumeRatio, '배')],
                ].map(([label, value]) => <div key={label}><dt className="text-[14px] text-neutral-600 dark:text-neutral-300">{label}</dt><dd className="mt-2 text-[22px] font-semibold tabular-nums">{value}</dd></div>)}
            </dl>
            <p className="mt-4 text-[13px] leading-5 text-neutral-600 dark:text-neutral-300">20·60은 날짜 수가 아닌 조회된 시세의 개수입니다. 일별 시세는 거래일, 월별 시세는 월 단위로 계산합니다.</p>
            <details className="mt-3 text-[13px] text-neutral-600 dark:text-neutral-300">
                <summary className="min-h-11 cursor-pointer py-3 font-medium">계산 기준과 데이터 범위</summary>
                <p className="mt-2 leading-6">등락률은 최신 종가를 20개 또는 60개 앞선 시세의 종가와 비교한 값입니다. 이동평균은 최신 시세를 포함한 최근 20개 또는 60개 종가의 평균입니다. 거래량은 최신 값을 제외한 직전 20개 시세의 평균과 비교합니다. RSI는 14개 시세 간격의 가격 변화를 Wilder 방식으로 계산합니다. 누락된 시세는 보충하지 않으며, 수정주가 반영 여부와 진행 중인 거래일·월의 값은 원본 시세에 따릅니다. 실시간 주문 흐름이나 기관·외국인 수급 지표는 포함하지 않습니다.</p>
                <a className="mt-2 inline-block text-brand-ink hover:underline" href="https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi" target="_blank" rel="noreferrer">RSI 계산 방법 참고</a>
            </details>
        </section>
    );
}
