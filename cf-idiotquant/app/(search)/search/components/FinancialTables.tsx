"use client";
import React from "react";
import { Section, SectionCard, HTMLTable, Tag } from "@blueprintjs/core";
import { formatKoreanUnit, ONE_HUNDRED_MILLION } from "../utils/financeCalc";

interface FinancialTablesProps {
    kiBS: any;
    kiIS: any;
}

export const FinancialTables = ({ kiBS, kiIS }: FinancialTablesProps) => {
    // 퀀트 투자 핵심 지표 (배경색 및 폰트 강조 대상)
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

    const renderTable = (title: string, rows: any[], data: any) => (
        <Section
            title={<div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">{title}</div>}
            className="dark:!bg-zinc-900 rounded-xl mb-10 overflow-hidden border border-zinc-200 dark:border-zinc-800"
        >
            <SectionCard className="p-0 overflow-x-auto dark:!bg-zinc-950 border-none relative no-scrollbar">
                <HTMLTable
                    bordered={false}
                    className="w-full text-right font-mono text-[11px] sm:text-xs border-separate border-spacing-0"
                >
                    <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-900/50">
                            {/* 대표열 헤더 고정: 배경색과 그림자로 데이터 경계 명확화 */}
                            <th className="text-left p-4 min-w-[150px] sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-900 border-r border-b dark:border-zinc-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-400">Account Items</span>
                            </th>
                            {data?.output?.slice(0, 5).map((v: any, i: number) => (
                                <th key={i} className="text-right p-4 min-w-[110px] border-b dark:border-zinc-800">
                                    <Tag minimal intent={i === 0 ? "primary" : "none"} className="font-bold">
                                        {v.stac_yymm}
                                    </Tag>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIndex) => {
                            const isCore = coreMetrics.includes(row.key);
                            const isHeader = row.isHeader;

                            return (
                                <tr key={row.key} className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/5">
                                    {/* 대표열(계정항목) 배경 처리 및 고정 */}
                                    <td className={`
                    text-left p-4 sticky left-0 z-10 border-r border-b dark:border-zinc-800/50 transition-all
                    shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]
                    ${isHeader ? "bg-zinc-100/90 dark:bg-zinc-800/90 backdrop-blur-md" : "bg-white dark:bg-zinc-950"}
                    group-hover:bg-blue-50 dark:group-hover:bg-zinc-800
                  `}>
                                        <span className={`
                      ${isHeader ? "font-black text-zinc-900 dark:text-white text-[12px]" : "font-medium text-zinc-500 dark:text-zinc-400"}
                      ${isCore && !isHeader ? "text-indigo-600 dark:text-indigo-400" : ""}
                    `}>
                                            {row.label}
                                        </span>
                                    </td>

                                    {data?.output?.slice(0, 5).map((v: any, i: number) => {
                                        const rawValue = v[row.key as keyof typeof v] || 0;
                                        const val = Number(rawValue);
                                        const isNegative = val < 0;

                                        return (
                                            <td key={i} className={`
                        p-4 border-b dark:border-zinc-800/50 transition-colors
                        ${isHeader ? "bg-zinc-50/30 dark:bg-zinc-800/10 font-black text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}
                        ${isNegative ? "!text-red-500 font-bold bg-red-50/20" : ""}
                      `}>
                                                {formatKoreanUnit(val * ONE_HUNDRED_MILLION)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </HTMLTable>
            </SectionCard>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border-t dark:border-zinc-800 flex justify-end gap-4">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" /> 주요지표
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                    <div className="w-2 h-2 rounded-full bg-red-500" /> 적자항목
                </div>
            </div>
        </Section>
    );

    if (!kiBS?.output || !kiIS?.output) return null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {renderTable("재무상태표 (Balance Sheet)", bsRows, kiBS)}
            {renderTable("손익계산서 (Income Statement)", isRows, kiIS)}
        </div>
    );
};