"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** 부가 기능은 처음 펼칠 때 준비하고, 접은 뒤에도 입력 상태를 유지한다. */
export function SecondarySection({ title, children, className }: {
    title: string;
    children: ReactNode;
    className?: string;
}) {
    const [visited, setVisited] = useState(false);

    return (
        <details
            className={cn("group/secondary min-w-0 rounded-xl border border-neutral-200 bg-white dark:border-surface-dark-border dark:bg-surface-dark-card", className)}
            onToggle={event => {
                if (event.currentTarget.open) setVisited(true);
            }}
        >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-neutral-700 outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-neutral-200 [&::-webkit-details-marker]:hidden">
                {title}
                <ChevronDown size={16} aria-hidden="true" className="shrink-0 transition-transform group-open/secondary:rotate-180" />
            </summary>
            {visited && <div className="min-w-0 border-t border-neutral-100 p-3 dark:border-surface-dark-border sm:p-4">{children}</div>}
        </details>
    );
}
