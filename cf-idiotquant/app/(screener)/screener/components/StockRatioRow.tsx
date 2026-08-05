"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiquidityBadge } from "./LiquidityBadge";
import { ValueMedal } from "@/components/valueMedal";
import { ratioMetrics, barPct } from "./ratioMetrics";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any>;

const 억 = (v: number) => `${Math.round(v).toLocaleString()}억`;
const x = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)}x`);

// 세 막대를 같은 축(scale)에 그려 길이 자체가 비율이 되게 한다. 숫자만 나열하면
// "유동자산 3000억 / 부채 1000억 / 시총 1500억" 을 머릿속에서 비교해야 하지만,
// 같은 축에 눕히면 어느 쪽이 큰지 한눈에 읽힌다.
function Bar({ label, value, scale, color, hint }: {
    label: string; value: number; scale: number; color: string; hint: string;
}) {
    return (
        <div className="flex items-center gap-2" title={hint}>
            <span className="w-[52px] shrink-0 text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider">{label}</span>
            <div className="relative flex-1 h-[18px] rounded-md bg-[#f2f0ec] dark:bg-[#2c2b27] overflow-hidden">
                <div
                    className={cn("absolute inset-y-0 left-0 rounded-md transition-[width] duration-500", color)}
                    style={{ width: `${barPct(value, scale)}%` }}
                />
            </div>
            <span className="w-[68px] shrink-0 text-right text-[11px] font-mono font-bold tabular-nums text-neutral-700 dark:text-neutral-200">
                {억(value)}
            </span>
        </div>
    );
}

const Ratio = ({ label, value, ok, hint }: { label: string; value: number | null; ok: boolean; hint: string }) => (
    <div className="text-center" title={hint}>
        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
        <p className={cn(
            "text-[13px] font-mono font-bold tabular-nums mt-0.5",
            value === null ? "text-neutral-400" : ok ? "text-[#16a34a]" : "text-neutral-700 dark:text-neutral-200"
        )}>
            {x(value)}
        </p>
    </div>
);

export function StockRatioRow({ item, onClick, isLiked, onToggleLike }: {
    item: Item;
    onClick: (ticker: string, name: string) => void;
    isLiked: boolean;
    onToggleLike: (ticker: string, name: string) => void;
}) {
    const m = ratioMetrics(item);

    return (
        <div
            onClick={() => onClick(item.ticker, item.name)}
            className="cursor-pointer rounded-xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] p-4 hover:border-[#86efac] dark:hover:border-[#15803d]/60 hover:shadow-md transition-all"
        >
            <div className="flex items-start gap-2 mb-3">
                <ValueMedal item={item} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-neutral-900 dark:text-white truncate leading-tight">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                        <span className="text-[10.5px] font-mono tracking-[0.05em] text-neutral-400 shrink-0">{item.ticker}</span>
                        <LiquidityBadge item={item} />
                    </div>
                </div>
                <button
                    onClick={e => { e.stopPropagation(); onToggleLike(item.ticker, item.name); }}
                    className={cn("p-1 rounded-lg shrink-0 transition-colors",
                        isLiked ? "text-rose-500" : "text-neutral-300 dark:text-neutral-600 hover:text-rose-400")}
                    title={isLiked ? "관심 해제" : "관심 추가"}
                >
                    <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                </button>
            </div>

            <div className="flex flex-col gap-1.5">
                <Bar label="유동자산" value={m.currentAssets} scale={m.scale} color="bg-[#16a34a]"
                     hint="유동자산 — 1년 안에 현금화할 수 있는 자산" />
                <Bar label="부채총계" value={m.liabilities} scale={m.scale} color="bg-[#d4525c]"
                     hint="부채총계 — 갚아야 할 돈 전체" />
                <Bar label="시가총액" value={m.marketCap} scale={m.scale} color="bg-neutral-400 dark:bg-neutral-500"
                     hint="시가총액 — 시장이 이 회사에 매긴 값" />
            </div>

            <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-[#35332e] grid grid-cols-3 gap-1">
                <Ratio label="순유동/시총" value={m.ncavMultiple} ok={(m.ncavMultiple ?? 0) >= 1}
                       hint="(유동자산 − 부채총계) ÷ 시가총액. 1x 이상이면 청산가치가 시가총액보다 큽니다." />
                <Ratio label="부채/유동자산" value={m.debtToAssets} ok={m.debtToAssets !== null && m.debtToAssets < 1}
                       hint="부채총계 ÷ 유동자산. 1x 미만이면 유동자산만으로 부채를 덮을 수 있습니다." />
                <Ratio label="시총/유동자산" value={m.capToAssets} ok={m.capToAssets !== null && m.capToAssets < 1}
                       hint="시가총액 ÷ 유동자산. 낮을수록 자산 대비 싸게 거래됩니다." />
            </div>

            <p className="mt-2 text-[10.5px] leading-relaxed text-neutral-500 dark:text-neutral-400 break-keep">
                순유동자산 <span className="font-mono font-bold">{억(m.netCurrent)}</span>
                {m.ncavMultiple !== null && m.ncavMultiple >= 1
                    ? " — 시가총액보다 큽니다(청산가치 이하 거래)."
                    : m.netCurrent < 0
                        ? " — 유동자산으로 부채를 덮지 못합니다."
                        : " — 시가총액에는 못 미칩니다."}
            </p>
        </div>
    );
}
