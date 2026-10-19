"use client";

import { useEffect, useId, useState } from "react";
import { Clock3, RefreshCw, Wallet, Zap } from "lucide-react";
import type { KrUsCapitalType } from "@/lib/features/capital/capitalSlice";
import { fundingMetrics, refillBuckets, refillWindowOpen, type TradingCash } from "@/lib/features/capital/fundingInsights";
import { DetailHelp } from "./detailHelp";
import { cn } from "@/lib/utils";

const won = (value: number) => `₩${Math.round(value).toLocaleString("ko-KR")}`;
const pct = (value: number | null) => value === null ? "—" : value > 0 && value < 0.01 ? "<0.01%" : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
const time = (at: number) => new Date(at).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });

export default function TradingFundingPanel({ country, capital, cash, tradingActive, live, onToggleLive, onRefresh }: {
    country: "KR" | "US";
    capital: KrUsCapitalType;
    cash: TradingCash;
    tradingActive: boolean | null;
    live: boolean;
    onToggleLive: () => void;
    onRefresh: () => void;
}) {
    const chartId = useId();
    const [now, setNow] = useState(0);
    const [range, setRange] = useState<60 | 1440>(60);
    useEffect(() => {
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);
    const observedAt = now || capital.refill_plan?.at || 0;
    const history = (capital.refill_history ?? []).filter(tick => Number.isFinite(tick.at) && tick.at <= observedAt && tick.buy_krw >= 0 && tick.sell_krw >= 0);
    const latest = [...history].sort((a, b) => b.at - a.at)[0];
    const metrics = fundingMetrics(capital, cash.krw);
    const buckets = refillBuckets(history, observedAt, range);
    const buyTotal = buckets.reduce((sum, bucket) => sum + bucket.buy, 0);
    const sellTotal = buckets.reduce((sum, bucket) => sum + bucket.sell, 0);
    const tickCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    const max = Math.max(1, ...buckets.map(bucket => bucket.buy + bucket.sell));
    const maxLabel = Math.max(...buckets.map(bucket => bucket.buy + bucket.sell));
    const inWindow = refillWindowOpen(country, observedAt);
    const ageMinutes = latest ? Math.max(0, Math.floor((observedAt - latest.at) / 60000)) : null;
    const enabled = tradingActive === true && inWindow;
    const status = tradingActive === null ? "상태 확인 중" : !tradingActive ? "자동매매 OFF · 충전 대기" : !inWindow ? "스케줄 밖 · 충전 대기" : metrics.hasPlan && !capital.refill_plan?.groups.length ? "활성 충전 대상 없음" : metrics.hasPlan && metrics.buyPerTick + metrics.sellPerTick === 0 ? "충전 배분액 0원" : latest && ageMinutes !== null && ageMinutes <= 10 ? "최근 충전 확인" : "충전 기록 확인 대기";
    const cashValue = cash.amount === null ? cash.state === "rejected" ? "잔고 조회 실패" : "잔고 확인 중" : cash.currency === "USD" ? `$${cash.amount.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : won(cash.amount);
    const ratioWidth = Math.max(0, Math.min(100, metrics.activeRatio ?? 0));
    const budgetKnown = capital.state === "fulfilled" || (capital.state === "pending" && capital.stock_list.length > 0);
    const budgetLabel = capital.state === "rejected" ? "조회 실패" : "확인 중";
    const unit = range === 60 ? "5분" : "1시간";

    return (
        <section className="mb-5 space-y-4 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-border-subtle-dark dark:bg-surface-dark-card sm:p-5" aria-label="충전 흐름과 예수금">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-neutral-100"><Zap size={16} className="text-brand-ink" /> 예수금 대비 자동 충전<DetailHelp label="충전·예산 계산 기준">예산 합계 비중은 ON인 풀의 활성 종목 적립 포인트(매수·매도) ÷ 현재 예수금입니다. 월 충전계획 비중은 마지막 실행의 매수 풀 월 예산 기준입니다. 충전은 예산 장부 적립이며 실제 현금 이체·예약이 아닙니다. 주문가능금액은 미결제·증거금 등에 따라 예수금과 다를 수 있습니다. 시간당 금액은 {metrics.period}분 배분 속도의 환산값이며 그래프는 실제 충전 기록만 표시합니다.</DetailHelp></h3>
                <div className="flex gap-2">
                    <button type="button" onClick={onToggleLive} aria-pressed={live} className={cn("min-h-11 rounded-lg border px-3 text-xs font-bold", live ? "border-brand/30 bg-brand/10 text-brand-ink" : "border-neutral-200 text-neutral-500 dark:border-border-subtle-dark dark:text-neutral-400")}>실시간 {live ? "ON" : "OFF"}</button>
                    <button type="button" onClick={onRefresh} aria-label="예수금과 충전 기록 새로고침" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 dark:border-border-subtle-dark dark:text-neutral-400"><RefreshCw size={15} className={cash.state === "pending" || capital.state === "pending" ? "animate-spin" : ""} /></button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="min-w-0 rounded-xl bg-surface-canvas p-4 dark:bg-surface-dark">
                    <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400"><Wallet size={13} /> {country === "KR" ? "국내 예수금" : "미국 달러 예수금"}{cash.state === "pending" && " · 갱신 중"}</p>
                    <p className="mt-2 break-all text-2xl font-black tabular-nums text-neutral-900 dark:text-neutral-50">{cashValue}</p>
                    <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{country === "US" ? cash.krw === null ? "달러 잔고·환율 확인 대기" : `원화 환산 ${won(cash.krw)} · $1 = ${won(cash.rate!)}` : "증권사 잔고의 예수금 총액 기준"}</p>
                    <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-border-subtle-dark">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                            <h4 className="flex items-center text-xs font-bold text-neutral-800 dark:text-neutral-100">활성 자동매매 예산 합계<DetailHelp label="활성 예산">ON인 풀의 활성 종목 적립 포인트 합계이며 매도 예산도 포함합니다. 비활성 종목과 OFF 풀은 제외합니다. 자동매매 실행이 OFF여도 적립된 예산은 남아 있습니다.</DetailHelp></h4>
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{budgetKnown ? `${metrics.activePools}개 풀 · ${metrics.activeStocks}종목` : budgetLabel}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <p className="min-w-0 break-all text-2xl font-black tracking-tight tabular-nums text-neutral-900 dark:text-neutral-50">{budgetKnown ? won(metrics.activeTotal) : budgetLabel}</p>
                            <p className="text-xl font-black tabular-nums text-brand-ink">{budgetKnown ? pct(metrics.activeRatio) : "—"}<span className="ml-1 text-[11px] font-normal text-neutral-500 dark:text-neutral-400">/ 예수금</span></p>
                        </div>
                        <div role="img" aria-label={`활성 종목 적립 예산은 예수금의 ${budgetKnown ? pct(metrics.activeRatio) : "확인 중"}`} className="mt-3 flex h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-surface-dark-muted">
                            {budgetKnown && <><div className="h-full bg-brand-ink" style={{ width: `${metrics.activeTotal > 0 ? ratioWidth * metrics.activeBuy / metrics.activeTotal : 0}%` }} /><div className="h-full bg-rose-400" style={{ width: `${metrics.activeTotal > 0 ? ratioWidth * metrics.activeSell / metrics.activeTotal : 0}%` }} /></>}
                        </div>
                        <details className="mt-1 text-xs text-neutral-500 dark:text-neutral-400"><summary className="min-h-11 cursor-pointer py-3 font-medium">매수·매도 예산 구성</summary><dl className="grid grid-cols-2 gap-2 text-xs">
                            <div className="min-w-0 rounded-lg bg-white/70 p-2 dark:bg-surface-dark-card"><dt className="text-[11px] text-brand-ink">● 매수 예산</dt><dd className="mt-1 break-all font-bold tabular-nums dark:text-neutral-100">{budgetKnown ? won(metrics.activeBuy) : "—"}</dd><dd className="mt-1 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">예수금의 {budgetKnown ? pct(metrics.activeBuyRatio) : "—"}</dd></div>
                            <div className="min-w-0 rounded-lg bg-white/70 p-2 dark:bg-surface-dark-card"><dt className="text-[11px] text-rose-500 dark:text-rose-400">■ 매도 예산</dt><dd className="mt-1 break-all font-bold tabular-nums dark:text-neutral-100">{budgetKnown ? won(metrics.activeSell) : "—"}</dd><dd className="mt-1 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">예수금의 {budgetKnown ? pct(metrics.activeSellRatio) : "—"}</dd></div>
                        </dl></details>
                        {budgetKnown && metrics.activeRatio !== null && metrics.activeRatio > 100 && <p className="mt-1 text-[11px] font-bold text-brand-ink">적립 예산이 현재 예수금보다 {won(metrics.activeTotal - cash.krw!)} 많습니다.</p>}
                    </div>
                    <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-neutral-200 pt-3 text-xs dark:border-border-subtle-dark">
                        <p className="text-neutral-500 dark:text-neutral-400">월 매수 충전계획</p>
                        <p className="flex flex-wrap gap-x-1 font-bold tabular-nums dark:text-neutral-100"><span>{metrics.hasPlan ? won(metrics.buyMonthly) : "확인 대기"}</span><span className="text-brand-ink">· {pct(metrics.monthlyRatio)}</span></p>
                    </div>
                    {cash.krw !== null && cash.krw <= 0 && <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">예수금이 0 이하이므로 비중을 계산하지 않습니다.</p>}
                </div>

                <div className="min-w-0 space-y-3">
                    <p className={cn("flex items-center gap-1.5 text-xs font-bold", enabled ? "text-brand-ink" : "text-neutral-500 dark:text-neutral-400")}><Clock3 size={13} />{status}</p>
                    <details><summary className="min-h-11 cursor-pointer py-3 text-xs font-bold text-neutral-500 dark:text-neutral-400">충전 속도·최근 충전 상세</summary><div className="space-y-3">
                    <div className="rounded-xl border border-neutral-200 p-4 dark:border-border-subtle-dark">
                        <p className={cn("flex items-center gap-1.5 text-xs font-bold", enabled ? "text-brand-ink" : "text-neutral-500 dark:text-neutral-400")}><Clock3 size={13} />{status}</p>
                        <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{country === "KR" ? "08:00–18:00" : "21:00–06:00"} KST · {metrics.period}분 주기 · {live ? "잔고·기록 30초마다 갱신" : "새로고침하면 최신 기록 반영"}</p>
                        <dl className="mt-4 grid grid-cols-2 gap-3">
                            <div className="min-w-0"><dt className="text-[11px] text-neutral-500 dark:text-neutral-400">{metrics.period}분당 매수 충전</dt><dd className="mt-1 break-all text-lg font-black tabular-nums text-brand-ink">{metrics.hasPlan ? `+${won(metrics.buyPerTick)}` : "—"}</dd></div>
                            <div className="min-w-0"><dt className="text-[11px] text-neutral-500 dark:text-neutral-400">시간당 매수 충전</dt><dd className="mt-1 break-all text-lg font-black tabular-nums dark:text-neutral-100">{metrics.hasPlan ? `+${won(metrics.buyPerHour)}` : "—"}</dd></div>
                        </dl>
                        <p className="mt-3 text-xs font-bold text-brand-ink">예수금의 {pct(metrics.tickRatio)} / {metrics.period}분 · {pct(metrics.hourlyRatio)} / 시간</p>
                        <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">마지막 실행 시 배분 속도입니다. 중단·스케줄 밖에서는 충전되지 않습니다.</p>
                        <p className="mt-2 text-[11px] text-rose-500 dark:text-rose-400">매도용 충전 {metrics.hasPlan ? `+${won(metrics.sellPerTick)} / ${metrics.period}분` : "기록 대기"} · 매수 충전 비중에서 제외</p>
                    </div>
                    <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100">마지막으로 확인된 실제 충전</p>
                        {latest ? <><p className="mt-2 break-all text-xl font-black tabular-nums text-brand-ink">+{won(latest.buy_krw + latest.sell_krw)}</p><p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{new Date(latest.at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} {time(latest.at)} · {ageMinutes === 0 ? "방금" : `${ageMinutes}분 전`} · 매수 {won(latest.buy_krw)} / 매도 {won(latest.sell_krw)}</p></> : <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">아직 충전 관측 기록이 없습니다. 기록 기능 배포 후 실제 자동 충전부터 표시합니다.</p>}
                    </div>
                    </div></details>
                </div>
            </div>

            <details className="border-t border-neutral-100 dark:border-border-subtle-dark"><summary className="min-h-11 cursor-pointer py-3 text-xs font-bold text-neutral-600 dark:text-neutral-300">시간별 충전 그래프</summary><div className="pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">시간별 실제 충전</h4><p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{unit} 단위 · 원화 포인트 · 확인된 {tickCount}회만 합산</p></div>
                    <div className="flex rounded-lg bg-surface-canvas p-1 dark:bg-surface-dark">{([60, 1440] as const).map(minutes => <button key={minutes} type="button" onClick={() => setRange(minutes)} aria-pressed={range === minutes} className={cn("min-h-11 rounded-md px-3 text-xs font-bold", range === minutes ? "bg-white text-brand-ink shadow-sm dark:bg-surface-dark-card" : "text-neutral-500 dark:text-neutral-400")}>{minutes === 60 ? "최근 1시간" : "최근 24시간"}</button>)}</div>
                </div>
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs"><span className="text-brand-ink">● 매수 +{won(buyTotal)}</span><span className="text-rose-500 dark:text-rose-400">■ 매도 +{won(sellTotal)}</span><span className="text-neutral-500 dark:text-neutral-400">최대 {won(maxLabel)} / {unit}</span></div>
                <svg viewBox="0 0 320 144" className="mt-3 h-36 w-full" preserveAspectRatio="none" role="img" aria-labelledby={chartId}>
                    <title id={chartId}>{range === 60 ? "최근 1시간" : "최근 24시간"} 실제 자동 충전 {tickCount}회, 매수 {won(buyTotal)}, 매도 {won(sellTotal)}. 비어 있는 구간은 충전 기록이 없습니다.</title>
                    {[12, 72, 132].map(y => <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="currentColor" className="text-neutral-100 dark:text-border-subtle-dark" />)}
                    {buckets.map((bucket, i) => {
                        const width = 320 / buckets.length;
                        const buyHeight = bucket.buy / max * 112, sellHeight = bucket.sell / max * 112;
                        return <g key={bucket.at}><title>{time(bucket.at)} · 충전 {bucket.count}회 · 매수 {won(bucket.buy)} · 매도 {won(bucket.sell)}</title><rect x={i * width + 2} y={132 - buyHeight} width={width - 4} height={buyHeight} rx="1" fill="currentColor" className="text-brand-ink" /><rect x={i * width + 2} y={132 - buyHeight - sellHeight} width={width - 4} height={sellHeight} rx="1" fill="currentColor" className="text-rose-400" /></g>;
                    })}
                </svg>
                <div className="flex justify-between text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400"><span>{observedAt ? time(buckets[0].at) : "—"}</span><span>{observedAt ? time(buckets[Math.floor(buckets.length / 2)].at) : "—"}</span><span>{observedAt ? time(observedAt) : "—"}</span></div>
                {!tickCount && <p className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">선택한 시간에 확인된 충전 기록이 없습니다.</p>}
                {history.length > 0 && <details className="mt-2 text-xs text-neutral-600 dark:text-neutral-300"><summary className="min-h-11 cursor-pointer py-3 font-medium">최근 충전 내역 보기</summary><ul className="divide-y divide-neutral-100 dark:divide-border-subtle-dark">{[...history].sort((a, b) => b.at - a.at).slice(0, 12).map((tick, i) => <li key={`${tick.at}-${i}`} className="flex flex-wrap justify-between gap-2 py-2"><span>{new Date(tick.at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit" })} {time(tick.at)}</span><span className="font-bold tabular-nums">매수 +{won(tick.buy_krw)} · 매도 +{won(tick.sell_krw)}</span></li>)}</ul></details>}
            </div></details>
        </section>
    );
}
