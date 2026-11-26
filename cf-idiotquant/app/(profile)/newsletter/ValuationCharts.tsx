"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, usePlotArea, XAxis, YAxis } from "recharts";
import { newsletterNumber, type Market, type ValuationSnapshot } from "@/lib/utils/newsletterValuation";
import styles from "./newsletter.module.css";

const strategyDescriptions: Partial<Record<string, string>> = {
    SRIM: "기업이 자기자본에 대해 투자자가 요구하는 수익을 넘겨 얼마나 더 벌 수 있는지 평가합니다.",
    PER: "주당순이익(EPS)에 일정 배수를 곱해, 기업이 버는 이익을 기준으로 적정가를 구합니다.",
    PBR: "주당순자산(BPS)에 일정 배수를 곱해, 장부에 기록된 순자산을 기준으로 적정가를 구합니다.",
    NCAV: "유동자산에서 전체 부채를 뺀 금액을 기준으로 주당 가치를 평가합니다.",
};

function formatPrice(price: number, market: Market) {
    return market === "US" ? `$${newsletterNumber(price, market)}` : `${newsletterNumber(price, market)}원`;
}

export function PriceAxis({ snapshot, market, historical = false }: {
    snapshot: ValuationSnapshot; market: Market; historical?: boolean;
}) {
    const points = snapshot.models.flatMap(model => model.targetPrice === null ? [] : [{
        label: model.label, basis: model.basis, price: model.targetPrice, gap: model.gapPercent, reference: false,
    }]);
    const above = points.filter(point => point.price > snapshot.price).length;
    points.push({ label: historical ? "당시 주가" : "스캔 기준가", basis: "", price: snapshot.price, gap: null, reference: true });
    points.sort((a, b) => b.price - a.price || Number(b.reference) - Number(a.reference));

    const max = points[0].price;
    const min = points[points.length - 1].price;
    const range = Math.max(max - min, max * 0.12);
    const unit = 10 ** Math.floor(Math.log10(range / 4));
    const tickStep = Math.max(market === "KR" ? 1 : 0.01, ([1, 2, 2.5, 5, 10].find(step => step * unit >= range / 4) ?? 10) * unit);
    const upper = Math.ceil((max + range * 0.08) / tickStep) * tickStep;
    const lower = Math.max(0, Math.min(upper - tickStep * 3, Math.floor(min / tickStep) * tickStep));
    const separation = historical ? 30 : 43;
    const height = Math.max(220, points.length * separation + (historical ? 38 : 30));
    const y = (price: number) => historical
        ? 18 + (upper - price) / (upper - lower) * (height - 42)
        : 24 + (upper - price) / (upper - lower) * (height - 54);
    const ticks = Array.from({ length: Math.round((upper - lower) / tickStep) + 1 }, (_, i) => upper - i * tickStep);

    const labelYs = points.map(point => y(point.price));
    labelYs[labelYs.length - 1] = Math.min(height - 17, labelYs[labelYs.length - 1]);
    for (let i = labelYs.length - 2; i >= 0; i--) labelYs[i] = Math.min(labelYs[i], labelYs[i + 1] - separation);
    labelYs[0] = Math.max(17, labelYs[0]);
    for (let i = 1; i < labelYs.length; i++) labelYs[i] = Math.max(labelYs[i], labelYs[i - 1] + separation);

    const summary = historical
        ? above > 0
            ? `당시 ${points.length - 1}개 전략 중 ${above}개가 주가보다 높았어요.`
            : "당시 주가보다 높은 전략 적정가가 없었어요."
        : `${points.length - 1}개 전략 중 ${above}개의 적정가가 스캔 기준가보다 높아요.`;

    return <>
        <section className={historical ? `${styles.chartCard} ${styles.historyAxisCard}` : styles.chartCard} aria-label="전략별 적정가 비교">
            <div className={styles.chartHeader}>
                <time className={styles.marker} dateTime={snapshot.date} aria-live={historical ? "polite" : undefined}>
                    {snapshot.date.replaceAll("-", ".")} 기준
                </time>
                <span>가격 ({market === "US" ? "USD" : "원"})</span>
            </div>
            <div className={styles.axis} style={{ minHeight: `${height / 16}rem` }}>
                <div className={styles.axisLabels}>
                    {points.map((point, i) => <div key={point.label} className={point.reference ? styles.referenceLabel : styles.modelLabel}
                        style={{ top: `${labelYs[i] / height * 100}%` }}>
                        <strong title={point.basis || undefined}>{point.label}
                            {point.basis && <span className="sr-only"> {point.basis}</span>}
                        </strong>
                        <b>{formatPrice(point.price, market)}</b>
                        {point.gap !== null && <span className={styles.gap}>{point.gap > 0 ? "+" : ""}{point.gap.toFixed(1)}%</span>}
                    </div>)}
                </div>
                <div className={styles.axisPlot} aria-hidden="true">
                    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height="100%">
                        {points.map((point, i) => <path key={point.label}
                            d={`M 0,${labelYs[i]} H 23 L 82,${y(point.price)} H 100`}
                            className={point.reference ? styles.referenceConnector : styles.modelConnector} />)}
                    </svg>
                    {points.map(point => <i key={point.label} className={point.reference ? styles.diamond : styles.dot}
                        style={{ top: `${y(point.price) / height * 100}%` }} />)}
                    <div className={styles.axisLine} style={{ top: `${y(upper) / height * 100}%`, bottom: `${100 - y(lower) / height * 100}%` }} />
                </div>
                <div className={styles.ticks} aria-hidden="true">
                    {ticks.map((price, i) => <span key={i} style={{ top: `${y(price) / height * 100}%` }}>{newsletterNumber(price, market)}</span>)}
                </div>
            </div>
            {points.length === 1 && <p className={styles.note}>이 날짜에 계산할 수 있는 적정가가 없습니다.</p>}
        </section>
        {points.length > 1 && <p className={historical ? `${styles.highlight} ${styles.historyHighlight}` : styles.highlight}>
            {summary}
        </p>}
    </>;
}

