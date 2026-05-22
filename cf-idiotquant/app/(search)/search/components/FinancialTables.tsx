"use client";

import React, { useState } from "react";
import { formatKoreanUnit, ONE_HUNDRED_MILLION } from "../../../../components/utils/financeCalc";
import { cn } from "@/lib/utils";
import {
    ChartBarIcon,
    DocumentTextIcon,
    InformationCircleIcon,
    SparklesIcon,
    Squares2X2Icon
} from "@heroicons/react/24/outline";

interface FinancialTablesProps {
    kiBS: any;
    kiIS: any;
}

export default function FinancialTables({ kiBS, kiIS }: FinancialTablesProps) {
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    // 퀀트 투자 핵심 필터 지표 (IdiotQuant 코어 스트레이트)
    const coreMetrics = ["total_aset", "total_lblt", "total_cptl", "sale_account", "bsop_prti", "thtr_ntin"];

    // 재무상태표 계정과목 정밀 정의 및 가이드 사전
    const bsRows = [
        { label: "유동자산", key: "cras", description: "1년 내에 현금화할 수 있는 자산입니다. NCAV(청산가치) 전략에서 가장 핵심이 되는 안전마진의 원천입니다." },
        { label: "고정자산", key: "fxas", description: "설비, 토지, 무형자산 등 현금화에 1년 이상 걸리는 자산입니다. 가치투자에서는 보수적으로 평가합니다." },
        { label: "자산총계", key: "total_aset", isHeader: true, description: "유동자산과 고정자산의 합계로, 기업이 보유한 총 자산의 규모를 나타냅니다." },
        { label: "유동부채", key: "flow_lblt", description: "1년 이내에 갚아야 하는 채무입니다. 단기적 재무 리스크를 측정하는 지표입니다." },
        { label: "고정부채", key: "fix_lblt", description: "상환 기간이 1년 이상 남은 장기 채무입니다. 사채나 장기차입금 등이 포함됩니다." },
        { label: "부채총계", key: "total_lblt", isHeader: true, description: "기업이 짊어지고 있는 총 빚입니다. 청산가치 계산 시 자산에서 전액 차감되는 항목입니다." },
        { label: "자본금", key: "cpfn", description: "주주들이 기업을 설립하고 증자할 때 발행한 주식의 액면가 총액입니다." },
        { label: "이익잉여금", key: "prfi_surp", description: "기업이 벌어들인 순이익 중 배당하지 않고 사내에 축적한 알짜 현금 체력입니다. 많을수록 안전합니다." },
        { label: "자본총계", key: "total_cptl", isHeader: true, description: "자산총계에서 부채총계를 뺀 순자산입니다. 주주들의 실제 몫이자 S-RIM 모델의 기준점이 됩니다." },
    ];

    // 손익계산서 계정과목 정밀 정의 및 가이드 사전
    const isRows = [
        { label: "매출액", key: "sale_account", isHeader: true, description: "기업이 제품이나 서비스를 판매하여 얻은 총 영업 수입의 최상단 지표입니다." },
        { label: "매출원가", key: "sale_cost", description: "제품을 생산하거나 서비스를 구입하는 데 직접 소요된 가공비 및 원재료 비용입니다." },
        { label: "매출총이익", key: "sale_totl_prfi", description: "매출액에서 매출원가를 차감한 금액으로, 순수 제조 및 판매 마진을 뜻합니다." },
        { label: "판관비", key: "sell_mang", description: "판매비와 관리비의 약어로, 임직원 급여, 마케팅비, 사무실 임차료 등 관리 운영비용 일체입니다." },
        { label: "영업이익", key: "bsop_prti", isHeader: true, description: "매출총이익에서 판관비를 뺀 지표로, 기업 본연의 비즈니스로 벌어들인 진짜 수익력을 나타냅니다." },
        { label: "당기순이익", key: "thtr_ntin", isHeader: true, description: "영업이익에 영업외손익과 세금까지 모두 반영하여 최종적으로 회사가 거둔 최종 결산 순이익입니다." },
    ];

    const renderTable = (title: string, subTitle: string, rows: any[], data: any, icon: React.ReactNode, isBs: boolean) => (
        <div className="mb-8 md:mb-10 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/60 p-1 transform-gpu relative overflow-visible border border-zinc-300/60 dark:border-zinc-700/50 shadow-md transition-all">

            {/* 정갈한 미니멀 메인 카드 바디 */}
            <div className="w-full h-full rounded-[11px] bg-white dark:bg-zinc-950 relative z-10 overflow-visible flex flex-col border border-zinc-300 dark:border-zinc-800">

                {/* 은은하게 스며드는 탑 라이팅 아우라 */}
                <div className={cn(
                    "absolute inset-x-0 top-0 h-32 pointer-events-none z-0 opacity-20 dark:opacity-25 blur-2xl",
                    isBs ? "bg-gradient-to-b from-blue-500 to-transparent" : "bg-gradient-to-b from-emerald-500 to-transparent"
                )} />

                {/* Card Header (TCG 메인 프레임 인터페이스) */}
                <div className="px-5 py-3.5 md:px-6 md:py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between relative z-20 bg-zinc-50/80 dark:bg-zinc-900/40 rounded-t-[11px] backdrop-blur-sm">
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm",
                            isBs
                                ? "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800"
                                : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800"
                        )}>
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-sans">
                                {title}
                            </h3>
                            <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">{subTitle}</p>
                        </div>
                    </div>

                    {/* TCG 카드 등급 엠블럼 */}
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[9px] font-mono font-black px-2 py-0.5 rounded border tracking-wider uppercase flex items-center gap-1 shadow-sm whitespace-nowrap",
                            isBs
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                        )}>
                            <Squares2X2Icon className="w-3 h-3" /> {isBs ? "Card.01 BS" : "Card.02 IS"}
                        </span>
                    </div>
                </div>

                {/* Card Content (테이블 그리드 에어리어) */}
                <div className="overflow-x-auto custom-table-scrollbar overflow-y-visible z-10">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-zinc-100/60 dark:bg-zinc-900/30">
                                {/* 스티키 레이블 열 헤더 */}
                                <th className="sticky left-0 z-30 bg-white dark:bg-zinc-950 px-5 py-3 md:px-6 md:py-3.5 text-left border-b border-zinc-200 dark:border-zinc-800 min-w-[150px] md:min-w-[200px] handle-sticky-shadow whitespace-nowrap">
                                    <span className="text-[10px] md:text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider font-mono">FINANCE SPEC</span>
                                </th>
                                {data?.output?.slice(0, 5).map((v: any, i: number) => (
                                    <th key={i} className={cn(
                                        "px-5 py-3 md:px-6 md:py-3.5 text-right border-b border-zinc-200 dark:border-zinc-800 font-mono z-10 min-w-[110px] md:min-w-[140px] whitespace-nowrap",
                                        i === 0 && "bg-zinc-50/50 dark:bg-zinc-900/20"
                                    )}>
                                        <div className="flex flex-col items-end">
                                            <span className={cn(
                                                "text-[8px] font-mono tracking-widest uppercase font-black mb-0.5",
                                                i === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400'
                                            )}>
                                                {i === 0 ? '✦ RECENT' : `T - ${i}`}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-extrabold tabular-nums tracking-tight",
                                                i === 0 ? "text-zinc-950 dark:text-white underline decoration-amber-500/50 underline-offset-2" : "text-zinc-600 dark:text-zinc-400"
                                            )}>
                                                {v.stac_yymm?.replace(/^(\d{4})(\d{2})$/, '$1.$2') || v.stac_yymm}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                            {rows.map((row) => {
                                const isCore = coreMetrics.includes(row.key);
                                const isHeader = row.isHeader;
                                const rowId = `${title}-${row.key}`;
                                const isCurrentHovered = hoveredRow === rowId;
                                const isTooltipActive = activeTooltip === rowId;

                                return (
                                    <tr
                                        key={row.key}
                                        className={cn(
                                            "group transition-all duration-100 relative",
                                            isHeader
                                                ? 'bg-zinc-50/60 dark:bg-zinc-900/20'
                                                : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40',
                                            isCurrentHovered || isTooltipActive ? "z-50" : "z-0"
                                        )}
                                        onMouseEnter={() => setHoveredRow(rowId)}
                                        onMouseLeave={() => {
                                            setHoveredRow(null);
                                            setActiveTooltip(null);
                                        }}
                                    >
                                        {/* Account Item Sticky Cell */}
                                        <td className={cn(
                                            "sticky left-0 handle-sticky-shadow px-5 py-3 md:px-6 md:py-3.5 text-left transition-colors duration-100 border-r border-zinc-200/60 dark:border-zinc-800/40 whitespace-nowrap",
                                            isHeader
                                                ? 'bg-zinc-50 dark:bg-zinc-900 font-extrabold text-zinc-950 dark:text-zinc-50'
                                                : 'bg-white dark:bg-zinc-950 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900/60',
                                            isCore && !isHeader && "bg-gradient-to-r from-blue-500/[0.04] to-transparent",
                                            isCurrentHovered || isTooltipActive ? "z-50" : "z-20"
                                        )}>
                                            <div className="flex items-center justify-between gap-1 relative w-full overflow-visible">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <span className={cn(
                                                        "w-0.5 h-2.5 rounded-full transition-all duration-200 shrink-0",
                                                        isCurrentHovered ? "bg-zinc-500 dark:bg-zinc-400" : "bg-transparent",
                                                        isHeader && "bg-zinc-500 dark:bg-zinc-400"
                                                    )} />
                                                    <span className={cn(
                                                        "text-xs tracking-tight truncate block",
                                                        isHeader
                                                            ? "font-extrabold text-zinc-950 dark:text-white"
                                                            : "font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-zinc-100",
                                                        isCore && !isHeader && "text-blue-700 dark:text-blue-400 font-extrabold"
                                                    )}>
                                                        {row.label}
                                                    </span>
                                                    {isCore && !isHeader && (
                                                        <span className="text-[7px] font-mono px-1 py-0.5 font-black rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase tracking-wider scale-95 border border-blue-200 dark:border-blue-900/60 shrink-0">
                                                            CORE
                                                        </span>
                                                    )}
                                                </div>

                                                {/* 설명 가이드 트리거 아이콘 */}
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setActiveTooltip(rowId)}
                                                    onClick={() => setActiveTooltip(activeTooltip === rowId ? null : rowId)}
                                                    className={cn(
                                                        "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-all ml-2 shrink-0 p-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800",
                                                        isCurrentHovered || isTooltipActive ? "opacity-100 scale-105" : "opacity-0"
                                                    )}
                                                >
                                                    <InformationCircleIcon className="w-4 h-4" />
                                                </button>

                                                {/* 최상위 레이어 레이아웃 툴팁 가이드 레이어 */}
                                                {isTooltipActive && row.description && (
                                                    <div className={cn(
                                                        "absolute p-4 rounded-xl bg-zinc-900 dark:bg-zinc-900 text-white shadow-xl border border-zinc-700 text-[11px] leading-relaxed font-sans pointer-events-none w-64 backdrop-blur-md z-[9999] animate-in fade-in duration-100 shadow-black/40 whitespace-normal",
                                                        "left-1 top-full mt-2 md:left-full md:top-1/2 md:-translate-y-1/2 md:ml-3 md:mt-0 md:w-68"
                                                    )}>
                                                        <div className="font-extrabold text-amber-400 mb-2 flex items-center gap-1.5 border-b border-zinc-700 pb-1.5">
                                                            <SparklesIcon className="w-3.5 h-3.5 text-amber-400" />
                                                            <span className="text-[12px]">{row.label}</span>
                                                            <span className="text-[8px] text-zinc-400 font-mono tracking-wider ml-auto">[{row.key.toUpperCase()}]</span>
                                                        </div>
                                                        <p className="text-zinc-200 dark:text-zinc-200 font-medium leading-normal text-[11px] font-sans tracking-tight">
                                                            {row.description}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Financial Value Cells - whitespace-nowrap 추가로 2줄 분리 절대 방지 */}
                                        {data?.output?.slice(0, 5).map((v: any, i: number) => {
                                            const rawValue = v[row.key as keyof typeof v] || 0;
                                            const val = Number(rawValue);
                                            const isNegative = val < 0;

                                            return (
                                                <td
                                                    key={i}
                                                    className={cn(
                                                        "px-5 py-3 md:px-6 md:py-3.5 text-right font-mono tabular-nums transition-colors duration-100 whitespace-nowrap",
                                                        i === 0 && "bg-zinc-50/[0.3] dark:bg-zinc-900/[0.1]",
                                                        isHeader && "font-bold"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        isNegative
                                                            ? "text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60 inline-block whitespace-nowrap"
                                                            : isHeader
                                                                ? "text-zinc-950 dark:text-zinc-50 font-extrabold inline-block"
                                                                : "text-zinc-800 dark:text-zinc-200 font-bold inline-block",
                                                        i === 0 ? "text-[12.5px]" : "text-[11.5px] opacity-90"
                                                    )}>
                                                        {formatKoreanUnit(val * ONE_HUNDRED_MILLION)}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Card Footer (정갈한 메타 정보 영역) */}
                <div className="px-5 py-3.5 md:px-6 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center relative z-20 rounded-b-[11px] whitespace-nowrap">
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-center">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" /> CORE INDICATOR
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm" /> LOSS DEFICIT
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-tight font-sans">
                            <InformationCircleIcon className="w-4 h-4 text-zinc-400 shrink-0" /> 마우스 오버 시 가이드 활성화
                        </div>
                    </div>
                    <span className="text-[9px] font-black text-zinc-600 dark:text-zinc-400 tracking-wider font-mono bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 select-none">UNIT: KRW (100M)</span>
                </div>
            </div>

            <style jsx global>{`
                .custom-table-scrollbar::-webkit-scrollbar {
                    height: 5px;
                }
                .custom-table-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-table-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.3);
                    border-radius: 10px;
                }
                .custom-table-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(156, 163, 175, 0.5);
                }
                .handle-sticky-shadow {
                    box-shadow: 4px 0 8px -4px rgba(0, 0, 0, 0.06);
                }
                .dark .handle-sticky-shadow {
                    box-shadow: 8px 0 16px -10px rgba(0, 0, 0, 0.7);
                }
            `}</style>
        </div>
    );

    if (!kiBS?.output || !kiIS?.output) return null;

    return (
        <div className="space-y-5 md:space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 transform-gpu">
            {renderTable(
                "재무상태표",
                "Balance Sheet Statement",
                bsRows,
                kiBS,
                <DocumentTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
                true
            )}
            {renderTable(
                "손익계산서",
                "Income Statement Structure",
                isRows,
                kiIS,
                <ChartBarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                false
            )}
        </div>
    );
};