"use client";

import React, { useMemo, useState } from "react";
import { 
    TableCellsIcon, 
    InformationCircleIcon, 
    ArrowDownTrayIcon,
    ChevronRightIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// --- Types ---
type FinnhubReport = {
    acceptedDate?: string;
    filedDate?: string;
    startDate?: string;
    endDate?: string;
    year?: number;
    report?: {
        bs?: Array<Record<string, any>>;
        ic?: Array<Record<string, any>>;
        cf?: Array<Record<string, any>>;
    };
};

interface Props {
    data: FinnhubReport[];
    className?: string;
    formatNumber?: (v: number | null | undefined) => string;
}

const SECTIONS = [
    {
        label: "Balance Sheet",
        sub: "대차대조표 (재무상태표)",
        items: [
            { 
                label: "현금 및 현금성 자산", 
                concept: ["us-gaap_CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalentsAtCarryingValue"],
                description: "즉시 현금화할 수 있는 가장 안전하고 유동성이 높은 자산입니다. 위기 상황에서 기업의 방어력을 나타냅니다."
            },
            { 
                label: "매출채권", 
                concept: ["us-gaap_AccountsReceivableNetCurrent", "AccountsReceivableNetCurrent"],
                description: "제품이나 서비스를 외상으로 판매하여 향후 고객에게 받아야 할 돈입니다. 회수가 지연되면 현금흐름이 악화될 수 있습니다."
            },
            { 
                label: "재고자산", 
                concept: ["us-gaap_InventoryNet", "InventoryNet"],
                description: "판매를 위해 보유 중인 원재료, 재공품, 제품 등의 자산입니다. 과도하게 쌓이면 덤핑 판매나 평가손실 리스크가 커집니다."
            },
            { 
                label: "유동자산 합계", 
                concept: ["us-gaap_AssetsCurrent", "AssetsCurrent"], 
                isBold: true,
                description: "1년 이내에 현금화할 수 있는 자산의 총합입니다. Benjamin Graham의 청산가치(NCAV) 계산 시 뼈대가 되는 핵심 지표입니다."
            },
            { 
                label: "자산 총계", 
                concept: ["us-gaap_Assets", "Assets"], 
                isBold: true,
                description: "기업이 소유한 유동자산과 비유동자산(설비, 무형자산 등)의 전체 합계입니다."
            },
            { 
                label: "부채 총계", 
                concept: ["us-gaap_Liabilities", "Liabilities"], 
                isBold: true,
                description: "기업이 미래에 갚아야 할 유동부채와 장기부채의 총합입니다. 청산가치 산정 시 유동자산에서 전액 차감됩니다."
            },
            { 
                label: "자본 총계", 
                concept: ["us-gaap_StockholdersEquity", "StockholdersEquity"], 
                isBold: true,
                description: "자산총계에서 부채총계를 차감한 순자산(주주지분)입니다. S-RIM 등 적정주가 모델의 주된 기초 체력 지표입니다."
            },
        ],
        accent: "bg-blue-500",
        textAccent: "text-blue-600 dark:text-blue-400"
    },
    {
        label: "Income Statement",
        sub: "손익계산서",
        items: [
            { 
                label: "매출액", 
                concept: ["us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerExcludingAssessedTax"], 
                isBold: true,
                description: "비즈니스 활동을 통해 거두어들인 총 수입의 최상단 지표(Top-line)입니다. 기업 성장 여부를 판가름하는 척도입니다."
            },
            { 
                label: "영업이익", 
                concept: ["us-gaap_OperatingIncomeLoss", "OperatingIncomeLoss"], 
                isBold: true,
                description: "매출액에서 매출원가와 판관비를 뺀 지표로, 기업 순수 비즈니스 본업의 실질적인 수익력을 직접 증명합니다."
            },
            { 
                label: "순이익", 
                concept: ["us-gaap_NetIncomeLoss", "NetIncomeLoss"], 
                isBold: true,
                description: "영업외손익, 금융비용, 법인세까지 모두 반영하여 최종 주주에게 귀속되는 기업 경영 활동의 최종 결산 성적표(Bottom-line)입니다."
            },
        ],
        accent: "bg-emerald-500",
        textAccent: "text-emerald-600 dark:text-emerald-400"
    },
    {
        label: "Cash Flow",
        sub: "현금흐름표",
        items: [
            { 
                label: "영업활동 현금흐름", 
                concept: ["us-gaap_NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivities"],
                description: "제품 판매 등 실제 영업 활동을 통해 회사 내부로 유입되거나 유출된 실제 현금입니다. 순이익보다 신뢰도가 높은 지표입니다."
            },
            { 
                label: "투자활동 현금흐름", 
                concept: ["us-gaap_NetCashProvidedByUsedInInvestingActivities", "NetCashProvidedByUsedInInvestingActivities"],
                description: "생산 설비(CAPEX) 확충, 자산 매각, 지분 투자 등으로 발생한 현금 흐름입니다. 우량 기업은 대개 마이너스(-)를 기록합니다."
            },
            { 
                label: "재무활동 현금흐름", 
                concept: ["us-gaap_NetCashProvidedByUsedInFinancingActivities", "NetCashProvidedByUsedInFinancingActivities"],
                description: "차입금 조달, 상환, 증자, 배당금 지급, 자사주 매입 등으로 인한 현금 변화입니다. 주주 환원이나 부채 상환 시 마이너스(-)가 됩니다."
            },
        ],
        accent: "bg-amber-500",
        textAccent: "text-amber-600 dark:text-amber-400"
    }
];

const defaultFmt = (v: number | null | undefined) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "-";
    return Math.round(v).toLocaleString();
};

