"use client";

// 오늘 Cloudflare 무료 한도를 얼마나 썼는가 (관리자 전용).
//
// 이틀 연속으로 D1 하루 한도를 넘겨 로그인이 통째로 막혔는데, 넘기 전까지 아무 신호가
// 없었던 것이 문제의 절반이었다. 멎고 나서야 알았다. 그래서 남은 양을 여기서 본다.
//
// 화면은 막대 넷이 전부다. 그래프 라이브러리도, 기간 선택도 없다 — 알고 싶은 것은
// "오늘 넘길 것 같은가" 하나뿐이고, 거기에 더 붙이면 매번 읽어야 할 것이 늘어난다.

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import { apiRequest } from "@/lib/features/apiRequest";
import { cn } from "@/lib/utils";

interface Usage {
    available: boolean;
    reason?: string;
    day: string;
    limits: { d1RowsRead: number; d1RowsWritten: number; kvReads: number; kvWrites: number };
    used?: { d1RowsRead: number; d1RowsWritten: number; kvReads: number; kvWrites: number };
}

const ROWS = [
    { key: "d1RowsRead", label: "D1 읽기", unit: "행" },
    { key: "d1RowsWritten", label: "D1 쓰기", unit: "행" },
    { key: "kvReads", label: "KV 읽기", unit: "회" },
    { key: "kvWrites", label: "KV 쓰기", unit: "회" },
] as const;

/** 80% 를 넘으면 노랑, 다 쓰면 빨강. 색이 곧 "오늘 넘길 것 같은가" 의 답이다. */
function toneOf(pct: number) {
    if (pct >= 100) return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
    if (pct >= 80) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-500" };
    return { bar: "bg-[#16a34a]", text: "text-neutral-500 dark:text-neutral-400" };
}

export default function UsageCard() {
    const [usage, setUsage] = useState<Usage | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        apiRequest("/admin/usage").then(r => {
            if (!alive) return;
            setUsage(r?.success === false ? null : r?.data ?? null);
            setLoading(false);
        });
        return () => { alive = false; };
    }, []);

    return (
        <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200/70 dark:border-border-subtle-dark shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-4 pb-3">
                <Gauge size={13} className="text-neutral-400" />
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                    오늘 사용량
                </span>
                <span className="ml-auto text-[10px] text-neutral-400 dark:text-neutral-500">
                    한국시간 오전 9시 리셋
                </span>
            </div>

            <div className="px-5 pb-5">
                {loading && <div className="h-20 rounded-xl bg-surface-canvas dark:bg-surface-dark-hover animate-pulse" />}

                {/* 못 읽었을 때 0 으로 그리지 않는다 — "한 방울도 안 썼다" 로 읽혀 정확히
                    반대로 안심하게 된다. 왜 못 읽었는지를 그대로 적는다. */}
                {!loading && (!usage || !usage.available) && (
                    <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                        사용량을 읽지 못했습니다.
                        <span className="block mt-1 text-[11px] text-neutral-400 dark:text-neutral-500 break-words">
                            {usage?.reason ?? "서버에 닿지 못했습니다."}
                        </span>
                    </p>
                )}

                {!loading && usage?.available && usage.used && (
                    <div className="space-y-3">
                        {ROWS.map(({ key, label, unit }) => {
                            const used = usage.used![key];
                            const limit = usage.limits[key];
                            const pct = limit > 0 ? (used / limit) * 100 : 0;
                            const tone = toneOf(pct);
                            return (
                                <div key={key}>
                                    <div className="flex items-baseline justify-between gap-2 mb-1">
                                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{label}</span>
                                        <span className={cn("text-[11px] tabular-nums", tone.text)}>
                                            {used.toLocaleString()} / {limit.toLocaleString()}{unit}
                                            <b className="ml-1.5">{Math.round(pct)}%</b>
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-surface-dark-hover overflow-hidden">
                                        <div className={cn("h-full rounded-full transition-all", tone.bar)}
                                            style={{ width: `${Math.min(100, pct)}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
