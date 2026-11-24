import ui from "./research-ui.module.css";
import { technicalSummary, type PriceBar } from '@/lib/research/technical';

const formatNumber = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const formatDate = (date: string) => `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6)}`;

function compareWithAverage(change: number, above: string, below: string) {
    const rounded = Number(change.toFixed(2));
    if (rounded === 0) return '평균과 비슷합니다';
    return `평균보다 ${formatNumber(Math.abs(rounded))}% ${rounded > 0 ? above : below}`;
}

export default function TechnicalSummary({ bars, currency }: { bars: PriceBar[]; currency: string }) {
    const result = technicalSummary(bars);
    const latest = bars.at(-1);
    const momentum = (period: number, change: number | null) => {
        const previous = bars.at(-(period + 1));
        const rounded = change == null ? null : Number(change.toFixed(2));
        return {
            basis: previous ? `${formatDate(previous.date)} 가격과 비교` : `${period}개 시세 전과 비교`,
            conclusion: rounded == null ? null : rounded === 0 ? '가격 변화가 거의 없습니다'
                : `${formatNumber(Math.abs(rounded))}% ${rounded > 0 ? '올랐습니다' : '내렸습니다'}`,
        };
    };
    const average = (period: number, price: number | null) => ({
        basis: `최근 ${period}개 가격 평균${price == null ? '' : ` ${currency}${formatNumber(price)}`}`,
        conclusion: latest && price != null ? compareWithAverage((latest.close / price - 1) * 100, '높습니다', '낮습니다') : null,
    });
    const rsi = result.rsi14 == null ? null : Number(result.rsi14.toFixed(2));
    const groups = [
        {
            heading: '예전보다 주가가 얼마나 달라졌나요?',
            comparisons: [momentum(20, result.momentum20), momentum(60, result.momentum60)],
        },
        {
            heading: '최근 평균 가격보다 높나요?',
            comparisons: [average(20, result.sma20), average(60, result.sma60)],
        },
        {
            heading: '거래량은 평소와 비교해 어떤가요?',
            comparisons: [{
                basis: result.volumeRatio == null ? '직전 20개 거래량과 비교' : `직전 20개 거래량 평균의 ${formatNumber(result.volumeRatio)}배`,
                conclusion: result.volumeRatio == null ? null : compareWithAverage((result.volumeRatio - 1) * 100, '많습니다', '적습니다'),
            }],
        },
        {
            heading: '최근 주가의 상승·하락세는 어떤가요?',
            comparisons: [{
                basis: rsi == null ? '오른 폭과 내린 폭을 비교한 점수 (RSI)' : `오른 폭과 내린 폭을 비교한 점수 (RSI) ${formatNumber(rsi)}점`,
                conclusion: rsi == null ? null : rsi > 70 ? '오르는 힘이 강한 구간입니다'
                    : rsi < 30 ? '내리는 힘이 강한 구간입니다' : '오르거나 내리는 힘이 한쪽으로 크게 치우치지 않았습니다',
            }],
        },
    ];

    return (
        <section aria-label="주가 흐름과 거래량" className={`${ui.surface} p-3`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">주가 흐름과 거래량</h2>
                <span className="text-sm text-neutral-600 dark:text-neutral-300">{latest ? `${formatDate(latest.date)} 기준 · ${currency}${formatNumber(latest.close)}` : '표시할 시세가 없습니다'}</span>
            </div>
            {latest && <dl className="mt-2 space-y-2">
                {groups.map(({ heading, comparisons }) => (
                    <div key={heading} className="border-t border-[var(--analysis-line)] pt-2 break-keep [overflow-wrap:anywhere]">
                        <dt className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{heading}</dt>
                        {comparisons.map(({ basis, conclusion }) => (
                            <dd key={basis} className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 tabular-nums">
                                <span className="font-semibold">{conclusion ?? '비교할 기록이 부족합니다'}</span>
                                <span className="text-sm text-neutral-600 dark:text-neutral-300">{basis}</span>
                            </dd>
                        ))}
                    </div>
                ))}
            </dl>}
            <details className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                <summary className="min-h-11 cursor-pointer py-2 font-medium">계산 기준과 데이터 범위</summary>
                <p className="mt-2 leading-6">조회한 시세 {result.count}개를 사용합니다. 가격은 각 기록의 종가입니다. 등락률은 20개 또는 60개 앞선 시세와 비교합니다. 일별 시세는 거래일, 월별 시세는 월 단위로 셉니다. 가격 평균에는 최신 가격을 포함하고, 거래량 평균에는 최신 거래량을 제외합니다.</p>
                <p className="mt-2 leading-6">RSI는 14개 시세 간격의 가격 변화를 Wilder 방식으로 계산합니다. 70 초과는 과매수, 30 미만은 과매도, 그 사이는 중립 구간입니다.</p>
                <p className="mt-2 leading-6">누락된 시세는 보충하지 않으며, 수정주가 반영 여부와 진행 중인 거래일·월의 값은 원본 시세에 따릅니다. 실시간 주문 흐름이나 기관·외국인 수급 지표는 포함하지 않습니다.</p>
                <a className="mt-2 inline-block text-brand-ink underline underline-offset-4" href="https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi" target="_blank" rel="noreferrer">RSI 계산 방법 참고</a>
            </details>
        </section>
    );
}
