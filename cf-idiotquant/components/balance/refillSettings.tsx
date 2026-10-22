"use client";

import { useEffect, useId, useState } from "react";
import { Coins, ChevronDown, Pencil, X } from "lucide-react";
import { DetailHelp } from "./detailHelp";

export interface RefillData {
    has_account: boolean;
    monthly_budget_krw: number;
    period_minutes: number;
    market_hours: string;
    active_count: number;
    per_tick_total: number;
    per_tick_per_stock: number;
    monthly_per_stock: number;
    saveState?: "init" | "pending" | "fulfilled" | "rejected";
}

const won = (n: number) => `₩${Math.round(Number(n) || 0).toLocaleString("ko-KR")}`;

export default function RefillSettings({
    data,
    isMaster,
    onSave,
}: {
    data: RefillData;
    isMaster?: boolean;
    onSave: (monthlyBudgetKrw: number) => void;
}) {
    const editorId = useId();
    const [editing, setEditing] = useState(false);
    const [budget, setBudget] = useState("");
    useEffect(() => {
        setBudget(String(data.monthly_budget_krw ?? 0));
    }, [data.monthly_budget_krw]);
    useEffect(() => {
        if (data.saveState === "fulfilled") setEditing(false);
        if (data.saveState === "rejected" && isMaster && data.has_account) setEditing(true);
    }, [data.saveState, isMaster, data.has_account]);

    const saving = data.saveState === "pending";
    const dirty = String(data.monthly_budget_krw ?? 0) !== budget.trim();
    const amount = Number(budget);
    const canEdit = !!isMaster && data.has_account;
    const canSave = canEdit && dirty && budget.trim() !== "" && Number.isFinite(amount) && amount >= 0 && !saving;
    const editorOpen = editing;

    return (
        <section className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 dark:border-border-subtle-dark dark:bg-surface-dark-card sm:p-4" aria-label="자동매매 토큰 리필">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <h4 className="flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-neutral-100"><Coins size={15} className="text-neutral-900 dark:text-neutral-100" />토큰 자동 리필<DetailHelp label="토큰 자동 리필">월 예산을 바탕으로 활성 종목에 원화 포인트를 나눠 적립합니다. 리필 주기는 {data.period_minutes}분으로 고정이며, 충전 시간은 {data.market_hours || "설정된 장중 시간"}입니다. 아래 금액은 저장된 계좌 기본 예산의 배분값이며, 풀별 예산 설정에 따라 실제 충전액은 달라질 수 있습니다. 실제 충전 내역은 충전 그래프에서 확인할 수 있습니다.</DetailHelp></h4>
                {canEdit ? <button type="button" aria-expanded={editorOpen} aria-controls={editorId} disabled={saving} onClick={() => { if (!editorOpen) setBudget(String(data.monthly_budget_krw ?? 0)); setEditing(!editorOpen); }} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-900/10 dark:hover:bg-neutral-100/10 disabled:opacity-50"><Pencil size={12} />예산 변경</button> : <span className="text-[11px] text-neutral-400">{data.has_account ? "읽기 전용" : "계좌 미등록"}</span>}
            </div>
            <dl className="mt-1 grid gap-1 sm:mt-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:gap-3">
                <div className="min-w-0 flex flex-wrap items-baseline justify-between gap-x-2 sm:block"><dt className="text-[11px] text-neutral-500 dark:text-neutral-400">월 충전 예산</dt><dd className="sm:mt-1 break-words text-sm font-semibold tracking-tight tabular-nums sm:text-lg text-neutral-900 dark:text-neutral-100">{won(data.monthly_budget_krw)}</dd></div>
                <div className="min-w-0 flex flex-wrap items-baseline justify-between gap-x-2 sm:block"><dt className="text-[11px] text-neutral-500 dark:text-neutral-400">전체 · {data.period_minutes}분마다</dt><dd className="sm:mt-1 break-words text-sm font-semibold tracking-tight tabular-nums sm:text-lg text-neutral-900 dark:text-neutral-100">+{won(data.per_tick_total)}</dd></div>
            </dl>
            <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">{data.active_count > 0 ? `활성 ${data.active_count}종목 · 종목당 +${won(data.per_tick_per_stock)} / ${data.period_minutes}분` : "활성 종목이 선정되면 배분됩니다"}</p>

            {editorOpen && <form id={editorId} noValidate onSubmit={event => { event.preventDefault(); if (canSave) onSave(Math.trunc(amount)); }} className="mt-3 space-y-2 border-t border-neutral-100 pt-3 dark:border-border-subtle-dark">
                <div className="flex items-center justify-between gap-2"><label htmlFor={`${editorId}-amount`} className="text-xs font-bold text-neutral-700 dark:text-neutral-300">월 예산 변경 (원)</label><button type="button" disabled={saving} aria-label="예산 변경 취소" onClick={() => { setBudget(String(data.monthly_budget_krw ?? 0)); setEditing(false); }} className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-surface-dark-muted"><X size={14} /></button></div>
                <div className="flex items-center gap-2">
                    <input id={`${editorId}-amount`} type="number" min={0} step={10000} inputMode="numeric" value={budget} onChange={event => setBudget(event.target.value)} disabled={!canEdit || saving} aria-label="자동매매 월 예산 (원)" className="min-h-11 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-base tabular-nums text-neutral-900 outline-none focus:border-neutral-300 dark:focus:border-neutral-600 disabled:opacity-50 dark:border-border-subtle-dark dark:text-neutral-100" />
                    <button type="submit" disabled={!canSave} className="min-h-11 shrink-0 rounded-lg bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-900 dark:hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40">{saving ? "저장 중…" : "저장"}</button>
                </div>
                {dirty && <p className="text-[11px] text-neutral-500 dark:text-neutral-400">저장 전 · 요약 금액은 현재 설정 기준입니다.</p>}
            </form>}
            {!data.has_account && <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">자동매매 계좌를 등록하면 예산을 설정할 수 있습니다.</p>}
            {data.saveState === "rejected" && <p role="alert" className="mt-2 text-xs text-rose-500">저장에 실패했습니다. 금액을 확인하고 다시 저장해 주세요.</p>}

            <details className="group/refill mt-2 border-t border-neutral-100 dark:border-border-subtle-dark">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 [&::-webkit-details-marker]:hidden">종목별 배분 상세<ChevronDown size={14} className="transition-transform group-open/refill:rotate-180" /></summary>
                <dl className="space-y-2 pb-1 text-xs">
                    <div className="flex flex-wrap justify-between gap-1"><dt className="text-neutral-500 dark:text-neutral-400">종목당 월 배분</dt><dd className="font-bold tabular-nums dark:text-neutral-100">{won(data.monthly_per_stock)}</dd></div>
                    <div className="flex flex-wrap justify-between gap-1"><dt className="text-neutral-500 dark:text-neutral-400">종목당 {data.period_minutes}분 배분</dt><dd className="font-bold tabular-nums dark:text-neutral-100">{won(data.per_tick_per_stock)}</dd></div>
                    <div className="flex flex-wrap justify-between gap-1"><dt className="text-neutral-500 dark:text-neutral-400">충전 시간 (KST)</dt><dd className="font-medium dark:text-neutral-100">{data.market_hours || "장중"}</dd></div>
                </dl>
            </details>
        </section>
    );
}