function TrendDateSelector({ onSelect }: { onSelect: (fraction: number) => void }) {
    const plot = usePlotArea();
    if (!plot || plot.width <= 0 || plot.height <= 0) return null;

    return <rect {...plot} fill="transparent" className={styles.trendDateSelector} aria-hidden="true"
        onClick={event => {
            const bounds = event.currentTarget.getBoundingClientRect();
            onSelect((event.clientX - bounds.left) / bounds.width);
        }} />;
}

export function HistoricalComparison({ snapshots, market, sampleDate }: {
    snapshots: ValuationSnapshot[]; market: Market; sampleDate?: string;
}) {
    const [date, setDate] = useState(sampleDate ?? "");
    const [strategy, setStrategy] = useState("");
    const index = snapshots.findIndex(item => item.date === date);
    const selectedIndex = index < 0 ? snapshots.length - 1 : index;
    const snapshot = snapshots[selectedIndex];
    const selectedYear = snapshot.date.slice(0, 4);
    const sampleYears = sampleDate ? [...new Set(snapshots.map(item => item.date.slice(0, 4)))] : [];
    const firstVisible = Math.max(0, Math.min(selectedIndex - 1, snapshots.length - 3));
    const dateButtons = sampleDate
        ? snapshots.filter(item => item.date.startsWith(selectedYear))
        : snapshots.slice(firstVisible, firstVisible + 3);
    const monthIndex = (day: string) => Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7));
    const firstMonth = monthIndex(snapshots[0].date);
    const lastMonth = monthIndex(snapshots.at(-1)!.date);
    const endMonth = Math.min(lastMonth, Math.max(firstMonth + 2, monthIndex(snapshot.date) + 1));
    const trendSnapshots = sampleDate ? snapshots : snapshots.filter(item => {
        const month = monthIndex(item.date);
        return month >= endMonth - 2 && month <= endMonth;
    });
    const available = new Set(trendSnapshots.flatMap(item => item.models
        .filter(model => model.targetPrice !== null).map(model => model.label)));
    const strategies = [...new Set(["SRIM", "PER", "PBR", "NCAV", ...available])].filter(label => available.has(label));
    const activeStrategy = strategies.includes(strategy) ? strategy : strategies[0];
    const strategyDescription = strategyDescriptions[activeStrategy];
    const data = trendSnapshots.map(item => ({
        time: Date.parse(item.date), price: item.price,
        target: item.models.find(model => model.label === activeStrategy)?.targetPrice ?? null,
    }));
    const firstTime = data[0].time;
    const lastTime = data[data.length - 1].time;
    const monthLabel = new Intl.DateTimeFormat("ko-KR", { month: "numeric", timeZone: "UTC" });
    const spansYears = new Date(firstTime).getUTCFullYear() !== new Date(lastTime).getUTCFullYear();
    const months = [...new Set(trendSnapshots.map(item => item.date.slice(0, 7)))];
    const timeTicks = sampleDate
        ? sampleYears.map(year => {
            const yearSnapshots = trendSnapshots.filter(item => item.date.startsWith(year));
            return Date.parse(yearSnapshots[Math.floor(yearSnapshots.length / 2)].date);
        })
        : months.map(month => Math.min(lastTime, Math.max(firstTime, Date.parse(`${month}-15`))));
    const selectTrendDate = (fraction: number) => {
        const time = firstTime + fraction * (lastTime - firstTime);
        const nearest = data.reduce((closest, point) =>
            Math.abs(point.time - time) < Math.abs(closest.time - time) ? point : closest);
        setDate(new Date(nearest.time).toISOString().slice(0, 10));
    };

    return <div className={styles.historyComparison}>
        {sampleDate && <div className={styles.yearControls} role="group" aria-label="비교 연도">
            {sampleYears.map(year => <button key={year} type="button" aria-pressed={year === selectedYear}
                onClick={() => {
                    const sameQuarter = year + snapshot.date.slice(4);
                    const latestInYear = snapshots.findLast(item => item.date.startsWith(year));
                    setDate(snapshots.some(item => item.date === sameQuarter) ? sameQuarter : latestInYear!.date);
                }}>{year}년</button>)}
        </div>}
        <div className={sampleDate ? styles.quarterControls : styles.dateControls} role="group" aria-label="비교 기준일">
            {dateButtons.map(item => {
                const quarter = Math.ceil(Number(item.date.slice(5, 7)) / 3);
                const dateLabel = item.date.replaceAll("-", ".");
                return <button key={item.date} type="button" aria-pressed={item.date === snapshot.date}
                    aria-label={sampleDate ? `${quarter}분기, ${dateLabel}` : dateLabel} onClick={() => setDate(item.date)}>
                    {sampleDate
                        ? <span className={styles.quarterLabel}>{quarter}분기</span>
                        : <span className={styles.dateYear}>{item.date.slice(0, 4)}<span>.</span></span>}
                    <span>{item.date.slice(5).replace("-", ".")}</span>
                </button>;
            })}
            {!sampleDate && snapshots.length > 3 && <label className={styles.datePicker}>
                <CalendarDays size={19} aria-hidden="true" />
                <select aria-label="전체 비교 날짜" value={snapshot.date} onChange={event => setDate(event.target.value)}>
                    {[...snapshots].reverse().map(item => <option key={item.date} value={item.date}>{item.date.replaceAll("-", ".")}</option>)}
                </select>
            </label>}
        </div>
        <PriceAxis snapshot={snapshot} market={market} historical />
        <section className={`${styles.chartCard} ${styles.trendCard}`} aria-labelledby="newsletter-trend">
            <div className={styles.trendHeading}>
                <h2 id="newsletter-trend" className={styles.marker}>
                    {activeStrategy ? `주가와 ${activeStrategy} 적정가 추이` : "주가 추이"}
                </h2>
                <div className={styles.legend}><span>주가</span>{activeStrategy && <span>{activeStrategy} 적정가</span>}</div>
            </div>
            <div className={styles.trend} data-no-swipe>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={data} margin={{ top: 8, right: 2, bottom: 0, left: 0 }} accessibilityLayer>
                        <XAxis type="number" dataKey="time" domain={["dataMin", "dataMax"]} ticks={timeTicks} minTickGap={sampleDate ? 4 : 18}
                            interval="preserveStartEnd" axisLine={{ stroke: "var(--newsletter-ink)" }}
                            tickFormatter={value => {
                                if (sampleDate) return `${new Date(value).getUTCFullYear()}년`;
                                return spansYears ? new Date(value).toISOString().slice(2, 7).replace("-", ".") : monthLabel.format(value);
                            }} />
                        <YAxis width={3} domain={["auto", "auto"]} tick={false} tickLine={false}
                            axisLine={{ stroke: "var(--newsletter-ink)" }} />
                        <Tooltip labelFormatter={value => new Date(Number(value)).toISOString().slice(0, 10)}
                            formatter={(value, name) => [formatPrice(Number(value), market), name]}
                            contentStyle={{ color: "var(--newsletter-ink)", background: "var(--newsletter-card)", borderColor: "var(--newsletter-line)" }} />
                        <ReferenceLine x={Date.parse(snapshot.date)} stroke="var(--newsletter-line)" strokeDasharray="4 3" />
                        <Line dataKey="price" name="주가" stroke="var(--newsletter-price)" strokeWidth={2.5}
                            strokeLinecap="round" strokeLinejoin="round" dot={data.length === 1} isAnimationActive={false} />
                        {activeStrategy && <Line dataKey="target" name={`${activeStrategy} 적정가`} type="stepAfter"
                            stroke="var(--newsletter-teal)" strokeWidth={3} strokeLinecap="round"
                            dot={data.length === 1} isAnimationActive={false} />}
                        <TrendDateSelector onSelect={selectTrendDate} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            {strategies.length > 1 && <div className={styles.controls} role="group" aria-label="추이 차트의 전략 선택">
                {strategies.map(model => <button key={model} type="button" aria-pressed={activeStrategy === model}
                    onClick={() => setStrategy(model)}>{model}</button>)}
            </div>}
            {strategyDescription && <aside className={styles.strategyNote} aria-label="선택한 전략 설명" aria-live="polite">
                <h3>{activeStrategy} 전략</h3>
                <p>{strategyDescription}</p>
            </aside>}
        </section>
        {!sampleDate && <details className={styles.note}>
            <summary className={styles.method}>스캔 및 전략 계산 기준</summary>
            <p>선택한 날짜 전후 최대 3개월의 저장된 스캔을 표시합니다. 차이율은 해당 날짜의 스캔 주가 기준입니다. NCAV는 저장된 비율을 주당 가격으로 환산합니다. PER은 EPS의 10배, PBR은 BPS의 1배, SRIM은 스캔의 EPS와 BPS에 요구수익률 8%를 적용합니다.</p>
        </details>}
    </div>;
}
