"use client";

import React, { useState } from "react";
import { formatKoreanUnit, ONE_HUNDRED_MILLION } from "../../../../components/utils/financeCalc";
import { cn } from "@/lib/utils";
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  ChevronRightIcon,
  InformationCircleIcon,
  SparklesIcon,
  Squares2X2Icon,
  ShieldExclamationIcon
} from "@heroicons/react/24/outline";

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

    const renderTable = (title: string, subTitle: string, rows: any[], data: any, icon: React.ReactNode, isBs: boolean) => (
        <div className="mb-6 md:mb-10 rounded-[2rem] p-[5px] bg-gradient-to-br from-zinc-300 via-zinc-200 to-zinc-400 dark:from-zinc-700 via-zinc-800/80 to-zinc-900 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform-gpu relative overflow-hidden transition-colors duration-300">
            
            {/* 정밀 배경 격자 데코레이션 패널 */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />
            
            {/* 메인 이너 컨테이너 */}
            <div className="w-full h-full rounded-[1.8rem] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl relative z-10 overflow-hidden flex flex-col">
                
                {/* 상단 테마별 래디얼 그라데이션 조명 조절 */}
                <div className={cn(
                    "absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] pointer-events-none z-0 opacity-40 dark:opacity-20",
                    isBs ? "from-blue-100 via-transparent to-transparent" : "from-emerald-100 via-transparent to-transparent"
                )} />

                {/* Table Header Section */}
                <div className="px-5 py-4 md:px-7 md:py-5 border-b border-black/[0.06] dark:border-white/5 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-xs md:text-sm font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                                {title}
                            </h3>
                            <p className="text-[8px] md:text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.15em] font-mono mt-0.5">{subTitle}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1 rounded-full border border-black/[0.03] dark:border-white/5 shadow-sm">
                        <span className="text-[8px] font-mono font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest italic flex items-center gap-1">
                            <Squares2X2Icon className="w-2.5 h-2.5" /> {isBs ? "Statement 01" : "Statement 02"}
                        </span>
                    </div>
                </div>

                {/* Table Content Area */}
                <div className="overflow-x-auto custom-table-scrollbar isolate z-10">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-zinc-50/60 dark:bg-zinc-900/40">
                                {/* 스티키 가로 헤더 셀 */}
                                <th className="sticky left-0 z-30 bg-zinc-50 dark:bg-zinc-900 px-5 py-3 md:px-7 md:py-4 text-left border-b border-black/[0.06] dark:border-white/5 min-w-[160px] md:min-w-[220px] handle-sticky-shadow">
                                    <span className="text-[9px] md:text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Account Item</span>
                                </th>
                                {data?.output?.slice(0, 5).map((v: any, i: number) => (
                                    <th key={i} className="px-5 py-3 md:px-7 md:py-4 text-right border-b border-black/[0.06] dark:border-white/5 font-mono z-10">
                                        <div className="flex flex-col items-end">
                                            <span className={cn(
                                                "text-[8px] md:text-[9px] font-black tracking-wider mb-0.5 font-sans italic",
                                                i === 0 ? 'text-amber-500 dark:text-amber-400 font-extrabold' : 'text-zinc-400 dark:text-zinc-500'
                                            )}>
                                                {i === 0 ? '✨ RECENT' : `T-${i}`}
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
                        <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.02]">
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
                                            "group transition-all duration-150 transform-gpu relative",
                                            isHeader 
                                                ? 'bg-zinc-50/30 dark:bg-zinc-900/10 font-bold' 
                                                : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20',
                                            isCurrentHovered ? "z-40" : "z-0"
                                        )}
                                        onMouseEnter={() => setHoveredRow(rowId)}
                                        onMouseLeave={() => {
                                            setHoveredRow(null);
                                            setActiveTooltip(null);
                                        }}
                                    >
                                        {/* Account Label Column (Sticky) */}
                                        <td className={cn(
                                            "sticky left-0 handle-sticky-shadow z-20 px-5 py-3.5 md:px-7 md:py-4 text-left transition-colors duration-200 border-r border-black/[0.03] dark:border-white/[0.02]",
                                            isHeader 
                                                ? 'bg-zinc-50/95 dark:bg-zinc-900/95 font-black text-zinc-950 dark:text-zinc-50' 
                                                : 'bg-white/95 dark:bg-zinc-950/95 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900/50',
                                            isCore && !isHeader && "bg-blue-50/20 dark:bg-blue-950/10"
                                        )}>
                                            <div className="flex items-center justify-between gap-1 relative w-full">
                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                    <ChevronRightIcon className={cn(
                                                        "w-2.5 h-2.5 transition-all duration-300 shrink-0 hidden md:block",
                                                        isCurrentHovered ? 'opacity-100 translate-x-0 text-zinc-800 dark:text-zinc-200' : 'opacity-0 -translate-x-2 text-zinc-400'
                                                    )} />
                                                    <span className={cn(
                                                        "text-xs tracking-tight transition-transform duration-200 truncate block",
                                                        isCurrentHovered && "md:translate-x-0.5",
                                                        isHeader 
                                                            ? "font-black text-zinc-900 dark:text-white" 
                                                            : "font-medium text-zinc-600 dark:text-zinc-400",
                                                        isCore && !isHeader && "text-blue-600 dark:text-blue-400 font-bold"
                                                    )}>
                                                        {row.label}
                                                    </span>
                                                    {isCore && !isHeader && (
                                                        <span className="text-[7px] px-1 py-0.5 font-black font-sans tracking-wide rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase scale-90 origin-left shrink-0">
                                                            Core
                                                        </span>
                                                    )}
                                                    {isHeader && (
                                                        <span className="text-[7px] px-1 py-0.5 font-black font-sans tracking-wide rounded bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-300 uppercase scale-90 origin-left shrink-0">
                                                            Sum
                                                        </span>
                                                    )}
                                                </div>

                                                {/* 용어 설명 가이드 아이콘 */}
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setActiveTooltip(rowId)}
                                                    onClick={() => setActiveTooltip(activeTooltip === rowId ? null : rowId)}
                                                    className={cn(
                                                        "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity ml-1.5 shrink-0 p-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900",
                                                        isCurrentHovered ? "opacity-100" : "opacity-0"
                                                    )}
                                                >
                                                    <InformationCircleIcon className="w-3.5 h-3.5" />
                                                </button>

                                                {/* 모바일 대응형 패널 툴팁 레이어 */}
                                                {isTooltipActive && row.description && (
                                                    <div className={cn(
                                                        "absolute z-[100] p-3.5 rounded-2xl bg-zinc-950 dark:bg-zinc-900 text-zinc-100 dark:text-zinc-200 shadow-2xl border border-zinc-800 dark:border-zinc-700/80 text-[11px] leading-relaxed font-sans font-medium animate-in fade-in zoom-in-95 duration-150 pointer-events-none w-60",
                                                        "left-0 top-full mt-2 md:left-full md:top-1/2 md:-translate-y-1/2 md:ml-4 md:mt-0 md:w-68"
                                                    )}>
                                                        <div className="font-black text-amber-400 mb-1 flex items-center gap-1.5 border-b border-white/5 pb-1">
                                                            <SparklesIcon className="w-3 h-3 text-amber-400" />
                                                            <span>{row.label}</span>
                                                            <span className="text-[8px] text-zinc-500 font-normal font-mono">[{row.key}]</span>
                                                        </div>
                                                        <p className="text-zinc-300 dark:text-zinc-400 font-sans tracking-tight text-[10.5px] font-normal">{row.description}</p>
                                                        
                                                        {/* 화살표 꼭지점 분기 */}
                                                        <div className="absolute border-4 border-transparent md:block hidden left-0 right-full top-1/2 -translate-y-1/2 border-r-zinc-950 dark:border-r-zinc-900" />
                                                        <div className="absolute border-4 border-transparent md:hidden block bottom-full left-4 border-b-zinc-950 dark:border-b-zinc-900" />
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
                                                    "px-5 py-3.5 md:px-7 md:py-4 text-right font-mono tabular-nums transition-colors duration-200",
                                                    i === 0 && !isHeader && "bg-zinc-50/20 dark:bg-zinc-900/10",
                                                    isHeader && "bg-zinc-50/10 dark:bg-zinc-900/5"
                                                )}
                                            >
                                                <span className={cn(
                                                    isNegative 
                                                        ? "text-rose-500 dark:text-rose-400 font-bold italic bg-rose-500/[0.06] dark:bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/10" 
                                                        : isHeader 
                                                            ? "text-zinc-950 dark:text-zinc-50 font-black" 
                                                            : "text-zinc-700 dark:text-zinc-300 font-semibold",
                                                    i === 0 ? "text-[12px] md:text-[12.5px]" : "text-[11px] md:text-[11.5px] opacity-70"
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
                <div className="px-5 py-3.5 md:px-7 bg-zinc-50/80 dark:bg-zinc-900/60 border-t border-black/[0.06] dark:border-white/5 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center relative z-10">
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" /> 코어 지표
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" /> 적자 손실 항목
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            <InformationCircleIcon className="w-3 h-3 text-zinc-400" /> 아이콘 호버 시 가이드 툴팁 제공
                        </div>
                    </div>
                    <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 tracking-[0.15em] uppercase font-mono self-end sm:self-auto italic">Unit: KRW (100M)</span>
                </div>
            </div>

            <style jsx global>{`
                .custom-table-scrollbar::-webkit-scrollbar {
                    height: 6px;
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
                    box-shadow: 6px 0 10px -5px rgba(0, 0, 0, 0.04);
                }
                .dark .handle-sticky-shadow {
                    box-shadow: 8px 0 16px -8px rgba(0, 0, 0, 0.5);
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
                <DocumentTextIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
                true
            )}
            {renderTable(
                "손익계산서", 
                "Income Statement Structure", 
                isRows, 
                kiIS, 
                <ChartBarIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
                false
            )}
        </div>
    );
};