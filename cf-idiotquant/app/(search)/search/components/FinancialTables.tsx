"use client";

import React, { useState } from "react";
import { formatKoreanUnit, ONE_HUNDRED_MILLION } from "../../../../components/utils/financeCalc";
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  ChevronRightIcon 
} from "@heroicons/react/24/outline";

interface FinancialTablesProps {
    kiBS: any;
    kiIS: any;
}

export const FinancialTables = ({ kiBS, kiIS }: FinancialTablesProps) => {
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);

    // 퀀트 투자 핵심 지표
    const coreMetrics = ["total_aset", "total_lblt", "total_cptl", "sale_account", "bsop_prti", "thtr_ntin"];

    const bsRows = [
        { label: "유동자산", key: "cras" },
        { label: "고정자산", key: "fxas" },
        { label: "자산총계", key: "total_aset", isHeader: true },
        { label: "유동부채", key: "flow_lblt" },
        { label: "고정부채", key: "fix_lblt" },
        { label: "부채총계", key: "total_lblt", isHeader: true },
        { label: "자본금", key: "cpfn" },
        { label: "이익잉여금", key: "prfi_surp" },
        { label: "자본총계", key: "total_cptl", isHeader: true },
    ];

    const isRows = [
        { label: "매출액", key: "sale_account", isHeader: true },
        { label: "매출원가", key: "sale_cost" },
        { label: "매출총이익", key: "sale_totl_prfi" },
        { label: "판관비", key: "sell_mang" },
        { label: "영업이익", key: "bsop_prti", isHeader: true },
        { label: "당기순이익", key: "thtr_ntin", isHeader: true },
    ];

    const renderTable = (title: string, subTitle: string, rows: any[], data: any, icon: React.ReactNode) => (
        <div className="mb-12 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            {/* Table Header Section */}
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/20">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">{title}</h3>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{subTitle}</p>
                    </div>
                </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-separate border-spacing-0">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-30 bg-zinc-50 dark:bg-zinc-900 px-6 py-4 text-left border-b border-zinc-200 dark:border-zinc-800 min-w-[180px]">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Account Item</span>
                            </th>
                            {data?.output?.slice(0, 5).map((v: any, i: number) => (
                                <th key={i} className="px-6 py-4 text-right border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                                    <div className="flex flex-col items-end">
                                        <span className={`text-[10px] font-black ${i === 0 ? 'text-indigo-500' : 'text-zinc-400'}`}>
                                            {i === 0 ? 'RECENT' : `PERIOD T-${i}`}
                                        </span>
                                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
                                            {v.stac_yymm}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                        {rows.map((row, rowIndex) => {
                            const isCore = coreMetrics.includes(row.key);
                            const isHeader = row.isHeader;
                            const rowId = `${title}-${row.key}`;

                            return (
                                <tr 
                                    key={row.key} 
                                    className={`group transition-all duration-150 ${isHeader ? 'bg-zinc-50/30 dark:bg-zinc-900/20' : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40'}`}
                                    onMouseEnter={() => setHoveredRow(rowId)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                >
                                    {/* Account Label Column */}
                                    <td className={`
                                        sticky left-0 z-20 px-6 py-3.5 text-left border-r border-zinc-100 dark:border-zinc-900 transition-colors
                                        ${isHeader ? 'bg-zinc-100/50 dark:bg-zinc-800/40' : 'bg-white dark:bg-zinc-950 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900'}
                                    `}>
                                        <div className="flex items-center gap-2">
                                            <ChevronRightIcon className={`w-3 h-3 transition-opacity ${hoveredRow === rowId ? 'opacity-100' : 'opacity-0'} text-indigo-500`} />
                                            <span className={`
                                                text-[12px] tracking-tight whitespace-nowrap
                                                ${isHeader ? "font-black text-zinc-900 dark:text-white" : "font-medium text-zinc-600 dark:text-zinc-400"}
                                                ${isCore && !isHeader ? "text-indigo-600 dark:text-indigo-400" : ""}
                                            `}>
                                                {row.label}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Data Columns */}
                                    {data?.output?.slice(0, 5).map((v: any, i: number) => {
                                        const rawValue = v[row.key as keyof typeof v] || 0;
                                        const val = Number(rawValue);
                                        const isNegative = val < 0;

                                        return (
                                            <td key={i} className="px-6 py-3.5 text-right font-mono tabular-nums">
                                                <span className={`
                                                    ${isNegative ? "text-red-500 font-bold" : isHeader ? "text-zinc-900 dark:text-zinc-100 font-black" : "text-zinc-700 dark:text-zinc-300"}
                                                    ${i === 0 ? "text-[13px]" : "text-[12px] opacity-80"}
                                                `}>
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

            {/* Table Footer: Legend */}
            <div className="px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> 핵심 지표
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> 손실/적자
                    </div>
                </div>
                <span className="text-[9px] font-black text-zinc-300 dark:text-zinc-700 tracking-[0.2em] uppercase">Currency: KRW (100M)</span>
            </div>
        </div>
    );

    if (!kiBS?.output || !kiIS?.output) return null;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderTable(
                "재무상태표", 
                "Balance Sheet", 
                bsRows, 
                kiBS, 
                <DocumentTextIcon className="w-5 h-5" />
            )}
            {renderTable(
                "손익계산서", 
                "Income Statement", 
                isRows, 
                kiIS, 
                <ChartBarIcon className="w-5 h-5" />
            )}
        </div>
    );
};