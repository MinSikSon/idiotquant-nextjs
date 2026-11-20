import ui from "./research-ui.module.css";
import { technicalSummary, type PriceBar } from '@/lib/research/technical';

const formatNumber = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const formatDate = (date: string) => `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6)}`;

function compareWithAverage(change: number, subject: string) {
    const rounded = Number(change.toFixed(2));
    if (rounded === 0) return `${subject} 평균과 비슷`;
    return `${subject} 평균보다 ${formatNumber(Math.abs(rounded))}% ${rounded > 0 ? '높음' : '낮음'}`;
}

export default function TechnicalSummary({ bars, currency }: { bars: PriceBar[]; currency: string }) {
    const result = technicalSummary(bars);
    const latest = bars.at(-1);
    const momentum = (period: number, change: number | null) => {
        const previous = bars.at(-(period + 1));
        const rounded = change == null ? null : Number(change.toFixed(2));
        return {
            label: `${period}개 시세 전 대비 등락률`,
            value: rounded == null ? null : `${rounded > 0 ? '+' : ''}${formatNumber(rounded === 0 ? 0 : rounded)}%`,
            description: previous && rounded != null
                ? `${formatDate(previous.date)} 대비 ${rounded === 0 ? '보합' : rounded > 0 ? '상승' : '하락'}`
                : null,
        };
    };
    const average = (period: number, price: number | null) => ({
        label: `최근 ${period}개 종가 평균`,
        value: price == null ? null : currency + formatNumber(price),
        description: latest && price != null ? compareWithAverage((latest.close / price - 1) * 100, '최신 종가가') : null,
    });
    const rsi = result.rsi14 == null ? null : Number(result.rsi14.toFixed(2));
    const metrics = [
        momentum(20, result.momentum20),
        momentum(60, result.momentum60),
        {
            label: '가격 움직임 강도 (RSI)',
            value: rsi == null ? null : formatNumber(rsi),
            description: rsi == null ? null : rsi > 70 ? '과매수 구간' : rsi < 30 ? '과매도 구간' : '중립 구간',
        },
        average(20, result.sma20),
        average(60, result.sma60),
        {
            label: '직전 20개 평균 대비 거래량',
            value: result.volumeRatio == null ? null : `${formatNumber(result.volumeRatio)}배`,
            description: result.volumeRatio == null ? null : compareWithAverage((result.volumeRatio - 1) * 100, '최신 거래량이'),
        },
    ];

    return (
        <section aria-label="모멘텀과 기술적 지표" className={`${ui.surface} ${ui.technicalSummary} p-4 sm:p-6`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">모멘텀 · 기술적 지표</h2>
                <span className="text-sm text-neutral-600 dark:text-neutral-300">{result.date ? `${formatDate(result.date)} 시세 기준` : '표시할 시세가 없습니다'}</span>
            </div>
            {latest && <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 xl:grid-cols-3">
                {metrics.map(({ label, value, description }) => (
                    <div key={label} className="min-w-0 break-keep [overflow-wrap:anywhere]">
                        <dt className="text-sm text-neutral-600 dark:text-neutral-300">{label}</dt>
                        <dd className="mt-1">
                            <span className={value == null ? 'text-sm text-neutral-600 dark:text-neutral-300' : 'text-xl font-semibold tabular-nums'}>{value ?? '데이터 부족'}</span>
                            {description && <span className="mt-0.5 block text-sm">{description}</span>}
                        </dd>
                    </div>
                ))}
            </dl>}
            <details className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
                <summary className="min-h-11 cursor-pointer py-3 font-medium">계산 기준과 데이터 범위</summary>
                <p className="mt-2 leading-6">조회한 시세 {result.count}개를 사용합니다. 일별 시세는 거래일, 월별 시세는 월 단위로 셉니다. 종가 평균에 최신 시세를 포함하고, 거래량 비교에 쓰는 평균에는 최신 거래량을 제외합니다.</p>
                <p className="mt-2 leading-6">RSI는 14개 시세 간격의 가격 변화를 Wilder 방식으로 계산합니다. 70 초과는 과매수, 30 미만은 과매도, 그 사이는 중립 구간입니다.</p>
                <p className="mt-2 leading-6">누락된 시세는 보충하지 않으며, 수정주가 반영 여부와 진행 중인 거래일·월의 값은 원본 시세에 따릅니다. 실시간 주문 흐름이나 기관·외국인 수급 지표는 포함하지 않습니다.</p>
                <a className="mt-2 inline-block text-brand-ink underline underline-offset-4" href="https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi" target="_blank" rel="noreferrer">RSI 계산 방법 참고</a>
            </details>
        </section>
    );
}
