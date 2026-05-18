"use client";

import React, { useMemo } from "react";
import { formatKoreanUnit } from "../../../../components/utils/financeCalc";
import { cn } from "@/lib/utils";
import { BarChart3, Calendar, DollarSign, Coins, Sparkles, TrendingUp, ShieldAlert, Layers } from "lucide-react";

interface MetricItem {
    label: string;
    val: string;
    sub?: string;
    highlight?: boolean;
    type?: "valuation" | "price" | "volume";
}

const METRIC_THEMES: Record<string, any> = {
    valuation: {
        frame: "from-purple-500/50 via-indigo-500/30 to-purple-500/50",
        bg: "bg-white dark:bg-zinc-950",
        text: "bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent",
        dot: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]",
        icon: <Layers className="w-3 h-3 text-purple-500" />
    },
    price: {
        frame: "from-rose-500/50 via-orange-500/30 to-rose-500/50",
        bg: "bg-white dark:bg-zinc-950",
        text: "bg-gradient-to-r from-rose-600 to-orange-600 dark:from-rose-400 dark:to-orange-400 bg-clip-text text-transparent",
        dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
        icon: <TrendingUp className="w-3 h-3 text-rose-500" />
    },
    volume: {
        frame: "from-emerald-500/40 via-teal-500/20 to-emerald-500/40",
        bg: "bg-white dark:bg-zinc-950",
        text: "text-zinc-800 dark:text-zinc-100",
        dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
        icon: <Coins className="w-3 h-3 text-emerald-500" />
    },
    highlight: {
        frame: "from-pink-500 via-purple-600 via-cyan-400 to-pink-500",
        bg: "bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900/60",
        text: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent dark:drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]",
        dot: "bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]",
        glow: "shadow-[0_0_20px_rgba(219,39,119,0.2)] dark:shadow-[0_0_30px_rgba(168,85,247,0.3)]",
        animate: true,
        icon: <Sparkles className="w-3 h-3 text-pink-500 animate-pulse" />
    }
};

export const StockMetrics = ({ data, isUs }: { data: any; isUs: boolean }) => {
    if (!data) return null;

    const n = (val: any) => {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

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
        <div className="w-full h-full rounded-[2rem] p-[5px] bg-gradient-to-br from-zinc-300 via-zinc-200 to-zinc-400 dark:from-zinc-700 via-zinc-800/80 to-zinc-900 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform-gpu relative overflow-hidden transition-colors duration-300">
            {/* 정밀 배경 격자 데코 */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none z-0" />
            
            <div className="w-full h-full rounded-[1.8rem] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl p-5 sm:p-6 relative z-10 overflow-hidden flex flex-col justify-between">
                
                {/* 상단 래디얼 조명 백그라운드 */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100/40 via-transparent to-transparent dark:from-zinc-900/30 pointer-events-none z-0" />

                <div>
                    {/* 데이터 그룹 가이드 헤더 */}
                    <div className="mb-5 flex items-center justify-between border-b border-black/[0.06] dark:border-white/5 pb-3.5 z-10">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <BarChart3 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <div className="flex flex-col">
                                <h4 className="text-xs font-black uppercase tracking-[0.15em] italic text-zinc-800 dark:text-zinc-200">
                                    Financial Status Metrics
                                </h4>
                                <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider font-mono">Quant Strategy Indicators</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1 rounded-full border border-black/[0.03] dark:border-white/5 shadow-sm shrink-0">
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isUs ? "bg-amber-500" : "bg-emerald-500")} />
                            <span className="text-[9px] font-mono font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest italic whitespace-nowrap">
                                {isUs ? (
                                    <span className="flex items-center gap-0.5"><DollarSign className="w-2.5 h-2.5" />USD Base</span>
                                ) : (
                                    <span className="flex items-center gap-0.5"><Coins className="w-2.5 h-2.5" />KRW Base</span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 
                  [개선 핵심] 넓은 화면(md 분할 레이아웃 이상 및 대형 모니터) 환경에서 균등하게 한 줄에 3개씩 적재되도록 조율
                  - 기본 모바일: grid-cols-2 (2열)
                  - 태블릿 및 데스크톱 진입(sm, md, lg, xl 등): 전체 구간 grid-cols-3 (3열 고정)으로 와이드 정렬 유지
                */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3 z-10 flex-1 content-start">
                    {metrics.map((m, i) => {
                        const themeKey = m.highlight ? "highlight" : (m.type || "volume");
                        const currentTheme = METRIC_THEMES[themeKey];

                        return (
                            <div 
                                key={i} 
                                className={cn(
                                    "relative rounded-xl p-[2px] bg-gradient-to-br transform-gpu transition-all duration-300 group/item",
                                    currentTheme.frame,
                                    currentTheme.glow,
                                    currentTheme.animate && "bg-[length:200%_200%] animate-[gradient-xy_4s_ease_infinite]",
                                    // [개선] 3열 구조에서 하이라이트(대금/시총) 카드가 그리드를 깨뜨리지 않고 균일한 1칸 크기를 갖도록 조정
                                    m.highlight ? "col-span-1" : ""
                                )}
                            >
                                {/* 이너 미니 카드 컴포넌트 */}
                                <div className={cn("w-full h-full rounded-[10px] p-3 flex flex-col justify-between relative overflow-hidden border border-black/5 dark:border-white/5 transition-colors", currentTheme.bg)}>
                                    
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.01),transparent)] dark:bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.01),transparent)] pointer-events-none" />

                                    {/* 상단: 라벨 */}
                                    <div className="flex items-center justify-between w-full mb-1.5 gap-2">
                                        <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 tracking-wider uppercase whitespace-nowrap">
                                            {m.label}
                                        </span>
                                        <div className="opacity-40 group-hover/item:opacity-90 transition-opacity duration-300 shrink-0">
                                            {currentTheme.icon}
                                        </div>
                                    </div>

                                    {/* 하단 수치 영역 */}
                                    <div className="flex flex-col items-start gap-0.5 w-full overflow-hidden whitespace-normal break-all">
                                        <span 
                                            className={cn(
                                                "text-xs sm:text-sm font-black font-mono tracking-tight italic block leading-snug w-full",
                                                currentTheme.text,
                                                m.highlight ? "text-sm sm:text-base" : ""
                                            )}
                                        >
                                            {m.val}
                                        </span>
                                        
                                        {m.sub && (
                                            <div className="flex items-center gap-1 mt-0.5 text-[8px] text-zinc-400 dark:text-zinc-500 font-mono font-semibold whitespace-normal break-all">
                                                <Calendar className="w-2 h-2 shrink-0 opacity-50" />
                                                <span>
                                                    {m.sub.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 상단 활성화 네온 포인트 서클 */}
                                    <div 
                                        className={cn(
                                            "absolute top-2.5 right-2.5 w-1 h-1 rounded-full opacity-0 group-hover/item:opacity-100 transition-all duration-300 scale-50 group-hover/item:scale-100",
                                            currentTheme.dot
                                        )} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style jsx global>{`
                @keyframes gradient-xy {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>
        </div>
    );
};