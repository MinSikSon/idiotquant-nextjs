"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronRight, Coins, RefreshCw } from "lucide-react";
import type { BudgetState, KrUsCapitalType, TradingActivityState } from "@/lib/features/capital/capitalSlice";
import { LIKES_GROUP_ID } from "@/lib/features/capital/capitalSlice";
import { currentLogGroup, executionTotals, numericValue, stockBudgetProgress } from "@/lib/features/capital/tradingSummary";
import { cn } from "@/lib/utils";

const won = (value: number) => `₩${Math.round(value).toLocaleString("ko-KR")}`;

export default function TradingCyclePanel({ country, capital, activity, budget, tradingActive }: {
    country: "KR" | "US";
    capital: KrUsCapitalType;
    activity: TradingActivityState;
    budget?: BudgetState;
    tradingActive: boolean | null;
}) {
    const panelId = useId();
    const [planExpanded, setPlanExpanded] = useState(false);
    const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());
    const groups = (capital.groups ?? []).filter(group => group.id !== LIKES_GROUP_ID);
    const stocks = capital.stock_list ?? [];
    const tokens = (items: typeof stocks) => items.reduce((sum, stock) => sum + (numericValue(stock.token) ?? 0), 0);
    const ready = activity.state === "fulfilled";
    const money = (value: number) => country === "KR" ? won(value) : `$${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}`;
    const monthly = budget?.state === "fulfilled" ? budget.monthly_budget_krw : capital.refill_plan?.account_monthly_krw ?? numericValue(capital.charge_info?.capital_charge_per_month);
    const assigned = new Map(activity.logs.map(log => [log, currentLogGroup(log, stocks, country)]));
    const unmatched = activity.logs.filter(log => !groups.some(group => group.id === assigned.get(log)));
    const rows = groups.map(group => ({ group, stocks: stocks.filter(stock => stock.group_id === group.id), logs: activity.logs.filter(log => assigned.get(log) === group.id) }));
    const timestamps = activity.logs.map(log => log.ts).filter(ts => Number.isFinite(ts) && ts > 0);
    const date = (ts: number) => new Date(ts).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
    const logValue = (value: number) => ready ? money(value) : activity.state === "rejected" ? "조회 실패" : "조회 중…";

    return (
        <section className="mb-5 space-y-2 sm:space-y-4" aria-label="자동매매 플랜">
            <div className="rounded-2xl border border-neutral-300/20 dark:border-neutral-600/20 bg-neutral-100 px-3 pb-3 dark:bg-neutral-800/20 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100"><button type="button" onClick={() => setPlanExpanded(value => !value)} aria-expanded={planExpanded} aria-controls={`${panelId}-plan`} className="flex min-h-11 items-center gap-1.5"><Coins size={16} className="text-neutral-900 dark:text-neutral-100" />자동매매 플랜<ChevronDown size={13} className={cn("transition-transform", planExpanded && "rotate-180")} /></button></h3>
                    <span className="shrink-0 text-xs font-bold text-neutral-900 dark:text-neutral-100">{tradingActive === null ? "상태 확인 중" : tradingActive ? "자동매매 ON" : "자동매매 OFF"}</span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 sm:mt-4 sm:block">
                    <div className="flex items-baseline gap-1.5 sm:block"><p className="text-[11px] text-neutral-500 dark:text-neutral-400 sm:text-xs"><span className="sm:hidden">적립</span><span className="hidden sm:inline">종목별로 모인 포인트 · 원화 합계</span></p><p className="break-all text-lg font-semibold tracking-tight tabular-nums text-neutral-900 dark:text-neutral-50 sm:mt-1 sm:text-3xl">{won(tokens(stocks.filter(stock => stock.group_id !== LIKES_GROUP_ID)))}</p></div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-neutral-600 dark:text-neutral-300 sm:mt-3 sm:justify-between sm:text-xs">
                        <span>월<span className="hidden sm:inline"> 기본 예산</span> <b className="tabular-nums">{monthly === null ? "확인 중" : won(monthly)}</b></span>
                        <span>{groups.length}개 풀<span className="hidden sm:inline"> · 그룹별 예산 설정 가능</span></span>
                    </div>
                </div>
                <ol id={`${panelId}-plan`} className={cn("mt-3 grid-cols-4 gap-1 border-t border-neutral-300/15 dark:border-neutral-600/15 pt-3 text-center text-[11px] font-bold text-neutral-900 dark:text-neutral-100 sm:mt-4 sm:text-xs", planExpanded ? "grid" : "hidden")}>
                    {["예산 설정", "포인트 적립", "조건 확인", "주문·차감"].map((step, index) => <li key={step} className="min-w-0"><span className="mb-1 block text-[10px] opacity-60">0{index + 1}</span>{step}</li>)}
                </ol>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-1 pt-1 sm:pt-0">
                <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">내 자동매매 풀</h4>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400"><span className="sm:hidden">눌러서 상세 보기</span><span className="hidden sm:inline">포인트는 종목마다 따로 적립됩니다</span></span>
            </div>
            <div className="grid gap-2 sm:gap-3 lg:grid-cols-2">
                {rows.map(row => {
                    const { group } = row;
                    const groupRefill = capital.refill_plan?.groups.find(item => item.group_id === group.id);
                    const sell = group.side === "sell";
                    const fullSell = sell && !group.dca;
                    const active = row.stocks.filter(stock => stock.action === "active");
                    const progress = active.map(stock => ({ stock, budget: stockBudgetProgress(stock, country, capital.frst_bltn_exrt) }));
                    const known = progress.filter(item => item.budget !== null);
                    const closest = [...known].sort((a, b) => b.budget!.percent - a.budget!.percent)[0];
                    const funded = known.filter(item => item.budget!.shares >= 1).length;
                    const paused = tradingActive !== true || group.is_trading_active === false;
                    const status = tradingActive === null ? "상태 확인 중" : !tradingActive ? "자동매매 OFF" : group.is_trading_active === false ? "풀 OFF" : !active.length ? "활성 종목 선정 대기" : fullSell ? "보유 수량 확인 후 전량 매도" : funded ? `${funded}종목 예산 확보 · 조건 확인 대기` : !known.length ? "시세 확인 필요" : "1주 예산 모으는 중";
                    const totals = executionTotals(row.logs);
                    const expanded = expandedPools.has(group.id);
                    const detailId = `${panelId}-pool-${encodeURIComponent(group.id)}`;
                    const compactStatus = tradingActive === null ? "확인 중" : !tradingActive ? "매매 OFF" : group.is_trading_active === false ? "풀 OFF" : !active.length ? "종목 대기" : fullSell ? "전량 매도" : funded ? "조건 대기" : !known.length ? "시세 대기" : "적립 중";
                    return (
                        <article key={group.id} className="min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-border-subtle-dark dark:bg-surface-dark-card sm:rounded-2xl sm:p-4">
                            <button type="button" aria-expanded={expanded} aria-controls={detailId} aria-label={`${group.name} 상세 ${expanded ? "접기" : "보기"}`} onClick={() => setExpandedPools(previous => { const next = new Set(previous); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next; })} className="w-full space-y-1.5 px-3 py-3 text-left">
                                <span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-bold text-neutral-900 dark:text-neutral-100" title={group.name}>{group.name}</span><span className={cn("shrink-0 text-[11px] font-bold", sell ? "text-rose-500 dark:text-rose-400" : "text-neutral-900 dark:text-neutral-100")}>{group.dca ? "정액" : "일반"}{sell ? "매도" : "매수"}</span><ChevronDown size={14} className={cn("shrink-0 text-neutral-400 transition-transform", expanded && "rotate-180")} /></span>
                                <span className="flex items-baseline justify-between gap-2"><span className="min-w-0 truncate text-[11px] text-neutral-500 dark:text-neutral-400">활성 {active.length}/{row.stocks.length} · {compactStatus}</span><span className="shrink-0 text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{won(tokens(row.stocks))}</span></span>
                            </button>
                            <div id={detailId} className={cn("border-t border-neutral-100 px-3 pb-3 dark:border-border-subtle-dark sm:border-0 sm:p-0", !expanded && "hidden")}>
                            <p className="mt-3 break-words text-sm font-bold text-neutral-900 dark:text-neutral-100">{group.name}</p>
                            <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                                <div><p className="text-xs text-neutral-500 dark:text-neutral-400">적립 포인트</p><p className="mt-1 break-all text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{won(tokens(row.stocks))}</p></div>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">월 예산 {Number(group.budget_krw) > 0 ? won(group.budget_krw!) : "계좌 예산 분배"}</p>
                            </div>
                            {groupRefill && <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">마지막 실행 기준 {capital.refill_plan?.period_minutes}분마다 <b className="tabular-nums text-neutral-900 dark:text-neutral-100">+{won(groupRefill.per_tick_krw)}</b> · 종목당 +{won(groupRefill.per_stock_krw)}</p>}
                            <div className="mt-4 rounded-xl bg-surface-canvas p-3 dark:bg-surface-dark">
                                <p className={cn("flex items-center gap-1.5 text-xs font-bold", paused ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-900 dark:text-neutral-100")}><span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", paused ? "bg-neutral-400" : "bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900")} />{status}</p>
                                {fullSell ? <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">정액매도 OFF · 포인트와 무관하게 보유 전량을 매도합니다.</p> : closest?.budget ? <>
                                    <div className="mt-3 flex flex-wrap justify-between gap-1 text-[11px] text-neutral-500 dark:text-neutral-400"><span className="break-words">{closest.stock.name || closest.stock.symbol} · 1주 예산</span><span>{closest.budget.missing > 0 ? `${won(closest.budget.missing)} 더 필요` : `예산 기준 ${closest.budget.shares.toLocaleString("ko-KR")}주`}</span></div>
                                    <div role="progressbar" aria-label={`${group.name} ${closest.stock.symbol} 1주 예산 적립`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(closest.budget.percent)} className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-surface-dark-muted"><div className={cn("h-full rounded-full", paused ? "bg-neutral-400" : sell ? "bg-rose-400" : "bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900")} style={{ width: `${closest.budget.percent}%` }} /></div>
                                    <p className="mt-2 text-[10px] text-neutral-500 dark:text-neutral-400">저장된 시세 기준 · 조건 충족 시 주문{sell ? " · 보유 수량 한도" : ""}</p>
                                </> : <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">{active.length ? "유효한 시세와 환율이 있어야 적립 진행률을 표시합니다." : "활성 종목이 선정되면 종목별 적립 진행률이 표시됩니다."}</p>}
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-3">
                                <div className="min-w-0"><dt className="text-[11px] text-neutral-500 dark:text-neutral-400">누적 매수 주문금</dt><dd className="mt-1 break-all text-sm font-bold tabular-nums dark:text-neutral-100">{logValue(totals.buy)}</dd></div>
                                <div className="min-w-0"><dt className="text-[11px] text-neutral-500 dark:text-neutral-400">누적 매도 주문금</dt><dd className="mt-1 break-all text-sm font-bold tabular-nums dark:text-neutral-100">{logValue(totals.sell)}</dd></div>
                            </dl>
                            {ready && totals.missing > 0 && <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">금액 미확인 {totals.missing}건 제외</p>}
                            <div className="mt-3 border-t border-neutral-100 pt-1 dark:border-border-subtle-dark">
                                {!fullSell && progress.length > 0 && <details className="text-xs text-neutral-600 dark:text-neutral-300"><summary className="min-h-11 cursor-pointer py-3 font-medium">종목별 적립 보기 ({progress.length})</summary><ul className="space-y-3 pb-3">{progress.map(({ stock, budget: point }) => <li key={stock.symbol} className="flex flex-wrap justify-between gap-1"><span className="break-words">{stock.name || stock.symbol}</span><span className="tabular-nums">{won(numericValue(stock.token) ?? 0)} · {point ? `${Math.round(point.percent)}%` : "시세 미확인"}</span></li>)}</ul></details>}
                                <a href={`#trading-pool-${encodeURIComponent(group.id)}`} className="flex min-h-11 items-center justify-between gap-2 text-xs font-bold text-neutral-900 dark:text-neutral-100" aria-label={`${group.name} 종목·설정 보기`}>종목·설정 보기<ChevronRight size={14} /></a>
                            </div>
                            </div>
                        </article>
                    );
                })}
            </div>
            {groups.length === 0 && <p className="rounded-xl border border-dashed border-neutral-200 p-5 text-center text-xs text-neutral-500 dark:border-border-subtle-dark dark:text-neutral-400">등록된 풀이 없습니다. 아래 종목 관리에서 그룹을 만들어 시작하세요.</p>}
            <div className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                <p>{ready && timestamps.length ? `${date(Math.min(...timestamps))} ~ ${date(Math.max(...timestamps))} · ${activity.logs.length}건` : "최근 조회 내역 기준"} · 주문 접수 합계이며 실제 체결 합계는 아닙니다.</p>
                {unmatched.length > 0 && <p className="mt-1">풀 연결 불가 {unmatched.length}건 · 매수 {logValue(executionTotals(unmatched).buy)} / 매도 {logValue(executionTotals(unmatched).sell)}</p>}
                {activity.state === "rejected" && <p role="alert" className="mt-1 text-rose-500">주문 내역 조회 실패 · 실행 현황에서 새로고침해 주세요.</p>}
            </div>
            <details className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                <summary className="flex min-h-11 cursor-pointer items-center gap-1.5 py-2 font-medium"><RefreshCw size={12} /> 포인트·집계 기준 안내 +</summary>
                <p>포인트는 원화 예산이며 종목별로 적립·사용됩니다. 풀 합계를 한 종목의 주문에 모두 사용할 수는 없습니다. 진행률 100%는 1주 예산 확보를 뜻하며 주문·체결 완료를 뜻하지 않습니다. 주문금은 {country === "US" ? "달러" : "원화"}로 표시하며 현재 소속 종목 기준이므로 풀 이동 전 주문도 포함될 수 있습니다. 전체 기간 누적은 아닙니다.</p>
            </details>
        </section>
    );
}
