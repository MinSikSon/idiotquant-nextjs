"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CONTROL_FOCUS_CLS, CONTROL_INPUT_CLS } from "@/lib/ui-controls";
import { assetGoalProgress } from "@/lib/assetGoal";

export default function AssetGoal({ target, current, onChange, format, unit, max, note, children }: {
    target: number;
    current: number | null;
    onChange: (value: number) => void;
    format: (value: number) => string;
    unit: string;
    max: number;
    note: string;
    children?: React.ReactNode;
}) {
    const [draft, setDraft] = useState<string | null>(null);
    const progress = current === null ? null : assetGoalProgress(current, target);
    return (
        <section aria-label="목표 자산" className="rounded-2xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card p-4 text-neutral-800 dark:text-neutral-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="text-[13px] font-bold flex flex-wrap items-center gap-2">
                    목표 자산
                    <input type="text" inputMode="decimal" aria-label={`목표 자산 (${unit})`}
                        value={draft ?? String(target)}
                        onFocus={e => e.currentTarget.select()}
                        onChange={e => {
                            const raw = e.target.value;
                            if (!/^\d*\.?\d*$/.test(raw)) return;
                            setDraft(raw);
                            if (raw !== "" && Number.isFinite(Number(raw))) {
                                onChange(Math.min(max, Number(raw)));
                            }
                        }}
                        onBlur={() => setDraft(null)}
                        className={cn(CONTROL_INPUT_CLS, "w-40 max-w-full bg-surface-canvas dark:bg-surface-dark-canvas px-3 py-2 text-base sm:text-sm text-right tabular-nums")} />
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{unit}</span>
                </label>
                {target > 0 && <button type="button" onClick={() => { setDraft(null); onChange(0); }} className={cn("min-h-11 min-w-11 rounded-lg px-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400", CONTROL_FOCUS_CLS)}>목표 해제</button>}
            </div>
            <p className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-400">{note} · 0은 목표 미설정</p>
            {target > 0 && (progress ? (
                <div className="mt-3 space-y-2 text-xs">
                    <div className="flex flex-wrap justify-between gap-2 font-bold">
                        <span>{progress.reached ? "목표 달성" : "목표 달성률"} {progress.percent.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%</span>
                        <span>{format(current!)} / {format(target)}</span>
                    </div>
                    <div role="progressbar" aria-label="목표 자산 달성률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, progress.percent)} className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, progress.percent)}%` }} />
                    </div>
                    <p>{progress.reached ? "목표 금액에 도달했습니다." : `목표까지 ${format(progress.remaining)} 남았습니다.`}</p>
                    {children}
                </div>
            ) : <p className="mt-3 text-xs">이 달의 자산·부채를 저장하면 달성 현황을 볼 수 있습니다.</p>)}
        </section>
    );
}
