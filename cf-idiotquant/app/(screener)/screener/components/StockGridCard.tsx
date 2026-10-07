"use client";

import { ChevronRight, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiquidityBadge } from "./LiquidityBadge";
import { STRATEGY_LABEL, STRATEGY_BADGE, STRATEGY_PRESETS_CLIENT } from "@/lib/constants/strategies";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any>;
const num = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const roeOf = (i: Item) => (num(i.bps) > 0 ? (num(i.eps) / num(i.bps)) * 100 : 0);
const 억 = (v: number) => `${Math.round(v).toLocaleString()}억`;

/* 왜 이 종목이 걸렸는지를 수치에서 문장으로 만든다 — 하드코딩 금지.
   2문장까지만. 3개를 넘으면 정보가 아니라 벽이 된다. */
export function whySelected(i: Item): string {
    const parts: string[] = [];
    const ncav = num(i.ncav_ratio);
    const netCurrent = num(i.current_assets) - num(i.total_liabilities);
    if (ncav >= 1) {
        parts.push(netCurrent > 0
            ? `시가총액 ${억(num(i.market_cap))}보다 순유동자산 ${억(netCurrent)}이 더 큽니다.`
            : `순유동자산이 시가총액의 ${ncav.toFixed(2)}배입니다.`);
    }
    if (num(i.pbr) > 0 && num(i.pbr) < 0.5) parts.push(`장부 순자산의 ${Math.round(num(i.pbr) * 100)}% 값에 거래됩니다.`);
    if (num(i.eps) > 0 && num(i.per) > 0 && num(i.per) < 10) parts.push(`한 해 이익의 ${num(i.per).toFixed(1)}배 가격입니다.`);
    if (roeOf(i) >= 8) parts.push(`ROE ${roeOf(i).toFixed(1)}%로 자기자본 대비 수익성이 좋습니다.`);
    return parts.slice(0, 2).join(" ");
}

// 주의 — 스캔 응답에 있는 신호만. 배당·변동성은 필드가 없어 다루지 않는다.
function cautions(i: Item): string[] {
    const out: string[] = [];
    if (num(i.market_cap) > 0 && num(i.market_cap) < 500) out.push("시가총액 500억 미만 — 거래량이 적어 사고팔기 어려울 수 있습니다.");
    if (num(i.eps) <= 0) out.push("최근 실적이 적자입니다.");
    if (num(i.bps) <= 0) out.push("자본잠식 상태입니다.");
    return out;
}

const Metric = ({ label, value, ok }: { label: string; value: string; ok?: boolean }) => (
    <div className="text-center">
        <p className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
        <p className={cn("text-[13px] font-mono font-bold tabular-nums mt-0.5", ok ? "text-brand" : "text-neutral-700 dark:text-neutral-200")}>
            {value}
        </p>
    </div>
);

export function StockGridCard({ item, onClick, isLiked, onToggleLike }: {
    item: Item;
    onClick: (ticker: string, name: string) => void;
    isLiked: boolean;
    onToggleLike: (ticker: string, name: string) => void;
}) {
    const strategy = STRATEGY_PRESETS_CLIENT.find(p => p.clientFilter?.(item))?.id ?? item.strategies?.[0] ?? null;
    const sector: string | undefined = item.sector ?? item.industry;
    const ncav = num(item.ncav_ratio);
    const pbr = num(item.pbr);
    const per = num(item.per);
    const roe = roeOf(item);
    const why = whySelected(item);
    const warn = cautions(item);

    return (
        <div
            onClick={() => onClick(item.ticker, item.name)}
            onKeyDown={e => {
                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick(item.ticker, item.name);
                }
            }}
            role="link"
            tabIndex={0}
            aria-label={`${item.name} 분석 보기`}
            className="cursor-pointer rounded-md border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card overflow-hidden hover:border-brand-light-hover dark:hover:border-brand-hover/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-all"
        >
            <div className="p-2 sm:p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5 sm:gap-2 sm:mb-2.5">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[12px] sm:text-sm font-extrabold text-neutral-900 dark:text-white truncate leading-tight">{item.name}</span>
                            {sector && <span className="hidden sm:inline shrink-0 text-[9px] font-bold text-neutral-400">{sector}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            <span className="text-[10px] font-mono tracking-[0.05em] text-neutral-400 shrink-0">{item.ticker}</span>
                            <LiquidityBadge item={item} />
                        </div>
                    </div>
                    <button
                        onClick={e => { e.stopPropagation(); onToggleLike(item.ticker, item.name); }}
                        className={cn("flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg shrink-0 transition-colors",
                            isLiked ? "text-rose-500" : "text-neutral-300 dark:text-neutral-600 hover:text-rose-400")}
                        title={isLiked ? "관심 해제" : "관심 추가"}
                    >
                        <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-0.5 py-1.5 sm:gap-1 sm:py-2 border-y border-neutral-100 dark:border-border-subtle-dark">
                    <Metric label="NCAV" value={ncav > 0 ? `${ncav.toFixed(2)}x` : "—"} ok={ncav >= 1} />
                    <Metric label="PBR" value={pbr > 0 ? pbr.toFixed(2) : "—"} ok={pbr > 0 && pbr < 1} />
                    <Metric label="ROE" value={roe > 0 ? `${roe.toFixed(1)}%` : "—"} ok={roe >= 8} />
                    <Metric label="PER" value={per > 0 ? per.toFixed(1) : "—"} ok={per > 0 && per < 10} />
                </div>

                <div className="mt-1.5 sm:mt-2 flex items-center gap-1 min-w-0">
                    {strategy && (
                        <span className={cn("shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold", STRATEGY_BADGE[strategy] ?? "bg-surface-canvas text-neutral-500")}>
                            {STRATEGY_LABEL[strategy] ?? strategy}
                        </span>
                    )}
                    {warn.length > 0 ? (
                        <span title={warn.join(" ")} className="min-w-0 truncate text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            ⚠ {warn[0]}
                        </span>
                    ) : why ? (
                        <span title={why} className="min-w-0 truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                            {why}
                        </span>
                    ) : <span className="flex-1" />}
                    <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-bold text-brand">분석 <ChevronRight size={11} /></span>
                </div>
            </div>
        </div>
    );
}
