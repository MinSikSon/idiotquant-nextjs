"use client";

import React, { useMemo } from "react";
import { formatKoreanUnit, ONE_HUNDRED_MILLION } from "../../../../components/utils/financeCalc";
import { cn } from "@/lib/utils";
import * as Tabs from "@radix-ui/react-tabs";
import * as Popover from "@radix-ui/react-popover";
import { TrendingUp, TrendingDown, Info, BookOpen, BarChart2, Minus } from "lucide-react";

interface FinancialTablesProps {
    kiBS: any;
    kiIS: any;
}

type RowDef = { label: string; key: string; isTotal?: boolean; description: string };
type SectionDef = { label: string; labelEn: string; accent: string; dotColor: string; rows: RowDef[] };

const BS_SECTIONS: SectionDef[] = [
    {
        label: "자산",
        labelEn: "ASSETS",
        accent: "border-[#d97757]/50 bg-[#fff8f5] text-[#bf6644] dark:bg-[#3d1f10]/40 dark:text-[#e8a48a]",
        dotColor: "bg-[#d97757]",
        rows: [
            { label: "유동자산", key: "cras", description: "1년 내 현금화 가능한 자산 — NCAV 청산가치의 핵심 안전마진 원천" },
            { label: "고정자산", key: "fxas", description: "설비·토지·무형자산 등 현금화에 1년 이상 소요되는 장기 자산" },
            { label: "자산총계", key: "total_aset", isTotal: true, description: "유동자산 + 고정자산의 합계 — 기업이 보유한 총 자산 규모" },
        ],
    },
    {
        label: "부채",
        labelEn: "LIABILITIES",
        accent: "border-rose-400/50 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
        dotColor: "bg-rose-400",
        rows: [
            { label: "유동부채", key: "flow_lblt", description: "1년 이내 상환해야 하는 단기 채무 — 단기 유동성 리스크 지표" },
            { label: "고정부채", key: "fix_lblt", description: "만기 1년 초과 장기 차입금·회사채 등" },
            { label: "부채총계", key: "total_lblt", isTotal: true, description: "총 채무 합계 — 청산가치(NCAV) 계산 시 유동자산에서 전액 차감" },
        ],
    },
    {
        label: "자본",
        labelEn: "EQUITY",
        accent: "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotColor: "bg-emerald-400",
        rows: [
            { label: "자본금", key: "cpfn", description: "주주가 납입한 주식의 액면가 총액" },
            { label: "이익잉여금", key: "prfi_surp", description: "순이익 중 배당하지 않고 사내에 유보한 잉여금 — 클수록 재무 안정" },
            { label: "자본총계", key: "total_cptl", isTotal: true, description: "순자산(자산 − 부채) — 주주 몫의 실체이자 S-RIM 모델 기초 체력" },
        ],
    },
];

const IS_SECTIONS: SectionDef[] = [
    {
        label: "수익",
        labelEn: "REVENUE",
        accent: "border-indigo-400/50 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
        dotColor: "bg-indigo-400",
        rows: [
            { label: "매출액", key: "sale_account", isTotal: true, description: "제품·서비스 판매 총 수입 (Top-line) — 성장성의 핵심 척도" },
            { label: "매출원가", key: "sale_cost", description: "제품 생산에 직접 투입된 원재료·가공비" },
            { label: "매출총이익", key: "sale_totl_prfi", description: "매출액 − 매출원가 (Gross Profit) — 순수 제조·판매 마진" },
        ],
    },
    {
        label: "영업",
        labelEn: "OPERATING",
        accent: "border-violet-400/50 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
        dotColor: "bg-violet-400",
        rows: [
            { label: "판관비", key: "sell_mang", description: "임직원 급여·마케팅·임차료 등 판매비와 관리비 전체" },
            { label: "영업이익", key: "bsop_prti", isTotal: true, description: "본업 수익력(EBIT) — 매출총이익에서 판관비를 뺀 진짜 이익" },
        ],
    },
    {
        label: "순이익",
        labelEn: "NET INCOME",
        accent: "border-teal-400/50 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
        dotColor: "bg-teal-400",
        rows: [
            { label: "당기순이익", key: "thtr_ntin", isTotal: true, description: "세금·금융비용 모두 반영한 최종 순이익 (Bottom-line)" },
        ],
    },
];