export default function ModernFinancialTable({ data = [], className = "", formatNumber }: Props) {
    const fmt = formatNumber || defaultFmt;
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    const columns = useMemo(() => {
        return (Array.isArray(data) ? data : []).map((r) => {
            const dateStr = (r.endDate || r.filedDate || r.acceptedDate || "").split(" ")[0];
            const map = new Map<string, number | null>();

            const merge = (arr: any[] = []) => {
                arr.forEach(item => {
                    const concept = item?.concept || item?.label || "";
                    const val = item?.value ?? item?.val ?? item?.amount ?? null;
                    map.set(concept, val === null ? null : Number(val));
                });
            };

            merge(r.report?.bs);
            merge(r.report?.ic);
            merge(r.report?.cf);

            return { label: dateStr, map };
        });
    }, [data]);

    if (columns.length === 0) return null;

    return (
        <div className={cn(
            "w-full bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-colors duration-300 overflow-hidden",
            className
        )}>
            {/* Header Area */}
            <div className="px-4 py-4 md:px-6 md:py-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-zinc-50/50 to-white dark:from-zinc-900/20 dark:to-zinc-950">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 border border-zinc-200/30 dark:border-zinc-700/30 shrink-0">
                        <TableCellsIcon className="w-5 h-5 md:w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-sm md:text-lg font-black text-zinc-900 dark:text-white tracking-tight">상세 재무 데이터</h2>
                        <p className="text-[10px] md:text-xs text-zinc-500 font-medium tracking-wide flex items-center gap-1 mt-0.5">
                            <InformationCircleIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>계정과목에 호버하면 상세 투자 지표 가이드가 표시됩니다.</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Table Container: Contains isolated stacking contexts */}
            <div className="overflow-x-auto custom-scrollbar isolate">
                <table className="w-full border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-zinc-50/50 dark:bg-zinc-900/30">
                            {/* Sticky Account Label Column Header */}
                            <th className="sticky left-0 z-30 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 md:px-6 md:py-4 text-left border-b border-zinc-200 dark:border-zinc-800 min-w-[145px] md:min-w-[230px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_12px_-6px_rgba(0,0,0,0.3)]">
                                <span className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">Financial Metric</span>
                            </th>
                            {columns.map((col, idx) => (
                                <th key={idx} className="px-4 py-3 md:px-6 md:py-4 text-right border-b border-zinc-200 dark:border-zinc-800 font-mono z-10">
                                    <div className="flex flex-col items-end">
                                        <span className={cn(
                                            "text-[9px] md:text-[10px] font-bold tracking-wider mb-0.5",
                                            idx === 0 ? 'text-blue-500 font-extrabold italic' : 'text-zinc-400'
                                        )}>
                                            {idx === 0 ? 'LATEST REPORT' : `FY ${columns.length - idx}`}
                                        </span>
                                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">
                                            {col.label}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                        {SECTIONS.map((section) => (
                            <React.Fragment key={section.label}>
                                {/* Section Indicator Title Row */}
                                <tr className="bg-zinc-50/20 dark:bg-zinc-900/5 select-none relative z-10">
                                    <td className="sticky left-0 z-20 bg-zinc-50/60 dark:bg-zinc-900/40 border-r border-zinc-100/50 dark:border-zinc-900/50 px-4 py-2.5 md:px-6 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.03)]">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1 h-3.5 rounded-full shrink-0", section.accent)} />
                                            <span className={cn("text-[11px] font-black uppercase tracking-wider truncate", section.textAccent)}>
                                                {section.label}
                                            </span>
                                        </div>
                                    </td>
                                    <td colSpan={columns.length} className="px-4 py-2.5 md:px-6 bg-zinc-50/20 dark:bg-zinc-900/10">
                                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-sans">
                                            {section.sub}
                                        </span>
                                    </td>
                                </tr>
                                
                                {section.items.map((row, rowIndex) => {
                                    const rowId = `${section.label}-${rowIndex}`;
                                    const isCurrentHovered = hoveredRow === rowId;
                                    const isTooltipActive = activeTooltip === rowId;

                                    return (
                                        <tr 
                                            key={rowIndex} 
                                            className={cn(
                                                "group transition-all duration-150 transform-gpu",
                                                isCurrentHovered ? "relative z-50 shadow-sm bg-zinc-50/50 dark:bg-zinc-900/20" : "relative z-0 hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10"
                                            )}
                                            onMouseEnter={() => setHoveredRow(rowId)}
                                            onMouseLeave={() => {
                                                setHoveredRow(null);
                                                setActiveTooltip(null);
                                            }}
                                        >
                                            {/* Account Name Sticky Interactive Cell */}
                                            <td className={cn(
                                                "sticky left-0 z-20 px-4 py-3 md:px-6 md:py-3.5 text-left border-r border-zinc-100 dark:border-zinc-900 transition-colors duration-150 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_12px_-6px_rgba(0,0,0,0.2)]",
                                                "bg-white dark:bg-zinc-950 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900/50"
                                            )}>
                                                <div className="flex items-center justify-between gap-1 relative w-full">
                                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                        <ChevronRightIcon className={cn(
                                                            "w-2.5 h-2.5 transition-all duration-300 shrink-0 hidden md:block",
                                                            isCurrentHovered ? 'opacity-100 translate-x-0 text-zinc-500' : 'opacity-0 -translate-x-2 text-zinc-400'
                                                        )} />
                                                        {/* Anti-clipping structure layout */}
                                                        <span className={cn(
                                                            "text-xs tracking-tight truncate block flex-1 min-w-0",
                                                            row.isBold 
                                                                ? 'font-black text-zinc-900 dark:text-white' 
                                                                : 'font-medium text-zinc-600 dark:text-zinc-400',
                                                            isCurrentHovered && !row.isBold && "text-zinc-900 dark:text-zinc-200"
                                                        )}>
                                                            {row.label}
                                                        </span>
                                                    </div>

                                                    {/* 지표 정보 가이드 아이콘 단추 */}
                                                    {row.description && (
                                                        <button
                                                            type="button"
                                                            onMouseEnter={() => setActiveTooltip(rowId)}
                                                            onClick={() => setActiveTooltip(activeTooltip === rowId ? null : rowId)}
                                                            className={cn(
                                                                "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity ml-1.5 shrink-0 p-0.5 rounded",
                                                                isCurrentHovered ? "opacity-100" : "opacity-0 md:opacity-0"
                                                            )}
                                                        >
                                                            <InformationCircleIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}

                                                    {/* 지표 정의 정보 부유 패널 레이어 (z-[100] 최상단 고정) */}
                                                    {isTooltipActive && row.description && (
                                                        <div className={cn(
                                                            "absolute z-[100] p-3 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-zinc-100 dark:text-zinc-200 shadow-xl border border-zinc-800 dark:border-zinc-700 text-[11px] leading-relaxed font-sans font-medium animate-in fade-in zoom-in-95 duration-150 pointer-events-none",
                                                            // Responsive Toolkit Positioning Split
                                                            "left-0 top-full mt-2 w-56 md:left-full md:top-1/2 md:-translate-y-1/2 md:ml-3 md:mt-0 md:w-64"
                                                        )}>
                                                            <div className="font-bold text-blue-400 mb-1 flex items-center gap-1 flex-wrap">
                                                                <span>{row.label}</span>
                                                                <span className="text-[8px] text-zinc-500 font-normal font-mono truncate max-w-full">
                                                                    [{row.concept[0].replace('us-gaap_', '')}]
                                                                </span>
                                                            </div>
                                                            {row.description}
                                                            {/* Tooltip Arrow Element Shapes */}
                                                            <div className="absolute border-4 border-transparent md:block hidden left-0 right-full top-1/2 -translate-y-1/2 border-r-zinc-900 dark:border-r-zinc-800" />
                                                            <div className="absolute border-4 border-transparent md:hidden block bottom-full left-4 border-b-zinc-900 dark:border-b-zinc-800" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            
                                            {/* Data Value Stream Columns */}
                                            {columns.map((col, colIndex) => {
                                                const v = col.map.get(row.concept[0]) ?? col.map.get(row.concept[1]) ?? null;
                                                const isNegative = v !== null && v < 0;

                                                return (
                                                    <td key={colIndex} className="px-4 py-3 md:px-6 md:py-3.5 text-right font-mono tabular-nums">
                                                        {v === null ? (
                                                            <span className="text-zinc-200 dark:text-zinc-800/60 font-sans select-none">-</span>
                                                        ) : (
                                                            <span className={cn(
                                                                isNegative 
                                                                    ? "text-red-500 dark:text-red-400 font-semibold italic bg-red-500/5 dark:bg-red-500/10 px-1.5 py-0.5 rounded-md" 
                                                                    : row.isBold
                                                                        ? "text-zinc-900 dark:text-white font-black"
                                                                        : "text-zinc-700 dark:text-zinc-300 font-medium",
                                                                colIndex === 0 
                                                                    ? "text-[12.5px] md:text-[13px]" 
                                                                    : "text-[11.5px] md:text-[12px] opacity-75"
                                                            )}>
                                                                {fmt(v)}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer / Status Bar */}
            <div className="px-4 py-3 md:px-6 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center relative z-10">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
                        <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-sans">Live Connectivity</span>
                    </div>
                    <div className="hidden sm:block w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
                    <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 font-mono tracking-tight">DATA SOURCE: FINNHUB FUNDAMENTALS v1</span>
                </div>
                <div className="flex gap-1.5 self-end sm:self-auto">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase font-sans">BS</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase font-sans">IC</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase font-sans">CF</span>
                </div>
            </div>

            {/* Micro Scrollbar Component Optimization */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(161, 161, 170, 0.2);
                    border-radius: 100px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(161, 161, 170, 0.4);
                }
            `}</style>
        </div>
    );
}