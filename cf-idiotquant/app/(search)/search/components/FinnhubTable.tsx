"use client";

import React, { useMemo, useState } from "react";
import { 
    TableCellsIcon, 
    InformationCircleIcon, 
    ArrowDownTrayIcon,
    ChevronRightIcon
} from "@heroicons/react/24/outline";

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
        sub: "대차대조표",
        items: [
            { label: "현금 및 현금성 자산", concept: ["us-gaap_CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalentsAtCarryingValue"] },
            { label: "매출채권", concept: ["us-gaap_AccountsReceivableNetCurrent", "AccountsReceivableNetCurrent"] },
            { label: "재고자산", concept: ["us-gaap_InventoryNet", "InventoryNet"] },
            { label: "유동자산 합계", concept: ["us-gaap_AssetsCurrent", "AssetsCurrent"], isBold: true },
            { label: "자산 총계", concept: ["us-gaap_Assets", "Assets"], isBold: true },
            { label: "부채 총계", concept: ["us-gaap_Liabilities", "Liabilities"], isBold: true },
            { label: "자본 총계", concept: ["us-gaap_StockholdersEquity", "StockholdersEquity"], isBold: true },
        ],
        accent: "bg-blue-500",
        textAccent: "text-blue-600 dark:text-blue-400"
    },
    {
        label: "Income Statement",
        sub: "손익계산서",
        items: [
            { label: "매출액", concept: ["us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerExcludingAssessedTax"], isBold: true },
            { label: "영업이익", concept: ["us-gaap_OperatingIncomeLoss", "OperatingIncomeLoss"], isBold: true },
            { label: "순이익", concept: ["us-gaap_NetIncomeLoss", "NetIncomeLoss"], isBold: true },
        ],
        accent: "bg-emerald-500",
        textAccent: "text-emerald-600 dark:text-emerald-400"
    },
    {
        label: "Cash Flow",
        sub: "현금흐름표",
        items: [
            { label: "영업활동 현금흐름", concept: ["us-gaap_NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivities"] },
            { label: "투자활동 현금흐름", concept: ["us-gaap_NetCashProvidedByUsedInInvestingActivities", "NetCashProvidedByUsedInInvestingActivities"] },
            { label: "재무활동 현금흐름", concept: ["us-gaap_NetCashProvidedByUsedInFinancingActivities", "NetCashProvidedByUsedInFinancingActivities"] },
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
        <div className={`w-full bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden ${className}`}>
            {/* Header Area */}
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400">
                        <TableCellsIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">상세 재무 데이터</h2>
                        <p className="text-xs text-zinc-500 font-medium tracking-wide flex items-center gap-1">
                            <InformationCircleIcon className="w-3.5 h-3.5" />
                            공시된 원본 수치를 기반으로 정렬되었습니다.
                        </p>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold transition-all hover:opacity-85 active:scale-95 shadow-md">
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    CSV 다운로드
                </button>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-zinc-50/50 dark:bg-zinc-900/30">
                            <th className="sticky left-0 z-30 bg-zinc-50 dark:bg-zinc-900 px-6 py-4 text-left border-b border-zinc-200 dark:border-zinc-800 min-w-[200px]">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Financial Metric</span>
                            </th>
                            {columns.map((col, idx) => (
                                <th key={idx} className="px-6 py-4 text-right border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                                    <div className="flex flex-col items-end">
                                        <span className={`text-[11px] font-bold ${idx === 0 ? 'text-blue-500' : 'text-zinc-400'}`}>
                                            {idx === 0 ? 'LATEST REPORT' : `FY ${columns.length - idx}`}
                                        </span>
                                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
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
                                {/* Section Indicator Row */}
                                <tr className="bg-white dark:bg-zinc-950">
                                    <td colSpan={columns.length + 1} className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1 h-4 rounded-full ${section.accent}`} />
                                            <span className={`text-xs font-black uppercase tracking-wider ${section.textAccent}`}>
                                                {section.label}
                                            </span>
                                            <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600">
                                                {section.sub}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                                
                                {section.items.map((row, rowIndex) => (
                                    <tr 
                                        key={rowIndex} 
                                        className="group transition-all duration-150 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                                        onMouseEnter={() => setHoveredRow(`${section.label}-${rowIndex}`)}
                                        onMouseLeave={() => setHoveredRow(null)}
                                    >
                                        <td className="sticky left-0 z-20 bg-white dark:bg-zinc-950 px-6 py-3.5 text-left border-r border-zinc-100 dark:border-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <ChevronRightIcon className={`w-3 h-3 transition-opacity ${hoveredRow === `${section.label}-${rowIndex}` ? 'opacity-100' : 'opacity-0'} text-zinc-400`} />
                                                <span className={`text-[12px] tracking-tight ${row.isBold ? 'font-bold text-zinc-900 dark:text-white' : 'font-medium text-zinc-600 dark:text-zinc-400'}`}>
                                                    {row.label}
                                                </span>
                                            </div>
                                        </td>
                                        
                                        {columns.map((col, colIndex) => {
                                            const v = col.map.get(row.concept[0]) ?? col.map.get(row.concept[1]) ?? null;
                                            return (
                                                <td key={colIndex} className="px-6 py-3.5 text-right font-mono tabular-nums">
                                                    {v === null ? (
                                                        <span className="text-zinc-200 dark:text-zinc-800">-</span>
                                                    ) : (
                                                        <span className={`
                                                            ${v < 0 ? "text-red-500 font-bold" : "text-zinc-800 dark:text-zinc-200"}
                                                            ${colIndex === 0 ? "text-[13px] font-bold" : "text-[12px] font-medium opacity-80"}
                                                        `}>
                                                            {fmt(v)}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer / Status Bar */}
            <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Live Connectivity</span>
                    </div>
                    <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
                    <span className="text-[10px] font-bold text-zinc-400 tracking-tighter">API: Finnhub Fundamental v1</span>
                </div>
                <div className="flex gap-2">
                    <span className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[8px] font-black text-emerald-600">BS</span>
                    <span className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[8px] font-black text-blue-600">IC</span>
                    <span className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[8px] font-black text-amber-600">CF</span>
                </div>
            </div>
        </div>
    );
}