"use client";

import { Heart, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiquidityBadge } from "./LiquidityBadge";
import { STRATEGY_LABEL, STRATEGY_BADGE, STRATEGY_HEX, STRATEGY_PRESETS_CLIENT } from "@/lib/constants/strategies";
import SectorSprite, { sectorAccent } from "./SectorSprite";

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
        <p className={cn("text-[13px] font-mono font-bold tabular-nums mt-0.5", ok ? "text-[#16a34a]" : "text-neutral-700 dark:text-neutral-200")}>
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
            className="cursor-pointer rounded-xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card overflow-hidden hover:border-brand-light-hover dark:hover:border-[#15803d]/60 hover:shadow-md transition-all"
        >
            {/* 헤더 — 주가 시리즈가 응답에 없어 차트 스프라이트는 생략하고 한 장을 100% 폭으로 */}
            <div className="relative h-[72px] border-b border-neutral-100 dark:border-border-subtle-dark">
                <SectorSprite
                    sector={sector}
                    color={sectorAccent(sector) ?? (strategy ? STRATEGY_HEX[strategy] : "#16a34a")}
                />
                {(sector || strategy) && (
                    <span className="absolute left-2 top-2 px-1.5 py-0.5 rounded bg-white/80 dark:bg-black/50 text-[9.5px] font-bold text-neutral-600 dark:text-neutral-300">
                        {sector ?? STRATEGY_LABEL[strategy!] ?? strategy}
                    </span>
                )}
            </div>

            <div className="p-4">
                <div className="flex items-start gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-neutral-900 dark:text-white truncate leading-tight">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10.5px] font-mono tracking-[0.05em] text-neutral-400">{item.ticker}</span>
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

                {strategy && (
                    <span className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mb-3", STRATEGY_BADGE[strategy] ?? "bg-surface-canvas text-neutral-500")}>
                        {STRATEGY_LABEL[strategy] ?? strategy}
                    </span>
                )}

                <div className="grid grid-cols-4 gap-1 py-2.5 border-y border-neutral-100 dark:border-border-subtle-dark">
                    <Metric label="NCAV" value={ncav > 0 ? `${ncav.toFixed(2)}x` : "—"} ok={ncav >= 1} />
                    <Metric label="PBR" value={pbr > 0 ? pbr.toFixed(2) : "—"} ok={pbr > 0 && pbr < 1} />
                    <Metric label="ROE" value={roe > 0 ? `${roe.toFixed(1)}%` : "—"} ok={roe >= 8} />
                    <Metric label="PER" value={per > 0 ? per.toFixed(1) : "—"} ok={per > 0 && per < 10} />
                </div>

                {why && (
                    <div className="mt-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#16a34a] mb-1">왜 걸렸나</p>
                        <p className="text-[11.5px] leading-relaxed text-neutral-600 dark:text-neutral-300 break-keep">{why}</p>
                    </div>
                )}

                {warn.length > 0 && (
                    <p className="mt-3 rounded-lg border border-[#fef3c7] dark:border-amber-900/40 bg-[#fffdf5] dark:bg-amber-950/10 px-2.5 py-2 text-[11px] leading-relaxed text-[#92400e] dark:text-amber-500 break-keep">
                        ⚠ {warn.join(" ")}
                    </p>
                )}

                <button
                    onClick={e => { e.stopPropagation(); onClick(item.ticker, item.name); }}
                    className="mt-3 w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-surface-canvas dark:bg-surface-dark hover:bg-[#16a34a] hover:text-white text-neutral-600 dark:text-neutral-400 text-xs font-bold transition-colors"
                >
                    분석 <ChevronRight size={12} />
                </button>
            </div>
        </div>
    );
}
