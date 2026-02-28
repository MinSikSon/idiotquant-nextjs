"use client";

import React, { useMemo } from "react";
import {
    HTMLTable,
    Section,
    SectionCard,
    Tag,
    Icon,
    Position,
    Tooltip
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

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

// --- 섹션별 컨셉 정의 (기존 리스트 활용) ---
const SECTIONS = [
    {
        label: "대차대조표 (BS)", items: [
            { label: "현금및현금성자산", concept: ["us-gaap_CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalentsAtCarryingValue"] },
            { label: "매출채권", concept: ["us-gaap_AccountsReceivableNetCurrent", "AccountsReceivableNetCurrent"] },
            { label: "재고자산", concept: ["us-gaap_InventoryNet", "InventoryNet"] },
            { label: "유동자산합계", concept: ["us-gaap_AssetsCurrent", "AssetsCurrent"] },
            { label: "자산총계", concept: ["us-gaap_Assets", "Assets"] },
            { label: "부채총계", concept: ["us-gaap_Liabilities", "Liabilities"] },
            { label: "자본총계", concept: ["us-gaap_StockholdersEquity", "StockholdersEquity"] },
        ], color: "text-blue-600 dark:!text-blue-400"
    },
    {
        label: "손익계산서 (IC)", items: [
            { label: "매출액", concept: ["us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerExcludingAssessedTax"] },
            { label: "영업이익", concept: ["us-gaap_OperatingIncomeLoss", "OperatingIncomeLoss"] },
            { label: "순이익", concept: ["us-gaap_NetIncomeLoss", "NetIncomeLoss"] },
        ], color: "text-green-600 dark:!text-green-400"
    },
    {
        label: "현금흐름표 (CF)", items: [
            { label: "영업활동현금흐름", concept: ["us-gaap_NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivities"] },
            { label: "투자활동현금흐름", concept: ["us-gaap_NetCashProvidedByUsedInInvestingActivities", "NetCashProvidedByUsedInInvestingActivities"] },
            { label: "재무활동현금흐름", concept: ["us-gaap_NetCashProvidedByUsedInFinancingActivities", "NetCashProvidedByUsedInFinancingActivities"] },
        ], color: "text-orange-600 dark:!text-orange-400"
    }
];

const defaultFmt = (v: number | null | undefined) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "-";
    return Math.round(v).toLocaleString();
};

export default function FinnhubBalanceSheetTable({ data = [], className = "", formatNumber }: Props) {
    const fmt = formatNumber || defaultFmt;

    // 데이터 가공 로직
    const columns = useMemo(() => {
        return (Array.isArray(data) ? data : []).map((r) => {
            const dateStr = (r.endDate || r.filedDate || r.acceptedDate || "").split(" ")[0];
            const map = new Map<string, number | null>();

            // 모든 리포트(bs, ic, cf)를 하나의 맵으로 병합
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
        <Section
            title="상세 재무제표"
            icon={IconNames.BOOKMARK}
            className={`${className} dark:!bg-zinc-900 overflow-hidden shadow-lg rounded-xl border dark:border-zinc-800`}
        >
            <SectionCard className="!p-0 border-none bg-white dark:!bg-zinc-950">
                <div className="overflow-x-auto no-scrollbar">
                    <HTMLTable
                        striped
                        interactive
                        compact
                        className="w-full min-w-[650px] font-mono text-[11px] md:!text-xs dark:!text-zinc-300"
                    >
                        <thead className="bg-gray-50 dark:!bg-zinc-900">
                            <tr>
                                {/* 모바일에서 항목명 고정 */}
                                <th className="!p-3 text-left sticky left-0 bg-gray-50 dark:!bg-zinc-900 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:!text-white border-b dark:border-zinc-800">
                                    항목 (Concepts)
                                </th>
                                {columns.map((col, idx) => (
                                    <th key={idx}>
                                        <Tag minimal intent={idx === 0 ? "primary" : "none"} className="font-bold text-right !p-3 dark:!text-white border-b dark:border-zinc-800">
                                            {col.label}
                                        </Tag>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {SECTIONS.map((section) => (
                                <React.Fragment key={section.label}>
                                    {/* 섹션 구분 타이틀 */}
                                    <tr className="bg-gray-100/30 dark:!bg-zinc-900/40">
                                        <td colSpan={columns.length + 1} className={`!py-1.5 !px-4 font-black text-[10px] uppercase tracking-widest ${section.color}`}>
                                            {section.label}
                                        </td>
                                    </tr>
                                    {/* 데이터 행 */}
                                    {section.items.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="dark:hover:!bg-zinc-800/50">
                                            <td className="!pl-6 !py-2 text-left sticky left-0 bg-white dark:!text-white dark:!bg-zinc-950 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:border-zinc-800/50">
                                                {row.label}
                                            </td>
                                            {columns.map((col, colIndex) => {
                                                const v = col.map.get(row.concept[0]) ?? col.map.get(row.concept[1]) ?? null;
                                                return (
                                                    <td key={colIndex} className="text-right !px-4 font-medium transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
                                                        {v === null ? (
                                                            <span className="text-gray-300 dark:!text-zinc-700">-</span>
                                                        ) : (
                                                            <Tooltip content={`${row.label}: ${v.toLocaleString()}`} position={Position.TOP}>
                                                                <span className={v < 0 ? "text-red-500 dark:!text-red-400" : "dark:!text-zinc-200"}>
                                                                    {fmt(v)}
                                                                </span>
                                                            </Tooltip>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </HTMLTable>
                </div>
            </SectionCard>
            <div className="px-4 py-2 bg-gray-50 dark:!bg-zinc-900 border-t dark:border-zinc-800 flex justify-between items-center text-[10px] text-gray-400">
                <span><Icon icon={IconNames.INFO_SIGN} size={10} className="mr-1" /> 모든 수치는 원문 통화 기준입니다.</span>
                <span className="font-bold uppercase tracking-tighter">Finnhub Reported Data</span>
            </div>
        </Section>
    );
}