"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ComparisonRow = {
    label: string;
    description: string;
    isTotal?: boolean;
    values: (number | null)[];
};

type Props = {
    periods: string[];
    sections: { label: string; rows: ComparisonRow[] }[];
    formatValue: (value: number | null) => string;
};

function shortPeriod(label: string) {
    const dates = label.match(/\d{4}[-.]\d{2}(?:[-.]\d{2})?/g);
    const date = (dates?.at(-1)?.replaceAll("-", ".") ?? label).replace(/^(\d{2})(\d{2})\./, "$2.");
    const basis = label.includes(" · ") ? label.split(" · ").at(-1)?.replace("분기 공시", "분기") : undefined;
    return basis ? `${date} · ${basis}` : date;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button type="button" aria-label={label} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-neutral-400">
                    <Info size={14} aria-hidden="true" />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content sideOffset={6} collisionPadding={12} className="z-[200] w-72 max-w-[calc(100vw-24px)] rounded-xl border border-neutral-200 bg-white p-3 text-xs leading-relaxed text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-surface-dark-card dark:text-neutral-200">
                    {children}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

export function MobileFinancialComparison({ periods, sections, formatValue }: Props) {
    const [selectedPeriod, setSelectedPeriod] = useState(1);
    const comparisonIndex = Math.min(Math.max(1, selectedPeriod), periods.length - 1);
    const hasComparison = periods.length > 1;

    return (
        <div className="min-w-0 sm:hidden">
            <div className={cn("grid items-center gap-3 border-b border-neutral-200 px-2 py-2 dark:border-neutral-700", hasComparison ? "grid-cols-2" : "grid-cols-1")}>
                <div className="min-w-0">
                    <span className="block text-[11px] font-medium text-brand-ink">최신 공시</span>
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">{shortPeriod(periods[0])}</span>
                        <Detail label="선택한 공시 기간 상세">
                            <p className="font-semibold">최신 공시</p><p>{periods[0]}</p>
                            {hasComparison && <><p className="mt-2 font-semibold">비교 공시</p><p>{periods[comparisonIndex]}</p></>}
                        </Detail>
                    </div>
                </div>
                {hasComparison && (
                    <label className="min-w-0 text-right">
                        <span className="block text-[11px] text-neutral-600 dark:text-neutral-400">비교 공시</span>
                        <select aria-label="비교할 공시 기간" value={comparisonIndex} onChange={event => setSelectedPeriod(Number(event.target.value))} className="min-h-11 w-full min-w-0 rounded-md border border-neutral-200 bg-white px-2 text-xs font-medium tabular-nums text-neutral-700 dark:border-neutral-700 dark:bg-surface-dark-card dark:text-neutral-200">
                            {periods.slice(1).map((period, index) => <option key={index + 1} value={index + 1}>{shortPeriod(period)}</option>)}
                        </select>
                    </label>
                )}
            </div>
            {sections.map(section => (
                <section key={section.label} aria-label={section.label}>
                    <h4 className="border-b border-neutral-100 px-2 py-2 text-xs font-semibold text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">{section.label}</h4>
                    <dl className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {section.rows.map(row => (
                            <div key={row.label} className={cn("px-2 py-1.5", row.isTotal && "bg-neutral-100/70 dark:bg-surface-dark-muted")}>
                                <dt className="flex items-center justify-between gap-2 text-[13px] leading-snug text-neutral-800 dark:text-neutral-100">
                                    <span className={row.isTotal ? "font-semibold" : "font-medium"}>{row.label}</span>
                                    <Detail label={`${row.label} 설명`}><p className="font-semibold">{row.label}</p><p className="mt-1">{row.description}</p></Detail>
                                </dt>
                                <dd className={cn("grid gap-3 pb-1 font-mono tabular-nums", hasComparison ? "grid-cols-2" : "grid-cols-1")}>
                                    <span aria-label={`최신 공시 ${formatValue(row.values[0])}`} className={cn("whitespace-nowrap text-[15px] font-semibold leading-6", row.values[0] !== null && row.values[0] < 0 ? "text-rose-600 dark:text-rose-400" : "text-neutral-900 dark:text-white")}>{formatValue(row.values[0])}</span>
                                    {hasComparison && <span aria-label={`비교 공시 ${formatValue(row.values[comparisonIndex])}`} className={cn("whitespace-nowrap text-right text-[15px] leading-6", row.values[comparisonIndex] !== null && row.values[comparisonIndex] < 0 ? "text-rose-600 dark:text-rose-400" : "text-neutral-600 dark:text-neutral-300")}>{formatValue(row.values[comparisonIndex])}</span>}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>
            ))}
        </div>
    );
}
