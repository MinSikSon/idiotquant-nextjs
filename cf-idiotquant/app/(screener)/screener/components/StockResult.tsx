"use client";

import { useTranslations } from "next-intl";
import * as Popover from "@radix-ui/react-popover";
import { ChartNoAxesColumn, Minus, Plus } from "lucide-react";
import { useRef, type ReactNode } from "react";
import type { ComparisonChoice } from "@/components/comparison-checkbox";
import { cn } from "@/lib/utils";
import styles from "../screener.module.css";

export type StockResultActions = {
    openDetails: (ticker: string, name: string) => void;
    toggleComparison: (ticker: string) => void;
};

const actionClass = cn(styles.actionQuiet, "w-full disabled:opacity-50");

export function StockResult({ ticker, name, displayName = name, actions, comparison, className, children }: {
    ticker: string;
    name: string;
    displayName?: string;
    actions: StockResultActions;
    comparison?: ComparisonChoice;
    className: string;
    children: ReactNode;
}) {
  const t = useTranslations("screener");
    const trigger = useRef<HTMLButtonElement>(null);
    const etfSelection = comparison?.purpose === "etf";
    const CompareIcon = comparison?.selected ? Minus : Plus;
    const triggerClass = "pointer-events-none absolute inset-0 rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-ink";

    return (
        <Popover.Root>
            <div className={cn("relative", className)} onClick={event => {
                if (event.target instanceof Element && !event.target.closest("a, button, input")) trigger.current?.click();
            }}>
                {etfSelection ? (
                    <button ref={trigger} type="button" aria-label={t("etfSelect", { stock: displayName })} aria-pressed={comparison.selected}
                        disabled={comparison.disabled} onClick={comparison.toggle} className={triggerClass} />
                ) : (
                    <Popover.Trigger ref={trigger} aria-label={t("stockMenuFor", { stock: displayName })} className={triggerClass} />
                )}
                {children}
            </div>
            {!etfSelection && (
                <Popover.Portal>
                    <Popover.Content aria-label={t("stockMenuFor", { stock: displayName })} sideOffset={4} align="start"
                        collisionPadding={{ top: 64, left: 12, right: 12, bottom: 68 }} hideWhenDetached
                        onInteractOutside={event => {
                            if (event.target instanceof Node && trigger.current?.parentElement?.contains(event.target)) event.preventDefault();
                        }}
                        className={cn(styles.stockMenu, "z-50 w-56 max-w-[var(--radix-popover-content-available-width)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-lg border p-1 shadow-md")}>
                        <div className="px-2 py-1.5 font-semibold [overflow-wrap:anywhere]">{displayName}</div>
                        <Popover.Close type="button" onClick={() => actions.openDetails(ticker, name)} className={actionClass}>
                            <ChartNoAxesColumn size={16} aria-hidden="true" className="shrink-0" />
                            {t("openStock")}
                        </Popover.Close>
                        <Popover.Close type="button" disabled={comparison?.disabled} onClick={() => actions.toggleComparison(ticker)} className={actionClass}>
                            <CompareIcon size={16} aria-hidden="true" className="shrink-0" />
                            {comparison?.selected ? t("removeComparison") : comparison?.disabled ? t("comparisonLimit") : t("addComparison")}
                        </Popover.Close>
                    </Popover.Content>
                </Popover.Portal>
            )}
        </Popover.Root>
    );
}
