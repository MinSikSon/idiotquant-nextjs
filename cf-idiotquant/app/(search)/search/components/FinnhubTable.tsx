"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import * as Tabs from "@radix-ui/react-tabs";
import * as Popover from "@radix-ui/react-popover";
import { TrendingUp, TrendingDown, Info, BookOpen, BarChart2, Banknote, Minus } from "lucide-react";

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
}

type ItemDef = { label: string; concept: string[]; isTotal?: boolean; description: string };
type SectionDef = { label: string; labelEn: string; accent: string; dotColor: string; items: ItemDef[] };

const BS_SECTIONS: SectionDef[] = [
    {
        label: "자산",
        labelEn: "ASSETS",
        accent: "border-[#16a34a]/50 bg-[#f0fdf4] text-[#15803d] dark:bg-[#052e16]/40 dark:text-[#86efac]",
        dotColor: "bg-[#16a34a]",
        items: [
            {
                label: "현금 및 현금성 자산",
                concept: ["us-gaap_CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalentsAtCarryingValue"],
                description: "즉시 현금화 가능한 가장 안전한 자산 — 위기 시 기업 방어력을 나타냄",
            },
            {
                label: "매출채권",
                concept: ["us-gaap_AccountsReceivableNetCurrent", "AccountsReceivableNetCurrent"],
                description: "외상 판매 후 고객으로부터 받아야 할 채권 — 회수 지연 시 현금흐름 악화",
            },
            {
                label: "재고자산",
                concept: ["us-gaap_InventoryNet", "InventoryNet"],
                description: "원재료·재공품·완제품 등의 재고 — 과잉 시 덤핑·평가손실 리스크",
            },
            {
                label: "유동자산 합계",
                concept: ["us-gaap_AssetsCurrent", "AssetsCurrent"],
                isTotal: true,
                description: "1년 내 현금화 가능 자산의 합계 — Benjamin Graham NCAV 청산가치의 핵심 원천",
            },
            {
                label: "자산 총계",
                concept: ["us-gaap_Assets", "Assets"],
                isTotal: true,
                description: "유동·비유동 자산을 포함한 모든 자산의 합계",
            },
        ],
    },
    {
        label: "부채 및 자본",
        labelEn: "LIAB & EQUITY",
        accent: "border-rose-400/50 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
        dotColor: "bg-rose-400",
        items: [
            {
                label: "부채 총계",
                concept: ["us-gaap_Liabilities", "Liabilities", "us-gaap_LiabilitiesAndStockholdersEquity"],
                isTotal: true,
                description: "총 채무 합계 — NCAV 계산 시 유동자산에서 전액 차감",
            },
            {
                label: "자본 총계",
                concept: ["us-gaap_StockholdersEquity", "StockholdersEquity", "us-gaap_StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
                isTotal: true,
                description: "순자산(자산 − 부채) — 주주지분이자 S-RIM 적정주가의 기초 체력",
            },
        ],
    },
];

const IS_SECTIONS: SectionDef[] = [
    {
        label: "수익",
        labelEn: "REVENUE",
        accent: "border-indigo-400/50 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
        dotColor: "bg-indigo-400",
        items: [
            {
                label: "매출액",
                concept: [
                    "us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax",
                    "RevenueFromContractWithCustomerExcludingAssessedTax",
                    "us-gaap_Revenues",
                    "Revenues",
                    "us-gaap_SalesRevenueNet",
                    "SalesRevenueNet",
                ],
                isTotal: true,
                description: "제품·서비스 판매 총 수입 (Top-line) — 기업 성장 여부의 핵심 척도",
            },
        ],
    },
    {
        label: "이익",
        labelEn: "PROFIT",
        accent: "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotColor: "bg-emerald-400",
        items: [
            {
                label: "영업이익",
                concept: ["us-gaap_OperatingIncomeLoss", "OperatingIncomeLoss"],
                isTotal: true,
                description: "매출에서 매출원가·판관비를 뺀 본업 수익력 (EBIT)",
            },
            {
                label: "순이익",
                concept: ["us-gaap_NetIncomeLoss", "NetIncomeLoss"],
                isTotal: true,
                description: "세금·금융비용 모두 반영한 최종 순이익 (Bottom-line) — 주주귀속 이익",
            },
        ],
    },
];

const CF_SECTIONS: SectionDef[] = [
    {
        label: "현금흐름",
        labelEn: "CASH FLOW",
        accent: "border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        dotColor: "bg-amber-400",
        items: [
            {
                label: "영업활동 현금흐름",
                concept: [
                    "us-gaap_NetCashProvidedByUsedInOperatingActivities",
                    "NetCashProvidedByUsedInOperatingActivities",
                ],
                description: "영업 활동으로 유입·유출된 실제 현금 — 순이익보다 신뢰도 높은 체력 지표",
            },
            {
                label: "투자활동 현금흐름",
                concept: [
                    "us-gaap_NetCashProvidedByUsedInInvestingActivities",
                    "NetCashProvidedByUsedInInvestingActivities",
                ],
                description: "설비 투자(CAPEX)·자산 매각·지분 투자 등 — 우량 성장 기업은 통상 음수(-)",
            },
            {
                label: "재무활동 현금흐름",
                concept: [
                    "us-gaap_NetCashProvidedByUsedInFinancingActivities",
                    "NetCashProvidedByUsedInFinancingActivities",
                ],
                description: "차입·상환·배당·자사주 매입 등 — 적극적 주주환원 시 음수(-)",
            },
        ],
    },
];

function fmtUSD(v: number | null): string {
    if (v === null || v === undefined || Number.isNaN(v)) return "-";
    if (v === 0) return "—";
    const abs = Math.abs(v);
    const sign = v < 0 ? "-" : "";
    if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
    return `${sign}$${Math.round(abs).toLocaleString()}`;
}

function pctChange(curr: number | null, prev: number | null): number | null {
    if (curr === null || prev === null || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
}

function findVal(map: Map<string, number | null>, concepts: string[]): number | null {
    for (const c of concepts) {
        const v = map.get(c);
        if (v !== undefined) return v;
    }
    return null;
}

function InfoPopover({ label, description }: { label: string; description: string }) {
    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    aria-label={`${label} 설명`}
                    className="shrink-0 rounded-full p-0.5 text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
                >
                    <Info size={11} />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    side="right"
                    sideOffset={6}
                    avoidCollisions
                    collisionPadding={12}
                    className="z-[200] w-64 rounded-xl bg-neutral-900 border border-neutral-700/60 p-4 shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-150 focus:outline-none"
                >
                    <p className="text-[10px] font-black text-amber-400 mb-1.5 uppercase tracking-wider">{label}</p>
                    <p className="text-[11.5px] text-neutral-300 leading-relaxed">{description}</p>
                    <Popover.Arrow className="fill-neutral-700/60" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

function YoYBadge({ pct }: { pct: number | null }) {
    if (pct === null || Math.abs(pct) < 0.05) {
        return <span className="text-neutral-300 dark:text-neutral-700"><Minus size={8} /></span>;
    }
    const isUp = pct >= 0;
    return (
        <span className={cn(
            "inline-flex items-center gap-0.5 text-[9px] font-bold font-mono",
            isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
        )}>
            {isUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
            {isUp ? "+" : ""}{pct.toFixed(1)}%
        </span>
    );
}

const TAB_TRIGGER_BASE = [
    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150",
    "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200",
    "data-[state=active]:bg-white dark:data-[state=active]:bg-[#4a4641]",
    "data-[state=active]:shadow-sm",
].join(" ");

function SectionTable({
    sections,
    columns,
}: {
    sections: SectionDef[];
    columns: { label: string; map: Map<string, number | null> }[];
}) {
    if (!columns.length) return null;

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-[#35332e]">
                        <th className="sticky left-0 z-10 bg-white dark:bg-[#242320] px-5 py-3 text-left min-w-[12rem] w-48">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-mono select-none">
                                Financial Metric
                            </span>
                        </th>
                        {columns.map((col, idx) => (
                            <th
                                key={idx}
                                className={cn(
                                    "px-5 py-3 text-right min-w-[9rem]",
                                    idx === 0 && "bg-[#f0fdf4]/50 dark:bg-[#052e16]/10"
                                )}
                            >
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-wider font-mono",
                                        idx === 0 ? "text-[#16a34a] dark:text-[#16a34a]" : "text-neutral-400 dark:text-neutral-500"
                                    )}>
                                        {idx === 0 ? "Latest" : `FY T-${idx}`}
                                    </span>
                                    <span className={cn(
                                        "text-xs font-bold tabular-nums",
                                        idx === 0 ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
                                    )}>
                                        {col.label || "—"}
                                    </span>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sections.map((section) => (
                        <React.Fragment key={section.label}>
                            {/* Section group header */}
                            <tr>
                                <td
                                    colSpan={columns.length + 1}
                                    className="sticky left-0 px-5 pt-4 pb-1.5 bg-white dark:bg-[#242320]"
                                >
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest font-mono select-none",
                                        section.accent
                                    )}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", section.dotColor)} />
                                        {section.labelEn}
                                    </div>
                                </td>
                            </tr>

                            {section.items.map((item, rowIdx) => {
                                const vals = columns.map((col) => findVal(col.map, item.concept));
                                const yoy = pctChange(vals[0], vals[1]);

                                return (
                                    <tr
                                        key={rowIdx}
                                        className={cn(
                                            "group border-b border-neutral-100 dark:border-[#35332e]/50 transition-colors duration-100",
                                            item.isTotal
                                                ? "bg-[#faf9f7]/80 dark:bg-[#242320]/20 hover:bg-[#f5f0e8]/70 dark:hover:bg-[#242320]/40"
                                                : "hover:bg-[#f5f0e8]/60 dark:hover:bg-[#242320]/10"
                                        )}
                                    >
                                        {/* Label */}
                                        <td className={cn(
                                            "sticky left-0 z-10 px-5 py-3 transition-colors duration-100",
                                            item.isTotal
                                                ? "bg-[#faf9f7] dark:bg-[#242320]/20 group-hover:bg-[#f5f0e8]/70 dark:group-hover:bg-[#35332e]/40"
                                                : "bg-white dark:bg-[#242320] group-hover:bg-[#f5f0e8]/60 dark:group-hover:bg-[#35332e]/10"
                                        )}>
                                            <div className="flex items-center gap-2">
                                                {item.isTotal
                                                    ? <div className="w-0.5 h-4 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0" />
                                                    : <div className="w-0.5 h-4 shrink-0" />
                                                }
                                                <span className={cn(
                                                    "truncate",
                                                    item.isTotal
                                                        ? "font-bold text-neutral-900 dark:text-neutral-100"
                                                        : "font-medium text-neutral-600 dark:text-neutral-400 pl-1"
                                                )}>
                                                    {item.label}
                                                </span>
                                                <InfoPopover label={item.label} description={item.description} />
                                            </div>
                                        </td>

                                        {/* Values */}
                                        {vals.map((v, colIdx) => (
                                            <td
                                                key={colIdx}
                                                className={cn(
                                                    "px-5 py-3 text-right font-mono tabular-nums",
                                                    colIdx === 0 && "bg-[#f0fdf4]/30 dark:bg-[#052e16]/5"
                                                )}
                                            >
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className={cn(
                                                        v !== null && v < 0
                                                            ? "text-rose-600 dark:text-rose-400 font-bold"
                                                            : item.isTotal
                                                                ? "font-bold text-neutral-900 dark:text-neutral-100"
                                                                : "font-medium text-neutral-700 dark:text-neutral-300",
                                                        colIdx === 0 ? "text-[13px]" : "text-xs opacity-80"
                                                    )}>
                                                        {fmtUSD(v)}
                                                    </span>
                                                    {colIdx === 0 && <YoYBadge pct={yoy} />}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function FinnhubTable({ data = [], className = "" }: Props) {
    const columns = useMemo(() => {
        const reports = Array.isArray(data) ? data : [];
        return reports.slice(0, 5).map((r) => {
            const dateStr = (r.endDate || r.filedDate || r.acceptedDate || "").split(" ")[0];
            const map = new Map<string, number | null>();
            const merge = (arr: any[] = []) => {
                arr.forEach((item) => {
                    const concept = item?.concept || item?.label || "";
                    const val = item?.value ?? item?.val ?? item?.amount ?? null;
                    if (concept) map.set(concept, val === null ? null : Number(val));
                });
            };
            merge(r.report?.bs);
            merge(r.report?.ic);
            merge(r.report?.cf);
            return { label: dateStr, map };
        });
    }, [data]);

    if (!columns.length) return null;

    const footer = (
        <div className="flex items-center gap-3 px-5 py-3 border-t border-neutral-100 dark:border-[#35332e]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f0fdf4]0 animate-pulse shrink-0" />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                Finnhub · SEC Fundamentals · US-GAAP · USD
            </span>
            <div className="ml-auto flex items-center gap-2">
                <span className="text-[9px] font-mono text-neutral-400 dark:text-neutral-600 flex items-center gap-1">
                    <TrendingUp size={8} className="text-emerald-500" /> YoY vs prior year
                </span>
            </div>
        </div>
    );

    return (
        <div className={cn("w-full", className)}>
            <Tabs.Root defaultValue="bs">
                {/* Tab Bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-[#35332e] bg-[#faf9f7]/50 dark:bg-[#242320]/20">
                    <Tabs.List className="flex gap-1 bg-[#faf9f7] dark:bg-[#242320] rounded-lg p-1">
                        <Tabs.Trigger
                            value="bs"
                            className={cn(TAB_TRIGGER_BASE, "data-[state=active]:text-[#15803d] dark:data-[state=active]:text-[#86efac]")}
                        >
                            <BookOpen size={12} />
                            Balance Sheet
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="is"
                            className={cn(TAB_TRIGGER_BASE, "data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300")}
                        >
                            <BarChart2 size={12} />
                            Income
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="cf"
                            className={cn(TAB_TRIGGER_BASE, "data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300")}
                        >
                            <Banknote size={12} />
                            Cash Flow
                        </Tabs.Trigger>
                    </Tabs.List>
                    <span className="text-[9px] font-mono font-bold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest hidden sm:block">
                        SEC · US-GAAP
                    </span>
                </div>

                <Tabs.Content value="bs" className="focus:outline-none">
                    <SectionTable sections={BS_SECTIONS} columns={columns} />
                    {footer}
                </Tabs.Content>

                <Tabs.Content value="is" className="focus:outline-none">
                    <SectionTable sections={IS_SECTIONS} columns={columns} />
                    {footer}
                </Tabs.Content>

                <Tabs.Content value="cf" className="focus:outline-none">
                    <SectionTable sections={CF_SECTIONS} columns={columns} />
                    {footer}
                </Tabs.Content>
            </Tabs.Root>
        </div>
    );
}
