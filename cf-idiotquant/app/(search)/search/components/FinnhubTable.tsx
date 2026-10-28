"use client";

import { latestFirst, usReportPeriodLabel } from "@/lib/utils/financialPeriods";
import React, { useMemo } from "react";
import { MobileFinancialComparison } from "./MobileFinancialComparison";
import { cn } from "@/lib/utils";
import { financialSourceLabel } from "@/lib/utils/financialFreshness";
import * as Tabs from "@radix-ui/react-tabs";
import * as Popover from "@radix-ui/react-popover";
import { TrendingUp, TrendingDown, Info, BookOpen, BarChart2, Banknote, Minus } from "lucide-react";

type FinnhubReport = {
    acceptedDate?: string;
    filedDate?: string;
    startDate?: string;
    endDate?: string;
    year?: number;
    form?: string;
    periodType?: string;
    report?: {
        bs?: Array<Record<string, any>>;
        ic?: Array<Record<string, any>>;
        cf?: Array<Record<string, any>>;
    };
};

interface Props {
    data: FinnhubReport[];
    className?: string;
    source?: string | null;
}

type ItemDef = { label: string; concept: string[]; isTotal?: boolean; description: string };
type SectionDef = { label: string; labelEn: string; accent: string; dotColor: string; items: ItemDef[] };