function pctChange(curr: number, prev: number): number | null {
    if (!prev || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
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
        return <span className="text-[9px] font-mono text-neutral-300 dark:text-neutral-700"><Minus size={8} /></span>;
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

function FinancialTable({ sections, data }: { sections: SectionDef[]; data: any }) {
    const periods: any[] = useMemo(() => (data?.output ?? []).slice(0, 5), [data]);

    if (!periods.length) return (
        <div className="py-16 text-center text-sm text-neutral-400 dark:text-neutral-600">
            데이터를 불러올 수 없습니다
        </div>
    );

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-[#35332e]">
                        <th className="sticky left-0 z-10 bg-white dark:bg-[#242320] px-5 py-3 text-left min-w-[11rem] w-44">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-mono select-none">
                                계정과목
                            </span>
                        </th>
                        {periods.map((p, i) => {
                            const raw = p.stac_yymm ?? "";
                            const date = raw.replace(/^(\d{4})(\d{2})$/, "$1.$2");
                            return (
                                <th
                                    key={i}
                                    className={cn(
                                        "px-5 py-3 text-right min-w-[8rem]",
                                        i === 0 && "bg-[#fff8f5]/50 dark:bg-[#3d1f10]/10"
                                    )}
                                >
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-wider font-mono",
                                            i === 0 ? "text-[#d97757] dark:text-[#d97757]" : "text-neutral-400 dark:text-neutral-500"
                                        )}>
                                            {i === 0 ? "최근 결산" : `T − ${i}`}
                                        </span>
                                        <span className={cn(
                                            "text-xs font-bold tabular-nums",
                                            i === 0 ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
                                        )}>
                                            {date || "—"}
                                        </span>
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sections.map((section) => (
                        <React.Fragment key={section.label}>
                            {/* Section group header */}
                            <tr>
                                <td
                                    colSpan={periods.length + 1}
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

                            {section.rows.map((row) => {
                                const vals = periods.map((p) => Number(p[row.key as keyof typeof p] ?? 0));
                                const yoy = vals.length >= 2 ? pctChange(vals[0], vals[1]) : null;
                                const isNeg0 = vals[0] < 0;

                                return (
                                    <tr
                                        key={row.key}
                                        className={cn(
                                            "group border-b border-neutral-100 dark:border-[#35332e]/50 transition-colors duration-100",
                                            row.isTotal
                                                ? "bg-[#faf9f7]/80 dark:bg-[#242320]/20 hover:bg-[#f5f0e8]/70 dark:hover:bg-[#242320]/40"
                                                : "hover:bg-[#f5f0e8]/60 dark:hover:bg-[#242320]/10"
                                        )}
                                    >
                                        {/* Label */}
                                        <td className={cn(
                                            "sticky left-0 z-10 px-5 py-3 transition-colors duration-100",
                                            row.isTotal
                                                ? "bg-[#faf9f7] dark:bg-[#242320]/20 group-hover:bg-[#f5f0e8]/70 dark:group-hover:bg-[#35332e]/40"
                                                : "bg-white dark:bg-[#242320] group-hover:bg-[#f5f0e8]/60 dark:group-hover:bg-[#35332e]/10"
                                        )}>
                                            <div className="flex items-center gap-2">
                                                {row.isTotal
                                                    ? <div className="w-0.5 h-4 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0" />
                                                    : <div className="w-0.5 h-4 shrink-0" />
                                                }
                                                <span className={cn(
                                                    "truncate",
                                                    row.isTotal
                                                        ? "font-bold text-neutral-900 dark:text-neutral-100"
                                                        : "font-medium text-neutral-600 dark:text-neutral-400 pl-1"
                                                )}>
                                                    {row.label}
                                                </span>
                                                <InfoPopover label={row.label} description={row.description} />
                                            </div>
                                        </td>

                                        {/* Values */}
                                        {vals.map((val, i) => (
                                            <td
                                                key={i}
                                                className={cn(
                                                    "px-5 py-3 text-right font-mono tabular-nums",
                                                    i === 0 && "bg-[#fff8f5]/30 dark:bg-[#3d1f10]/5"
                                                )}
                                            >
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className={cn(
                                                        isNeg0 && i === 0
                                                            ? "text-rose-600 dark:text-rose-400 font-bold"
                                                            : val < 0
                                                                ? "text-rose-500 dark:text-rose-500 font-medium"
                                                                : row.isTotal
                                                                    ? "font-bold text-neutral-900 dark:text-neutral-100"
                                                                    : "font-medium text-neutral-700 dark:text-neutral-300",
                                                        i === 0 ? "text-[13px]" : "text-xs opacity-80"
                                                    )}>
                                                        {val === 0 ? "—" : formatKoreanUnit(val * ONE_HUNDRED_MILLION)}
                                                    </span>
                                                    {i === 0 && <YoYBadge pct={yoy} />}
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

export default function FinancialTables({ kiBS, kiIS }: FinancialTablesProps) {
    if (!kiBS?.output?.length || !kiIS?.output?.length) return null;

    const footer = (
        <div className="flex items-center gap-3 px-5 py-3 border-t border-neutral-100 dark:border-[#35332e]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                DART 공시 기준 · 단위 억 원 (KRW 100M) · 최근 5개 결산기
            </span>
            <div className="ml-auto flex items-center gap-2">
                <span className="text-[9px] font-mono text-neutral-400 dark:text-neutral-600 flex items-center gap-1">
                    <TrendingUp size={8} className="text-emerald-500" /> YoY 전기 대비
                </span>
            </div>
        </div>
    );

    return (
        <Tabs.Root defaultValue="bs" className="w-full">
            {/* Tab Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-[#35332e] bg-[#faf9f7]/50 dark:bg-[#242320]/20">
                <Tabs.List className="flex gap-1 bg-[#faf9f7] dark:bg-[#242320] rounded-lg p-1">
                    <Tabs.Trigger
                        value="bs"
                        className={cn(TAB_TRIGGER_BASE, "data-[state=active]:text-[#bf6644] dark:data-[state=active]:text-[#e8a48a]")}
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
                </Tabs.List>
                <span className="text-[9px] font-mono font-bold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest">
                    Balance Sheet · P&amp;L
                </span>
            </div>

            <Tabs.Content value="bs" className="focus:outline-none">
                <FinancialTable sections={BS_SECTIONS} data={kiBS} />
                {footer}
            </Tabs.Content>

            <Tabs.Content value="is" className="focus:outline-none">
                <FinancialTable sections={IS_SECTIONS} data={kiIS} />
                {footer}
            </Tabs.Content>
        </Tabs.Root>
    );
}
