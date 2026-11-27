"use client";

import { useState, type KeyboardEvent } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, usePlotArea, XAxis, YAxis } from "recharts";
import { newsletterNumber, quarterNumber, valuationQuarters, type Market, type ValuationSnapshot } from "@/lib/utils/newsletterValuation";
import styles from "./newsletter.module.css";

export const strategyDescriptions: Partial<Record<string, string>> = {
    SRIM: "자기자본과 요구수익률을 초과하는 이익을 바탕으로 적정가를 추정합니다.",
    PER: "주당순이익(EPS)에 일정 배수를 곱해 적정가를 추정합니다.",
    PBR: "주당순자산(BPS)에 일정 배수를 곱해 적정가를 추정합니다.",
    NCAV: "유동자산에서 전체 부채를 뺀 금액을 바탕으로 주당 가치를 추정합니다.",
};

function formatPrice(price: number, market: Market) {
    return market === "US" ? `$${newsletterNumber(price, market)}` : `${newsletterNumber(price, market)}원`;
}

export function PriceAxis({ snapshot, market, historical = false, compact = historical, period }: {
    snapshot: ValuationSnapshot; market: Market; historical?: boolean; compact?: boolean; period?: string;
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
    const separation = compact ? 28 : 43;
    const height = Math.max(compact ? 160 : 220, points.length * separation + (compact ? 40 : 30));
    const y = (price: number) => compact
        ? 18 + (upper - price) / (upper - lower) * (height - 42)
        : 24 + (upper - price) / (upper - lower) * (height - 54);
    const ticks = Array.from({ length: Math.round((upper - lower) / tickStep) + 1 }, (_, i) => upper - i * tickStep);

    const labelYs = points.map(point => y(point.price));
    labelYs[labelYs.length - 1] = Math.min(height - 17, labelYs[labelYs.length - 1]);
    for (let i = labelYs.length - 2; i >= 0; i--) labelYs[i] = Math.min(labelYs[i], labelYs[i + 1] - separation);
    labelYs[0] = Math.max(17, labelYs[0]);
    for (let i = 1; i < labelYs.length; i++) labelYs[i] = Math.max(labelYs[i], labelYs[i - 1] + separation);

    return <>
        <section className={compact ? `${styles.chartCard} ${styles.historyAxisCard}` : styles.chartCard} aria-label="전략별 적정가 비교">
            <div className={styles.chartHeader}>
                {period ? <div className={styles.periodHeading} aria-live="polite">
                    <strong>{period}</strong>
                    <time dateTime={snapshot.date}>{(historical ? snapshot.date.slice(5) : snapshot.date).replaceAll("-", ".")} 기준</time>
                </div> : <time className={styles.marker} dateTime={snapshot.date}>
                    {snapshot.date.replaceAll("-", ".")} 기준
                </time>}
                <span>가격 ({market === "US" ? "USD" : "원"})</span>
            </div>
            {(!compact || points.length > 1) ? <div className={styles.axis} style={{ minHeight: `${height / 16}rem` }}>
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
            </div> : <p className={styles.priceOnly}>{points[0].label} <strong>{formatPrice(snapshot.price, market)}</strong></p>}
            {snapshot.source === "kis" && <p className={styles.note}>
                한국투자증권 종가
            </p>}
            {points.length === 1 && <p className={styles.note}>이 날짜에 계산할 수 있는 적정가가 없습니다.</p>}
        </section>
        {!compact && points.length > 1 && <p className={styles.highlight}>
            {points.length - 1}개 전략 중 {above}개의 적정가가 스캔 기준가보다 높아요.
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

export function HistoricalComparison({ snapshots, current, market, through, sample = false }: {
    snapshots: ValuationSnapshot[]; current?: ValuationSnapshot; market: Market; through: string; sample?: boolean;
}) {
    const [end, setEnd] = useState("");
    const [strategy, setStrategy] = useState("");
    const quarters = valuationQuarters(snapshots, through);
    const selected = quarters.find(item => item.end === end)
        ?? quarters.findLast(item => item.snapshot)
        ?? quarters[quarters.length - 1];
    const latestSelected = !!current && (end === "" || end === "latest");
    const snapshot = latestSelected ? current : selected.snapshot;
    const financials = latestSelected
        ? snapshots.find(point => point.date === current.date)?.financials
        : snapshot?.financials;
    const years = [...new Set(quarters.map(item => item.end.slice(0, 4)))];
    const trendQuarters = current ? valuationQuarters([current, ...snapshots], through) : quarters;
    const available = new Set(trendQuarters.flatMap(item => item.snapshot?.models
        .filter(model => model.targetPrice !== null).map(model => model.label) ?? []));
    if (trendQuarters.some(item => item.snapshot?.lossMaking)) {
        available.add("SRIM");
        available.add("PER");
    }
    const strategies = [...new Set(["SRIM", "PER", "PBR", "NCAV", ...available])].filter(label => available.has(label));
    const activeStrategy = strategies.includes(strategy) ? strategy : strategies[0];
    const strategyDescription = strategyDescriptions[activeStrategy];
    const usesEarnings = activeStrategy === "SRIM" || activeStrategy === "PER";
    const data = trendQuarters.map(item => ({
        end: item.end,
        time: Date.parse(item.end),
        price: item.snapshot?.price ?? null,
        target: item.snapshot?.models.find(model => model.label === activeStrategy)?.targetPrice ?? null,
        scanDate: item.snapshot?.date,
        loss: usesEarnings && !!item.snapshot?.lossMaking,
    }));
    const firstTime = data[0].time;
    const lastTime = data[data.length - 1].time;
    const latestIndex = current ? data.findIndex(point => point.scanDate === current.date) : -1;
    const selectedIndex = latestSelected ? latestIndex : data.findIndex(point => point.end === selected.end);
    const selectedPoint = data[selectedIndex];
    const selectedTime = selectedPoint?.time;
    const lossAreas = data.flatMap((point, index) => {
        if (!point.loss) return [];
        return [{
            x1: index === 0 ? firstTime : (data[index - 1].time + point.time) / 2,
            x2: index === data.length - 1 ? lastTime : (point.time + data[index + 1].time) / 2,
        }];
    });
    const selectedTarget = snapshot?.models.find(model => model.label === activeStrategy)?.targetPrice;
    const selectionNote = usesEarnings && snapshot?.lossMaking ? "적자 · 적정가 산정 제외"
        : activeStrategy && selectedTarget == null ? "적정가 산정 자료 없음"
        : "차트의 점을 눌러 분기를 확인하세요.";
    const timeTicks = years.map(year => {
        const yearPoints = data.filter(item => item.end.startsWith(year));
        return yearPoints[Math.floor(yearPoints.length / 2)].time;
    });
    const selectIndex = (index: number) => {
        const next = Math.min(data.length - 1, Math.max(0, index));
        setEnd(next === latestIndex ? "latest" : data[next].end);
    };
    const selectTrendDate = (fraction: number) => {
        const time = firstTime + fraction * (lastTime - firstTime);
        const nearest = data.reduce((index, point, next) =>
            Math.abs(point.time - time) < Math.abs(data[index].time - time) ? next : index, 0);
        selectIndex(nearest);
    };
    const handleTrendKey = (event: KeyboardEvent<HTMLDivElement>) => {
        const index = selectedIndex < 0 ? data.length - 1 : selectedIndex;
        const indices: Record<string, number> = {
            ArrowLeft: index - 1, ArrowDown: index - 1, ArrowRight: index + 1, ArrowUp: index + 1,
            Home: 0, End: data.length - 1,
        };
        if (indices[event.key] === undefined) return;
        event.preventDefault();
        selectIndex(indices[event.key]);
    };
    const period = latestSelected ? "최신 스캔" : `${selected.end.slice(0, 4)}년 ${quarterNumber(selected.end)}분기`;

    return <div className={styles.historyComparison}>
        <div className={styles.comparisonDetail}>
            {snapshot ? <PriceAxis snapshot={snapshot} market={market} historical={!latestSelected} compact period={period} />
                : <p className={styles.chartCard} role="status"><strong>{period}</strong> · 주가와 적정가 기록이 없습니다.</p>}
            {financials && <details className={styles.note}>
                <summary className={styles.method}>당시 재무정보 · {financials.source} {financials.filedDate} 공시</summary>
                <p>재무제표 기준일 {financials.endDate}</p>
                {snapshot?.sharesEndDate && <p>주식 수 기준일 {snapshot.sharesEndDate}</p>}
                <dl className={styles.financials}>
                    {([["자본총계", "equity"], ["유동자산", "currentAssets"], ["부채총계", "liabilities"]] as const).map(([label, key]) => {
                        const value = financials[key];
                        return <div key={key}><dt>{label}</dt><dd>{value === null ? "자료 없음" : formatPrice(value, market)}</dd></div>;
                    })}
                </dl>
            </details>}
        </div>
        {data.some(point => point.price !== null) && <section className={`${styles.chartCard} ${styles.trendCard}`} aria-labelledby="newsletter-trend">
            <div>
                <h2 id="newsletter-trend" className="sr-only">
                    {activeStrategy ? "주가와 적정가 추이" : "주가 추이"}
                </h2>
                <div className={styles.legend}>
                    <span>주가</span>
                    {activeStrategy && <span>{activeStrategy} 적정가</span>}
                    {lossAreas.length > 0 && <span className={styles.lossLegend}>적자 구간</span>}
                </div>
            </div>
            {strategies.length > 1 && <div className={styles.controls} role="group" aria-label="추이 차트의 전략 선택">
                {strategies.map(model => <button key={model} type="button" aria-pressed={activeStrategy === model}
                    onClick={() => setStrategy(model)}>{model}</button>)}
            </div>}
            <div className={styles.trend} data-no-swipe tabIndex={0} role="slider" aria-label="차트에서 비교 시점 선택"
                aria-valuemin={1} aria-valuemax={data.length} aria-valuenow={(selectedIndex < 0 ? data.length - 1 : selectedIndex) + 1}
                aria-valuetext={period} onKeyDown={handleTrendKey}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 8 }} accessibilityLayer={false}>
                        <CartesianGrid vertical={false} stroke="var(--newsletter-line)" strokeOpacity={0.55} strokeDasharray="3 4" />
                        <XAxis type="number" dataKey="time" domain={["dataMin", "dataMax"]} ticks={timeTicks} minTickGap={4}
                            interval="preserveStartEnd" axisLine={{ stroke: "var(--newsletter-ink)" }}
                            tickFormatter={value => `${new Date(value).getUTCFullYear() % 100}년`} />
                        <YAxis width={3} domain={["auto", "auto"]} tick={false} tickLine={false}
                            axisLine={{ stroke: "var(--newsletter-ink)" }} />
                        <Tooltip wrapperClassName={styles.trendTooltip} labelFormatter={value => data.find(point => point.time === Number(value))?.scanDate ?? ""}
                            formatter={(value, name) => [formatPrice(Number(value), market), name]}
                            contentStyle={{ color: "var(--newsletter-ink)", background: "var(--newsletter-card)", borderColor: "var(--newsletter-line)" }} />
                        {lossAreas.map(({ x1, x2 }) => <ReferenceArea key={x1} x1={x1} x2={x2}
                            fill="var(--newsletter-loss)" fillOpacity={0.18} stroke="none" />)}
                        {selectedTime !== undefined && <ReferenceLine x={selectedTime} stroke="var(--newsletter-teal)" strokeWidth={1.5} strokeDasharray="4 3" />}
                        <Line dataKey="price" name="주가" stroke="var(--newsletter-price)" strokeWidth={2.5}
                            strokeLinecap="round" strokeLinejoin="round" dot={{ r: 2.5 }} isAnimationActive={false} />
                        {activeStrategy && <Line dataKey="target" name={`${activeStrategy} 적정가`} type="stepAfter"
                            stroke="var(--newsletter-teal)" strokeWidth={3} strokeLinecap="round"
                            dot={{ r: 2.5 }} connectNulls={false} isAnimationActive={false} />}
                        <TrendDateSelector onSelect={selectTrendDate} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className={styles.trendFooter}>
                <strong>{period}</strong><p aria-live="polite">{selectionNote}</p>
                {current && latestIndex < 0 && !latestSelected && <button type="button" className={styles.latestScan}
                    onClick={() => setEnd("latest")}>최신 스캔 보기</button>}
            </div>
        </section>}
        {(!sample || strategyDescription) && <details className={styles.note}>
            <summary className={styles.method}>{sample ? "전략 설명" : "전략 및 데이터 기준"}</summary>
            {strategyDescription && <p><strong>{activeStrategy}</strong> · {strategyDescription}</p>}
            {!sample && <p>진행 중인 분기를 포함해 최근 20개 분기를 표시합니다. 분기별 최신 스캔을 우선 사용합니다. 스캔이 없는 분기의 주가는 한국투자증권에서 조회합니다. 기준일 전에 공개된 SEC 또는 OpenDART 재무를 확인할 수 있습니다. 공시 추정 적정가는 당시 주식 수와 주가의 기준이 일치할 때 계산합니다. 필요한 자료가 빠진 분기는 기준일 전에 공개된 가까운 공시를 사용합니다. 국내 종목은 공시된 보통주 발행 수와 최신 공시 연간 순이익을 사용합니다. 차이율은 비교 기준일의 주가를 기준으로 합니다. NCAV는 저장된 비율을 주당 가격으로 환산합니다. PER은 EPS의 10배, PBR은 BPS의 1배, SRIM은 EPS와 BPS에 요구수익률 8%를 적용합니다.</p>}
        </details>}
    </div>;
}
