"use client";

import React, { useMemo } from "react";
import { formatKoreanUnit } from "../../../../components/utils/financeCalc";
import { cn } from "@/lib/utils";
import { BarChart3, Calendar, Coins, TrendingUp } from "lucide-react";

interface MetricItem {
    label: string;
    val: string;
    sub?: string;
    highlight?: boolean;
    type?: "valuation" | "price" | "volume";
}

export const StockMetrics = ({ data, isUs }: { data: any; isUs: boolean }) => {
    // 데이터 존재 여부 확인
    if (!data) return null;

    // 헬퍼: 숫자 안전 변환 (NaN 방지)
    const n = (val: any) => {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

    // 데이터 가공 영역 (useMemo로 감싸 렌더링 성능 최적화)
    const metrics: MetricItem[] = useMemo(() => {
        if (isUs) {
            const detail = data.usDetail?.output;
            const search = data.usSearchInfo?.output;

            if (!detail || !search) return [];

            const usMarketCap = n(detail.last) * n(search.lstg_stck_num);
            const turnoverRatio = usMarketCap > 0
                ? (100 * n(detail.tamt) / usMarketCap).toFixed(3)
                : "0";

            return [
                { label: "PER", val: detail.perx ? `${detail.perx}배` : "-", type: "valuation" },
                { label: "PBR", val: detail.pbrx ? `${detail.pbrx}배` : "-", type: "valuation" },
                { label: "EPS", val: n(detail.epsx) ? `$${n(detail.epsx).toLocaleString()}` : "-", type: "valuation" },
                { label: "BPS", val: n(detail.bpsx) ? `$${n(detail.bpsx).toLocaleString()}` : "-", type: "valuation" },
                { label: "52주 최고", val: n(detail.h52p) ? `$${n(detail.h52p).toLocaleString()}` : "-", sub: detail.h52d, type: "price" },
                { label: "52주 최저", val: n(detail.l52p) ? `$${n(detail.l52p).toLocaleString()}` : "-", sub: detail.l52d, type: "price" },
                { label: "시가총액", val: `$${formatKoreanUnit(usMarketCap)}`, type: "volume" },
                { label: "상장주식수", val: n(search.lstg_stck_num) ? `${n(search.lstg_stck_num).toLocaleString()}개` : "-", type: "volume" },
                { label: "거래량", val: n(detail.tvol) ? `${n(detail.tvol).toLocaleString()}회` : "-", type: "volume" },
                { label: "거래대금", val: `$${formatKoreanUnit(n(detail.tamt))}`, type: "volume" },
                { label: "대금 / 시총", val: `${turnoverRatio}%`, highlight: true, type: "volume" },
            ];
        } else {
            if (!data.kiPrice?.output || !data.kiChart?.output1) return [];
            
            const p = data.kiPrice.output;
            const c = data.kiChart.output1;

            const calculatedMarketCap = n(c.stck_prpr) * n(c?.lstn_stcn ?? 1);
            const turnoverRatio = calculatedMarketCap > 0
                ? (100 * n(p.acml_tr_pbmn) / calculatedMarketCap).toFixed(3)
                : "0";

            return [
                { label: "PER", val: p.per ? `${p.per}배` : "-", type: "valuation" },
                { label: "PBR", val: p.pbr ? `${p.pbr}배` : "-", type: "valuation" },
                { label: "EPS", val: n(p.eps) ? `${n(p.eps).toLocaleString()}원` : "-", type: "valuation" },
                { label: "BPS", val: n(p.bps) ? `${n(p.bps).toLocaleString()}원` : "-", type: "valuation" },
                { label: "52주 최고", val: n(p.w52_hgpr) ? `${n(p.w52_hgpr).toLocaleString()}원` : "-", sub: p.w52_hgpr_date, type: "price" },
                { label: "52주 최저", val: n(p.w52_lwpr) ? `${n(p.w52_lwpr).toLocaleString()}원` : "-", sub: p.dryy_lwpr_date, type: "price" },
                { label: "시가총액", val: formatKoreanUnit(calculatedMarketCap), type: "volume" },
                { label: "상장주식수", val: n(c.lstn_stcn) ? `${n(c.lstn_stcn).toLocaleString()}개` : "-", type: "volume" },
                { label: "거래량", val: n(p.acml_vol) ? `${n(p.acml_vol).toLocaleString()}회` : "-", type: "volume" },
                { label: "거래대금", val: formatKoreanUnit(n(p.acml_tr_pbmn)), type: "volume" },
                { label: "대금 / 시총", val: `${turnoverRatio}%`, highlight: true, type: "volume" },
            ];
        }
    }, [data, isUs]);

    if (metrics.length === 0) return null;

    return (
        <div className="my-6 w-full rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 backdrop-blur-md p-5 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-all duration-300">
            {/* 데이터 그룹 가이드 헤더 */}
            <div className="mb-4 flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2.5">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        Financial Status Metrics
                    </h4>
                </div>
                <span className="text-[10px] font-mono font-medium text-zinc-400 dark:text-zinc-500 uppercase px-2 py-0.5 rounded-md bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-300/30 dark:border-white/5">
                    {isUs ? "USD Base" : "KRW Base"}
                </span>
            </div>

            {/* 메인 데이터 그리드 레이아웃 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                {metrics.map((m, i) => {
                    const isHighRiskTurnover = m.highlight;

                    return (
                        <div 
                            key={i} 
                            className={cn(
                                "relative flex flex-col justify-between p-3 rounded-xl border transition-all duration-200 group/item",
                                isHighRiskTurnover 
                                    ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40 col-span-2 sm:col-span-1" 
                                    : "bg-white dark:bg-zinc-900/50 border-zinc-200/60 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700"
                            )}
                        >
                            {/* 상단: 라벨 */}
                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-tight mb-1.5 uppercase font-sans">
                                {m.label}
                            </span>

                            {/* 하단: 수치 및 서브 텍스트 */}
                            <div className="flex flex-col items-baseline gap-0.5 w-full overflow-hidden">
                                <span 
                                    className={cn(
                                        "text-sm font-bold font-mono tracking-tight truncate w-full",
                                        isHighRiskTurnover 
                                            ? "text-blue-600 dark:text-blue-400 text-base" 
                                            : "text-zinc-800 dark:text-zinc-100"
                                    )}
                                >
                                    {m.val}
                                </span>
                                
                                {m.sub && (
                                    <div className="flex items-center gap-1 mt-0.5 text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                                        <Calendar className="w-2.5 h-2.5 shrink-0 opacity-60" />
                                        <span className="truncate">
                                            {m.sub.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* 데코용 우측 상단 미세 라인 포인트 */}
                            <div 
                                className={cn(
                                    "absolute top-2 right-2 w-1 h-1 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity",
                                    m.type === "valuation" && "bg-purple-400",
                                    m.type === "price" && "bg-rose-400",
                                    m.type === "volume" && "bg-emerald-400"
                                )} 
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};