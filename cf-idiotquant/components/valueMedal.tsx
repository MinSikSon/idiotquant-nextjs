"use client";

import { cn } from "@/lib/utils";
import { computeValueScore, type ValueTone } from "@/lib/utils/valueScore";

// 등급 메달 pill — 저평가 점수(NCAV·PBR·PER·ROE 종합)를 한 덩어리로 보여준다.
// 발굴 목록과 랜딩의 "오늘의 상위 발굴"이 같은 것을 써야 두 화면이 같은 제품으로 읽힌다.
const MEDAL_TONE: Record<ValueTone, string> = {
    legend: "bg-violet-100 text-violet-700 ring-violet-300 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800",
    treasure: "bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
    diamond: "bg-sky-50 text-sky-700 ring-sky-300 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-800",
    gold: "bg-yellow-50 text-yellow-700 ring-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-300 dark:ring-yellow-800",
    silver: "bg-neutral-100 text-neutral-600 ring-neutral-300 dark:bg-[#2c2b27] dark:text-neutral-300 dark:ring-[#4a4641]",
    bronze: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-900",
    iron: "bg-zinc-100 text-zinc-600 ring-zinc-300 dark:bg-zinc-900/40 dark:text-zinc-400 dark:ring-zinc-700",
    raw: "bg-stone-100 text-stone-600 ring-stone-300 dark:bg-stone-900/40 dark:text-stone-400 dark:ring-stone-700",
    clay: "bg-lime-50 text-lime-800 ring-lime-200 dark:bg-lime-950/30 dark:text-lime-500 dark:ring-lime-900",
    explore: "bg-neutral-50 text-neutral-400 ring-neutral-200 dark:bg-[#242320] dark:text-neutral-500 dark:ring-[#35332e]",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ValueMedal({ item, size = "sm" }: { item: any; size?: "sm" | "lg" }) {
    const v = computeValueScore(item);
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-black tabular-nums shrink-0",
                size === "lg" ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-[11px]",
                MEDAL_TONE[v.tone]
            )}
            title={`저평가 점수 ${v.score}/100 · ${v.label}등급 (NCAV·PBR·PER·ROE 종합)`}
        >
            <span aria-hidden>{v.medal}</span>{v.score}
        </span>
    );
}
