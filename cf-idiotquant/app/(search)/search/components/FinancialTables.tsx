"use client";

import React, { useState } from "react";
import { formatKoreanUnit, ONE_HUNDRED_MILLION } from "../../../../components/utils/financeCalc";
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  ChevronRightIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface FinancialTablesProps {
    kiBS: any;
    kiIS: any;
}

export const FinancialTables = ({ kiBS, kiIS }: FinancialTablesProps) => {
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

    const renderTable = (title: string, subTitle: string, rows: any[], data: any, icon: React.ReactNode) => (
        <div className="mb-6 md:mb-10 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_0_30px_rgba(0,0,0,0.2)] overflow-hidden transition-colors duration-300">
            
            {/* Table Header Section */}
            <div className="px-4 py-3.5 md:px-6 md:py-4.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-gradient-to-r from-zinc-50/60 to-white dark:from-zinc-900/40 dark:to-zinc-950 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/40 dark:border-zinc-700/50 text-zinc-700 dark:text-zinc-300">
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-xs md:text-sm font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                            {title}
                        </h3>
                        <p className="text-[8px] md:text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.15em] font-mono mt-0.5">{subTitle}</p>
                    </div>
                </div>
            </div>

            {/* Table Content Area: Added isolate for containing stacking contexts */}
            <div className="overflow-x-auto custom-table-scrollbar isolate">
                <table className="w-full border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-zinc-50/70 dark:bg-zinc-900/40">
                            {/* Header Sticky Target: Responsive min-width setup */}
                            <th className="sticky left-0 z-30 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 md:px-6 md:py-3.5 text-left border-b border-zinc-200 dark:border-zinc-800 min-w-[150px] md:min-w-[200px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_12px_-6px_rgba(0,0,0,0.3)]">
                                <span className="text-[9px] md:text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Account Item</span>
                            </th>
                            {data?.output?.slice(0, 5).map((v: any, i: number) => (
                                <th key={i} className="px-4 py-3 md:px-6 md:py-3.5 text-right border-b border-zinc-200 dark:border-zinc-800 font-mono z-10">
                                    <div className="flex flex-col items-end">
                                        <span className={cn(
                                            "text-[8px] md:text-[9px] font-black tracking-wider mb-0.5 font-sans",
                                            i === 0 ? 'text-blue-500 dark:text-blue-400 font-extrabold italic' : 'text-zinc-400 dark:text-zinc-500'
                                        )}>
                                            {i === 0 ? 'RECENT' : `T-${i}`}
                                        </span>
                                        <span className={cn(
                                            "text-xs font-black tabular-nums tracking-tight",
                                            i === 0 ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"
                                        )}>
                                            {v.stac_yymm?.replace(/^(\d{4})(\d{2})$/, '$1.$2') || v.stac_yymm}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
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
                                        "group transition-all duration-150 transform-gpu",
                                        isHeader 
                                            ? 'bg-zinc-50/40 dark:bg-zinc-900/20 font-bold' 
                                            : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30',
                                        isCurrentHovered ? "relative z-50 shadow-sm" : "relative z-0"
                                    )}
                                    onMouseEnter={() => setHoveredRow(rowId)}
                                    onMouseLeave={() => {
                                        setHoveredRow(null);
                                        setActiveTooltip(null);
                                    }}
                                >
                                    {/* Account Label Column */}
                                    <td className={cn(
                                        "sticky left-0 handle-sticky-shadow z-20 px-4 py-3 md:px-6 md:py-3.5 text-left transition-colors duration-200 border-r border-zinc-100 dark:border-zinc-900/50",
                                        isHeader 
                                            ? 'bg-zinc-50 dark:bg-zinc-900/90 font-black text-zinc-950 dark:text-zinc-50' 
                                            : 'bg-white dark:bg-zinc-950 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900/40',
                                        isCore && !isHeader && "bg-blue-50/30 dark:bg-blue-950/10"
                                    )}>
                                        <div className="flex items-center justify-between gap-1 relative w-full">
                                            {/* 텍스트 컨테이너가 가로 지분을 다 채우도록 flex-1 처리 */}
                                            <div className="flex items-center gap-1 min-w-0 flex-1">
                                                <ChevronRightIcon className={cn(
                                                    "w-2.5 h-2.5 transition-all duration-300 shrink-0 hidden md:block",
                                                    isCurrentHovered ? 'opacity-100 translate-x-0 text-blue-500' : 'opacity-0 -translate-x-2 text-zinc-400'
                                                )} />
                                                <span className={cn(
                                                    "text-xs tracking-tight transition-transform duration-200 truncate block",
                                                    isCurrentHovered && "md:translate-x-0.5",
                                                    isHeader 
                                                        ? "font-black text-zinc-900 dark:text-white" 
                                                        : "font-medium text-zinc-600 dark:text-zinc-400",
                                                    isCore && !isHeader && "text-blue-600 dark:text-blue-400 font-semibold"
                                                )}>
                                                    {row.label}
                                                </span>
                                                {isCore && !isHeader && (
                                                    <span className="text-[7px] px-1 py-0.5 font-bold font-sans tracking-wide rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase scale-90 origin-left shrink-0">
                                                        Core
                                                    </span>
                                                )}
                                            </div>

                                            {/* 용어 설명 가이드 아이콘 (원래 글자를 가리지 않도록 고정 마진 확보) */}
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

                                            {/* 모바일 뷰포트 대응형 반응형 툴팁 레이어 */}
                                            {isTooltipActive && row.description && (
                                                <div className={cn(
                                                    "absolute z-[100] p-3 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-zinc-100 dark:text-zinc-200 shadow-xl border border-zinc-800 dark:border-zinc-700 text-[11px] leading-relaxed font-sans font-medium animate-in fade-in zoom-in-95 duration-150 pointer-events-none",
                                                    // Mobile: 항목 아래로 흐르게 설정 | Desktop(md): 우측 대기형 배치
                                                    "left-0 top-full mt-2 w-56 md:left-full md:top-1/2 md:-translate-y-1/2 md:ml-3 md:mt-0 md:w-64"
                                                )}>
                                                    <div className="font-bold text-blue-400 mb-1 flex items-center gap-1">
                                                        <span>{row.label}</span>
                                                        <span className="text-[9px] text-zinc-500 font-normal font-mono">[{row.key}]</span>
                                                    </div>
                                                    {row.description}
                                                    {/* 말꼬리 화살표 역시 미디어 쿼리로 분기 구조화 */}
                                                    <div className="absolute border-4 border-transparent md:block hidden left-0 right-full top-1/2 -translate-y-1/2 border-r-zinc-900 dark:border-r-zinc-800" />
                                                    <div className="absolute border-4 border-transparent md:hidden block bottom-full left-4 border-b-zinc-900 dark:border-b-zinc-800" />
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Financial Data Columns */}
                                    {data?.output?.slice(0, 5).map((v: any, i: number) => {
                                        const rawValue = v[row.key as keyof typeof v] || 0;
                                        const val = Number(rawValue);
                                        const isNegative = val < 0;

                                        return (
                                            <td 
                                                key={i} 
                                                className={cn(
                                                    "px-4 py-3 md:px-6 md:py-3.5 text-right font-mono tabular-nums transition-colors duration-200",
                                                    i === 0 && !isHeader && "bg-zinc-50/20 dark:bg-zinc-900/10"
                                                )}
                                            >
                                                <span className={cn(
                                                    isNegative 
                                                        ? "text-red-500 dark:text-red-400 font-semibold italic bg-red-500/5 dark:bg-red-500/10 px-1.5 py-0.5 rounded-md" 
                                                        : isHeader 
                                                            ? "text-zinc-900 dark:text-zinc-100 font-black" 
                                                            : "text-zinc-700 dark:text-zinc-300 font-medium",
                                                    i === 0 ? "text-[12px] md:text-[12.5px]" : "text-[11px] md:text-[11.5px] opacity-75"
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

            {/* Table Footer Frame Meta */}
            <div className="px-4 py-3 md:px-6 bg-zinc-50/70 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center relative z-10">
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tight">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" /> 코어 지표
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tight">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" /> 적자 항목
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tight">
                        <InformationCircleIcon className="w-3 h-3 text-zinc-400" /> 아이콘 호버 시 용어 설명
                    </div>
                </div>
                <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-600 tracking-[0.15em] uppercase font-mono self-end sm:self-auto">Unit: KRW (100M)</span>
            </div>

            {/* Local Custom Scrollbar Styles for cross-browser harmony */}
            <style jsx global>{`
                .custom-table-scrollbar::-webkit-scrollbar {
                    height: 5px;
                }
                .custom-table-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-table-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.2);
                    border-radius: 100px;
                }
                .custom-table-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(156, 163, 175, 0.4);
                }
                .handle-sticky-shadow {
                    box-shadow: 4px 0 8px -4px rgba(0, 0, 0, 0.05);
                }
                .dark .handle-sticky-shadow {
                    box-shadow: 4px 0 12px -6px rgba(0, 0, 0, 0.4);
                }
            `}</style>
        </div>
    );

    if (!kiBS?.output || !kiIS?.output) return null;

    return (
        <div className="space-y-4 md:space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 transform-gpu">
            {renderTable(
                "재무상태표", 
                "Balance Sheet Statement", 
                bsRows, 
                kiBS, 
                <DocumentTextIcon className="w-4 h-4 text-blue-500" />
            )}
            {renderTable(
                "손익계산서", 
                "Income Statement Structure", 
                isRows, 
                kiIS, 
                <ChartBarIcon className="w-4 h-4 text-emerald-500" />
            )}
        </div>
    );
};