"use client";

import { ArrowDownRight, ArrowUpRight, ChevronRight, Coins, RefreshCw } from "lucide-react";
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
    const groups = (capital.groups ?? []).filter(group => group.id !== LIKES_GROUP_ID);
    const stocks = capital.stock_list ?? [];
    const tokens = (items: typeof stocks) => items.reduce((sum, stock) => sum + (numericValue(stock.token) ?? 0), 0);
    const ready = activity.state === "fulfilled";
    const money = (value: number) => country === "KR" ? won(value) : `$${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}`;
    const monthly = budget?.state === "fulfilled" ? budget.monthly_budget_krw : numericValue(capital.charge_info?.capital_charge_per_month);
    const assigned = new Map(activity.logs.map(log => [log, currentLogGroup(log, stocks, country)]));
    const unmatched = activity.logs.filter(log => !groups.some(group => group.id === assigned.get(log)));
    const rows = groups.map(group => ({ group, stocks: stocks.filter(stock => stock.group_id === group.id), logs: activity.logs.filter(log => assigned.get(log) === group.id) }));
    const timestamps = activity.logs.map(log => log.ts).filter(ts => Number.isFinite(ts) && ts > 0);
    const date = (ts: number) => new Date(ts).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
    const logValue = (value: number) => ready ? money(value) : activity.state === "rejected" ? "조회 실패" : "조회 중…";

    return (
        <section className="mb-5 space-y-4" aria-label="자동매매 플랜">
            <div className="rounded-2xl border border-brand/20 bg-brand-light p-4 dark:bg-brand-muted/20 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-sm font-bold text-neutral-800 dark:text-neutral-100"><Coins size={16} className="text-brand-ink" /> 자동매매 플랜</h3>
                    <span className="shrink-0 text-xs font-bold text-brand-ink">{tradingActive === null ? "상태 확인 중" : tradingActive ? "자동매매 ON" : "자동매매 OFF"}</span>
                </div>
                <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">종목별로 모인 포인트 · 원화 합계</p>
                <p className="mt-1 break-all text-3xl font-black tracking-tight tabular-nums text-neutral-900 dark:text-neutral-50">{won(tokens(stocks.filter(stock => stock.group_id !== LIKES_GROUP_ID)))}</p>
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                    <span>월 기본 예산 <b className="tabular-nums">{monthly === null ? "확인 중" : won(monthly)}</b></span>
                    <span>{groups.length}개 풀 · 그룹별 예산 설정 가능</span>
                </div>
                <ol className="mt-4 grid grid-cols-4 gap-1 border-t border-brand/15 pt-3 text-center text-[11px] font-bold text-brand-ink sm:text-xs">
                    {["예산 설정", "포인트 적립", "조건 확인", "주문·차감"].map((step, index) => <li key={step} className="min-w-0"><span className="mb-1 block text-[10px] opacity-60">0{index + 1}</span>{step}</li>)}
                </ol>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-1">
                <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">내 자동매매 풀</h4>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">포인트는 종목마다 따로 적립됩니다</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
                {rows.map(row => {
                    const { group } = row;
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
                    return (
                        <article key={group.id} className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-border-subtle-dark dark:bg-surface-dark-card">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0"><h5 className="break-words text-sm font-bold text-neutral-900 dark:text-neutral-100">{group.name}</h5><p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{row.stocks.length}종목 · 활성 {active.length}종목</p></div>
                                <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold", sell ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400" : "bg-brand/10 text-brand-ink")}>
                                    {sell ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}{group.dca ? "정액" : "일반"}{sell ? "매도" : "매수"}
                                </span>
                            </div>
                            <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                                <div><p className="text-xs text-neutral-500 dark:text-neutral-400">적립 포인트</p><p className="mt-1 break-all text-2xl font-black tabular-nums text-neutral-900 dark:text-neutral-100">{won(tokens(row.stocks))}</p></div>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">월 예산 {Number(group.budget_krw) > 0 ? won(group.budget_krw!) : "계좌 예산 분배"}</p>
                            </div>
                            <div className="mt-4 rounded-xl bg-surface-canvas p-3 dark:bg-surface-dark">
                                <p className={cn("flex items-center gap-1.5 text-xs font-bold", paused ? "text-neutral-500 dark:text-neutral-400" : "text-brand-ink")}><span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", paused ? "bg-neutral-400" : "bg-brand")} />{status}</p>
                                {fullSell ? <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">정액매도 OFF · 포인트와 무관하게 보유 전량을 매도합니다.</p> : closest?.budget ? <>
                                    <div className="mt-3 flex flex-wrap justify-between gap-1 text-[11px] text-neutral-500 dark:text-neutral-400"><span className="break-words">{closest.stock.name || closest.stock.symbol} · 1주 예산</span><span>{closest.budget.missing > 0 ? `${won(closest.budget.missing)} 더 필요` : `예산 기준 ${closest.budget.shares.toLocaleString("ko-KR")}주`}</span></div>
                                    <div role="progressbar" aria-label={`${group.name} ${closest.stock.symbol} 1주 예산 적립`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(closest.budget.percent)} className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-surface-dark-muted"><div className={cn("h-full rounded-full", paused ? "bg-neutral-400" : sell ? "bg-rose-400" : "bg-brand")} style={{ width: `${closest.budget.percent}%` }} /></div>
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
                                <a href={`#trading-pool-${encodeURIComponent(group.id)}`} className="flex min-h-11 items-center justify-between gap-2 text-xs font-bold text-brand-ink" aria-label={`${group.name} 종목·설정 보기`}>종목·설정 보기<ChevronRight size={14} /></a>
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
