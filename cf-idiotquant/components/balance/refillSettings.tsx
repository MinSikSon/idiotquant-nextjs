"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";

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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="bg-[#faf9f7] dark:bg-[#1f1e1b] border border-neutral-200/70 dark:border-[#3a3834] rounded-xl px-3 py-2.5 flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{label}</span>
            <span className="text-sm font-black text-neutral-800 dark:text-neutral-100 tabular-nums truncate">{value}</span>
            {sub && <span className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{sub}</span>}
        </div>
    );
}

export default function RefillSettings({
    data,
    isMaster,
    onSave,
}: {
    data: RefillData;
    isMaster?: boolean;
    onSave: (monthlyBudgetKrw: number) => void;
}) {
    const [budget, setBudget] = useState("");
    useEffect(() => {
        setBudget(String(data.monthly_budget_krw ?? 0));
    }, [data.monthly_budget_krw]);

    const saving = data.saveState === "pending";
    const dirty = String(data.monthly_budget_krw ?? 0) !== budget.trim();
    const canSave = !!isMaster && data.has_account && dirty && budget.trim() !== "" && !saving;

    return (
        <div className="space-y-3">
            {/* 요약: 모바일 2열, sm 이상 4열 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Stat label="총 리필량 (월)" value={won(data.monthly_budget_krw)} />
                <Stat label="리필 주기" value={`${data.period_minutes}분마다`} sub={data.market_hours || "장중"} />
                <Stat label="종목당 (5분)" value={won(data.per_tick_per_stock)} sub={`활성 ${data.active_count}종목`} />
                <Stat label="종목당 (월)" value={won(data.monthly_per_stock)} />
            </div>

            {/* 월 예산 조절 */}
            <div className="bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1">
                    <Coins size={13} className="text-[#16a34a]" />
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">월 예산 (총 리필량)</span>
                </div>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mb-2.5 leading-relaxed">
                    한 달 동안 활성 종목에 나눠 적립할 총액입니다. 종목당 금액은 활성 종목 수로 자동 분배되며, 리필 주기({data.period_minutes}분)는 시스템 고정입니다.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                        <span className="text-sm text-neutral-400">₩</span>
                        <input
                            type="number"
                            min={0}
                            step={10000}
                            inputMode="numeric"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            disabled={!isMaster || !data.has_account}
                            className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#1c1b19] text-sm text-neutral-800 dark:text-neutral-200 tabular-nums outline-none focus:border-[#16a34a] disabled:opacity-50"
                        />
                    </div>
                    <button
                        onClick={() => onSave(Math.trunc(Number(budget) || 0))}
                        disabled={!canSave}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#16a34a] hover:bg-[#15803d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        {saving ? "저장 중…" : "저장"}
                    </button>
                </div>
                {!data.has_account && (
                    <p className="text-[11px] text-amber-500 mt-2">자동매매 계좌(trading_account)가 없어 예산을 설정할 수 없습니다.</p>
                )}
                {data.has_account && !isMaster && (
                    <p className="text-[11px] text-neutral-400 mt-2">변경 권한이 없습니다.</p>
                )}
                {data.saveState === "rejected" && (
                    <p className="text-[11px] text-red-500 mt-2">저장에 실패했습니다. 값을 확인해 주세요.</p>
                )}
            </div>
        </div>
    );
}