const BS_SECTIONS: SectionDef[] = [
    {
        label: "자산",
        labelEn: "ASSETS",
        accent: "border-brand/50 bg-brand-light text-brand-ink-hover dark:bg-brand-muted/40 dark:text-brand-ink",
        dotColor: "bg-brand",
        items: [
            {
                label: "현금 및 현금성 자산",
                concept: ["us-gaap_CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalentsAtCarryingValue"],
                description: "즉시 현금화 가능한 가장 안전한 자산 — 위기 시 기업 방어력을 나타냄",
            },
            {
                label: "매출·수취채권",
                concept: ["us-gaap_AccountsReceivableNetCurrent", "AccountsReceivableNetCurrent", "us-gaap_ReceivablesNetCurrent", "ReceivablesNetCurrent"],
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
                    "us-gaap_RevenueFromContractWithCustomerIncludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax",
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
        accent: "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-brand-ink",
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
    if (v === 0) return "$0";
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
        if (v !== undefined && v !== null) return v;
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
                    className="shrink-0 rounded-xl p-0.5 text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
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
    "flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap px-2 sm:px-3 py-1.5 rounded-md text-xs font-bold [&_svg]:hidden sm:[&_svg]:block transition-all duration-150",
    "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200",
    "data-[state=active]:bg-white dark:data-[state=active]:bg-surface-dark-elevated",
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
        <>
            <MobileFinancialComparison
                periods={columns.map(column => column.label || "—")}
                sections={sections.map(section => ({ label: section.label, rows: section.items.map(item => ({ ...item, values: columns.map(column => findVal(column.map, item.concept)) })) }))}
                formatValue={fmtUSD}
            />
        <div className="hidden sm:block max-w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="기간별 재무 수치" tabIndex={0}>
            <table className="w-full table-fixed border-collapse text-[13px] sm:text-sm" style={{ minWidth: `${(columns.length + 1) * 7}rem` }}>
                <colgroup>
                    <col className="w-28 sm:w-44" />
                    {columns.map((_, index) => <col key={index} className="w-28 sm:w-36" />)}
                </colgroup>
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-border-subtle-dark">
                        <th className="sticky left-0 z-10 bg-white dark:bg-surface-dark-card px-2 sm:px-5 py-2 sm:py-3 text-left w-28 sm:w-44">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-mono select-none">
                                계정과목
                            </span>
                        </th>
                        {columns.map((col, idx) => (
                            <th
                                key={idx}
                                className={cn(
                                    "px-2 sm:px-5 py-2 sm:py-3 text-right w-28 sm:w-36",
                                    idx === 0 && "bg-brand-light/50 dark:bg-brand-muted/10"
                                )}
                            >
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-wider font-mono",
                                        idx === 0 ? "text-brand-ink dark:text-brand-ink" : "text-neutral-400 dark:text-neutral-500"
                                    )}>
                                        {idx === 0 ? "Latest" : `이전 공시 ${idx}`}
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
                                    className="sticky left-0 px-2 sm:px-5 pt-3 sm:pt-4 pb-1.5 bg-white dark:bg-surface-dark-card"
                                >
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest font-mono select-none",
                                        section.accent
                                    )}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", section.dotColor)} />
                                        <span className="sm:hidden">{section.label}</span><span className="hidden sm:inline">{section.labelEn}</span>
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
                                            "group border-b border-neutral-100 dark:border-border-subtle-dark/50 transition-colors duration-100",
                                            item.isTotal
                                                ? "bg-surface-canvas/80 dark:bg-surface-dark-card/20 hover:bg-surface-muted-hover/70 dark:hover:bg-surface-dark-card/40"
                                                : "hover:bg-surface-muted-hover/60 dark:hover:bg-surface-dark-card/10"
                                        )}
                                    >
                                        {/* Label */}
                                        <td className={cn(
                                            "sticky left-0 z-10 px-2 sm:px-5 py-2 sm:py-3 transition-colors duration-100",
                                            item.isTotal
                                                ? "bg-surface-canvas dark:bg-surface-dark-card group-hover:bg-surface-muted-hover dark:group-hover:bg-surface-dark-muted"
                                                : "bg-white dark:bg-surface-dark-card group-hover:bg-surface-muted-hover/60 dark:group-hover:bg-surface-dark-muted/10"
                                        )}>
                                            <div className="flex items-center gap-1 sm:gap-2">
                                                {item.isTotal
                                                    ? <div className="w-0.5 h-4 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0" />
                                                    : null
                                                }
                                                <span className={cn(
                                                    "min-w-0 whitespace-normal break-keep leading-snug",
                                                    item.isTotal
                                                        ? "font-bold text-neutral-900 dark:text-neutral-100"
                                                        : "font-medium text-neutral-600 dark:text-neutral-400"
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
                                                    "px-2 sm:px-5 py-2 sm:py-3 text-right font-mono tabular-nums whitespace-nowrap",
                                                    colIdx === 0 && "bg-brand-light/30 dark:bg-brand-muted/5"
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
        </>
    );
}

export default function FinnhubTable({ data = [], className = "", source }: Props) {
    const columns = useMemo(() => {
        const reports = Array.isArray(data) ? data : [];
        return latestFirst(reports).slice(0, 5).map((r) => {
            const dateStr = usReportPeriodLabel(r);
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 sm:px-5 py-2 sm:py-3 border-t border-neutral-100 dark:border-border-subtle-dark">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f0fdf4]0 animate-pulse shrink-0" />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                {[financialSourceLabel(source), 'US-GAAP', 'USD'].filter(Boolean).join(' · ')}
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
                <div className="flex items-center justify-between gap-2 px-0 sm:px-5 py-1.5 sm:py-3 border-b border-neutral-100 dark:border-border-subtle-dark bg-surface-canvas/50 dark:bg-surface-dark-card/20">
                    <Tabs.List className="grid w-full grid-cols-3 sm:flex sm:w-auto gap-1 bg-surface-canvas dark:bg-surface-dark-card rounded-lg p-1">
                        <Tabs.Trigger
                            value="bs"
                            className={cn(TAB_TRIGGER_BASE, "data-[state=active]:text-brand-ink-hover dark:data-[state=active]:text-brand-ink")}
                        >
                            <BookOpen size={12} />
                            재무상태표
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="is"
                            className={cn(TAB_TRIGGER_BASE, "data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300")}
                        >
                            <BarChart2 size={12} />
                            손익계산서
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="cf"
                            className={cn(TAB_TRIGGER_BASE, "data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300")}
                        >
                            <Banknote size={12} />
                            현금흐름
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
